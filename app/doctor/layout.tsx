"use client";

import DoctorLayout from "@/components/DoctorLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["doctor", "admin"]}>
      <DoctorLayout>{children}</DoctorLayout>
    </ProtectedRoute>
  );
}
