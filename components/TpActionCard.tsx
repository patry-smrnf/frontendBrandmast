"use client";

import React, { useState } from "react";
import { TeamCasAction } from "@/types/apiStuff/responses/TeamCasActionsResponse";
import { apiFetch } from "@/utils/apiFetch";
import { toast } from "sonner";

interface TpActionCardProps {
  action: TeamCasAction;
  onClick: (action: TeamCasAction) => void;
  onStatusChange: (actionUuid: string, newStatus: TeamCasAction["status"]) => void;
}

const statusGradients = {
  accepted: "from-blue-950/80 via-zinc-900 to-black",
  finished: "from-orange-950/80 via-zinc-900 to-black",
  started: "from-green-950/80 via-zinc-900 to-black",
  editable: "from-zinc-800/80 via-zinc-900 to-black",
  cancelled: "from-red-950/80 via-zinc-900 to-black",
};

const statusColors = {
  accepted: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  finished: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  started: "bg-green-500/20 text-green-300 border-green-500/40",
  editable: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/40",
};

const statusIcons = {
  accepted: "Akceptowana",
  finished: "Zakończona",
  started: "Rozpoczęta",
  editable: "Do edycji",
  cancelled: "Anulowana",
};

export default function TpActionCard({ action, onClick, onStatusChange }: TpActionCardProps) {
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newStatus = action.status === "accepted" ? "editable" : "accepted";
    setIsChangingStatus(true);

    try {
      await apiFetch("/api/sv/changeCasStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: {
            ident: newStatus,
          },
          action: {
            uuid: action.uuid,
          },
        }),
      });

      onStatusChange(action.uuid, newStatus);
      toast.success(
        newStatus === "accepted" 
          ? "Akcja została zaakceptowana" 
          : "Akcja została cofnięta do edycji"
      );
    } catch (error) {
      console.error("Failed to change status:", error);
      toast.error("Nie udało się zmienić statusu akcji");
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Hide button for finished and started statuses
  const showStatusButton = action.status === "accepted" || action.status === "editable";

  return (
    <div
      onClick={() => onClick(action)}
      className={`relative bg-gradient-to-br ${statusGradients[action.status]} border border-zinc-700/60 rounded-lg p-3 shadow-md hover:shadow-lg hover:border-zinc-600/80 transition-all duration-200 cursor-pointer group`}
    >
      {/* Header: Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h3 className="text-white font-semibold text-sm line-clamp-1 flex-1 leading-tight">
          {action.name || "Bez nazwy"}
        </h3>
        <div className={`flex-shrink-0 px-2 py-0.5 rounded border text-xs font-medium ${statusColors[action.status]}`}>
          {statusIcons[action.status]}
        </div>
      </div>

      {/* Time Range - More Compact */}
      <div className="flex items-center gap-2 mb-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-zinc-400">{formatDate(action.since)}</span>
        </div>
        <span className="text-zinc-600">•</span>
        <span className="text-white font-medium">{formatTime(action.since)}</span>
        <span className="text-zinc-500">-</span>
        <span className="text-white font-medium">{formatTime(action.until)}</span>
      </div>

      {/* Location - Compact */}
      <div className="mb-2.5 space-y-1">
        <div className="flex items-start gap-1.5">
          <svg className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium line-clamp-1">{action.actionPointsName}</p>
            <p className="text-xs text-zinc-400 line-clamp-1">{action.actionPointsStreetAddress}</p>
          </div>
        </div>
      </div>

      {/* Toggle Status Button - Only for accepted and editable statuses */}
      {showStatusButton && (
        <button
          onClick={handleStatusToggle}
          disabled={isChangingStatus}
          className="w-full mt-2 py-1.5 text-xs bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md transition-colors border border-zinc-700/50 hover:border-zinc-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {isChangingStatus ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span>Zmiana...</span>
            </>
          ) : (
            action.status === "accepted" ? "Cofnij akceptację" : "Zaakceptuj"
          )}
        </button>
      )}
    </div>
  );
}

