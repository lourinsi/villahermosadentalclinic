"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Search,
  Phone,
  Mail,
  Calendar,
  Eye,
  Clock,
  User,
  FileText
} from "lucide-react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Appointment } from "../hooks/useAppointments";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal, formatDateToYYYYMMDD } from "../lib/utils";

interface PatientSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalAppointments: number;
  lastVisit: string | null;
  nextAppointment: string | null;
  appointments: Appointment[];
}

export function DoctorPatientsView() {
  const { user } = useAuth();
  const doctorName = user?.username || "";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);

  const { appointments, openEditModal } = useAppointmentModal();

  // Filter appointments to only show this doctor's appointments
  const myAppointments = useMemo(() => {
    return appointments.filter((apt: Appointment) =>
      apt.doctor.toLowerCase() === doctorName.toLowerCase()
    );
  }, [appointments, doctorName]);

  // Build patient list from appointments
  const myPatients = useMemo(() => {
    const patientMap = new Map<string, PatientSummary>();
    const todayStr = formatDateToYYYYMMDD(new Date());

    myAppointments.forEach((apt: Appointment) => {
      const patientKey = apt.patientId || apt.patientName;

      if (!patientMap.has(patientKey)) {
        patientMap.set(patientKey, {
          id: apt.patientId || patientKey,
          name: apt.patientName,
          email: apt.patientEmail || "",
          phone: apt.patientPhone || "",
          totalAppointments: 0,
          lastVisit: null,
          nextAppointment: null,
          appointments: []
        });
      }

      const patient = patientMap.get(patientKey)!;
      patient.totalAppointments++;
      patient.appointments.push(apt);

      // Update last visit (completed appointments in the past)
      if (apt.status === "completed") {
        const aptDate = apt.date;
        if (!patient.lastVisit || aptDate > patient.lastVisit) {
          patient.lastVisit = aptDate;
        }
      }

      // Update next appointment (future appointments)
      if (apt.date >= todayStr && apt.status !== "completed" && apt.status !== "cancelled") {
        if (!patient.nextAppointment || apt.date < patient.nextAppointment) {
          patient.nextAppointment = apt.date;
        }
      }
    });

    // Sort appointments within each patient
    patientMap.forEach(patient => {
      patient.appointments.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      });
    });

    return Array.from(patientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [myAppointments]);

  // Filter patients by search term
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return myPatients;
    const term = searchTerm.toLowerCase();
    return myPatients.filter(patient =>
      patient.name.toLowerCase().includes(term) ||
      patient.email.toLowerCase().includes(term) ||
      patient.phone.includes(term)
    );
  }, [myPatients, searchTerm]);

  const openPatientDetails = (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setIsPatientDialogOpen(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return parseBackendDateToLocal(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
          <p className="text-muted-foreground">View patients you have treated</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64 h-10 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Patients
            </CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myPatients.length}</div>
            <p className="text-xs text-muted-foreground">Patients you've seen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myAppointments.length}</div>
            <p className="text-xs text-muted-foreground">All-time appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming
            </CardTitle>
            <Clock className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myPatients.filter(p => p.nextAppointment).length}
            </div>
            <p className="text-xs text-muted-foreground">Patients with scheduled visits</p>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-violet-600" />
            Patient List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Patient Name</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold text-center">Appointments</TableHead>
                <TableHead className="font-semibold">Last Visit</TableHead>
                <TableHead className="font-semibold">Next Visit</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? "No patients found matching your search." : "No patients yet. Your patients will appear here after appointments."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openPatientDetails(patient)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                          <span className="text-violet-700 font-semibold">
                            {patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <span>{patient.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {patient.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{patient.email}</span>
                          </div>
                        )}
                        {patient.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            <span>{patient.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-violet-50 text-violet-700">
                        {patient.totalAppointments}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {patient.lastVisit ? (
                        <span className="text-sm">{formatDate(patient.lastVisit)}</span>
                      ) : (
                        <span className="text-sm text-gray-400">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.nextAppointment ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200">
                          {formatDate(patient.nextAppointment)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPatientDetails(patient);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={isPatientDialogOpen} onOpenChange={setIsPatientDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                <span className="text-violet-700 font-bold text-lg">
                  {selectedPatient?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-xl">{selectedPatient?.name}</div>
                <div className="text-sm text-gray-500 font-normal">Patient History</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6 py-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedPatient.email && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Email</div>
                      <div className="text-sm font-medium">{selectedPatient.email}</div>
                    </div>
                  </div>
                )}
                {selectedPatient.phone && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Phone</div>
                      <div className="text-sm font-medium">{selectedPatient.phone}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-violet-50 rounded-lg">
                  <div className="text-2xl font-bold text-violet-700">{selectedPatient.totalAppointments}</div>
                  <div className="text-xs text-violet-600">Total Visits</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-bold text-blue-700">
                    {selectedPatient.lastVisit ? formatDate(selectedPatient.lastVisit) : "N/A"}
                  </div>
                  <div className="text-xs text-blue-600">Last Visit</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-bold text-green-700">
                    {selectedPatient.nextAppointment ? formatDate(selectedPatient.nextAppointment) : "None"}
                  </div>
                  <div className="text-xs text-green-600">Next Visit</div>
                </div>
              </div>

              {/* Appointment History */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Appointment History
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {selectedPatient.appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => {
                        setIsPatientDialogOpen(false);
                        openEditModal(apt);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <div className="font-medium">
                            {getAppointmentTypeName(apt.type, apt.customType)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(apt.date)} at {apt.time}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            apt.status === "completed" ? "default" :
                            apt.status === "confirmed" ? "secondary" :
                            apt.status === "cancelled" ? "destructive" :
                            "outline"
                          }
                          className={
                            apt.status === "completed" ? "bg-green-100 text-green-700" :
                            apt.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                            apt.status === "cancelled" ? "bg-red-100 text-red-700" :
                            ""
                          }
                        >
                          {apt.status}
                        </Badge>
                        {apt.price != null && (
                          <span className="text-sm font-medium text-gray-600">
                            ${apt.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
