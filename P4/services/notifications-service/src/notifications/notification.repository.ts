import type { NewNotification, Notification } from "./notification.types.js";

export interface NotificationRepository {
  createMany(notifications: NewNotification[]): Promise<Notification[]>;
  findByBatch(batchId: number): Promise<Notification[]>;
}
