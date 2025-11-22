import { apiFetch } from "@/utils/apiFetch";
import React from "react";
import { useRouter } from "next/navigation";

import {
  LogOut,
  BarChart2,
  PlusCircle,
  LayoutDashboard,
  Settings,
  MonitorCog ,
  Sheet,
  Users,
  Store,
  Crosshair,
  Info,
  Calendar,
  ClipboardClock 
} from "lucide-react"; // optional icons
import clsx from "clsx";


type ContextMenuProps = {
  closeMenu: () => void;
  type: string;
};

export default function ContextMenu({ closeMenu, type }: ContextMenuProps) {
    const router = useRouter();

      const menuItems =
        type === "BM"
        ? [ { label: "Dodaj Akcję", icon: PlusCircle, route: "/Brandmaster/actionDetails?newAction=true" },
            { label: "Statystyki", icon: BarChart2, route: "/Brandmaster/stats" },
            { label: "My Data", icon: Settings, route: "/Brandmaster/myData" },
            { label: "Helper", icon: Info, route: "/Brandmaster/helpMe" },
            { label: "Historia Logowania", icon: ClipboardClock, route: "/MyActivity" },
            { label: "Dashboard", icon: LayoutDashboard, route: "/" }
            ]
      : type === "SV"
      ? [
          { label: "Historia Logowania", icon: ClipboardClock, route: "/MyActivity" },
          { label: "Planer Akcji", icon: Calendar, route: "/Supervisor/actionPlanner" },
          { label: "Zarządzaj Shops", icon: Store, route: "/Supervisor/myShops" },
          { label: "Zarządzaj Targets", icon: Crosshair, route: "/Supervisor/myTargets" },
          { label: "Zarządzaj BM", icon: Users, route: "/Supervisor/myTeam" },
          { label: "Excel Dyspo", icon: Sheet , route: "/Supervisor/excelGenerator" },
          { label: "Panel CAS", icon: MonitorCog, route: "/Supervisor/tpDashboard" },
          { label: "Dashboard", icon: LayoutDashboard, route: "/" },
        ]
      : [
          // USER fallback
          { label: "Dashboard", icon: LayoutDashboard, route: "/" },
        ];

    const handleLogout = async () => {
        try {
            const res = apiFetch(`/api/auth/logout`, {
                method: "GET"
            })
        } catch (err) {
        console.error("Logout failed:", err);
        }
        router.push("/Login");
    };

  return (
    <div className="relative mt-2 w-52 bg-white rounded-xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
      <div className="flex flex-col divide-y divide-gray-200">
        {menuItems.map(({ label, icon: Icon, route }, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (route) {
                router.push(route);
              }
              closeMenu();
            }}
            className={clsx(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700",
              "hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white",
              "transition-colors duration-200 ease-in-out"
            )}
          >
            <Icon className="w-4 h-4 opacity-80" />
            {label}
          </button>
        ))}

        <button
          onClick={() => {
            handleLogout();
            closeMenu();
          }}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors duration-200"
        >
          <LogOut className="w-4 h-4" />
          Wyloguj
        </button>
      </div>
    </div>
  );
}
