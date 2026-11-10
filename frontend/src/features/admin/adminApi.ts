import { api, json, queryString } from "@/shared/api/client";
import type { Page } from "@/shared/api/types";
import type { Role, User, UserStatus } from "@/entities/user/types";
import type { AccessStatus, TestSummary } from "@/entities/test/types";

export type UploadKind = "audio" | "image" | "recording" | "video";
export type PlatformSettings = {
  maxUploadBytes: number;
  uploadLimits: Record<UploadKind, number>;
  serverMaxUploadBytes: number;
  attemptRetentionDays: number;
  linkLifetimeHours: number;
};
export type AuditEvent = {
  id: string;
  action: string;
  targetType: string | null;
  targetId?: string;
  actorEmail: string;
  createdAt: string;
  details: Record<string, unknown>;
};
export type UserQuery = { q?: string; role?: Role | ""; status?: UserStatus | ""; page?: number; size?: number };
export type NewUser = { email: string; displayName: string; password: string; role: Role };
export type Invite = {
  id: string;
  code: string | null;
  expiresAt: string;
  createdAt: string;
  active: boolean;
  usedAt: string | null;
  revokedAt: string | null;
};

export const adminApi = {
  users: (query: UserQuery) => api<Page<User>>(`/api/admin/users${queryString(query)}`),
  createUser: (input: NewUser) => api<User>("/api/admin/users", json("POST", input)),
  changeStatus: (id: string, status: UserStatus) => api<User>(`/api/admin/users/${id}/status`, json("PATCH", { status })),
  changeRole: (id: string, role: Role) => api<User>(`/api/admin/users/${id}/role`, json("PATCH", { role })),
  invites: () => api<Invite[]>("/api/admin/invites"),
  createInvite: (validDays?: number) => api<Invite>("/api/admin/invites", json("POST", { validDays: validDays ?? 7 })),
  revokeInvite: (id: string) => api<void>(`/api/admin/invites/${id}/revoke`, json("POST")),
  tests: (query: { q?: string; status?: AccessStatus | ""; page?: number; size?: number }) =>
    api<Page<TestSummary>>(`/api/admin/tests${queryString(query)}`),
  deleteTest: (id: string) => api<void>(`/api/admin/tests/${id}`, json("DELETE")),
  audit: (query: { q?: string; page?: number; size?: number }) => api<Page<AuditEvent>>(`/api/admin/audit${queryString(query)}`),
  settings: () => api<PlatformSettings>("/api/admin/settings"),
  updateSettings: (input: Pick<PlatformSettings, "uploadLimits" | "attemptRetentionDays" | "linkLifetimeHours">) =>
    api<PlatformSettings>("/api/admin/settings", json("PUT", input)),
};
