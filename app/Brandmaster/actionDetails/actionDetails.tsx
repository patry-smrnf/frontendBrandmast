"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { ArrowLeft } from "lucide-react";

import { MyAction } from "@/types/apiStuff/responses/MyAction.types";
import { AllShopsResponse } from "@/types/apiStuff/responses/AllShopsResponse";
import { newActionPayload, updateActionPayload } from "@/types/UpdateAction";
import { messageRes } from "@/types/MessageRes";

import { toast } from "sonner";

import AddressInput from "@/components/AddressInput";
import TimeInputs from "@/components/TimeInputs";
import DatePickerInput from "@/components/DatePickerInput";
import { apiFetch } from "@/utils/apiFetch";
import ContextMenu from "@/components/contextMenu";

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

/* -- Component -- */
export default function ActionDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [typeOfLoad, setTypeOfLoad] = useState<LoadType>(LoadType.NEW_ACTION);
  const [theActionID, setActionID] = useState<number | undefined>(undefined);

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

  return (
    <>
      <div ref={menuRef} className="fixed top-4 right-4 z-50" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={toggleMenu}
          aria-label="Toggle menu"
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none"
          type="button"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && <ContextMenu closeMenu={() => setMenuOpen(false)} type={"BM"} />}
      </div>

      <div
        className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-100 px-6 py-10 flex flex-col items-center"
        aria-busy={loading}
      >
        <div className="w-full max-w-xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-lg rounded-xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-white hover:bg-zinc-900 flex items-center gap-2 px-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Dashboard</span>
            </Button>
          </div>

          {loading && <div className="mb-4 text-center text-sm text-gray-300">Loading...</div>}

          <form onSubmit={submitForm} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="date" className="text-sm text-gray-300 mb-1 block">
                Event Date
              </Label>
              {/* Ensure Popover/Calendar has higher z-index so map doesn't intercept clicks */}
              <DatePickerInput value={actionDate} onChange={setActionDate} />
            </div>

            <AddressInput value={shopAddress} onChange={setShopAddress} onChangeID={setShopID} shopsResponse={shopsData} />

            <TimeInputs
              time1={systemStart}
              time1Name="Start"
              onTime1Change={setSystemStart}
              time2={systemEnd}
              time2Name="Stop"
              onTime2Change={setSystemEnd}
            />

            <Button
              type="submit"
              variant="default"
              className="w-full text-base bg-green-900 hover:bg-green-700"
              disabled={saving}
              aria-disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}