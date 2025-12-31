"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Users, Calendar, DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useAppointmentModal } from "./AdminLayout";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Badge } from "./ui/badge";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName, APPOINTMENT_TYPES } from "../lib/appointment-types";
import { parseBackendDateToLocal } from "../lib/utils";

const statsData = [
  {
    title: "Total Patients",
    value: "1,247",
    change: "+12%",
    icon: Users,
    color: "text-blue-600"
  },
  {
    title: "Today's Appointments",
    value: "23",
    change: "+2",
    icon: Calendar,
    color: "text-green-600"
  },
  {
    title: "Monthly Revenue",
    value: "$48,250",
    change: "+8.2%",
    icon: DollarSign,
    color: "text-purple-600"
  },
  {
    title: "Patient Satisfaction",
    value: "4.9/5",
    change: "+0.1",
    icon: TrendingUp,
    color: "text-orange-600"
  }
];

const revenueData = [
  { month: "Jan", revenue: 42000, appointments: 180 },
  { month: "Feb", revenue: 38000, appointments: 165 },
  { month: "Mar", revenue: 45000, appointments: 195 },
  { month: "Apr", revenue: 41000, appointments: 175 },
  { month: "May", revenue: 48000, appointments: 210 },
  { month: "Jun", revenue: 48250, appointments: 220 }
];

// derive appointment types/counts from real appointments
const colorPalette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

const recentAppointments = [
  { time: "09:00 AM", patient: "John Smith", type: "Cleaning", status: "confirmed" },
  { time: "10:30 AM", patient: "Sarah Davis", type: "Checkup", status: "in-progress" },
  { time: "11:45 AM", patient: "Mike Johnson", type: "Filling", status: "waiting" },
  { time: "02:00 PM", patient: "Emily Brown", type: "Consultation", status: "confirmed" },
  { time: "03:30 PM", patient: "David Wilson", type: "Cleaning", status: "confirmed" }
];

export function Dashboard() {
  const { openCreateModal, openAddPatientModal, appointments, refreshTrigger } = useAppointmentModal();
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [totalPatients, setTotalPatients] = useState(0);
  const [isLoadingView, setIsLoadingView] = useState(false);

  // Fetch total patients from backend
  useEffect(() => {
    const fetchPatientCount = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/patients?page=1&limit=1");
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

  const filteredAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === "day") {
      const dayStr = today.toISOString().split("T")[0];
      return appointments.filter(apt => parseBackendDateToLocal(apt.date).toISOString().split("T")[0] === dayStr);
    } else if (viewMode === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return appointments.filter(apt => {
        const aptDate = parseBackendDateToLocal(apt.date);
        return aptDate >= weekStart && aptDate <= weekEnd;
      });
    } else {
      // month - today's month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      return appointments.filter(apt => {
        const aptDate = parseBackendDateToLocal(apt.date);
        return aptDate >= monthStart && aptDate <= monthEnd;
      });
    }
  }, [appointments, viewMode]);

  // Build dynamic stats based on backend data
  const dynamicStats = [
    {
      title: "Total Patients",
      value: totalPatients.toString(),
      change: "+12%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: viewMode === "day" ? "Today's Appointments" : viewMode === "week" ? "This Week's Appointments" : "This Month's Appointments",
      value: filteredAppointments.length.toString(),
      change: "+2",
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Monthly Revenue",
      value: "$48,250",
      change: "+8.2%",
      icon: DollarSign,
      color: "text-purple-600"
    },
    {
      title: "Patient Satisfaction",
      value: "4.9/5",
      change: "+0.1",
      icon: TrendingUp,
      color: "text-orange-600"
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

  const appointmentTypeCounts = appointments.reduce<Record<string, number>>((acc, apt) => {
    const key = getAppointmentTypeName(apt.type, apt.customType);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalAppointments = Object.values(appointmentTypeCounts).reduce((s, v) => s + v, 0) || 1;

  const appointmentTypes = Object.keys(appointmentTypeCounts).map((name, idx) => ({
    name,
    value: Math.round((appointmentTypeCounts[name] / totalAppointments) * 100),
    color: colorPalette[idx % colorPalette.length]
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening at your clinic today.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dynamicStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any, name: any) => [
                  name === 'revenue' ? `$${value.toLocaleString()}` : value,
                  name === 'revenue' ? 'Revenue' : 'Appointments'
                ]} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
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
                <Tooltip formatter={(value: any) => [`${value}%`, 'Percentage']} />
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
        {/* Today's Schedule / Appointments */}
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
                    className={`
                      px-3 py-1 text-xs font-medium rounded transition-all duration-200 
                      ${viewMode === mode 
                        ? "bg-black text-white shadow-sm hover:bg-gray-800" 
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
                filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                          <span>{getAppointmentTypeName(appointment.type, appointment.customType)} • {appointment.doctor} {appointment.price != null && `• $${appointment.price.toFixed(2)}`}</span>
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
              className="w-full p-4 text-left h-auto transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-blue-50 active:scale-95"
              onClick={() => openCreateModal()}
            >
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-blue-600 transition-colors duration-200 group-hover:text-blue-700" />
                <div>
                  <div className="font-medium transition-colors duration-200">Schedule Appointment</div>
                  <div className="text-sm text-muted-foreground">Book a new patient appointment</div>
                </div>
              </div>
            </Button>
            
                        <Button
              variant="brand"
              className="w-full p-4 text-left h-auto transform transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
              onClick={() => openAddPatientModal()}
            >
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-white transition-transform duration-200 group-hover:scale-110" />
                <div>
                  <div className="font-medium text-white">Add New Patient</div>
                  <div className="text-sm text-violet-100">Register a new patient</div>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full p-4 text-left h-auto transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-purple-50 active:scale-95"
            >
              <div className="flex items-center space-x-3">
                <DollarSign className="h-6 w-6 text-purple-600 transition-colors duration-200 group-hover:text-purple-700" />
                <div>
                  <div className="font-medium transition-colors duration-200">View Reports</div>
                  <div className="text-sm text-muted-foreground">Financial and clinical reports</div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}