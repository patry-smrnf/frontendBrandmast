// file: components/AddressInput.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AllShopsResponse } from "@/types/apiStuff/responses/AllShopsResponse";
import { toast } from "sonner";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

type AddressInputProps = {
  value: string;
  onChange: (newValue: string) => void;
  shopsResponse?: AllShopsResponse[];
  onChangeID: (newValue: number) => void;
};

export default function AddressInput({ value, onChange, shopsResponse = [], onChangeID }: AddressInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const normalizeString = useCallback((s: string | undefined | null) => {
    if (!s) return "";
    try {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    } catch {
      return String(s).toLowerCase();
    }
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!value) return [];
    const needle = normalizeString(value);
    return shopsResponse
      .filter((shop) => normalizeString(shop.address).includes(needle) || normalizeString(shop.event.name).includes(needle))
      .slice(0, 8);
  }, [shopsResponse, value, normalizeString]);

  useEffect(() => console.log(shopsResponse))

  return (
    <div className="relative w-full">
      <div className="mb-6">
        <MapPicker
          shops={shopsResponse}
          selectedAddress={value}
          onSelect={(selectedAddress) => {
            onChange(selectedAddress);
            setShowSuggestions(false);
          }}
        />
      </div>

      <Label htmlFor="address" className="mb-1 text-gray-300">
        Address
      </Label>

      <Input
        id="address"
        type="text"
        placeholder="Address"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // allow click selection before hiding
          setTimeout(() => setShowSuggestions(false), 150);
        }}
        className="bg-zinc-700 text-white border-zinc-600 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
        aria-autocomplete="list"
        aria-controls="address-suggestions"
        aria-expanded={showSuggestions}
        aria-label="Shop address"
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          id="address-suggestions"
          role="listbox"
          className="absolute z-40 mt-1 w-full bg-zinc-800 border border-zinc-600 rounded-md shadow-lg max-h-64 overflow-auto"
        >
          {filteredSuggestions.map((shop) => (
            <div
              key={shop.id}
              role="option"
              aria-selected={shop.address === value}
              className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-white text-sm"
              onMouseDown={(ev) => {
                // prevent blur selecting issues
                ev.preventDefault();
                if(shop.products) {
                  if (shop.products.hilo === 0) {
                    toast.warning(`Na ${shop.address} mozliwe ze nie ma urzadzen hilo`);
                  }
                  if (shop.products.hiloPlus === 0) {
                    toast.warning(`Na ${shop.address} mozliwe ze nie ma urzadzen hilo Plus`);
                  }
                  if (shop.products.packs === 0) {
                    toast.warning(`Na ${shop.address} mozliwe ze nie ma paczek`);
                  }
                }

                onChange(shop.address);
                onChangeID(shop.id);
                setShowSuggestions(false);
              }}
            >
              <div className="font-medium">{shop.event.name}, {shop.name}</div>
              <div className="text-xs text-zinc-300 truncate">{shop.address}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}