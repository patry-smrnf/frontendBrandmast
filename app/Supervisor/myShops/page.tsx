"use client";
import AuthGuard from "../../AuthGuard";
import MyTeamPage from "./myShops";

export default function BMDashboard() {
  return (
  <AuthGuard allowedRoles={["SV"]}>
    <MyTeamPage/>
  </AuthGuard>  
  );
  
}
