import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  NotificationChannel,
  NotificationStatus,
} from '@mercantix/contracts';
import {
  NotificationQueryDto,
  NotificationResponseDto,
  NotificationSummaryResponseDto,
} from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format Prisma Notification model into NotificationResponseDto
   */
  private formatNotification(n: any): NotificationResponseDto {
    const metadata = (n.metadata as Record<string, any>) || null;
    const isRead = metadata?.isRead === true;

    return {
      id: n.id,
      userId: n.userId,
      channel: n.channel as NotificationChannel,
      title: n.title,
      body: n.body,
      status: n.status as NotificationStatus,
      metadata,
      isRead,
      sentAt: n.sentAt,
      createdAt: n.createdAt,
    };
  }

  /**
   * Fetch paginated notifications for the authenticated user
   */
  async getUserNotifications(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.channel) {
      where.channel = query.channel;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map((n: any) => this.formatNotification(n)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get total and unread notification count summary
   */
  async getNotificationSummary(
    userId: string,
  ): Promise<NotificationSummaryResponseDto> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      select: { metadata: true },
    });

    const totalCount = notifications.length;
    let unreadCount = 0;

    for (const n of notifications) {
      const meta = n.metadata as Record<string, any> | null;
      if (!meta || meta.isRead !== true) {
        unreadCount++;
      }
    }

    return {
      unreadCount,
      totalCount,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this notification',
      );
    }

    const currentMeta = (notification.metadata as Record<string, any>) || {};
    const updatedMeta = {
      ...currentMeta,
      isRead: true,
      readAt: new Date().toISOString(),
    };

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        metadata: updatedMeta,
      },
    });

    return this.formatNotification(updated);
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
    });

    let count = 0;
    for (const n of notifications) {
      const currentMeta = (n.metadata as Record<string, any>) || {};
      if (!currentMeta.isRead) {
        await this.prisma.notification.update({
          where: { id: n.id },
          data: {
            metadata: {
              ...currentMeta,
              isRead: true,
              readAt: new Date().toISOString(),
            },
          },
        });
        count++;
      }
    }

    return {
      message: 'All notifications marked as read',
      markedCount: count,
    };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this notification',
      );
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification successfully deleted' };
  }
}
