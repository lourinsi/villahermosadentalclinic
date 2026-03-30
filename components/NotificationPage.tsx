import React from "react";
import { NotificationView } from "@/components/NotificationView";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Appointment } from '@/hooks/useAppointments';

type Portal = "patient" | "doctor" | "admin";

interface NotificationPageProps {
  portal: Portal;
}

export function NotificationPage({ portal }: NotificationPageProps) {
  const { 
    notifications, 
    isLoading: notificationsLoading, 
    markAsRead,
    markAsUnread,
    deleteNotification, 
    markAllAsRead,
    refreshNotifications
  } = useNotifications();

  const { 
    updateAppointment, 
    refreshAppointments, 
    openEditModal, 
    appointments,
    isLoading: appointmentsLoading
  } = useAppointmentModal();

  const isLoading = notificationsLoading || appointmentsLoading;

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: Appointment['status'], notificationId: string) => {
    try {
      await updateAppointment(appointmentId, { status });
      const message = status === 'tentative' 
        ? "Cancellation request sent" 
        : `Appointment status updated to ${status}`;
      toast.success(message);
      
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

  const handleReschedule = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      openEditModal(appointment, portal === "patient"); // true for patient view read-only patient field
    } else {
      toast.error("Appointment not found");
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const confirmed = window.confirm("This appointment is unrefundable. Are you sure you want to cancel?");
    if (confirmed) {
      try {
        await updateAppointment(appointmentId, { status: 'cancelled' });
        toast.success("Appointment cancelled successfully");
        refreshAppointments();
        refreshNotifications();
      } catch (error) {
        toast.error("Failed to cancel appointment");
        console.error(error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Portal-specific props
  const portalProps: Record<Portal, any> = {
    patient: {
      onUpdateAppointmentStatus: handleUpdateAppointmentStatus,
      onReschedule: handleReschedule,
      onCancelAppointment: handleCancelAppointment,
    },
    doctor: {
      onUpdateAppointmentStatus: handleUpdateAppointmentStatus,
    },
    admin: {
      onUpdateAppointmentStatus: handleUpdateAppointmentStatus,
    },
  };

  return (
    <div className="max-w-4xl mx-auto">
      <NotificationView 
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAsUnread={markAsUnread}
        onDelete={deleteNotification}
        onMarkAllAsRead={markAllAsRead}
        portal={portal}
        {...portalProps[portal]}
      />
    </div>
  );
}
