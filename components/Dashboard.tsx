"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Users, Calendar, DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

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

const appointmentTypes = [
  { name: "Cleaning", value: 35, color: "#3b82f6" },
  { name: "Checkup", value: 25, color: "#10b981" },
  { name: "Filling", value: 20, color: "#f59e0b" },
  { name: "Cosmetic", value: 15, color: "#8b5cf6" },
  { name: "Emergency", value: 5, color: "#ef4444" }
];

const recentAppointments = [
  { time: "09:00 AM", patient: "John Smith", type: "Cleaning", status: "confirmed" },
  { time: "10:30 AM", patient: "Sarah Davis", type: "Checkup", status: "in-progress" },
  { time: "11:45 AM", patient: "Mike Johnson", type: "Filling", status: "waiting" },
  { time: "02:00 PM", patient: "Emily Brown", type: "Consultation", status: "confirmed" },
  { time: "03:30 PM", patient: "David Wilson", type: "Cleaning", status: "confirmed" }
];

export function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening at your clinic today.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
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
        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900">{appointment.time}</div>
                    <div>
                      <div className="text-sm font-medium">{appointment.patient}</div>
                      <div className="text-xs text-muted-foreground">{appointment.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {appointment.status === "confirmed" && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">Confirmed</span>
                      </div>
                    )}
                    {appointment.status === "in-progress" && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">In Progress</span>
                      </div>
                    )}
                    {appointment.status === "waiting" && (
                      <div className="flex items-center space-x-1 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Waiting</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button className="w-full p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-medium">Schedule Appointment</div>
                  <div className="text-sm text-muted-foreground">Book a new patient appointment</div>
                </div>
              </div>
            </button>
            
            <button className="w-full p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">Add New Patient</div>
                  <div className="text-sm text-muted-foreground">Register a new patient</div>
                </div>
              </div>
            </button>
            
            <button className="w-full p-4 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-6 w-6 text-purple-600" />
                <div>
                  <div className="font-medium">View Reports</div>
                  <div className="text-sm text-muted-foreground">Financial and clinical reports</div>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}