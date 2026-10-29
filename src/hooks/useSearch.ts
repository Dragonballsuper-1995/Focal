import { useState, useEffect, useRef, useCallback } from 'react';
import type { SearchResult } from '@/types';
import { searchItems } from '@/services/ipc';

export function useSearch(initialResults: SearchResult[] = []) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [isLoading, setIsLoading] = useState(false);
  const latestRequestId = useRef(0);

  const performSearch = useCallback(async (q: string) => {
    const requestId = ++latestRequestId.current;
    setIsLoading(true);

    try {
      const items = await searchItems(q);
      if (requestId === latestRequestId.current) {
        setResults(items);
      }
    } catch (err) {
      if (requestId === latestRequestId.current) {
        console.error('[useSearch] Error fetching results:', err);
      }
    } finally {
      if (requestId === latestRequestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // If empty query, fetch immediately
    if (!query) {
      performSearch('');
      return;
    }

    // Debounce fast keystrokes by 15ms
    const timer = setTimeout(() => {
      performSearch(query);
    }, 15);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    clearQuery,
    results,
    setResults,
    isLoading,
    refresh: () => performSearch(query),
  };
}
