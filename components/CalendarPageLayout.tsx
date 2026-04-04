"use client";

import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { CalendarView } from "./CalendarView";
import { Suspense } from "react";

interface CalendarPageLayoutProps {
  portal: "admin" | "doctor" | "patient";
  doctorName?: string;
  defaultStatusFilter?: string[];
}

export function CalendarPageLayout({ portal, doctorName, defaultStatusFilter }: CalendarPageLayoutProps) {
  const { openCreateModal } = useAppointmentModal();
  const router = useRouter();

  // Determine title, button text, and button action based on portal
  const getTitleAndAction = () => {
    switch (portal) {
      case "admin":
        return {
          title: "Appointment Calendar",
          buttonText: "New Appointment",
          buttonColor: "bg-violet-600 hover:bg-violet-700",
          onClick: () => openCreateModal(new Date()),
        };
      case "doctor":
        return {
          title: "My Schedule",
          buttonText: "New Appointment",
          buttonColor: "bg-violet-600 hover:bg-violet-700",
          onClick: () => openCreateModal(new Date()),
        };
      case "patient":
        return {
          title: "My Appointments",
          buttonText: "Book Appointment",
          buttonColor: "bg-blue-600 hover:bg-blue-700",
          onClick: () => router.push("/patient/doctors"),
        };
      default:
        return {
          title: "Calendar",
          buttonText: "New",
          buttonColor: "bg-gray-600 hover:bg-gray-700",
          onClick: () => {},
        };
    }
  };

  const { title, buttonText, buttonColor, onClick } = getTitleAndAction();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Button 
          onClick={onClick}
          className={`text-white gap-2 ${buttonColor}`}
        >
          <Plus className="h-4 w-4" />
          {buttonText}
        </Button>
      </div>
      
      {/* Calendar */}
      <Suspense fallback={<div>Loading calendar...</div>}>
        <CalendarView 
          portal={portal} 
          defaultDoctorFilter={doctorName}
          defaultStatusFilter={defaultStatusFilter}
        />
      </Suspense>
    </div>
  );
}
