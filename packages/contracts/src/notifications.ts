import { NotificationChannel, NotificationStatus } from './enums';

export interface NotificationResponse {
  id: string;
  userId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  status: NotificationStatus;
  metadata?: Record<string, any> | null;
  isRead?: boolean;
  sentAt?: Date | null;
  createdAt: Date;
}

export interface NotificationSummaryResponse {
  unreadCount: number;
  totalCount: number;
}
