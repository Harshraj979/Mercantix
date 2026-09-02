import {Injectable,NotFoundException,BadRequestException,ForbiddenException,ConflictException,Logger,} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import {OrderStatus,OrderItemStatus,PaymentStatus,PayoutStatus,RoleName,} from '@mercantix/contracts';
import {InitiatePaymentDto,VerifyPaymentDto,PaymentInitiationResponseDto,PaymentDetailsResponseDto,VendorPayoutResponseDto,} from './dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private formatPayment(payment: any): PaymentDetailsResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerReference: payment.providerReference,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status as PaymentStatus,
      metadata: payment.metadata as Record<string, any> | null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async initiatePayment(
    buyerId: string,
    dto: InitiatePaymentDto,
  ): Promise<PaymentInitiationResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException(
        'You can only initiate payment for your own orders',
      );
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Order is in "${order.status}" status and cannot be paid`,
      );
    }

    // Idempotency: check if payment record already exists
    if (order.payment) {
      if (order.payment.status === PaymentStatus.CAPTURED) {
        throw new ConflictException('Order has already been paid for');
      }

      return {
        paymentId: order.payment.id,
        orderId: order.id,
        amount: Number(order.payment.amount),
        currency: order.payment.currency,
        provider: order.payment.provider,
        providerReference: order.payment.providerReference,
        metadata: (order.payment.metadata as Record<string, any>) || undefined,
      };
    }

    // Generate mock/gateway provider reference (e.g. razorpay order id)
    const provider = (dto.provider || 'RAZORPAY').toUpperCase();
    const providerReference = `${provider.toLowerCase()}_ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newPayment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider,
        providerReference,
        amount: order.total,
        currency: order.currency,
        status: PaymentStatus.CREATED,
        idempotencyKey: dto.idempotencyKey,
        metadata: {
          initiationSource: 'API_CHECKOUT',
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      paymentId: newPayment.id,
      orderId: order.id,
      amount: Number(newPayment.amount),
      currency: newPayment.currency,
      provider: newPayment.provider,
      providerReference: newPayment.providerReference,
      metadata: {
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
      },
    };
  }

  /**
   * Verify Payment from client-side redirect / SDK callback
   */
  async verifyPayment(
    buyerId: string,
    dto: VerifyPaymentDto,
  ): Promise<PaymentDetailsResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        payment: true,
        orderItems: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException(
        'You can only verify payments for your own orders',
      );
    }

    if (!order.payment) {
      throw new BadRequestException('No payment initiation found for this order');
    }

    if (order.payment.status === PaymentStatus.CAPTURED) {
      return this.formatPayment(order.payment);
    }

    // Execute atomic confirmation transaction
    const updatedPayment = await this.prisma.$transaction(async (tx: any) => {
      // 1. Update Payment status to CAPTURED
      const payment = await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status: PaymentStatus.CAPTURED,
          providerReference: dto.providerReference,
          metadata: {
            verifiedAt: new Date().toISOString(),
            signature: dto.signature || 'verified',
          },
        },
      });

      // 2. Update Order status to PAID
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      });

      // 3. Update OrderItems to ACCEPTED
      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: OrderItemStatus.ACCEPTED },
      });

      // 4. Create OrderEvent
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          previousStatus: OrderStatus.PENDING_PAYMENT,
          newStatus: OrderStatus.PAID,
          actorId: buyerId,
          metadata: {
            paymentId: payment.id,
            providerReference: dto.providerReference,
          },
        },
      });

      // 5. Generate VendorPayouts for each OrderItem
      for (const item of order.orderItems) {
        const grossAmount = Number(item.unitPrice) * item.quantity;
        const commissionRate = Number(item.vendor?.commissionRate ?? 10.0);
        const commission = Math.round(grossAmount * (commissionRate / 100) * 100) / 100;
        const netAmount = Math.round((grossAmount - commission) * 100) / 100;

        await tx.vendorPayout.create({
          data: {
            orderItemId: item.id,
            vendorId: item.vendorId,
            grossAmount,
            commission,
            netAmount,
            status: PayoutStatus.PENDING,
          },
        });
      }

      // 6. Outbox Event
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'PAYMENT',
          aggregateId: payment.id,
          eventType: 'PAYMENT_CAPTURED',
          payload: {
            orderId: order.id,
            buyerId,
            amount: Number(payment.amount),
            currency: payment.currency,
            providerReference: dto.providerReference,
          },
        },
      });

      return payment;
    });

    this.logger.log(
      `Payment ${updatedPayment.id} confirmed and captured for Order ${dto.orderId}`,
    );

    return this.formatPayment(updatedPayment);
  }

  /**
   * Webhook Processor for payment providers (Razorpay / Stripe)
   */
  async processWebhook(
    provider: string,
    payload: any,
    _signature?: string,
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received ${provider} webhook: event=${payload?.event || payload?.type}`,
    );

    const eventType = payload?.event || payload?.type;
    const providerOrderId =
      payload?.payload?.payment?.entity?.order_id ||
      payload?.data?.object?.id ||
      payload?.order_id;

    if (!providerOrderId) {
      return { status: 'ignored_no_order_reference' };
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { providerReference: providerOrderId },
          { id: providerOrderId },
        ],
      },
      include: {
        order: {
          include: {
            orderItems: {
              include: { vendor: true },
            },
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`No payment matching provider reference: ${providerOrderId}`);
      return { status: 'payment_not_found' };
    }

    if (payment.status === PaymentStatus.CAPTURED) {
      return { status: 'already_processed' };
    }

    if (
      eventType === 'payment.captured' ||
      eventType === 'charge.succeeded' ||
      eventType === 'order.paid'
    ) {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            metadata: { webhookPayload: payload, processedAt: new Date() },
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
        });

        await tx.orderItem.updateMany({
          where: { orderId: payment.orderId },
          data: { status: OrderItemStatus.ACCEPTED },
        });

        await tx.orderEvent.create({
          data: {
            orderId: payment.orderId,
            previousStatus: OrderStatus.PENDING_PAYMENT,
            newStatus: OrderStatus.PAID,
            actorId: 'WEBHOOK_SERVICE',
            metadata: { event: eventType, provider },
          },
        });

        for (const item of payment.order.orderItems) {
          const grossAmount = Number(item.unitPrice) * item.quantity;
          const commissionRate = Number(item.vendor?.commissionRate ?? 10.0);
          const commission = Math.round(grossAmount * (commissionRate / 100) * 100) / 100;
          const netAmount = Math.round((grossAmount - commission) * 100) / 100;

          await tx.vendorPayout.upsert({
            where: { orderItemId: item.id },
            create: {
              orderItemId: item.id,
              vendorId: item.vendorId,
              grossAmount,
              commission,
              netAmount,
              status: PayoutStatus.PENDING,
            },
            update: {},
          });
        }

        await tx.outboxEvent.create({
          data: {
            aggregateType: 'PAYMENT',
            aggregateId: payment.id,
            eventType: 'PAYMENT_CAPTURED',
            payload: {
              orderId: payment.orderId,
              amount: Number(payment.amount),
              source: 'WEBHOOK',
            },
          },
        });
      });

      return { status: 'captured' };
    }

    if (eventType === 'payment.failed' || eventType === 'charge.failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          metadata: { failureReason: payload?.error_description || 'Payment failed' },
        },
      });

      await this.prisma.orderEvent.create({
        data: {
          orderId: payment.orderId,
          previousStatus: OrderStatus.PENDING_PAYMENT,
          newStatus: 'PAYMENT_FAILED',
          actorId: 'WEBHOOK_SERVICE',
          metadata: { payload },
        },
      });

      return { status: 'marked_failed' };
    }

    return { status: 'unhandled_event' };
  }

  /**
   * Get payment details by Order ID
   */
  async getPaymentByOrderId(
    orderId: string,
    userId: string,
    roles: string[],
  ): Promise<PaymentDetailsResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isAdmin = roles.includes(RoleName.ADMIN);
    if (!isAdmin && order.buyerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this payment',
      );
    }

    if (!order.payment) {
      throw new NotFoundException('Payment record not found for this order');
    }

    return this.formatPayment(order.payment);
  }

  /**
   * Vendor: Get list of payouts & earnings ledger
   */
  async getVendorPayouts(vendorUserId: string, page = 1, limit = 10) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: vendorUserId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const skip = (page - 1) * limit;

    const [payouts, total, aggregate] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where: { vendorId: vendor.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.vendorPayout.count({ where: { vendorId: vendor.id } }),
      this.prisma.vendorPayout.aggregate({
        where: { vendorId: vendor.id },
        _sum: {
          grossAmount: true,
          commission: true,
          netAmount: true,
        },
      }),
    ]);

    const formattedPayouts: VendorPayoutResponseDto[] = payouts.map(
      (p: any) => ({
        id: p.id,
        orderItemId: p.orderItemId,
        vendorId: p.vendorId,
        productName: p.orderItem?.product?.name,
        grossAmount: Number(p.grossAmount),
        commission: Number(p.commission),
        netAmount: Number(p.netAmount),
        status: p.status as PayoutStatus,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }),
    );

    return {
      data: formattedPayouts,
      summary: {
        totalGross: Number(aggregate._sum.grossAmount ?? 0),
        totalCommission: Number(aggregate._sum.commission ?? 0),
        totalNetEarnings: Number(aggregate._sum.netAmount ?? 0),
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Process vendor payout and mark as PAID_OUT
   */
  async adminProcessPayout(
    _adminUserId: string,
    payoutId: string,
  ): Promise<VendorPayoutResponseDto> {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: {
        orderItem: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Vendor payout record not found');
    }

    if (payout.status === PayoutStatus.PAID_OUT) {
      throw new BadRequestException('Payout has already been paid out');
    }

    const updated = await this.prisma.vendorPayout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PAID_OUT,
        paidAt: new Date(),
      },
      include: {
        orderItem: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    return {
      id: updated.id,
      orderItemId: updated.orderItemId,
      vendorId: updated.vendorId,
      productName: updated.orderItem?.product?.name,
      grossAmount: Number(updated.grossAmount),
      commission: Number(updated.commission),
      netAmount: Number(updated.netAmount),
      status: updated.status as PayoutStatus,
      paidAt: updated.paidAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
