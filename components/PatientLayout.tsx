"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth.tsx";
import { useBookingModalMode } from "@/hooks/useBookingModalMode";
import { Button } from "@/components/ui/button";
import { LogOut, User, Home, Users, Calendar, Search, ShoppingBag, ShoppingCart, Bell, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import NotificationsOpened from "./notificationsOpened";
import BookingModalWrapper from "./BookingModalWrapper";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";

const PatientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { mode, toggleMode } = useBookingModalMode();
  const { notifications, refreshNotifications, markAsRead, markAsUnread, deleteNotification, deleteNotificationWithResult, markAllAsRead, deleteAllNotifications } = useNotifications();
  const { 
    appointments, 
    openEditModal, 
    openEditModalById,
    updateAppointment, 
    refreshAppointments,
    isEditModalOpen,
    isCreateModalOpen,
    closeEditModal,
    closeCreateModal,
    selectedAppointment,
    isPatientFieldReadOnly,
    newAppointmentDate,
    newAppointmentTime
  } = useAppointmentModal();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleReschedule = async (appointmentId: string) => {
    console.log(`[PatientLayout] Attempting to reschedule/view appointment: ${appointmentId}`);
    try {
      await openEditModalById(appointmentId, true);
    } catch (error) {
      console.error(`[PatientLayout] Error in handleReschedule:`, error);
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
    { href: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/patient/account", label: "My Account", icon: Home },
    { href: "/patient/family", label: "Family Members", icon: Users },
    { href: "/patient/appointments", label: "My Appointments", icon: Calendar },
    { href: "/patient/doctors", label: "Find Doctors", icon: Search },
    { href: "/patient/orders", label: "Orders", icon: ShoppingBag },
    { href: "/patient/cart", label: "Cart", icon: ShoppingCart },
    { href: "/patient/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white flex-shrink-0 flex flex-col">
        <div className="p-4 text-2xl font-bold border-b border-gray-700">Patient Portal</div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                      pathname === item.href ? "bg-gray-900 border-l-4 border-blue-500" : ""
                    }`}
                  >
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-700 space-y-3">
          <div className="flex items-center space-x-2 px-2 py-2 bg-gray-700 rounded">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">{user?.username || "Patient"}</span>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start text-gray-800 hover:bg-gray-100"
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
            portal="patient" 
            onRefresh={refreshNotifications}
            onMarkAsRead={markAsRead}
            onMarkAsUnread={markAsUnread}
            onDelete={deleteNotification}
            onDeleteWithResult={deleteNotificationWithResult}
            onMarkAllAsRead={markAllAsRead}
            onDeleteAll={deleteAllNotifications}
            onReschedule={handleReschedule}
            onCancelAppointment={handleCancelAppointment}
            onEditAppointment={handleReschedule}
          />
        </header>
        <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
        
        {/* Support editing/viewing appointments from notifications */}
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

export default PatientLayout;
