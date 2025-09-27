import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useAppointmentModal } from "./AdminLayout";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
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
  AlertTriangle
} from "lucide-react";

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
  id: number;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  lastVisit: string;
  nextAppointment: string | null;
  status: string;
  insurance: string;
  balance: number;
}

export function PatientsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { openScheduleModal, openAddPatientModal } = useAppointmentModal();

  const filteredPatients = mockPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Patients</h1>
          <p className="text-muted-foreground">Manage patient information and appointments</p>
        </div>
        <Button variant="brand" onClick={() => openAddPatientModal()}>
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
            <Select>
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
          <CardTitle>Patient List ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Next Appointment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-sm text-muted-foreground">DOB: {patient.dateOfBirth}</div>
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
                  <TableCell>{patient.lastVisit}</TableCell>
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
                    <span className={patient.balance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                      ${patient.balance}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Patient Details - {patient.name}</DialogTitle>
                          </DialogHeader>
                          <PatientDetails patient={patient} />
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="dark" 
                        size="sm"
                        onClick={() => openScheduleModal(patient.name, patient.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}

function PatientDetails({ patient }: { patient: Patient }) {
  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 border-b pb-4">
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Update Patient
        </Button>
        <Button variant="cancel" size="sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Delete Patient
        </Button>
      </div>
      
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="records">Dental Records</TabsTrigger>
          <TabsTrigger value="history">Appointment History</TabsTrigger>
        </TabsList>
      
      <TabsContent value="info" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={patient.name} readOnly />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input value={patient.dateOfBirth} readOnly />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={patient.email} readOnly />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={patient.phone} readOnly />
              </div>
              <div>
                <Label>Insurance Provider</Label>
                <Input value={patient.insurance} readOnly />
              </div>
              <div>
                <Label>Current Balance</Label>
                <Input value={`$${patient.balance}`} readOnly />
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
              <Textarea value="Penicillin allergy noted" readOnly />
            </div>
            <div>
              <Label>Medical History</Label>
              <Textarea value="Hypertension - controlled with medication. No other significant medical history." readOnly />
            </div>
            <div>
              <Label>Current Treatment Plan</Label>
              <Textarea value="1. Regular cleanings every 6 months\n2. Monitor tooth #14 filling\n3. Consider whitening treatment" readOnly />
            </div>
            <div>
              <Label>Clinical Notes</Label>
              <Textarea value="Patient maintains good oral hygiene. Last cleaning showed minimal plaque buildup. Gums healthy." readOnly />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="history" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Appointment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAppointmentHistory.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <div className="font-medium">{appointment.date}</div>
                      <div className="text-muted-foreground">{appointment.type}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{appointment.doctor}</div>
                      <div className="text-muted-foreground">{appointment.notes}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">${appointment.cost}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </div>
  );
}

