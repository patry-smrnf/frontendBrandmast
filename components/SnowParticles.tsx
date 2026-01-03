"use client";

import React, { useMemo, useEffect, useState } from "react";

interface SnowParticlesProps {
  particleCount?: number;
  intensity?: "low" | "medium" | "high";
}

/**
 * Lightweight snow particles component using CSS animations for optimal performance.
 * Uses GPU-accelerated transforms and opacity for smooth, low-CPU animations.
 */
export default function SnowParticles({ 
  particleCount = 50,
  intensity = "medium" 
}: SnowParticlesProps) {
  // Adjust particle count based on intensity
  const count = useMemo(() => {
    switch (intensity) {
      case "low": return 60;
      case "medium": return 100;
      case "high": return 150;
      default: return particleCount;
    }
  }, [intensity, particleCount]);

  // Generate random snowflake properties only on client side to avoid hydration mismatch
  const [snowflakes, setSnowflakes] = useState<Array<{
    id: number;
    left: number;
    delay: number;
    duration: number;
    size: number;
    opacity: number;
    swayEnd: number;
  }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only generate particles on client side after mount
    // Small delay to ensure DOM is ready and animations can start
    const timer = setTimeout(() => {
      setSnowflakes(
        Array.from({ length: count }, (_, i) => {
          const sway = Math.random() * 30 - 15; // -15px to 15px horizontal drift
          // Distribute more evenly across the screen to avoid clustering
          const left = (i / count) * 100 + (Math.random() * 2 - 1); // More even distribution with slight randomness
          const duration = 10 + Math.random() * 20; // 10-30s fall duration
          return {
            id: i,
            left: Math.max(0, Math.min(100, left)), // Clamp to 0-100%
            delay: -Math.random() * duration, // Start animation at random point in cycle to pre-populate screen
            duration,
            size: 2 + Math.random() * 5, // 4-10px
            opacity: 0.2 + Math.random() * 0.5, // 0.3-0.8
            swayEnd: sway, // Final horizontal position
          };
        })
      );
    }, 10);

    return () => clearTimeout(timer);
  }, [count]);

  // Inject CSS keyframes once
  useEffect(() => {
    const styleId = "snow-particles-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes snowfall {
        0% {
          transform: translateY(0) translateX(0px);
          opacity: 0;
        }
        2% {
          opacity: 1;
        }
        98% {
          opacity: 1;
        }
        100% {
          transform: translateY(calc(100vh + 10px)) translateX(var(--sway-end, 0px));
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {mounted && snowflakes.map((flake) => (
        <div
          key={`${flake.id}-${mounted}`}
          className="absolute rounded-full bg-white"
          style={{
            left: `${flake.left}%`,
            top: "-10px",
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            animation: `snowfall ${flake.duration}s linear ${flake.delay}s infinite`,
            "--sway-end": `${flake.swayEnd}px`,
            willChange: "transform, opacity",
          } as React.CSSProperties & { "--sway-end": string }}
        />
      ))}
    </div>
  );
}
