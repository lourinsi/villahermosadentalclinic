"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Users, Calendar, DollarSign, AlertCircle, Heart, Clock, CheckCircle2, BarChart3, TrendingUp } from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "./ui/badge";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal } from "../lib/utils";
import { useAuth } from "@/hooks/useAuth.tsx";
import BookingModal from "./BookingModal";

const revenueData = [
  { month: "Jan", revenue: 42000, appointments: 180 },
  { month: "Feb", revenue: 38000, appointments: 165 },
  { month: "Mar", revenue: 45000, appointments: 195 },
  { month: "Apr", revenue: 41000, appointments: 175 },
  { month: "May", revenue: 48000, appointments: 210 },
  { month: "Jun", revenue: 48250, appointments: 220 }
];

const colorPalette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

interface DashboardProps {
  portal: "admin" | "doctor" | "patient";
}

export function Dashboard({ portal }: DashboardProps) {
  const { openCreateModal, openAddPatientModal, appointments, refreshTrigger, openEditModal } = useAppointmentModal();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [totalPatients, setTotalPatients] = useState(0);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch total patients from backend
  useEffect(() => {
    const fetchPatientCount = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/patients?page=1&limit=1", { credentials: 'include' });
        const result = await response.json();
        if (result.success) {
          const total = result.meta?.total ?? (Array.isArray(result.data) ? result.data.length : 0);
          setTotalPatients(total);
        }
      } catch (error) {
        console.error("Error fetching patient count:", error);
        setTotalPatients(0);
      }
    };
    fetchPatientCount();
  }, [refreshTrigger]);

  // Show loading when view mode changes
  useEffect(() => {
    setIsLoadingView(true);
    const t = setTimeout(() => setIsLoadingView(false), 300);
    return () => clearTimeout(t);
  }, [viewMode]);

  // Filter appointments based on portal
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // For doctor portal, only show their appointments
    if (portal === "doctor" && user?.username) {
      filtered = filtered.filter((apt: Appointment) =>
        apt.doctor.toLowerCase() === user.username.toLowerCase()
      );
    }

    // For patient portal, only show their appointments
    if (portal === "patient" && user?.username) {
      filtered = filtered.filter((apt: Appointment) =>
        apt.patientName.toLowerCase() === user.username.toLowerCase()
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === "day") {
      const dayStr = today.toISOString().split("T")[0];
      return filtered
        .filter((apt: Appointment) => parseBackendDateToLocal(apt.date).toISOString().split("T")[0] === dayStr)
        .filter((apt: Appointment) => apt.status !== "pending");
    } else if (viewMode === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return filtered
        .filter((apt: Appointment) => {
          const aptDate = parseBackendDateToLocal(apt.date);
          return aptDate >= weekStart && aptDate <= weekEnd;
        })
        .filter((apt: Appointment) => apt.status !== "pending");
    } else {
      // month - today's month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      return filtered
        .filter((apt: Appointment) => {
          const aptDate = parseBackendDateToLocal(apt.date);
          return aptDate >= monthStart && aptDate <= monthEnd;
        })
        .filter((apt: Appointment) => apt.status !== "pending");
    }
  }, [appointments, viewMode, portal, user]);

  const pendingAppointmentsCount = useMemo(() => {
    let filtered = appointments;
    if (portal === "doctor" && user?.username) {
      filtered = filtered.filter((apt: Appointment) =>
        apt.doctor.toLowerCase() === user.username.toLowerCase()
      );
    }
    if (portal === "patient" && user?.username) {
      filtered = filtered.filter((apt: Appointment) =>
        apt.patientName.toLowerCase() === user.username.toLowerCase()
      );
    }
    return filtered.filter(apt => apt.status === "pending" || apt.status === "tentative" || apt.status === "To Pay").length;
  }, [appointments, portal, user]);

  // Portal-specific stats
  const getStats = () => {
    if (portal === "admin") {
      return [
        {
          title: "Total Patients",
          value: totalPatients.toString(),
          change: "+12%",
          icon: Users,
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        },
        {
          title: viewMode === "day" ? "Today's Appointments" : viewMode === "week" ? "This Week's Appointments" : "This Month's Appointments",
          value: filteredAppointments.length.toString(),
          change: "+2",
          icon: Calendar,
          color: "text-green-600",
          bgColor: "bg-green-50"
        },
        {
          title: "Pending Approvals",
          value: pendingAppointmentsCount.toString(),
          change: "Action required",
          icon: AlertCircle,
          color: "text-amber-600",
          bgColor: "bg-amber-50"
        },
        {
          title: "Monthly Revenue",
          value: "$48,250",
          change: "+8.2%",
          icon: DollarSign,
          color: "text-purple-600",
          bgColor: "bg-purple-50"
        }
      ];
    } else if (portal === "doctor") {
      // Doctor sees their own patient count
      const uniquePatients = new Set(appointments
        .filter(apt => apt.doctor.toLowerCase() === user?.username?.toLowerCase())
        .map(apt => apt.patientName)
      ).size;

      return [
        {
          title: "My Patients",
          value: uniquePatients.toString(),
          change: "Total seen",
          icon: Users,
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        },
        {
          title: viewMode === "day" ? "Today's Appointments" : viewMode === "week" ? "This Week" : "This Month",
          value: filteredAppointments.length.toString(),
          change: "Scheduled",
          icon: Calendar,
          color: "text-green-600",
          bgColor: "bg-green-50"
        },
        {
          title: "Completed",
          value: appointments
            .filter(apt => apt.doctor.toLowerCase() === user?.username?.toLowerCase() && apt.status === "completed")
            .length.toString(),
          change: "Finished",
          icon: CheckCircle2,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50"
        },
        {
          title: "Pending Approvals",
          value: pendingAppointmentsCount.toString(),
          change: "Awaiting",
          icon: AlertCircle,
          color: "text-amber-600",
          bgColor: "bg-amber-50"
        }
      ];
    } else {
      // Patient portal
      const completedCount = appointments.filter(apt => apt.status === "completed").length;
      const totalSpent = appointments.reduce((sum, apt) => sum + (apt.totalPaid || 0), 0);

      return [
        {
          title: "Total Appointments",
          value: appointments.length.toString(),
          change: "All time",
          icon: Calendar,
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        },
        {
          title: "Completed",
          value: completedCount.toString(),
          change: "Finished",
          icon: CheckCircle2,
          color: "text-green-600",
          bgColor: "bg-green-50"
        },
        {
          title: "Amount Paid",
          value: `₱${totalSpent.toLocaleString()}`,
          change: "Total spent",
          icon: DollarSign,
          color: "text-purple-600",
          bgColor: "bg-purple-50"
        },
        {
          title: "Pending Balance",
          value: `₱${appointments.reduce((sum, apt) => sum + (apt.balance || 0), 0).toLocaleString()}`,
          change: "Outstanding",
          icon: AlertCircle,
          color: "text-amber-600",
          bgColor: "bg-amber-50"
        }
      ];
    }
  };

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

  const appointmentTypeCounts = filteredAppointments.reduce<Record<string, number>>((acc, apt: Appointment) => {
    const key = getAppointmentTypeName(apt.type, apt.customType);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalAppointments = Object.values(appointmentTypeCounts).reduce((s: number, v: number) => s + v, 0) || 1;

  const appointmentTypes = Object.keys(appointmentTypeCounts).map((name, idx) => ({
    name,
    value: Math.round((appointmentTypeCounts[name] / totalAppointments) * 100),
    color: colorPalette[idx % colorPalette.length]
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-emerald-100 text-emerald-700";
      case "reserved":
        return "bg-amber-100 text-amber-700";
      case "pending":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600";
      case "half-paid":
        return "text-amber-600";
      case "unpaid":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getHeaderText = () => {
    if (portal === "admin") {
      return {
        title: "Dashboard",
        subtitle: "Welcome back! Here's what's happening at your clinic today."
      };
    } else if (portal === "doctor") {
      return {
        title: `Welcome, Dr. ${user?.username}!`,
        subtitle: `Here's your schedule overview for ${viewMode === "day" ? "today" : viewMode === "week" ? "this week" : "this month"}.`
      };
    } else {
      return {
        title: `Welcome, ${user?.username}!`,
        subtitle: "Manage your dental appointments and track your health"
      };
    }
  };

  const headerText = getHeaderText();
  const stats = getStats();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">{headerText.title}</h1>
        <p className="text-muted-foreground">{headerText.subtitle}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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
                <span className={stat.title === "Pending Approvals" || stat.title === "Pending Balance" ? "text-amber-600 font-medium" : "text-green-600"}>{stat.change}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue/Overview Chart */}
        {(portal === "admin" || portal === "doctor") && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{portal === "admin" ? "Revenue Overview" : "Appointment Trends"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number | string, name: string) => [
                    name === 'revenue' ? `$${Number(value).toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Appointments'
                  ]} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Appointment Types */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appointmentTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {appointmentTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {appointmentTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                    <span>{type.name}</span>
                  </div>
                  <span className="font-medium">{type.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule View */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Schedule</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{getViewTitle()}</p>
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(["day", "week", "month"] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant="ghost"
                    className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${
                      viewMode === mode
                        ? "bg-black text-white shadow-sm hover:bg-gray-800"
                        : "bg-transparent text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    }`}
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading schedule...</p>
                </div>
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.slice(0, 5).map((appointment: Appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setBookingModalOpen(true);
                    }}
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
                          <span>{getAppointmentTypeName(appointment.type, appointment.customType)} • {appointment.doctor}</span>
                          <Badge variant={appointment.status === "pending" ? "outline" : "secondary"}>
                            {appointment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p>No appointments scheduled</p>
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
            {portal === "admin" && (
              <>
                <Button
                  variant="outline"
                  className="w-full p-4 text-left h-auto hover:bg-blue-50"
                  onClick={() => openCreateModal()}
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-medium">Schedule Appointment</div>
                      <div className="text-sm text-muted-foreground">Book a new patient appointment</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="brand"
                  className="w-full p-4 text-left h-auto"
                  onClick={() => openAddPatientModal()}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-white" />
                    <div>
                      <div className="font-medium text-white">Add New Patient</div>
                      <div className="text-sm text-violet-100">Register a new patient</div>
                    </div>
                  </div>
                </Button>
              </>
            )}
            {portal === "doctor" && (
              <>
                <Button
                  variant="outline"
                  className="w-full p-4 text-left h-auto hover:bg-violet-50"
                  onClick={() => openCreateModal()}
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-6 w-6 text-violet-600" />
                    <div>
                      <div className="font-medium">Schedule Appointment</div>
                      <div className="text-sm text-muted-foreground">Book a new patient appointment</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full p-4 text-left h-auto hover:bg-blue-50"
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
              </>
            )}
            {portal === "patient" && (
              <>
                <Button
                  variant="outline"
                  className="w-full p-4 text-left h-auto hover:bg-blue-50"
                  onClick={() => window.location.href = "/patient/doctors"}
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-medium">Book Appointment</div>
                      <div className="text-sm text-muted-foreground">Find doctors and book a new appointment</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full p-4 text-left h-auto hover:bg-purple-50"
                  onClick={() => window.location.href = "/patient/appointments"}
                >
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                    <div>
                      <div className="font-medium">View All Appointments</div>
                      <div className="text-sm text-muted-foreground">See your complete appointment history</div>
                    </div>
                  </div>
                </Button>
              </>
            )}
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