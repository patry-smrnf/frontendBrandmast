"use client";
import AuthGuard from "../../AuthGuard";
import ActionPlannerPage from "./ActionPlannerPage";

export default function ActionPlanner() {
  return (
    <AuthGuard allowedRoles={["SV"]}>
      <ActionPlannerPage />
    </AuthGuard>
  );
}

