'use client';

import { useEffect, useState } from 'react';

export function useListState(limit = 10) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return { page, setPage, limit, search, setSearch, debouncedSearch };
}
