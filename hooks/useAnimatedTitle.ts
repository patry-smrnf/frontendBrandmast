import { useEffect, useRef } from 'react';

interface UseAnimatedTitleOptions {
  /**
   * The title to show when the tab is visible
   */
  visibleTitle: string;
  /**
   * The title to show when the tab is hidden (can be array for scrolling effect)
   */
  hiddenTitle: string | string[];
  /**
   * Animation speed in milliseconds (how fast to cycle through titles)
   */
  animationSpeed?: number;
  /**
   * Whether to enable the animation
   */
  enabled?: boolean;
}

/**
 * Custom hook that animates the page title when the browser tab becomes hidden.
 * When visible, shows the normal title. When hidden, animates through provided titles.
 */
export function useAnimatedTitle({
  visibleTitle,
  hiddenTitle,
  animationSpeed = 2000,
  enabled = true,
}: UseAnimatedTitleOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const titleIndexRef = useRef(0);
  const originalTitleRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;

    // Store original title
    originalTitleRef.current = document.title;

    const titles = Array.isArray(hiddenTitle) ? hiddenTitle : [hiddenTitle];

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden - start animation
        titleIndexRef.current = 0;
        
        const animate = () => {
          if (titles.length > 0) {
            document.title = titles[titleIndexRef.current];
            titleIndexRef.current = (titleIndexRef.current + 1) % titles.length;
          }
        };

        // Start with first title immediately
        animate();

        // Continue animating
        intervalRef.current = setInterval(animate, animationSpeed);
      } else {
        // Tab is now visible - stop animation and restore normal title
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        document.title = visibleTitle;
      }
    };

    // Set initial title
    document.title = visibleTitle;

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Restore original title
      document.title = originalTitleRef.current;
    };
  }, [visibleTitle, hiddenTitle, animationSpeed, enabled]);

  // Update visible title when it changes
  useEffect(() => {
    if (!document.hidden) {
      document.title = visibleTitle;
    }
  }, [visibleTitle]);
}

