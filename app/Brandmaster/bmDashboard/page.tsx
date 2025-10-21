"use client";
import AuthGuard from "@/app/AuthGuard";
import BMDashboardPanel from "./BmDashboard";

export default function BMDashboard() {
  return (
  <AuthGuard allowedRoles={["BM"]}>
    <BMDashboardPanel/>
  </AuthGuard>  
  );
  
}
