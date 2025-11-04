// file: components/DatePickerInput.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function DatePickerInput({ value, onChange }: { value: Date | undefined; onChange: (date: Date) => void; }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal ${value ? "text-white" : "text-gray-400"} bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-all`}
        >
          {value ? format(value, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>

      {/* Ensure popover content has high z-index so it sits above the map */}
      <PopoverContent
        className="w-auto p-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-50"
        align="start"
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            if (date) {
              onChange(date);
              setOpen(false);
            }
          }}
          initialFocus
          className="bg-gray-900 text-white"
        />
      </PopoverContent>
    </Popover>
  );
}
