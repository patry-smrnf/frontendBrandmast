"use client";

import React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TimeInputs({time1, time2, onTime1Change, onTime2Change, time1Name, time2Name}: { time1: string; time2: string; time1Name?: string; time2Name?: string; onTime1Change: (val: string) => void; onTime2Change: (val: string) => void; }) {

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <Label htmlFor="startTime" className="mb-2 text-gray-300 text-sm font-medium">
                            {time1Name ? time1Name : "Start"}
                        </Label>
                        <Input
                            id="startTime"
                            type="text"
                            placeholder="e.g. 12:00"
                            value={time1}
                            onChange={(e) => onTime1Change(e.target.value)}
                            className="bg-zinc-800/50 text-white border-zinc-700 placeholder-gray-400
                            focus:border-green-500 focus:ring-green-500/20 focus:ring-2 transition-all"
                        />
                    </div>
                    <div className="flex-1">
                        <Label htmlFor="stopTime" className="mb-2 text-gray-300 text-sm font-medium">
                            {time2Name ? time2Name : "Stop"}
                        </Label>
                        <Input
                            id="stopTime"
                            type="text"
                            placeholder="e.g. 12:00"
                            value={time2}
                            onChange={(e) => onTime2Change(e.target.value)}
                            className="bg-zinc-800/50 text-white border-zinc-700 placeholder-gray-400
                            focus:border-green-500 focus:ring-green-500/20 focus:ring-2 transition-all"
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

