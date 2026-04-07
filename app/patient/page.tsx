"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, FileText, Plus, Eye, Edit2, Trash2 } from "lucide-react";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { formatTimeTo12h } from "@/lib/time-slots";
import { toast } from "sonner";
import BookingModal from "@/components/BookingModal";

interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  customType: string;
  price: number;
  status: "scheduled" | "reserved" | "pending" | "completed" | "cancelled";
  paymentStatus: "paid" | "unpaid" | "half-paid";
  totalPaid: number;
  balance: number;
  notes: string;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "patient") {
      router.push("/");
      return;
    }

    router.replace("/patient/dashboard");
  }, [user, router]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("http://localhost:3001/api/appointments/patient", {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Failed to fetch appointments:", res.status);
        return;
      }

      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        const sorted = json.data.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setAppointments(sorted);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

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
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "half-paid":
        return "bg-yellow-100 text-yellow-700";
      case "unpaid":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsBookingModalOpen(true);
  };

  const handleBookingComplete = () => {
    setSelectedAppointment(null);
    fetchAppointments();
  };

  const totalAppointments = appointments.length;
  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.date) > new Date() && apt.status !== "cancelled"
  ).length;
  const totalBalance = appointments.reduce((sum, apt) => sum + (apt.balance || 0), 0);
  const totalPaid = appointments.reduce((sum, apt) => sum + (apt.totalPaid || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-600 mt-2">Manage your dental appointments and payments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalAppointments}</div>
              <p className="text-xs text-gray-500 mt-1">{upcomingAppointments} upcoming</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">₱{totalPaid.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">payments made</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">₱{totalBalance.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">still to pay</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Action</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  setSelectedAppointment(null);
                  setIsBookingModalOpen(true);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Book Now
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No appointments yet</p>
                <Button
                  onClick={() => {
                    setSelectedAppointment(null);
                    setIsBookingModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Book Your First Appointment
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date & Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Service</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Doctor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Balance</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {new Date(apt.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeTo12h(apt.time)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-900 font-medium">{apt.customType}</span>
                        </td>
                        <td className="py-4 px-4 text-gray-700">{apt.doctor}</td>
                        <td className="py-4 px-4">
                          <span className="font-medium text-gray-900">₱{apt.price.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(apt.status)}`}>
                            {apt.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(apt.paymentStatus)}`}>
                            {apt.paymentStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-semibold ${apt.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                            ₱{apt.balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditAppointment(apt)}
                              className="h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BookingModal
        open={isBookingModalOpen}
        onOpenChange={setIsBookingModalOpen}
        appointmentToEdit={selectedAppointment as any}
        onBooked={handleBookingComplete}
      />
    </div>
  );
}