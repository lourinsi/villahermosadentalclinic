"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Clock, CheckCircle, XCircle, Eye, AlertCircle, DollarSign, ClipboardList } from "lucide-react";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal } from "../lib/utils";

interface RequestsViewProps {
  doctorFilter?: string;
}

export function RequestsView({ doctorFilter }: RequestsViewProps = {}) {
  const { appointments, isLoading, updateAppointment, refreshTrigger, openEditModal } = useAppointmentModal();

  const requests = useMemo(() => {
    return appointments.filter((apt) => {
      const isRequestStatus = ["pending", "tentative", "To Pay"].includes(apt.status);
      const matchesDoctor = !doctorFilter || apt.doctor.toLowerCase() === doctorFilter.toLowerCase();
      return isRequestStatus && matchesDoctor;
    });
  }, [appointments, doctorFilter]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>;
      case "tentative":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Tentative (Partial)</Badge>;
      case "To Pay":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">To Pay at Clinic</Badge>;
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
            Booking Requests
          </h1>
          <p className="text-muted-foreground">
            {doctorFilter 
              ? "Review and approve tentative bookings or 'Pay at Clinic' requests for your patients."
              : "Review and approve tentative bookings or 'Pay at Clinic' requests for all doctors."}
          </p>
        </div>
      </div>

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
    </div>
  );
}
