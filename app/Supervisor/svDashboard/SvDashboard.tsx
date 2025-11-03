"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ContextMenu from "@/components/contextMenu";
import BrandmasterActionCard from "@/components/BmActionCard";
import DarkLoadingPage from "@/components/LoadingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { MyBmsActionsResponse } from "@/types/apiStuff/responses/MyBmsActionsResponse";
import { AllShopsResponse } from "@/types/apiStuff/responses/AllShopsResponse";
import { apiFetch } from "@/utils/apiFetch";
import EditActionDialog from "@/components/EditActionDialog";

// --- Local UI type (self-contained) ---
export interface UIAction {
  idAction: number;
  shopID?: number;
  shopName: string;
  shopAddress: string;
  eventName: string;
  actionSince: Date;
  actionUntil: Date;
  actionStatus: string;
  brandmasterLogin?: string;
  brandmasterImie?: string;
  brandmasterNazwisko?: string;
  createdAt?: Date;
}

// --- Helpers ---
function parseDateSafe(input?: string | Date | null): Date | undefined {
  if (input === undefined || input === null) return undefined;
  
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    
    // Check if the date is valid
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      console.warn('Invalid date provided:', input);
      return undefined;
    }
    
    // Check if date is within reasonable bounds (not too far in past/future)
    const now = new Date();
    const yearDiff = Math.abs(d.getFullYear() - now.getFullYear());
    if (yearDiff > 100) {
      console.warn('Date seems unrealistic:', d);
      return undefined;
    }
    
    return d;
  } catch (error) {
    console.warn('Error parsing date:', input, error);
    return undefined;
  }
}

function formatDateLong(date?: Date | string) {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return "";
  }
}

function dayKey(date?: Date) {
  try {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "invalid";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  } catch (error) {
    console.warn('Error creating day key:', date, error);
    return "invalid";
  }
}

function dayLabel(date?: Date) {
  try {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    console.warn('Error formatting day label:', date, error);
    return "";
  }
}

export default function SvDashboard() {
  const [uiActions, setUiActions] = useState<UIAction[]>([]);
  const [filterBrandmaster, setFilterBrandmaster] = useState<string>("All");
  // Default to today's date in YYYY-MM-DD format
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [filterDay, setFilterDay] = useState<string>(todayKey);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterEvent, setFilterEvent] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shopsData, setShopsData] = useState<AllShopsResponse[]>([]);
  const [selectedAction, setSelectedAction] = useState<UIAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
    
    // Add event listeners with passive option for better performance
    document.addEventListener("click", onDocClick, { passive: true });
    document.addEventListener("keydown", onEsc, { passive: true });
    
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Fetch shops data
  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;

    const fetchShops = async () => {
      try {
        const res = await apiFetch<AllShopsResponse[]>("/api/general/allShops", {
          signal: ac.signal,
        });
        if (mounted && !ac.signal.aborted) {
          setShopsData(res);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Failed to load shops", err);
        if (mounted && !ac.signal.aborted) {
          toast.error("Nie udało się pobrać listy sklepów");
        }
      }
    };

    fetchShops();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  // Fetch actions (new API shape) with AbortController
  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;
    setLoading(true);

    const fetchActions = async () => {
      try {
        // Clear any previous errors
        if (mounted && !ac.signal.aborted) {
          setError(null);
        }

        // Expecting MyBmsActionsResponse[] from server
        const res = await apiFetch<MyBmsActionsResponse[]>("/api/sv/myBmsActions", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
        });

        if (!Array.isArray(res)) {
          throw new Error("Invalid server response: expected array");
        }

        const flattened: UIAction[] = res.flatMap((bm) => {
          const login = bm.loginAccount ?? "";
          return (Array.isArray(bm.actions) ? bm.actions : []).map((a) => {
            const since = parseDateSafe(a.since) ?? new Date(0);
            const until = parseDateSafe(a.until) ?? new Date(0);
            const created = parseDateSafe(a.createdAt ?? null);

            // Debug log for November actions
            if (a.since && a.since.includes("2025-11")) {
              console.log("November action found:", {
                id: a.id,
                since: a.since,
                parsedSince: since,
                until: a.until,
                parsedUntil: until,
                shopName: a.shop?.name,
                eventName: a.event?.name,
                status: a.status
              });
            }

            return {
              idAction: Number.isFinite(a.id) ? a.id : -1,
              shopID: a.shop?.id ?? undefined,
              shopName: a.shop?.name ?? "—",
              shopAddress: a.shop?.address ?? "—",
              eventName: a.event?.name ?? "—",
              actionSince: since,
              actionUntil: until,
              actionStatus: a.status ?? "UNKNOWN",
              brandmasterLogin: login || undefined,
              brandmasterImie: bm.imie ?? undefined,
              brandmasterNazwisko: bm.nazwisko ?? undefined,
              createdAt: created,
            } as UIAction;
          });
        });

        // sort by earliest start
        flattened.sort((a, b) => a.actionSince.getTime() - b.actionSince.getTime());

        console.log("Total actions loaded:", flattened.length);
        console.log("All action dates:", flattened.map(a => ({
          id: a.idAction,
          date: a.actionSince.toISOString(),
          shopName: a.shopName
        })));

        if (mounted && !ac.signal.aborted) {
          setUiActions(flattened);
          setError(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // fetch aborted, don't show error
        }
        console.error("Failed to load actions", err);
        if (mounted && !ac.signal.aborted) {
          const errorMessage = err instanceof Error ? err.message : "Nie udało się pobrać danych akcji.";
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        if (mounted && !ac.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchActions();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  // Derived filter options
  const brandmasters = useMemo(() => {
    const map = new Map<string, { name?: string; last?: string }>();
    uiActions.forEach((a) => {
      if (a.brandmasterLogin) {
        if (!map.has(a.brandmasterLogin))
          map.set(a.brandmasterLogin, { name: a.brandmasterImie, last: a.brandmasterNazwisko });
      }
    });

    return [
      { login: "All", label: "Wszyscy" },
      ...Array.from(map.entries()).map(([login, v]) => ({
        login,
        label: `${login}${v.name || v.last ? " - " : ""}${(v.name ?? "").trim()} ${(v.last ?? "").trim()}`.trim(),
      })),
    ];
  }, [uiActions]);

  const days = useMemo(() => {
    const uniqueDays = new Set(uiActions.map((a) => dayKey(a.actionSince)));
    const validDays = Array.from(uniqueDays).filter((d) => d && d !== "invalid");
    validDays.sort((a, b) => (a > b ? -1 : 1));
    return ["All", ...validDays];
  }, [uiActions]);

  const events = useMemo(() => {
    const unique = new Set(uiActions.map((a) => a.eventName ?? "Unknown"));
    return ["All", ...Array.from(unique).sort()];
  }, [uiActions]);

  const statuses = useMemo(() => {
    const unique = new Set(uiActions.map((a) => a.actionStatus ?? "UNKNOWN"));
    return ["All", ...Array.from(unique).sort()];
  }, [uiActions]);

  // Filtered
  const filtered = useMemo(() => {
    const result = uiActions.filter((a) => {
      const bmMatch = filterBrandmaster === "All" || a.brandmasterLogin === filterBrandmaster;
      
      // Filter by "since" day (show actions from this day onwards)
      let dayMatch = true;
      if (filterDay !== "All") {
        const filterDate = new Date(filterDay);
        // Compare dates: only compare date parts (ignore time)
        const actionDate = new Date(a.actionSince.getFullYear(), a.actionSince.getMonth(), a.actionSince.getDate());
        const compareDate = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
        dayMatch = actionDate.getTime() >= compareDate.getTime();
      }
      
      const statusMatch = filterStatus === "All" || a.actionStatus === filterStatus;
      const eventMatch = filterEvent === "All" || a.eventName === filterEvent;
      return bmMatch && dayMatch && statusMatch && eventMatch;
    });
    
    console.log("Filter applied:", { filterBrandmaster, filterDay, filterStatus, filterEvent });
    console.log("Filtered results:", result.length, "actions");
    console.log("Filtered action dates:", result.map(a => a.actionSince.toISOString().split('T')[0]));
    
    return result;
  }, [uiActions, filterBrandmaster, filterDay, filterStatus, filterEvent]);

  // Group by date ascending (earliest first)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, UIAction[]> = {};
    filtered.forEach((a) => {
      const key = dayKey(a.actionSince);
      (groups[key] ??= []).push(a);
    });

    return Object.entries(groups)
      .filter(([k]) => k !== "invalid")
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [filtered]);

  const handleCardClick = useCallback((action: UIAction) => {
    if (action.actionStatus === "ACCEPTED") {
      toast.info("Nie można edytować zaakceptowanych akcji");
      return;
    }
    setSelectedAction(action);
    setDialogOpen(true);
  }, []);

  const handleDialogSuccess = useCallback((updatedAction?: Partial<UIAction>) => {
    if (!selectedAction || !updatedAction) return;
    
    // Update the action in the local state instead of reloading
    setUiActions((prevActions) =>
      prevActions.map((action) =>
        action.idAction === selectedAction.idAction
          ? { ...action, ...updatedAction }
          : action
      )
    );
    
    // Close the dialog
    setDialogOpen(false);
    setSelectedAction(null);
    
    // Show success message
    toast.success("Akcja zaktualizowana pomyślnie");
  }, [selectedAction]);

  const handleStatusChange = useCallback((actionId: number, newStatus: string) => {
    // Update the action status in the local state
    setUiActions((prevActions) =>
      prevActions.map((action) =>
        action.idAction === actionId
          ? { ...action, actionStatus: newStatus }
          : action
      )
    );
  }, []);

  if (loading) return <DarkLoadingPage />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-6 py-10 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-red-400">Błąd ładowania danych</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Spróbuj ponownie
          </button>
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
          aria-haspopup="true"
          aria-controls="sv-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500"
          type="button"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="sv-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-6 py-10 flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-8">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" role="region" aria-label="Filtry">
            <label className="sr-only" htmlFor="filter-brandmaster">
              Filtruj po brandmasterze
            </label>
            <Select value={filterBrandmaster} onValueChange={(v) => setFilterBrandmaster(v)}>
              <SelectTrigger id="filter-brandmaster" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po brandmasterze" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                {brandmasters.map((b) => (
                  <SelectItem key={b.login} value={b.login}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="sr-only" htmlFor="filter-day">
              Akcje od dnia
            </label>
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger id="filter-day" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Akcje od dnia" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100 max-h-60 overflow-auto">
                {days.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d === "All" ? "Wszystkie dni" : dayLabel(new Date(d))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="sr-only" htmlFor="filter-status">
              Filtruj po statusie
            </label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filter-status" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po statusie" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "All" ? "Wszystkie" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="sr-only" htmlFor="filter-event">
              Filtruj po evencie
            </label>
            <Select value={filterEvent} onValueChange={setFilterEvent}>
              <SelectTrigger id="filter-event" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po evencie" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                {events.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e === "All" ? "Wszystkie eventy" : e}
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
              groupedByDate.map(([dateKey, actions]) => (
                <div key={dateKey} className="border border-zinc-800 rounded-xl bg-zinc-900/50 p-5 space-y-4">
                  <h3 className="text-gray-300 text-sm font-medium border-b border-zinc-800 pb-2">
                    {formatDateLong(new Date(dateKey))}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {actions.map((a) => (
                      <ErrorBoundary key={`${a.idAction}-${a.brandmasterLogin ?? "bm"}`}>
                        <BrandmasterActionCard 
                          action={a} 
                          onClick={handleCardClick}
                          onStatusChange={handleStatusChange}
                        />
                      </ErrorBoundary>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Action Dialog */}
        <EditActionDialog
          action={selectedAction}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          shopsData={shopsData}
          onSuccess={handleDialogSuccess}
        />
      </div>
    </ErrorBoundary>
  );
}
