"use client";
import AuthGuard from "../../AuthGuard";
import HelpMePage from "./HelpMePage";

export default function BMDashboard() {
  return (
  <AuthGuard allowedRoles={["BM"]}>
    <HelpMePage/>
  </AuthGuard>  
  );
  
}
