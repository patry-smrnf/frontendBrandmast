// components/BrandmasterActionCard.tsx
"use client";

import React, { useCallback, useState, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { gradientForShop } from "@/utils/colors";
import { Pencil, User, X, Check } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { cn } from "@/lib/utils";
import { CasActionDialog } from "./CasActionDialog";

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

interface Props {
  action: UIAction;
  onClick?: (action: UIAction) => void;
  onStatusChange?: (actionId: number, newStatus: string) => void;
}

function formatDateTime(someDate?: Date | null) {
  try {
    if (!someDate || !(someDate instanceof Date) || Number.isNaN(someDate.getTime())) return "-";
    // Use user's locale with explicit Warsaw timezone for consistent display
    return new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(someDate);
  } catch (error) {
    console.warn('Error formatting date time:', someDate, error);
    return "-";
  }
}

function formatTime(someDate?: Date | null) {
  try {
    if (!someDate || !(someDate instanceof Date) || Number.isNaN(someDate.getTime())) return "-";
    return new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(someDate);
  } catch (error) {
    console.warn('Error formatting time:', someDate, error);
    return "-";
  }
}

const BrandmasterActionCardInner: React.FC<Props> = ({ action, onClick, onStatusChange }) => {
  const [submitting, setSubmitting] = useState(false);
  const [casDialogOpen, setCasDialogOpen] = useState(false);

  const submitUpdateStatus = useCallback(
    async (actionIdFromCard: number, status: string) => {
      if (submitting) return;
      
      // Validate input
      if (!Number.isFinite(actionIdFromCard) || actionIdFromCard <= 0) {
        toast.error("Nieprawidłowy identyfikator akcji.");
        return;
      }
      
      if (!status || typeof status !== 'string') {
        toast.error("Nieprawidłowy status.");
        return;
      }
      
      setSubmitting(true);
      try {
        const res = await apiFetch<{ message?: string }>("/api/sv/editActionStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idAction: actionIdFromCard,
            status: status,
          }),
        });

        toast.success(res?.message ?? `Status zmieniony na ${status}`);
        // Notify parent component to update state instead of reloading
        onStatusChange?.(actionIdFromCard, status);
      } catch (error) {
        console.error("submitUpdateStatus error:", error);
        const errorMessage = error instanceof Error ? error.message : "Nie udało się zmienić statusu.";
        toast.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, onStatusChange]
  );

  const handleAcceptClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card onClick from firing
    // For VELO or PKP events, change status directly without CAS dialog
    if (action.eventName === "niewiem") {
      submitUpdateStatus(action.idAction, "ACCEPTED");
      return;
    }
    // For other events, open CAS dialog
    setCasDialogOpen(true);
  }, [action.eventName, action.idAction, submitUpdateStatus]);

  const statusPillClass =
    action.actionStatus === "ACCEPTED"
      ? "bg-emerald-900/40 text-emerald-300"
      : action.actionStatus === "DECLINED"
      ? "bg-red-900/30 text-red-300"
      : action.actionStatus === "EDITED SV"
      ? "bg-blue-900/40 text-blue-300"
      : "bg-yellow-900/40 text-yellow-300";

  return (
    <Card
      className={cn(
        "group relative rounded-xl border border-zinc-800/60 bg-gradient-to-br",
        "from-neutral-900/70 to-neutral-800/50 backdrop-blur-md shadow-sm",
        "hover:shadow-lg hover:scale-[1.01] transition-all duration-200",
        onClick ? "cursor-pointer" : "",
        gradientForShop(action.eventName) || ""
      )}
      aria-labelledby={`action-${action.idAction}-title`}
      role="article"
      aria-describedby={`action-${action.idAction}-description`}
      onClick={(e) => {
        // Only trigger if not clicking on a button
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        onClick?.(action);
      }}
    >
      <CardContent className="px-3.5 py-1 flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-[140px]">
            <h2
              id={`action-${action.idAction}-title`}
              className="text-[15px] font-semibold text-white leading-tight truncate"
              title={action.shopName}
            >
              {action.shopName ?? "—"}
            </h2>
            <p className="text-[12px] text-zinc-400 truncate" title={action.shopAddress}>
              {action.shopAddress ?? "—"}
            </p>
            <p className="text-[12px] text-zinc-300 mt-0.5">
              <span className="text-zinc-400 font-medium">Event:</span>{" "}
              {action.eventName ?? "—"}
            </p>
          </div>

          <span
            className={cn(
              "px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0",
              statusPillClass
            )}
            aria-label={`Status: ${action.actionStatus}`}
          >
            {action.actionStatus ?? "UNKNOWN"}
          </span>
        </div>

        {/* Time Info */}
        <div 
          id={`action-${action.idAction}-description`}
          className="flex flex-wrap items-center justify-between text-[12px] text-zinc-300 gap-2"
        >
          <p className="truncate" aria-label={`Czas trwania: od ${formatTime(action.actionSince)} do ${formatTime(action.actionUntil)}`}>
            <span className="font-semibold text-zinc-100">{formatTime(action.actionSince)}</span>{" "}
            –{" "}
            <span className="font-semibold text-zinc-100">{formatTime(action.actionUntil)}</span>
          </p>
          <p className="text-right text-[11px] text-zinc-500" aria-label={`Utworzono: ${formatDateTime(action.createdAt)}`}>
            Utworzono:{" "}
            <span className="text-zinc-300">{formatDateTime(action.createdAt)}</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="h-6 px-2 text-[12px] border bg-zinc-900 hover:bg-neutral-700/80 border-zinc-950 text-zinc-200"
            aria-label={`Brandmaster ${action.brandmasterImie ?? ""} ${action.brandmasterNazwisko ?? ""}`}
            title={`${action.brandmasterImie ?? ""} ${action.brandmasterNazwisko ?? ""}`}
          >
            <User className="h-3.5 w-3.5 mr-1" />
            {[(action.brandmasterImie ?? "").trim(), (action.brandmasterNazwisko ?? "").trim()]
              .filter(Boolean)
              .join(" ") || "—"}
          </Button>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Akcje dla akcji">
            {action.actionStatus !== "ACCEPTED" && action.eventName !== "niewiem" && (             
              <Button
              onClick={handleAcceptClick}
              size="sm"
              disabled={submitting}
              className="h-7 px-2.5 text-[12px] bg-zinc-900 hover:bg-green-600/80 text-green-50 border border-green-800"
              aria-label={`Akceptuj akcję dla sklepu ${action.shopName}`}
            >
              <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Akceptuj
            </Button> )}

            <Button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card onClick from firing
                submitUpdateStatus(action.idAction, "EDITABLE");
              }}
              size="sm"
              disabled={submitting}
              className="h-7 px-2.5 text-[12px] bg-zinc-900 hover:bg-orange-600/80 hover:border-orange-600/80 text-amber-50 border border-orange-800"
              aria-label={`Oznacz jako edytowalną akcję dla sklepu ${action.shopName}`}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Editable
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card onClick from firing
                submitUpdateStatus(action.idAction, "DECLINED");
              }}
              size="sm"
              disabled={submitting}
              className="h-7 px-2.5 text-[12px] bg-zinc-900 border-red-800 hover:bg-red-700/70 hover:border-red-700/70 text-red-200 border"
              aria-label={`Odrzuć akcję dla sklepu ${action.shopName}`}
            >
              <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Odrzuć
            </Button>
          </div>
        </div>
      </CardContent>
      {
      action.actionStatus !== "ACCEPTED" && (
      <CasActionDialog
        open={casDialogOpen}
        onOpenChange={setCasDialogOpen}
        action={action}
        onSuccess={() => {
          // Optionally refresh or update the action list
          toast.success("Akcje CAS zostały utworzone");
        }}
        onStatusChange={(actionId, newStatus) => {
          // Forward status change to parent
          onStatusChange?.(actionId, newStatus);
        }}
      />
      )}
    </Card>
  );
};

export default memo(BrandmasterActionCardInner);
