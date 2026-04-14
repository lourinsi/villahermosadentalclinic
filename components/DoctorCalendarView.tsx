"use client";

import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { CalendarView } from "./CalendarView";
import { getNextAvailableSlot } from "../lib/appointment-utils";

interface DoctorCalendarViewProps {
  doctorName?: string;
}

export function DoctorCalendarView({ doctorName }: DoctorCalendarViewProps = {}) {
  const { openCreateModal, appointments } = useAppointmentModal();

  return (
    <div className="p-6 space-y-6">
      {/* Custom Doctor Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
        <Button 
          onClick={() => {
            const slot = getNextAvailableSlot(appointments, doctorName);
            openCreateModal(slot.date, slot.time, doctorName);
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>
      
       {/* Shared Calendar - shows only logged-in doctor's appointments */}
      <CalendarView portal="doctor" defaultDoctorFilter={doctorName} />
    </div>
  );
}

export default DoctorCalendarView;
