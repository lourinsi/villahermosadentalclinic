"use client";

import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "./ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Trash,
  MoreVertical,
  Bell,
  User as UserIcon
} from "lucide-react";
import { EditAppointmentModal } from "./EditAppointmentModal";
import { EditPaymentModal } from "./EditPaymentModal";
import { Appointment } from "../hooks/useAppointments";
import { DentalChart } from "./DentalChart";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal, formatDateToYYYYMMDD } from "../lib/utils";

// dummy data removed per request

// appointment history dummy data removed per request

interface Patient {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  lastVisit?: string;
  nextAppointment?: string | null;
  status?: string;
  insurance?: string;
  balance?: number;
  createdAt?: string;
  allergies?: string;
  medicalHistory?: string;
  treatmentPlan?: string;
  clinicalNotes?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  parentId?: string;
  isPrimary?: boolean;
  relationship?: string;
  dentalCharts?: { date: string; data: string; isEmpty: boolean }[];
}

interface PatientsViewProps {
  doctorFilter?: string; // When set, only show patients this doctor has seen
}

export function PatientsView({ doctorFilter }: PatientsViewProps = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [paginatedPatients, setPaginatedPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);

  const [isPatientDeleteDialogOpen, setIsPatientDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPatientDetailsModified, setIsPatientDetailsModified] = useState(false);
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messagePatient, setMessagePatient] = useState<Patient | null>(null);
  const [messageContent, setMessageContent] = useState("");
  
  const [isConfirmUnsavedChangesOpen, setIsConfirmUnsavedChangesOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const patientDetailsRef = useRef<{ save: () => Promise<boolean> } | null>(null);
  const itemsPerPage = 10;
  const { openScheduleModal, openAddPatientModal, refreshPatients, refreshTrigger, appointments } = useAppointmentModal();

  // State to hold doctor's appointments (for filtering patients by doctor)
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);

  // Fetch doctor's appointments when doctorFilter is set
  useEffect(() => {
    if (!doctorFilter) {
      setDoctorAppointments([]);
      return;
    }

    const fetchDoctorAppointments = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/appointments?doctor=${encodeURIComponent(doctorFilter)}`);
        const result = await response.json();
        if (result.success && result.data) {
          setDoctorAppointments(result.data);
        }
      } catch (error) {
        console.error("Error fetching doctor appointments:", error);
        setDoctorAppointments([]);
      }
    };

    fetchDoctorAppointments();
  }, [doctorFilter, refreshTrigger]);

  // Reset page when search or status changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Fetch patients when page, search, status filter, or refresh trigger changes
  useEffect(() => {
    fetchPatients(currentPage);
  }, [currentPage, searchTerm, statusFilter, refreshTrigger, appointments]);

  const fetchPatients = async (page = 1) => {
    // Add a timeout so the fetch can't hang indefinitely in the client
    const controller = new AbortController();
    const timeoutMs = 5000; // 5 seconds
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      setIsLoading(true);

      const q = encodeURIComponent(searchTerm || "");
      const statusParam = statusFilter || "all";
      const doctorParam = doctorFilter ? `&doctor=${encodeURIComponent(doctorFilter)}` : "";
      const res = await fetch(
        `http://localhost:3001/api/patients?page=${page}&limit=${itemsPerPage}&search=${q}&status=${statusParam}${doctorParam}`,
        { signal: controller.signal }
      );

      const result = await res.json();

      if (result && result.success) {
        const data = result.data || [];
        const meta = result.meta || { total: 0, page, limit: itemsPerPage, totalPages: 1 };

        const todayStr = formatDateToYYYYMMDD(new Date());

        // Use doctor appointments if available, otherwise use shared appointments
        const appointmentsToUse = doctorFilter ? doctorAppointments : appointments;

        const transformedPatients = data.map((patient: Patient) => {
          const patientAppointments = appointmentsToUse.filter(
            (apt: Appointment) => apt.patientId === patient.id || apt.patientName === `${patient.firstName} ${patient.lastName}`
          );

          const upcomingAppointments = patientAppointments
            .filter((apt: Appointment) => apt.date >= todayStr && apt.status !== "completed" && apt.status !== "cancelled")
            .sort((a: Appointment, b: Appointment) => {
              if (a.date !== b.date) return a.date.localeCompare(b.date);
              return a.time.localeCompare(b.time);
            });

          const completedAppointments = patientAppointments
            .filter((apt: Appointment) => apt.status === "completed")
            .sort((a: Appointment, b: Appointment) => parseBackendDateToLocal(b.date).getTime() - parseBackendDateToLocal(a.date).getTime());

          const nextApt = upcomingAppointments.length > 0 ? upcomingAppointments[0].date : null;
          const lastVisitFromApt = completedAppointments.length > 0 ? completedAppointments[0].date : null;
          const effectiveLastVisit = lastVisitFromApt || patient.lastVisit || "";

          // Automatic Inactive Status: more than a year since last visit
          let status = patient.status || "active";
          if (effectiveLastVisit) {
            const lastVisitDate = parseBackendDateToLocal(effectiveLastVisit);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (lastVisitDate < oneYearAgo) {
              status = "inactive";
            }
          }

          return {
            ...patient,
            name: `${patient.firstName} ${patient.lastName}`,
            lastVisit: effectiveLastVisit,
            nextAppointment: nextApt,
            status: status,
            balance: 0,
          };
        });

        setPaginatedPatients(transformedPatients);
        setTotalPages(meta.totalPages || 1);
        setTotalFiltered(meta.total || 0);
      } else {
        setPaginatedPatients([]);
        setTotalPages(1);
        setTotalFiltered(0);
      }
    } catch (err: any) {
      console.error("Error fetching patients:", err);
      // If the request was aborted due to timeout, fall back to local mock data so the UI remains usable
      if (err && err.name === 'AbortError') {
        console.warn(`Patient fetch aborted after ${timeoutMs}ms; returning empty list.`);
        toast.error('Patient fetch timed out.');
        setPaginatedPatients([]);
        setTotalPages(1);
        setTotalFiltered(0);
      } else {
        // Other network or parsing errors - return empty list so UI doesn't hang
        console.warn('Failed to fetch patients; returning empty list.');
        toast.error('Failed to fetch patients from backend.');
        setPaginatedPatients([]);
        setTotalPages(1);
        setTotalFiltered(0);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge>{status || "Unknown"}</Badge>;
    }
  };

  const handleAddPatient = () => {
    openAddPatientModal();
  };

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete?.id) {
      toast.error("Missing patient id");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:3001/api/patients/${patientToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Patient deleted successfully");
        setIsPatientDeleteDialogOpen(false);
        setPatientToDelete(null);
        refreshPatients();
        setSelectedPatient(null);
      } else {
        const json = await res.json();
        toast.error(json?.message || "Failed to delete patient");
      }
    } catch (err) {
      console.error("[DELETE PATIENT] Error:", err);
      toast.error("Error deleting patient");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    if (patientDetailsRef.current) {
      const success = await patientDetailsRef.current.save();
      if (success) {
        setIsPatientDetailsModalOpen(false);
        setSelectedPatient(null);
        setIsPatientDetailsModified(false);
      }
    }
    setIsSaving(false);
    setIsConfirmUnsavedChangesOpen(false);
  };

  const handleDiscardAndClose = () => {
    setIsPatientDetailsModified(false);
    setIsPatientDetailsModalOpen(false);
    setSelectedPatient(null);
    setIsConfirmUnsavedChangesOpen(false);
  };

  const handleCancelClose = () => {
    setIsConfirmUnsavedChangesOpen(false);
  };

  const handleSendMessage = async () => {
    if (!messagePatient || !messageContent.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: messagePatient.id,
          patientEmail: messagePatient.email,
          patientPhone: messagePatient.phone,
          patientName: messagePatient.name || `${messagePatient.firstName} ${messagePatient.lastName}`,
          message: messageContent
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Message sent to patient via email and SMS");
        setMessageContent("");
        setMessagePatient(null);
        setIsMessageModalOpen(false);
      } else {
        toast.error(result.message || "Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Error sending message");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {doctorFilter ? "My Patients" : "Patients"}
          </h1>
          <p className="text-muted-foreground">
            {doctorFilter
              ? "View patients you have treated"
              : "Manage patient information and appointments"}
          </p>
        </div>
        {!doctorFilter && (
          <Button variant="brand" onClick={handleAddPatient}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Patient
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search patients..." 
                value={searchTerm} 
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }} 
                className="pl-9" 
              />
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patient List ({totalFiltered})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                Loading patients...
              </div>
            </div>
          ) : paginatedPatients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {totalFiltered === 0 && searchTerm
                  ? `No patients match your search "${searchTerm}".`
                  : totalFiltered === 0 && statusFilter !== "all"
                  ? `No ${statusFilter} patients found.`
                  : "No patients yet. Click 'Add New Patient' to get started!"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                  <TableHead>Next Appointment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-sm text-muted-foreground">Last Visit: {patient.lastVisit || "N/A"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm">
                          <Mail className="h-3 w-3" />
                          <span>{patient.email}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm">
                          <Phone className="h-3 w-3" />
                          <span>{patient.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {patient.nextAppointment ? (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{patient.nextAppointment}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">None scheduled</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(patient.status)}</TableCell>
                    <TableCell>
                      <span className={(patient.balance ?? 0) > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                        ${patient.balance ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setIsPatientDetailsModified(false);
                            setIsPatientDetailsModalOpen(true);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMessagePatient(patient);
                            setIsMessageModalOpen(true);
                          }}
                          title="Send message to patient"
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          Message
                        </Button>
                        
                        <Button 
                          variant="dark" 
                          size="sm"
                          onClick={() => {
                            const patientId = String(patient.id || '').trim();
                            console.log("Schedule button clicked. Patient:", patient);
                            console.log("Patient ID value:", patientId, "Type:", typeof patientId);
                            openScheduleModal(patient.name || '', patient.id);
                          }}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1} | Showing {paginatedPatients.length} of {totalFiltered} patients
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Next
                </Button>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isPatientDetailsModalOpen}
        onOpenChange={(open) => {
          if (!open && isPatientDetailsModified) {
            setIsConfirmUnsavedChangesOpen(true);
            // Keep the dialog open when there are unsaved changes
          } else {
            setIsPatientDetailsModalOpen(open);
            if (!open) {
              setSelectedPatient(null);
              setIsPatientDetailsModified(false);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100">
          <DialogHeader>
            <DialogTitle>Patient Details - {selectedPatient?.name}</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <PatientDetails
              ref={patientDetailsRef}
              patient={selectedPatient}
              onDeletePatient={(p) => {
                setPatientToDelete(p);
                setIsPatientDeleteDialogOpen(true);
              }}
              isModified={isPatientDetailsModified}
              setIsModified={setIsPatientDetailsModified}
              doctorFilter={doctorFilter}
            />
          )}
        </DialogContent>
      </Dialog>

      <EditAppointmentModal />
      <EditPaymentModal />

      <Dialog open={isPatientDeleteDialogOpen} onOpenChange={setIsPatientDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {patientToDelete ? `Are you sure you want to delete ${patientToDelete.name}? This action cannot be undone.` : "Are you sure you want to delete this patient? This action cannot be undone."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPatientDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeletePatient} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmUnsavedChangesOpen} onOpenChange={setIsConfirmUnsavedChangesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes. Do you want to save them before closing?
            </p>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleDiscardAndClose}>
              Discard & Close
            </Button>
            <Button variant="secondary" onClick={handleCancelClose}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleSaveAndClose} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save & Close"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message to Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {messagePatient && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Patient:</strong> {messagePatient.name || `${messagePatient.firstName} ${messagePatient.lastName}`}</p>
                <p><strong>Email:</strong> {messagePatient.email}</p>
                <p><strong>Phone:</strong> {messagePatient.phone}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here. It will be sent via email and SMS..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">
                This message will be sent to the patient via email and text message.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsMessageModalOpen(false);
              setMessageContent("");
              setMessagePatient(null);
            }}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleSendMessage} disabled={!messageContent.trim()}>
              <Bell className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PatientDetails = React.forwardRef<{
  save: () => Promise<boolean>;
}, {
  patient: Patient;
  onDeletePatient: (p: Patient) => void;
  isModified: boolean;
  setIsModified: (isModified: boolean) => void;
  doctorFilter?: string;
}>(({
  patient,
  onDeletePatient,
  isModified,
  setIsModified,
  doctorFilter
}, ref) => {
  const { openEditModal, refreshPatients, appointments } = useAppointmentModal();
  const { openPaymentModal, openEditPaymentModal } = usePaymentModal();
  const [formData, setFormData] = useState({
    firstName: patient.firstName || patient.name?.split(' ')[0] || '',
    lastName: patient.lastName || patient.name?.split(' ').slice(1).join(' ') || '',
    email: patient.email || '',
    phone: patient.phone || '',
    dateOfBirth: patient.dateOfBirth || '',
    insurance: patient.insurance || '',
    balance: patient.balance ?? 0,
    status: patient.status || 'active',
    createdAt: patient.createdAt || new Date().toISOString().split('T')[0],
    allergies: patient.allergies || '',
    medicalHistory: patient.medicalHistory || '',
    treatmentPlan: patient.treatmentPlan || '',
    clinicalNotes: patient.clinicalNotes || '',
    address: patient.address || '',
    city: patient.city || '',
    zipCode: patient.zipCode || '',
    emergencyContact: patient.emergencyContact || '',
    emergencyPhone: patient.emergencyPhone || '',
    notes: patient.notes || '',
    dentalCharts: patient.dentalCharts || []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Patient[]>([]);
  const [parentPatient, setParentPatient] = useState<Patient | null>(null);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);

  // Payment state and helpers (local to PatientDetails)
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [mockAppointmentHistoryLocal, setMockAppointmentHistoryLocal] = useState<any[]>([]);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());

  // New state for filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyDoctorFilter, setHistoryDoctorFilter] = useState('all');
  const [historyProcedureFilter, setHistoryProcedureFilter] = useState('all');

  const uniqueDoctors = React.useMemo(() => {
    const doctors = new Set(mockAppointmentHistoryLocal.map(apt => apt.doctor).filter(Boolean));
    return ['all', ...Array.from(doctors)];
  }, [mockAppointmentHistoryLocal]);

  const uniqueProcedures = React.useMemo(() => {
      const procedures = new Set(mockAppointmentHistoryLocal.map(apt => apt.type).filter(Boolean));
      return ['all', ...Array.from(procedures)];
  }, [mockAppointmentHistoryLocal]);

  const filteredHistory = React.useMemo(() => {
    return mockAppointmentHistoryLocal.filter(apt => {
        if (historyStatusFilter !== 'all' && apt.paymentStatus !== historyStatusFilter) return false;
        if (historyDoctorFilter !== 'all' && apt.doctor !== historyDoctorFilter) return false;
        if (historyProcedureFilter !== 'all' && apt.type !== historyProcedureFilter) return false;
        return true;
    });
  }, [mockAppointmentHistoryLocal, historyStatusFilter, historyDoctorFilter, historyProcedureFilter]);

  // Filters for Payments tab
  const [paymentDoctorFilter, setPaymentDoctorFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentProcedureFilter, setPaymentProcedureFilter] = useState('all');

  const uniquePaymentDoctors = React.useMemo(() => {
    const doctors = new Set(allTransactions.map(t => t.doctor).filter(Boolean));
    return ['all', ...Array.from(doctors)];
  }, [allTransactions]);

  const uniquePaymentMethods = React.useMemo(() => {
    const methods = new Set(allTransactions.map(t => t.method).filter(Boolean));
    return ['all', ...Array.from(methods)];
  }, [allTransactions]);

  const uniquePaymentProcedures = React.useMemo(() => {
    const procedures = new Set(allTransactions.map(t => t.appointmentType).filter(Boolean));
    return ['all', ...Array.from(procedures)];
  }, [allTransactions]);

  const filteredTransactions = React.useMemo(() => {
    return allTransactions.filter(t => {
      if (paymentDoctorFilter !== 'all' && t.doctor !== paymentDoctorFilter) return false;
      if (paymentMethodFilter !== 'all' && t.method !== paymentMethodFilter) return false;
      if (paymentProcedureFilter !== 'all' && t.appointmentType !== paymentProcedureFilter) return false;
      return true;
    });
  }, [allTransactions, paymentDoctorFilter, paymentMethodFilter, paymentProcedureFilter]);

  const toggleExpandTransactions = (id: string) => {
    setExpandedTransactions((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch ((method || '').toLowerCase()) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      case 'card':
      case 'credit':
      case 'credit card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'over-paid':
        return <Badge className="bg-blue-100 text-blue-800">Over-paid</Badge>;
      case 'half-paid':
        return <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      default: // unpaid
        return <Badge className="bg-gray-100 text-gray-800">Unpaid</Badge>;
    }
  };

  useEffect(() => {
    const fetchFamilyData = async () => {
      if (!patient?.id) return;

      try {
        setIsLoadingFamily(true);
        
        // 1. If this patient has a parentId, fetch the parent
        if (patient.parentId && patient.parentId !== patient.id) {
          const parentRes = await fetch(`http://localhost:3001/api/patients/${patient.parentId}`);
          const parentJson = await parentRes.json();
          if (parentJson.success) {
            setParentPatient(parentJson.data);
          }
        } else {
          setParentPatient(null);
        }

        // 2. Fetch all dependents (patients where parentId is this patient's id)
        const familyRes = await fetch(`http://localhost:3001/api/patients?parentId=${patient.id}`);
        const familyJson = await familyRes.json();
        if (familyJson.success) {
          // Filter out the current patient from the family list
          setFamilyMembers(familyJson.data.filter((m: Patient) => m.id !== patient.id));
        }
      } catch (err) {
        console.error("Error fetching family data:", err);
      } finally {
        setIsLoadingFamily(false);
      }
    };

    fetchFamilyData();
  }, [patient]);

  useImperativeHandle(ref, () => ({
    save: handleUpdatePatient,
  }));

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isModified]);
  
  useEffect(() => {
    // If patient has an id, fetch the full record from the server so we show all fields (not just the transformed list values)
    const loadFullPatient = async () => {
      if (!patient?.id) {
        setFormData({
          firstName: patient.firstName || patient.name?.split(' ')[0] || '',
          lastName: patient.lastName || patient.name?.split(' ').slice(1).join(' ') || '',
          email: patient.email || '',
          phone: patient.phone || '',
          dateOfBirth: patient.dateOfBirth || '',
          insurance: patient.insurance || '',
          balance: patient.balance ?? 0,
          status: patient.status || 'active',
          createdAt: patient.createdAt || new Date().toISOString().split('T')[0],
          allergies: patient.allergies || '',
          medicalHistory: patient.medicalHistory || '',
          treatmentPlan: patient.treatmentPlan || '',
          clinicalNotes: patient.clinicalNotes || '',
          address: patient.address || '',
          city: patient.city || '',
          zipCode: patient.zipCode || '',
          emergencyContact: patient.emergencyContact || '',
          emergencyPhone: patient.emergencyPhone || '',
          notes: patient.notes || '',
          dentalCharts: patient.dentalCharts || []
        });
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/api/patients/${patient.id}`);
        const json = await res.json();
        if (json?.success && json.data) {
          const p = json.data;
          setFormData({
            firstName: p.firstName || p.name?.split(' ')[0] || '',
            lastName: p.lastName || p.name?.split(' ').slice(1).join(' ') || '',
            email: p.email || '',
            phone: p.phone || '',
            dateOfBirth: p.dateOfBirth || '',
            insurance: p.insurance || '',
            balance: p.balance ?? 0,
            status: p.status || 'active',
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            allergies: p.allergies || '',
            medicalHistory: p.medicalHistory || '',
            treatmentPlan: p.treatmentPlan || '',
            clinicalNotes: p.clinicalNotes || '',
            address: p.address || '',
            city: p.city || '',
            zipCode: p.zipCode || '',
            emergencyContact: p.emergencyContact || '',
            emergencyPhone: p.emergencyPhone || '',
            notes: p.notes || '',
            dentalCharts: p.dentalCharts || []
          });
        }
      } catch (err) {
        console.error("Failed to load full patient data:", err);
      }
    };

    loadFullPatient();
  }, [patient]);

  useEffect(() => {
    // If doctorFilter is set, fetch appointments directly from API for this patient
    // This ensures we get the doctor's appointments even if shared state is empty
    if (doctorFilter) {
      const fetchPatientAppointments = async () => {
        try {
          const patientName = patient.name || `${patient.firstName} ${patient.lastName}`;
          const response = await fetch(
            `http://localhost:3001/api/appointments?doctor=${encodeURIComponent(doctorFilter)}`
          );
          const result = await response.json();
          if (result.success && result.data) {
            // Filter to only this patient's appointments
            const filtered = result.data.filter((apt: Appointment) =>
              apt.patientId === patient.id ||
              apt.patientName === patientName
            ).sort((a: Appointment, b: Appointment) =>
              parseBackendDateToLocal(b.date).getTime() - parseBackendDateToLocal(a.date).getTime()
            );
            setPatientAppointments(filtered);
          }
        } catch (error) {
          console.error("Error fetching patient appointments:", error);
          setPatientAppointments([]);
        }
      };
      fetchPatientAppointments();
    } else {
      // Admin view - use shared appointments state
      const filtered = appointments.filter((apt: Appointment) =>
        apt.patientId === patient.id ||
        apt.patientName === `${patient.firstName} ${patient.lastName}` ||
        apt.patientName === patient.name
      ).sort((a: Appointment, b: Appointment) => parseBackendDateToLocal(b.date).getTime() - parseBackendDateToLocal(a.date).getTime());

      setPatientAppointments(filtered);
    }
  }, [appointments, patient, doctorFilter]);

    // Map patientAppointments into local appointment history shape used for payments
    useEffect(() => {
      const mapped = patientAppointments.map((apt: Appointment, i: number) => {
        const id = apt.id || `apt-${i}`;
        const cost = (apt.price != null ? apt.price : 0);
        const totalPaid = (apt as any).totalPaid != null ? (apt as any).totalPaid : 0;
        const transactions = (apt as any).transactions ? (apt as any).transactions : [];
        
        let paymentStatus;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const aptDateStr = (apt.date || '').split(' ')[0];
        const appointmentDate = parseBackendDateToLocal(aptDateStr);

        if (totalPaid > cost && cost > 0) {
          paymentStatus = 'over-paid';
        } else if (totalPaid > 0 && totalPaid < cost) {
          paymentStatus = 'half-paid';
        } else if (totalPaid >= cost && cost > 0) {
          paymentStatus = 'paid';
        } else if (totalPaid === 0 && cost > 0 && appointmentDate < oneWeekAgo) {
          paymentStatus = 'overdue';
        } else {
          paymentStatus = 'unpaid';
        }

        return {
          id,
          date: apt.date + (apt.time ? ` ${apt.time}` : ''),
          type: getAppointmentTypeName(apt.type, (apt as any).customType) || apt.type || 'Appointment',
          doctor: apt.doctor || '',
          notes: apt.notes || '',
          cost,
          totalPaid,
          paymentStatus,
          transactions: transactions as any[],
        };
      });

      setMockAppointmentHistoryLocal(mapped);

      // Fetch payments from new payments collection and merge into history
      if (patient?.id) {
        fetch(`http://localhost:3001/api/payments/patient/${patient.id}`)
          .then(res => res.json())
          .then(json => {
            if (json?.success && Array.isArray(json.data)) {
              const payments = json.data;
              // group payments by appointmentId and update appointment history
              setMockAppointmentHistoryLocal((prev: any[]) => {
                return prev.map((apt: any) => {
                  const aptPayments = payments.filter((p: any) => p.appointmentId === apt.id);
                  if (aptPayments.length > 0) {
                    const totalPaid = aptPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
                    const price = apt.price || 0;
                    
                    let paymentStatus;
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    const aptDateStr = (apt.date || '').split(' ')[0];
                    const appointmentDate = parseBackendDateToLocal(aptDateStr);

                    if (totalPaid > price && price > 0) {
                      paymentStatus = 'over-paid';
                    } else if (totalPaid > 0 && totalPaid < price) {
                      paymentStatus = 'half-paid';
                    } else if (totalPaid >= price && price > 0) {
                      paymentStatus = 'paid';
                    } else if (totalPaid === 0 && price > 0 && appointmentDate < oneWeekAgo) {
                      paymentStatus = 'overdue';
                    } else {
                      paymentStatus = 'unpaid';
                    }

                    return {
                      ...apt,
                      totalPaid,
                      transactions: aptPayments,
                      paymentStatus,
                    };
                  }
                  return apt;
                });
              });
            }
          })
          .catch(err => console.warn('[Payments] Failed to fetch patient payments:', err));
      }
    }, [patientAppointments, patient?.id]);

    // Populate the allTransactions list from the appointment history so persisted
    // transactions show immediately in the Payments tab without needing to add a new payment
    useEffect(() => {
      try {
        const txns = (mockAppointmentHistoryLocal || []).flatMap((a: any) => (a.transactions || []).map((t: any) => ({
          ...t,
          appointmentId: a.id,
          appointmentType: a.type,
          appointmentDate: a.date,
          doctor: a.doctor,
        })));

        // dedupe by id
        const deduped = Array.from(new Map(txns.map((t: any) => [t.id, t])).values());
        // sort by date desc (newest first)
        deduped.sort((x: any, y: any) => new Date(y.date).getTime() - new Date(x.date).getTime());
        setAllTransactions(deduped);
      } catch (e) {
        console.warn('[Payments] failed to populate transactions from history', e);
      }
    }, [mockAppointmentHistoryLocal]);

  const handleUpdatePatient = async () => {
    console.log("=== UPDATE PATIENT BUTTON CLICKED ===");
    console.log("Patient ID:", patient.id);
    console.log("Form data:", formData);

    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/api/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData })
      });

      const result = await response.json();
      console.log("Update response:", result);
      if (result.success) {
        toast.success("Patient updated successfully");
        refreshPatients();
        setIsModified(false);
        return true; // Indicate success
      } else {
        toast.error(result.message || "Failed to update patient");
        return false; // Indicate failure
      }
    } catch (err) {
      console.error("Error updating patient:", err);
      toast.error("Error connecting to server. Make sure the backend is running on port 3001.");
      return false; // Indicate failure
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePatient = () => {
    onDeletePatient(patient);
  };

  const handleDeletePayment = async (paymentId: string, appointmentId: string) => {
    console.log("=== DELETE PAYMENT STARTED ===");
    console.log("Payment ID:", paymentId);
    console.log("Appointment ID:", appointmentId);
    
    try {
      const deleteUrl = `http://localhost:3001/api/payments/${paymentId}`;
      console.log("DELETE URL:", deleteUrl);
      
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Response Status:", response.status);
      console.log("Response OK:", response.ok);
      
      const result = await response.json();
      console.log("Response JSON:", result);
      
      if (result.success) {
        toast.success("Payment deleted successfully");
        console.log("Delete successful, refreshing patients...");
        // Refresh the appointments to reflect the deletion
        refreshPatients();
      } else {
        console.log("Delete failed with message:", result.message);
        toast.error(result.message || "Failed to delete payment");
      }
    } catch (err) {
      console.error("Error deleting payment:", err);
      toast.error("Error deleting payment");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2 pb-4 border-b">
        <Button variant="destructive" size="sm" onClick={handleDeletePatient} disabled={isSaving}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Delete
        </Button>
        <Button variant="brand" size="sm" onClick={handleUpdatePatient} disabled={!isModified || isSaving}>
          <Edit className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Update Patient"}
        </Button>
      </div>

      <Tabs defaultValue="info" className="w-full">
  <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger
            value="info"
            className="data-[state=active]:bg-violet-500 data-[state=active]:text-white hover:bg-violet-100"
          >
            Personal Info
          </TabsTrigger>
          <TabsTrigger
            value="family"
            className="data-[state=active]:bg-violet-500 data-[state=active]:text-white hover:bg-violet-100"
          >
            Family
          </TabsTrigger>
          <TabsTrigger
            value="records"
            className="data-[state=active]:bg-violet-500 data-[state=active]:text-white hover:bg-violet-100"
          >
            Dental Records
          </TabsTrigger>
          <TabsTrigger
            value="chart"
            className="data-[state=active]:bg-violet-500 data-[state=active]:text-white hover:bg-violet-100"
          >
            Dental Chart
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-violet-500 data-[state=active]:text-white hover:bg-violet-100"
          >
            Appointment History
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="data-[state=active]:bg-violet-500 data-[state=active]:text-white hover:bg-violet-100"
          >
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={formData.firstName} onChange={(e) => { setFormData(prev => ({ ...prev, firstName: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={formData.lastName} onChange={(e) => { setFormData(prev => ({ ...prev, lastName: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>

                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.dateOfBirth} onChange={(e) => { setFormData(prev => ({ ...prev, dateOfBirth: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>
                <div>
                  <Label>Created At</Label>
                  <Input type="date" value={formData.createdAt} onChange={(e) => { setFormData(prev => ({ ...prev, createdAt: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => { setFormData(prev => ({ ...prev, email: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => { setFormData(prev => ({ ...prev, phone: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>

                <div>
                  <Label>Insurance Provider</Label>
                  <Input value={formData.insurance} onChange={(e) => { setFormData(prev => ({ ...prev, insurance: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>
                <div>
                  <Label>Current Balance</Label>
                  <Input type="number" value={formData.balance} onChange={(e) => { setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 })); setIsModified(true); }} disabled={isSaving} />
                </div>

                <div className="col-span-2" />

                <div>
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={(e) => { setFormData(prev => ({ ...prev, address: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={formData.city} onChange={(e) => { setFormData(prev => ({ ...prev, city: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>
                <div>
                  <Label>Zip Code</Label>
                  <Input value={formData.zipCode} onChange={(e) => { setFormData(prev => ({ ...prev, zipCode: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input value={formData.emergencyContact} onChange={(e) => { setFormData(prev => ({ ...prev, emergencyContact: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>
                <div>
                  <Label>Emergency Contact Phone</Label>
                  <Input value={formData.emergencyPhone} onChange={(e) => { setFormData(prev => ({ ...prev, emergencyPhone: e.target.value })); setIsModified(true); }} disabled={isSaving} />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => { setFormData(prev => ({ ...prev, status: value })); setIsModified(true); }} disabled={isSaving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>General Notes</Label>
                  <Input value={formData.notes} onChange={(e) => { setFormData(prev => ({ ...prev, notes: e.target.value })); setIsModified(true); }} disabled={isSaving} placeholder="Enter general notes about the patient..." className="h-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="family" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-violet-600" />
                  Family Relationship
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-50 border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-500">Account Type</span>
                    <Badge variant={patient.isPrimary ? "brand" : "outline"}>
                      {patient.isPrimary ? "Primary Account" : "Dependent Account"}
                    </Badge>
                  </div>
                  
                  {!patient.isPrimary && parentPatient && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm font-medium text-gray-500 block mb-2">Primary Account Holder</span>
                      <div className="flex items-center p-3 bg-white rounded border">
                        <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mr-3">
                          <UserIcon className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{parentPatient.name}</div>
                          <div className="text-xs text-gray-500">Parent / Guardian</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {patient.isPrimary && (
                    <div className="mt-2 text-sm text-gray-600">
                      This is the primary account. This patient manages their own appointments and those of their dependents.
                    </div>
                  )}
                </div>

                {patient.isPrimary && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-gray-900">Family Members / Dependents</h3>
                    </div>
                    
                    {isLoadingFamily ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mx-auto"></div>
                      </div>
                    ) : familyMembers.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                        <p className="text-sm text-gray-500">No family members registered.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {familyMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <UserIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold">{member.name}</div>
                                <div className="text-xs text-gray-500">{member.relationship || "Family Member"}</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => {
                              toast.info(`Viewing ${member.name}'s profile from the main list is recommended.`);
                            }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Family Shared Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">Inherited Contact Details</p>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                      <div>
                        <span className="text-gray-500 block">Email</span>
                        <span className="font-medium">{patient.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Phone</span>
                        <span className="font-medium">{patient.phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">Inherited Address</p>
                    <p className="text-sm">
                      {patient.address}<br />
                      {patient.city}, {patient.zipCode}
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">Family Insurance</p>
                    <p className="text-sm font-medium">{patient.insurance || "None specified"}</p>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 italic">
                  * Dependents automatically inherit contact, address, and insurance information from the primary account holder.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dental Records & Treatment Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Allergies</Label>
                <Input value={formData.allergies} onChange={(e) => { setFormData(prev => ({ ...prev, allergies: e.target.value })); setIsModified(true); }} disabled={isSaving} placeholder="Enter any allergies or sensitivities..." className="h-24" />
              </div>
              <div>
                <Label>Medical History</Label>
                <Input value={formData.medicalHistory} onChange={(e) => { setFormData(prev => ({ ...prev, medicalHistory: e.target.value })); setIsModified(true); }} disabled={isSaving} placeholder="Enter relevant medical history..." className="h-24" />
              </div>
              <div>
                <Label>Current Treatment Plan</Label>
                <Input value={formData.treatmentPlan} onChange={(e) => { setFormData(prev => ({ ...prev, treatmentPlan: e.target.value })); setIsModified(true); }} disabled={isSaving} placeholder="Enter treatment plan..." className="h-24" />
              </div>
              <div>
                <Label>Clinical Notes</Label>
                <Input value={formData.clinicalNotes} onChange={(e) => { setFormData(prev => ({ ...prev, clinicalNotes: e.target.value })); setIsModified(true); }} disabled={isSaving} placeholder="Enter clinical observations and notes..." className="h-24" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="space-y-4">
          <DentalChart 
            records={formData.dentalCharts} 
            onSaveRecords={(updatedRecords) => {
              setFormData(prev => ({ ...prev, dentalCharts: updatedRecords }));
              setIsModified(true);
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <CardTitle>Appointment History</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="half-paid">Partially Paid</SelectItem>
                                <SelectItem value="over-paid">Over-paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                        {/* Hide doctor filter when viewing as a doctor - they only see their own appointments */}
                        {!doctorFilter && (
                          <Select value={historyDoctorFilter} onValueChange={setHistoryDoctorFilter}>
                              <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Filter by doctor" />
                              </SelectTrigger>
                              <SelectContent>
                                  {uniqueDoctors.map(doctor => (
                                      <SelectItem key={doctor} value={doctor}>{doctor === 'all' ? 'All Doctors' : doctor}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                        )}
                        <Select value={historyProcedureFilter} onValueChange={setHistoryProcedureFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by procedure" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueProcedures.map(proc => (
                                    <SelectItem key={proc} value={proc}>{proc === 'all' ? 'All Procedures' : proc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(filteredHistory.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {mockAppointmentHistoryLocal.length === 0 ? "No appointments scheduled for this patient yet." : "No appointments match the selected filters."}
                    </div>
                ) : (
                  <div className="space-y-4">
                    {filteredHistory.map((appointment: any, index: number) => {
                      const sortedTransactions = Array.from(new Map((appointment.transactions || []).map((t: any) => [t.id, t])).values())
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                      
                      const isExpanded = expandedTransactions.has(appointment.id);
                      const visibleTransactions = isExpanded ? sortedTransactions : sortedTransactions.slice(0, 1);

                      return (
                        <div key={appointment.id || `apt-${index}`} className="border rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-x-4 items-start">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <div className="text-sm">
                                  <div className="font-medium text-base">{appointment.type}</div>
                                  <div className="text-muted-foreground">{appointment.date}</div>
                                </div>
                                {getPaymentStatusBadge(appointment.paymentStatus)}
                              </div>
                              <div className="text-sm">
                                <div className="font-medium">{appointment.doctor}</div>
                                <div className="text-muted-foreground">{appointment.notes}</div>
                              </div>
                            </div>
                            <div className="space-y-2 text-right">
                              <div>
                                <div className="text-sm font-medium">Total: ${appointment.price}</div>
                                <div className="text-sm text-muted-foreground">Paid: ${appointment.totalPaid}</div>
                                {(appointment.price || 0) - (appointment.totalPaid || 0) > 0 && (
                                  <div className="text-sm font-medium text-red-600">
                                    Balance: ${(appointment.price || 0) - (appointment.totalPaid || 0)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-4 mt-4 border-t">
                              <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => {
                                                          // find original appointment object by id
                                                          const original = patientAppointments.find((x: Appointment) => x.id === appointment.id);
                                                          if (original) openEditModal(original, true);
                                                        }}
                                                      >
                          <Eye className="h-4 w-4 mr-2" />
                          View Appointment
                        </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (patient.id && patient.name) {
                                    openPaymentModal(patient.id, patient.name, mockAppointmentHistoryLocal, appointment.id);
                                  }
                                }}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Record Payment
                              </Button>
                            </div>
                          {sortedTransactions.length > 0 && (
                            <div className="border-t pt-3 mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium">Payment Transactions</div>
                                {sortedTransactions.length > 1 &&
                                  <button type="button" className="text-sm text-primary underline-offset-1 hover:underline" onClick={() => toggleExpandTransactions(appointment.id)}>
                                    {isExpanded ? 'Less' : 'More'}
                                  </button>
                                }
                              </div>
                              <div className="space-y-2">
                                {visibleTransactions.map((txn: any) => (
                                  <div key={txn.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                    <div className="flex items-center space-x-2">
                                      {getPaymentMethodIcon(txn.method)}
                                      <div>
                                        <div className="font-medium">{txn.method} - ${txn.amount}</div>
                                        <div className="text-xs text-muted-foreground">{txn.date} • {txn.transactionId}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => {
                                          openEditPaymentModal(txn.id, txn, patient.id, mockAppointmentHistoryLocal);
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit Payment</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to delete this payment (${txn.method} - $${txn.amount})?`)) {
                                            handleDeletePayment(txn.id, appointment.id);
                                          }
                                        }}
                                      >
                                        <Trash className="h-4 w-4" />
                                        <span className="sr-only">Delete Payment</span>
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card> 
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <CardTitle>Payment History</CardTitle>
                    <div className="flex flex-col items-end gap-1">
                        <Button 
                            size="sm"
                            onClick={() => {
                              if (patient.id && patient.name) {
                                openPaymentModal(patient.id, patient.name, mockAppointmentHistoryLocal, null);
                              }
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Payment
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Total Transactions: <span className="font-semibold">{filteredTransactions.length}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by payment method" />
                        </SelectTrigger>
                        <SelectContent>
                            {uniquePaymentMethods.map(method => (
                                <SelectItem key={method} value={method}>{method === 'all' ? 'All Methods' : method}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Hide doctor filter when viewing as a doctor */}
                    {!doctorFilter && (
                      <Select value={paymentDoctorFilter} onValueChange={setPaymentDoctorFilter}>
                          <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Filter by doctor" />
                          </SelectTrigger>
                          <SelectContent>
                              {uniquePaymentDoctors.map(doctor => (
                                  <SelectItem key={doctor} value={doctor}>{doctor === 'all' ? 'All Doctors' : doctor}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    )}
                    <Select value={paymentProcedureFilter} onValueChange={setPaymentProcedureFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by procedure" />
                        </SelectTrigger>
                        <SelectContent>
                            {uniquePaymentProcedures.map(proc => (
                                <SelectItem key={proc} value={proc}>{proc === 'all' ? 'All Procedures' : proc}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Paid</p>
                          <p className="text-2xl font-semibold text-green-600">
                            ${mockAppointmentHistoryLocal.reduce((sum: number, apt: any) => sum + (apt.totalPaid || 0), 0)}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Outstanding</p>
                          <p className="text-2xl font-semibold text-red-600">
                            ${mockAppointmentHistoryLocal.reduce((sum: number, apt: any) => sum + ((apt.price || 0) - (apt.totalPaid || 0)), 0)}
                          </p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Billed</p>
                          <p className="text-2xl font-semibold">
                            ${mockAppointmentHistoryLocal.reduce((sum: number, apt: any) => sum + (apt.price || 0), 0)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-gray-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction List */}
                <div className="space-y-3">
                  <h3 className="font-medium">All Transactions</h3>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((txn) => (
                      <div key={txn.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded">
                              {getPaymentMethodIcon(txn.method)}
                            </div>
                            <div>
                              <div className="font-medium">{txn.method}</div>
                              <div className="text-sm text-muted-foreground">
                                {txn.appointmentType} - {txn.appointmentDate}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Dr: {txn.doctor}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">${txn.amount}</div>
                              <div className="text-xs text-muted-foreground">{txn.date}</div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (patient.id && patient.name) {
                                      openEditPaymentModal(txn.id, txn, patient.id, mockAppointmentHistoryLocal);
                                    }
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this payment?")) {
                                      const updatedHistory = mockAppointmentHistoryLocal.map(apt => {
                                        if (apt.id === txn.appointmentId) {
                                          const newTransactions = apt.transactions?.filter((t: any) => t.id !== txn.id) || [];
                                          const newTotalPaid = newTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
                                          return {
                                            ...apt,
                                            transactions: newTransactions,
                                            totalPaid: newTotalPaid
                                          };
                                        }
                                        return apt;
                                      });
                                      setMockAppointmentHistoryLocal(updatedHistory);
                                      toast.success("Payment deleted successfully");
                                    }
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t">
                          <div className="text-muted-foreground">
                            ID: {txn.transactionId}
                          </div>
                          <Badge variant="outline" className={
                            txn.status === "completed" ? "bg-green-50 text-green-700" : ""
                          }>
                            {txn.status}
                          </Badge>
                        </div>
                        {txn.notes && (
                          <div className="text-sm text-muted-foreground mt-2 italic">
                            {txn.notes}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No payment transactions found for the selected filters.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Record Payment Dialog is now a separate component */}
    </div>
  );
});

 
