// file: components/DatePickerInput.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DatePickerInput({
  value,
  onChange,
  busyDates = []
}: {
  value: Date | undefined;
  onChange: (date: Date) => void;
  busyDates?: Date[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-all",
            !value && "text-gray-400"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
          {value ? (
            <span className="text-white">{format(value, "PPP", { locale: pl })}</span>
          ) : (
            <span className="text-gray-400">Wybierz datę</span>
          )}
        </Button>
      </PopoverTrigger>

      {/* Ensure popover content has high z-index so it sits above the map */}
      <PopoverContent
        className="w-auto p-0 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 text-zinc-100"
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
          locale={pl}
          className="p-3"
          classNames={{
            day_selected: "bg-purple-600 text-white hover:bg-purple-600 hover:text-white focus:bg-purple-600 focus:text-white",
            day_today: "bg-zinc-800 text-zinc-100",
            day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-zinc-800 rounded-md transition-colors text-center text-sm text-zinc-100",
            head_cell: "text-zinc-400 rounded-md w-8 font-normal text-[0.8rem]",
            caption: "flex justify-center pt-1 relative items-center mb-2 text-zinc-100",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-zinc-800 rounded-md transition-all text-zinc-100",
            table: "w-full border-collapse space-y-1",
          }}
          modifiers={{
            booked: busyDates
          }}
          modifiersClassNames={{
            booked: "border border-purple-500/50 bg-purple-500/10 text-purple-200 font-medium"
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
