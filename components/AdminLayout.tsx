"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth.tsx";
import { useBookingModalMode } from "@/hooks/useBookingModalMode";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard, Users, Calendar, Shield, Bell, ClipboardList, Stethoscope, DollarSign } from "lucide-react";
import { toast } from "sonner";
import NotificationsOpened from "./notificationsOpened";
import BookingModalWrapper from "./BookingModalWrapper";
import AppointmentHistoryView from "./AppointmentHistoryView";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Appointment } from "@/hooks/useAppointments";
import { useNotificationAppointmentSnapshot } from "@/hooks/useNotificationAppointmentSnapshot";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { mode, toggleMode } = useBookingModalMode();
  const { notifications, markAsRead, markAsUnread, deleteNotification, deleteNotificationWithResult, markAllAsRead, deleteAllNotifications, refreshNotifications } = useNotifications();
  const { 
    updateAppointment, 
    refreshAppointments, 
    appointments, 
    openEditModal, 
    openEditModalById,
    isEditModalOpen,
    isCreateModalOpen,
    closeEditModal,
    closeCreateModal,
    selectedAppointment,
    newAppointmentDate,
    newAppointmentTime
  } = useAppointmentModal();
  const {
    isAppointmentHistoryOpen,
    setIsAppointmentHistoryOpen,
    appointmentSnapshot,
    appointmentSnapshotId,
    appointmentSnapshotLogDate,
    appointmentSnapshotIsHistorical,
    handleViewCurrentSnapshot,
    handleViewAppointmentSnapshot,
    resetAppointmentSnapshot,
  } = useNotificationAppointmentSnapshot(appointments);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string, notificationId: string) => {
    try {
      await updateAppointment(appointmentId, { status: status as Appointment["status"] });
      toast.success(`Appointment status updated to ${status}`);
      await markAsRead(notificationId);
      refreshAppointments();
      refreshNotifications();
    } catch (error) {
      toast.error("Failed to update appointment status");
      console.error(error);
    }
  };

  const handleEditAppointment = async (appointmentId: string) => {
    console.log(`[AdminLayout] Attempting to edit appointment: ${appointmentId}`);
    try {
      await openEditModalById(appointmentId);
    } catch (error) {
      console.error(`[AdminLayout] Error in handleEditAppointment:`, error);
      toast.error("Appointment not found or could not be loaded");
    }
  };

  const handleOpenSnapshotAppointment = async (appointmentId: string) => {
    setIsAppointmentHistoryOpen(false);
    resetAppointmentSnapshot();
    await handleEditAppointment(appointmentId);
  };

  const isSnapshotAppointmentOpen = Boolean(
    isEditModalOpen &&
    appointmentSnapshotId &&
    selectedAppointment?.id &&
    String(selectedAppointment.id) === String(appointmentSnapshotId)
  );

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/requests", label: "Requests", icon: ClipboardList },
    { href: "/admin/patients", label: "Patients", icon: Users },
    { href: "/admin/doctors", label: "Find Doctors", icon: Stethoscope },
    { href: "/admin/calendar", label: "Calendar", icon: Calendar },
    { href: "/admin/finance", label: "Finance", icon: DollarSign },
    { href: "/admin/staff", label: "Staff", icon: Shield },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-blue-900 text-white flex-shrink-0 flex flex-col">
        <div className="p-4 text-2xl font-bold border-b border-blue-800">Admin</div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-950 text-white"
                        : "text-blue-100 hover:bg-blue-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-blue-800 space-y-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-blue-800 rounded-lg">
            <User className="w-4 h-4 text-blue-200" />
            <span className="text-sm font-medium truncate">{user?.username || "Admin"}</span>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start text-blue-900 hover:bg-blue-50 bg-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              onClick={toggleMode}
              variant="outline"
              size="sm"
              className="text-xs"
              title={`Switch to ${mode === 'simple' ? 'Pro' : 'Simple'} mode`}
            >
              {mode === 'simple' ? '📱 Simple' : '⭐ Pro'}
            </Button>
          </div>
          <NotificationsOpened 
            notifications={notifications} 
            unreadCount={unreadCount} 
            portal="admin" 
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onMarkAsRead={markAsRead}
            onMarkAsUnread={markAsUnread}
            onDelete={deleteNotification}
            onDeleteWithResult={deleteNotificationWithResult}
            onMarkAllAsRead={markAllAsRead}
            onDeleteAll={deleteAllNotifications}
            onRefresh={refreshNotifications}
            onEditAppointment={handleEditAppointment}
            onViewAppointmentSnapshot={handleViewAppointmentSnapshot}
          />
        </header>
        <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
        <AppointmentHistoryView
          open={isAppointmentHistoryOpen}
          onOpenChange={(open) => {
            setIsAppointmentHistoryOpen(open);
            if (!open) resetAppointmentSnapshot();
          }}
          appointmentSnapshot={appointmentSnapshot}
          logDate={appointmentSnapshotLogDate}
          onViewCurrent={handleViewCurrentSnapshot}
          onOpenAppointment={handleOpenSnapshotAppointment}
          isAppointmentOpen={isSnapshotAppointmentOpen}
          isHistorical={appointmentSnapshotIsHistorical}
        />
        
        {/* Support editing appointments from notifications */}
        <BookingModalWrapper 
          open={isEditModalOpen || isCreateModalOpen} 
          onOpenChange={(open) => {
            if (!open) {
              closeEditModal();
              closeCreateModal();
            }
          }}
          appointmentToEdit={selectedAppointment}
          defaultDate={newAppointmentDate}
          defaultTime={newAppointmentTime}
        />
      </div>
    </div>
  );
};

export default AdminLayout;
