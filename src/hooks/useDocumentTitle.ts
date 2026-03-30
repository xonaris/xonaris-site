import { useEffect } from 'react';

const SUFFIX = ' — Xonaris';

/**
 * Sets document.title on mount/update. Resets to default on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title + SUFFIX;
    return () => {
      document.title = 'Xonaris';
    };
  }, [title]);
}
