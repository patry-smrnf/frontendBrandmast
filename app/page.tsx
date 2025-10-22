"use client";

import React, { useState, useEffect } from "react";
import BmDashboard from "./Brandmaster/bmDashboard/page";
import SvDashboard from "./Supervisor/svDashboard/page";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/utils/apiFetch";
import { AuthMeType } from "@/types/AuthMe";
import NotAuthorized from "./NotAuthorized/page";
import DarkLoadingPage from "@/components/LoadingScreen";

type UserRole = "BM" | "SV" | "ADMIN" | null;

export default function Home() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function verifyAuth() {
      try {
        const res = await apiFetch<AuthMeType>(`/api/auth/me`, {
          method: "GET",
        });

        const userRole = res.role.toUpperCase();
        if(userRole == "BM") {
          setRole("BM");
        }
        if(userRole == "SV") {
          setRole("SV");
        }
        if(userRole == "ADMIN") {
          setRole("ADMIN");
        }

        setLoading(false);
      } catch (err) {
        router.replace("/Login"); // No valid token
      }
    };

    verifyAuth();
  }, [router]);

  if (loading) {
    return (
      <DarkLoadingPage title="Tryna figure out who u are" />
    );
  }

  if (role === "BM") return <BmDashboard />;
  if (role === "SV") return <SvDashboard />;
 
  return <NotAuthorized />;
}