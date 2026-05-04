/**
 * 🎣 useAdNeutralizer Hook
 * React Hook for Ad Neutralization
 * 
 * @description Hook لإدارة نظام إخفاء الإعلانات في مشغل الفيديو
 * @author Online Cinema Team
 * @version 1.0.0
 */

import { useEffect, useRef } from 'react';
import { adNeutralizer } from '../utils/adNeutralizer';

export interface UseAdNeutralizerOptions {
  enabled?: boolean;
}

export const useAdNeutralizer = (options: UseAdNeutralizerOptions = {}) => {
  const { enabled = true } = options;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!enabled || !iframeRef.current) {return;}

    // Inject ad neutralizer into iframe
    adNeutralizer.injectIntoIframe(iframeRef.current);

    // Cleanup on unmount
    return () => {
      adNeutralizer.cleanup();
    };
  }, [enabled]);

  return {
    iframeRef,
    neutralizeAndPlay: (url: string) => {
      // Set iframe source to play video
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    },
  };
};

export default useAdNeutralizer;
