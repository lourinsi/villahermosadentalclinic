"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Button } from "@/components/ui/button";
import { LogOut, User, Home, Users, Calendar, Search, ShoppingBag, ShoppingCart, Bell } from "lucide-react";
import { toast } from "sonner";
import { NotificationsOpened } from "./notificationsOpened";
import { useNotifications } from "@/hooks/useNotifications";

const PatientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { notifications } = useNotifications();

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 flex-shrink-0">
          <NotificationsOpened 
            notifications={notifications} 
            unreadCount={unreadCount} 
            portal="patient" 
          />
        </header>
        <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default PatientLayout;
