"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import DarkLoadingPage from "@/components/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyActivityResponse } from "@/types/apiStuff/responses/MyActivityResponse";
import { Clock, Monitor, Smartphone, Tablet, Activity, Info } from "lucide-react";
import ContextMenu from "@/components/contextMenu";

// Helper function to parse user agent and extract device/browser info
function parseUserAgent(userAgent: string): { device: string; browser: string; icon: React.ReactNode } {
  const ua = userAgent.toLowerCase();
  
  // Detect device
  let device = "Unknown";
  let icon: React.ReactNode = <Monitor className="w-4 h-4" />;
  
  if (ua.includes("iphone") || ua.includes("ipod")) {
    device = "iPhone";
    icon = <Smartphone className="w-4 h-4" />;
  } else if (ua.includes("ipad")) {
    device = "iPad";
    icon = <Tablet className="w-4 h-4" />;
  } else if (ua.includes("android")) {
    if (ua.includes("mobile")) {
      device = "Android Phone";
      icon = <Smartphone className="w-4 h-4" />;
    } else {
      device = "Android Tablet";
      icon = <Tablet className="w-4 h-4" />;
    }
  } else if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) {
    device = "Desktop";
    icon = <Monitor className="w-4 h-4" />;
  }
  
  // Detect browser
  let browser = "Unknown";
  if (ua.includes("edg")) {
    browser = "Edge";
  } else if (ua.includes("chrome") && !ua.includes("edg")) {
    browser = "Chrome";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
  } else if (ua.includes("yabrowser")) {
    browser = "Yandex";
  }
  
  return { device, browser, icon };
}

// Format timestamp to readable format
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyActivityPage() {
    
  
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);


  const [data, setData] = useState<MyActivityResponse>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    mountedRef.current = true;
    setLoading(true);

    const fetchData = async () => {
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        timeoutId = setTimeout(() => {
          controller.abort();
        }, 15000);

        const res = await apiFetch<MyActivityResponse>("/api/general/myAccActivies", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (mountedRef.current && !controller.signal.aborted) {
          // Sort by newest first (by timestamp descending)
          const sorted = [...res].sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateB - dateA;
          });
          setData(sorted);
        }
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);

        if (!mountedRef.current || controller.signal.aborted) return;

        let errorMessage = "Failed to load activity data";

        if (err instanceof Error) {
          if (err.name === "AbortError") {
            console.warn("Request was aborted");
            return;
          }
          errorMessage = err.message;
        }

        console.error("Failed to load activity data:", err);
        toast.error(errorMessage);
      } finally {
        if (mountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (loading) {
    return <DarkLoadingPage title="Loading activity..." />;
  }

  return (
    <>
          {/* Context Menu */}
          <div ref={menuRef} className="fixed top-2 right-2 sm:top-3 sm:right-3 z-50" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={toggleMenu} 
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-controls="stats-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-8 h-8 sm:w-9 sm:h-9 bg-[#1a1a1a] hover:bg-[#252525] text-zinc-400 rounded-lg shadow-xl border border-[#2a2a2a] flex items-center justify-center transition-all duration-200 hover:border-[#3a3a3a] focus:outline-none focus:ring-2 focus:ring-blue-500/30" 
          type="button"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="stats-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="BM" />
          </div>
        )}
      </div>
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-200 p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Historia logowan</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl">
            Sprawdz kiedy i z jakiego urzadzenia bylo logowanie do tego konta.
          </p>
        </div>

        {/* Activity List Card */}
        <Card className="bg-neutral-950 border border-neutral-900/70 rounded-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
          <CardHeader className="border-b border-neutral-900/50 pb-3 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-gray-100">
                Twoje Sesje
              </CardTitle>
              <div className="text-xs text-neutral-500 uppercase tracking-wide">
                {data.length} {data.length === 1 ? 'session' : 'sessions'}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-3 text-neutral-700" />
                <p className="text-sm">No activity found</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-900/50">
                {data.map((activity, index) => {
                  const { device, browser, icon } = parseUserAgent(activity.userAgent);
                  return (
                    <div
                      key={activity.idActivity}
                      className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-neutral-900/30 transition-colors group"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0 mt-0.5 text-gray-400 group-hover:text-blue-400 transition-colors">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm sm:text-base text-gray-100">{device}</span>
                              <span className="text-neutral-600 text-xs">•</span>
                              <span className="text-gray-400 text-xs sm:text-sm">{browser}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatTimestamp(activity.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Footer */}
        {data.length > 0 && (
          <div className="flex items-start gap-2 p-3 sm:p-4 bg-neutral-950/50 border border-neutral-900/50 rounded-lg">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Activity logs are sorted by most recent first. Each entry shows the device type, browser, and time of access.
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

