"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ContextMenu from "@/components/contextMenu";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/app/config";

// Format for <input type="date"> (yyyy-MM-dd)
const formatDateForInput = (date: Date) => date.toISOString().split("T")[0];

// API expects ISO-like date (yyyy-MM-dd)

const ExcelGeneratorBoard: React.FC = () => {
  const today = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(today.getMonth() + 1);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const [startDate, setStartDate] = useState<string>(formatDateForInput(today));
  const [endDate, setEndDate] = useState<string>(formatDateForInput(oneMonthLater));
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Input validation
  const [dateErrors, setDateErrors] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  // Validate dates - memoized to prevent infinite loops
  const validateDates = useCallback(() => {
    const errors: { startDate?: string; endDate?: string } = {};
    
    if (!startDate) {
      errors.startDate = "Start date is required";
    }
    
    if (!endDate) {
      errors.endDate = "End date is required";
    }
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      errors.endDate = "End date must be after start date";
    }
    
    if (startDate && new Date(startDate) < new Date(today.toISOString().split('T')[0])) {
      errors.startDate = "Start date cannot be in the past";
    }
    
    return errors;
  }, [startDate, endDate, today]);

  // Auto-validate on date changes - only update if errors actually changed
  useEffect(() => {
    const newErrors = validateDates();
    setDateErrors(prevErrors => {
      const hasChanged = JSON.stringify(prevErrors) !== JSON.stringify(newErrors);
      return hasChanged ? newErrors : prevErrors;
    });
  }, [validateDates]);

  // Reset status after 5 seconds
  useEffect(() => {
    if (status === "ready" || status === "error") {
      const timer = setTimeout(() => {
        setStatus("idle");
        setErrorMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleGenerate = async () => {
    // Validate before proceeding
    const errors = validateDates();
    if (Object.keys(errors).length > 0) {
      setDateErrors(errors);
      setStatus("error");
      setErrorMessage("Please fix the date errors before generating the file");
      return;
    }

    setIsGenerating(true);
    setStatus("generating");
    setErrorMessage("");

    const fromParam = startDate; // yyyy-MM-dd
    const toParam = endDate;     // yyyy-MM-dd

    try {
      const params = new URLSearchParams({ startDate: fromParam, endDate: toParam });
      const response = await fetch(`${API_BASE_URL}/api/sv/export/actions.xlsx?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            // Helps some backends choose the right formatter
            Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream",
          },
        }
      );

      if (!response.ok) {
        // Optional: handle auth errors explicitly
        if (response.status === 401 || response.status === 403) {
          throw new Error("Not authorized to generate this file");
        }
        if (response.status === 400) {
          throw new Error("Invalid date range or parameters");
        }
        if (response.status >= 500) {
          throw new Error("Server error. Please try again later");
        }
        throw new Error(`Request failed: ${response.status}`);
      }

      const blob = await response.blob();

      // Validate blob size
      if (blob.size === 0) {
        throw new Error("Generated file is empty");
      }

      // Try to derive filename from Content-Disposition; fallback to a sensible default
      const disposition = response.headers.get("content-disposition") || "";
      let filename = `team_schedule_${fromParam}_to_${toParam}.xlsx`;
      const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
      if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1]);
        } catch {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus("ready");
    } catch (err) {
      console.error("File generation failed:", err);
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };


  const isFormValid = Object.keys(dateErrors).length === 0 && startDate && endDate;

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
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />
          </div>
        )}
      </div>

      {/* Main Container - Dark Modern Design */}
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Compact Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Excel Generator</h1>
            </div>
            <p className="text-zinc-400 text-sm">Generate team schedule reports</p>
          </div>

          {/* Compact Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm font-medium text-zinc-300">
                  Start Date
                </Label>
                <Input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full bg-zinc-800 border-zinc-700 text-white focus:border-blue-500 focus:ring-blue-500/20 ${
                    dateErrors.startDate ? 'border-red-500' : ''
                  }`}
                  aria-invalid={!!dateErrors.startDate}
                  aria-describedby={dateErrors.startDate ? "start-date-error" : undefined}
                />
                {dateErrors.startDate && (
                  <p id="start-date-error" className="text-xs text-red-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {dateErrors.startDate}
                  </p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm font-medium text-zinc-300">
                  End Date
                </Label>
                <Input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full bg-zinc-800 border-zinc-700 text-white focus:border-blue-500 focus:ring-blue-500/20 ${
                    dateErrors.endDate ? 'border-red-500' : ''
                  }`}
                  aria-invalid={!!dateErrors.endDate}
                  aria-describedby={dateErrors.endDate ? "end-date-error" : undefined}
                />
                {dateErrors.endDate && (
                  <p id="end-date-error" className="text-xs text-red-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {dateErrors.endDate}
                  </p>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !isFormValid}
              className={`w-full md:w-auto px-6 py-3 font-medium rounded-lg transition-all duration-200 ${
                isFormValid && !isGenerating
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generate Excel</span>
                </div>
              )}
            </Button>
          </div>

          {/* Compact Status Messages */}
          {status !== "idle" && (
            <div className={`p-4 rounded-lg border transition-all duration-300 ${
              status === "generating" 
                ? "bg-amber-900/20 border-amber-800 text-amber-300" 
                : status === "ready" 
                ? "bg-green-900/20 border-green-800 text-green-300" 
                : "bg-red-900/20 border-red-800 text-red-300"
            }`}>
              <div className="flex items-center gap-2">
                {status === "generating" && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {status === "ready" && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {status === "error" && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <div>
                  <p className="font-medium text-sm">
                    {status === "generating" && "Generating Excel file..."}
                    {status === "ready" && "File ready for download!"}
                    {status === "error" && "Generation failed"}
                  </p>
                  {status === "error" && errorMessage && (
                    <p className="text-xs mt-1 opacity-80">{errorMessage}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ExcelGeneratorBoard;