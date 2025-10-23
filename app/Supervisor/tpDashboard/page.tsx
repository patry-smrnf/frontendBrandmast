import AuthGuard from "@/app/AuthGuard";
import TpDashboard from "./TpDashboard";

export default function TpDashboardPage() {
  return (
    <AuthGuard allowedRoles={["SV"]}>
      <TpDashboard />
    </AuthGuard>
  );
}

