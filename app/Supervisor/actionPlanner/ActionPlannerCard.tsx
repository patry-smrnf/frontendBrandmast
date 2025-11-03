"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, User } from "lucide-react";
import type { PlannerAction } from "./ActionPlannerPage";

interface Props {
  action: PlannerAction;
}

function formatTime(date: Date): string {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ActionPlannerCard: React.FC<Props> = ({ action }) => {
  const { shopName, shopAddress, eventName, id, since, until, brandmasterName, brandmasterHours } = action;
  const hasBrandmaster = brandmasterName && brandmasterHours;

  return (
    <Card className={`bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-600/50 hover:bg-zinc-800/60 transition-all duration-200 rounded-lg overflow-hidden ${hasBrandmaster ? "border-blue-500/50 bg-zinc-800/60" : ""}`}>
      <CardContent className="p-3 space-y-2">
        {/* Event badge */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wide truncate">
            {eventName}
          </span>
        </div>
        {/* Action ID */}
        <h3 className="text-[10px] font-semibold text-white leading-tight line-clamp-1">
          {id}
        </h3>

        {/* Shop name */}
        <h3 className="text-sm font-semibold text-white leading-tight line-clamp-1">
          {shopName}
        </h3>

        {/* Address */}
        <div className="flex items-start gap-1.5 text-xs text-gray-400">
          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-500" />
          <p className="line-clamp-1 leading-tight">{shopAddress}</p>
        </div>

        {/* Time range */}
        <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-zinc-900/50 rounded px-2 py-1.5">
          <Clock className="h-3 w-3 flex-shrink-0 text-gray-500" />
          <span className="font-medium">
            {formatTime(since)} – {formatTime(until)}
          </span>
        </div>

        {/* Brandmaster info (shown when matched) */}
        {hasBrandmaster && (
          <div className="mt-2 pt-2 border-t border-zinc-700/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-blue-300">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="font-medium truncate">{brandmasterName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-200/80 bg-blue-900/20 rounded px-2 py-1">
              <Clock className="h-3 w-3 flex-shrink-0 text-blue-300/70" />
              <span className="font-medium">
                {formatTime(brandmasterHours.since)} – {formatTime(brandmasterHours.until)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(ActionPlannerCard);

