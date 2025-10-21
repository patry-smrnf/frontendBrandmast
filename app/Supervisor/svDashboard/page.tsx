"use client";
import AuthGuard from "../../AuthGuard";
import SVDashboard from "./SvDashboard";

export default function BMDashboard() {
  return (
  <AuthGuard allowedRoles={["SV"]}>
    <SVDashboard/>
  </AuthGuard>  
  );
  
}
