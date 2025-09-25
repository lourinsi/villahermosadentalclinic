"use client";

import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { AdminLayout } from "../components/AdminLayout";
import { PatientsView } from "../components/PatientsView";
import { Calendar } from "lucide-react";
import { FinanceView } from "../components/FinanceView";
import { CalendarView } from "../components/CalendarView";
import { SettingsView } from "../components/SettingsView";

export default function Home() {
  const [currentView, setCurrentView] = useState("dashboard");

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
      case "settings":
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AdminLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderContent()}
    </AdminLayout>
  );
}
