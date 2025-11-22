"use client";
import AuthGuard from "@/app/AuthGuard";
import MyActivityPage from "./MyActivityPage";

export default function MyActivity() {
  return (
    <AuthGuard allowedRoles={["BM", "SV", "ADMIN"]}>
      <MyActivityPage />
    </AuthGuard>
  );
}

