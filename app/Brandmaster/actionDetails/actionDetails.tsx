"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";

import { ArrowLeft, Copy, Maximize2, Minimize2, MapPin, Clock, Calendar as CalendarIcon, Store, TrendingUp, X, ChevronRight, Filter } from "lucide-react";

import { MyAction } from "@/types/apiStuff/responses/MyAction.types";
import { AllShopsResponse } from "@/types/apiStuff/responses/AllShopsResponse";
import { newActionPayload, updateActionPayload } from "@/types/UpdateAction";
import { messageRes } from "@/types/MessageRes";

import { toast } from "sonner";

import dynamic from "next/dynamic";
import AddressInput from "@/components/AddressInput";
import TimeInputs from "@/components/TimeInputs";
import DatePickerInput from "@/components/DatePickerInput";
import { apiFetch } from "@/utils/apiFetch";
import ContextMenu from "@/components/contextMenu";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

import { DateTime } from "luxon";

enum LoadType {
  NEW_ACTION,
  EDIT_ACTION,
  UNKNOWN,
}

/* -- Helpers -- */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTime(input: string): string {
  const str = input.trim();

  if (/^\d{1,2}$/.test(str)) {
    const h = Number(str);
    if (h < 0 || h > 23) throw new Error("Hour out of range");
    return String(h).padStart(2, "0") + ":00";
  }

  if (/^\d{1,2}:\d{1,2}$/.test(str)) {
    const [hStr, mStr] = str.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      throw new Error(`Invalid time values: ${input}`);
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(str)) {
    const [hStr, mStr, sStr] = str.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      throw new Error(`Invalid time values: ${input}`);
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  throw new Error(`Invalid time format: "${input}"`);
}

/**
 * Combine date ("YYYY-MM-DD") and time ("HH:MM" or "HH:MM:SS") into ISO with Europe/Warsaw offset.
 * Returns null if missing date/time.
 */
function combineDateTime(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date || !time) return null;

  const timeParts = time.split(":").map((p) => Number(p));
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const seconds = timeParts[2] ?? 0;

  if ([hours, minutes, seconds].some((v) => Number.isNaN(v))) return null;

  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const dt = DateTime.fromObject(
    { year, month, day, hour: hours, minute: minutes, second: seconds },
    { zone: "Europe/Warsaw" }
  );

  if (!dt.isValid) return null;
  return dt.toISO();
}

function calculateDuration(startTime: string, endTime: string): string | null {
  if (!startTime || !endTime) return null;
  
  try {
    const start = normalizeTime(startTime);
    const end = normalizeTime(endTime);
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (endMinutes <= startMinutes) return null;
    
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  } catch {
    return null;
  }
}

/* -- Component -- */
export default function ActionDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [typeOfLoad, setTypeOfLoad] = useState<LoadType>(LoadType.NEW_ACTION);
  const [theActionID, setActionID] = useState<number | undefined>(undefined);

  // Map expansion state
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("all");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const [actionDetails, setActionDetails] = useState<MyAction>();
  const [shopsData, setShopsData] = useState<AllShopsResponse[]>();

  // Form data
  const [shopAddress, setShopAddress] = useState("");
  const [shopID, setShopID] = useState<number>(0);
  const [actionDate, setActionDate] = useState<Date>(new Date());
  const [systemStart, setSystemStart] = useState("");
  const [systemEnd, setSystemEnd] = useState("");

  // Create copies dialog
  const [copiesDialogOpen, setCopiesDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [creatingCopies, setCreatingCopies] = useState(false);

  useEffect(() => {
    let aborted = false;
    const ac = new AbortController();

    const newActionParam = searchParams.get("newAction");
    const actionIdParam = searchParams.get("actionId");

    const isNewAction = !!newActionParam;
    const actionID = actionIdParam ? Number.parseInt(actionIdParam, 10) : NaN;

    // invalid combinations
    if ((isNewAction && !Number.isNaN(actionID)) || (!isNewAction && Number.isNaN(actionID))) {
      router.push(encodeURI("/?error=Blad przy wchodzeniu w panel akcji, nie jest okreslone czy to nowa czy edycja istniejacej"));
      return;
    }

    apiFetch<AllShopsResponse[]>("/api/general/allShops").then((res) => setShopsData(res)).catch((err) => toast.error(String(err)));


    async function fetchActionDetails(id: number) {
      setLoading(true);
      try {
        const res = await apiFetch<MyAction>("/api/bm/detailsAction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idAction: id }),
          signal: ac.signal as any,
        });
        if (aborted) return;

        setActionDetails(res);
        setShopAddress(res.shop.address ?? "");
        setShopID(res.shop.id ?? 0);

        // if API gives ISO string, new Date(...) will parse it; guard if it's already Date
        const sinceDate = res.since ? new Date(res.since as any) : null;
        const untilDate = res.until ? new Date(res.until as any) : null;

        if (sinceDate && !Number.isNaN(sinceDate.getTime())) {
          const hoursSince = String(sinceDate.getHours()).padStart(2, "0");
          const minsSince = String(sinceDate.getMinutes()).padStart(2, "0");
          const secsSince = String(sinceDate.getSeconds()).padStart(2, "0");
          setSystemStart(`${hoursSince}:${minsSince}:${secsSince}`);
          setActionDate(sinceDate);
        }

        if (untilDate && !Number.isNaN(untilDate.getTime())) {
          const hoursUntil = String(untilDate.getHours()).padStart(2, "0");
          const minsUntil = String(untilDate.getMinutes()).padStart(2, "0");
          const secsUntil = String(untilDate.getSeconds()).padStart(2, "0");
          setSystemEnd(`${hoursUntil}:${minsUntil}:${secsUntil}`);
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          toast.error(String(err));
        }
      } finally {
        setLoading(false);
      }
    }

    if (!isNewAction) {
      setTypeOfLoad(LoadType.EDIT_ACTION);
      if (!Number.isNaN(actionID)) {
        setActionID(actionID);
        fetchActionDetails(actionID);
      }
    } else {
      setTypeOfLoad(LoadType.NEW_ACTION);
    }

    return () => {
      aborted = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // intentionally only when search params change

  const submitForm = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (saving) return;
      setSaving(true);

      try {
        let resolvedShopId = shopID;

        if (resolvedShopId === 0) {
          const normalizedAddress = shopAddress.trim().toLowerCase();
          const found = shopsData?.find((s) => s.address.trim().toLowerCase() === normalizedAddress);
          if (found) resolvedShopId = found.id;
          else {
            toast.error("[Frontend]: Nie istnieje sklep z takim adresem");
            return;
          }
        }

        if (!systemStart || !systemEnd || !shopAddress) {
          toast.error("[Frontend]: Missing data");
          return;
        }

        // Validate times: normalize and ensure start <= end
        let normalizedStart: string;
        let normalizedEnd: string;
        try {
          normalizedStart = normalizeTime(systemStart);
          normalizedEnd = normalizeTime(systemEnd);
        } catch (err) {
          toast.error(String(err));
          return;
        }

        // Compare times (HH:MM[:SS]) reliably
        const dateStr = formatDate(actionDate);
        const startISO = combineDateTime(dateStr, normalizedStart);
        const endISO = combineDateTime(dateStr, normalizedEnd);
        if (!startISO || !endISO) {
          toast.error("[Frontend]: Could not combine date and time");
          return;
        }
        if (DateTime.fromISO(endISO) < DateTime.fromISO(startISO)) {
          toast.error("[Frontend]: Nie mozna konczyc potem zaczac");
          return;
        }

        if (typeOfLoad === LoadType.NEW_ACTION) {
          const payload: newActionPayload = {
            idShop: resolvedShopId,
            sinceSystem: startISO,
            untilSystem: endISO,
          };
          console.log(payload);
          const res = await apiFetch<messageRes>("/api/bm/addAction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          toast.success(res.message);
          // optional: navigate back after success
          // router.push("/");
        } else if (typeOfLoad === LoadType.EDIT_ACTION) {
          if (!actionDetails) {
            toast.error("Missing action details");
            return;
          }
          const payload: updateActionPayload = {
            idAction: actionDetails.id,
            idShop: resolvedShopId,
            sinceSystem: startISO,
            untilSystem: endISO,
          };
                    console.log(payload);

          const res = await apiFetch<messageRes>("/api/bm/editAction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          toast.success(res.message);
        }
      } catch (err) {
        toast.error(String(err));
      } finally {
        setSaving(false);
      }
    },
    [shopID, actionDate, systemStart, systemEnd, shopAddress, shopsData, typeOfLoad, actionDetails, saving]
  );

  const handleCreateCopies = useCallback(async () => {
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    if (creatingCopies) return;
    setCreatingCopies(true);

    try {
      let resolvedShopId = shopID;

      if (resolvedShopId === 0) {
        const normalizedAddress = shopAddress.trim().toLowerCase();
        const found = shopsData?.find((s) => s.address.trim().toLowerCase() === normalizedAddress);
        if (found) resolvedShopId = found.id;
        else {
          toast.error("[Frontend]: Nie istnieje sklep z takim adresem");
          return;
        }
      }

      if (!systemStart || !systemEnd || !shopAddress) {
        toast.error("[Frontend]: Missing data");
        return;
      }

      // Validate times: normalize and ensure start <= end
      let normalizedStart: string;
      let normalizedEnd: string;
      try {
        normalizedStart = normalizeTime(systemStart);
        normalizedEnd = normalizeTime(systemEnd);
      } catch (err) {
        toast.error(String(err));
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Create action for each selected date
      for (const date of selectedDates) {
        try {
          const dateStr = formatDate(date);
          const startISO = combineDateTime(dateStr, normalizedStart);
          const endISO = combineDateTime(dateStr, normalizedEnd);

          if (!startISO || !endISO) {
            toast.error(`[Frontend]: Could not combine date and time for ${dateStr}`);
            failCount++;
            continue;
          }

          if (DateTime.fromISO(endISO) < DateTime.fromISO(startISO)) {
            toast.error(`[Frontend]: Invalid time range for ${dateStr}`);
            failCount++;
            continue;
          }

          const payload: newActionPayload = {
            idShop: resolvedShopId,
            sinceSystem: startISO,
            untilSystem: endISO,
          };

          await apiFetch<messageRes>("/api/bm/addAction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          successCount++;
        } catch (err) {
          console.error(`Failed to create action for ${formatDate(date)}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} action${successCount > 1 ? "s" : ""}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to create ${failCount} action${failCount > 1 ? "s" : ""}`);
      }

      // Reset and close dialog
      setSelectedDates([]);
      setCopiesDialogOpen(false);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setCreatingCopies(false);
    }
  }, [selectedDates, shopID, shopAddress, shopsData, systemStart, systemEnd, creatingCopies]);

  const duration = calculateDuration(systemStart, systemEnd);
  const selectedShop = shopsData?.find((s) => s.address === shopAddress);

  // Get unique event names for filter
  const uniqueEvents = React.useMemo(() => {
    if (!shopsData || shopsData.length === 0) return [];
    const events = new Set<string>();
    shopsData.forEach((shop) => {
      if (shop.event?.name) {
        events.add(shop.event.name);
      }
    });
    return Array.from(events).sort();
  }, [shopsData]);

  // Filter shops based on selected event
  const filteredShopsForMap = React.useMemo(() => {
    if (!shopsData || shopsData.length === 0) return [];
    if (selectedEventFilter === "all") return shopsData;
    return shopsData.filter((shop) => shop.event?.name === selectedEventFilter);
  }, [shopsData, selectedEventFilter]);

  return (
    <>
      <div ref={menuRef} className="fixed top-4 right-4 z-50" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={toggleMenu}
          aria-label="Toggle menu"
          className="w-10 h-10 bg-zinc-900/80 backdrop-blur-md rounded-full shadow-lg border border-zinc-800 flex items-center justify-center focus:outline-none hover:bg-zinc-800 transition-colors"
          type="button"
        >
          <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && <ContextMenu closeMenu={() => setMenuOpen(false)} type={"BM"} />}
      </div>

      <div
        className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-gray-100 px-4 sm:px-6 py-6 sm:py-10"
        aria-busy={loading}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-white hover:bg-zinc-800/50 flex items-center gap-2 px-0 mb-4 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Dashboard</span>
            </Button>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent mb-2">
                  {typeOfLoad === LoadType.NEW_ACTION ? "Create New Action" : "Edit Action"}
                </h1>
                <p className="text-sm text-gray-400">
                  {typeOfLoad === LoadType.NEW_ACTION 
                    ? "Stworz nowa akcje" 
                    : `Action ID: ${actionDetails?.id || "N/A"}`}
                </p>
              </div>
              
              {/* Map Toggle Button - Mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMapVisible(!mapVisible)}
                className="lg:hidden border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-gray-300"
              >
                {mapVisible ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Hide Map
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Show Map
                  </>
                )}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-gray-300">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                Loading action details...
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className={`lg:col-span-2 transition-all duration-300 ${mapExpanded ? 'lg:col-span-1' : ''}`}>
              <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 shadow-2xl p-6 sm:p-8">
                {/* Quick Stats Cards */}
                {(actionDetails || shopAddress || duration) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {actionDetails?.status && (
                      <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-800/30 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-gray-400 uppercase">Status</span>
                        </div>
                        <p className="text-sm font-semibold text-blue-300">{actionDetails.status}</p>
                      </div>
                    )}
                    {duration && (
                      <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-800/30 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-gray-400 uppercase">Duration</span>
                        </div>
                        <p className="text-sm font-semibold text-purple-300">{duration}</p>
                      </div>
                    )}
                    {actionDate && (
                      <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-800/30 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CalendarIcon className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-gray-400 uppercase">Date</span>
                        </div>
                        <p className="text-sm font-semibold text-purple-300">
                          {actionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                    {selectedShop && (
                      <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-800/30 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Store className="w-4 h-4 text-orange-400" />
                          <span className="text-xs text-gray-400 uppercase">Sklepp</span>
                        </div>
                        <p className="text-sm font-semibold text-orange-300 truncate" title={selectedShop.name}>
                          {selectedShop.name || "Selected"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={submitForm} className="space-y-6" noValidate>
                  <div>
                    <Label htmlFor="date" className="text-sm text-gray-300 mb-2 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Event Date
                    </Label>
                    <DatePickerInput value={actionDate} onChange={setActionDate} />
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm text-gray-300 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Shop Address
                    </Label>
                    <AddressInput 
                      value={shopAddress} 
                      onChange={setShopAddress} 
                      onChangeID={setShopID} 
                      shopsResponse={shopsData}
                      showMap={false}
                    />
                  </div>

                  <TimeInputs
                    time1={systemStart}
                    time1Name="Start Time"
                    onTime1Change={setSystemStart}
                    time2={systemEnd}
                    time2Name="End Time"
                    onTime2Change={setSystemEnd}
                  />

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="default"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-600 hover:from-purple-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-purple-900/20 transition-all"
                      disabled={saving}
                      aria-disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          {typeOfLoad === LoadType.NEW_ACTION ? "Create Action" : "Save Changes"}
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-gray-300 hover:text-white transition-all"
                      onClick={() => setCopiesDialogOpen(true)}
                      disabled={saving}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Create Copies
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Map Section */}
            {mapVisible && (
              <div className={`lg:col-span-1 transition-all duration-300 ${mapExpanded ? 'lg:col-span-2' : ''}`}>
                <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 shadow-2xl overflow-hidden relative h-full">
                  {/* Map Header */}
                  <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-zinc-900/95 to-transparent p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-200 truncate">Location Map</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Event Filter */}
                      {uniqueEvents.length > 0 && (
                        <Select value={selectedEventFilter} onValueChange={setSelectedEventFilter}>
                          <SelectTrigger 
                            size="sm"
                            className="h-8 w-[140px] sm:w-[160px] bg-zinc-800/50 border-zinc-700 text-gray-200 text-xs hover:bg-zinc-800 focus:ring-purple-500/20 focus:ring-2"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Filter className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                              <SelectValue placeholder="All Events">
                                {selectedEventFilter === "all" 
                                  ? "All Events" 
                                  : selectedEventFilter}
                              </SelectValue>
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                            <SelectItem 
                              value="all" 
                              className="focus:bg-zinc-800 focus:text-white cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span>All Events</span>
                                <span className="text-xs text-gray-400 ml-auto">
                                  ({shopsData?.length || 0})
                                </span>
                              </div>
                            </SelectItem>
                            {uniqueEvents.map((eventName) => {
                              const count = shopsData?.filter((s) => s.event?.name === eventName).length || 0;
                              return (
                                <SelectItem
                                  key={eventName}
                                  value={eventName}
                                  className="focus:bg-zinc-800 focus:text-white cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="truncate">{eventName}</span>
                                    <span className="text-xs text-purple-400 ml-auto flex-shrink-0">
                                      ({count})
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMapExpanded(!mapExpanded)}
                        className="w-8 h-8 text-gray-400 hover:text-white hover:bg-zinc-800/50 hidden lg:flex"
                        aria-label={mapExpanded ? "Minimize map" : "Expand map"}
                      >
                        {mapExpanded ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Map Container */}
                  <div className={`transition-all duration-300 ${mapExpanded ? 'h-[calc(100vh-8rem)]' : 'h-[500px] sm:h-[600px]'}`}>
                    {!shopsData || shopsData.length === 0 ? (
                      <div className="h-full flex items-center justify-center bg-zinc-950/50">
                        <div className="text-center">
                          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">Loading shops data...</p>
                        </div>
                      </div>
                    ) : filteredShopsForMap.length === 0 ? (
                      <div className="h-full flex items-center justify-center bg-zinc-950/50">
                        <div className="text-center">
                          <Filter className="w-12 h-12 text-purple-600 mx-auto mb-3 opacity-50" />
                          <p className="text-sm text-gray-400 mb-1">No shops found</p>
                          <p className="text-xs text-gray-500">Try selecting a different event filter</p>
                        </div>
                      </div>
                    ) : (
                      <MapPicker
                        shops={filteredShopsForMap}
                        selectedAddress={shopAddress}
                        onSelect={(selectedAddress) => {
                          setShopAddress(selectedAddress);
                          const shop = shopsData?.find((s) => s.address === selectedAddress);
                          if (shop) setShopID(shop.id);
                        }}
                      />
                    )}
                  </div>

                  {/* Map Footer Info */}
                  {selectedShop && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900/95 to-transparent p-4 z-10">
                      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-3 border border-zinc-700/50">
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-500/20 rounded-lg p-2">
                            <Store className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{selectedShop.name}</p>
                            <p className="text-xs text-gray-400 truncate">{selectedShop.address}</p>
                            {selectedShop.event && (
                              <p className="text-xs text-purple-400 mt-1">{selectedShop.event.name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Copies Dialog */}
      <Dialog open={copiesDialogOpen} onOpenChange={setCopiesDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md bg-zinc-900/95 border-zinc-800 text-gray-100 backdrop-blur-xl p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
              Create Copies
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              Select dates to duplicate this action. Time stays the same.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-full flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 text-gray-100 p-2 [--cell-size:theme(spacing.9)] sm:[--cell-size:theme(spacing.10)]"
                classNames={{
                  day_button: "hover:bg-zinc-800 text-gray-300",
                  selected: "bg-purple-900 hover:bg-purple-800 text-white",
                  today: "bg-zinc-800 text-gray-100",
                  outside: "text-gray-600",
                  disabled: "text-gray-700 opacity-50",
                }}
              />
            </div>

            {selectedDates.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/20 border border-purple-900/30 rounded-lg backdrop-blur-sm w-full">
                <Copy className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">
                  {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""} selected
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCopiesDialogOpen(false);
                setSelectedDates([]);
              }}
              disabled={creatingCopies}
              className="w-full sm:w-auto border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-gray-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCopies}
              disabled={creatingCopies || selectedDates.length === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-900 to-purple-900 hover:from-purple-800 hover:to-purple-800 text-white font-semibold shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingCopies ? (
                <>
                  <span className="animate-pulse">Creating...</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Create {selectedDates.length > 0 ? selectedDates.length : ""} {selectedDates.length !== 1 ? "Actions" : "Action"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
