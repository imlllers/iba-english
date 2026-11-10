import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/client";
import { authApi } from "./authApi";

const signedOut = (error: unknown) => error instanceof ApiError && (error.status === 401 || error.status === 403);

export function useSession() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (error) {
        if (signedOut(error)) return null;
        throw error;
      }
    },
    retry: true,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 60_000,
  });
}
