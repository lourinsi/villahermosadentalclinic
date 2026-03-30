"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { useAppointmentStatuses } from "@/hooks/useAppointmentStatuses";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import BookingModal from "./BookingModal";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  AlertCircle, 
  DollarSign, 
  ClipboardList,
  Search,
  Calendar as CalendarIcon,
  History,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  MoreVertical,
  CalendarCheck2,
  CalendarX2,
  Mail,
  Phone
} from "lucide-react";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal } from "../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface RequestsViewProps {
  doctorFilter?: string;
}

export function RequestsView({ doctorFilter }: RequestsViewProps = {}) {
  const { appointments, isLoading, updateAppointment, openEditModal, refreshAppointments } = useAppointmentModal();
  const { statuses: APPOINTMENT_STATUSES } = useAppointmentStatuses();
  
  // Function to update notifications when appointment data changes
  const updateNotificationsForAppointment = async (appointmentId: string, changes: { status?: string; paymentStatus?: string }) => {
    try {
      // Find the appointment to get patient info
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (!appointment) return;

      // Update all notifications related to this appointment
      await fetch(`http://localhost:3001/api/notifications/update-by-appointment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          updates: changes,
        }),
      });
    } catch (error) {
      console.error("Error updating notifications for appointment:", error);
      // Don't show toast - this is a background sync
    }
  };
  
  // Booking Modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedAppointmentToEdit, setSelectedAppointmentToEdit] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useEffect(() => {
    // Fetch all appointments including unpaid/pending to show in requests view
    refreshAppointments({ includeUnpaid: true });
  }, [refreshAppointments]);

  // Normalize status strings to canonical backend keys for reliable comparisons
  const canonicalStatus = (s?: string) => {
    if (!s) return "";
    return String(s).toLowerCase().trim();
  };

  // Requests are those with unpaid or half-paid payment status
  const isRequestPaymentStatus = (paymentStatus?: string) => {
    const k = canonicalStatus(paymentStatus);
    return k === "unpaid" || k === "half-paid";
  };

  // History shows completed appointments (not pending payments)
  const isHistoryStatus = (status?: string) => {
    const k = canonicalStatus(status);
    return k === "scheduled" || k === "completed" || k === "cancelled";
  };

  // Pending requests include these statuses
  const isPendingRequestStatus = (status?: string) => {
    const k = canonicalStatus(status);
    return k === "pending" || k === "reserved" || k === "tentative" || k === "to-pay" || k === "half-paid";
  };

  // Pending filters state
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [pendingStatusFilter, setPendingStatusFilter] = useState("all");
  const [pendingDoctorFilter, setPendingDoctorFilter] = useState("all");
  const [pendingDateFilter, setPendingDateFilter] = useState("");
  const [pendingSortColumn, setPendingSortColumn] = useState<string | null>(null);
  const [pendingSortDirection, setPendingSortDirection] = useState<"asc" | "desc">("asc");

  // History filters state
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [historySortColumn, setHistorySortColumn] = useState<string | null>(null);
  const [historySortDirection, setHistorySortDirection] = useState<"asc" | "desc">("asc");
  
  // Confirmation dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{appointment: Appointment, newStatus: Appointment['status']} | null>(null);

  const getInitials = (name: string) => {
    if (!name) return "P";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const requests = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesDoctor = !doctorFilter || (apt.doctor || "").toLowerCase() === doctorFilter.toLowerCase();
      // Requests are those with pending statuses
      if (!isPendingRequestStatus(apt.status) || !matchesDoctor) return false;

      // ...existing code...
      if (pendingSearchTerm && !apt.patientName.toLowerCase().includes(pendingSearchTerm.toLowerCase()) && 
          !getAppointmentTypeName(apt.type, apt.customType).toLowerCase().includes(pendingSearchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter (compare canonical keys so UI filters like 'To Pay' or 'tentative' still match backend values)
      if (pendingStatusFilter !== "all" && canonicalStatus(apt.status) !== canonicalStatus(pendingStatusFilter)) {
        return false;
      }

      // Doctor filter
      if (pendingDoctorFilter !== "all" && apt.doctor !== pendingDoctorFilter) {
        return false;
      }
      
      // Date filter
      if (pendingDateFilter && apt.date !== pendingDateFilter) {
        return false;
      }

      return true;
    });
  }, [appointments, doctorFilter, pendingSearchTerm, pendingStatusFilter, pendingDoctorFilter, pendingDateFilter, refreshTrigger]);

  const history = useMemo(() => {
    return appointments
      .filter((apt) => {
        const matchesDoctor = !doctorFilter || (apt.doctor || "").toLowerCase() === doctorFilter.toLowerCase();
        // In history, we show only scheduled, completed, or cancelled appointments
        if (!isHistoryStatus(apt.status) || !matchesDoctor) return false;
        
        // Search filter
        if (historySearchTerm && !apt.patientName.toLowerCase().includes(historySearchTerm.toLowerCase()) && 
            !getAppointmentTypeName(apt.type, apt.customType).toLowerCase().includes(historySearchTerm.toLowerCase())) {
          return false;
        }
        
        // Status filter (use canonical comparison)
        if (historyStatusFilter !== "all" && canonicalStatus(apt.status) !== canonicalStatus(historyStatusFilter)) {
          return false;
        }
        
        // Date filter
        if (historyDateFilter && apt.date !== historyDateFilter) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by date and time descending (latest first)
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });
  }, [appointments, doctorFilter, historySearchTerm, historyStatusFilter, historyDateFilter, refreshTrigger]);

  const handleApprove = async (appointment: Appointment) => {
    try {
      // Approve any pending/reserved request to scheduled
      const newStatus = appointment.status === "pending" || appointment.status === "reserved" ? "scheduled" : "scheduled";
      await updateAppointment(appointment.id, { status: newStatus });
      toast.success(`Appointment for ${appointment.patientName} approved`);
      // Refresh notifications to show the new status change notification
      refreshAppointments();
      // Also refresh notifications from NotificationPage context if available
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshNotifications'));
      }, 500);
    } catch {
      toast.error("Failed to approve appointment");
    }
  };

  const handleReject = async (appointment: Appointment) => {
    try {
      await updateAppointment(appointment.id, { status: "cancelled" });
      toast.success(`Appointment for ${appointment.patientName} rejected`);
      // Refresh notifications to show the new status change notification
      refreshAppointments();
      // Also refresh notifications from NotificationPage context if available
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshNotifications'));
      }, 500);
    } catch {
      toast.error("Failed to reject appointment");
    }
  };

  const handleStatusChangeRequest = (appointment: Appointment, statusKey: string) => {
    // statusKey comes from the select dropdown and directly maps to backend status values
    setPendingStatusChange({ appointment, newStatus: statusKey as Appointment['status'] });
    setIsConfirmOpen(true);
  };

  const handlePaymentStatusChange = async (appointmentId: string, newPaymentStatus: string) => {
    try {
      await updateAppointment(appointmentId, { paymentStatus: newPaymentStatus as any });
      toast.success(`Payment status updated successfully`);
      // Refresh appointments and notifications to show the new payment status change notification
      refreshAppointments();
      // Also refresh notifications from NotificationPage context if available
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshNotifications'));
      }, 500);
    } catch {
      toast.error("Failed to update payment status");
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    
    const { appointment, newStatus } = pendingStatusChange;
    try {
      await updateAppointment(appointment.id, { status: newStatus });
      toast.success(`Status for ${appointment.patientName} updated to ${newStatus}`);
      // Refresh appointments and notifications to show the new status change notification
      refreshAppointments();
      // Also refresh notifications from NotificationPage context if available
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshNotifications'));
      }, 500);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsConfirmOpen(false);
      setPendingStatusChange(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const k = canonicalStatus(status);
    switch (k) {
      case "pending":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-medium">Pending</Badge>;
      case "reserved":
        return <Badge className="bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 font-medium">Reserved</Badge>;
      case "scheduled":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium">Scheduled</Badge>;
      case "completed":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-medium">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-medium">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="font-medium">{status}</Badge>;
    }
  };

  const handlePendingSort = (column: string) => {
    if (pendingSortColumn === column) {
      setPendingSortDirection(pendingSortDirection === "asc" ? "desc" : "asc");
    } else {
      setPendingSortColumn(column);
      setPendingSortDirection("asc");
    }
  };

  const handleHistorySort = (column: string) => {
    if (historySortColumn === column) {
      setHistorySortDirection(historySortDirection === "asc" ? "desc" : "asc");
    } else {
      setHistorySortColumn(column);
      setHistorySortDirection("asc");
    }
  };

  const getSortIcon = (column: string, isPending: boolean) => {
    const currentColumn = isPending ? pendingSortColumn : historySortColumn;
    const currentDirection = isPending ? pendingSortDirection : historySortDirection;
    
    if (currentColumn === column) {
      return currentDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4 opacity-40" />;
  };

  const sortedRequests = useMemo(() => {
    const sorted = [...requests];
    if (pendingSortColumn) {
      sorted.sort((a, b) => {
        let aVal, bVal;
        
        switch (pendingSortColumn) {
          case "date":
            aVal = new Date(`${a.date}T${a.time}`).getTime();
            bVal = new Date(`${b.date}T${b.time}`).getTime();
            break;
          case "patient":
            aVal = a.patientName.toLowerCase();
            bVal = b.patientName.toLowerCase();
            break;
          case "service":
            aVal = getAppointmentTypeName(a.type, a.customType).toLowerCase();
            bVal = getAppointmentTypeName(b.type, b.customType).toLowerCase();
            break;
          case "doctor":
            aVal = a.doctor.toLowerCase();
            bVal = b.doctor.toLowerCase();
            break;
          case "status":
            aVal = canonicalStatus(a.status);
            bVal = canonicalStatus(b.status);
            break;
          case "booked":
            aVal = new Date(a.createdAt || 0).getTime();
            bVal = new Date(b.createdAt || 0).getTime();
            break;
          case "updated":
            aVal = new Date(a.updatedAt || 0).getTime();
            bVal = new Date(b.updatedAt || 0).getTime();
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return pendingSortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return pendingSortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [requests, pendingSortColumn, pendingSortDirection]);

  const sortedHistory = useMemo(() => {
    const sorted = [...history];
    if (historySortColumn) {
      sorted.sort((a, b) => {
        let aVal, bVal;
        
        switch (historySortColumn) {
          case "patient":
            aVal = a.patientName.toLowerCase();
            bVal = b.patientName.toLowerCase();
            break;
          case "service":
            aVal = getAppointmentTypeName(a.type, a.customType).toLowerCase();
            bVal = getAppointmentTypeName(b.type, b.customType).toLowerCase();
            break;
          case "status":
            aVal = canonicalStatus(a.status);
            bVal = canonicalStatus(b.status);
            break;
          case "booked":
            aVal = new Date(a.createdAt || 0).getTime();
            bVal = new Date(b.createdAt || 0).getTime();
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return historySortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return historySortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [history, historySortColumn, historySortDirection]);

  // Build status options dynamically from backend appointments (preserve a representative 'raw' value)
  const statusOptions = useMemo(() => {
    const map = new Map<string, string>(); // key -> raw
    appointments.forEach(a => {
      const raw = String(a.status || "").trim();
      const key = canonicalStatus(raw) || raw;
      if (!map.has(key)) map.set(key, raw || key);
    });
    return Array.from(map.entries()).map(([key, raw]) => ({ key, raw, label: (raw || key).toString().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  }, [appointments]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-violet-100 rounded-lg">
              <ClipboardList className="h-6 w-6 text-violet-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Booking Management
            </h1>
          </div>
          <p className="text-muted-foreground ml-11">
            {doctorFilter 
              ? "Review pending requests or browse processed booking history for your patients."
              : "Review pending requests or browse processed booking history for all doctors."}
          </p>
        </div>
        <Button 
          onClick={() => refreshAppointments({ includeUnpaid: true })} 
          variant="outline" 
          className="flex items-center gap-2 border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800 transition-all shadow-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Refresh List
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-gray-100/80 p-1 h-12 border border-gray-200">
          <TabsTrigger value="pending" className="flex items-center gap-2 px-6 h-10 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm transition-all font-medium">
            <Clock className="h-4 w-4" />
            Pending Requests
            {requests.length > 0 && (
              <Badge className="ml-1.5 bg-violet-600 text-[10px] px-1.5 h-4 min-w-4 flex items-center justify-center rounded-full border-none">
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 px-6 h-10 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm transition-all font-medium">
            <History className="h-4 w-4" />
            Requests History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card className="shadow-sm border-violet-100 overflow-hidden">
            <CardHeader className="pb-4 bg-gray-50/30">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800">Request Filters</CardTitle>
                  <p className="text-xs text-muted-foreground">Filter through pending appointment requests</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patient or service..."
                      className="pl-9 bg-white border-violet-100 focus-visible:ring-violet-400"
                      value={pendingSearchTerm}
                      onChange={(e) => setPendingSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-white border-violet-100">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {APPOINTMENT_STATUSES.filter(opt => opt.value && opt.value.trim()).map(opt => (
                        <SelectItem key={opt.key} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!doctorFilter && (
                    <Select value={pendingDoctorFilter} onValueChange={setPendingDoctorFilter}>
                      <SelectTrigger className="w-[160px] bg-white border-violet-100">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue placeholder="Doctor" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Doctors</SelectItem>
                        {Array.from(new Set(appointments.map(apt => apt.doctor))).map(doctor => (
                          <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {(pendingSearchTerm || pendingStatusFilter !== "all" || pendingDoctorFilter !== "all" || pendingDateFilter) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setPendingSearchTerm("");
                        setPendingStatusFilter("all");
                        setPendingDoctorFilter("all");
                        setPendingDateFilter("");
                      }}
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 h-9"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 border-t">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="cursor-pointer hover:text-primary transition-colors pl-6 h-12" onClick={() => handlePendingSort("date")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Appointment Date
                        <div className="flex flex-col">
                          {getSortIcon("date", true)}
                        </div>
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handlePendingSort("patient")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Patient
                        {getSortIcon("patient", true)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handlePendingSort("service")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Service
                        {getSortIcon("service", true)}
                      </div>
                    </TableHead>
                    {!doctorFilter && (
                      <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handlePendingSort("doctor")}>
                        <div className="flex items-center gap-2 font-semibold">
                          Doctor
                          {getSortIcon("doctor", true)}
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handlePendingSort("status")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Status
                        {getSortIcon("status", true)}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold h-12">Payment</TableHead>
                    <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handlePendingSort("booked")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Booked
                        {getSortIcon("booked", true)}
                      </div>
                    </TableHead>
                    <TableHead className="text-right pr-6 h-12 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={doctorFilter ? 8 : 9} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                          Loading requests...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={doctorFilter ? 7 : 8} className="py-24">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <Clock className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">No requests found</h3>
                          <p className="text-sm text-muted-foreground max-w-[300px] mt-1">
                            We couldn&apos;t find any appointment requests matching your current filters.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-6 border-violet-200 text-violet-700 hover:bg-violet-50"
                            onClick={() => {
                              setPendingSearchTerm("");
                              setPendingStatusFilter("all");
                              setPendingDoctorFilter("all");
                            }}
                          >
                            Reset Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRequests.map((request) => (
                      <TableRow key={request.id} className="group hover:bg-violet-50/30 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {parseBackendDateToLocal(request.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              {request.time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-violet-100 shadow-sm">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-bold">
                                {getInitials(request.patientName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{request.patientName}</span>
                              {request.phone && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  {request.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">{getAppointmentTypeName(request.type, request.customType)}</span>
                          </div>
                        </TableCell>
                        {!doctorFilter && (
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none font-medium px-2 py-0">
                              Dr. {request.doctor.split(' ').pop()}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.paymentStatus?.toLowerCase() === "paid" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium px-2">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          ) : request.paymentStatus?.toLowerCase() === "half-paid" ? (
                            <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 font-medium px-2">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Partial
                            </Badge>
                          ) : request.paymentStatus?.toLowerCase() === "pay-at-clinic" ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-medium px-2">
                              <DollarSign className="h-3 w-3 mr-1" />
                              At Clinic
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal px-2">
                              Unpaid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            }) : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedAppointmentToEdit(request);
                                setBookingModalOpen(true);
                              }} 
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                            
                            <Button 
                              size="sm" 
                              className="h-8 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-sm font-medium"
                              onClick={() => handleStatusChangeRequest(request, 'scheduled')}
                            >
                              <CalendarCheck2 className="h-3.5 w-3.5 mr-1.5" />
                              Approve
                            </Button>
                            
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                              onClick={() => handleStatusChangeRequest(request, 'cancelled')}
                              title="Reject Request"
                            >
                              <CalendarX2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="shadow-sm border-violet-100 overflow-hidden">
            <CardHeader className="pb-4 bg-gray-50/30">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800">History Filters</CardTitle>
                  <p className="text-xs text-muted-foreground">Browse through processed booking history</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patient or service..."
                      className="pl-9 bg-white border-violet-100 focus-visible:ring-violet-400"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-9 w-[180px] bg-white border-violet-100"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                    />
                  </div>
                  <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-white border-violet-100">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {APPOINTMENT_STATUSES.filter(opt => opt.value && opt.value.trim()).map(opt => (
                        <SelectItem key={opt.key} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(historySearchTerm || historyStatusFilter !== "all" || historyDateFilter) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setHistorySearchTerm("");
                        setHistoryStatusFilter("all");
                        setHistoryDateFilter("");
                      }}
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 h-9"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 border-t">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="cursor-pointer hover:text-primary transition-colors pl-6 h-12" onClick={() => handleHistorySort("date")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Appointment Date
                        {getSortIcon("date", false)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handleHistorySort("patient")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Patient
                        {getSortIcon("patient", false)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handleHistorySort("service")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Service
                        {getSortIcon("service", false)}
                      </div>
                    </TableHead>
                    {!doctorFilter && (
                      <TableHead className="font-semibold h-12">Doctor</TableHead>
                    )}
                    <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handleHistorySort("status")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Status
                        {getSortIcon("status", false)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary transition-colors h-12" onClick={() => handleHistorySort("booked")}>
                      <div className="flex items-center gap-2 font-semibold">
                        Booked Date
                        {getSortIcon("booked", false)}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold h-12">Payment Status</TableHead>
                    <TableHead className="text-right pr-6 h-12 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={doctorFilter ? 7 : 8} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                          Loading history...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={doctorFilter ? 7 : 8} className="py-24">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <History className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">No history found</h3>
                          <p className="text-sm text-muted-foreground max-w-[300px] mt-1">
                            There are no processed appointment requests in your history yet.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-6 border-violet-200 text-violet-700 hover:bg-violet-50"
                            onClick={() => {
                              setHistorySearchTerm("");
                              setHistoryStatusFilter("all");
                              setHistoryDateFilter("");
                            }}
                          >
                            Reset Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedHistory.map((item) => (
                      <TableRow key={item.id} className="group hover:bg-violet-50/30 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {parseBackendDateToLocal(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              {item.time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-violet-100 shadow-sm">
                              <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-bold">
                                {getInitials(item.patientName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-900">{item.patientName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-gray-700">{getAppointmentTypeName(item.type, item.customType)}</span>
                        </TableCell>
                        {!doctorFilter && (
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none font-medium px-2 py-0">
                              Dr. {item.doctor.split(' ').pop()}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            }) : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.paymentStatus || "unpaid"} 
                            onValueChange={(val) => handlePaymentStatusChange(item.id, val)}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs border-violet-100 bg-white shadow-sm focus:ring-violet-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unpaid">Unpaid</SelectItem>
                              <SelectItem value="half-paid">Half-Paid</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                              <SelectItem value="pay-at-clinic">Pay at Clinic</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedAppointmentToEdit(item);
                                setBookingModalOpen(true);
                              }} 
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Select 
                              value={canonicalStatus(item.status)} 
                              onValueChange={(val) => handleStatusChangeRequest(item, val as Appointment['status'])}
                            >
                              <SelectTrigger className="h-8 w-[105px] text-[10px] font-medium border-violet-100 bg-white shadow-sm focus:ring-violet-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {APPOINTMENT_STATUSES.filter(opt => opt.value && opt.value.trim()).map(opt => (
                                  <SelectItem key={opt.key} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status of {pendingStatusChange?.appointment.patientName}&apos;s appointment 
              from <strong>{pendingStatusChange?.appointment.status}</strong> to <strong>{pendingStatusChange?.newStatus}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} className="bg-violet-600 hover:bg-violet-700">
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookingModal
        open={bookingModalOpen}
        onOpenChange={(open) => {
          setBookingModalOpen(open);
          // When modal closes, refresh to pick up any changes
          if (!open) {
            setTimeout(() => {
              refreshAppointments({});
              setRefreshTrigger(prev => prev + 1);
            }, 500);
          }
        }}
        appointmentToEdit={selectedAppointmentToEdit}
        onBooked={() => {
          setSelectedAppointmentToEdit(null);
          // Force a complete refresh to ensure all data is updated
          refreshAppointments({});
          setRefreshTrigger(prev => prev + 1);
        }}
        onDeleted={() => {
          setSelectedAppointmentToEdit(null);
          // Force a complete refresh to ensure all data is updated
          refreshAppointments({});
          setRefreshTrigger(prev => prev + 1);
        }}
      />
    </div>
  );
}
