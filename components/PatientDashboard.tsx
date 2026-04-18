"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar, CheckCircle, AlertCircle, User, DollarSign } from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { useAppointmentStatuses } from "@/hooks/useAppointmentStatuses";
import { Badge } from "./ui/badge";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal } from "../lib/utils";
import { useAuth } from "@/hooks/useAuth";
import BookingModal from "./BookingModal";
import { NextAppointmentCard } from "./NextAppointmentCard";

export function PatientDashboard() {
  const { openCreateModal, appointments } = useAppointmentModal();
  const { statuses: APPOINTMENT_STATUSES } = useAppointmentStatuses();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"upcoming" | "past">("upcoming");
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Extract first name from user
  const firstName = user?.username ? user.username.split('@')[0] : "there";

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
  
  // Get all appointments at the same time as next appointment (for carousel)
  const sameTimeAppointments = useMemo(() => {
    if (!nextAppointment) return [];
    return upcomingAppointments.filter(
      (apt: Appointment) =>
        apt.date === nextAppointment.date &&
        apt.time === nextAppointment.time &&
        apt.id !== nextAppointment.id &&
        apt.status !== "cancelled"
    );
  }, [nextAppointment, upcomingAppointments]);

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter((apt: Appointment) => {
    const k = String(apt.status || "").toLowerCase().trim();
    return k === "completed";
  }).length;
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
    const k = String(status || "").toLowerCase().trim();
    const statusOption = APPOINTMENT_STATUSES.find(s => s.value.toLowerCase() === k);
    
    if (statusOption) {
      const borderClass = statusOption.bgColor?.replace('bg-', 'border-') || 'border-gray-200';
      return `${statusOption.bgColor} ${statusOption.textColor} ${borderClass}`;
    }

    switch (k) {
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
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {firstName}!</h1>
        <p className="text-muted-foreground">Here&apos;s your appointments and health records overview.</p>
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

      <div className="grid grid-cols-1 gap-6">
        {/* Next Appointment Card - Full Width */}
        {nextAppointment && (
          <NextAppointmentCard
            appointment={nextAppointment}
            role="patient"
            sameTimeAppointments={sameTimeAppointments}
            onViewDetails={(apt) => {
              setSelectedAppointment(apt);
              setBookingModalOpen(true);
            }}
            showHeader={true}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Schedule</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {viewMode === "upcoming" ? "Upcoming visits" : "Past visits"}
                </p>
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

        {/* Appointment Types Chart - 1 column */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Types</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const appointmentsToAnalyze = displayAppointments.length === 0 ? appointments : displayAppointments;
              
              if (appointmentsToAnalyze.length === 0) return null;

              const typeCounts = appointmentsToAnalyze.reduce<Record<string, number>>((acc, apt) => {
                const key = getAppointmentTypeName(apt.type, apt.customType);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {});

              const total = Object.values(typeCounts).reduce((s, v) => s + v, 0) || 1;
              const colorPalette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];
              
              return (
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-gray-700">
                    {displayAppointments.length === 0 ? "Appointment Types (All Time)" : "Appointment Types"}
                  </div>
                  <div className="space-y-2">
                    {Object.keys(typeCounts).map((name, idx) => {
                      const percentage = Math.round((typeCounts[name] / total) * 100);
                      return (
                        <div key={name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: colorPalette[idx % colorPalette.length] }}
                            />
                            <span className="text-gray-600">{name}</span>
                          </div>
                          <span className="font-medium text-gray-900">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
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
