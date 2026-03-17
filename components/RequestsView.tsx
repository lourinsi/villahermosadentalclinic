"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { APPOINTMENT_STATUSES } from "@/lib/appointment-statuses";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
  ArrowDown
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
  
  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  // Normalize status strings to canonical backend keys for reliable comparisons
  const canonicalStatus = (s?: string) => {
    if (!s) return "";
    return String(s).toLowerCase().trim();
  };

  // Requests are those with pending, reserved, or scheduled statuses (not yet completed/cancelled)
  const isRequestStatus = (s?: string) => {
    const k = canonicalStatus(s);
    return k === "pending" || k === "reserved" || k === "scheduled";
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

  const requests = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesDoctor = !doctorFilter || (apt.doctor || "").toLowerCase() === doctorFilter.toLowerCase();
      if (!isRequestStatus(apt.status) || !matchesDoctor) return false;

      // Search filter
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
  }, [appointments, doctorFilter, pendingSearchTerm, pendingStatusFilter, pendingDoctorFilter, pendingDateFilter]);

  const history = useMemo(() => {
    return appointments
      .filter((apt) => {
        const matchesDoctor = !doctorFilter || (apt.doctor || "").toLowerCase() === doctorFilter.toLowerCase();
        // In history, we show non-request statuses
        if (isRequestStatus(apt.status) || !matchesDoctor) return false;
        
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
  }, [appointments, doctorFilter, historySearchTerm, historyStatusFilter, historyDateFilter]);

  const handleApprove = async (appointment: Appointment) => {
    try {
      // Approve any pending/reserved request to scheduled
      const newStatus = appointment.status === "pending" || appointment.status === "reserved" ? "scheduled" : "scheduled";
      await updateAppointment(appointment.id, { status: newStatus });
      toast.success(`Appointment for ${appointment.patientName} approved`);
    } catch {
      toast.error("Failed to approve appointment");
    }
  };

  const handleReject = async (appointment: Appointment) => {
    try {
      await updateAppointment(appointment.id, { status: "cancelled" });
      toast.success(`Appointment for ${appointment.patientName} rejected`);
    } catch {
      toast.error("Failed to reject appointment");
    }
  };

  const handleStatusChangeRequest = (appointment: Appointment, statusKey: string) => {
    // statusKey comes from the select dropdown and directly maps to backend status values
    setPendingStatusChange({ appointment, newStatus: statusKey as Appointment['status'] });
    setIsConfirmOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    
    const { appointment, newStatus } = pendingStatusChange;
    try {
      await updateAppointment(appointment.id, { status: newStatus });
      toast.success(`Status for ${appointment.patientName} updated to ${newStatus}`);
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
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>;
      case "reserved":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Reserved</Badge>;
      case "scheduled":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Scheduled</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-violet-600" />
            Booking Management
          </h1>
          <p className="text-muted-foreground">
            {doctorFilter 
              ? "Review pending requests or browse processed booking history for your patients."
              : "Review pending requests or browse processed booking history for all doctors."}
          </p>
        </div>
        <Button onClick={() => refreshAppointments()} variant="outline" className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Requests
            {requests.length > 0 && (
              <Badge className="ml-1 bg-violet-600 hover:bg-violet-700">{requests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Requests History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <CardTitle className="text-lg font-medium">Request Filters</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search patient or service..."
                      className="pl-9"
                      value={pendingSearchTerm}
                      onChange={(e) => setPendingSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {APPOINTMENT_STATUSES.map(opt => (
                        <SelectItem key={opt.key} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!doctorFilter && (
                    <Select value={pendingDoctorFilter} onValueChange={setPendingDoctorFilter}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2 text-gray-500" />
                        <SelectValue placeholder="Doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Doctors</SelectItem>
                        {Array.from(new Set(appointments.map(apt => apt.doctor))).map(doctor => (
                          <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => {
                      setPendingSearchTerm("");
                      setPendingStatusFilter("all");
                      setPendingDoctorFilter("all");
                      setPendingDateFilter("");
                    }}
                    title="Reset Filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-gray-100 pl-6" onClick={() => handlePendingSort("date")}>
                      <div className="flex items-center gap-2">
                        Date & Time
                        {getSortIcon("date", true)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handlePendingSort("patient")}>
                      <div className="flex items-center gap-2">
                        Patient
                        {getSortIcon("patient", true)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handlePendingSort("service")}>
                      <div className="flex items-center gap-2">
                        Service
                        {getSortIcon("service", true)}
                      </div>
                    </TableHead>
                    {!doctorFilter && (
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handlePendingSort("doctor")}>
                        <div className="flex items-center gap-2">
                          Doctor
                          {getSortIcon("doctor", true)}
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handlePendingSort("status")}>
                      <div className="flex items-center gap-2">
                        Status
                        {getSortIcon("status", true)}
                      </div>
                    </TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handlePendingSort("booked")}>
                      <div className="flex items-center gap-2">
                        Booked on
                        {getSortIcon("booked", true)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handlePendingSort("updated")}>
                      <div className="flex items-center gap-2">
                        Last updated
                        {getSortIcon("updated", true)}
                      </div>
                    </TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
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
                      <TableCell colSpan={doctorFilter ? 7 : 8} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Clock className="h-8 w-8 text-gray-300" />
                          No requests found matching your filters.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="pl-6">
                          <div className="font-medium">
                            {parseBackendDateToLocal(request.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                          <div className="text-xs text-muted-foreground">{request.time}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{request.patientName}</div>
                        </TableCell>
                        <TableCell>
                          {getAppointmentTypeName(request.type, request.customType)}
                        </TableCell>
                        {!doctorFilter && <TableCell>{request.doctor}</TableCell>}
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.paymentStatus === "half-paid" ? (
                            <div className="flex items-center text-yellow-600 text-sm">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Partial
                            </div>
                          ) : canonicalStatus(request.status) === "to_pay" ? (
                            <div className="flex items-center text-orange-600 text-sm">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Clinic
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unpaid</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : "—"}
                        </TableCell>
                        <TableCell>
                          {request.updatedAt ? new Date(request.updatedAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : "—"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(request)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleStatusChangeRequest(request, "scheduled")}
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleStatusChangeRequest(request, "cancelled")}
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <CardTitle className="text-lg font-medium">History Filters</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search patient or service..."
                      className="pl-9"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 z-10" />
                    <Input
                      type="date"
                      className="pl-9 w-[180px]"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                    />
                  </div>
                  <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {APPOINTMENT_STATUSES.map(opt => (
                        <SelectItem key={opt.key} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setHistorySearchTerm("");
                      setHistoryStatusFilter("all");
                      setHistoryDateFilter("");
                    }}
                    title="Reset Filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Date & Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service</TableHead>
                    {!doctorFilter && <TableHead>Doctor</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Change Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={doctorFilter ? 5 : 6} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                          Loading history...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={doctorFilter ? 5 : 6} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <History className="h-8 w-8 text-gray-300" />
                          No processed requests found.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-6">
                          <div className="font-medium">
                            {parseBackendDateToLocal(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.time}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.patientName}</div>
                        </TableCell>
                        <TableCell>
                          {getAppointmentTypeName(item.type, item.customType)}
                        </TableCell>
                        {!doctorFilter && <TableCell>{item.doctor}</TableCell>}
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Select 
                            value={canonicalStatus(item.status)} 
                            onValueChange={(val) => handleStatusChangeRequest(item, val as Appointment['status'])}
                          >
                            <SelectTrigger className="h-8 w-[140px] ml-auto text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {APPOINTMENT_STATUSES.map(opt => (
                                <SelectItem key={opt.key} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
    </div>
  );
}
