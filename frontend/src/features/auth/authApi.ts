import { api, json } from "@/shared/api/client";
import type { User } from "@/entities/user/types";

export type RegisterInput = {
  inviteCode: string;
  email: string;
  displayName: string;
  password: string;
};

export const authApi = {
  me: () => api<User>("/api/auth/me"),
  login: (email: string, password: string, rememberMe = false, adminSecret?: string) =>
    api<User>("/api/auth/login", json("POST", { email, password, rememberMe, adminSecret })),
  register: (input: RegisterInput) => api<{ ok: boolean }>("/api/auth/register", json("POST", input)),
  verifyEmail: (token: string) => api<{ ok: boolean }>("/api/auth/verify-email", json("POST", { token })),
  resendVerification: (email: string) =>
    api<{ ok: boolean }>("/api/auth/resend-verification", json("POST", { email })),
  forgotPassword: (email: string) => api<{ ok: boolean }>("/api/auth/forgot-password", json("POST", { email })),
  resetPassword: (token: string, password: string) =>
    api<{ ok: boolean }>("/api/auth/reset-password", json("POST", { token, password })),
  logout: () => api<void>("/api/auth/logout", json("POST")),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<void>("/api/auth/password", json("POST", { currentPassword, newPassword })),
  updateProfile: (displayName: string, email?: string) => api<User>("/api/auth/profile", json("PUT", { displayName, email })),
  updateAvatar: (avatar: string | null) => api<User>("/api/auth/avatar", json("PUT", { avatar })),
};
