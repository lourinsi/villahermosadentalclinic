"use client";

import AdminLayout from "@/components/AdminLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePathname } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
