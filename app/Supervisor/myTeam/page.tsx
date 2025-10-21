"use client";
import AuthGuard from "../../AuthGuard";
import MyTeamPage from "./myTeamPage";

export default function BMDashboard() {
  return (
  <AuthGuard allowedRoles={["SV"]}>
    <MyTeamPage/>
  </AuthGuard>  
  );
  
}
