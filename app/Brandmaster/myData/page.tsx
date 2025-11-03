"use client";
import AuthGuard from "@/app/AuthGuard";
import MyDataPage from "./MyDataPage";

export default function MyData() {
  return (
    <AuthGuard allowedRoles={["BM"]}>
      <MyDataPage />
    </AuthGuard>
  );
}

