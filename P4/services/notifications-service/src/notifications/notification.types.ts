export interface NewNotification {
  batchId: number;
  beneficiary: string;
  targetAccount: string;
  amount: number;
  status: "sent" | "failed";
}

export interface Notification extends NewNotification {
  id: number;
  createdAt: string;
}
