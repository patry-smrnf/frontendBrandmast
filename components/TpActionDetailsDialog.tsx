"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamCasAction } from "@/types/apiStuff/responses/TeamCasActionsResponse";

interface TpActionDetailsDialogProps {
  action: TeamCasAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductStats {
  brand: string;
  model: string;
  count: number;
}

interface ActionStatsResponse {
  data: {
    sample: {
      currentAction: ProductStats[];
    };
  };
}

const statusLabels = {
  accepted: "Zaakceptowana",
  finished: "Zakończona",
  started: "Rozpoczęta",
  editable: "Do edycji",
  cancelled: "Anulowana",
};

const statusColors = {
  accepted: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  finished: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  started: "bg-green-500/20 text-green-400 border border-green-500/30",
  editable: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
  cancelled: "bg-red-500/20 text-red-400 border border-red-500/30",
};

export default function TpActionDetailsDialog({
  action,
  open,
  onOpenChange,
}: TpActionDetailsDialogProps) {
  const [actionStats, setActionStats] = useState<{ velo: number; glo: number } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (!action || !open || (action.status !== "started" && action.status !== "finished")) {
      setActionStats(null);
      return;
    }

    const fetchActionStats = async () => {
      setIsLoadingStats(true);
      try {
        const response = await fetch("https://api.webform.tdy-apps.com/sample/stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sample: {
              hostessCode: action.users.ident,
              currentAction: action.ident,
            },
          }),
        });

        const data: ActionStatsResponse = await response.json();
        
        if (data.data?.sample?.currentAction) {
          const stats = { velo: 0, glo: 0 };
          
          data.data.sample.currentAction.forEach((item) => {
            const brandLower = item.brand.toLowerCase();
            if (brandLower === "velo") {
              stats.velo += item.count;
            } else if (brandLower === "glo") {
              stats.glo += item.count;
            }
          });
          
          setActionStats(stats);
        }
      } catch (error) {
        console.error("Failed to fetch action stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchActionStats();
  }, [action, open]);

  if (!action) return null;

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md w-[95vw] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-lg sm:text-xl font-bold text-white leading-tight">
              {action.name || "Szczegóły akcji"}
            </DialogTitle>
            <span className={`text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap ${statusColors[action.status]}`}>
              {statusLabels[action.status]}
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono">#{action.ident}</p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Action Stats - For started and finished actions */}
          {(action.status === "started" || action.status === "finished") && (
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Statystyki akcji
              </h4>
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              ) : actionStats ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-md p-2">
                    <p className="text-xs text-purple-400 font-medium">Velo</p>
                    <p className="text-2xl font-bold text-white">{actionStats.velo - actionStats.glo}</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-2">
                    <p className="text-xs text-blue-400 font-medium">Glo</p>
                    <p className="text-2xl font-bold text-white">{actionStats.glo}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 text-center py-2">Brak danych</p>
              )}
            </div>
          )}

          {/* Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Rozpoczęcie</p>
              <p className="text-xs font-medium text-white leading-tight">{formatDateTime(action.since)}</p>
              {(action.status === "started" || action.status === "finished") && (
                <>
                  <p className="text-xs text-zinc-500 mb-1 mt-2">Realny start</p>
                  <p className="text-xs font-medium text-white leading-tight">
                    {action.lastStart ? formatDateTime(action.lastStart) : "---"}
                  </p>
                </>
              )}
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Zakończenie</p>
              <p className="text-xs font-medium text-white leading-tight">{formatDateTime(action.until)}</p>
              {(action.status === "started" || action.status === "finished") && (
                <>
                  <p className="text-xs text-zinc-500 mb-1 mt-2">Realny stop</p>
                  <p className="text-xs font-medium text-white leading-tight">
                    {action.lastStop ? formatDateTime(action.lastStop) : "---"}
                  </p>
                </>
              )}
            </div>
          </div>


          {/* Location */}
          <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Lokalizacja</h4>
            <div>
              <p className="text-sm font-medium text-white">{action.actionPointsName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{action.actionPointsStreetAddress}</p>
            </div>
          </div>

          {/* User */}
          <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Brandmaster</h4>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white font-semibold text-sm border border-zinc-700">
                {action.users.firstname?.[0]?.toUpperCase() || "?"}{action.users.lastname?.[0]?.toUpperCase() || ""}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {action.users.firstname} {action.users.lastname}
                </p>
                <p className="text-xs text-zinc-500">{action.users.ident}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

