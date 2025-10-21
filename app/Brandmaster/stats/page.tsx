"use client";
import AuthGuard from "../../AuthGuard";
import StatsPage from "./stats";

export default function BMDashboard() {
  return (
  <AuthGuard allowedRoles={["BM"]}>
    <StatsPage/>
  </AuthGuard>  
  );
  
}
