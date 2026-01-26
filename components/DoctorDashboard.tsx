"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Users, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Badge } from "./ui/badge";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal } from "../lib/utils";
import { useAuth } from "@/hooks/useAuth.tsx";

export function DoctorDashboard() {
  const { openCreateModal, appointments, refreshTrigger, openEditModal } = useAppointmentModal();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [isLoadingView, setIsLoadingView] = useState(false);

  // Filter appointments to only show this doctor's appointments
  const doctorName = user?.username || "";

  const myAppointments = useMemo(() => {
    return appointments.filter((apt: Appointment) =>
      apt.doctor.toLowerCase() === doctorName.toLowerCase()
    );
  }, [appointments, doctorName]);

  // Show loading when view mode changes
  useEffect(() => {
    setIsLoadingView(true);
    const t = setTimeout(() => setIsLoadingView(false), 300);
    return () => clearTimeout(t);
  }, [viewMode]);

  const appointmentsByDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === "day") {
      const dayStr = today.toISOString().split("T")[0];
      return myAppointments.filter((apt: Appointment) => parseBackendDateToLocal(apt.date).toISOString().split("T")[0] === dayStr);
    } else if (viewMode === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return myAppointments.filter((apt: Appointment) => {
        const aptDate = parseBackendDateToLocal(apt.date);
        return aptDate >= weekStart && aptDate <= weekEnd;
      });
    } else {
      // month - today's month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      return myAppointments.filter((apt: Appointment) => {
        const aptDate = parseBackendDateToLocal(apt.date);
        return aptDate >= monthStart && aptDate <= monthEnd;
      });
    }
  }, [myAppointments, viewMode]);

  const filteredAppointments = useMemo(() => {
    return appointmentsByDate.filter(apt => apt.status !== "pending");
  }, [appointmentsByDate]);

  // Get unique patients this doctor has seen
  const uniquePatients = useMemo(() => {
    const patientNames = new Set(myAppointments.map(apt => apt.patientName));
    return patientNames.size;
  }, [myAppointments]);

  // Count pending appointments
  const pendingAppointmentsCount = useMemo(() => {
    return appointmentsByDate.filter(apt => apt.status === "pending").length;
  }, [appointmentsByDate]);

  // Count completed appointments
  const completedAppointments = useMemo(() => {
    return appointmentsByDate.filter(apt => apt.status === "completed").length;
  }, [appointmentsByDate]);

  const dynamicStats = [
    {
      title: "My Patients",
      value: uniquePatients.toString(),
      description: "Total patients seen",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: viewMode === "day" ? "Today's Appointments" : viewMode === "week" ? "This Week" : "This Month",
      value: filteredAppointments.length.toString(),
      description: "Total scheduled",
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Pending",
      value: pendingAppointmentsCount.toString(),
      description: "Awaiting confirmation",
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Completed",
      value: completedAppointments.toString(),
      description: "Finished appointments",
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  const getViewTitle = (): string => {
    const today = new Date();
    if (viewMode === "day") {
      return today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    } else if (viewMode === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    } else {
      return today.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome, Dr. {doctorName}</h1>
        <p className="text-muted-foreground">Here's your schedule overview for {viewMode === "day" ? "today" : viewMode === "week" ? "this week" : "this month"}.</p>
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
        {/* Today's Schedule / Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Schedule</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{getViewTitle()}</p>
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(["day", "week", "month"] as const).map((mode) => (
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
                    <p className="text-sm text-muted-foreground">Loading schedule...</p>
                  </div>
                </div>
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment: Appointment) => (
                  <div 
                    key={appointment.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => openEditModal(appointment)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-violet-600 min-w-[60px]">
                        <div>{appointment.time}</div>
                        {viewMode !== "day" && (
                          <div className="text-xs text-gray-500 mt-1">
                            {parseBackendDateToLocal(appointment.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{appointment.patientName}</div>
                        <div className="text-xs text-muted-foreground flex items-center space-x-2">
                          <span>{getAppointmentTypeName(appointment.type, appointment.customType)} • {appointment.duration || 30} min</span>
                          <Badge variant={appointment.status === "pending" ? "outline" : appointment.status === "confirmed" ? "secondary" : "default"}>
                            {appointment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No appointments scheduled for {viewMode === "day" ? "today" : viewMode === "week" ? "this week" : "this month"}.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full p-4 text-left h-auto transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-violet-50 active:scale-95"
              onClick={() => openCreateModal()}
            >
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-violet-600 transition-colors duration-200" />
                <div>
                  <div className="font-medium">Schedule Appointment</div>
                  <div className="text-sm text-muted-foreground">Book a new patient appointment</div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full p-4 text-left h-auto transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-blue-50 active:scale-95"
              onClick={() => window.location.href = "/doctor/calendar"}
            >
              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-medium">View Full Calendar</div>
                  <div className="text-sm text-muted-foreground">See your complete schedule</div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full p-4 text-left h-auto transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-green-50 active:scale-95"
              onClick={() => window.location.href = "/doctor/patients"}
            >
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">View My Patients</div>
                  <div className="text-sm text-muted-foreground">Browse your patient list</div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
