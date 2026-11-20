import type { PaginatedResult } from './api-response';

/** Wraps a page of rows in the shape the response envelope interceptor understands. */
export function paginate<T>(
  data: T[],
  total: number,
  query: { page: number; limit: number },
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
