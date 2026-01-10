"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/patients", label: "Patients" },
    { href: "/admin/calendar", label: "Calendar" },
    { href: "/admin/finance", label: "Finance" },
    { href: "/admin/staff", label: "Staff" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white flex-shrink-0">
        <div className="p-4 text-2xl font-bold">Admin</div>
        <nav>
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
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
};

export default AdminLayout;
