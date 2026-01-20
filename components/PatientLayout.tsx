"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

const PatientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

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
    { href: "/patient/account", label: "My Account" },
    { href: "/patient/appointments", label: "My Appointments" },
    { href: "/patient/doctors", label: "Find Doctors" },
    { href: "/patient/orders", label: "Orders" },
    { href: "/patient/cart", label: "Cart" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white flex-shrink-0 flex flex-col">
        <div className="p-4 text-2xl font-bold border-b border-gray-700">Patient Portal</div>
        <nav className="flex-1">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block p-4 hover:bg-gray-700 ${
                    pathname === item.href ? "bg-gray-900" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
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
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
};

export default PatientLayout;
