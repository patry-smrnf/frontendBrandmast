"use client";

import React, { memo } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { gradientForShop } from "@/utils/colors";
import {
  FromDateExtractDateString,
  FromDateExtractHourString,
} from "@/utils/datestuff";

import { Pencil, CirclePlus, User, Trash } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/utils/apiFetch";
import type { messageRes } from "@/types/MessageRes";
import type { MyAction } from "@/types/apiStuff/responses/MyAction.types";

interface Props {
  action: MyAction;
}

const MyActionCard: React.FC<Props> = ({ action }) => { 
  
  const { id, status, since, until, shop, event } = action;

  // 🗑️ Delete action handler
  async function handleDeleteAction(actionId: number) {
    apiFetch<messageRes>(`/api/bm/delAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idAction: actionId }),
      }).then((res) => toast.success(res.message)).catch((err) => toast.error(String(err)));
  }

  // 🎨 Gradient based on event name
  const gradient = gradientForShop(event.name || "Unknown");

  return (
    <Card className={`rounded-2xl border border-zinc-800 shadow-md hover:shadow-lg transition-transform hover:scale-[1.01] bg-gradient-to-br ${gradient}`}>
      <CardContent className="px-4 py-3 flex flex-col justify-between min-h-[130px] backdrop-blur-sm">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white leading-tight">
              {shop?.name || "Nieznany sklep"}
            </h2>
            <p className="text-xs text-gray-400">{shop?.address || "Brak adresu"}</p>
          </div>
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${ status === "ACCEPTED"
                ? "bg-emerald-900/40 text-emerald-300"
                : status === "DECLINED"
                ? "bg-red-900/30 text-red-300"
                : "bg-yellow-900/40 text-yellow-300"
            }`}
          >
            {status}
          </span>
        </div>

        {/* Time range + edit button */}
        <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
          <p>
            <strong className="text-gray-100">
              {FromDateExtractHourString(since)}
            </strong>{" "}
            –{" "}
            <strong className="text-gray-100">
              {FromDateExtractHourString(until)}
            </strong>
          </p>

          {status !== "ACCEPTED" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 py-0 text-[11px] flex items-center gap-1 border-zinc-700 hover:bg-zinc-800 text-gray-200"
            >
              <Link
                className="flex items-center gap-1"
                href={`/Brandmaster/actionDetails?actionId=${id}`}
              >
                <Pencil className="h-3 w-3" /> Edytuj
              </Link>
            </Button>
          )}
        </div>

        {/* User + Delete section */}
        <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
          <Button
            onClick={() => handleDeleteAction(id)}
            variant="outline"
            size="sm"
            className="h-6 px-2 py-0 text-[11px] flex items-center gap-1 bg-red-900/20 border-zinc-700 hover:bg-red-800 hover:text-red-300 text-gray-200"
          >
            <Trash className="h-3 w-3" /> Usuń
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(MyActionCard);
