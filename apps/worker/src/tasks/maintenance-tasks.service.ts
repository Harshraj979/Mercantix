import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceTasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceTasksService.name);
  private intervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Default maintenance cycle: every 15 minutes (or configurable via env)
    this.intervalMs = this.config.get<number>(
      'WORKER_MAINTENANCE_INTERVAL_MS',
      15 * 60 * 1000,
    );
  }

  onModuleInit() {
    this.logger.log(
      `[MaintenanceTasks] Scheduled periodic maintenance runner every ${this.intervalMs / 1000}s`,
    );
    // Initial run after 10s warmup
    this.timer = setTimeout(() => this.runMaintenanceJobs(), 10000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log('[MaintenanceTasks] Stopped maintenance cycle');
  }

  private scheduleNext() {
    this.timer = setTimeout(() => this.runMaintenanceJobs(), this.intervalMs);
  }

  /**
   * Orchestrates background maintenance tasks
   */
  public async runMaintenanceJobs() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.logger.log('[MaintenanceTasks] Running background maintenance routines...');
      await this.inactivateExpiredCoupons();
      await this.pruneStaleCartItems();
    } catch (err: any) {
      this.logger.error(
        `[MaintenanceTasks] Error during maintenance routines: ${err?.message}`,
        err?.stack,
      );
    } finally {
      this.isRunning = false;
      this.scheduleNext();
    }
  }

  /**
   * Disables coupons that have passed their expiration date
   */
  private async inactivateExpiredCoupons() {
    const now = new Date();
    const result = await this.prisma.coupon.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: now },
      },
      data: {
        isActive: false,
      },
    });

    if (result.count > 0) {
      this.logger.log(`[MaintenanceTasks] Inactivated ${result.count} expired coupon(s)`);
    }
  }

  /**
   * Cleans up cart items in inactive carts older than 30 days
   */
  private async pruneStaleCartItems() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.cartItem.deleteMany({
      where: {
        updatedAt: { lt: thirtyDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(`[MaintenanceTasks] Pruned ${result.count} abandoned cart item(s)`);
    }
  }
}
