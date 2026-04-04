import { useEffect } from 'react';

const SUFFIX = ' - XONARIS';

/**
 * Sets document.title on mount/update. Resets to default on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    let cleanTitle = title;
    if (cleanTitle.match(/[-—]\s*Xonaris/i)) {
      cleanTitle = cleanTitle.replace(/\s*[-—]\s*Xonaris/gi, '');
    }
    
    document.title = cleanTitle.trim() ? `${cleanTitle.trim()}${SUFFIX}` : 'XONARIS';
    
    return () => {
      document.title = 'XONARIS';
    };
  }, [title]);
}
