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
      // Extract patient name from email (part before @)
      const emailPrefix = user.username.split('@')[0];
      filtered = filtered.filter((apt: Appointment) =>
        apt.patientName.toLowerCase().includes(emailPrefix.toLowerCase()) ||
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
        });
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
      const firstName = user?.username ? user.username.split('@')[0] : "Doctor";
      return {
        title: `Welcome, Dr. ${firstName}!`,
        subtitle: `Here's your schedule overview for ${viewMode === "day" ? "today" : viewMode === "week" ? "this week" : "this month"}.`
      };
    } else {
      const firstName = user?.username ? user.username.split('@')[0] : "there";
      return {
        title: `Welcome back, ${firstName}!`,
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
          <Card key={index} className="relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-110 ${stat.bgColor}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-2xl shadow-sm transform transition-transform duration-300 group-hover:rotate-12 ${stat.bgColor} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-extrabold tracking-tight text-gray-900 mb-1">{stat.value}</div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                  stat.title === "Pending Approvals" || stat.title === "Pending Balance" 
                    ? "bg-amber-100 text-amber-700" 
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {stat.change}
                </span>
                <span className="text-gray-400 text-xs font-normal">vs last month</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Column - Revenue for Admin/Doctor, Schedule for Patient */}
        {portal === "admin" || portal === "doctor" ? (
          <Card className="lg:col-span-2 border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  {portal === "admin" ? "Revenue Overview" : "Appointment Trends"}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Monthly statistics for clinic growth
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                  <TrendingUp className="h-3 w-3" />
                  <span>+12.5%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number | string, name: string) => [
                      name === 'revenue' ? `₱${Number(value).toLocaleString()}` : value,
                      name === 'revenue' ? 'Revenue' : 'Appointments'
                    ]} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2 border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">Your Next Appointment</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Don't miss your upcoming visit</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => window.location.href = "/patient/appointments"}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredAppointments.length > 0 ? (
                <div className="relative p-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Calendar className="h-32 w-32" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 bg-white/20 w-fit px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                        <Clock className="h-3 w-3" />
                        <span>Confirmed</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight">
                          {getAppointmentTypeName(filteredAppointments[0].type, filteredAppointments[0].customType)}
                        </h3>
                        <p className="text-violet-100 font-medium">with Dr. {filteredAppointments[0].doctor}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm font-medium">
                        <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                          <Calendar className="h-4 w-4" />
                          <span>{parseBackendDateToLocal(filteredAppointments[0].date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                          <Clock className="h-4 w-4" />
                          <span>{filteredAppointments[0].time}</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="bg-white text-indigo-600 hover:bg-violet-50 font-bold px-8 py-6 rounded-2xl h-auto w-full md:w-auto shadow-xl"
                      onClick={() => {
                        setSelectedAppointment(filteredAppointments[0]);
                        setBookingModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-semibold text-lg">No appointments yet</p>
                  <p className="text-gray-500 mb-6 text-sm">Schedule your first visit with us today!</p>
                  <Button 
                    className="bg-violet-600 hover:bg-violet-700 text-white px-8"
                    onClick={() => window.location.href = "/patient/doctors"}
                  >
                    Book Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Appointment Types */}
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="border-b border-gray-50 pb-4">
            <CardTitle className="text-lg font-bold text-gray-800">Visit Statistics</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {(() => {
              // Use all-time appointments if current view has no data
              const appointmentsToAnalyze = filteredAppointments.length === 0 ? appointments : filteredAppointments;
              const isAllTime = filteredAppointments.length === 0;
              
              if (appointmentsToAnalyze.length === 0) return null;

              const typeCounts = appointmentsToAnalyze.reduce<Record<string, number>>((acc, apt: Appointment) => {
                const key = getAppointmentTypeName(apt.type, apt.customType);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {});

              const total = Object.values(typeCounts).reduce((s: number, v: number) => s + v, 0) || 1;
              const chartData = Object.keys(typeCounts).map((name, idx) => ({
                name,
                value: Math.round((typeCounts[name] / total) * 100),
                color: colorPalette[idx % colorPalette.length]
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
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
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
                          <span>{type.name}</span>
                        </div>
                        <span className="font-medium">{type.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule View */}
        <Card className="border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">Recent Schedule</CardTitle>
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
                filteredAppointments.slice(0, 5).map((appointment: Appointment) => (
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
                          {portal === "patient" ? `Dr. ${appointment.doctor}` : appointment.patientName}
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
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="p-4 bg-gray-50 rounded-full mb-4">
                    <Heart className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">No appointments scheduled</p>
                </div>
              )}
            </div>
            {filteredAppointments.length > 5 && (
              <div className="p-4 bg-gray-50/50 text-center">
                <Button variant="link" className="text-xs font-bold text-violet-600 hover:text-violet-700 p-0 h-auto">
                  View {filteredAppointments.length - 5} more appointments
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-50 pb-4">
            <CardTitle className="text-xl font-bold text-gray-800">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {portal === "admin" && (
                <>
                  <Button
                    variant="outline"
                    className="group relative flex items-center justify-between p-6 h-auto border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 rounded-2xl transition-all duration-300 overflow-hidden"
                    onClick={() => openCreateModal()}
                  >
                    <div className="flex items-center space-x-4 relative z-10">
                      <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-900">Schedule Appointment</div>
                        <div className="text-xs text-gray-500">Book a new patient visit</div>
                      </div>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-blue-100/20 to-transparent pointer-events-none" />
                  </Button>
                  <Button
                    className="group relative flex items-center justify-between p-6 h-auto bg-violet-600 hover:bg-violet-700 text-white border-none rounded-2xl transition-all duration-300 shadow-lg hover:shadow-violet-200"
                    onClick={() => openAddPatientModal()}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-white/20 text-white">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold">Add New Patient</div>
                        <div className="text-xs text-violet-100">Register a new record</div>
                      </div>
                    </div>
                  </Button>
                </>
              )}
              {portal === "doctor" && (
                <>
                  <Button
                    variant="outline"
                    className="group flex items-center justify-between p-6 h-auto border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 rounded-2xl transition-all duration-300"
                    onClick={() => openCreateModal()}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-900">Book Appointment</div>
                        <div className="text-xs text-gray-500">Schedule a patient visit</div>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="group flex items-center justify-between p-6 h-auto border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 rounded-2xl transition-all duration-300"
                    onClick={() => window.location.href = "/doctor/calendar"}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-900">Full Calendar</div>
                        <div className="text-xs text-gray-500">See complete schedule</div>
                      </div>
                    </div>
                  </Button>
                </>
              )}
              {portal === "patient" && (
                <>
                  <Button
                    className="group relative flex items-center justify-between p-6 h-auto bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-2xl transition-all duration-300 shadow-lg hover:shadow-indigo-200"
                    onClick={() => window.location.href = "/patient/doctors"}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-white/20 text-white">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold">Book Appointment</div>
                        <div className="text-xs text-indigo-100">Find doctors & book online</div>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="group flex items-center justify-between p-6 h-auto border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 rounded-2xl transition-all duration-300"
                    onClick={() => window.location.href = "/patient/appointments"}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-900">My Appointments</div>
                        <div className="text-xs text-gray-500">View visit history</div>
                      </div>
                    </div>
                  </Button>
                </>
              )}
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