'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';

/**
 * Waits for AuthProvider to rehydrate the access token from the refresh
 * cookie before firing an authenticated request.
 */
export function useApiQuery<T>(key: readonly unknown[], fetcher: () => Promise<T>) {
  const { isLoading } = useAuth();
  return useQuery({
    queryKey: key as unknown[],
    queryFn: fetcher,
    enabled: !isLoading,
  });
}
