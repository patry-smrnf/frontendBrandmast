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
import { Search, MapPin, Store, Package, Upload, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react"


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
    </ErrorBoundary>
  );
}
