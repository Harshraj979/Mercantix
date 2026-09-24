import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel, NotificationStatus } from '@mercantix/contracts';

@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private pollIntervalMs: number;
  private maxRetries: number;
  private batchSize: number;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.pollIntervalMs = this.config.get<number>('WORKER_POLL_INTERVAL_MS', 3000);
    this.maxRetries = this.config.get<number>('WORKER_MAX_RETRIES', 5);
    this.batchSize = this.config.get<number>('WORKER_BATCH_SIZE', 25);
  }

  onModuleInit() {
    this.logger.log(
      `[OutboxWorker] Initialized — polling every ${this.pollIntervalMs}ms (batchSize: ${this.batchSize}, maxRetries: ${this.maxRetries})`,
    );
    this.scheduleNextPoll();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log('[OutboxWorker] Stopped poll cycle gracefully');
  }

  private scheduleNextPoll() {
    this.timer = setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  /**
   * Polls the OutboxEvent table for unprocessed events and dispatches them
   */
  public async poll() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          publishedAt: null,
          retryCount: { lt: this.maxRetries },
        },
        orderBy: { createdAt: 'asc' },
        take: this.batchSize,
      });

      if (events.length > 0) {
        this.logger.log(`[OutboxWorker] Found ${events.length} pending event(s) to process`);
      }

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (err: any) {
      this.logger.error(`[OutboxWorker] Error during polling batch: ${err?.message}`, err?.stack);
    } finally {
      this.isProcessing = false;
      this.scheduleNextPoll();
    }
  }

  /**
   * Processes an individual OutboxEvent with retry tracking and backoff
   */
  private async processEvent(event: any) {
    const startTime = Date.now();
    try {
      this.logger.debug(
        `[OutboxWorker] Dispatching ${event.eventType} (Aggregate: ${event.aggregateType}#${event.aggregateId})`,
      );

      switch (event.eventType) {
        case 'ORDER_CREATED':
          await this.handleOrderCreated(event);
          break;
        case 'ORDER_CANCELLED':
          await this.handleOrderCancelled(event);
          break;
        case 'PAYMENT_CAPTURED':
          await this.handlePaymentCaptured(event);
          break;
        case 'INVENTORY_ADJUSTED':
        case 'VARIANT_INVENTORY_ADJUSTED':
          await this.handleInventoryAdjusted(event);
          break;
        default:
          this.logger.warn(`[OutboxWorker] Unhandled eventType: ${event.eventType}`);
          break;
      }

      // Mark event as successfully published
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          publishedAt: new Date(),
        },
      });

      const elapsed = Date.now() - startTime;
      this.logger.log(`[OutboxWorker] Completed ${event.eventType} #${event.id} in ${elapsed}ms`);
    } catch (err: any) {
      this.logger.error(
        `[OutboxWorker] Failed ${event.eventType} #${event.id}: ${err?.message}`,
      );

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          retryCount: { increment: 1 },
        },
      });
    }
  }

  /**
   * ORDER_CREATED: Creates notifications for buyer and vendor store owners
   */
  private async handleOrderCreated(event: any) {
    const payload = event.payload as any;
    if (!payload?.orderId || !payload?.buyerId) return;

    // 1. Notify Buyer
    await this.prisma.notification.create({
      data: {
        userId: payload.buyerId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        title: 'Order Confirmed!',
        body: `Your order for ₹${payload.totalAmount || 0} has been placed successfully.`,
        metadata: {
          orderId: payload.orderId,
          eventType: 'ORDER_CONFIRMATION',
        },
      },
    });

    // 2. Notify each Vendor with products in this order
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId: payload.orderId },
      include: {
        vendor: { select: { ownerUserId: true, storeName: true } },
      },
    });

    const notifiedVendorUsers = new Set<string>();
    for (const item of orderItems) {
      const ownerId = item.vendor?.ownerUserId;
      if (ownerId && !notifiedVendorUsers.has(ownerId)) {
        notifiedVendorUsers.add(ownerId);
        await this.prisma.notification.create({
          data: {
            userId: ownerId,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.PENDING,
            title: 'New Customer Order Received',
            body: `Store "${item.vendor?.storeName}" has a new order item awaiting fulfillment.`,
            metadata: {
              orderId: payload.orderId,
              vendorId: item.vendorId,
            },
          },
        });
      }
    }
  }

  /**
   * ORDER_CANCELLED: Alerts buyer of cancellation
   */
  private async handleOrderCancelled(event: any) {
    const payload = event.payload as any;
    if (!payload?.buyerId) return;

    await this.prisma.notification.create({
      data: {
        userId: payload.buyerId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        title: 'Order Cancelled',
        body: `Order #${payload.orderId?.slice(0, 8)} has been cancelled. Any reserved stock has been released.`,
        metadata: {
          orderId: payload.orderId,
          reason: payload.reason,
        },
      },
    });
  }

  /**
   * PAYMENT_CAPTURED: Emits digital payment receipt notification
   */
  private async handlePaymentCaptured(event: any) {
    const payload = event.payload as any;
    if (!payload?.userId && !payload?.buyerId) return;

    const recipientId = payload.userId || payload.buyerId;
    await this.prisma.notification.create({
      data: {
        userId: recipientId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        title: 'Payment Receipt',
        body: `Payment of ₹${payload.amount || 0} via ${payload.provider || 'Gateway'} was successfully verified.`,
        metadata: {
          paymentId: payload.paymentId,
          orderId: payload.orderId,
        },
      },
    });
  }

  /**
   * INVENTORY_ADJUSTED: Checks if product stock crossed below low-stock threshold
   */
  private async handleInventoryAdjusted(event: any) {
    const payload = event.payload as any;
    if (!payload?.productId) return;

    const product = await this.prisma.product.findUnique({
      where: { id: payload.productId },
      include: {
        vendor: { select: { ownerUserId: true, storeName: true } },
        inventory: { select: { availableQuantity: true } },
      },
    });

    const stock = product?.inventory?.availableQuantity ?? 0;

    if (product && stock <= 5 && product.vendor?.ownerUserId) {
      await this.prisma.notification.create({
        data: {
          userId: product.vendor.ownerUserId,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          title: 'Low Stock Alert',
          body: `"${product.name}" is running low on stock (${stock} units remaining).`,
          metadata: {
            productId: product.id,
            availableQuantity: stock,
          },
        },
      });
    }
  }
}
