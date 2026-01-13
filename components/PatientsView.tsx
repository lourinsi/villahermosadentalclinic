"use client";

import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
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
  FileText, 
  Edit,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  CreditCard
} from "lucide-react";
import { EditAppointmentModal } from "./EditAppointmentModal";
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
  dentalCharts?: { date: string; data: string; isEmpty: boolean }[];
}

export function PatientsView() {
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
  
  const [isConfirmUnsavedChangesOpen, setIsConfirmUnsavedChangesOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const patientDetailsRef = useRef<{ save: () => Promise<boolean> } | null>(null);
  const itemsPerPage = 10;
  const { openScheduleModal, openAddPatientModal, refreshPatients, refreshTrigger, appointments, openEditModal } = useAppointmentModal();
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
      const res = await fetch(
        `http://localhost:3001/api/patients?page=${page}&limit=${itemsPerPage}&search=${q}&status=${statusParam}`,
        { signal: controller.signal }
      );

      const result = await res.json();

      if (result && result.success) {
        const data = result.data || [];
        const meta = result.meta || { total: 0, page, limit: itemsPerPage, totalPages: 1 };

        const todayStr = formatDateToYYYYMMDD(new Date());

        const transformedPatients = data.map((patient: Patient) => {
          const patientAppointments = appointments.filter(
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
            id: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patient.email,
            phone: patient.phone,
            dateOfBirth: patient.dateOfBirth,
            lastVisit: effectiveLastVisit,
            nextAppointment: nextApt,
            status: status,
            insurance: patient.insurance,
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

    // Fetch patients when page, search, status filter, or refresh trigger changes
  useEffect(() => {
    fetchPatients(currentPage);
  }, [currentPage, searchTerm, statusFilter, refreshTrigger, appointments]);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Patients</h1>
          <p className="text-muted-foreground">Manage patient information and appointments</p>
        </div>
        <Button variant="brand" onClick={handleAddPatient}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Patient
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search patients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              onClose={() => setSelectedPatient(null)}
              onDeletePatient={(p) => {
                setPatientToDelete(p);
                setIsPatientDeleteDialogOpen(true);
              }}
              isModified={isPatientDetailsModified}
              setIsModified={setIsPatientDetailsModified}
            />
          )}
        </DialogContent>
      </Dialog>

      <EditAppointmentModal />

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
    </div>
  );
}

const PatientDetails = React.forwardRef<{
  save: () => Promise<boolean>;
}, {
  patient: Patient;
  onClose: () => void;
  onDeletePatient: (p: Patient) => void;
  isModified: boolean;
  setIsModified: (isModified: boolean) => void;
}>(({
  patient,
  onClose,
  onDeletePatient,
  isModified,
  setIsModified
}, ref) => {
  const { openEditModal, refreshPatients, appointments } = useAppointmentModal();
  const { openPaymentModal } = usePaymentModal();
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
  const [isConfirmUnsavedChangesOpen, setIsConfirmUnsavedChangesOpen] = useState(false); // New state
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);

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
    const filtered = appointments.filter((apt: Appointment) =>
      apt.patientId === patient.id ||
      apt.patientName === `${patient.firstName} ${patient.lastName}` ||
      apt.patientName === patient.name
    ).sort((a: Appointment, b: Appointment) => parseBackendDateToLocal(b.date).getTime() - parseBackendDateToLocal(a.date).getTime());

    setPatientAppointments(filtered);
  }, [appointments, patient]);

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
                    const cost = apt.cost || 0;
                    
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

  const handleSaveAndClose = async () => {
    const success = await handleUpdatePatient();
    if (success) {
      onClose(); // Call parent's onClose only if save was successful
    }
    setIsConfirmUnsavedChangesOpen(false);
  };

  const handleDiscardAndClose = () => {
    setIsModified(false); // Clear modified state
    onClose(); // Call parent's onClose
    setIsConfirmUnsavedChangesOpen(false);
  };

  const handleCancelClose = () => {
    setIsConfirmUnsavedChangesOpen(false); // Close the prompt, stay in the modal
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
  <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger
            value="info"
            className="data-[state=active]:bg-violet-500 data-[state=active]:text-white hover:bg-violet-100"
          >
            Personal Info
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
                                <div className="text-sm font-medium">Total: ${appointment.cost}</div>
                                <div className="text-sm text-muted-foreground">Paid: ${appointment.totalPaid}</div>
                                {appointment.cost - appointment.totalPaid > 0 && (
                                  <div className="text-sm font-medium text-red-600">
                                    Balance: ${appointment.cost - appointment.totalPaid}
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
                                    <Badge variant="outline" className="text-xs">
                                      {txn.status}
                                    </Badge>
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
                            ${mockAppointmentHistoryLocal.reduce((sum: number, apt: any) => sum + ((apt.cost || 0) - (apt.totalPaid || 0)), 0)}
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
                            ${mockAppointmentHistoryLocal.reduce((sum: number, apt: any) => sum + (apt.cost || 0), 0)}
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
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-600">${txn.amount}</div>
                            <div className="text-xs text-muted-foreground">{txn.date}</div>
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

 
