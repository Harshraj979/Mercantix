import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma } from '@mercantix/database';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationChannel, NotificationStatus } from '@mercantix/contracts';

/**
 * OutboxProcessorService implements the Transactional Outbox Pattern.
 *
 * It polls the `OutboxEvent` table for unprocessed events and dispatches
 * them to the appropriate in-process handlers. This decouples domain
 * transactions from asynchronous side-effects (emails, notifications,
 * analytics, etc.) while guaranteeing at-least-once delivery.
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private pollIntervalMs = 5000; // Poll every 5 seconds
  private maxRetries = 5;
  private batchSize = 20;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log(
      `OutboxProcessor started — polling every ${this.pollIntervalMs}ms`,
    );
    this.scheduleNextPoll();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log('OutboxProcessor stopped');
  }

  private scheduleNextPoll() {
    this.timer = setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  /**
   * Fetch a batch of unpublished events, process each, then reschedule.
   */
  private async poll() {
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
        this.logger.debug(`Processing ${events.length} outbox event(s)...`);
      }

      for (const event of events) {
        await this.dispatch(event);
      }
    } catch (err: any) {
      this.logger.error(`OutboxProcessor poll error: ${err?.message}`, err?.stack);
    } finally {
      this.isProcessing = false;
      this.scheduleNextPoll();
    }
  }

  /**
   * Route an outbox event to the correct handler by eventType.
   */
  private async dispatch(event: any) {
    try {
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
          await this.handleInventoryAdjusted(event);
          break;
        case 'VARIANT_INVENTORY_ADJUSTED':
          await this.handleInventoryAdjusted(event);
          break;
        default:
          this.logger.debug(
            `No handler registered for event type: ${event.eventType}`,
          );
      }

      // Mark event as published
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { publishedAt: new Date() },
      });
    } catch (err: any) {
      this.logger.warn(
        `Failed to process event ${event.id} (${event.eventType}): ${err?.message}`,
      );

      // Increment retry counter — will be excluded after maxRetries
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { retryCount: { increment: 1 } },
      });
    }
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  /**
   * ORDER_CREATED: Notify buyer with order confirmation
   */
  private async handleOrderCreated(event: any) {
    const { orderId, buyerId, total, currency, itemsCount } = event.payload;

    const user = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { id: true, email: true },
    });

    if (!user) return;

    await this.createInAppNotification(
      user.id,
      '🛒 Order Placed Successfully',
      `Your order of ${itemsCount} item(s) worth ${currency} ${total.toFixed(2)} has been placed. Order ID: ${orderId}`,
      event.payload,
    );

    this.logger.log(
      `[ORDER_CREATED] Notification dispatched for orderId=${orderId}`,
    );
  }

  /**
   * ORDER_CANCELLED: Notify buyer with cancellation confirmation
   */
  private async handleOrderCancelled(event: any) {
    const { orderId, buyerId, reason } = event.payload;

    const user = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { id: true },
    });

    if (!user) return;

    await this.createInAppNotification(
      user.id,
      '❌ Order Cancelled',
      `Your order ${orderId} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`.trim(),
      event.payload,
    );

    this.logger.log(
      `[ORDER_CANCELLED] Notification dispatched for orderId=${orderId}`,
    );
  }

  /**
   * PAYMENT_CAPTURED: Notify buyer with payment receipt
   */
  private async handlePaymentCaptured(event: any) {
    const { orderId, buyerId, amount, currency, providerReference } =
      event.payload;

    const user = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { id: true },
    });

    if (!user) return;

    await this.createInAppNotification(
      user.id,
      '✅ Payment Confirmed',
      `Payment of ${currency} ${Number(amount).toFixed(2)} captured successfully. Reference: ${providerReference || 'N/A'}. Order: ${orderId}`,
      event.payload,
    );

    this.logger.log(
      `[PAYMENT_CAPTURED] Receipt notification dispatched for orderId=${orderId}`,
    );
  }

  /**
   * INVENTORY_ADJUSTED: Log adjustment — extensible for warehouse sync or alerts
   */
  private async handleInventoryAdjusted(event: any) {
    const { productId, adjustment, newQuantity, reason } = event.payload;

    // Low-stock threshold alert: notify admin if stock drops below 5
    if (newQuantity <= 5 && adjustment < 0) {
      const admins = await this.prisma.userRole.findMany({
        where: {
          role: { name: 'ADMIN' },
        },
        include: { user: true },
      });

      for (const adminRole of admins) {
        await this.createInAppNotification(
          adminRole.user.id,
          '⚠️ Low Stock Alert',
          `Product ${productId} stock dropped to ${newQuantity} unit(s). ${reason || ''}`.trim(),
          event.payload,
        );
      }
    }

    this.logger.log(
      `[INVENTORY_ADJUSTED] productId=${productId} adjustment=${adjustment} newQty=${newQuantity}`,
    );
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  /**
   * Persist an in-app notification row for a user
   */
  private async createInAppNotification(
    userId: string,
    title: string,
    body: string,
    metadata?: Record<string, any>,
  ) {
    await this.prisma.notification.create({
      data: {
        userId,
        channel: NotificationChannel.IN_APP,
        title,
        body,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * Manual admin trigger: process all pending outbox events immediately
   */
  async flushPendingEvents(): Promise<{ processed: number; failed: number }> {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        publishedAt: null,
        retryCount: { lt: this.maxRetries },
      },
      orderBy: { createdAt: 'asc' },
    });

    let processed = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.dispatch(event);
        processed++;
      } catch {
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Get pending events count and dead-letter events (retryCount >= maxRetries)
   */
  async getOutboxStats() {
    const [pendingCount, deadLetterCount, totalProcessed] = await Promise.all([
      this.prisma.outboxEvent.count({
        where: { publishedAt: null, retryCount: { lt: this.maxRetries } },
      }),
      this.prisma.outboxEvent.count({
        where: { publishedAt: null, retryCount: { gte: this.maxRetries } },
      }),
      this.prisma.outboxEvent.count({
        where: { publishedAt: { not: null } },
      }),
    ]);

    return {
      pendingCount,
      deadLetterCount,
      totalProcessed,
    };
  }
}
