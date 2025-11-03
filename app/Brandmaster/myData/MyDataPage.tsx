"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import DarkLoadingPage from "@/components/LoadingScreen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 px-4 py-8 flex items-center justify-center">
        <div className="text-center text-gray-500 text-sm">
          Brak danych do wyświetlenia
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Context Menu */}
      <div ref={menuRef} className="fixed top-2 right-2 sm:top-3 sm:right-3 z-50" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={toggleMenu} 
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-controls="stats-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-8 h-8 sm:w-9 sm:h-9 bg-[#1a1a1a] hover:bg-[#252525] text-zinc-400 rounded-lg shadow-xl border border-[#2a2a2a] flex items-center justify-center transition-all duration-200 hover:border-[#3a3a3a] focus:outline-none focus:ring-2 focus:ring-blue-500/30" 
          type="button"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="stats-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="BM" />
          </div>
        )}
      </div>

      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 px-3 py-4 sm:px-2 sm:py-4">
        <div className="w-full max-w-3xl mx-auto space-y-2.5 sm:space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 px-1 pb-1.5 sm:pb-1">
            <svg className="w-4 h-4 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h1 className="text-base sm:text-base font-bold text-white">Moje dane</h1>
          </div>

          {/* Personal Info Card */}
          <Card className="bg-[#111111] border-[#1f1f1f] shadow-xl">
            <CardContent className="pt-3 pb-3 sm:pt-2.5 sm:pb-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                {/* Tourplanner ID */}
                <div className="space-y-1.5 sm:space-y-1">
                  <Label className="text-[10px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Tourplanner ID
                  </Label>
                  <Input
                    type="text"
                    value={data.tourplannerId}
                    disabled
                    className="bg-[#0a0a0a] border-[#1f1f1f] text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-xs h-8 sm:h-7"
                  />
                </div>

                {/* Brandmaster ID */}
                <div className="space-y-1.5 sm:space-y-1">
                  <Label className="text-[10px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Brandmaster ID
                  </Label>
                  <Input
                    type="text"
                    value={data.brandmasterId.toString()}
                    disabled
                    className="bg-[#0a0a0a] border-[#1f1f1f] text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-xs h-8 sm:h-7"
                  />
                </div>

                {/* Imię */}
                <div className="space-y-1.5 sm:space-y-1">
                  <Label className="text-[10px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Imię
                  </Label>
                  <Input
                    type="text"
                    value={data.imie}
                    disabled
                    className="bg-[#0a0a0a] border-[#1f1f1f] text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-xs h-8 sm:h-7"
                  />
                </div>

                {/* Nazwisko */}
                <div className="space-y-1.5 sm:space-y-1">
                  <Label className="text-[10px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Nazwisko
                  </Label>
                  <Input
                    type="text"
                    value={data.nazwisko}
                    disabled
                    className="bg-[#0a0a0a] border-[#1f1f1f] text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-xs h-8 sm:h-7"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kaso Terminal Card */}
          <Card className="bg-[#111111] border-[#1f1f1f] shadow-xl">
            <CardContent className="pt-3 pb-3 sm:pt-2.5 sm:pb-2.5">
              <div className="space-y-1.5 sm:space-y-1">
                <Label className="text-[10px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                  Nr kaseterminala
                </Label>
                <Input
                  type="text"
                  value={kasoTerminal}
                  onChange={(e) => setKasoTerminal(e.target.value)}
                  className="bg-[#0a0a0a] border-[#1f1f1f] text-gray-100 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-sm sm:text-xs h-8 sm:h-7 transition-all"
                />
              </div>
            </CardContent>
          </Card>

          {/* Targets Card */}
          <Card className="bg-[#111111] border-[#1f1f1f] shadow-xl">
            <CardHeader className="pb-2.5 pt-3 sm:pb-2 sm:pt-2.5">
              <CardTitle className="text-sm sm:text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Cele
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 sm:pb-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2">
                {/* Velo */}
                <div className="space-y-1.5 sm:space-y-1">
                  <Label className="text-[10px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
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
                    className="bg-[#0a0a0a] border-[#1f1f1f] text-gray-100 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-sm sm:text-xs h-8 sm:h-7 transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* Hilo */}
                <div className="space-y-1.5 sm:space-y-1">
                  <Label className="text-[10px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
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
                    className="bg-[#0a0a0a] border-[#1f1f1f] text-gray-100 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-sm sm:text-xs h-8 sm:h-7 transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* Hilo Plus */}
                <div className="space-y-1.5 sm:space-y-1">
                  <Label className="text-[10px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
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
                    className="bg-[#0a0a0a] border-[#1f1f1f] text-gray-100 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-sm sm:text-xs h-8 sm:h-7 transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button - Shows when there are changes */}
          {hasChanges && (
            <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/20 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardContent className="pt-2.5 pb-2.5 sm:pt-2 sm:pb-2 flex justify-end">
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-lg hover:shadow-blue-500/25 px-5 sm:px-4 h-8 sm:h-7 text-sm sm:text-xs font-medium transition-all duration-200 w-full sm:w-auto"
                >
                  <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Zapisz zmiany
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

