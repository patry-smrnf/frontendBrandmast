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

// API Response type for the actual JSON structure
interface ApiBrandmasterResponse {
  idBrandmaster: number;
  imie: string;
  nazwisko: string;
  logicAccount: string;
  idTourplanner: string;
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

      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-200 p-6 flex items-center justify-center">
        <Card className="w-full max-w-6xl bg-neutral-950 border border-neutral-900/70 rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
          <CardHeader className="border-b border-neutral-900 pb-3 flex justify-between items-center">
            <CardTitle className="text-xl font-semibold tracking-tight text-gray-100">
              Brandmasters
            </CardTitle>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">
              Management Panel
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-2">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-8 px-3 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-sm border border-neutral-700">
                      + Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-neutral-950 border border-neutral-800 text-gray-100 p-6 rounded-xl max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold">Add Brandmaster</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-3 mt-4">
                      {[
                        { label: "Name", key: "brandmasterName" },
                        { label: "Last", key: "brandmasterLast" },
                        { label: "Login", key: "brandmasterLogin" },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <Label className="text-xs text-gray-400">{label}</Label>
                          <Input
                            className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                            value={(newBrandmaster as any)[key]}
                            onChange={(e) =>
                              setNewBrandmaster((p) => ({
                                ...p,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}

                      <div>
                        <Label className="text-xs text-gray-400">Tourplanner ID (optional)</Label>
                        <Input
                          className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                          value={newBrandmaster.tourplannerId ?? ""}
                          onChange={(e) =>
                            setNewBrandmaster((p) => ({
                              ...p,
                              tourplannerId: e.target.value || null,
                            }))
                          }
                        />
                      </div>

                      <Button
                        onClick={handleAdd}
                        disabled={!newBrandmaster.brandmasterName || !newBrandmaster.brandmasterLogin || operationLoading}
                        className="h-8 mt-1 bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
                        aria-label="Dodaj nowego brandmastera"
                      >
                        {operationLoading ? "Dodawanie..." : "Dodaj"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={selected.length === 0 || operationLoading}
                  className="h-8 px-3 text-sm bg-red-700 hover:bg-red-600 border border-red-800 disabled:opacity-50"
                  aria-label={`Usuń ${selected.length} wybranych brandmasterów`}
                >
                  {operationLoading ? "Usuwanie..." : `Usuń (${selected.length})`}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Label className="text-gray-400">Rows:</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(Number(val))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-8 w-20 bg-neutral-900 border-neutral-800 text-gray-200 text-sm">
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
            <div className="overflow-hidden border border-neutral-900 rounded-xl" role="region" aria-label="Lista brandmasterów">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-950/80">
                    <TableHead className="w-8" aria-label="Zaznacz wszystkie">
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
                    {["ID", "Imię", "Nazwisko", "Login", "Tourplanner"].map((h) => (
                      <TableHead key={h} className="text-gray-400 text-xs uppercase">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                        <TableCell className="px-3">
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
                        <TableCell className="text-gray-400 text-sm">{item.brandmasterId}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{item.brandmasterName}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{item.brandmasterLast}</TableCell>
                        <TableCell className="text-sm font-mono text-blue-500">
                          {item.brandmasterLogin}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {item.tourplannerId ?? <span className="text-neutral-600">—</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
              <span>
                Page <span className="text-gray-200">{page}</span> /{" "}
                <span className="text-gray-200">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 bg-neutral-900 border-neutral-800 text-gray-300 hover:bg-neutral-800"
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 bg-neutral-900 border-neutral-800 text-gray-300 hover:bg-neutral-800"
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
