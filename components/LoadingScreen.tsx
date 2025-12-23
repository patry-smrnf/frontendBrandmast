import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Moon, Sparkles } from "lucide-react";
import SnowParticles from "@/components/SnowParticles";

// Dark modern loading page using Tailwind + shadcn/ui + framer-motion + lucide-react
// Drop this file into a Next.js / React app that already uses Tailwind and shadcn/ui.

interface DarkLoadingPageProps {
  title?: string;
  showProgress?: boolean;
  progress?: number;
  subtitle?: string;
}

export default function DarkLoadingPage({ 
  title = "Loading", 
  showProgress = true,
  progress: externalProgress,
  subtitle
}: DarkLoadingPageProps) {
  const controls = useAnimation();
  const [internalProgress, setInternalProgress] = useState(0);

  // Use external progress if provided, otherwise use internal simulation
  const progress = externalProgress !== undefined ? externalProgress : internalProgress;

  useEffect(() => {
    controls.start({ opacity: 1, y: 0 });

    // Only simulate progress if no external progress is provided
    if (externalProgress === undefined && showProgress) {
      const iv = setInterval(() => {
        setInternalProgress((p) => {
          const next = Math.min(100, p + Math.random() * 10);
          if (next >= 100) clearInterval(iv);
          return Math.round(next);
        });
      }, 400);

      return () => clearInterval(iv);
    }
  }, [controls, externalProgress, showProgress]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900/10 via-zinc-950 to-black text-slate-100 relative">
      <SnowParticles intensity="medium" />
      {/* subtle star-field background */}
      <svg className="pointer-events-none absolute inset-0 -z-10 opacity-30" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <radialGradient id="g" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#334155" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={controls}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md p-6 md:p-10 relative z-10"
        aria-busy={progress < 100}
        aria-live="polite"
      >
        <Card className="bg-gradient-to-tl from-zinc-950 via-zinc-950 to-black backdrop-blur-md border border-indigo-900/20 shadow-2xl rounded-2xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-3 bg-gradient-to-br from-purple-900/60 to-zinc-900/40 border border-indigo-900/20">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-indigo-800/10">
                  <Moon className="w-6 h-6 text-slate-200/90" />
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-lg md:text-2xl text-white font-semibold tracking-tight">{title}</h1>
                <p className="text-sm text-zinc-400 mt-1">
                  {subtitle || "Hang tight — we're setting things up for you."}
                </p>
              </div>

              <div className="ml-2 hidden md:flex items-center text-zinc-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Animated spinner + skeletons */}
            <div className="mt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-800/40 to-zinc-800/10 border border-slate-700/40">
                  <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
                </div>

                {showProgress && (
                  <div className="grow">
                    <div className="h-3 bg-zinc-900 rounded-full overflow-hidden relative">
                      {/* progress bar fill */}
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-500/80 to-indigo-400/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "easeOut", duration: 0.6 }}
                        aria-hidden
                      />
                      <div className="sr-only">{progress}%</div>
                    </div>

                    <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                      <span>Initializing</span>
                      <span>{progress}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* skeleton rows - only show if progress is enabled */}
              {showProgress && (
                <div className="mt-6 space-y-3">
                  <div className="w-full h-3 rounded-full bg-purple-950 animate-pulse" style={{ animationDuration: "1.6s" }} />
                  <div className="w-5/6 h-3 rounded-full bg-purple-800/50 animate-pulse" style={{ animationDuration: "1.4s" }} />
                  <div className="w-3/4 h-3 rounded-full bg-purple-900/40 animate-pulse" style={{ animationDuration: "1.8s" }} />
                </div>
              )}
            </div>

            {showProgress && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-400">Estimated</div>
                  <div className="text-sm font-medium">{progress < 100 ? "a few moments" : "done"}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="px-3 py-1 text-sm" onClick={() => setInternalProgress(100)}>
                    Skip
                  </Button>
                  <Button className="px-4 py-1 text-sm">
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Accessibility: reduced motion fallback */}
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-spin { animation: none; }
          .animate-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}
