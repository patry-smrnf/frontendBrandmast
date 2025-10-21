"use client";
import AuthGuard from "../../AuthGuard";
import ActionDetails from "./actionDetails";

export default function ActionDetail() {
  return (
  <AuthGuard allowedRoles={["BM"]}>
    <ActionDetails/>
  </AuthGuard>  
  );
  
}
