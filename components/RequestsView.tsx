"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { useAppointmentStatuses } from "@/hooks/useAppointmentStatuses";
import { usePaymentStatuses } from "@/hooks/usePaymentStatuses";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
  AlertDialogFooter as Footer,
} from "./ui/alert-dialog";
import PastAppointmentButton from "./PastAppointmentButton";

interface RequestsViewProps {
  doctorFilter?: string;
}

export function RequestsView({ doctorFilter }: RequestsViewProps = {}) {
  const { appointments, isLoading, updateAppointment, openEditModal, refreshAppointments, refreshTrigger } = useAppointmentModal();
  const { statuses: APPOINTMENT_STATUSES } = useAppointmentStatuses();
  const { statuses: PAYMENT_STATUSES } = usePaymentStatuses();
  
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
  
  useEffect(() => {
    // Pending appointments are patient cart records and should stay out of staff request/history views.
    refreshAppointments();
  }, [refreshAppointments]);

  // Log available statuses when RequestsView loads
  useEffect(() => {
    if (APPOINTMENT_STATUSES && APPOINTMENT_STATUSES.length > 0) {
      console.log('[RequestsView] Available appointment statuses:', APPOINTMENT_STATUSES.map(s => s.value));
    }
  }, [APPOINTMENT_STATUSES]);

  // Normalize status strings to canonical backend keys for reliable comparisons
  const canonicalStatus = (s?: string) => {
    if (!s) return "";
    return String(s).toLowerCase().trim();
  };

  const isPatientCartStatus = (status?: string) => {
    return canonicalStatus(status) === "pending";
  };

  const staffVisibleStatusOptions = (APPOINTMENT_STATUSES || []).filter((status: any) => !isPatientCartStatus(status.value));

  const isActionableStatus = (status?: string) => {
    const k = canonicalStatus(status);
    return k === "reserved" || k === "tentative" || k === "to-pay" || k === "half-paid" || k === "tbd";
  };

  // History shows completed appointments (not pending payments)
  const isHistoryStatus = (status?: string) => {
    const k = canonicalStatus(status);
    return k === "scheduled" || k === "completed" || k === "cancelled";
  };

  // Pending requests include these statuses (action required)
  const isPendingRequestStatus = (status?: string) => {
    const k = canonicalStatus(status);
    // TBD also appears in requests because it needs action (marking completed/cancelled)
    return isActionableStatus(k);
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
  
  // Approve confirmation dialog state
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [pendingApproveAppointment, setPendingApproveAppointment] = useState<Appointment | null>(null);
  
  // Reject confirmation dialog state
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [pendingRejectAppointment, setPendingRejectAppointment] = useState<Appointment | null>(null);

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
    const result = appointments.filter((apt) => {
      const matchesDoctor = !doctorFilter || (apt.doctor || "").toLowerCase() === doctorFilter.toLowerCase();
      // Requests are those with pending statuses (including TBD)
      if (isPatientCartStatus(apt.status) || !isPendingRequestStatus(apt.status) || !matchesDoctor) {
        return false;
      }

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

    return result;
  }, [appointments, doctorFilter, pendingSearchTerm, pendingStatusFilter, pendingDoctorFilter, pendingDateFilter, refreshTrigger]);

  const history = useMemo(() => {
    return appointments
      .filter((apt) => {
        const matchesDoctor = !doctorFilter || (apt.doctor || "").toLowerCase() === doctorFilter.toLowerCase();
        // In history, we show only scheduled, completed, or cancelled appointments
        if (isPatientCartStatus(apt.status) || !isHistoryStatus(apt.status) || !matchesDoctor) return false;
        
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
    setPendingApproveAppointment(appointment);
    setIsApproveConfirmOpen(true);
  };

  const confirmApprove = async () => {
    if (!pendingApproveAppointment) return;
    
    try {
      // Approve reserved requests to scheduled
      // Approve TBD requests to completed (since TBD is for past appointments)
      let newStatus = "scheduled";
      if (pendingApproveAppointment.status === "tbd") {
        newStatus = "completed";
      } else if (pendingApproveAppointment.status === "reserved" || pendingApproveAppointment.status === "tentative") {
        newStatus = "scheduled";
      }
      
      await updateAppointment(pendingApproveAppointment.id, { status: newStatus });
      toast.success(`Appointment for ${pendingApproveAppointment.patientName} approved`);
      // Refresh notifications to show the new status change notification
      refreshAppointments();
      // Also refresh notifications from NotificationPage context if available
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshNotifications'));
      }, 500);
    } catch {
      toast.error("Failed to approve appointment");
    } finally {
      setIsApproveConfirmOpen(false);
      setPendingApproveAppointment(null);
    }
  };

  const handleReject = async (appointment: Appointment) => {
    setPendingRejectAppointment(appointment);
    setIsRejectConfirmOpen(true);
  };

  const confirmReject = async () => {
    if (!pendingRejectAppointment) return;
    
    try {
      await updateAppointment(pendingRejectAppointment.id, { status: "cancelled" });
      toast.success(`Appointment for ${pendingRejectAppointment.patientName} rejected`);
      // Refresh notifications to show the new status change notification
      refreshAppointments();
      // Also refresh notifications from NotificationPage context if available
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshNotifications'));
      }, 500);
    } catch {
      toast.error("Failed to reject appointment");
    } finally {
      setIsRejectConfirmOpen(false);
      setPendingRejectAppointment(null);
    }
  };

  const handleStatusChangeRequest = (appointment: Appointment, statusKey: string) => {
    if (isPatientCartStatus(statusKey)) {
      toast.error("Pending is reserved for patient carts.");
      return;
    }
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

  const handleHistoryStatusChange = async (appointmentId: string, newStatus: string) => {
    if (isPatientCartStatus(newStatus)) {
      toast.error("Pending is reserved for patient carts.");
      return;
    }

    try {
      await updateAppointment(appointmentId, { status: newStatus as any });
      toast.success(`Status updated to ${newStatus}`);
      refreshAppointments();
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshNotifications'));
      }, 500);
    } catch {
      toast.error("Failed to update status");
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
    const statusOption = APPOINTMENT_STATUSES.find(s => canonicalStatus(s.value) === k);
    
    if (statusOption) {
      return (
        <Badge className={`${statusOption.bgColor} ${statusOption.textColor} border-none hover:opacity-80 font-medium capitalize`}>
          {statusOption.label}
        </Badge>
      );
    }
    
    return <Badge variant="outline" className="font-medium capitalize">{status}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus: string | undefined) => {
    const k = canonicalStatus(paymentStatus || "unpaid");
    const statusOption = PAYMENT_STATUSES.find(s => canonicalStatus(s.value) === k);
    
    if (statusOption) {
      return (
        <Badge className={`${statusOption.bgColor} ${statusOption.textColor} border-none hover:opacity-80 font-medium capitalize`}>
          {statusOption.label}
        </Badge>
      );
    }
    
    return <Badge variant="outline" className="font-medium capitalize">{paymentStatus || "Unpaid"}</Badge>;
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
    let sorted = [...requests];
    
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
          case "payment":
            aVal = canonicalStatus(a.paymentStatus || "unpaid");
            bVal = canonicalStatus(b.paymentStatus || "unpaid");
            break;
          case "booked":
            aVal = a.createdAt ? new Date(a.createdAt).getTime() : Number.MIN_VALUE;
            bVal = b.createdAt ? new Date(b.createdAt).getTime() : Number.MIN_VALUE;
            break;
          case "updated":
            aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : Number.MIN_VALUE;
            bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : Number.MIN_VALUE;
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
    let sorted = [...history];
    
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
          case "date":
            aVal = new Date(`${a.date}T${a.time}`).getTime();
            bVal = new Date(`${b.date}T${b.time}`).getTime();
            break;
          case "status":
            aVal = canonicalStatus(a.status);
            bVal = canonicalStatus(b.status);
            break;
          case "payment":
            aVal = canonicalStatus(a.paymentStatus || "unpaid");
            bVal = canonicalStatus(b.paymentStatus || "unpaid");
            break;
          case "booked":
            aVal = a.createdAt ? new Date(a.createdAt).getTime() : Number.MIN_VALUE;
            bVal = b.createdAt ? new Date(b.createdAt).getTime() : Number.MIN_VALUE;
            break;
          case "updated":
            aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : Number.MIN_VALUE;
            bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : Number.MIN_VALUE;
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

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">
            {doctorFilter ? "Patient Requests" : "Appointment Management"}
          </h1>
          <p className="text-gray-500 font-medium">Review and manage appointment requests</p>
        </div>
        <PastAppointmentButton doctorName={doctorFilter} className="rounded-xl" />
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
          <TabsTrigger value="requests" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white font-bold transition-all duration-300">
            Requests
            <Badge className="ml-2 bg-violet-100 text-violet-700 border-none">{requests.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white font-bold transition-all duration-300">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card className="border-none shadow-xl shadow-gray-200/50 bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 pb-6 bg-white">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-gray-900 uppercase">Action Required</CardTitle>
                    <p className="text-sm text-gray-500 font-medium">Please review appointments that need action</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search patient or service..." 
                      className="pl-10 w-64 bg-gray-50 border-gray-100 rounded-xl text-sm"
                      value={pendingSearchTerm}
                      onChange={(e) => setPendingSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Select value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
                    <SelectTrigger className="w-[160px] bg-gray-50 border-gray-100 rounded-xl text-sm">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-gray-400" />
                        <SelectValue placeholder="All Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {staffVisibleStatusOptions.filter((s: any) => isPendingRequestStatus(s.value)).map((status: any) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!doctorFilter && (
                    <Select value={pendingDoctorFilter} onValueChange={setPendingDoctorFilter}>
                      <SelectTrigger className="w-[160px] bg-gray-50 border-gray-100 rounded-xl text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <SelectValue placeholder="All Doctors" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Doctors</SelectItem>
                        {Array.from(new Set(appointments.map(a => a.doctor))).map((doc: any) => (
                          <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button variant="ghost" size="icon" className="rounded-xl border border-gray-100" onClick={() => {
                    setPendingSearchTerm("");
                    setPendingStatusFilter("all");
                    setPendingDoctorFilter("all");
                    setPendingDateFilter("");
                  }}>
                    <RotateCcw className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-100">
                      <TableHead className="font-bold text-gray-900 py-5 cursor-pointer" onClick={() => handlePendingSort("patient")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Patient {getSortIcon("patient", true)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handlePendingSort("service")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Service {getSortIcon("service", true)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handlePendingSort("date")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Schedule {getSortIcon("date", true)}
                        </div>
                      </TableHead>
                      {!doctorFilter && (
                        <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handlePendingSort("doctor")}>
                          <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                            Doctor {getSortIcon("doctor", true)}
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handlePendingSort("status")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Status {getSortIcon("status", true)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handlePendingSort("payment")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Payment {getSortIcon("payment", true)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handlePendingSort("booked")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Booked {getSortIcon("booked", true)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handlePendingSort("updated")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Last Updated {getSortIcon("updated", true)}
                        </div>
                      </TableHead>
                      <TableHead className="text-right uppercase text-[11px] tracking-wider font-bold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-gray-500 font-medium">
                          Loading requests...
                        </TableCell>
                      </TableRow>
                    ) : sortedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center py-12">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                              <ClipboardList className="h-10 w-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 uppercase">All Caught Up!</h3>
                            <p className="text-gray-500 max-w-xs mx-auto mt-2">There are no appointment requests matching your filters.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-violet-50/30 transition-colors border-b border-gray-50">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-violet-100 text-violet-700 font-bold text-xs uppercase">
                                  {getInitials(request.patientName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-gray-900">{request.patientName}</div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">ID: {request.id.slice(0, 8)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-gray-700">{getAppointmentTypeName(request.type, request.customType)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">{parseBackendDateToLocal(request.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span className="text-xs text-gray-500 font-medium">{request.time}</span>
                            </div>
                          </TableCell>
                          {!doctorFilter && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-violet-400"></div>
                                <span className="text-sm font-semibold text-gray-700">{request.doctor}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <Select 
                              value={request.status} 
                              onValueChange={(newStatus) => handleHistoryStatusChange(request.id, newStatus)}
                            >
                              <SelectTrigger className="w-auto h-auto p-0 bg-transparent border-0 hover:opacity-80 transition-opacity [&>svg]:text-gray-400">
                                <div className="cursor-pointer">
                                  {getStatusBadge(request.status)}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {staffVisibleStatusOptions.map((status: any) => (
                                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={request.paymentStatus || "unpaid"} 
                              onValueChange={(newPaymentStatus) => handlePaymentStatusChange(request.id, newPaymentStatus)}
                            >
                              <SelectTrigger className="w-auto h-auto p-0 bg-transparent border-0 hover:opacity-80 transition-opacity [&>svg]:text-gray-400">
                                <div className="cursor-pointer">
                                  {getPaymentStatusBadge(request.paymentStatus)}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_STATUSES.map((status: any) => (
                                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">{request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              <span className="text-xs text-gray-500 font-medium">{request.createdAt ? new Date(request.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">{request.updatedAt ? new Date(request.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              <span className="text-xs text-gray-500 font-medium">{request.updatedAt ? new Date(request.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2">
                              {isActionableStatus(request.status) ? (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-9 w-9 p-0 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                                    onClick={() => handleApprove(request)}
                                    title={request.status === "tbd" ? "Mark as Completed" : "Approve Appointment"}
                                  >
                                    <CheckCircle className="h-5 w-5" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 rounded-xl"
                                    onClick={() => handleReject(request)}
                                    title={request.status === "tbd" ? "Cancel Appointment" : "Reject Appointment"}
                                  >
                                    <XCircle className="h-5 w-5" />
                                  </Button>
                                </>
                              ) : null}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-9 w-9 p-0 text-violet-600 hover:bg-violet-50 rounded-xl"
                                onClick={() => {
                                  openEditModal(request);
                                }}
                              >
                                <Eye className="h-5 w-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-none shadow-xl shadow-gray-200/50 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 pb-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-50 rounded-xl">
                    <History className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-gray-900 uppercase">Recent Activity</CardTitle>
                    <p className="text-sm text-gray-500 font-medium">History of processed appointments</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search history..." 
                      className="pl-10 w-64 bg-gray-50 border-gray-100 rounded-xl text-sm"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                    <SelectTrigger className="w-[160px] bg-gray-50 border-gray-100 rounded-xl text-sm">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-gray-400" />
                        <SelectValue placeholder="All Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {staffVisibleStatusOptions.filter((s: any) => isHistoryStatus(s.value)).map((status: any) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="ghost" size="icon" className="rounded-xl border border-gray-100" onClick={() => {
                    setHistorySearchTerm("");
                    setHistoryStatusFilter("all");
                    setHistoryDateFilter("");
                  }}>
                    <RotateCcw className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-100">
                      <TableHead className="font-bold text-gray-900 py-5 cursor-pointer" onClick={() => handleHistorySort("patient")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Patient {getSortIcon("patient", false)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handleHistorySort("service")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Service {getSortIcon("service", false)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handleHistorySort("date")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Schedule {getSortIcon("date", false)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handleHistorySort("status")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Status {getSortIcon("status", false)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handleHistorySort("payment")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Payment {getSortIcon("payment", false)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handleHistorySort("booked")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Booked {getSortIcon("booked", false)}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 cursor-pointer" onClick={() => handleHistorySort("updated")}>
                        <div className="flex items-center gap-2 uppercase text-[11px] tracking-wider">
                          Last Updated {getSortIcon("updated", false)}
                        </div>
                      </TableHead>
                      <TableHead className="text-right uppercase text-[11px] tracking-wider font-bold text-gray-900">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center py-12">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                              <History className="h-10 w-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 uppercase">No History Found</h3>
                            <p className="text-gray-500 max-w-xs mx-auto mt-2">No completed or cancelled appointments recorded yet.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedHistory.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-violet-100 text-violet-700 font-bold text-xs uppercase">
                                  {getInitials(item.patientName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-gray-900">{item.patientName}</div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">ID: {item.id.slice(0, 8)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-gray-700">{getAppointmentTypeName(item.type, item.customType)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">{parseBackendDateToLocal(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span className="text-xs text-gray-500 font-medium">{item.time}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={item.status} 
                              onValueChange={(newStatus) => handleHistoryStatusChange(item.id, newStatus)}
                            >
                              <SelectTrigger className="w-auto h-auto p-0 bg-transparent border-0 hover:opacity-80 transition-opacity [&>svg]:text-gray-400">
                                <div className="cursor-pointer">
                                  {getStatusBadge(item.status)}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {staffVisibleStatusOptions.map((status: any) => (
                                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={item.paymentStatus || "unpaid"} 
                              onValueChange={(newPaymentStatus) => handlePaymentStatusChange(item.id, newPaymentStatus)}
                            >
                              <SelectTrigger className="w-auto h-auto p-0 bg-transparent border-0 hover:opacity-80 transition-opacity [&>svg]:text-gray-400">
                                <div className="cursor-pointer">
                                  {getPaymentStatusBadge(item.paymentStatus)}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_STATUSES.map((status: any) => (
                                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              <span className="text-xs text-gray-500 font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              <span className="text-xs text-gray-500 font-medium">{item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-9 w-9 p-0 text-violet-600 hover:bg-violet-50 rounded-xl"
                              onClick={() => {
                                openEditModal(item);
                              }}
                            >
                              <Eye className="h-5 w-5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent 
          className="rounded-2xl border-none shadow-2xl"
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-gray-900 uppercase tracking-tight">Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium">
              Are you sure you want to update the status of this appointment for <strong>{pendingStatusChange?.appointment.patientName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-100 font-bold uppercase text-xs tracking-wider">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider"
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
        <AlertDialogContent 
          className="rounded-2xl border-none shadow-2xl"
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-gray-900 uppercase tracking-tight">
              {pendingApproveAppointment?.status === "tbd" ? "Mark as Completed?" : "Approve Appointment?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium">
              {pendingApproveAppointment?.status === "tbd" ? (
                <>Are you sure you want to mark this appointment for <strong>{pendingApproveAppointment?.patientName}</strong> as <strong>Completed</strong>?</>
              ) : (
                <>Are you sure you want to approve this appointment for <strong>{pendingApproveAppointment?.patientName}</strong>? The status will be set to <strong>Scheduled</strong>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Payment Status Summary - show for all statuses */}
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
            <p className="text-sm font-medium text-amber-900">
              {(() => {
                const paymentStatus = canonicalStatus(pendingApproveAppointment?.paymentStatus || "unpaid");
                const patientName = pendingApproveAppointment?.patientName || "Patient";
                
                if (paymentStatus === "paid") {
                  return `✓ ${patientName} has paid in full.`;
                } else if (paymentStatus === "half-paid") {
                  return `⚠ ${patientName} has made a partial payment.`;
                } else if (paymentStatus === "pay-at-clinic") {
                  return `📍 ${patientName} will pay at the clinic.`;
                } else {
                  return `✗ ${patientName} has not paid yet.`;
                }
              })()}
            </p>
          </div>

          <div className={`p-4 rounded-lg border space-y-2 ${pendingApproveAppointment?.status === "tbd" ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"}`}>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-semibold text-gray-900">{pendingApproveAppointment ? getAppointmentTypeName(pendingApproveAppointment.type, pendingApproveAppointment.customType) : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-semibold text-gray-900">{pendingApproveAppointment?.date} at {pendingApproveAppointment?.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Doctor:</span>
                <span className="font-semibold text-gray-900">{pendingApproveAppointment?.doctor}</span>
              </div>
              <div className={`border-t pt-2 ${pendingApproveAppointment?.status === "tbd" ? "border-emerald-100" : "border-blue-100"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Status:</span>
                  <div>
                    {getStatusBadge(pendingApproveAppointment?.status || "pending")}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-100 font-bold uppercase text-xs tracking-wider">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmApprove}
              className={`text-white rounded-xl font-bold uppercase text-xs tracking-wider ${pendingApproveAppointment?.status === "tbd" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {pendingApproveAppointment?.status === "tbd" ? "Yes, Mark as Completed" : "Yes, Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
        <AlertDialogContent 
          className="rounded-2xl border-none shadow-2xl"
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-gray-900 uppercase tracking-tight">Reject Appointment?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium">
              Are you sure you want to reject this appointment for <strong>{pendingRejectAppointment?.patientName}</strong>? The status will be set to <strong>Cancelled</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Appointment Details */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-2">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-semibold text-gray-900">{pendingRejectAppointment ? getAppointmentTypeName(pendingRejectAppointment.type, pendingRejectAppointment.customType) : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-semibold text-gray-900">{pendingRejectAppointment?.date} at {pendingRejectAppointment?.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Doctor:</span>
                <span className="font-semibold text-gray-900">{pendingRejectAppointment?.doctor}</span>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-100 font-bold uppercase text-xs tracking-wider">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider"
            >
              Yes, Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
