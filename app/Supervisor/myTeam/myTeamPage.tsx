// app/brandmasters/page.tsx
"use client"

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { myBms } from "@/types/myBms"
import { apiFetch } from "@/utils/apiFetch"
import { toast } from "sonner"
import ContextMenu from "@/components/contextMenu"
import DarkLoadingPage from "@/components/LoadingScreen"
import ErrorBoundary from "@/components/ErrorBoundary"
import { motion, AnimatePresence } from "framer-motion"
import { Search, UserPlus, Users, CheckCircle, XCircle } from "lucide-react"

// API Response type for the actual JSON structure
interface ApiBrandmasterResponse {
  idBrandmaster: number;
  imie: string;
  nazwisko: string;
  logicAccount: string;
  idTourplanner: string;
}

// API Response type for available brandmasters from CAS
interface AvailableBrandmaster {
  idTourplanner: string;
  firstName: string;
  lastName: string;
  ident: string;
}

export default function MyTeamPage() {
  const [data, setData] = useState<myBms[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [operationLoading, setOperationLoading] = useState(false)
  
  // New state for available brandmasters dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [availableBms, setAvailableBms] = useState<AvailableBrandmaster[]>([])
  const [availableBmsLoading, setAvailableBmsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Refs for cleanup
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [newBrandmaster, setNewBrandmaster] = useState<Omit<myBms, "brandmasterId">>({
    brandmasterName: "",
    brandmasterLast: "",
    brandmasterLogin: "",
    tourplannerId: null,
  })

  const menuRef = useRef<HTMLDivElement | null>(null)
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), [])

  // Helper function to map API response to myBms format
  const mapApiResponseToMyBms = useCallback((apiData: ApiBrandmasterResponse[]): myBms[] => {
    return apiData.map((item) => ({
      brandmasterId: item.idBrandmaster,
      brandmasterName: item.imie,
      brandmasterLast: item.nazwisko,
      brandmasterLogin: item.logicAccount,
      tourplannerId: item.idTourplanner || null,
    }))
  }, [])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.length / pageSize)),
    [data.length, pageSize]
  )

  const visibleData = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return data.slice(startIndex, startIndex + pageSize)
  }, [data, page, pageSize])

  // Filtered available brandmasters based on search
  const filteredAvailableBms = useMemo(() => {
    if (!searchQuery.trim()) return availableBms;
    
    const query = searchQuery.toLowerCase().trim();
    return availableBms.filter(bm => {
      const firstName = bm?.firstName?.toLowerCase() || '';
      const lastName = bm?.lastName?.toLowerCase() || '';
      const ident = bm?.ident?.toLowerCase() || '';
      
      return firstName.includes(query) || 
             lastName.includes(query) ||
             ident.includes(query);
    });
  }, [availableBms, searchQuery]);

  // Check if a brandmaster already exists in the current team
  const isExisting = useCallback((bm: AvailableBrandmaster) => {
    return data.some(d => 
      d.tourplannerId === bm.idTourplanner || 
      d.brandmasterLogin === bm.ident
    );
  }, [data]);

  // Fetch Data with proper error handling and timeout
  useEffect(() => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    mountedRef.current = true
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      let timeoutId: NodeJS.Timeout | null = null
      
      try {
        // Set timeout for the request
        timeoutId = setTimeout(() => {
          controller.abort()
        }, 10000) // 10 seconds timeout

        const res = await apiFetch<ApiBrandmasterResponse[]>("/api/sv/myBms", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        })

        if (timeoutId) clearTimeout(timeoutId)

        // Validate response
        if (!Array.isArray(res)) {
          throw new Error('Invalid response format: expected array')
        }

        // Map API response to expected format
        const mappedData = mapApiResponseToMyBms(res)

        if (mountedRef.current && !controller.signal.aborted) {
          setData(mappedData)
          setError(null)
        }
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId)
        
        if (!mountedRef.current || controller.signal.aborted) return

        let errorMessage = 'Failed to load team data'
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.warn('Request was aborted')
            return
          }
          errorMessage = err.message
        }

        console.error('Failed to load data:', err)
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        if (mountedRef.current && !controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mountedRef.current = false
      controller.abort()
    }
  }, [mapApiResponseToMyBms])

  // Fetch available brandmasters when dialog opens
  const fetchAvailableBrandmasters = useCallback(async () => {
    setAvailableBmsLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await apiFetch<AvailableBrandmaster[]>("/api/sv/bmsFromCas", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!Array.isArray(res)) {
        throw new Error('Invalid response format: expected array');
      }

      setAvailableBms(res);
    } catch (error: unknown) {
      let errorMessage = "Nie udało się pobrać listy brandmasterów.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Operacja została przerwana z powodu przekroczenia czasu.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setAvailableBmsLoading(false);
    }
  }, []);

  // Open dialog and fetch available brandmasters
  const handleOpenAddDialog = useCallback(() => {
    setAddDialogOpen(true);
    setSearchQuery("");
    fetchAvailableBrandmasters();
  }, [fetchAvailableBrandmasters]);

  // Add brandmaster from available list
  const handleAddFromList = useCallback(async (bm: AvailableBrandmaster) => {
    if (operationLoading) return;

    // Check if already exists
    if (isExisting(bm)) {
      toast.warning("Ten brandmaster już istnieje w zespole.");
      return;
    }

    setOperationLoading(true);

    const newBm = {
      brandmasterName: bm.firstName,
      brandmasterLast: bm.lastName,
      brandmasterLogin: bm.ident,
      tourplannerId: bm.idTourplanner,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await apiFetch<{ message: string }>("/api/sv/createBm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBm),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      toast.success(res?.message || "Brandmaster został dodany pomyślnie.");
      
      // Refresh data by reloading
      window.location.reload();
    } catch (error: unknown) {
      let errorMessage = "Nie udało się dodać brandmastera.";
      
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
  }, [operationLoading, isExisting]);

  // Add Brandmaster with proper validation and error handling
  const handleAdd = useCallback(async () => {
    if (operationLoading) return // Prevent multiple simultaneous operations

    // Validate input
    const name = newBrandmaster.brandmasterName.trim()
    const login = newBrandmaster.brandmasterLogin.trim()
    
    if (!name || !login) {
      toast.warning("Proszę wypełnić wymagane pola (Imię i Login).")
      return
    }

    // Check for duplicate login
    if (data.some(d => d.brandmasterLogin.toLowerCase() === login.toLowerCase())) {
      toast.error("Brandmaster z tym loginem już istnieje.")
      return
    }

    setOperationLoading(true)

    const id = (data.length > 0 ? Math.max(...data.map((d) => d.brandmasterId)) : 0) + 1
    const optimistic = { ...newBrandmaster, brandmasterId: id }
    
    // Optimistic update
    setData((prev) => [...prev, optimistic])

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const res = await apiFetch<{ message: string }>("/api/sv/createBm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBrandmaster),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      toast.success(res?.message || "Brandmaster został dodany pomyślnie.")
    } catch (error: unknown) {
      // Revert optimistic update
      setData((prev) => prev.filter((d) => d.brandmasterId !== id))
      
      let errorMessage = "Nie udało się dodać brandmastera."
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Operacja została przerwana z powodu przekroczenia czasu."
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setOperationLoading(false)
      setNewBrandmaster({
        brandmasterName: "",
        brandmasterLast: "",
        brandmasterLogin: "",
        tourplannerId: null,
      })
      setOpen(false)
    }
  }, [data, newBrandmaster, operationLoading])

  // Delete Brandmasters with proper error handling
  const handleDelete = useCallback(async () => {
    if (selected.length === 0 || operationLoading) return

    setOperationLoading(true)
    const toDelete = [...selected]
    setSelected([])

    // Store original data for rollback
    const originalData = [...data]
    const remaining = data.filter((d) => !toDelete.includes(d.brandmasterId))
    setData(remaining)

    const failedDeletions: number[] = []

    for (const bmId of toDelete) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const res = await apiFetch<{ message: string }>("/api/sv/delBm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idBrandmaster: bmId }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        toast.success(res?.message || `Brandmaster ${bmId} został usunięty.`)
      } catch (error: unknown) {
        failedDeletions.push(bmId)
        
        let errorMessage = `Nie udało się usunąć brandmastera ${bmId}.`
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = `Operacja usuwania brandmastera ${bmId} została przerwana.`
          } else {
            errorMessage = error.message
          }
        }
        
        toast.error(errorMessage)
      }
    }

    // Rollback failed deletions
    if (failedDeletions.length > 0) {
      const restoredData = originalData.filter(d => failedDeletions.includes(d.brandmasterId))
      setData(prev => [...prev, ...restoredData])
      setSelected(failedDeletions)
    }

    setOperationLoading(false)
  }, [data, selected, operationLoading])

  if (loading) return <DarkLoadingPage />

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-200 p-6 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold text-red-400">Błąd ładowania danych</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      {/* Floating Menu */}
      <div
        ref={menuRef}
        className="fixed top-4 right-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-controls="team-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          type="button"
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="team-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />
          </div>
        )}
      </div>

      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-200 p-3 sm:p-6 flex items-center justify-center">
        <Card className="w-full max-w-6xl bg-neutral-950 border border-neutral-900/70 rounded-xl sm:rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
          <CardHeader className="border-b border-neutral-900 pb-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight text-gray-100">
                Brandmasters
              </CardTitle>
              <div className="text-xs text-neutral-500 uppercase tracking-wide">
                Management Panel
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="flex flex-wrap gap-2">
                {/* New Dialog for selecting from available brandmasters */}
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={handleOpenAddDialog}
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm border border-blue-700 flex-1 sm:flex-initial"
                    >
                      <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Dodaj
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-xl border border-zinc-700/50 text-gray-100 p-4 sm:p-6 rounded-xl w-[95vw] sm:w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-xl font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        Dostępni Brandmasterzy
                      </DialogTitle>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Wybierz brandmastera z listy, aby dodać do zespołu
                      </p>
                    </DialogHeader>

                    <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                        <Input
                          placeholder="Szukaj..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 sm:pl-10 h-9 text-sm bg-zinc-800/50 border-zinc-600 text-white placeholder-zinc-400 focus:border-blue-500"
                        />
                      </div>

                      {/* List of available brandmasters */}
                      <div className="overflow-x-auto overflow-y-auto max-h-[50vh] sm:max-h-96 border border-zinc-700/50 rounded-lg bg-zinc-800/20">
                        {availableBmsLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          </div>
                        ) : filteredAvailableBms.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                            <Users className="w-12 h-12 mb-2" />
                            <p className="text-lg font-medium">
                              {searchQuery ? "Nie znaleziono wyników" : "Brak dostępnych brandmasterów"}
                            </p>
                            <p className="text-sm">
                              {searchQuery ? "Spróbuj zmienić kryteria wyszukiwania" : ""}
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-zinc-800/50 border-b border-zinc-700/50">
                                <TableHead className="text-zinc-300 text-[10px] sm:text-xs uppercase font-semibold px-2">Imię</TableHead>
                                <TableHead className="text-zinc-300 text-[10px] sm:text-xs uppercase font-semibold px-2">Nazwisko</TableHead>
                                <TableHead className="text-zinc-300 text-[10px] sm:text-xs uppercase font-semibold px-2 hidden sm:table-cell">Identyfikator</TableHead>
                                <TableHead className="text-zinc-300 text-[10px] sm:text-xs uppercase font-semibold px-2 hidden md:table-cell">Status</TableHead>
                                <TableHead className="text-zinc-300 text-[10px] sm:text-xs uppercase font-semibold px-2">Akcja</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <AnimatePresence>
                                {filteredAvailableBms.map((bm, index) => {
                                  const exists = isExisting(bm);
                                  return (
                                    <motion.tr
                                      key={bm.idTourplanner}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -20 }}
                                      transition={{ duration: 0.2, delay: index * 0.03 }}
                                      className={cn(
                                        "transition-all duration-200 hover:bg-zinc-700/30 border-b border-zinc-700/30",
                                        exists && "bg-green-900/20"
                                      )}
                                    >
                                      <TableCell className="text-zinc-200 text-xs sm:text-sm px-2">{bm.firstName}</TableCell>
                                      <TableCell className="text-zinc-200 text-xs sm:text-sm px-2">{bm.lastName}</TableCell>
                                      <TableCell className="text-blue-400 text-xs sm:text-sm font-mono px-2 hidden sm:table-cell">{bm.ident}</TableCell>
                                      <TableCell className="text-xs sm:text-sm px-2 hidden md:table-cell">
                                        {exists ? (
                                          <span className="flex items-center gap-1 text-green-400">
                                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            <span className="hidden lg:inline">W zespole</span>
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1 text-zinc-400">
                                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            <span className="hidden lg:inline">Dostępny</span>
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="px-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleAddFromList(bm)}
                                          disabled={exists || operationLoading}
                                          className={cn(
                                            "h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs whitespace-nowrap",
                                            exists 
                                              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed" 
                                              : "bg-blue-600 hover:bg-blue-500 text-white"
                                          )}
                                        >
                                          {operationLoading ? "..." : exists ? (
                                            <CheckCircle className="w-3 h-3 sm:hidden" />
                                          ) : (
                                            <span className="sm:hidden">+</span>
                                          )}
                                          <span className="hidden sm:inline">{operationLoading ? "Dodawanie..." : exists ? "W zespole" : "Dodaj"}</span>
                                        </Button>
                                      </TableCell>
                                    </motion.tr>
                                  );
                                })}
                              </AnimatePresence>
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={selected.length === 0 || operationLoading}
                  className="h-8 px-3 text-xs sm:text-sm bg-red-700 hover:bg-red-600 border border-red-800 disabled:opacity-50 flex-1 sm:flex-initial"
                  aria-label={`Usuń ${selected.length} wybranych brandmasterów`}
                >
                  {operationLoading ? "Usuwanie..." : `Usuń (${selected.length})`}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Label className="text-gray-400">Rows:</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(Number(val))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-8 w-16 sm:w-20 bg-neutral-900 border-neutral-800 text-gray-200 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950 border-neutral-800 text-gray-200">
                    {[5, 10, 20, 50].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-neutral-900 rounded-lg sm:rounded-xl" role="region" aria-label="Lista brandmasterów">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-950/80">
                    <TableHead className="w-8 px-2 sm:px-3" aria-label="Zaznacz wszystkie">
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={selected.length === data.length && data.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelected(data.map(d => d.brandmasterId))
                          } else {
                            setSelected([])
                          }
                        }}
                        aria-label="Zaznacz wszystkie brandmastery"
                      />
                    </TableHead>
                    <TableHead className="text-gray-400 text-[10px] sm:text-xs uppercase px-2 sm:px-3 hidden sm:table-cell">ID</TableHead>
                    <TableHead className="text-gray-400 text-[10px] sm:text-xs uppercase px-2 sm:px-3">Imię</TableHead>
                    <TableHead className="text-gray-400 text-[10px] sm:text-xs uppercase px-2 sm:px-3 hidden md:table-cell">Nazwisko</TableHead>
                    <TableHead className="text-gray-400 text-[10px] sm:text-xs uppercase px-2 sm:px-3">Login</TableHead>
                    <TableHead className="text-gray-400 text-[10px] sm:text-xs uppercase px-2 sm:px-3 hidden lg:table-cell">Tourplanner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm">
                        Brak brandmasterów do wyświetlenia
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleData.map((item) => (
                      <TableRow
                        key={item.brandmasterId}
                        className={cn(
                          "transition-colors hover:bg-zinc-900 border-b border-neutral-900/60",
                          item.tourplannerId === null && "bg-red-950/30"
                        )}
                        aria-label={`Brandmaster ${item.brandmasterName} ${item.brandmasterLast}`}
                      >
                        <TableCell className="px-2 sm:px-3">
                          <input
                            type="checkbox"
                            className="accent-blue-600"
                            checked={selected.includes(item.brandmasterId)}
                            onChange={(e) =>
                              setSelected((prev) =>
                                e.target.checked
                                  ? [...prev, item.brandmasterId]
                                  : prev.filter((id) => id !== item.brandmasterId)
                              )
                            }
                            aria-label={`Zaznacz ${item.brandmasterName} ${item.brandmasterLast}`}
                          />
                        </TableCell>
                        <TableCell className="text-gray-400 text-xs sm:text-sm px-2 sm:px-3 hidden sm:table-cell">{item.brandmasterId}</TableCell>
                        <TableCell className="text-gray-400 text-xs sm:text-sm px-2 sm:px-3">{item.brandmasterName}</TableCell>
                        <TableCell className="text-gray-400 text-xs sm:text-sm px-2 sm:px-3 hidden md:table-cell">{item.brandmasterLast}</TableCell>
                        <TableCell className="text-xs sm:text-sm font-mono text-blue-500 px-2 sm:px-3">
                          {item.brandmasterLogin}
                        </TableCell>
                        <TableCell className="text-gray-400 text-xs sm:text-sm px-2 sm:px-3 hidden lg:table-cell">
                          {item.tourplannerId ?? <span className="text-neutral-600">—</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400">
              <span className="text-center sm:text-left">
                Page <span className="text-gray-200">{page}</span> /{" "}
                <span className="text-gray-200">{totalPages}</span>
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 bg-neutral-900 border-neutral-800 text-gray-300 hover:bg-neutral-800 text-xs sm:text-sm flex-1 sm:flex-initial"
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 bg-neutral-900 border-neutral-800 text-gray-300 hover:bg-neutral-800 text-xs sm:text-sm flex-1 sm:flex-initial"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
