import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  OrderStatus,
  OrderItemStatus,
  ProductStatus,
  DiscountType,
  RoleName,
} from '@mercantix/contracts';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderItemStatusDto,
  OrderResponseDto,
  OrderItemResponseDto,
} from './dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format Prisma Order model into OrderResponseDto
   */
  private formatOrder(order: any): OrderResponseDto {
    return {
      id: order.id,
      buyerId: order.buyerId,
      shippingAddressId: order.shippingAddressId,
      couponId: order.couponId,
      couponDiscount: Number(order.couponDiscount ?? 0),
      status: order.status as OrderStatus,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax ?? 0),
      shippingFee: Number(order.shippingFee ?? 0),
      platformFee: Number(order.platformFee ?? 0),
      total: Number(order.total),
      currency: order.currency,
      idempotencyKey: order.idempotencyKey,
      orderItems: (order.orderItems || []).map(
        (item: any): OrderItemResponseDto => ({
          id: item.id,
          orderId: item.orderId,
          vendorId: item.vendorId,
          vendorName: item.vendor?.storeName,
          productId: item.productId,
          productName: item.product?.name,
          productSlug: item.product?.slug,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.unitPrice) * item.quantity,
          status: item.status as OrderItemStatus,
          trackingNumber: item.trackingNumber,
          trackingCarrier: item.trackingCarrier,
        }),
      ),
      payment: order.payment
        ? {
            id: order.payment.id,
            orderId: order.payment.orderId,
            provider: order.payment.provider,
            providerReference: order.payment.providerReference,
            amount: Number(order.payment.amount),
            currency: order.payment.currency,
            status: order.payment.status,
            createdAt: order.payment.createdAt,
            updatedAt: order.payment.updatedAt,
          }
        : null,
      events: (order.events || []).map((ev: any) => ({
        id: ev.id,
        orderId: ev.orderId,
        previousStatus: ev.previousStatus,
        newStatus: ev.newStatus,
        actorId: ev.actorId,
        metadata: ev.metadata as Record<string, any> | null,
        createdAt: ev.createdAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Checkout: Validates cart, stock, coupon, reserves inventory with optimistic locking,
   * creates Order, OrderItems, OrderEvent, OutboxEvent, and clears cart in a single atomic transaction.
   */
  async createOrder(
    buyerId: string,
    dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    // 1. Idempotency Check: Return existing order if key was already processed
    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: {
        orderItems: {
          include: {
            product: { select: { name: true, slug: true } },
            vendor: { select: { storeName: true } },
          },
        },
        payment: true,
        events: true,
      },
    });

    if (existingOrder) {
      if (existingOrder.buyerId !== buyerId) {
        throw new ConflictException(
          'Idempotency key already used by another order',
        );
      }
      this.logger.log(
        `Returning existing order ${existingOrder.id} for idempotencyKey ${dto.idempotencyKey}`,
      );
      return this.formatOrder(existingOrder);
    }

    // 2. Validate Shipping Address
    const address = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId: buyerId },
    });
    if (!address) {
      throw new BadRequestException('Invalid shipping address selected');
    }

    // 3. Fetch Buyer's Cart
    const cart = await this.prisma.cart.findUnique({
      where: { buyerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: true,
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Shopping cart is empty');
    }

    // 4. Validate items and calculate subtotal
    let subtotal = 0;
    const checkoutItems: Array<{
      productId: string;
      vendorId: string;
      quantity: number;
      unitPrice: number;
      inventoryVersion: number;
    }> = [];

    for (const item of cart.items) {
      const product = item.product;
      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(
          `Product "${product.name}" is no longer active for purchase`,
        );
      }

      if (
        !product.inventory ||
        product.inventory.availableQuantity < item.quantity
      ) {
        throw new BadRequestException(
          `Insufficient stock available for "${product.name}"`,
        );
      }

      const unitPrice = Number(product.price);
      subtotal += unitPrice * item.quantity;

      checkoutItems.push({
        productId: product.id,
        vendorId: product.vendorId,
        quantity: item.quantity,
        unitPrice,
        inventoryVersion: product.inventory.version,
      });
    }

    // 5. Validate Coupon if supplied
    let couponDiscount = 0;
    let validCoupon: any = null;

    if (dto.couponCode) {
      validCoupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.toUpperCase().trim() },
      });

      if (!validCoupon || !validCoupon.isActive) {
        throw new BadRequestException('Coupon is invalid or inactive');
      }

      if (validCoupon.expiresAt && validCoupon.expiresAt < new Date()) {
        throw new BadRequestException('Coupon has expired');
      }

      if (
        validCoupon.maxUses !== null &&
        validCoupon.usedCount >= validCoupon.maxUses
      ) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      if (
        validCoupon.minOrderValue !== null &&
        subtotal < Number(validCoupon.minOrderValue)
      ) {
        throw new BadRequestException(
          `Minimum order value of ₹${validCoupon.minOrderValue} required for this coupon`,
        );
      }

      if (validCoupon.discountType === DiscountType.PERCENTAGE) {
        couponDiscount = Math.round(
          subtotal * (Number(validCoupon.discountValue) / 100) * 100,
        ) / 100;
      } else {
        couponDiscount = Math.min(
          subtotal,
          Number(validCoupon.discountValue),
        );
      }
    }

    const tax = Math.round((subtotal - couponDiscount) * 0.18 * 100) / 100;
    const shippingFee = 0;
    const platformFee = 0;
    const total = Math.max(
      0,
      Math.round((subtotal - couponDiscount + tax + shippingFee + platformFee) * 100) / 100,
    );

    // 6. Execute Atomic Transaction with Optimistic Concurrency Control
    const createdOrder = await this.prisma.$transaction(async (tx: any) => {
      // Step A: Reserve Inventory with Optimistic Locking
      for (const item of checkoutItems) {
        const updateResult = await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            version: item.inventoryVersion,
            availableQuantity: { gte: item.quantity },
          },
          data: {
            availableQuantity: { decrement: item.quantity },
            reservedQuantity: { increment: item.quantity },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            'Stock was modified by another transaction during checkout. Please try again.',
          );
        }
      }

      // Step B: Create Order & OrderItems
      const newOrder = await tx.order.create({
        data: {
          buyerId,
          shippingAddressId: dto.shippingAddressId,
          couponId: validCoupon ? validCoupon.id : null,
          couponDiscount,
          status: OrderStatus.PENDING_PAYMENT,
          subtotal,
          tax,
          shippingFee,
          platformFee,
          total,
          currency: 'INR',
          idempotencyKey: dto.idempotencyKey,
          orderItems: {
            create: checkoutItems.map((item) => ({
              vendorId: item.vendorId,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              status: OrderItemStatus.PENDING,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: { select: { name: true, slug: true } },
              vendor: { select: { storeName: true } },
            },
          },
        },
      });

      // Step C: Create OrderEvent
      await tx.orderEvent.create({
        data: {
          orderId: newOrder.id,
          previousStatus: null,
          newStatus: OrderStatus.PENDING_PAYMENT,
          actorId: buyerId,
          metadata: {
            event: 'ORDER_INITIALIZED',
            subtotal,
            total,
            couponDiscount,
          },
        },
      });

      // Step D: Record Coupon Usage if applied
      if (validCoupon) {
        await tx.couponUsage.create({
          data: {
            couponId: validCoupon.id,
            userId: buyerId,
            orderId: newOrder.id,
          },
        });

        await tx.coupon.update({
          where: { id: validCoupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Step E: Create Outbox Event for downstream asynchronous processing
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'ORDER',
          aggregateId: newOrder.id,
          eventType: 'ORDER_CREATED',
          payload: {
            orderId: newOrder.id,
            buyerId,
            total,
            currency: 'INR',
            itemsCount: checkoutItems.length,
          },
        },
      });

      // Step F: Clear Buyer's Cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    return this.formatOrder(createdOrder);
  }

  /**
   * Get Buyer's Paginated Order History
   */
  async getBuyerOrders(buyerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { buyerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            include: {
              product: { select: { name: true, slug: true } },
              vendor: { select: { storeName: true } },
            },
          },
          payment: true,
          events: true,
        },
      }),
      this.prisma.order.count({ where: { buyerId } }),
    ]);

    return {
      data: orders.map((o: any) => this.formatOrder(o)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Order Details with role-based access control
   */
  async getOrderById(orderId: string, userId: string, roles: string[]) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: { select: { name: true, slug: true } },
            vendor: { select: { storeName: true, ownerUserId: true } },
          },
        },
        payment: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isAdmin = roles.includes(RoleName.ADMIN);
    const isBuyer = order.buyerId === userId;
    const isVendorForOrder = order.orderItems.some(
      (item: any) => item.vendor?.ownerUserId === userId,
    );

    if (!isAdmin && !isBuyer && !isVendorForOrder) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    return this.formatOrder(order);
  }

  /**
   * Cancel Order: releases reserved inventory and cancels all pending items
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    roles: string[],
    reason?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        couponUsage: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isAdmin = roles.includes(RoleName.ADMIN);
    if (!isAdmin && order.buyerId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.PAID
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}"`,
      );
    }

    const updatedOrder = await this.prisma.$transaction(async (tx: any) => {
      // 1. Release reserved stock back to available stock
      for (const item of order.orderItems) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedQuantity: { decrement: item.quantity },
            availableQuantity: { increment: item.quantity },
            version: { increment: 1 },
          },
        });
      }

      // 2. Update Order & OrderItems status
      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          orderItems: {
            updateMany: {
              where: { orderId },
              data: { status: OrderItemStatus.CANCELLED },
            },
          },
        },
        include: {
          orderItems: {
            include: {
              product: { select: { name: true, slug: true } },
              vendor: { select: { storeName: true } },
            },
          },
          payment: true,
          events: true,
        },
      });

      // 3. Record OrderEvent
      await tx.orderEvent.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: OrderStatus.CANCELLED,
          actorId: userId,
          metadata: {
            reason: reason || 'Cancelled by user/admin',
          },
        },
      });

      // 4. Release Coupon Usage if applicable
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { decrement: 1 } },
        });

        if (order.couponUsage) {
          await tx.couponUsage.delete({
            where: { id: order.couponUsage.id },
          });
        }
      }

      // 5. Outbox Event
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'ORDER',
          aggregateId: orderId,
          eventType: 'ORDER_CANCELLED',
          payload: {
            orderId,
            buyerId: order.buyerId,
            reason,
          },
        },
      });

      return cancelled;
    });

    return this.formatOrder(updatedOrder);
  }

  /**
   * Vendor updates individual OrderItem fulfillment status and tracking details
   */
  async vendorUpdateItemStatus(
    vendorUserId: string,
    orderItemId: string,
    dto: UpdateOrderItemStatusDto,
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        vendor: true,
        order: {
          include: {
            orderItems: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Order item not found');
    }

    if (item.vendor.ownerUserId !== vendorUserId) {
      throw new ForbiddenException(
        'You are not authorized to update this order item',
      );
    }

    const updatedItem = await this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: dto.status,
          trackingNumber: dto.trackingNumber,
          trackingCarrier: dto.trackingCarrier,
        },
        include: {
          product: { select: { name: true, slug: true } },
          vendor: { select: { storeName: true } },
        },
      });

      // Record OrderEvent for item transition
      await tx.orderEvent.create({
        data: {
          orderId: item.orderId,
          previousStatus: item.status,
          newStatus: dto.status,
          actorId: vendorUserId,
          metadata: {
            orderItemId,
            trackingNumber: dto.trackingNumber,
            trackingCarrier: dto.trackingCarrier,
          },
        },
      });

      // If all items are SHIPPED or DELIVERED, advance order status
      const allItems = await tx.orderItem.findMany({
        where: { orderId: item.orderId },
      });

      const allDelivered = allItems.every(
        (i: any) => i.status === OrderItemStatus.DELIVERED,
      );
      const allShippedOrDelivered = allItems.every(
        (i: any) =>
          i.status === OrderItemStatus.SHIPPED ||
          i.status === OrderItemStatus.DELIVERED,
      );

      if (allDelivered && item.order.status !== OrderStatus.DELIVERED) {
        await tx.order.update({
          where: { id: item.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      } else if (
        allShippedOrDelivered &&
        item.order.status !== OrderStatus.SHIPPED &&
        item.order.status !== OrderStatus.DELIVERED
      ) {
        await tx.order.update({
          where: { id: item.orderId },
          data: { status: OrderStatus.SHIPPED },
        });
      }

      return updated;
    });

    return {
      id: updatedItem.id,
      orderId: updatedItem.orderId,
      vendorId: updatedItem.vendorId,
      vendorName: updatedItem.vendor?.storeName,
      productId: updatedItem.productId,
      productName: updatedItem.product?.name,
      productSlug: updatedItem.product?.slug,
      quantity: updatedItem.quantity,
      unitPrice: Number(updatedItem.unitPrice),
      subtotal: Number(updatedItem.unitPrice) * updatedItem.quantity,
      status: updatedItem.status as OrderItemStatus,
      trackingNumber: updatedItem.trackingNumber,
      trackingCarrier: updatedItem.trackingCarrier,
    };
  }

  /**
   * Admin: List all orders with pagination and filtering
   */
  async adminFindAll(page = 1, limit = 10, status?: OrderStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            include: {
              product: { select: { name: true, slug: true } },
              vendor: { select: { storeName: true } },
            },
          },
          payment: true,
          events: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o: any) => this.formatOrder(o)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Update overall order status
   */
  async adminUpdateOrderStatus(
    adminUserId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const res = await tx.order.update({
        where: { id: orderId },
        data: { status: dto.status },
        include: {
          orderItems: {
            include: {
              product: { select: { name: true, slug: true } },
              vendor: { select: { storeName: true } },
            },
          },
          payment: true,
          events: true,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: dto.status,
          actorId: adminUserId,
          metadata: { note: dto.note || 'Updated by Administrator' },
        },
      });

      return res;
    });

    return this.formatOrder(updated);
  }
}
