import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";

export interface PlatformSettings {
  maintenanceMode: boolean;
  defaultLanguage: string;
  featuredBannerIds: string[];
  paymentGateway?: Record<string, unknown>;
  termsUrl?: string;
  privacyUrl?: string;
  contactContent?: string;
}

export interface DownloadRules {
  maxDownloadsPerUser: number;
  expirationDays: number;
  subscriptionRequired: boolean;
}

export const settingsApi = {
  get: (): Promise<PlatformSettings> =>
    useMock
      ? mockDelay(150).then(() => mockDb.getSettings() as PlatformSettings)
      : api.get<PlatformSettings>("/settings").then((r) => r.data),
  update: (body: Partial<PlatformSettings>): Promise<PlatformSettings> =>
    useMock
      ? mockDelay(200).then(() => {
          mockDb.updateSettings(body);
          return mockDb.getSettings() as PlatformSettings;
        })
      : api.patch<PlatformSettings>("/settings", body).then((r) => r.data),
  downloadRules: {
    get: () =>
      useMock
        ? mockDelay(100).then(() => mockDb.getDownloadRules())
        : api.get<DownloadRules>("/settings/download-rules").then((r) => r.data),
    update: (body: Partial<DownloadRules>) =>
      useMock
        ? mockDelay(200).then(() => {
            mockDb.updateDownloadRules(body);
            return mockDb.getDownloadRules();
          })
        : api.patch<DownloadRules>("/settings/download-rules", body).then((r) => r.data),
  },
};
