"use client";

import { Button } from "./ui/button";
import { Phone, User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface HeaderProps {
  onBookAppointment?: () => void;
}

export function Header({ onBookAppointment }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleDashboard = () => {
    if (user?.role === "admin") router.push("/admin/dashboard");
    else if (user?.role === "doctor") router.push("/doctor/dashboard");
    else router.push("/patient/dashboard");
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">
              Villahermosa Dental
            </h1>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link href="/#home" className="text-gray-900 hover:text-primary transition-colors font-medium">
              Home
            </Link>
            <Link href="/#services" className="text-gray-900 hover:text-primary transition-colors font-medium">
              Services
            </Link>
            <Link href="/#about" className="text-gray-900 hover:text-primary transition-colors font-medium">
              About
            </Link>
            <Link href="/#contact" className="text-gray-900 hover:text-primary transition-colors font-medium">
              Contact
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600 border-r pr-4 mr-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-medium">(555) 123-4567</span>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={onBookAppointment}
                  className="bg-primary hover:bg-primary/90 rounded-full"
                >
                  Book Appointment
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full bg-gray-100">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{user?.username}</span>
                        <span className="text-xs font-normal text-gray-500 capitalize">{user?.role}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDashboard}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={onBookAppointment}
                  className="bg-primary hover:bg-primary/90 rounded-full hidden sm:flex"
                >
                  Book Appointment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/login")}
                  className="rounded-full border-primary text-primary hover:bg-primary/5"
                >
                  Login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
