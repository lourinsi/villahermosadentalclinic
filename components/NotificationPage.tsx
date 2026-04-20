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
    error,
    markAsRead,
    markAsUnread,
  deleteNotification, 
  deleteNotificationWithResult,
    markAllAsRead,
    deleteAllNotifications,
    refreshNotifications,
    restoreNotification
  } = useNotifications();

  const { 
    updateAppointment, 
    refreshAppointments, 
    openEditModalById,
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

  const handleReschedule = async (appointmentId: string) => {
    console.log(`[NotificationPage] Attempting to view/edit appointment: ${appointmentId}`);
    try {
      await openEditModalById(appointmentId, portal === "patient");
    } catch (error) {
      console.error(`[NotificationPage] Error in handleReschedule:`, error);
      toast.error("Appointment not found or could not be loaded");
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

  const handleRestoreNotification = async (notificationId: string) => {
    try {
      await restoreNotification(notificationId);
      toast.success("Notification restored successfully");
      refreshNotifications();
    } catch (error) {
      toast.error("Failed to restore notification");
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

  // Portal-specific props
  const portalProps: Record<Portal, any> = {
    patient: {
      onUpdateAppointmentStatus: handleUpdateAppointmentStatus,
      onReschedule: handleReschedule,
      onCancelAppointment: handleCancelAppointment,
      onEditAppointment: handleReschedule, // Reuse handleReschedule as it opens the modal
    },
    doctor: {
      onUpdateAppointmentStatus: handleUpdateAppointmentStatus,
      onEditAppointment: handleReschedule,
    },
    admin: {
      onUpdateAppointmentStatus: handleUpdateAppointmentStatus,
      onEditAppointment: handleReschedule,
    },
  };

  return (
    <div className="max-w-4xl mx-auto">
      <NotificationView 
        notifications={notifications}
        isLoading={notificationsLoading}
        error={error}
        onMarkAsRead={markAsRead}
        onMarkAsUnread={markAsUnread}
  onDelete={deleteNotification}
  onDeleteWithResult={deleteNotificationWithResult}
        onRestore={handleRestoreNotification}
        onMarkAllAsRead={markAllAsRead}
        onDeleteAll={deleteAllNotifications}
        portal={portal}
        {...portalProps[portal]}
      />
    </div>
  );
}
