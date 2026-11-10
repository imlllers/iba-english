import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "./authApi";

export function useLogout() {
  const queryClient = useQueryClient();
  return async () => {
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      window.location.assign("/login");
    }
  };
}
