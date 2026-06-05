import { useEffect, useRef, useState } from 'react';

/**
 * useDebounce
 * Returns a debounced version of `value` that only updates after `delay` ms
 * of silence. Cancels the pending timer on unmount.
 *
 * @param {any}    value  - The value to debounce (typically a search query string)
 * @param {number} delay  - Debounce delay in milliseconds (default 100 ms)
 */
export function useDebounce(value, delay = 100) {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced;
}
