"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ContextMenu from "@/components/contextMenu";
import DarkLoadingPage from "@/components/LoadingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { Calendar, Plus, Filter, Loader2, GitCompare } from "lucide-react";
import { EventInfo } from "@/types/apiStuff/objects/event.types";
import { MyBmsActionsResponse } from "@/types/apiStuff/responses/MyBmsActionsResponse";

import CreateActionDialog from "./CreateActionDialog";
import ActionPlannerCard from "./ActionPlannerCard";

// Action interface for planner
export interface PlannerAction {
  id: string; // ident from API (e.g., "944816/A/2025")
  shopName: string;
  shopAddress: string;
  eventName: string;
  since: Date;
  until: Date;
  status?: string;
  brandmasterName?: string;
  brandmasterHours?: {
    since: Date;
    until: Date;
  };
}

// Helper functions
function parseDateSafe(input?: string | Date | null): Date | undefined {
  if (input === undefined || input === null) return undefined;
  
  try {
    let d: Date;
    if (typeof input === "string") {
      // Normalize date string format: "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
      const normalized = input.replace(" ", "T");
      d = new Date(normalized);
    } else {
      d = input;
    }
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      return undefined;
    }
    return d;
  } catch (error) {
    return undefined;
  }
}

function formatDateShort(date?: Date): string {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date?: Date): string {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMonthYearKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthYearLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return getMonthYearKey(now);
}


export default function ActionPlannerPage() {
  const [actions, setActions] = useState<PlannerAction[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [filterEvent, setFilterEvent] = useState<string>("CircleK");
  const [filterMonth, setFilterMonth] = useState<string>(getCurrentMonthKey());
  const [filterSinceDate, setFilterSinceDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [comparing, setComparing] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isInitialLoadRef = useRef(true);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  // Close menu on outside click / Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    
    document.addEventListener("click", onDocClick, { passive: true });
    document.addEventListener("keydown", onEsc, { passive: true });
    
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      const res = await apiFetch<Array<{ idEvent: number; name: string; tpEventId: string }>>(
        "/api/sv/getEvents",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      // Map the response to EventInfo format
      const mappedEvents: EventInfo[] = res.map((item) => ({
        id: item.idEvent,
        name: item.name,
        tpEventId: item.tpEventId,
      }));

      setEvents(mappedEvents);

      // Set default filter to "CircleK" if it exists in the events, otherwise use "All"
      const circleKExists = mappedEvents.some((e) => e.name === "CircleK");
      setFilterEvent(circleKExists ? "CircleK" : "All");
    } catch (err: unknown) {
      console.error("Failed to load events", err);
      const errorMessage = err instanceof Error ? err.message : "Nie udało się pobrać eventów.";
      toast.error(errorMessage);
    }
  }, []);

  // Fetch actions from API
  const fetchActions = useCallback(async (showFilterLoading = false) => {
    // Don't fetch if filters are not ready
    if (filterMonth === "All" || filterEvent === "All" || events.length === 0) {
      setActions([]);
      return;
    }

    try {
      if (showFilterLoading) {
        setFilterLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Extract month number from filterMonth (format: "YYYY-MM")
      const monthNumber = filterMonth.split("-")[1];
      
      // Find eventId (tpEventId) from events list based on filterEvent name
      const selectedEvent = events.find((e) => e.name === filterEvent);
      if (!selectedEvent) {
        throw new Error("Selected event not found");
      }

      // Build query params
      const params = new URLSearchParams();
      params.append("month", monthNumber);
      params.append("eventId", selectedEvent.tpEventId);

      const url = `/api/sv/getBlankActions?${params.toString()}`;

      const res = await apiFetch<Array<{
        uuid: string;
        ident: string;
        name: string;
        since: string;
        until: string;
        event: {
          uuid: string;
          ident: string;
          name: string;
        };
        territory: {
          uuid: string;
          ident: string;
        };
        area: {
          uuid: string;
          ident: string;
        };
        status: string;
        actionPointsName: string;
        actionPointsStreetAddress: string;
      }>>(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!Array.isArray(res)) {
        throw new Error("Invalid server response: expected array");
      }

      // Transform API response to PlannerAction format
      const transformed: PlannerAction[] = res.map((item) => ({
        id: item.ident ?? "—", // Use ident from API response
        shopName: item.actionPointsName ?? "—",
        shopAddress: item.actionPointsStreetAddress ?? "—",
        eventName: item.event?.name ?? "—",
        since: parseDateSafe(item.since) ?? new Date(0),
        until: parseDateSafe(item.until) ?? new Date(0),
        status: item.status,
        brandmasterName: undefined, // Not available in API response
      }));

      // Sort by date (earliest first)
      transformed.sort((a, b) => a.since.getTime() - b.since.getTime());
      setActions(transformed);
      
    } catch (err: unknown) {
      console.error("Failed to load actions", err);
      const errorMessage = err instanceof Error ? err.message : "Nie udało się pobrać akcji.";
      setError(errorMessage);
      toast.error(errorMessage);
      setActions([]);
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  }, [filterMonth, filterEvent, events]);

  // Initial load - fetch events first
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch actions when filters change or events are loaded
  useEffect(() => {
    if (events.length > 0 && filterMonth !== "All" && filterEvent !== "All") {
      // Show filter loading indicator when filters change (not initial load)
      const showFilterLoading = !isInitialLoadRef.current;
      fetchActions(showFilterLoading);
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    } else {
      // Clear actions if filters are not ready
      setActions([]);
    }
  }, [filterEvent, filterMonth, events, fetchActions]);

  // Derived filter options - use fetched events
  const eventFilterOptions = useMemo(() => {
    const eventNames = events.map((e) => e.name).sort();
    return ["All", ...eventNames];
  }, [events]);

  // Generate months list (current month and next 12 months)
  const months = useMemo(() => {
    const monthList: string[] = [];
    const now = new Date();
    for (let i = 0; i < 13; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthList.push(getMonthYearKey(date));
    }
    return ["All", ...monthList];
  }, []);

  // Filtered actions (only apply since date filter, rest is handled by API)
  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      // Since date filter (client-side)
      if (filterSinceDate) {
        const filterDate = new Date(filterSinceDate);
        if (a.since < filterDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [actions, filterSinceDate]);

  // Group by date for better organization
  const groupedByDate = useMemo(() => {
    const groups: Record<string, PlannerAction[]> = {};
    
    filteredActions.forEach((action) => {
      const dateKey = action.since.toLocaleDateString("pl-PL");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(action);
    });

    return Object.entries(groups).sort(([dateA], [dateB]) => {
      const a = filteredActions.find(x => x.since.toLocaleDateString("pl-PL") === dateA);
      const b = filteredActions.find(x => x.since.toLocaleDateString("pl-PL") === dateB);
      if (!a || !b) return 0;
      return a.since.getTime() - b.since.getTime();
    });
  }, [filteredActions]);

  const handleCreateSuccess = useCallback(() => {
    setCreateDialogOpen(false);
    fetchActions(true);
    toast.success("Akcja została zaplanowana pomyślnie");
  }, [fetchActions]);

  // Helper function to normalize shop name for comparison
  const normalizeShopName = useCallback((name: string): string => {
    if (!name || typeof name !== "string") return "";
    return name.trim().toLowerCase().replace(/\s+/g, " ");
  }, []);

  // Helper function to normalize shop address for comparison
  const normalizeAddress = useCallback((address: string): string => {
    if (!address || typeof address !== "string") return "";
    return address.trim().toLowerCase().replace(/\s+/g, " ");
  }, []);

  // Helper function to get date-only string (YYYY-MM-DD) from Date
  const getDateOnlyKey = useCallback((date: Date): string => {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Compare actions with myBmsActions
  const compareActions = useCallback(async () => {
    if (actions.length === 0) {
      toast.info("Brak akcji do porównania");
      return;
    }

    setComparing(true);
    try {
      const res = await apiFetch<MyBmsActionsResponse[]>("/api/sv/myBmsActions", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!Array.isArray(res)) {
        throw new Error("Invalid server response: expected array");
      }

      // Flatten all actions from all brandmasters
      const allBmsActions = res.flatMap((bm) => {
        const brandmasterName = `${(bm.imie ?? "").trim()} ${(bm.nazwisko ?? "").trim()}`.trim();
        return (Array.isArray(bm.actions) ? bm.actions : []).map((a) => ({
          shopName: a.shop?.name ?? "",
          shopAddress: a.shop?.address ?? "",
          since: parseDateSafe(a.since),
          until: parseDateSafe(a.until),
          brandmasterName,
        }));
      });

      // Compare each blank action with BMS actions
      let matchedCount = 0;
      setActions((currentActions) => {
        const updated = currentActions.map((blankAction) => {
          const normalizedBlankName = normalizeShopName(blankAction.shopName);
          const normalizedBlankAddress = normalizeAddress(blankAction.shopAddress);
          const blankDateKey = getDateOnlyKey(blankAction.since);

          // Find matching BMS action
          const matched = allBmsActions.find((bmAction) => {
            if (!bmAction.since) return false;

            const normalizedBmsName = normalizeShopName(bmAction.shopName);
            const normalizedBmsAddress = normalizeAddress(bmAction.shopAddress);
            const bmsDateKey = getDateOnlyKey(bmAction.since);

            return (
              normalizedBlankName === normalizedBmsName &&
              normalizedBlankAddress === normalizedBmsAddress &&
              blankDateKey === bmsDateKey &&
              blankDateKey !== "" // Ensure date is valid
            );
          });

          if (matched && matched.since && matched.until) {
            matchedCount++;
            return {
              ...blankAction,
              brandmasterName: matched.brandmasterName || undefined,
              brandmasterHours: {
                since: matched.since,
                until: matched.until,
              },
            };
          }

          // No match found, keep original
          return blankAction;
        });
        return updated;
      });

      // Show toast after state update (using setTimeout to ensure state is updated)
      setTimeout(() => {
        if (matchedCount > 0) {
          toast.success(`Znaleziono ${matchedCount} ${matchedCount === 1 ? "dopasowanie" : "dopasowań"}`);
        } else {
          toast.info("Nie znaleziono dopasowań");
        }
      }, 0);
    } catch (err: unknown) {
      console.error("Failed to compare actions", err);
      const errorMessage = err instanceof Error ? err.message : "Nie udało się porównać akcji.";
      toast.error(errorMessage);
    } finally {
      setComparing(false);
    }
  }, [actions, normalizeShopName, normalizeAddress, getDateOnlyKey]);

  if (loading) return <DarkLoadingPage />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-4 py-6 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-red-400">Błąd ładowania danych</h2>
          <p className="text-gray-400">{error}</p>
          <Button
            onClick={() => fetchActions(false)}
            className="bg-zinc-800 hover:bg-zinc-700"
          >
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Floating Context Menu */}
      <div
        ref={menuRef}
        className="fixed top-4 right-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          type="button"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div role="menu">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-3 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Planer Akcji</h1>
              <p className="text-sm text-gray-400 mt-1">
                {filteredActions.length} {filteredActions.length === 1 ? "akcja" : "akcji"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={compareActions}
                disabled={comparing || actions.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {comparing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Porównywanie...
                  </>
                ) : (
                  <>
                    <GitCompare className="h-4 w-4" />
                    Compare Actions
                  </>
                )}
              </Button>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Zaplanuj akcję
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtry</span>
              {filterLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Event filter */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-medium">Event</label>
                <Select value={filterEvent} onValueChange={setFilterEvent}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 h-9 text-sm">
                    <SelectValue placeholder="Wybierz event" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                    {eventFilterOptions.map((e) => (
                      <SelectItem key={e} value={e} className="text-sm">
                        {e === "All" ? "Wszystkie eventy" : e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month filter */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-medium">Miesiąc</label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 h-9 text-sm">
                    <SelectValue placeholder="Wybierz miesiąc" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100 max-h-60 overflow-auto">
                    {months.map((m) => (
                      <SelectItem key={m} value={m} className="text-sm">
                        {m === "All" ? "Wszystkie miesiące" : getMonthYearLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Since date filter */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-medium">Od daty</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={filterSinceDate}
                    onChange={(e) => setFilterSinceDate(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-gray-200 h-9 text-sm pr-8"
                  />
                  {filterSinceDate && (
                    <button
                      onClick={() => setFilterSinceDate("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      aria-label="Wyczyść datę"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions List */}
          <div className="space-y-4">
            {filterLoading ? (
              <div className="text-center text-gray-500 text-sm py-16 border border-zinc-800 rounded-lg bg-zinc-900/30">
                <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin opacity-50" />
                <p>Ładowanie akcji...</p>
              </div>
            ) : groupedByDate.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-16 border border-zinc-800 rounded-lg bg-zinc-900/30">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Brak akcji pasujących do filtrów</p>
              </div>
            ) : (
              groupedByDate.map(([dateLabel, dateActions]) => (
                <div key={dateLabel} className="border border-zinc-800 rounded-lg bg-zinc-900/30 overflow-hidden">
                  <div className="bg-zinc-800/50 px-3 sm:px-4 py-2 border-b border-zinc-800">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-300">
                      {dateLabel}
                      <span className="ml-2 text-gray-500 font-normal">
                        ({dateActions.length})
                      </span>
                    </h3>
                  </div>
                  <div className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                    {dateActions.map((action) => (
                      <ErrorBoundary key={action.id}>
                        <ActionPlannerCard action={action} />
                      </ErrorBoundary>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Action Dialog */}
      <CreateActionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </ErrorBoundary>
  );
}

