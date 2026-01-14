"use client";

import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import AdminLayout from "@/components/AdminLayout";
import { PatientsView } from "@/components/PatientsView";
import { FinanceView } from "@/components/FinanceView";
import { CalendarView } from "@/components/CalendarView";
import { SettingsView } from "@/components/SettingsView";
import { StaffView } from "@/components/Staff";
import { AllAppointmentsView } from "@/components/AllAppointmentsView";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";

export default function Home() {
  const [currentView, setCurrentView] = useState("dashboard");
  const { appointments, isLoading } = useAppointmentModal();

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "patients":
        return <PatientsView />
      case "calendar":
        return <CalendarView />
      case "finance":
        return <FinanceView />
      case "staff":
        return <StaffView />
      case "settings":
        return <SettingsView />;
      case "all-appointments":
        return <AllAppointmentsView appointments={appointments} isLoading={isLoading} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        {renderContent()}
      </AdminLayout>
    </ProtectedRoute>
  );
}
