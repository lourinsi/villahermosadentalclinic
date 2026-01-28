"use client";

import React from "react";
import { NotificationView } from "@/components/NotificationView";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";

export default function DoctorNotificationsPage() {
  const { 
    notifications, 
    isLoading, 
    markAsRead, 
    deleteNotification, 
    markAllAsRead,
    refreshNotifications
  } = useNotifications();
  
  const { updateAppointment, refreshAppointments } = useAppointmentModal();

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string, notificationId: string) => {
    try {
      await updateAppointment(appointmentId, { status });
      toast.success(`Appointment status updated to ${status}`);
      // Mark notification as read after action
      await markAsRead(notificationId);
      // Refresh local data
      refreshAppointments();
      refreshNotifications();
    } catch (error) {
      toast.error("Failed to update appointment status");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <NotificationView 
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
        onMarkAllAsRead={markAllAsRead}
        onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
        portal="doctor"
      />
    </div>
  );
}
