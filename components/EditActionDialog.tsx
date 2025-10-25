"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AllShopsResponse } from "@/types/apiStuff/responses/AllShopsResponse";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { UIAction } from "@/components/BmActionCard";
import { User } from "lucide-react";

interface EditActionDialogProps {
  action: UIAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopsData: AllShopsResponse[];
  onSuccess?: (updatedAction?: Partial<UIAction>) => void;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function EditActionDialog({
  action,
  open,
  onOpenChange,
  shopsData,
  onSuccess,
}: EditActionDialogProps) {
  const [shopAddress, setShopAddress] = useState("");
  const [shopID, setShopID] = useState<number>(0);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form when action changes
  useEffect(() => {
    if (action) {
      setShopAddress(action.shopAddress || "");
      setShopID(action.shopID || 0);
      setStartTime(formatTime(action.actionSince));
      setEndTime(formatTime(action.actionUntil));
    }
  }, [action]);

  const normalizeString = useCallback((s: string | undefined | null) => {
    if (!s) return "";
    try {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    } catch {
      return String(s).toLowerCase();
    }
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!shopAddress) return [];
    const needle = normalizeString(shopAddress);
    return shopsData
      .filter(
        (shop) =>
          normalizeString(shop.address).includes(needle) ||
          normalizeString(shop.event.name).includes(needle)
      )
      .slice(0, 8);
  }, [shopsData, shopAddress, normalizeString]);

  const handleSave = async () => {
    if (!action) return;
    
    setSaving(true);
    try {
      // Validate inputs
      if (!shopAddress || !startTime || !endTime) {
        toast.error("Wszystkie pola muszą być wypełnione");
        return;
      }

      // Resolve shop ID
      let resolvedShopId = shopID;
      if (resolvedShopId === 0) {
        const normalizedAddress = shopAddress.trim().toLowerCase();
        const found = shopsData?.find((s) => s.address.trim().toLowerCase() === normalizedAddress);
        if (found) {
          resolvedShopId = found.id;
        } else {
          toast.error("Nie znaleziono sklepu z tym adresem");
          return;
        }
      }

      // Parse times
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      if (
        isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin) ||
        startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 ||
        startMin < 0 || startMin > 59 || endMin < 0 || endMin > 59
      ) {
        toast.error("Nieprawidłowy format czasu");
        return;
      }

      // Create new dates with updated times
      const sinceDate = new Date(action.actionSince);
      sinceDate.setHours(startHour, startMin, 0, 0);

      const untilDate = new Date(action.actionUntil);
      untilDate.setHours(endHour, endMin, 0, 0);

      // Validate that end is after start
      if (untilDate <= sinceDate) {
        toast.error("Czas zakończenia musi być po czasie rozpoczęcia");
        return;
      }

      // Make API call
      const payload = {
        idAction: action.idAction,
        idShop: resolvedShopId,
        sinceSystem: sinceDate.toISOString(),
        untilSystem: untilDate.toISOString(),
      };

      const res = await apiFetch<{ message?: string }>("/api/sv/editActionDetails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Find the shop details for the updated action
      const updatedShop = shopsData.find(s => s.id === resolvedShopId);

      // Prepare updated action data to pass back
      const updatedActionData: Partial<UIAction> = {
        shopID: resolvedShopId,
        shopAddress: updatedShop?.address || shopAddress,
        shopName: updatedShop?.name || action.shopName,
        actionSince: sinceDate,
        actionUntil: untilDate,
      };

      onOpenChange(false);
      onSuccess?.(updatedActionData);
    } catch (error) {
      console.error("Error saving action:", error);
      const errorMessage = error instanceof Error ? error.message : "Nie udało się zapisać zmian";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!action) return null;

  const actionDate = formatDate(action.actionSince);
  const brandmasterName = `${action.brandmasterImie || ""} ${action.brandmasterNazwisko || ""}`.trim() || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-zinc-900 border-zinc-800 text-gray-100 max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Edytuj Akcję</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* ID Action - Disabled */}
          <div className="space-y-2">
            <Label htmlFor="idAction" className="text-gray-300 text-sm">
              ID Akcji
            </Label>
            <Input
              id="idAction"
              type="text"
              value={action.idAction}
              disabled
              className="bg-zinc-800 text-gray-400 border-zinc-700 cursor-not-allowed"
            />
          </div>

          {/* Date - Disabled */}
          <div className="space-y-2">
            <Label htmlFor="actionDate" className="text-gray-300 text-sm">
              Data
            </Label>
            <Input
              id="actionDate"
              type="text"
              value={actionDate}
              disabled
              className="bg-zinc-800 text-gray-400 border-zinc-700 cursor-not-allowed"
            />
          </div>

          {/* Street Address - Enabled with suggestions */}
          <div className="space-y-2 relative">
            <Label htmlFor="streetAddress" className="text-gray-300 text-sm">
              Adres
            </Label>
            <Input
              id="streetAddress"
              type="text"
              placeholder="Wpisz adres sklepu"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="bg-zinc-700 text-white border-zinc-600 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
              aria-autocomplete="list"
              aria-controls="address-suggestions"
              aria-expanded={showSuggestions}
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                id="address-suggestions"
                role="listbox"
                className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-600 rounded-md shadow-lg max-h-64 overflow-auto"
              >
                {filteredSuggestions.map((shop) => (
                  <div
                    key={shop.id}
                    role="option"
                    aria-selected={shop.address === shopAddress}
                    className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-white text-sm"
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      if (shop.products) {
                        if (shop.products.hilo === 0) {
                          toast.warning(`Na ${shop.address} możliwe że nie ma urządzeń hilo`);
                        }
                        if (shop.products.hiloPlus === 0) {
                          toast.warning(`Na ${shop.address} możliwe że nie ma urządzeń hilo Plus`);
                        }
                        if (shop.products.packs === 0) {
                          toast.warning(`Na ${shop.address} możliwe że nie ma paczek`);
                        }
                      }
                      setShopAddress(shop.address);
                      setShopID(shop.id);
                      setShowSuggestions(false);
                    }}
                  >
                    <div className="font-medium">
                      {shop.event.name}, {shop.name}
                    </div>
                    <div className="text-xs text-zinc-300 truncate">{shop.address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Since - Time Only */}
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-gray-300 text-sm">
              Czas rozpoczęcia (HH:MM)
            </Label>
            <Input
              id="startTime"
              type="text"
              placeholder="np. 12:00"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-zinc-700 text-white border-zinc-600 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          {/* Action Until - Time Only */}
          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-gray-300 text-sm">
              Czas zakończenia (HH:MM)
            </Label>
            <Input
              id="endTime"
              type="text"
              placeholder="np. 18:00"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-zinc-700 text-white border-zinc-600 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          {/* Brandmaster Info Box */}
          <div className="mt-4 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex items-center gap-2 text-gray-300">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">BM:</span>
              <span className="text-white text-sm">{brandmasterName}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-zinc-800 hover:bg-zinc-700 text-gray-200 border-zinc-700"
            disabled={saving}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-green-700 hover:bg-green-600 text-white"
            disabled={saving}
          >
            {saving ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

