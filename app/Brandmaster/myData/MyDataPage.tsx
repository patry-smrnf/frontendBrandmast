"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import DarkLoadingPage from "@/components/LoadingScreen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MyDataResponse } from "@/types/apiStuff/responses/MyDataResponse";
import ContextMenu from "@/components/contextMenu";

export default function MyDataPage() {
  const [data, setData] = useState<MyDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [kasoTerminal, setKasoTerminal] = useState<string>("");
  const [velo, setVelo] = useState<string>("");
  const [hilo, setHilo] = useState<string>("");
  const [hiloPlus, setHiloPlus] = useState<string>("");

  
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store initial values for comparison
  const [initialValues, setInitialValues] = useState({
    kasoTerminal: "",
    velo: "",
    hilo: "",
    hiloPlus: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    mountedRef.current = true;
    setLoading(true);

    const fetchData = async () => {
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        timeoutId = setTimeout(() => {
          controller.abort();
        }, 15000);

        const res = await apiFetch<MyDataResponse>("/api/bm/getMyData", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (mountedRef.current && !controller.signal.aborted) {
          setData(res);
          const kasoTerm = res.kasoterminal.number.toString();
          const veloVal = res.targets.velo?.toString() || "";
          const hiloVal = res.targets.hilo?.toString() || "";
          const hiloPlusVal = res.targets.hiloPlus?.toString() || "";

          setKasoTerminal(kasoTerm);
          setVelo(veloVal);
          setHilo(hiloVal);
          setHiloPlus(hiloPlusVal);

          // Set initial values for change detection
          setInitialValues({
            kasoTerminal: kasoTerm,
            velo: veloVal,
            hilo: hiloVal,
            hiloPlus: hiloPlusVal,
          });
        }
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);

        if (!mountedRef.current || controller.signal.aborted) return;

        let errorMessage = "Nie udało się załadować danych";

        if (err instanceof Error) {
          if (err.name === "AbortError") {
            console.warn("Request was aborted");
            return;
          }
          errorMessage = err.message;
        }

        console.error("Failed to load data:", err);
        toast.error(errorMessage);
      } finally {
        if (mountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, []);

  // Check if any field has been modified
  const hasChanges = useMemo(() => {
    return (
      kasoTerminal !== initialValues.kasoTerminal ||
      velo !== initialValues.velo ||
      hilo !== initialValues.hilo ||
      hiloPlus !== initialValues.hiloPlus
    );
  }, [kasoTerminal, velo, hilo, hiloPlus, initialValues]);

  // Handle save button click
  const handleSave = async () => {
    try {
      // Prepare request body
      const body = {
        nrKasoterminal: parseInt(kasoTerminal) || 0,
        targetVelo: velo === "" ? null : parseInt(velo),
        targetHilo: hilo === "" ? null : parseInt(hilo),
        targetHiloPlus: hiloPlus === "" ? null : parseInt(hiloPlus),
      };

      await apiFetch("/api/bm/setMyData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success("Zmiany zostały zapisane");
      
      // Update initial values after save to hide the button
      setInitialValues({
        kasoTerminal,
        velo,
        hilo,
        hiloPlus,
      });
    } catch (err: unknown) {
      let errorMessage = "Nie udało się zapisać zmian";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      console.error("Failed to save data:", err);
      toast.error(errorMessage);
    }
  };

  if (loading) return <DarkLoadingPage />;

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-950 text-gray-100 px-6 py-10 flex items-center justify-center">
        <div className="text-center text-gray-500">
          Brak danych do wyświetlenia
        </div>
      </div>
    );
  }

  return (
    <>
          {/* Context Menu */}
          <div ref={menuRef} className="fixed top-4 right-4 z-50" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={toggleMenu} 
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-controls="stats-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg shadow-lg border border-zinc-700 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
          type="button"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="stats-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="BM" />
          </div>
        )}
      </div>
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-950 text-gray-100 px-4 sm:px-6 py-6 sm:py-10">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-4">
            Moje dane
          </h1>

          {/* Personal Information Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Tourplanner ID */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm text-gray-400 font-medium">
                  Tourplanner ID
                </Label>
                <Input
                  type="text"
                  value={data.tourplannerId}
                  disabled
                  className="bg-zinc-800/50 border-zinc-700 text-gray-300 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base h-9 sm:h-10"
                />
              </div>

              {/* Brandmaster ID */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm text-gray-400 font-medium">
                  Brandmaster ID
                </Label>
                <Input
                  type="text"
                  value={data.brandmasterId.toString()}
                  disabled
                  className="bg-zinc-800/50 border-zinc-700 text-gray-300 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base h-9 sm:h-10"
                />
              </div>

              {/* Imię */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm text-gray-400 font-medium">
                  Imię
                </Label>
                <Input
                  type="text"
                  value={data.imie}
                  disabled
                  className="bg-zinc-800/50 border-zinc-700 text-gray-300 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base h-9 sm:h-10"
                />
              </div>

              {/* Nazwisko */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm text-gray-400 font-medium">
                  Nazwisko
                </Label>
                <Input
                  type="text"
                  value={data.nazwisko}
                  disabled
                  className="bg-zinc-800/50 border-zinc-700 text-gray-300 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base h-9 sm:h-10"
                />
              </div>
            </div>

            {/* Kaso Terminal */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm text-gray-400 font-medium">
                Nr kaseterminala
              </Label>
              <Input
                type="text"
                value={kasoTerminal}
                onChange={(e) => setKasoTerminal(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-gray-100 focus:ring-zinc-600 text-sm sm:text-base h-9 sm:h-10"
              />
            </div>
          </div>

          {/* Targets Section */}
          <div className="pt-2 sm:pt-4 border-t border-zinc-800">
            <h2 className="text-sm sm:text-base font-semibold text-gray-300 mb-3 sm:mb-4">
              Cele
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Velo */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm text-gray-400 font-medium">
                  Velo
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={velo}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d+$/.test(value)) {
                      setVelo(value);
                    }
                  }}
                  placeholder="—"
                  className="bg-zinc-800 border-zinc-700 text-gray-100 focus:ring-zinc-600 text-sm sm:text-base h-9 sm:h-10"
                />
              </div>

              {/* Hilo */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm text-gray-400 font-medium">
                  Hilo
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={hilo}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d+$/.test(value)) {
                      setHilo(value);
                    }
                  }}
                  placeholder="—"
                  className="bg-zinc-800 border-zinc-700 text-gray-100 focus:ring-zinc-600 text-sm sm:text-base h-9 sm:h-10"
                />
              </div>

              {/* Hilo Plus */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm text-gray-400 font-medium">
                  Hilo Plus
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={hiloPlus}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d+$/.test(value)) {
                      setHiloPlus(value);
                    }
                  }}
                  placeholder="—"
                  className="bg-zinc-800 border-zinc-700 text-gray-100 focus:ring-zinc-600 text-sm sm:text-base h-9 sm:h-10"
                />
              </div>
            </div>
          </div>

          {/* Save Button - Shows when there are changes */}
          {hasChanges && (
            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <Button
                onClick={handleSave}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 px-4 sm:px-6 h-9 sm:h-10 text-sm sm:text-base"
              >
                Zapisz zmiany
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

