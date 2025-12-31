import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "./AdminLayout";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
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
  AlertTriangle
} from "lucide-react";
import { EditAppointmentModal } from "./EditAppointmentModal";
import { Appointment } from "../hooks/useAppointments";
import { DentalChart } from "./DentalChart";
import { getAppointmentTypeName } from "../lib/appointment-types";
import { parseBackendDateToLocal, formatDateToYYYYMMDD } from "../lib/utils";

const mockPatients = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "(555) 123-4567",
    dateOfBirth: "1985-03-15",
    lastVisit: "2024-01-15",
    nextAppointment: "2024-02-20",
    status: "active",
    insurance: "Blue Cross",
    balance: 0
  },
  {
    id: 2,
    name: "Sarah Davis",
    email: "sarah.davis@email.com",
    phone: "(555) 234-5678",
    dateOfBirth: "1990-07-22",
    lastVisit: "2024-01-18",
    nextAppointment: null,
    status: "active",
    insurance: "Aetna",
    balance: 250
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike.johnson@email.com",
    phone: "(555) 345-6789",
    dateOfBirth: "1978-11-08",
    lastVisit: "2023-12-10",
    nextAppointment: "2024-02-25",
    status: "overdue",
    insurance: "Delta Dental",
    balance: 450
  },
  {
    id: 4,
    name: "Emily Brown",
    email: "emily.brown@email.com",
    phone: "(555) 456-7890",
    dateOfBirth: "1995-05-30",
    lastVisit: "2024-01-20",
    nextAppointment: "2024-02-15",
    status: "active",
    insurance: "Cigna",
    balance: 0
  }
];

const mockAppointmentHistory = [
  { date: "2024-01-15", type: "Cleaning", doctor: "Dr. Johnson", notes: "Routine cleaning completed", cost: 150 },
  { date: "2023-10-20", type: "Checkup", doctor: "Dr. Chen", notes: "No issues found", cost: 75 },
  { date: "2023-07-15", type: "Filling", doctor: "Dr. Johnson", notes: "Composite filling on tooth #14", cost: 280 },
  { date: "2023-04-10", type: "Cleaning", doctor: "Dr. Rodriguez", notes: "Routine cleaning completed", cost: 150 }
];

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
  dentalCharts?: { date: string; data: string }[];
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
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPatientDeleteDialogOpen, setIsPatientDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPatientDetailsModified, setIsPatientDetailsModified] = useState(false);
  const itemsPerPage = 10;
  const { openScheduleModal, openAddPatientModal, refreshPatients, refreshTrigger, appointments } = useAppointmentModal();
  
  // Fetch patients from backend with pagination, search, and status filtering
  const fetchPatients = async (page = 1) => {
    try {
      setIsLoading(true);
      const q = encodeURIComponent(searchTerm || "");
      const statusParam = statusFilter || "all";
      const res = await fetch(
        `http://localhost:3001/api/patients?page=${page}&limit=${itemsPerPage}&search=${q}&status=${statusParam}`
      );
      const result = await res.json();

      if (result && result.success) {
        const data = result.data || [];
        const meta = result.meta || { total: 0, page, limit: itemsPerPage, totalPages: 1 };

        const todayStr = formatDateToYYYYMMDD(new Date());

        const transformedPatients = data.map((patient: any) => {
          const patientAppointments = appointments.filter(
            (apt: any) => apt.patientId === patient.id || apt.patientName === `${patient.firstName} ${patient.lastName}`
          );

          const upcomingAppointments = patientAppointments
            .filter((apt: any) => apt.date >= todayStr && apt.status !== "completed" && apt.status !== "cancelled")
            .sort((a: any, b: any) => {
              if (a.date !== b.date) return a.date.localeCompare(b.date);
              return a.time.localeCompare(b.time);
            });

          const completedAppointments = patientAppointments
            .filter((apt: any) => apt.status === "completed")
            .sort((a: any, b: any) => parseBackendDateToLocal(b.date).getTime() - parseBackendDateToLocal(a.date).getTime());

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
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPaginatedPatients([]);
      setTotalPages(1);
      setTotalFiltered(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch patients when page, search, status filter, or refresh trigger changes
  useEffect(() => {
    fetchPatients(currentPage);
  }, [currentPage, searchTerm, statusFilter, refreshTrigger, appointments]);

  const handleAddPatient = () => {
    openAddPatientModal();
  };
  
  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete?.id) {
      toast.error("Missing patient id");
      return;
    }

    setIsDeleting(true);
    try {
      console.log("[DELETE PATIENT] Attempting to delete patient:", patientToDelete.id);
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
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
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
      
      {/* Patients Table */}
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setIsPatientDetailsModified(false);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                            <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Patient Details - {patient.name}</DialogTitle>
                              </DialogHeader>
                              <PatientDetails 
                                patient={patient} 
                                onClose={() => setSelectedPatient(null)} 
                                onEditAppointment={(apt) => {
                                  setEditingAppointment(apt);
                                  setIsEditModalOpen(true);
                                }}
                                onDeletePatient={(p) => {
                                  setPatientToDelete(p);
                                  setIsPatientDeleteDialogOpen(true);
                                }}
                                isModified={isPatientDetailsModified}
                                setIsModified={setIsPatientDetailsModified}
                              />
                            </DialogContent>
                          </Dialog>
                        
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

      <EditAppointmentModal 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen} 
        appointment={editingAppointment} 
      />

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
    </div>
  );
}

function PatientDetails({ 
  patient, 
  onClose, 
  onEditAppointment,
  onDeletePatient,
  isModified,
  setIsModified
}: { 
  patient: Patient; 
  onClose: () => void;
  onEditAppointment: (apt: Appointment) => void;
  onDeletePatient: (p: Patient) => void;
  isModified: boolean;
  setIsModified: (isModified: boolean) => void;
}) {
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
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const { refreshPatients, appointments } = useAppointmentModal();

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
    const filtered = appointments.filter(apt =>
      apt.patientId === patient.id ||
      apt.patientName === `${patient.firstName} ${patient.lastName}` ||
      apt.patientName === patient.name
    ).sort((a, b) => parseBackendDateToLocal(b.date).getTime() - parseBackendDateToLocal(a.date).getTime());

    setPatientAppointments(filtered);
  }, [appointments, patient]);

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
      } else {
        toast.error(result.message || "Failed to update patient");
      }
    } catch (err) {
      console.error("Error updating patient:", err);
      toast.error("Error connecting to server. Make sure the backend is running on port 3001.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePatient = () => {
    onDeletePatient(patient);
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
        <TabsList className="grid w-full grid-cols-4">
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
              <CardTitle>Appointment History</CardTitle>
            </CardHeader>
            <CardContent>
              {patientAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No appointments scheduled for this patient yet.</div>
              ) : (
                <div className="space-y-4">
                  {patientAppointments.map((appointment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <div className="font-medium">{appointment.date} at {appointment.time}</div>
                          <div className="text-muted-foreground">{getAppointmentTypeName(appointment.type, appointment.customType)}</div>
                          {appointment.price != null && <div className="text-muted-foreground">${appointment.price.toFixed(2)}</div>}
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{appointment.doctor}</div>
                          <div className="text-muted-foreground">{appointment.notes || 'No notes'}</div>
                        </div>
                      </div>
                      <div className="text-sm flex items-center space-x-4">
                        <span className={new Date(`${appointment.date}T${appointment.time}`) < new Date() ? 'text-gray-500' : 'text-blue-600'}>
                          {new Date(`${appointment.date}T${appointment.time}`) < new Date() ? 'Completed' : 'Scheduled'}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            onEditAppointment(appointment);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Appointment</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

