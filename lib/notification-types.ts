// Re-export shared notification types for single source of truth
export type {
  NotificationType,
  NotificationTypeOption,
  NotificationTypeValue,
} from '../../shared/notificationStatuses';

export {
  NOTIFICATION_TYPES,
  getNotificationTypeOption,
  getNotificationTypeLabel,
  getNotificationTypeDescription,
  VALID_NOTIFICATION_TYPES,
  isValidNotificationType,
} from '../../shared/notificationStatuses';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string; // NotificationType from shared
  createdAt: string;
  isRead: boolean;
  isLog?: boolean; // Marked as true when this is a historical log entry (read-only)
  updatedAt?: string;
  link?: string;
  metadata?: {
    appointmentId?: string;
    currentStatus?: string;
    patientName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    isRequest?: boolean;
  };
}
