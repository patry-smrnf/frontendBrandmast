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
import TpActionCard from "@/components/TpActionCard";
import TpActionDetailsDialog from "@/components/TpActionDetailsDialog";
import DarkLoadingPage from "@/components/LoadingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { TeamCasAction, TeamCasActionsResponse } from "@/types/apiStuff/responses/TeamCasActionsResponse";
import { apiFetch } from "@/utils/apiFetch";

function parseDateSafe(input?: string | Date | null): Date | undefined {
  if (input === undefined || input === null) return undefined;
  
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      console.warn('Invalid date provided:', input);
      return undefined;
    }
    
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

export default function TpDashboard() {
  const [actions, setActions] = useState<TeamCasAction[]>([]);
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    return dayKey(today);
  });
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterUser, setFilterUser] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<TeamCasAction | null>(null);
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
    
    document.addEventListener("click", onDocClick, { passive: true });
    document.addEventListener("keydown", onEsc, { passive: true });
    
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Fetch actions
  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;
    setLoading(true);

    const fetchActions = async () => {
      try {
        if (mounted && !ac.signal.aborted) {
          setError(null);
        }

        const res = await apiFetch<TeamCasActionsResponse>("/api/sv/getTeamCasActions", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
        });

        if (!Array.isArray(res)) {
          throw new Error("Invalid server response: expected array");
        }

        // Sort by start time (earliest first)
        const sorted = [...res].sort((a, b) => {
          const aDate = parseDateSafe(a.since);
          const bDate = parseDateSafe(b.since);
          if (!aDate || !bDate) return 0;
          return aDate.getTime() - bDate.getTime();
        });

        if (mounted && !ac.signal.aborted) {
          setActions(sorted);
          setError(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
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
  const dates = useMemo(() => {
    const uniqueDates = new Set(
      actions.map((a) => {
        const date = parseDateSafe(a.since);
        return date ? dayKey(date) : null;
      }).filter((d): d is string => d !== null && d !== "invalid")
    );
    const validDates = Array.from(uniqueDates);
    validDates.sort((a, b) => (a > b ? -1 : 1));
    return ["All", ...validDates];
  }, [actions]);

  const statuses = useMemo(() => {
    const unique = new Set(actions.map((a) => a.status));
    return ["All", ...Array.from(unique).sort()];
  }, [actions]);

  const users = useMemo(() => {
    const uniqueUsers = new Map<string, { ident: string; firstname: string; lastname: string }>();
    actions.forEach((a) => {
      if (!uniqueUsers.has(a.users.ident)) {
        uniqueUsers.set(a.users.ident, {
          ident: a.users.ident,
          firstname: a.users.firstname,
          lastname: a.users.lastname,
        });
      }
    });
    const sortedUsers = Array.from(uniqueUsers.values()).sort((a, b) => 
      `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`)
    );
    return [{ ident: "All", firstname: "Wszystkie", lastname: "" }, ...sortedUsers];
  }, [actions]);

  // Filtered actions
  const filtered = useMemo(() => {
    return actions.filter((a) => {
      const actionDate = parseDateSafe(a.since);
      let dateMatch = true;
      if (filterDate !== "All" && actionDate) {
        const filterDateObj = new Date(filterDate);
        const compareDate = new Date(filterDateObj.getFullYear(), filterDateObj.getMonth(), filterDateObj.getDate());
        const actionDateOnly = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate());
        dateMatch = actionDateOnly >= compareDate;
      }
      
      const statusMatch = filterStatus === "All" || a.status === filterStatus;
      const userMatch = filterUser === "All" || a.users.ident === filterUser;
      return dateMatch && statusMatch && userMatch;
    });
  }, [actions, filterDate, filterStatus, filterUser]);

  // Group by user
  const groupedByUser = useMemo(() => {
    const groups: Record<string, { user: TeamCasAction["users"]; actions: TeamCasAction[] }> = {};
    
    filtered.forEach((action) => {
      const userIdent = action.users.ident;
      if (!groups[userIdent]) {
        groups[userIdent] = {
          user: action.users,
          actions: [],
        };
      }
      groups[userIdent].actions.push(action);
    });

    // Sort users by name
    return Object.entries(groups).sort(([, a], [, b]) => {
      const nameA = `${a.user.firstname} ${a.user.lastname}`;
      const nameB = `${b.user.firstname} ${b.user.lastname}`;
      return nameA.localeCompare(nameB);
    });
  }, [filtered]);

  const handleCardClick = useCallback((action: TeamCasAction) => {
    setSelectedAction(action);
    setDialogOpen(true);
  }, []);

  const handleStatusChange = useCallback(async (actionUuid: string, newStatus: TeamCasAction["status"]) => {
    try {
      // TODO: Replace with actual API call when endpoint is ready
      // await apiFetch(`/api/sv/updateCasActionStatus`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ uuid: actionUuid, status: newStatus }),
      // });

      // Update local state
      setActions((prevActions) =>
        prevActions.map((action) =>
          action.uuid === actionUuid ? { ...action, status: newStatus } : action
        )
      );

      toast.success("Status akcji zaktualizowany");
    } catch (err) {
      console.error("Failed to update action status", err);
      toast.error("Nie udało się zaktualizować statusu akcji");
    }
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
          aria-controls="tp-context-menu"
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
          <div id="tp-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center">
        <div className="w-full max-w-[1800px] space-y-6">
          {/* Header - More Compact */}
          <div className="text-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Panel CAS</h1>
            <p className="text-sm text-zinc-400">Zarządzaj akcjami CAS</p>
          </div>

          {/* Filters - More Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="region" aria-label="Filtry">
            <label className="sr-only" htmlFor="filter-date">
              Filtruj po dacie
            </label>
            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger id="filter-date" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po dacie" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100 max-h-60 overflow-auto">
                {dates.map((d) => (
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

            <label className="sr-only" htmlFor="filter-user">
              Filtruj po użytkowniku
            </label>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger id="filter-user" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po użytkowniku" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100 max-h-60 overflow-auto">
                {users.map((u) => (
                  <SelectItem key={u.ident} value={u.ident}>
                    {u.ident === "All" ? "Wszyscy użytkownicy" : `${u.ident} - ${u.firstname} ${u.lastname}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grouped Cards */}
          <div className="space-y-6">
            {groupedByUser.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-10 border border-zinc-800 rounded-xl bg-zinc-900">
                Brak akcji pasujących do filtrów.
              </div>
            ) : (
              groupedByUser.map(([userIdent, group]) => (
                <div key={userIdent} className="border border-zinc-800 rounded-xl bg-zinc-900/40 backdrop-blur-sm p-4 sm:p-5 space-y-3">
                  {/* User Header - More Compact */}
                  <div className="flex items-center gap-2.5 border-b border-zinc-800/50 pb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {group.user.firstname?.[0]?.toUpperCase() || "?"}{group.user.lastname?.[0]?.toUpperCase() || ""}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-base font-semibold truncate">
                        {group.user.firstname} {group.user.lastname}
                      </h3>
                      <p className="text-zinc-500 text-xs">{group.user.ident}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 bg-zinc-800 text-zinc-400 text-xs font-semibold rounded-full">
                        {group.actions.length}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid - More cards per row with compact design */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {group.actions.map((action) => (
                      <ErrorBoundary key={action.uuid}>
                        <TpActionCard
                          action={action}
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

        {/* Action Details Dialog */}
        <TpActionDetailsDialog
          action={selectedAction}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </ErrorBoundary>
  );
}

