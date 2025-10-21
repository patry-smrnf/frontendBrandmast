"use client";
import * as React from "react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { tpSampleStats, Item } from "@/types/tpStatsSample";
import { messageRes } from "@/types/MessageRes";
import { BrandmasterStatsResponse, mapBrandmasterStatsToLegacy, LegacyTargetType } from "@/types/apiStuff/responses/BrandmasterStatsResponse";
import ContextMenu from "@/components/contextMenu";
import ErrorBoundary from "@/components/ErrorBoundary";
import DarkLoadingPage from "@/components/LoadingScreen";

import { Package, Layers2, CircleOff, TrendingUp, AlertTriangle, RefreshCw, CheckCircle, XCircle } from "lucide-react";


interface StatCardProps {
  title: string;
  actual: number;
  target: number;
  icon?: React.ReactNode;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, actual, target, icon, loading = false }) => {
  const efficiency = useMemo(() => {
    if (target === 0) return 0;
    return Math.min(100, (actual / target) * 100);
  }, [actual, target]);

  const getEfficiencyColor = (eff: number) => {
    if (eff >= 100) return "text-emerald-400 bg-emerald-500/10";
    if (eff >= 80) return "text-emerald-400 bg-emerald-500/10";
    if (eff >= 60) return "text-amber-400 bg-amber-500/10";
    if (eff >= 40) return "text-orange-400 bg-orange-500/10";
    return "text-rose-400 bg-rose-500/10";
  };

  const getProgressColor = (eff: number) => {
    if (eff >= 100) return "from-emerald-500 to-emerald-400";
    if (eff >= 80) return "from-emerald-500 to-emerald-400";
    if (eff >= 60) return "from-amber-500 to-amber-400";
    if (eff >= 40) return "from-orange-500 to-orange-400";
    return "from-rose-500 to-rose-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      className="flex-1"
    >
      <Card
        className={cn(
          "bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl",
          "border border-zinc-700/50 hover:border-zinc-600/50",
          "transition-all duration-300 rounded-2xl shadow-lg hover:shadow-xl",
          "group relative overflow-hidden"
        )}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200 tracking-wide">
            {icon || <Package className="w-4 h-4" />}
            {title}
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 relative z-10">
          {/* Numbers Row */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Aktualne</span>
              <span className="text-lg font-bold text-zinc-100">{actual.toLocaleString()}</span>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Realizacja</span>
              <span
                className={cn(
                  "text-sm font-bold px-3 py-1 rounded-full transition-all duration-300",
                  getEfficiencyColor(efficiency)
                )}
              >
                {efficiency.toFixed(1)}%
              </span>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Cel</span>
              <span className="text-lg font-bold text-zinc-100">{target.toLocaleString()}</span>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={efficiency}
              className={cn(
                "h-3 overflow-hidden rounded-full bg-zinc-950/50",
                "transition-all duration-700 ease-out"
              )}
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0</span>
              <span className="font-medium">Postęp: {actual} / {target}</span>
              <span>{target}</span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs">
            {efficiency >= 100 ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                <span>Cel osiągnięty!</span>
              </div>
            ) : efficiency >= 80 ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                <span>Doskonały postęp</span>
              </div>
            ) : efficiency >= 60 ? (
              <div className="flex items-center gap-1 text-amber-400">
                <TrendingUp className="w-3 h-3" />
                <span>Dobry postęp</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-rose-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Powoli powoli</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const StatsPage: React.FC = () => {
  // State management
  const [brandmasterData, setBrandmasterData] = useState<BrandmasterStatsResponse | null>(null);
  const [sampleStats, setSampleStats] = useState<tpSampleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // Calculated values
  const [iloscHilo, setIloscHilo] = useState<number>(0);
  const [iloscHiloPlus, setIloscHiloPlus] = useState(0);
  const [iloscVelo, setIloscVelo] = useState(0);

  // Target values
  const [targetVelo, setTargetVelo] = useState(0);
  const [targetHilo, setTargetHilo] = useState(0);
  const [targetHiloPlus, setTargetHiloPlus] = useState(0);

  // Edit state
  const [editingKey, setEditingKey] = useState<keyof LegacyTargetType | null>(null);
  const [inputValue, setInputValue] = useState<number>(0);

  // Refs for cleanup
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  // Fetch data with proper error handling and timeout
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    mountedRef.current = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        // Set timeout for the request
        timeoutId = setTimeout(() => {
          controller.abort();
        }, 15000); // 15 seconds timeout

        // Fetch brandmaster data with new JSON structure
        const brandmasterRes = await apiFetch<BrandmasterStatsResponse>('/api/bm/myTarget', {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        // Validate response
        if (!brandmasterRes || typeof brandmasterRes !== 'object') {
          throw new Error('Invalid brandmaster data received');
        }

        if (mountedRef.current && !controller.signal.aborted) {
          setBrandmasterData(brandmasterRes);
          
          // Set target values from new structure
          setTargetHilo(brandmasterRes.target.gloHilo);
          setTargetVelo(brandmasterRes.target.velo);
          setTargetHiloPlus(brandmasterRes.target.gloHiloPlus);

          // Set BCP values
          setIloscHilo(brandmasterRes.hiloBCP);
          setIloscHiloPlus(brandmasterRes.hiloPlusBCP);
          setIloscVelo(brandmasterRes.veloBCP);

          setError(null);
        }

        // Fetch sample stats from external API
        if (mountedRef.current && !controller.signal.aborted) {
          const tpResRaw = await fetch(`https://api.webform.tdy-apps.com/sample/stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sample: {
                hostessCode: brandmasterRes.accountLogin,
                currentAction: null
              }
            }),
            signal: controller.signal,
          });
          
          if (!tpResRaw.ok) {
            throw new Error(`External API failed: ${tpResRaw.status}`);
          }

          const tpRes = await tpResRaw.json() as tpSampleStats;
          
          if (mountedRef.current && !controller.signal.aborted) {
            setSampleStats(tpRes);

            // Calculate additional stats from external API
            const currentMonth = tpRes.data.sample.currentMonth;
            const hilo = currentMonth.find(item => item.model.toLowerCase() === "hilo") || { count: 0 };
            const hiloPlus = currentMonth.find(item => item.model.toLowerCase() === "hilo+") || { count: 0 };
            const veloItems = currentMonth.filter(item => item.brand.toLowerCase() === "velo");

            // Update counts with external data
            setIloscHilo(prev => prev + hilo.count);
            setIloscHiloPlus(prev => prev + hiloPlus.count);

            if (veloItems.length > 0) {
              const totalVelo = veloItems.reduce((sum, v) => sum + (v.count ?? 0), 0);
              const totalVeloAdjusted = totalVelo - hilo.count - hiloPlus.count;
              setIloscVelo(prev => prev + totalVeloAdjusted);
            }
          }
        }

      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!mountedRef.current || controller.signal.aborted) return;

        let errorMessage = 'Nie udało się załadować danych statystyk';
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.warn('Request was aborted');
            return;
          }
          errorMessage = err.message;
        }

        console.error('Failed to load stats:', err);
        setError(errorMessage);
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

  const editableFields: (keyof LegacyTargetType)[] = [
    "bmHiloBPC",
    "bmHiloPluBPC", 
    "bmVeloBPC",
  ];

  const friendlyNames: Record<string, string> = {
    bmHiloBPC: "Hilo",
    bmHiloPluBPC: "Hilo Plus",
    bmVeloBPC: "Velo",
  };

  const handleEdit = (key: keyof LegacyTargetType) => {
    if (operationLoading) return;
    setEditingKey(key);
    if (brandmasterData) {
      const legacyData = mapBrandmasterStatsToLegacy(brandmasterData);
      setInputValue(legacyData[key] as number);
    }
  };

  const handleSave = async () => {
    if (!editingKey || !brandmasterData || operationLoading) return;

    setOperationLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await apiFetch<messageRes>("/api/general/editBCP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          veloBcp: editingKey === 'bmVeloBPC' ? inputValue : brandmasterData.veloBCP,
          hiloBcp: editingKey === 'bmHiloBPC' ? inputValue : brandmasterData.hiloBCP,
          hiloPlusBcp: editingKey === 'bmHiloPluBPC' ? inputValue : brandmasterData.hiloPlusBCP,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Update local state
      if (editingKey === 'bmVeloBPC') {
        setIloscVelo(inputValue);
        setBrandmasterData(prev => prev ? { ...prev, veloBCP: inputValue } : null);
      } else if (editingKey === 'bmHiloBPC') {
        setIloscHilo(inputValue);
        setBrandmasterData(prev => prev ? { ...prev, hiloBCP: inputValue } : null);
      } else if (editingKey === 'bmHiloPluBPC') {
        setIloscHiloPlus(inputValue);
        setBrandmasterData(prev => prev ? { ...prev, hiloPlusBCP: inputValue } : null);
      }

      toast.success(res?.message || "Dane zostały zaktualizowane pomyślnie.");
      setEditingKey(null);
    } catch (error: unknown) {
      let errorMessage = "Nie udało się zaktualizować danych.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Operacja została przerwana z powodu przekroczenia czasu.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
  };

  // Loading and error states
  if (loading) return <DarkLoadingPage title="Ładowanie statystyk..." />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-6 py-10 flex flex-col items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <XCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold text-red-400">Błąd ładowania statystyk</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Context menu button (top-right) */}
      <div ref={menuRef} className="fixed top-4 right-4 z-50" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={toggleMenu} 
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-controls="stats-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500" 
          type="button"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="stats-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="BM" />
          </div>
        )}
      </div>

      <div className="p-6 space-y-8 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 min-h-screen">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-bold text-white">Statystyki Brandmastera</h1>
          {brandmasterData && (
            <p className="text-zinc-400">
              {brandmasterData.imie} {brandmasterData.nazwisko} • {brandmasterData.accountLogin}
            </p>
          )}
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Hilo" 
            actual={iloscHilo} 
            target={targetHilo} 
            icon={<Package className="w-4 h-4" />}
            loading={operationLoading}
          />
          <StatCard 
            title="Hilo+" 
            actual={iloscHiloPlus} 
            target={targetHiloPlus} 
            icon={<Package className="w-4 h-4" />}
            loading={operationLoading}
          />
          <StatCard 
            title="Velo" 
            actual={iloscVelo} 
            target={targetVelo} 
            icon={<Package className="w-4 h-4" />}
            loading={operationLoading}
          />
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Layers2 className="w-5 h-5" />
                  Informacje o zespole
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {brandmasterData && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Zespół:</span>
                      <span className="text-white font-medium">{brandmasterData.team.territory.territoryIdent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">ID Tourplanner:</span>
                      <span className="text-white font-mono text-sm">{brandmasterData.idTourplanner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">ID Brandmaster:</span>
                      <span className="text-white font-medium">{brandmasterData.idBrandmaster}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Emergency Data Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                  <CircleOff className="w-5 h-5" />
                  Dane Awaryjne
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editableFields.map((key) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                    <span className="flex items-center gap-2 font-medium text-white">
                      <Layers2 className="w-4 h-4" />
                      {friendlyNames[key]}:
                    </span>
                    {editingKey === key ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={inputValue}
                          onChange={(e) => setInputValue(Number(e.target.value))}
                          className="w-20 text-white bg-zinc-700 border-zinc-600"
                          disabled={operationLoading}
                        />
                        <Button 
                          size="sm" 
                          variant="default" 
                          onClick={handleSave}
                          disabled={operationLoading}
                          className="bg-blue-600 hover:bg-blue-500"
                        >
                          {operationLoading ? "Zapisywanie..." : "Zapisz"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancel}
                          disabled={operationLoading}
                          className="border-zinc-600 text-white hover:bg-zinc-700"
                        >
                          Anuluj
                        </Button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer text-white hover:text-blue-400 transition-colors font-medium"
                        onClick={() => handleEdit(key)}
                      >
                        {brandmasterData ? mapBrandmasterStatsToLegacy(brandmasterData)[key] : 0}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default StatsPage;
