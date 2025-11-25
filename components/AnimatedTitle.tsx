"use client";

import { useEffect, useRef } from 'react';

interface AnimatedTitleProps {
  /**
   * Array of titles to cycle through
   */
  titles: string[];
  /**
   * Interval in milliseconds between title changes (default: 3000ms = 3 seconds)
   */
  interval?: number;
  /**
   * Whether to enable the animation
   */
  enabled?: boolean;
}

/**
 * Client component that animates the page title by cycling through provided titles
 */
export default function AnimatedTitle({ 
  titles, 
  interval = 3000,
  enabled = true 
}: AnimatedTitleProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const titleIndexRef = useRef(0);

  useEffect(() => {
    if (!enabled || titles.length === 0) return;

    // Set initial title
    if (titles.length > 0) {
      document.title = titles[0];
      titleIndexRef.current = 0;
    }

    // Cycle through titles
    const cycleTitles = () => {
      if (titles.length > 0) {
        titleIndexRef.current = (titleIndexRef.current + 1) % titles.length;
        document.title = titles[titleIndexRef.current];
      }
    };

    // Start cycling
    intervalRef.current = setInterval(cycleTitles, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [titles, interval, enabled]);

  // This component doesn't render anything
  return null;
}

