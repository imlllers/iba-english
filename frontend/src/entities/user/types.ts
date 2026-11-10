export type Role = "ADMIN" | "TEACHER";
export type UserStatus = "ACTIVE" | "BLOCKED";

export type User = {
  id: string;
  email: string;
  displayName: string;
  avatar?: string | null;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};
