"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { cn } from "@/lib/utils";
import { AllShopsResponse } from "@/types/apiStuff/responses/AllShopsResponse";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Helper function to format date to YYYY-MM-DD without timezone conversion
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Auto-format time input
function formatTimeInput(value: string): string {
  if (!value || value.trim() === "") return value;
  
  // Remove any non-digit characters except colons
  const cleaned = value.replace(/[^\d:]/g, "");
  
  // If empty after cleaning, return original
  if (!cleaned) return value;
  
  // Split by colons
  const parts = cleaned.split(":");
  
  if (parts.length === 1) {
    // Just hours, e.g., "20"
    if (parts[0].length === 0) return value;
    const hours = parts[0].padStart(2, "0");
    return `${hours}:00:00`;
  } else if (parts.length === 2) {
    // Hours and minutes, e.g., "20:30"
    if (parts[0].length === 0 || parts[1].length === 0) return value;
    const hours = parts[0].padStart(2, "0");
    const minutes = parts[1].padStart(2, "0");
    return `${hours}:${minutes}:00`;
  } else if (parts.length === 3) {
    // Complete time, e.g., "20:30:45"
    if (parts[0].length === 0 || parts[1].length === 0 || parts[2].length === 0) return value;
    const hours = parts[0].padStart(2, "0");
    const minutes = parts[1].padStart(2, "0");
    const seconds = parts[2].padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }
  
  return value;
}

export default function CreateActionDialog({ open, onOpenChange, onSuccess }: Props) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [selectedShopId, setSelectedShopId] = useState<number>(0);
  const [selectedShopEventId, setSelectedShopEventId] = useState<string>("");
  const [selectedShopName, setSelectedShopName] = useState<string>("");
  const [hoursSince, setHoursSince] = useState<string>("");
  const [hoursUntil, setHoursUntil] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showShopSuggestions, setShowShopSuggestions] = useState(false);
  const [requestProgress, setRequestProgress] = useState<Map<string, number>>(new Map());

  // Data for shops
  const [shops, setShops] = useState<AllShopsResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch shops from API
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const shopsRes = await apiFetch<AllShopsResponse[]>("/api/general/allShops");
          setShops(shopsRes);
        } catch (err) {
          console.error("Failed to fetch data", err);
          toast.error("Nie udało się pobrać danych");
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (selectedDates.length === 0) {
      toast.error("Wybierz przynajmniej jedną datę");
      return;
    }
    if (!selectedShop || selectedShopId === 0) {
      toast.error("Wybierz sklep");
      return;
    }
    if (!hoursSince || !hoursUntil) {
      toast.error("Wypełnij godziny");
      return;
    }

    // Validate time format (HH:MM:SS)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(hoursSince) || !timeRegex.test(hoursUntil)) {
      toast.error("Nieprawidłowy format godziny (użyj HH:MM:SS)");
      return;
    }

    setLoading(true);
    setRequestProgress(new Map());

    try {
      // Create actions for all selected dates
      const promises = selectedDates.map((date, index) => {
        const dateStr = formatDateLocal(date);
        const sinceDateTime = `${dateStr}T${hoursSince}`;
        const untilDateTime = `${dateStr}T${hoursUntil}`;
        const dateKey = dateStr;

        // Initialize progress for this date
        setRequestProgress(prev => new Map(prev).set(dateKey, 0));

        return apiFetch("/api/sv/createBlankCasAction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            since: sinceDateTime,
            until: untilDateTime,
            shopId: selectedShopId,
            name: selectedShopName,
          }),
        }).then(() => {
          // Mark as complete
          setRequestProgress(prev => new Map(prev).set(dateKey, 100));
        }).catch(err => {
          // Mark as failed
          setRequestProgress(prev => new Map(prev).set(dateKey, -1));
          throw err;
        });
      });

      await Promise.all(promises);
      
      toast.success(`${selectedDates.length} akcji zaplanowanych!`);

      // Reset form
      setSelectedDates([]);
      setSelectedShop("");
      setSelectedShopId(0);
      setSelectedShopEventId("");
      setSelectedShopName("");
      setHoursSince("");
      setHoursUntil("");
      setRequestProgress(new Map());

      onSuccess();
    } catch (err) {
      console.error("Failed to create action", err);
      const errorMessage = err instanceof Error ? err.message : "Nie udało się utworzyć akcji";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedDates([]);
    setSelectedShop("");
    setSelectedShopId(0);
    setSelectedShopEventId("");
    setSelectedShopName("");
    setHoursSince("");
    setHoursUntil("");
    onOpenChange(false);
  };

  const handleDateToggle = (date: Date | undefined) => {
    if (!date) return;
    
    const dateStr = date.toDateString();
    const existingIndex = selectedDates.findIndex(d => d.toDateString() === dateStr);
    
    if (existingIndex >= 0) {
      // Remove date if already selected
      setSelectedDates(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      // Add date if not selected
      setSelectedDates(prev => [...prev, date]);
    }
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => d.toDateString() === date.toDateString());
  };

  const removeDateChip = (index: number) => {
    setSelectedDates(prev => prev.filter((_, i) => i !== index));
  };

  // Normalize string for search
  const normalizeString = (s: string | undefined | null) => {
    if (!s) return "";
    try {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    } catch {
      return String(s).toLowerCase();
    }
  };

  // Filter shops based on search input
  const filteredShops = shops.filter((shop) => {
    if (!selectedShop) return false;
    const needle = normalizeString(selectedShop);
    return (
      normalizeString(shop.address).includes(needle) || 
      normalizeString(shop.name).includes(needle) ||
      normalizeString(shop.event?.name).includes(needle)
    );
  }).slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-gray-100 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Zaplanuj nową akcję</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Wypełnij poniższe pola, aby zaplanować nową akcję
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Date picker */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium text-gray-300">
                Daty <span className="text-xs text-gray-500">(wybierz wiele)</span>
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-gray-200",
                      selectedDates.length === 0 && "text-gray-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDates.length > 0 ? (
                      `Wybrano ${selectedDates.length} ${selectedDates.length === 1 ? "datę" : selectedDates.length < 5 ? "daty" : "dat"}`
                    ) : (
                      "Wybierz daty"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                  <Calendar
                    mode="single"
                    selected={undefined}
                    onSelect={handleDateToggle}
                    initialFocus
                    className="bg-zinc-900 text-gray-100"
                    modifiers={{
                      selected: (date) => isDateSelected(date)
                    }}
                    modifiersClassNames={{
                      selected: "bg-emerald-600 text-white hover:bg-emerald-700"
                    }}
                  />
                </PopoverContent>
              </Popover>
              
              {/* Selected dates chips */}
              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date, index) => {
                    const dateKey = formatDateLocal(date);
                    const progress = requestProgress.get(dateKey) ?? 0;
                    const isLoading = loading && progress !== undefined && progress !== 100 && progress !== -1;
                    
                    return (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1 bg-emerald-900/30 text-emerald-300 border border-emerald-800/50 rounded px-2 py-1 text-xs"
                      >
                        <span>
                          {date.toLocaleDateString("pl-PL", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {progress === 100 && (
                          <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {progress === -1 && (
                          <svg className="h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                        {!isLoading && progress !== 100 && progress !== -1 && (
                          <button
                            type="button"
                            onClick={() => removeDateChip(index)}
                            className="hover:text-emerald-100"
                            aria-label="Usuń datę"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shop address input */}
            <div className="space-y-2 relative">
              <Label htmlFor="shop" className="text-sm font-medium text-gray-300">
                Sklep
              </Label>
              <Input
                id="shop"
                type="text"
                placeholder="Wpisz adres lub nazwę sklepu"
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                onFocus={() => setShowShopSuggestions(true)}
                onBlur={() => {
                  // Allow click selection before hiding
                  setTimeout(() => setShowShopSuggestions(false), 150);
                }}
                className="bg-zinc-800 border-zinc-700 text-gray-200"
              />
              {showShopSuggestions && filteredShops.length > 0 && (
                <div className="absolute z-40 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-64 overflow-auto">
                  {filteredShops.map((shop) => (
                    <div
                      key={shop.id}
                      className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-white text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedShop(shop.address);
                        setSelectedShopId(shop.id);
                        setSelectedShopEventId(shop.event?.tpEventId || "");
                        setSelectedShopName(shop.name);
                        setShowShopSuggestions(false);
                      }}
                    >
                      <div className="font-medium">{shop.event?.name || "—"}, {shop.name}</div>
                      <div className="text-xs text-gray-400 truncate">{shop.address}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hoursSince" className="text-sm font-medium text-gray-300">
                  Od godziny
                </Label>
                <Input
                  id="hoursSince"
                  type="text"
                  value={hoursSince}
                  onChange={(e) => setHoursSince(e.target.value)}
                  onBlur={(e) => {
                    const formatted = formatTimeInput(e.target.value);
                    setHoursSince(formatted);
                  }}
                  className="bg-zinc-800 border-zinc-700 text-gray-200"
                  placeholder="HH:MM:SS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hoursUntil" className="text-sm font-medium text-gray-300">
                  Do godziny
                </Label>
                <Input
                  id="hoursUntil"
                  type="text"
                  value={hoursUntil}
                  onChange={(e) => setHoursUntil(e.target.value)}
                  onBlur={(e) => {
                    const formatted = formatTimeInput(e.target.value);
                    setHoursUntil(formatted);
                  }}
                  className="bg-zinc-800 border-zinc-700 text-gray-200"
                  placeholder="HH:MM:SS"
                />
              </div>
            </div>
          </form>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-gray-200"
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || loadingData}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              "Zapisz"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

