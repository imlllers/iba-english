import { Avatar } from "@mantine/core";
import type { User } from "@/entities/user/types";

export const AVATARS = Array.from({ length: 12 }, (_, index) => `avatar_${String(index + 1).padStart(2, "0")}`);

export function avatarSrc(avatar: string) {
  return `/avatars/${avatar}.png`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2)).toUpperCase() || "?";
}

export function UserAvatar({ user, size }: {
  user: Pick<User, "displayName" | "avatar">;
  size: number | "md";
}) {
  if (user.avatar) {
    return <Avatar src={avatarSrc(user.avatar)} alt="" size={size} radius="50%" />;
  }
  return <Avatar size={size} radius="50%" color="iba" variant="filled">{initials(user.displayName)}</Avatar>;
}
