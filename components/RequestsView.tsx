"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
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
  RotateCcw
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
  const { appointments, isLoading, updateAppointment, refreshTrigger, openEditModal } = useAppointmentModal();
  
  // History filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  
  // Confirmation dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{appointment: Appointment, newStatus: Appointment['status']} | null>(null);

  const requests = useMemo(() => {
    return appointments.filter((apt) => {
      const isRequestStatus = ["pending", "tentative", "To Pay"].includes(apt.status);
      const matchesDoctor = !doctorFilter || apt.doctor.toLowerCase() === doctorFilter.toLowerCase();
      return isRequestStatus && matchesDoctor;
    });
  }, [appointments, doctorFilter]);

  const history = useMemo(() => {
    return appointments
      .filter((apt) => {
        const isRequestStatus = ["pending", "tentative", "To Pay"].includes(apt.status);
        const matchesDoctor = !doctorFilter || apt.doctor.toLowerCase() === doctorFilter.toLowerCase();
        
        // In history, we show non-request statuses
        if (isRequestStatus || !matchesDoctor) return false;
        
        // Search filter
        if (searchTerm && !apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !getAppointmentTypeName(apt.type, apt.customType).toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        // Status filter
        if (statusFilter !== "all" && apt.status !== statusFilter) {
          return false;
        }
        
        // Date filter
        if (dateFilter && apt.date !== dateFilter) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by date and time descending (latest first)
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });
  }, [appointments, doctorFilter, searchTerm, statusFilter, dateFilter]);

  const handleApprove = async (appointment: Appointment) => {
    try {
      const newStatus = appointment.status === "tentative" ? "confirmed" : "scheduled";
      await updateAppointment(appointment.id, { status: newStatus });
      toast.success(`Appointment for ${appointment.patientName} approved`);
    } catch (error) {
      toast.error("Failed to approve appointment");
    }
  };

  const handleReject = async (appointment: Appointment) => {
    try {
      await updateAppointment(appointment.id, { status: "cancelled" });
      toast.success(`Appointment for ${appointment.patientName} rejected`);
    } catch (error) {
      toast.error("Failed to reject appointment");
    }
  };

  const handleStatusChangeRequest = (appointment: Appointment, newStatus: Appointment['status']) => {
    setPendingStatusChange({ appointment, newStatus });
    setIsConfirmOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    
    const { appointment, newStatus } = pendingStatusChange;
    try {
      await updateAppointment(appointment.id, { status: newStatus });
      toast.success(`Status for ${appointment.patientName} updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsConfirmOpen(false);
      setPendingStatusChange(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>;
      case "tentative":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Tentative (Partial)</Badge>;
      case "To Pay":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">To Pay at Clinic</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmed</Badge>;
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

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Date & Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service</TableHead>
                    {!doctorFilter && <TableHead>Doctor</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={doctorFilter ? 6 : 7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                          Loading requests...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={doctorFilter ? 6 : 7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Clock className="h-8 w-8 text-gray-300" />
                          No pending requests found.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
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
                          ) : request.status === "To Pay" ? (
                            <div className="flex items-center text-orange-600 text-sm">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Clinic
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unpaid</span>
                          )}
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
                              onClick={() => handleApprove(request)}
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleReject(request)}
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
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 z-10" />
                    <Input
                      type="date"
                      className="pl-9 w-[180px]"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setDateFilter("");
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
                            value={item.status} 
                            onValueChange={(val) => handleStatusChangeRequest(item, val as Appointment['status'])}
                          >
                            <SelectTrigger className="h-8 w-[140px] ml-auto text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
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
              Are you sure you want to change the status of {pendingStatusChange?.appointment.patientName}'s appointment 
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
