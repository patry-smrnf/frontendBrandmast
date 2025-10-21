// app/brandmasters/page.tsx
"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { myBms, myBmsTargets } from "@/types/myBms"
import { MyTeamTargetsResponse, BrandmasterTarget, mapBrandmasterTargetsToLegacy, LegacyMyBmsTargets } from "@/types/apiStuff/responses/MyTeamTargetsResponse"
import { apiFetch } from "@/utils/apiFetch"
import { toast } from "sonner"
import { messageRes } from "@/types/MessageRes"
import ContextMenu from "@/components/contextMenu"
import DarkLoadingPage from "@/components/LoadingScreen"
import ErrorBoundary from "@/components/ErrorBoundary"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Edit3, Save, X, Target, Users, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"


export default function MyTargetsPage() {
  // State management
  const [brandmasterData, setBrandmasterData] = useState<BrandmasterTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  
  // UI state
  const [selected, setSelected] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Edit state
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editingValues, setEditingValues] = useState<{
    targetHilo: number
    targetHiloPlus: number
    targetVelo: number
  }>({ targetHilo: 0, targetHiloPlus: 0, targetVelo: 0 })

  // General target dialog
  const [open, setOpen] = useState(false)
  const [generalTarget, setGeneralTarget] = useState({
    targetHilo: 0,
    targetHiloPlus: 0,
    targetVelo: 0
  })

  // Refs for cleanup
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), [])


  // Filtered and paginated data with safety checks
  const filteredData = useMemo(() => {
    // Safety check: ensure brandmasterData is an array
    if (!Array.isArray(brandmasterData) || brandmasterData.length === 0) {
      return [];
    }
    
    if (!searchQuery.trim()) return brandmasterData;
    
    const query = searchQuery.toLowerCase().trim();
    return brandmasterData.filter(bm => {
      // Safety checks for each field
      const imie = bm?.imie?.toLowerCase() || '';
      const nazwisko = bm?.nazwisko?.toLowerCase() || '';
      const accountLogin = bm?.accountLogin?.toLowerCase() || '';
      
      return imie.includes(query) || 
             nazwisko.includes(query) ||
             accountLogin.includes(query);
    });
  }, [brandmasterData, searchQuery]);

  // Safe pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages); // Ensure page is within bounds
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredData.length);
  const visibleData = filteredData.slice(startIndex, endIndex);

  // Update page if it's out of bounds
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

        const res = await apiFetch<MyTeamTargetsResponse>('/api/sv/myTeamTargets', {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        // Validate response
        if (!res || !Array.isArray(res.brandmasters)) {
          throw new Error('Invalid response format: expected brandmasters array');
        }

        if (mountedRef.current && !controller.signal.aborted) {
          setBrandmasterData(res.brandmasters);
          setError(null);
        }
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!mountedRef.current || controller.signal.aborted) return;

        let errorMessage = 'Nie udało się załadować danych targetów';
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.warn('Request was aborted');
            return;
          }
          errorMessage = err.message;
        }

        console.error('Failed to load targets:', err);
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

  // Handle general target setting
  const handleSetGeneralTarget = useCallback(async () => {
    if (operationLoading) return;

    setOperationLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await apiFetch<messageRes>('/api/sv/setGeneralTargets', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetHilo: generalTarget.targetHilo,
          targetHiloPlus: generalTarget.targetHiloPlus,
          targetVelo: generalTarget.targetVelo,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      toast.success(res?.message || "Ogólne targety zostały ustawione pomyślnie.");
      setOpen(false);
    } catch (error: unknown) {
      let errorMessage = "Nie udało się ustawić ogólnych targetów.";
      
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
  }, [generalTarget, operationLoading]);

  // Handle individual target editing
  const handleEditTarget = useCallback(async (brandmasterId: number) => {
    if (operationLoading) return;

    setOperationLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await apiFetch<messageRes>('/api/sv/setIndividualTarget', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandmasterId,
          targetHilo: editingValues.targetHilo,
          targetHiloPlus: editingValues.targetHiloPlus,
          targetVelo: editingValues.targetVelo,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Update local state
      setBrandmasterData(prev => prev.map(bm => 
        bm.idBrandmaster === brandmasterId 
          ? {
              ...bm,
              target: {
                ...bm.target,
                velo: editingValues.targetVelo,
                gloHilo: editingValues.targetHilo,
                gloHiloPlus: editingValues.targetHiloPlus,
              }
            }
          : bm
      ));

      toast.success(res?.message || "Target został zaktualizowany pomyślnie.");
      setEditingRow(null);
    } catch (error: unknown) {
      let errorMessage = "Nie udało się zaktualizować targetu.";
      
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
  }, [editingValues, operationLoading]);

  // Loading and error states
  if (loading) return <DarkLoadingPage title="Ładowanie targetów..." />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-6 py-10 flex flex-col items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold text-red-400">Błąd ładowania targetów</h2>
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
          aria-controls="targets-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500" 
          type="button"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="targets-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />
          </div>
        )}
      </div>

      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-200 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
              <Target className="w-8 h-8" />
              Zarządzanie Targetami
            </h1>
            <p className="text-zinc-400">
              Ustawiaj cele dla brandmasterów w swoim zespole
            </p>
          </div>

          <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-zinc-700/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Lista Brandmasterów
                  </CardTitle>
                  <p className="text-sm text-zinc-400 mt-1">
                    {filteredData.length} brandmasterów • Strona {safePage} z {totalPages}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Szukaj po imieniu, nazwisku lub loginie..."
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Safety: limit search query length to prevent performance issues
                        if (value.length <= 100) {
                          setSearchQuery(value);
                          setPage(1); // Reset to first page when searching
                        }
                      }}
                      className="pl-10 w-64 bg-zinc-800/50 border-zinc-600 text-white placeholder-zinc-400 focus:border-blue-500"
                      maxLength={100}
                    />
                  </div>

                  {/* General Target Dialog */}
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                        <Target className="w-4 h-4 mr-2" />
                        Ustaw Ogólne Targety
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Ustaw Ogólne Targety
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4 mt-4">
                        <div>
                          <Label className="text-sm text-zinc-300">Hilo</Label>
                          <Input
                            type="number"
                            value={generalTarget.targetHilo}
                            onChange={(e) => setGeneralTarget(prev => ({ ...prev, targetHilo: Number(e.target.value) }))}
                            className="mt-1 bg-zinc-800 border-zinc-600 text-white"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-zinc-300">Hilo Plus</Label>
                          <Input
                            type="number"
                            value={generalTarget.targetHiloPlus}
                            onChange={(e) => setGeneralTarget(prev => ({ ...prev, targetHiloPlus: Number(e.target.value) }))}
                            className="mt-1 bg-zinc-800 border-zinc-600 text-white"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-zinc-300">Velo</Label>
                          <Input
                            type="number"
                            value={generalTarget.targetVelo}
                            onChange={(e) => setGeneralTarget(prev => ({ ...prev, targetVelo: Number(e.target.value) }))}
                            className="mt-1 bg-zinc-800 border-zinc-600 text-white"
                            placeholder="0"
                          />
                        </div>
                        <Button
                          onClick={handleSetGeneralTarget}
                          disabled={operationLoading}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          {operationLoading ? "Ustawianie..." : "Ustaw Targety"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Page size selector */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-zinc-400">Wierszy na stronę:</Label>
                  <Select 
                    value={pageSize.toString()}
                    onValueChange={(val) => {
                      const newPageSize = Number(val);
                      if (newPageSize > 0 && newPageSize <= 100) { // Safety bounds
                        setPageSize(newPageSize);
                        setPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className="w-20 bg-zinc-800 border-zinc-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      {[5, 10, 20, 50].map((n) => (
                        <SelectItem key={n} value={n.toString()} className="hover:bg-zinc-800">
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {searchQuery && (
                  <div className="text-sm text-zinc-400">
                    Znaleziono {filteredData.length} wyników dla "{searchQuery}"
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-hidden border border-zinc-700/50 rounded-xl bg-zinc-800/20">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-800/50 border-b border-zinc-700/50">
                      <TableHead className="w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="accent-blue-600"
                          checked={selected.length === visibleData.length && visibleData.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelected(visibleData.map(item => item.idBrandmaster));
                            } else {
                              setSelected([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">ID</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Imię</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Nazwisko</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Login</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Hilo BCP / Cel</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Hilo+ BCP / Cel</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Velo BCP / Cel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {visibleData.length > 0 ? visibleData.map((item, index) => {
                        const isEditing = editingRow === item.idBrandmaster;
                        const isSelected = selected.includes(item.idBrandmaster);

                        return (
                          <motion.tr
                            key={item.idBrandmaster}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={cn(
                              "transition-all duration-200 hover:bg-zinc-700/30 border-b border-zinc-700/30",
                              isSelected && "bg-blue-500/10",
                              isEditing && "bg-zinc-600/20"
                            )}
                          >
                            <TableCell className="text-center">
                              <input 
                                type="checkbox" 
                                className="accent-blue-600"
                                checked={isSelected}
                                onChange={(e) => setSelected(prev => 
                                  e.target.checked 
                                    ? [...prev, item.idBrandmaster]
                                    : prev.filter(id => id !== item.idBrandmaster)
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-zinc-400 text-sm font-mono">{item.idBrandmaster}</TableCell>
                            <TableCell className="text-zinc-200 text-sm font-medium">{item.imie}</TableCell>
                            <TableCell className="text-zinc-200 text-sm font-medium">{item.nazwisko}</TableCell>
                            <TableCell className="text-sm font-mono text-blue-400">{item.accountLogin}</TableCell>

                            {/* Hilo BCP / Target */}
                            <TableCell className="text-sm">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={editingValues.targetHilo}
                                    onChange={(e) => setEditingValues(prev => ({ ...prev, targetHilo: Number(e.target.value) }))}
                                    className="w-20 h-8 bg-zinc-700 border-zinc-600 text-white text-center"
                                    disabled={operationLoading}
                                  />
                                  <span className="text-zinc-400">/</span>
                                  <span className="text-zinc-300">{item.target?.gloHilo ?? 0}</span>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-600/20 p-1 rounded"
                                  onClick={() => {
                                    setEditingRow(item.idBrandmaster);
                                    setEditingValues({
                                      targetHilo: item.target?.gloHilo ?? 0,
                                      targetHiloPlus: item.target?.gloHiloPlus ?? 0,
                                      targetVelo: item.target?.velo ?? 0,
                                    });
                                  }}
                                >
                                  <span className="text-zinc-200 font-medium">{item.hiloBCP}</span>
                                  <span className="text-zinc-400">/</span>
                                  <span className="text-zinc-300">{item.target?.gloHilo ?? 0}</span>
                                  <Edit3 className="w-3 h-3 text-zinc-500" />
                                </div>
                              )}
                            </TableCell>

                            {/* Hilo+ BCP / Target */}
                            <TableCell className="text-sm">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={editingValues.targetHiloPlus}
                                    onChange={(e) => setEditingValues(prev => ({ ...prev, targetHiloPlus: Number(e.target.value) }))}
                                    className="w-20 h-8 bg-zinc-700 border-zinc-600 text-white text-center"
                                    disabled={operationLoading}
                                  />
                                  <span className="text-zinc-400">/</span>
                                  <span className="text-zinc-300">{item.target?.gloHiloPlus ?? 0}</span>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-600/20 p-1 rounded"
                                  onClick={() => {
                                    setEditingRow(item.idBrandmaster);
                                    setEditingValues({
                                      targetHilo: item.target?.gloHilo ?? 0,
                                      targetHiloPlus: item.target?.gloHiloPlus ?? 0,
                                      targetVelo: item.target?.velo ?? 0,
                                    });
                                  }}
                                >
                                  <span className="text-zinc-200 font-medium">{item.hiloPlusBCP}</span>
                                  <span className="text-zinc-400">/</span>
                                  <span className="text-zinc-300">{item.target?.gloHiloPlus ?? 0}</span>
                                  <Edit3 className="w-3 h-3 text-zinc-500" />
                                </div>
                              )}
                            </TableCell>

                            {/* Velo BCP / Target */}
                            <TableCell className="text-sm">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={editingValues.targetVelo}
                                    onChange={(e) => setEditingValues(prev => ({ ...prev, targetVelo: Number(e.target.value) }))}
                                    className="w-20 h-8 bg-zinc-700 border-zinc-600 text-white text-center"
                                    disabled={operationLoading}
                                  />
                                  <span className="text-zinc-400">/</span>
                                  <span className="text-zinc-300">{item.target?.velo ?? 0}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      className="h-6 w-6 p-0 bg-green-600 hover:bg-green-500"
                                      onClick={() => handleEditTarget(item.idBrandmaster)}
                                      disabled={operationLoading}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-6 w-6 p-0 bg-red-600 hover:bg-red-500"
                                      onClick={() => setEditingRow(null)}
                                      disabled={operationLoading}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-600/20 p-1 rounded"
                                  onClick={() => {
                                    setEditingRow(item.idBrandmaster);
                                    setEditingValues({
                                      targetHilo: item.target?.gloHilo ?? 0,
                                      targetHiloPlus: item.target?.gloHiloPlus ?? 0,
                                      targetVelo: item.target?.velo ?? 0,
                                    });
                                  }}
                                >
                                  <span className="text-zinc-200 font-medium">{item.veloBCP}</span>
                                  <span className="text-zinc-400">/</span>
                                  <span className="text-zinc-300">{item.target?.velo ?? 0}</span>
                                  <Edit3 className="w-3 h-3 text-zinc-500" />
                                </div>
                              )}
                            </TableCell>
                          </motion.tr>
                        );
                      }) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-zinc-400">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="w-8 h-8" />
                              <p className="text-lg font-medium">
                                {searchQuery ? "Nie znaleziono wyników" : "Brak danych"}
                              </p>
                              <p className="text-sm">
                                {searchQuery ? "Spróbuj zmienić kryteria wyszukiwania" : "Nie ma jeszcze żadnych brandmasterów"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination - Only show if there are items */}
              {filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-zinc-700/50">
                  <div className="text-sm text-zinc-400">
                    Strona <span className="text-white font-medium">{safePage}</span> z{" "}
                    <span className="text-white font-medium">{totalPages}</span>
                    <span className="ml-2">
                      • {startIndex + 1}-{endIndex} z {filteredData.length} wyników
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={safePage === 1}
                      onClick={() => setPage(Math.max(1, safePage - 1))}
                      className="h-8 px-3 bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      Poprzednia
                    </Button>
                    
                    {/* Page numbers - Only show if more than 1 page */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        {(() => {
                          // Generate unique page numbers to avoid duplicate keys
                          const pagesToShow = Math.min(5, totalPages);
                          const startPage = Math.max(1, safePage - Math.floor(pagesToShow / 2));
                          const endPage = Math.min(totalPages, startPage + pagesToShow - 1);
                          const actualStartPage = Math.max(1, endPage - pagesToShow + 1);
                          
                          const pageNumbers = [];
                          for (let i = actualStartPage; i <= endPage; i++) {
                            pageNumbers.push(i);
                          }
                          
                          return pageNumbers.map((pageNum, index) => (
                            <Button
                              key={`page-${pageNum}-${index}`} // Unique key combining page number and index
                              variant={pageNum === safePage ? "default" : "outline"}
                              onClick={() => setPage(pageNum)}
                              className={cn(
                                "h-8 w-8 p-0 text-sm",
                                pageNum === safePage 
                                  ? "bg-blue-600 text-white" 
                                  : "bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                              )}
                            >
                              {pageNum}
                            </Button>
                          ));
                        })()}
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      disabled={safePage === totalPages}
                      onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                      className="h-8 px-3 bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      Następna
                    </Button>
                  </div>
                </div>
              )}

              {/* No results message */}
              {filteredData.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-zinc-400 mb-2">
                    {searchQuery ? (
                      <>
                        <Search className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-lg font-medium">Nie znaleziono wyników</p>
                        <p className="text-sm">Spróbuj zmienić kryteria wyszukiwania</p>
                      </>
                    ) : (
                      <>
                        <Users className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-lg font-medium">Brak brandmasterów</p>
                        <p className="text-sm">Nie ma jeszcze żadnych brandmasterów w zespole</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
}
