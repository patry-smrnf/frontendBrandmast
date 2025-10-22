"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/utils/apiFetch";
import MyActionCard from "@/components/ActionCard";
import ContextMenu from "@/components/contextMenu";
import DarkLoadingPage from "@/components/LoadingScreen";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { MyAction } from "@/types/apiStuff/responses/MyAction.types";

/* -------------------- Utils -------------------- */

// Safely extract "MM.YYYY" for grouping/filtering by month
function monthKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  return `${month}.${year}`;
}

// Format date nicely (e.g., "13 października 2025")
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Nieznana data";
  return d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* -------------------- Component -------------------- */

export default function BmDashboard() {
  const [actions, setActions] = useState<MyAction[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterShop, setFilterShop] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  /* -------------------- Data fetching -------------------- */
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    // Prevent double-invocation in React StrictMode (dev) and avoid updates after unmount
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;


    const params = new URLSearchParams(window.location.search);
    const errorFromParams = params.get("error");
    if (errorFromParams) toast.error(decodeURI(errorFromParams));

    apiFetch<MyAction[]>("/api/bm/myActions")
      .then((res) => {
        setActions(res);
      })
      .catch((err) => {
        toast.error(String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /* -------------------- Dropdown options -------------------- */
  const shops = useMemo(() => {
    const uniqueShops = new Set(actions.map((a) => a.event?.name ?? "Unknown"));
    return ["All", ...uniqueShops];
  }, [actions]);

  const months = useMemo(() => {
    const monthSet = new Set<string>();
    for (const a of actions) {
      const key = monthKey(a.since);
      if (key) monthSet.add(key);
    }
    return ["All", ...Array.from(monthSet)];
  }, [actions]);

  /* -------------------- Filtering logic -------------------- */
  const filtered = useMemo(() => {
    return actions.filter((a) => {
      const shopMatch = filterShop === "All" || a.event?.name === filterShop;
      const monthMatch =
        filterMonth === "All" || monthKey(a.since) === filterMonth;
      const statusMatch = filterStatus === "All" || a.status === filterStatus;
      return shopMatch && monthMatch && statusMatch;
    });
  }, [actions, filterShop, filterMonth, filterStatus]);

  /* -------------------- Calculate total time -------------------- */
  const totalTime = useMemo(() => {
    let totalMinutes = 0;
    
    for (const a of filtered) {
      if (a.since && a.until) {
        const since = new Date(a.since);
        const until = new Date(a.until);
        const durationMs = until.getTime() - since.getTime();
        const durationMinutes = Math.max(0, Math.floor(durationMs / (1000 * 60)));
        totalMinutes += durationMinutes;
      }
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return { hours, minutes, totalMinutes };
  }, [filtered]);

  /* -------------------- Group by date -------------------- */
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, MyAction[]>();

    for (const a of filtered) {
      const dayKey = new Date(a.since).toISOString().split("T")[0]; // YYYY-MM-DD
      if (!groups.has(dayKey)) groups.set(dayKey, []);
      groups.get(dayKey)!.push(a);
    }

    return Array.from(groups.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [filtered]);

  /* -------------------- Render -------------------- */
  if (loading) return <DarkLoadingPage />;

  return (
    <>
      {/* Context Menu */}
      <div
        ref={menuRef}
        className="fixed top-4 right-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={toggleMenu}
          aria-label="Toggle menu"
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none"
          type="button"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && <ContextMenu closeMenu={() => setMenuOpen(false)} type="BM" />}
      </div>

      {/* Main Content */}
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-950 text-gray-100 px-6 py-10 flex flex-col items-center">
        <div className="w-full max-w-5xl space-y-8">
          {/* Header - Compact Stats Box */}
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-8 sm:py-5 shadow-2xl backdrop-blur-sm w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6">
                {/* Actions Count */}
                <div className="flex flex-col">
                  <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider font-medium mb-0.5 sm:mb-1">
                    Zaplanowane akcje
                  </span>
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-4xl font-bold text-white tabular-nums">
                      {filtered.length}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500">
                      / {actions.length} total
                    </span>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="hidden sm:block h-12 w-px bg-zinc-800" />
                <div className="block sm:hidden w-full h-px bg-zinc-800" />
                
                {/* Total Time */}
                <div className="flex flex-col">
                  <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider font-medium mb-0.5 sm:mb-1">
                    Całkowity czas
                  </span>
                  <div className="flex items-baseline gap-0.5 sm:gap-1">
                    <span className="text-xl sm:text-3xl font-bold text-white tabular-nums">
                      {totalTime.hours}
                    </span>
                    <span className="text-[10px] sm:text-sm text-gray-400">h</span>
                    <span className="text-lg sm:text-2xl font-bold text-white tabular-nums ml-0.5 sm:ml-1">
                      {totalTime.minutes}
                    </span>
                    <span className="text-[10px] sm:text-sm text-gray-400">min</span>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="hidden sm:block h-12 w-px bg-zinc-800" />
                <div className="block sm:hidden w-full h-px bg-zinc-800" />
                
                {/* Status Breakdown */}
                <div className="flex flex-row sm:flex-col gap-3 sm:gap-1 text-[10px] sm:text-xs justify-around sm:justify-start">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500" />
                    <span className="hidden sm:inline text-gray-400">Do edycji: </span>
                    <span className="text-white font-medium">
                      {filtered.filter(a => a.status === "EDITABLE").length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500" />
                    <span className="hidden sm:inline text-gray-400">Zatwierdzone: </span>
                    <span className="text-white font-medium">
                      {filtered.filter(a => a.status === "ACCEPTED").length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500" />
                    <span className="hidden sm:inline text-gray-400">Odrzucone: </span>
                    <span className="text-white font-medium">
                      {filtered.filter(a => a.status === "DECLINED").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={filterShop} onValueChange={setFilterShop}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po sklepie" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                {shops.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po statusie" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                <SelectItem value="All">Wszystkie</SelectItem>
                <SelectItem value="EDITABLE">Do edycji</SelectItem>
                <SelectItem value="ACCEPTED">Zatwierdzone</SelectItem>
                <SelectItem value="DECLINED">Odrzucone</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po miesiącu" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m === "All" ? "Wszystkie miesiące" : m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grouped Cards */}
          <div className="space-y-8">
            {groupedByDate.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-10 border border-zinc-800 rounded-xl bg-zinc-900">
                Brak eventów pasujących do filtrów.
              </div>
            ) : (
              groupedByDate.map(([dateKey, group]) => (
                <div
                  key={dateKey}
                  className="border border-zinc-800 rounded-xl bg-zinc-900/50 p-5 space-y-4"
                >
                  <h3 className="text-gray-300 text-sm font-medium border-b border-zinc-800 pb-2">
                    {formatDate(dateKey)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map((a) => (
                      <MyActionCard key={a.id} action={a} />
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Add new */}
            <Link href="/Brandmaster/actionDetails?newAction=true">
              <div className="border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center h-36 text-gray-500 hover:text-gray-300 hover:border-zinc-500 transition cursor-pointer bg-zinc-900 hover:bg-zinc-800">
                <Plus className="w-6 h-6 mb-1" />
                <span className="text-sm font-medium">Dodaj nowy event</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
