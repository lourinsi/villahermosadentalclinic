"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, AlertCircle, CheckCircle2, Heart } from "lucide-react";
import { toast } from "sonner";
import { formatTimeTo12h } from "@/lib/time-slots";

interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  type: number;
  customType?: string;
  price: number;
  status: string;
  paymentStatus: string;
  balance: number;
  totalPaid: number;
  duration: number;
  notes: string;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    totalSpent: 0,
    pendingPayment: 0,
  });

  useEffect(() => {
    if (user?.role !== "patient") {
      router.push("/");
      return;
    }

    fetchAppointments();
  }, [user, router]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("http://localhost:3001/api/appointments", {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        const appointments = json.data.filter((apt: Appointment) => apt.status !== "cancelled");
        setAppointments(appointments);
        calculateStats(appointments);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (appointments: Appointment[]) => {
    const now = new Date();
    let upcoming = 0;
    let completed = 0;
    let totalSpent = 0;
    let pendingPayment = 0;

    appointments.forEach((apt) => {
      const aptDate = new Date(apt.date);
      if (aptDate > now && apt.status !== "completed") {
        upcoming++;
      } else if (apt.status === "completed") {
        completed++;
      }
      totalSpent += apt.totalPaid || 0;
      if (apt.balance > 0) {
        pendingPayment += apt.balance;
      }
    });

    setStats({
      total: appointments.length,
      upcoming,
      completed,
      totalSpent,
      pendingPayment,
    });
  };

  const upcomingAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    return aptDate > new Date() && apt.status !== "completed" && apt.status !== "cancelled";
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user?.username}!</h1>
          <p className="text-gray-600">Manage your dental appointments and track your health</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming}</div>
              <p className="text-xs text-gray-500">Next scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-gray-500">Finished visits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{stats.totalSpent.toLocaleString()}</div>
              <p className="text-xs text-gray-500">Total spent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{stats.pendingPayment.toLocaleString()}</div>
              <p className="text-xs text-gray-500">Outstanding</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No upcoming appointments</p>
                <Button className="mt-4" onClick={() => router.push("/patient/doctors")}>
                  Book an Appointment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(apt.status)}`}>
                          {apt.status?.toUpperCase()}
                        </span>
                        <span className={`text-sm font-medium ${getPaymentStatusColor(apt.paymentStatus)}`}>
                          Payment: {apt.paymentStatus?.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{apt.customType || `Type ${apt.type}`}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(apt.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatTimeTo12h(apt.time)}
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          Balance: ₱{apt.balance.toLocaleString()}
                        </div>
                        <div className="text-gray-600">
                          Dr. {apt.doctor}
                        </div>
                      </div>
                      {apt.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">Notes: {apt.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={() => router.push(`/patient/appointments/${apt.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Service</th>
                    <th className="text-left py-3 px-4 font-semibold">Doctor</th>
                    <th className="text-left py-3 px-4 font-semibold">Price</th>
                    <th className="text-left py-3 px-4 font-semibold">Paid</th>
                    <th className="text-left py-3 px-4 font-semibold">Balance</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(apt.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{formatTimeTo12h(apt.time)}</td>
                      <td className="py-3 px-4">{apt.customType || `Type ${apt.type}`}</td>
                      <td className="py-3 px-4">Dr. {apt.doctor}</td>
                      <td className="py-3 px-4">₱{apt.price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-green-600 font-semibold">₱{(apt.totalPaid || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={apt.balance > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                          ₱{apt.balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(apt.status)}`}>
                          {apt.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}