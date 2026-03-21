"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar, Clock, CheckCircle, AlertCircle, User, DollarSign } from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Badge } from "./ui/badge";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal } from "../lib/utils";
import { useAuth } from "@/hooks/useAuth";
import BookingModal from "./BookingModal";

export function PatientDashboard() {
  const { openCreateModal, appointments, openEditModal } = useAppointmentModal();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"upcoming" | "past">("upcoming");
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Show loading when view mode changes
  useEffect(() => {
    setIsLoadingView(true);
    const t = setTimeout(() => setIsLoadingView(false), 300);
    return () => clearTimeout(t);
  }, [viewMode]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((apt: Appointment) => {
        const aptDate = parseBackendDateToLocal(apt.date);
        return aptDate >= today && apt.status !== "cancelled";
      })
      .sort((a, b) => {
        const dateCompare = new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
        return dateCompare;
      });
  }, [appointments, today]);

  const pastAppointments = useMemo(() => {
    return appointments
      .filter((apt: Appointment) => {
        const aptDate = parseBackendDateToLocal(apt.date);
        return aptDate < today && apt.status !== "cancelled";
      })
      .sort((a, b) => {
        const dateCompare = new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime();
        return dateCompare;
      });
  }, [appointments, today]);

  const displayAppointments = viewMode === "upcoming" ? upcomingAppointments : pastAppointments;

  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter((apt: Appointment) => apt.status === "completed").length;
  const totalSpent = appointments.reduce((sum: number, apt: Appointment) => sum + (apt.price || 0), 0);
  const pendingBalance = appointments.reduce((sum: number, apt: Appointment) => sum + (apt.balance || 0), 0);

  const dynamicStats = [
    {
      title: "Total Appointments",
      value: totalAppointments.toString(),
      description: "All time",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Completed",
      value: completedAppointments.toString(),
      description: "Finished visits",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Amount Paid",
      value: `$${totalSpent.toFixed(2)}`,
      description: "Total spent",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Outstanding Balance",
      value: `$${pendingBalance.toFixed(2)}`,
      description: "Due soon",
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "scheduled":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pending":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "reserved":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back!</h1>
        <p className="text-muted-foreground">Here's your appointments and health records overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dynamicStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Appointments</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{viewMode === "upcoming" ? "Upcoming visits" : "Past visits"}</p>
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(["upcoming", "past"] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant="ghost"
                    className={`
                      px-3 py-1 text-xs font-medium rounded transition-all duration-200
                      ${viewMode === mode
                        ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                        : "bg-transparent text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                      }
                    `}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoadingView ? (
                <div className="text-center py-8">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading appointments...</p>
                  </div>
                </div>
              ) : displayAppointments.length > 0 ? (
                displayAppointments.map((appointment: Appointment) => (
                  <div 
                    key={appointment.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setBookingModalOpen(true);
                    }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="text-sm font-medium text-violet-600 min-w-[80px]">
                        <div>{appointment.time}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {parseBackendDateToLocal(appointment.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Dr. {appointment.doctor}</div>
                        <div className="text-xs text-muted-foreground">
                          {getAppointmentTypeName(appointment.type, appointment.customType)} • {appointment.duration || 30} min
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {appointment.price && (
                        <span className="text-sm font-medium text-gray-900">${appointment.price.toFixed(2)}</span>
                      )}
                      <Badge className={`border ${getStatusColor(appointment.status)}`}>
                        {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No {viewMode === "upcoming" ? "upcoming" : "past"} appointments.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Card - Single column */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-600 font-medium mb-1">Total Appointments</div>
              <div className="text-2xl font-bold text-blue-900">{totalAppointments}</div>
              <div className="text-xs text-blue-600 mt-1">All time</div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-xs text-green-600 font-medium mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-900">{completedAppointments}</div>
              <div className="text-xs text-green-600 mt-1">Finished visits</div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs text-purple-600 font-medium mb-1">Amount Paid</div>
              <div className="text-2xl font-bold text-purple-900">${totalSpent.toFixed(2)}</div>
              <div className="text-xs text-purple-600 mt-1">Total spent</div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-xs text-amber-600 font-medium mb-1">Outstanding Balance</div>
              <div className="text-2xl font-bold text-amber-900">${pendingBalance.toFixed(2)}</div>
              <div className="text-xs text-amber-600 mt-1">Due soon</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextAppointment && (
              <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                <div className="text-sm font-medium text-violet-900 mb-1">Next Appointment</div>
                <div className="text-xs text-violet-700 mb-3">
                  {parseBackendDateToLocal(nextAppointment.date).toLocaleDateString("en-US", { 
                    weekday: "short", 
                    month: "short", 
                    day: "numeric" 
                  })} at {nextAppointment.time}
                </div>
                <div className="text-xs text-violet-600 mb-3">
                  Dr. {nextAppointment.doctor} • {getAppointmentTypeName(nextAppointment.type, nextAppointment.customType)}
                </div>
                <Button size="sm" variant="outline" className="w-full text-violet-600 border-violet-200 hover:bg-violet-100">
                  View Details
                </Button>
              </div>
            )}

            <Button 
              className="p-4 h-auto bg-violet-600 hover:bg-violet-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
              onClick={() => openCreateModal()}
            >
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6" />
                <div>
                  <div className="font-medium">Book Appointment</div>
                  <div className="text-sm text-violet-100">Schedule a new visit</div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="p-4 h-auto transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-blue-50 active:scale-95"
              onClick={() => window.location.href = "/patient/medical-records"}
            >
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-medium">Medical Records</div>
                  <div className="text-sm text-muted-foreground">View your records</div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="p-4 h-auto transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-green-50 active:scale-95"
              onClick={() => window.location.href = "/patient/billing"}
            >
              <div className="flex items-center space-x-3">
                <DollarSign className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">Billing & Payments</div>
                  <div className="text-sm text-muted-foreground">Manage payments</div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        appointmentToEdit={selectedAppointment}
        onBooked={() => {
          setSelectedAppointment(null);
          setBookingModalOpen(false);
        }}
      />
    </div>
  );
}
