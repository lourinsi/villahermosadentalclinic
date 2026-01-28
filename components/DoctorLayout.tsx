"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard, Calendar, Users, Settings, Bell, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { NotificationsOpened } from "./notificationsOpened";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Appointment } from "@/hooks/useAppointments";

const DoctorLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { notifications, markAsRead, refreshNotifications } = useNotifications();
  const { updateAppointment, refreshAppointments } = useAppointmentModal();

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
    { href: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/doctor/requests", label: "Requests", icon: ClipboardList },
    { href: "/doctor/calendar", label: "My Schedule", icon: Calendar },
    { href: "/doctor/patients", label: "My Patients", icon: Users },
    { href: "/doctor/notifications", label: "Notifications", icon: Bell },
    { href: "/doctor/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-violet-800 text-white flex-shrink-0 flex flex-col">
        <div className="p-4 text-2xl font-bold border-b border-violet-700">
          <span className="text-violet-200">Doctor</span> Portal
        </div>
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
                        ? "bg-violet-900 text-white"
                        : "text-violet-200 hover:bg-violet-700 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-violet-700 space-y-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-violet-700 rounded-lg">
            <User className="w-4 h-4 text-violet-300" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block truncate">{user?.username || "Doctor"}</span>
              <span className="text-xs text-violet-300">Doctor</span>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start text-violet-800 hover:bg-violet-100 bg-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 flex-shrink-0">
          <NotificationsOpened 
            notifications={notifications} 
            unreadCount={unreadCount} 
            portal="doctor" 
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onMarkAsRead={markAsRead}
          />
        </header>
        <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default DoctorLayout;
