"use client";
import * as React from "react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { tpSampleStats, Item } from "@/types/tpStatsSample";
import { messageRes } from "@/types/MessageRes";
import { BrandmasterStatsResponse, mapBrandmasterStatsToLegacy, LegacyTargetType } from "@/types/apiStuff/responses/BrandmasterStatsResponse";
import { MyCasActionsResponse, Action } from "@/types/apiStuff/responses/MyCasActionsResponse";
import ContextMenu from "@/components/contextMenu";
import ErrorBoundary from "@/components/ErrorBoundary";
import DarkLoadingPage from "@/components/LoadingScreen";

import { Package, Layers2, CircleOff, TrendingUp, AlertTriangle, RefreshCw, CheckCircle, XCircle, Clock, MapPin, Building, Calendar, ChevronDown, ChevronRight } from "lucide-react";


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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200 tracking-wide">
            {icon || <Package className="w-4 h-4" />}
            {title}
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 relative z-10">
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

// Helper function to parse time string to total minutes
const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + seconds / 60;
};

// Helper function to format total minutes back to HH:MM format
const formatMinutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const StatsPage: React.FC = () => {
  // State management
  const [brandmasterData, setBrandmasterData] = useState<BrandmasterStatsResponse | null>(null);
  const [sampleStats, setSampleStats] = useState<tpSampleStats | null>(null);
  const [casActionsData, setCasActionsData] = useState<MyCasActionsResponse | null>(null);
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

        // Fetch brandmaster data first to get accountLogin
        const brandmasterRes = await apiFetch<BrandmasterStatsResponse>('/api/bm/myTarget', {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        // Fetch remaining data sources in parallel
        const [casActionsRes, sampleStatsRes] = await Promise.all([
          // Fetch CAS actions data
          apiFetch<MyCasActionsResponse>('/api/bm/getMyCasActions', {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
          }),
          // Fetch sample stats from external API
          fetch(`https://api.webform.tdy-apps.com/sample/stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sample: {
                hostessCode: brandmasterRes.accountLogin,
                currentAction: null
              }
            }),
            signal: controller.signal,
          }).then(res => {
            if (!res.ok) throw new Error(`External API failed: ${res.status}`);
            return res.json() as Promise<tpSampleStats>;
          })
        ]);

        if (timeoutId) clearTimeout(timeoutId);

        if (mountedRef.current && !controller.signal.aborted) {
          // Set brandmaster data
          setBrandmasterData(brandmasterRes);
          setTargetHilo(brandmasterRes.target.gloHilo);
          setTargetVelo(brandmasterRes.target.velo);
          setTargetHiloPlus(brandmasterRes.target.gloHiloPlus);
          setIloscHilo(brandmasterRes.hiloBCP);
          setIloscHiloPlus(brandmasterRes.hiloPlusBCP);
          setIloscVelo(brandmasterRes.veloBCP);

          // Set CAS actions data
          setCasActionsData(casActionsRes);

          // Set sample stats and calculate additional counts
          setSampleStats(sampleStatsRes);
          const currentMonth = sampleStatsRes.data.sample.currentMonth;
            const hilo = currentMonth.find(item => item.model.toLowerCase() === "hilo") || { count: 0 };
            const hiloPlus = currentMonth.find(item => item.model.toLowerCase() === "hilo+") || { count: 0 };
            const veloItems = currentMonth.filter(item => item.brand.toLowerCase() === "velo");

            // Update counts with external data
            setIloscHilo( hilo.count);
            setIloscHiloPlus(hiloPlus.count);

            if (veloItems.length > 0) {
              const totalVelo = veloItems.reduce((sum, v) => sum + (v.count ?? 0), 0);
              const totalVeloAdjusted = totalVelo - hilo.count - hiloPlus.count;
              setIloscVelo(totalVeloAdjusted);
            }

          setError(null);
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

  // Computed values
  const totalHours = useMemo(() => {
    if (!casActionsData) return 0;
    return casActionsData.actions.reduce((total, action) => {
      const actionMinutes = parseTimeToMinutes(action.totalTime);
      // Cap each action at 4 hours (240 minutes)
      return total + Math.min(actionMinutes, 240);
    }, 0);
  }, [casActionsData]);

  const formattedTotalHours = useMemo(() => {
    return formatMinutesToTime(totalHours);
  }, [totalHours]);

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

      const res = await apiFetch<messageRes>("/api/bm/editBCP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          veloBCP: editingKey === 'bmVeloBPC' ? inputValue : brandmasterData.veloBCP,
          hiloBCP: editingKey === 'bmHiloBPC' ? inputValue : brandmasterData.hiloBCP,
          hiloPlusBCP: editingKey === 'bmHiloPluBPC' ? inputValue : brandmasterData.hiloPlusBCP,
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

        {/* Main Stats Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-white">
                <Package className="w-6 h-6" />
                Podsumowanie Statystyk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-700/50">
                      <TableHead className="text-zinc-300 font-semibold">Imię</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">Nazwisko</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">Godziny</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">Hilo</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">Hilo BCP</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">Hilo Target</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">HiloPlus</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">HiloPlus BCP</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">HiloPlus Target</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">Velo</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">Velo BCP</TableHead>
                      <TableHead className="text-zinc-300 font-semibold">Velo Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-zinc-700/30 hover:bg-zinc-800/30">
                      <TableCell className="text-white font-medium">
                        {casActionsData?.imie || '-'}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {casActionsData?.nazwisko || '-'}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {formattedTotalHours}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {iloscHilo.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {brandmasterData?.hiloBCP.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {targetHilo.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {iloscHiloPlus.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {brandmasterData?.hiloPlusBCP.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {targetHiloPlus.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {iloscVelo.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {brandmasterData?.veloBCP.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {targetVelo.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Hilo" 
            actual={iloscHilo + (brandmasterData?.hiloBCP || 0)} 
            target={targetHilo} 
            icon={<Package className="w-4 h-4" />}
            loading={operationLoading}
          />
          <StatCard 
            title="Hilo+" 
            actual={iloscHiloPlus + (brandmasterData?.hiloPlusBCP || 0)} 
            target={targetHiloPlus} 
            icon={<Package className="w-4 h-4" />}
            loading={operationLoading}
          />
          <StatCard 
            title="Velo" 
            actual={iloscVelo + (brandmasterData?.veloBCP || 0)} 
            target={targetVelo} 
            icon={<Package className="w-4 h-4" />}
            loading={operationLoading}
          />
        </div>

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

        {/* Actions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-white">
                <Clock className="w-6 h-6" />
                Lista Akcji
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {casActionsData?.actions.map((action, index) => (
                  <AccordionItem 
                    key={action.ident} 
                    value={`item-${index}`}
                    className="border border-zinc-700/30 rounded-lg bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-white font-medium">{action.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Clock className="w-4 h-4" />
                          <span className="font-mono">{action.totalTime}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-xs text-zinc-500 uppercase tracking-wide">Od</p>
                              <p className="text-white font-medium">{new Date(action.since).toLocaleString('pl-PL')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-xs text-zinc-500 uppercase tracking-wide">Do</p>
                              <p className="text-white font-medium">{new Date(action.until).toLocaleString('pl-PL')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-xs text-zinc-500 uppercase tracking-wide">Adres</p>
                              <p className="text-white font-medium">{action.shopDetails.streetAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-xs text-zinc-500 uppercase tracking-wide">Sklep</p>
                              <p className="text-white font-medium">{action.shopDetails.ShopName}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-zinc-700/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500 uppercase tracking-wide">ID Akcji</span>
                          <span className="text-white font-mono text-sm">{action.ident}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </ErrorBoundary>
  );
};

export default StatsPage;
