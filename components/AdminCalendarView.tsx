"use client";

import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { CalendarView } from "./CalendarView";

export function AdminCalendarView() {
  const { openCreateModal } = useAppointmentModal();

  return (
    <div className="p-6 space-y-6">
      {/* Custom Admin Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Appointment Calendar</h1>
        <Button 
          onClick={() => openCreateModal(new Date())}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>
      
      {/* Shared Calendar */}
      <CalendarView portal="admin" />
    </div>
  );
}

export default AdminCalendarView;
