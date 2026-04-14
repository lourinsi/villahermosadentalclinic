"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Users, Calendar, Clock, CheckCircle, AlertCircle, Plus, TrendingUp, Heart } from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Badge } from "./ui/badge";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal } from "../lib/utils";
import { useAuth } from "@/hooks/useAuth.tsx";
import BookingModal from "./BookingModal";
import { NextAppointmentCard } from "./NextAppointmentCard";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import { getNextAvailableSlot } from "../lib/appointment-utils";

export function DoctorDashboard() {
  const { openCreateModal, openAddPatientModal, appointments, openEditModal } = useAppointmentModal();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

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

  // Get next upcoming appointment (regardless of view mode)
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const allFutureAppointments = myAppointments
      .filter((apt: Appointment) => {
        const aptDate = parseBackendDateToLocal(apt.date);
        const aptDateTime = new Date(`${apt.date}T${apt.time}`);
        return aptDateTime > now && apt.status !== "cancelled";
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time}`).getTime();
        const timeB = new Date(`${b.date}T${b.time}`).getTime();
        return timeA - timeB;
      });
    return allFutureAppointments.length > 0 ? allFutureAppointments[0] : null;
  }, [myAppointments]);

  // Get all appointments at the same time as next appointment
  const sameTimeAppointments = useMemo(() => {
    if (!nextAppointment) return [];
    return myAppointments.filter(
      (apt: Appointment) =>
        apt.date === nextAppointment.date &&
        apt.time === nextAppointment.time &&
        apt.id !== nextAppointment.id &&
        apt.status !== "cancelled"
    );
  }, [nextAppointment, myAppointments]);

  // Get unique patients this doctor has seen
  const uniquePatients = useMemo(() => {
    const patientNames = new Set(myAppointments.map(apt => apt.patientName));
    return patientNames.size;
  }, [myAppointments]);

  // Count pending appointments
  const pendingAppointmentsCount = useMemo(() => {
    return appointmentsByDate.filter(apt => apt.status === "pending" || apt.status === "tentative" || apt.status === "To Pay").length;
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
      title: "Tentative Patients",
      value: pendingAppointmentsCount.toString(),
      description: "Awaiting approval",
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

  // Extract first name from username
  const firstName = doctorName ? doctorName.split('@')[0] : "Doctor";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Welcome, Dr. {firstName}</h1>
        <p className="text-muted-foreground">Here&apos;s your schedule overview for {viewMode === "day" ? "today" : viewMode === "week" ? "this week" : "this month"}.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dynamicStats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-110 ${stat.bgColor || 'bg-gray-50'}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-2xl shadow-sm transform transition-transform duration-300 group-hover:rotate-12 ${stat.bgColor || 'bg-gray-50'} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-extrabold tracking-tight text-gray-900 mb-1">{stat.value}</div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                  stat.title === "Tentative Patients" 
                    ? "bg-amber-100 text-amber-700" 
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {stat.title === "Tentative Patients" ? "Action Required" : "Updated"}
                </span>
                <span className="text-gray-400 text-xs font-normal">{stat.description}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule / Appointments */}
        <Card className="lg:col-span-2 border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">My Schedule</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{getViewTitle()}</p>
              </div>
              <div className="flex items-center bg-gray-100/80 rounded-xl p-1 backdrop-blur-sm">
                {(["day", "week", "month"] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant="ghost"
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                      viewMode === mode
                        ? "bg-white text-violet-600 shadow-sm"
                        : "bg-transparent text-gray-500 hover:text-gray-900"
                    }`}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {isLoadingView ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin"></div>
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-500">Updating schedule...</p>
                </div>
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment: Appointment) => (
                  <div
                    key={appointment.id}
                    className="group flex items-center justify-between p-4 hover:bg-violet-50/50 transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setBookingModalOpen(true);
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                        <span className="text-sm font-bold">{appointment.time.split(':')[0]}:{appointment.time.split(':')[1].split(' ')[0]}</span>
                        <span className="text-[10px] font-bold uppercase">{appointment.time.split(' ')[1]}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900 group-hover:text-violet-700 transition-colors">
                          {appointment.patientName}
                        </div>
                        <div className="text-xs font-medium text-gray-500 flex items-center space-x-2 mt-0.5">
                          <span>{getAppointmentTypeName(appointment.type, appointment.customType)}</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                          <span className={`capitalize ${
                            appointment.status === 'scheduled' ? 'text-emerald-600' : 
                            appointment.status === 'pending' ? 'text-blue-600' : 'text-gray-600'
                          }`}>{appointment.status}</span>
                        </div>
                        {(viewMode === "week" || viewMode === "month") && (
                          <div className="text-xs text-gray-400 mt-1">
                            {parseBackendDateToLocal(appointment.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full bg-white shadow-sm">
                        <Users className="h-4 w-4 text-violet-600" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <div className="p-4 bg-gray-50 rounded-full mb-4">
                    <Calendar className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="text-sm font-semibold">No appointments scheduled for this {viewMode}</p>
                  {viewMode !== "month" && (
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px] text-center">
                      Try switching to {viewMode === "day" ? "week or month" : "month"} view to see more.
                    </p>
                  )}
                  {viewMode === "day" && (
                    <div className="mt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs font-bold rounded-xl"
                        onClick={() => setViewMode("week")}
                      >
                        Week View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs font-bold rounded-xl"
                        onClick={() => setViewMode("month")}
                      >
                        Month View
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointment Types Pie Chart */}
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="border-b border-gray-50 pb-4">
            <CardTitle className="text-lg font-bold text-gray-800">Visit Statistics</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {(() => {
              // Use all-time appointments if current view has no data
              const appointmentsToAnalyze = appointmentsByDate.length === 0 ? myAppointments : appointmentsByDate;
              const isAllTime = appointmentsByDate.length === 0;
              
              if (appointmentsToAnalyze.length === 0) return null;

              const typeCounts = appointmentsToAnalyze.reduce<Record<string, number>>((acc, apt) => {
                const key = getAppointmentTypeName(apt.type, apt.customType);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {});

              const total = Object.values(typeCounts).reduce((s, v) => s + v, 0) || 1;
              const chartData = Object.keys(typeCounts).map((name, idx) => ({
                name,
                value: Math.round((typeCounts[name] / total) * 100),
                color: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"][idx % 7]
              }));

              const getTimeLabel = () => {
                if (isAllTime) return "All Time";
                if (viewMode === "day") return "Today";
                if (viewMode === "week") return "This Week";
                return "This Month";
              };

              return (
                <>
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">{getTimeLabel()}</p>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {chartData.map((type, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          <span className="text-xs truncate">{type.name}</span>
                        </div>
                        <span className="font-medium text-xs">{type.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Your Next Patient Card - Full Width */}
        {nextAppointment && (
          <NextAppointmentCard
            appointment={nextAppointment}
            role="doctor"
            sameTimeAppointments={sameTimeAppointments}
            onViewDetails={(apt) => {
              setSelectedAppointment(apt);
              setBookingModalOpen(true);
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="border-none shadow-md bg-white overflow-hidden lg:col-span-3">
          <CardHeader className="border-b border-gray-50 pb-4">
            <CardTitle className="text-xl font-bold text-gray-800">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="group relative flex items-center justify-between p-6 h-auto border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 rounded-2xl transition-all duration-300 overflow-hidden"
                onClick={() => {
                  const slot = getNextAvailableSlot(appointments, doctorName);
                  openCreateModal(slot.date, slot.time, doctorName);
                }}
              >
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="p-3 rounded-xl bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">Book Visit</div>
                    <div className="text-xs text-gray-500">Schedule patient</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="group relative flex items-center justify-between p-6 h-auto border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 rounded-2xl transition-all duration-300 overflow-hidden"
                onClick={() => window.location.href = "/doctor/calendar"}
              >
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">Calendar</div>
                    <div className="text-xs text-gray-500">Full schedule</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="group relative flex items-center justify-between p-6 h-auto border-gray-100 hover:border-pink-200 hover:bg-pink-50/50 rounded-2xl transition-all duration-300 overflow-hidden"
                onClick={() => openAddPatientModal()}
              >
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="p-3 rounded-xl bg-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors duration-300">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">Add Patient</div>
                    <div className="text-xs text-gray-500">New record</div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="group relative flex items-center justify-between p-6 h-auto border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 rounded-2xl transition-all duration-300 overflow-hidden"
                onClick={() => window.location.href = "/doctor/patients"}
              >
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">My Patients</div>
                    <div className="text-xs text-gray-500">Patient list</div>
                  </div>
                </div>
              </Button>
            </div>
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

export default DoctorDashboard;
