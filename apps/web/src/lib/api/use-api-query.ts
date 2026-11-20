'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';

/**
 * Waits for AuthProvider to rehydrate the access token from the refresh
 * cookie before firing an authenticated request.
 */
export function useApiQuery<T>(key: readonly unknown[], fetcher: () => Promise<T>) {
  const { isLoading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: key as unknown[],
    queryFn: fetcher,
    enabled: !authLoading,
  });

  // A disabled query reports isLoading=false, which would flash "no records"
  // while the access token is still being restored from the refresh cookie.
  return { ...query, isLoading: query.isLoading || authLoading };
}
