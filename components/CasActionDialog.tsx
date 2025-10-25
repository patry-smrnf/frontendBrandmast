"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Clock, MapPin, Calendar, Check, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { cn } from "@/lib/utils";

interface CasAction {
  since: Date;
  until: Date;
  hours: number;
}

interface CasActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: {
    idAction: number;
    shopName: string;
    shopAddress: string;
    eventName: string;
    actionSince: Date;
    actionUntil: Date;
    brandmasterImie?: string;
    brandmasterNazwisko?: string;
  };
  onSuccess?: () => void;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toISOStringInWarsawTimezone(date: Date): string {
  // Format the date in Warsaw timezone
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const getValue = (type: string) => parts.find((p) => p.type === type)?.value || "";
  
  return `${getValue("year")}-${getValue("month")}-${getValue("day")}T${getValue("hour")}:${getValue("minute")}:${getValue("second")}`;
}

function splitActionIntoChunks(since: Date, until: Date): CasAction[] {
  const chunks: CasAction[] = [];
  const maxHours = 4;
  
  let currentStart = new Date(since);
  const end = new Date(until);
  
  while (currentStart < end) {
    const maxEnd = new Date(currentStart.getTime() + maxHours * 60 * 60 * 1000);
    const chunkEnd = maxEnd > end ? end : maxEnd;
    
    const hours = (chunkEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60);
    
    chunks.push({
      since: new Date(currentStart),
      until: new Date(chunkEnd),
      hours: Math.round(hours * 100) / 100, // Round to 2 decimals
    });
    
    currentStart = chunkEnd;
  }
  
  return chunks;
}

export function CasActionDialog({
  open,
  onOpenChange,
  action,
  onSuccess,
}: CasActionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [actionName, setActionName] = useState("");

  const casActions = useMemo(() => {
    return splitActionIntoChunks(action.actionSince, action.actionUntil);
  }, [action.actionSince, action.actionUntil]);

  const brandmasterName = [
    action.brandmasterImie?.trim(),
    action.brandmasterNazwisko?.trim(),
  ]
    .filter(Boolean)
    .join(" ") || "—";

  const handleAccept = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    
    try {
      apiFetch<{ message?: string }>("/api/sv/editActionStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idAction: action.idAction,
          status: "ACCEPTED",
        }),
      }).then((res) => toast.success(res.message)).catch((err) => toast.error(String(err)));
      
      console.log(casActions);
      // Make requests for each CAS action chunk
      const promises = casActions.map((casAction, index) =>
        apiFetch("/api/sv/createCasAction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idAction: action.idAction,
            since: toISOStringInWarsawTimezone(casAction.since),
            until: toISOStringInWarsawTimezone(casAction.until),
            actionName: `[${index + 1}] ${actionName}`,
          }),
        })
      );

      await Promise.all(promises);
      
      toast.success(`Utworzono ${casActions.length} akcji CAS`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating CAS actions:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Nie udało się utworzyć akcji CAS.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[85vh] overflow-y-auto bg-neutral-900 border-zinc-800 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            CAS Action
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Action Name Input */}
          <div className="space-y-2">
            <Label htmlFor="actionName" className="text-sm font-medium text-zinc-200">
              Nazwa akcji
            </Label>
            <Input
              id="actionName"
              type="text"
              placeholder="Wprowadź nazwę akcji..."
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
              className="bg-neutral-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-zinc-600"
              disabled={submitting}
            />
          </div>

          {/* Brandmaster Info Box */}
          <div className="bg-neutral-800/60 border border-zinc-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {brandmasterName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {brandmasterName}
                </p>
                <p className="text-xs text-zinc-400">Brandmaster</p>
              </div>
            </div>

            {/* CAS Action Chunks */}
            <Accordion type="single" collapsible className="space-y-2">
              {casActions.map((casAction, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-zinc-700/50 rounded-lg bg-neutral-800/40 overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-neutral-700/30 transition-colors [&[data-state=open]]:bg-neutral-700/40">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-sm font-medium text-white truncate">
                        {action.shopName}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-semibold text-zinc-300">
                          {casAction.hours}h
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-3 bg-neutral-850/50 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-zinc-400 mb-0.5">Event</p>
                          <p className="text-zinc-200 font-medium">
                            {action.eventName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-zinc-400 mb-0.5">Adres</p>
                          <p className="text-zinc-200 font-medium text-xs leading-relaxed">
                            {action.shopAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-700/50">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-xs text-zinc-400 mb-1">Od</p>
                          <p className="text-zinc-100 font-semibold">
                            {formatTime(casAction.since)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatDate(casAction.since)}
                          </p>
                        </div>
                        
                        <div className="text-zinc-500 px-2">→</div>
                        
                        <div className="text-right">
                          <p className="text-xs text-zinc-400 mb-1">Do</p>
                          <p className="text-zinc-100 font-semibold">
                            {formatTime(casAction.until)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatDate(casAction.until)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="bg-neutral-800 border-zinc-700 hover:bg-neutral-700 text-zinc-200"
            >
              <X className="w-4 h-4 mr-2" />
              Anuluj
            </Button>
            <Button
              onClick={handleAccept}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white border-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {submitting ? "Tworzenie..." : `Akceptuj (${casActions.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

