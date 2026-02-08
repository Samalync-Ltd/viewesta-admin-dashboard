import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { NotificationPayload } from "../types/models";

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  scheduledAt: string;
  sentAt?: string;
  status: string;
}

export const notificationsApi = {
  send: (payload: NotificationPayload) =>
    useMock
      ? mockDelay(300).then(() => ({ id: `n${Date.now()}`, ...payload, status: "sent" }))
      : api.post("/notifications/send", payload).then((r) => r.data),
  list: (params?: { page?: number; limit?: number }) =>
    useMock
      ? mockDelay(200).then(() => mockDb.getNotifications())
      : api.get<{ data: ScheduledNotification[]; total: number }>("/notifications", { params }).then((r) => r.data),
};
