"use client";

import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { AdminLayout } from "../components/AdminLayout";
import { PatientsView } from "../components/PatientsView";

export default function Home() {
  const [currentView, setCurrentView] = useState("dashboard");

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "patients":
        return <PatientsView />
      case "calendar":
        return <div className="p-6"><h1 className="text-2xl font-bold">Calendar</h1><p>Calendar content coming soon...</p></div>;
      case "finance":
        return <div className="p-6"><h1 className="text-2xl font-bold">Finance</h1><p>Finance content coming soon...</p></div>;
      case "settings":
        return <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p>Settings content coming soon...</p></div>;
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
