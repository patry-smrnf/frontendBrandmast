// app/supervisor/myshops/page.tsx
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
import { ShopsResponse, Shop, mapShopsToLegacy, LegacyShopRes } from "@/types/apiStuff/responses/ShopsResponse"
import { apiFetch } from "@/utils/apiFetch"
import { toast } from "sonner"
import { messageRes } from "@/types/MessageRes"
import ContextMenu from "@/components/contextMenu"
import DarkLoadingPage from "@/components/LoadingScreen"
import ErrorBoundary from "@/components/ErrorBoundary"
import { motion, AnimatePresence } from "framer-motion"
import { Search, MapPin, Store, Package, Upload, Trash2, AlertTriangle, CheckCircle, XCircle, Plus, ArrowLeft, Check } from "lucide-react"


export default function MyShopsPage() {
  // State management
  const [shopsData, setShopsData] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  
  // UI state
  const [selected, setSelected] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  
  // File upload
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Events dialog state
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false)
  const [events, setEvents] = useState<Array<{ idEvent: number; name: string; tpEventId: string }>>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  
  // Shops for selected event
  interface EventShop {
    streetAddress: string
    geoLat: string
    geoLng: string
    tpIdent: string
    tpShopId: string
    name: string
    eventId: string
  }
  const [selectedEvent, setSelectedEvent] = useState<{ tpEventId: string; name: string } | null>(null)
  const [eventShops, setEventShops] = useState<EventShop[]>([])
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set())
  const [shopsLoading, setShopsLoading] = useState(false)

  // Refs for cleanup
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), [])


  // Filtered and paginated data with safety checks
  const filteredData = useMemo(() => {
    // Safety check: ensure shopsData is an array
    if (!Array.isArray(shopsData) || shopsData.length === 0) {
      return [];
    }
    
    if (!searchQuery.trim()) return shopsData;
    
    const query = searchQuery.toLowerCase().trim();
    return shopsData.filter(shop => {
      // Safety checks for each field
      const address = shop?.address?.toLowerCase() || '';
      const name = shop?.name?.toLowerCase() || '';
      const eventName = shop?.event?.name?.toLowerCase() || '';
      
      return address.includes(query) || 
             name.includes(query) ||
             eventName.includes(query);
    });
  }, [shopsData, searchQuery]);

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

        const res = await apiFetch<ShopsResponse>('/api/general/allShops', {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        // Validate response
        if (!Array.isArray(res)) {
          throw new Error('Invalid response format: expected shops array');
        }

        if (mountedRef.current && !controller.signal.aborted) {
          setShopsData(res);
          setError(null);
        }
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!mountedRef.current || controller.signal.aborted) return;

        let errorMessage = 'Nie udało się załadować danych sklepów';
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.warn('Request was aborted');
            return;
          }
          errorMessage = err.message;
        }

        console.error('Failed to load shops:', err);
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


  // Handle file upload with proper error handling
  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Fetch events from backend
  const handleFetchEvents = useCallback(async () => {
    setEventsDialogOpen(true)
    setEventsLoading(true)
    setEvents([])

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const res = await apiFetch<Array<{ idEvent: number; name: string; tpEventId: string }>>('/api/general/allEvents', {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!Array.isArray(res)) {
        throw new Error('Invalid response format: expected events array')
      }

      setEvents(res)
    } catch (error: unknown) {
      let errorMessage = "Nie udało się załadować wydarzeń"
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Operacja została przerwana z powodu przekroczenia czasu"
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
      setEventsDialogOpen(false)
    } finally {
      setEventsLoading(false)
    }
  }, [])

  // Handle event card click - fetch shops for event
  const handleEventClick = useCallback(async (tpEventId: string, eventName: string) => {
    setSelectedEvent({ tpEventId, name: eventName })
    setShopsLoading(true)
    setEventShops([])
    setSelectedShops(new Set())

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const res = await apiFetch<EventShop[]>('/api/general/getShopsForEvent', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tpEventId }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!Array.isArray(res)) {
        throw new Error('Invalid response format: expected shops array')
      }

      // Check which shops are already added by comparing tpShopId
      const existingShopIds = new Set(shopsData.map(shop => shop.tpShopId))
      const allSelected = new Set<string>()
      
      res.forEach(shop => {
        // Default to checked (selected) unless already exists
        if (!existingShopIds.has(shop.tpShopId)) {
          allSelected.add(shop.tpShopId)
        }
      })

      setEventShops(res)
      setSelectedShops(allSelected)
    } catch (error: unknown) {
      let errorMessage = "Nie udało się załadować sklepów"
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Operacja została przerwana z powodu przekroczenia czasu"
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
      setSelectedEvent(null)
    } finally {
      setShopsLoading(false)
    }
  }, [shopsData])

  // Handle shop checkbox toggle
  const handleShopToggle = useCallback((tpShopId: string) => {
    setSelectedShops(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tpShopId)) {
        newSet.delete(tpShopId)
      } else {
        newSet.add(tpShopId)
      }
      return newSet
    })
  }, [])

  // Handle adding selected shops
  const handleAddSelectedShops = useCallback(async () => {
    if (selectedShops.size === 0 || !selectedEvent) {
      toast.error("Nie wybrano żadnych sklepów do dodania")
      return
    }

    setOperationLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      // Filter selected shops and format them correctly
      const shopsToAdd = eventShops
        .filter(shop => selectedShops.has(shop.tpShopId))
        .map(shop => ({
          streetAddress: shop.streetAddress,
          geoLat: shop.geoLat,
          geoLng: shop.geoLng,
          tpIdent: shop.tpIdent,
          tpShopId: shop.tpShopId,
          name: shop.name,
          eventId: selectedEvent.tpEventId
        }))
      
      const res = await apiFetch<messageRes>('/api/general/addShop', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shopsToAdd),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      toast.success(res?.message || `Dodano ${selectedShops.size} sklepów pomyślnie`)
      
      // Close dialog and refresh data
      setEventsDialogOpen(false)
      setSelectedEvent(null)
      window.location.reload()
    } catch (error: unknown) {
      let errorMessage = "Nie udało się dodać sklepów"
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Operacja została przerwana z powodu przekroczenia czasu"
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setOperationLoading(false)
    }
  }, [selectedShops, selectedEvent, eventShops])

  const handleJsonUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Validate file type
    if (file.type !== "application/json") {
      toast.error("Plik musi być w formacie JSON");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Plik jest zbyt duży (maksymalnie 10MB)");
      return;
    }

    setOperationLoading(true);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('Nie udało się odczytać pliku');

        const parsed = JSON.parse(text);
        
        // Validate JSON structure
        if (!Array.isArray(parsed)) {
          throw new Error('JSON musi zawierać tablicę sklepów');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds for upload

        const res = await apiFetch<messageRes>('/api/general/addShopJson', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        toast.success(res?.message || "Sklepy zostały dodane pomyślnie");
        
        // Refresh data
        window.location.reload();
      } catch (error: unknown) {
        let errorMessage = "Nie udało się załadować pliku";
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = "Operacja została przerwana z powodu przekroczenia czasu";
          } else if (error.message.includes('JSON')) {
            errorMessage = `Błąd JSON: ${error.message}`;
          } else {
            errorMessage = error.message;
          }
        }
        
        toast.error(errorMessage);
      } finally {
        setOperationLoading(false);
        // Reset file input
        if (event.target) {
          event.target.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast.error("Nie udało się odczytać pliku");
      setOperationLoading(false);
    };

    reader.readAsText(file);
  }, []);

  // Handle shop deletion with proper error handling
  const handleDelete = useCallback(async () => {
    if (selected.length === 0) {
      toast.error("Nie wybrano żadnych sklepów do usunięcia");
      return;
    }

    setOperationLoading(true);

    // Store original data for rollback
    const originalData = [...shopsData];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Optimistic update
      setShopsData(prev => prev.filter(shop => !selected.includes(shop.id)));

      // API call for each selected shop
      const deletePromises = selected.map(shopId => 
        apiFetch<messageRes>('/api/general/deleteShop', {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: shopId }),
          signal: controller.signal,
        })
      );

      await Promise.all(deletePromises);
      clearTimeout(timeoutId);

      toast.success(`Usunięto ${selected.length} sklepów pomyślnie`);
      setSelected([]);
    } catch (error: unknown) {
      // Rollback optimistic update
      setShopsData(originalData);
      
      let errorMessage = "Nie udało się usunąć sklepów";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Operacja została przerwana z powodu przekroczenia czasu";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setOperationLoading(false);
    }
  }, [selected, shopsData]);

  // Loading and error states
  if (loading) return <DarkLoadingPage title="Ładowanie sklepów..." />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-6 py-10 flex flex-col items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <XCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold text-red-400">Błąd ładowania sklepów</h2>
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
          aria-controls="shops-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500" 
          type="button"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="shops-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />
          </div>
        )}
      </div>

      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-200 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
              <Store className="w-8 h-8" />
              Zarządzanie Sklepami
            </h1>
            <p className="text-zinc-400">
              Zarządzaj sklepami i ich produktami
            </p>
          </div>

          <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-zinc-700/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Lista Sklepów
                  </CardTitle>
                  <p className="text-sm text-zinc-400 mt-1">
                    {filteredData.length} sklepów • Strona {safePage} z {totalPages}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Szukaj po adresie, nazwie lub wydarzeniu..."
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 100) {
                          setSearchQuery(value);
                          setPage(1);
                        }
                      }}
                      className="pl-10 w-64 bg-zinc-800/50 border-zinc-600 text-white placeholder-zinc-400 focus:border-blue-500"
                      maxLength={100}
                    />
                  </div>

                  {/* Upload JSON Button */}
                  <Button 
                    onClick={handleButtonClick}
                    disabled={operationLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {operationLoading ? "Przesyłanie..." : "Dodaj JSON"}
                  </Button>

                  {/* Add Shops Button */}
                  <Button 
                    onClick={handleFetchEvents}
                    disabled={operationLoading || eventsLoading}
                    className="bg-green-600 hover:bg-green-500 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {eventsLoading ? "Ładowanie..." : "Dodaj Sklepy"}
                  </Button>

                  {/* Delete Selected Button */}
                  {selected.length > 0 && (
                    <Button 
                      onClick={handleDelete}
                      disabled={operationLoading}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Usuń ({selected.length})
                    </Button>
                  )}

                  {/* Hidden file input */}
                  <input 
                    type="file" 
                    accept=".json, application/json" 
                    ref={fileInputRef} 
                    onChange={handleJsonUpload} 
                    style={{ display: "none" }} 
                  />
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
                      if (newPageSize > 0 && newPageSize <= 100) {
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
                              setSelected(visibleData.map(item => item.id));
                            } else {
                              setSelected([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">ID</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Adres</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Nazwa</TableHead>
                      <TableHead className="text-zinc-300 text-xs uppercase font-semibold">Event</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {visibleData.length > 0 ? visibleData.map((item, index) => {
                        const isSelected = selected.includes(item.id);
                        const hasProducts = item.products !== null;

                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={cn(
                              "transition-all duration-200 hover:bg-zinc-700/30 border-b border-zinc-700/30",
                              isSelected && "bg-blue-500/10",
                              !hasProducts && "bg-zinc-900"
                            )}
                          >
                            <TableCell className="text-center">
                              <input 
                                type="checkbox" 
                                className="accent-blue-600"
                                checked={isSelected}
                                onChange={(e) => setSelected(prev => 
                                  e.target.checked 
                                    ? [...prev, item.id]
                                    : prev.filter(id => id !== item.id)
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-zinc-400 text-sm font-mono">{item.id}</TableCell>
                            <TableCell className="text-zinc-200 text-sm">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-zinc-500" />
                                <span className="truncate max-w-48" title={item.address}>
                                  {item.address}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-200 text-sm font-medium">{item.name}</TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-400 font-medium">{item.event.name}</span>
                                <span className="text-zinc-500 text-xs">#{item.event.id}</span>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      }) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-zinc-400">
                            <div className="flex flex-col items-center gap-2">
                              <Store className="w-8 h-8" />
                              <p className="text-lg font-medium">
                                {searchQuery ? "Nie znaleziono wyników" : "Brak danych"}
                              </p>
                              <p className="text-sm">
                                {searchQuery ? "Spróbuj zmienić kryteria wyszukiwania" : "Nie ma jeszcze żadnych sklepów"}
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
                              key={`page-${pageNum}-${index}`}
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
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Events Dialog */}
      <Dialog open={eventsDialogOpen} onOpenChange={(open) => {
        setEventsDialogOpen(open)
        if (!open) {
          setSelectedEvent(null)
          setEventShops([])
          setSelectedShops(new Set())
        }
      }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800/80 shadow-2xl p-2.5 sm:p-3">
          {selectedEvent ? (
            <>
              {/* Shops View */}
              <DialogHeader className="pb-1.5 border-b border-zinc-800/50 mb-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEvent(null)
                      setEventShops([])
                      setSelectedShops(new Set())
                    }}
                    className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Button>
                  <DialogTitle className="text-sm font-medium text-zinc-100 flex items-center gap-1.5 flex-1 truncate">
                    <Store className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="truncate">{selectedEvent.name}</span>
                  </DialogTitle>
                </div>
              </DialogHeader>

              {shopsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="text-xs text-zinc-500">Ładowanie...</div>
                </div>
              ) : eventShops.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
                  <Store className="w-6 h-6 mb-1.5 opacity-40" />
                  <p className="text-xs">Brak sklepów</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-[calc(90vh-140px)] overflow-y-auto pr-1">
                    <AnimatePresence>
                      {eventShops.map((shop, index) => {
                        const isSelected = selectedShops.has(shop.tpShopId)
                        const existingShopIds = new Set(shopsData.map(s => s.tpShopId))
                        const isAlreadyAdded = existingShopIds.has(shop.tpShopId)

                        return (
                          <motion.div
                            key={shop.tpShopId}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.15, delay: index * 0.01 }}
                          >
                            <div 
                              className={cn(
                                "bg-zinc-900/60 border border-zinc-800/60 rounded-md transition-all duration-150 hover:border-zinc-700/80",
                                isSelected && "border-blue-500/60 bg-blue-500/5",
                                isAlreadyAdded && "opacity-50"
                              )}
                            >
                              <div className="p-2">
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleShopToggle(shop.tpShopId)}
                                    disabled={isAlreadyAdded || operationLoading}
                                    className="mt-0.5 w-3.5 h-3.5 accent-blue-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-xs font-medium text-zinc-100 truncate">
                                        {shop.name}
                                      </span>
                                      {isAlreadyAdded && (
                                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0">
                                          <Check className="w-2.5 h-2.5" />
                                          <span>Dodany</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 space-y-0.5">
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span className="truncate">{shop.streetAddress}</span>
                                      </div>
                                      <div className="text-zinc-600 font-mono text-[9px]">
                                        {shop.tpShopId.slice(0, 12)}...
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>

                  {selectedShops.size > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-800/50 flex items-center justify-between gap-2">
                      <div className="text-xs text-zinc-400">
                        <span className="text-zinc-300 font-medium">{selectedShops.size}</span> wybranych
                      </div>
                      <Button
                        onClick={handleAddSelectedShops}
                        disabled={operationLoading}
                        size="sm"
                        className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                      >
                        <Plus className="w-3 h-3 mr-1.5" />
                        {operationLoading ? "Dodawanie..." : "Dodaj"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Events View */}
              <DialogHeader className="pb-1.5 border-b border-zinc-800/50 mb-2">
                <DialogTitle className="text-sm font-medium text-zinc-100 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-blue-400" />
                  Wydarzenia
                </DialogTitle>
              </DialogHeader>
              
              {eventsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="text-xs text-zinc-500">Ładowanie...</div>
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
                  <Store className="w-6 h-6 mb-1.5 opacity-40" />
                  <p className="text-xs">Brak wydarzeń</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[calc(90vh-100px)] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {events.map((event, index) => (
                      <motion.div
                        key={event.idEvent}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15, delay: index * 0.01 }}
                      >
                        <div 
                          className={cn(
                            "bg-zinc-900/60 border border-zinc-800/60 rounded-md cursor-pointer transition-all duration-150 hover:border-zinc-700/80 hover:bg-zinc-800/40 active:scale-[0.98]",
                            operationLoading && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => !operationLoading && handleEventClick(event.tpEventId, event.name)}
                        >
                          <div className="p-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Store className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                <span className="text-xs font-medium text-zinc-100 truncate">
                                  {event.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono flex-shrink-0">
                                #{event.idEvent}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
