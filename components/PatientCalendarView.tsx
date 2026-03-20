"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth.tsx";
import { CalendarView } from "./CalendarView";

export function PatientCalendarView() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      {/* Custom Patient Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <Button 
          onClick={() => router.push('/patient/doctors')} 
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>
      
      {/* Shared Calendar - filtered to show only reserved and scheduled */}
      <CalendarView portal="patient" defaultStatusFilter={["reserved", "scheduled"]} />
    </div>
  );
}
