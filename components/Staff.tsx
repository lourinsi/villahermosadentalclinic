"use client";

import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Calendar as CalendarComponent } from "./ui/calendar";
import {
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  CreditCard,
  CalendarRange,
  X,
  Eye,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock
}from "lucide-react";

export interface Staff {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  hireDate: string;
  baseSalary: number;
  status: string;
  employmentType: string;
  specialization: string;
  licenseNumber: string;
}

export interface StaffFinancialRecord {
  id: string;
  staffId: string;
  staffName: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  notes: string;
  repaymentSchedule: string;
}

export interface Attendance {
  staffId: string;
  staffName: string;
  hoursWorked: number;
  daysPresent: number;
  daysAbsent: number;
  overtimeHours: number;
}


export function StaffView() {
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
  const [isAddFinancialDialogOpen, setIsAddFinancialDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [newStaff, setNewStaff] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    department: "",
    employmentType: "",
    hireDate: "",
    baseSalary: 0,
    specialization: "",
    licenseNumber: "",
  });
  const [newFinancialRecord, setNewFinancialRecord] = useState({
    staffId: "",
    type: "",
    amount: 0,
    date: "",
    repaymentSchedule: "",
    notes: "",
  });

  const [staffData, setStaffData] = useState<Staff[]>([]);
  const [financialRecords, setFinancialRecords] = useState<StaffFinancialRecord[]>([]);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditStaffDialogOpen, setIsEditStaffDialogOpen] = useState(false);
  const [isStaffDetailsDialogOpen, setIsStaffDetailsDialogOpen] = useState(false);
  const [isDeleteStaffDialogOpen, setIsDeleteStaffDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);
  const [editStaffForm, setEditStaffForm] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    department: "",
    employmentType: "",
    hireDate: "",
    baseSalary: 0,
    specialization: "",
    licenseNumber: "",
    status: "active"
  });
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState<Attendance>({
    staffId: "",
    staffName: "",
    hoursWorked: 0,
    daysPresent: 0,
    daysAbsent: 0,
    overtimeHours: 0,
  });
  const [isEditFinancialDialogOpen, setIsEditFinancialDialogOpen] = useState(false);
  const [isDeleteFinancialDialogOpen, setIsDeleteFinancialDialogOpen] = useState(false);
  const [editingFinancialRecord, setEditingFinancialRecord] = useState<StaffFinancialRecord | null>(null);
  const [financialRecordToDelete, setFinancialRecordToDelete] = useState<StaffFinancialRecord | null>(null);
  const [editFinancialForm, setEditFinancialForm] = useState({
    staffId: "",
    type: "",
    amount: 0,
    date: "",
    status: "pending",
    notes: "",
    repaymentSchedule: "",
  });
  const [financialActionLoading, setFinancialActionLoading] = useState<string | null>(null);
  const [isSavingFinancialRecord, setIsSavingFinancialRecord] = useState(false);
  const [isDeletingFinancialRecord, setIsDeletingFinancialRecord] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleStaff, setScheduleStaff] = useState<Staff | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [staffAppointments, setStaffAppointments] = useState<any[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [viewAppointment, setViewAppointment] = useState<any | null>(null);
  const [isViewAppointmentOpen, setIsViewAppointmentOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<any | null>(null);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [deleteAppointment, setDeleteAppointment] = useState<any | null>(null);
  const [isDeleteAppointmentOpen, setIsDeleteAppointmentOpen] = useState(false);
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);

  const fetchAllStaffData = async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      const [
        staffResponse,
        financialResponse,
        attendanceResponse,
      ] = await Promise.all([
        fetch("http://localhost:3001/api/staff"),
        fetch("http://localhost:3001/api/staff/financials"),
        fetch("http://localhost:3001/api/staff/attendance"),
      ]);

      if (!staffResponse.ok) throw new Error(`HTTP error! status: ${staffResponse.status} for staff data`);
      const staffData = (await staffResponse.json()).data || [];
      setStaffData(staffData);

      if (!financialResponse.ok) throw new Error(`HTTP error! status: ${financialResponse.status} for financial records`);
      const financialRecordsData = (await financialResponse.json()).data || [];
      setFinancialRecords(financialRecordsData);

      if (!attendanceResponse.ok) throw new Error(`HTTP error! status: ${attendanceResponse.status} for attendance data`);
      const attendanceData = (await attendanceResponse.json()).data || [];
      setAttendanceData(attendanceData);

    } catch (err: any) {
      console.error("Error fetching staff data:", err);
      setError("Failed to fetch staff data. Please ensure the backend server is running on port 3001.");
      toast.error("Failed to fetch staff data. Please ensure the backend server is running on port 3001.");
      // Ensure all data arrays are empty on error
      setStaffData([]);
      setFinancialRecords([]);
      setAttendanceData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStaffData();
  }, []); // Empty dependency array means this effect runs once on mount

  const getStaffIdentifier = (staff: Staff) => String(staff.id || staff.email || staff.name);

  const openStaffDetails = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsStaffDetailsDialogOpen(true);
  };

  const openEditStaffDialog = (staff: Staff) => {
    setSelectedStaff(staff);
    setEditStaffForm({
      name: staff.name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone,
      department: staff.department,
      employmentType: staff.employmentType,
      hireDate: staff.hireDate,
      baseSalary: staff.baseSalary,
      specialization: staff.specialization,
      licenseNumber: staff.licenseNumber,
      status: staff.status,
    });
    setIsEditStaffDialogOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!selectedStaff?.id) return;
    setIsSavingStaff(true);
    try {
      const response = await fetch(`http://localhost:3001/api/staff/${selectedStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editStaffForm, baseSalary: Number(editStaffForm.baseSalary) }),
      });
      if (!response.ok) throw new Error("Failed to update staff member");
      toast.success("Staff member updated successfully");
      setIsEditStaffDialogOpen(false);
      fetchAllStaffData();
    } catch (error) {
      console.error("Error updating staff member:", error);
      toast.error("Failed to update staff member");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const openDeleteStaffDialog = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsDeleteStaffDialogOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff?.id) return;
    setIsDeletingStaff(true);
    try {
      const response = await fetch(`http://localhost:3001/api/staff/${selectedStaff.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete staff member");
      toast.success("Staff member removed");
      setIsDeleteStaffDialogOpen(false);
      fetchAllStaffData();
    } catch (error) {
      console.error("Error deleting staff member:", error);
      toast.error("Failed to delete staff member");
    } finally {
      setIsDeletingStaff(false);
    }
  };

  const openAttendanceModal = (record: Attendance) => {
    setAttendanceForm(record);
    setIsAttendanceDialogOpen(true);
  };

  const handleAttendanceSave = () => {
    if (!attendanceForm.staffId) return;
    setAttendanceData((prev) => {
      const index = prev.findIndex((item) => item.staffId === attendanceForm.staffId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = attendanceForm;
        return updated;
      }
      return [...prev, attendanceForm];
    });
    toast.success("Attendance updated");
    setIsAttendanceDialogOpen(false);
  };

  const derivedAttendanceRecords = staffData.map((staff) => {
    const identifier = getStaffIdentifier(staff);
    const existing = attendanceData.find((record) => record.staffId === identifier);
    if (existing) {
      return existing;
    }
    return {
      staffId: identifier,
      staffName: staff.name,
      hoursWorked: 0,
      daysPresent: 0,
      daysAbsent: 0,
      overtimeHours: 0,
    };
  });

  const orphanAttendanceRecords = attendanceData.filter(
    (record) => !derivedAttendanceRecords.some((entry) => entry.staffId === record.staffId)
  );

  const attendanceTableRows = [...derivedAttendanceRecords, ...orphanAttendanceRecords];

  const handleAddStaff = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newStaff),
      });
      if (response.ok) {
        toast.success("Staff member added successfully!");
        setIsAddStaffDialogOpen(false);
        fetchAllStaffData(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to add staff member.");
      }
    } catch (error) {
      console.error("Error adding staff member:", error);
      toast.error("An unexpected error occurred.");
    }
  };

  const handleAddFinancialRecord = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/staff/financials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newFinancialRecord),
      });
      if (response.ok) {
        toast.success("Financial record added successfully!");
        setIsAddFinancialDialogOpen(false);
        fetchAllStaffData(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to add financial record.");
      }
    } catch (error) {
      console.error("Error adding financial record:", error);
      toast.error("An unexpected error occurred.");
    }
  };

  const openEditFinancialRecord = (record: StaffFinancialRecord) => {
    setEditingFinancialRecord(record);
    setEditFinancialForm({
      staffId: record.staffId,
      type: record.type,
      amount: record.amount,
      date: record.date,
      status: record.status,
      notes: record.notes,
      repaymentSchedule: record.repaymentSchedule,
    });
    setIsEditFinancialDialogOpen(true);
  };

  const handleFinancialEditDialogChange = (open: boolean) => {
    setIsEditFinancialDialogOpen(open);
    if (!open) {
      setEditingFinancialRecord(null);
      setEditFinancialForm({
        staffId: "",
        type: "",
        amount: 0,
        date: "",
        status: "pending",
        notes: "",
        repaymentSchedule: "",
      });
    }
  };

  const handleDeleteFinancialDialogChange = (open: boolean) => {
    setIsDeleteFinancialDialogOpen(open);
    if (!open) {
      setFinancialRecordToDelete(null);
    }
  };

  const handleApproveFinancialRecord = async (recordId: string) => {
    try {
      setFinancialActionLoading(recordId);
      const response = await fetch(`http://localhost:3001/api/staff/financials/${recordId}/approve`, {
        method: "PUT",
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to approve financial record");
      }
      toast.success("Financial record approved");
      fetchAllStaffData();
    } catch (error) {
      console.error("Error approving financial record:", error);
      toast.error("Failed to approve financial record");
    } finally {
      setFinancialActionLoading(null);
    }
  };

  const handleUpdateFinancialRecord = async () => {
    if (!editingFinancialRecord) return;
    if (!editFinancialForm.staffId || !editFinancialForm.type || !editFinancialForm.date) {
      toast.error("Please complete all required fields");
      return;
    }
    setIsSavingFinancialRecord(true);
    try {
      const response = await fetch(`http://localhost:3001/api/staff/financials/${editingFinancialRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFinancialForm,
          amount: Number(editFinancialForm.amount),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to update financial record");
      }
      toast.success("Financial record updated");
      handleFinancialEditDialogChange(false);
      fetchAllStaffData();
    } catch (error) {
      console.error("Error updating financial record:", error);
      toast.error("Failed to update financial record");
    } finally {
      setIsSavingFinancialRecord(false);
    }
  };

  const openDeleteFinancialRecord = (record: StaffFinancialRecord) => {
    setFinancialRecordToDelete(record);
    setIsDeleteFinancialDialogOpen(true);
  };

  const openScheduleDialog = async (staff: Staff) => {
    setScheduleStaff(staff);
    setScheduleDate(new Date());
    setIsScheduleDialogOpen(true);
    await fetchStaffAppointments(staff.name, new Date());
  };

  const fetchStaffAppointments = async (doctorName: string, date: Date) => {
    setIsLoadingSchedule(true);
    try {
      // Get the start and end of the month for the selected date
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];

      const response = await fetch(
        `http://localhost:3001/api/appointments?doctor=${encodeURIComponent(doctorName)}&startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) throw new Error("Failed to fetch appointments");

      const data = await response.json();
      setStaffAppointments(data.data || []);
    } catch (error) {
      console.error("Error fetching staff appointments:", error);
      setStaffAppointments([]);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const handleScheduleMonthChange = (newDate: Date) => {
    setScheduleDate(newDate);
    if (scheduleStaff) {
      fetchStaffAppointments(scheduleStaff.name, newDate);
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return staffAppointments.filter(apt => apt.date === dateStr);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleViewAppointment = (apt: any) => {
    setViewAppointment(apt);
    setIsViewAppointmentOpen(true);
  };

  const handleEditAppointment = (apt: any) => {
    setEditAppointment({ ...apt });
    setIsEditAppointmentOpen(true);
  };

  const handleDeleteAppointmentClick = (apt: any) => {
    setDeleteAppointment(apt);
    setIsDeleteAppointmentOpen(true);
  };

  const handleSaveAppointment = async () => {
    if (!editAppointment) return;
    setIsSavingAppointment(true);
    try {
      const response = await fetch(`http://localhost:3001/api/appointments/${editAppointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAppointment),
      });
      if (!response.ok) throw new Error("Failed to update appointment");
      toast.success("Appointment updated successfully");
      setIsEditAppointmentOpen(false);
      if (scheduleStaff) {
        fetchStaffAppointments(scheduleStaff.name, scheduleDate);
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Failed to update appointment");
    } finally {
      setIsSavingAppointment(false);
    }
  };

  const handleConfirmDeleteAppointment = async () => {
    if (!deleteAppointment) return;
    setIsDeletingAppointment(true);
    try {
      const response = await fetch(`http://localhost:3001/api/appointments/${deleteAppointment.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete appointment");
      toast.success("Appointment deleted successfully");
      setIsDeleteAppointmentOpen(false);
      if (scheduleStaff) {
        fetchStaffAppointments(scheduleStaff.name, scheduleDate);
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("Failed to delete appointment");
    } finally {
      setIsDeletingAppointment(false);
    }
  };

  const handleDeleteFinancialRecord = async () => {
    if (!financialRecordToDelete) return;
    setIsDeletingFinancialRecord(true);
    try {
      const response = await fetch(`http://localhost:3001/api/staff/financials/${financialRecordToDelete.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to delete financial record");
      }
      toast.success("Financial record removed");
      handleDeleteFinancialDialogChange(false);
      fetchAllStaffData();
    } catch (error) {
      console.error("Error deleting financial record:", error);
      toast.error("Failed to delete financial record");
    } finally {
      setIsDeletingFinancialRecord(false);
    }
  };

  // NOTE: Calculate total monthly payroll
  const totalMonthlyPayroll = staffData.reduce((sum, staff) => sum + staff.baseSalary, 0);
  const activeStaffCount = staffData.filter(staff => staff.status === "active").length;
    return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Staff Management</h1>
          <p className="text-muted-foreground">Manage employees, salaries, and cash advances</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="brand" >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter full name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role/Position</Label>
                  <Select onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dentist">Dentist</SelectItem>
                      <SelectItem value="hygienist">Dental Hygienist</SelectItem>
                      <SelectItem value="assistant">Dental Assistant</SelectItem>
                      <SelectItem value="manager">Office Manager</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@smilecare.com" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select onValueChange={(value) => setNewStaff({ ...newStaff, department: value })}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dentistry">Dentistry</SelectItem>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="assistance">Assistance</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select onValueChange={(value) => setNewStaff({ ...newStaff, employmentType: value })}>
                    <SelectTrigger id="employmentType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fulltime">Full-time</SelectItem>
                      <SelectItem value="parttime">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input id="hireDate" type="date" value={newStaff.hireDate} onChange={(e) => setNewStaff({ ...newStaff, hireDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseSalary">Base Monthly Salary ($)</Label>
                  <Input id="baseSalary" type="number" placeholder="5000" value={newStaff.baseSalary} onChange={(e) => setNewStaff({ ...newStaff, baseSalary: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" placeholder="e.g., General Dentistry" value={newStaff.specialization} onChange={(e) => setNewStaff({ ...newStaff, specialization: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input id="licenseNumber" placeholder="e.g., DDS-12345" value={newStaff.licenseNumber} onChange={(e) => setNewStaff({ ...newStaff, licenseNumber: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddStaffDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStaff}>
                  Add Staff Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Staff Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStaffCount}</div>
            <p className="text-xs text-muted-foreground">
              Active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyPayroll.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total salary expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Advances</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialRecords.filter(r => r.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Salary</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${activeStaffCount > 0 ? Math.round(totalMonthlyPayroll / activeStaffCount).toLocaleString() : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per employee
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="staff" className="space-y-6" onValueChange={() => fetchAllStaffData()}>
        <TabsList>
          <TabsTrigger value="staff" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Staff Directory</TabsTrigger>
          <TabsTrigger value="financial" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Financial Records</TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Attendance & Hours</TabsTrigger>
        </TabsList>

        {/* Staff Directory Tab */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Employee Directory</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      className="pl-9 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="dentistry">Dentistry</SelectItem>
                      <SelectItem value="hygiene">Hygiene</SelectItem>
                      <SelectItem value="assistance">Assistance</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="dentist">Dentist</SelectItem>
                      <SelectItem value="hygienist">Hygienist</SelectItem>
                      <SelectItem value="assistant">Assistant</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Employment Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="fulltime">Full-time</SelectItem>
                      <SelectItem value="parttime">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="onleave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                    Loading staff...
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Hire Date</TableHead>
                      <TableHead>Monthly Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No staff members found. Click 'Add Staff Member' to get started!
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffData.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{staff.name}</div>
                              <div className="text-xs text-muted-foreground">{staff.specialization}</div>
                            </div>
                          </TableCell>
                          <TableCell>{staff.role}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{staff.department}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Mail className="h-3 w-3 mr-1" />
                                {staff.email}
                              </div>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 mr-1" />
                                {staff.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                              {staff.hireDate}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">${staff.baseSalary.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={
                              staff.status === "active" ? "bg-green-100 text-green-800" :
                              staff.status === "inactive" ? "bg-gray-100 text-gray-800" :
                              "bg-yellow-100 text-yellow-800"
                            }>
                              {staff.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => openStaffDetails(staff)} title="View Details">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openScheduleDialog(staff)} title="View Schedule">
                                <CalendarDays className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openEditStaffDialog(staff)} title="Edit">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openDeleteStaffDialog(staff)} title="Delete">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Records Tab - Cash Advances & Salary Adjustments */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Financial Transactions & Adjustments</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {/* NOTE: Date range filter for financial transactions */}
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="cash_advance">Cash Advance</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="salary_adjustment">Salary Adjustment</SelectItem>
                      <SelectItem value="deduction">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Dialog open={isAddFinancialDialogOpen} onOpenChange={setIsAddFinancialDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Add Transaction
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Financial Transaction</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="staff">Staff Member</Label>
                          <Select onValueChange={(value) => setNewFinancialRecord({ ...newFinancialRecord, staffId: value })}>
                            <SelectTrigger id="staff">
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffData.map((staff) => (
                                <SelectItem key={staff.id} value={staff.id.toString()}>
                                  {staff.name} - {staff.role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transactionType">Transaction Type</Label>
                          <Select onValueChange={(value) => setNewFinancialRecord({ ...newFinancialRecord, type: value })}>
                            <SelectTrigger id="transactionType">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash_advance">Cash Advance</SelectItem>
                              <SelectItem value="bonus">Bonus</SelectItem>
                              <SelectItem value="salary_adjustment">Salary Adjustment</SelectItem>
                              <SelectItem value="deduction">Deduction</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount ($)</Label>
                          <Input id="amount" type="number" placeholder="500" value={newFinancialRecord.amount} onChange={(e) => setNewFinancialRecord({ ...newFinancialRecord, amount: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date">Date</Label>
                          <Input id="date" type="date" value={newFinancialRecord.date} onChange={(e) => setNewFinancialRecord({ ...newFinancialRecord, date: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="repayment">Repayment Schedule (if applicable)</Label>
                          <Input id="repayment" placeholder="e.g., 2 months" value={newFinancialRecord.repaymentSchedule} onChange={(e) => setNewFinancialRecord({ ...newFinancialRecord, repaymentSchedule: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea id="notes" placeholder="Enter details..." value={newFinancialRecord.notes} onChange={(e) => setNewFinancialRecord({ ...newFinancialRecord, notes: e.target.value })} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddFinancialDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddFinancialRecord}>
                          Add Transaction
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                    Loading financial records...
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Repayment Schedule</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No financial records found. Click 'Add Transaction' to add one!
                        </TableCell>
                      </TableRow>
                    ) : (
                      financialRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.staffName}</TableCell>
                          <TableCell>
                            <Badge variant={
                              record.type === "cash_advance" ? "default" :
                              record.type === "bonus" ? "secondary" :
                              "outline"
                            }>
                              {record.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">${record.amount.toLocaleString()}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.repaymentSchedule}</TableCell>
                          <TableCell className="max-w-xs truncate">{record.notes}</TableCell>
                          <TableCell>
                            <Badge className={
                              record.status === "paid" ? "bg-green-100 text-green-800" :
                              record.status === "approved" ? "bg-blue-100 text-blue-800" :
                              "bg-yellow-100 text-yellow-800"
                            }>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {record.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApproveFinancialRecord(record.id)}
                                  disabled={financialActionLoading === record.id}
                                >
                                  {financialActionLoading === record.id ? "Approving..." : "Approve"}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditFinancialRecord(record)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteFinancialRecord(record)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance & Hours Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Attendance & Time Tracking</CardTitle>
                <div className="flex space-x-2">
                  <Select>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="january">January 2024</SelectItem>
                      <SelectItem value="february">February 2024</SelectItem>
                      <SelectItem value="march">March 2024</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                    Loading attendance data...
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Days Present</TableHead>
                      <TableHead>Days Absent</TableHead>
                      <TableHead>Overtime Hours</TableHead>
                      <TableHead>Attendance Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceTableRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No attendance data available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceTableRows.map((attendance) => {
                        const totalDays = attendance.daysPresent + attendance.daysAbsent;
                        const attendanceRateValue = totalDays > 0 ? (attendance.daysPresent / totalDays) * 100 : 0;
                        const attendanceRate = attendanceRateValue.toFixed(1);
                        
                        return (
                          <TableRow key={attendance.staffId}>
                            <TableCell className="font-medium">{attendance.staffName}</TableCell>
                            <TableCell>{attendance.hoursWorked} hrs</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{attendance.daysPresent} days</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={attendance.daysAbsent > 0 ? "destructive" : "secondary"}>
                                {attendance.daysAbsent} days
                              </Badge>
                            </TableCell>
                            <TableCell>{attendance.overtimeHours} hrs</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full" 
                                    style={{ width: `${attendanceRateValue}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{attendanceRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => openAttendanceModal(attendance)}>Manage</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isStaffDetailsDialogOpen} onOpenChange={setIsStaffDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          {selectedStaff ? (
            <div className="space-y-4 py-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{selectedStaff.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium">{selectedStaff.role}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedStaff.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{selectedStaff.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedStaff.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Hire Date</p>
                  <p className="font-medium">{selectedStaff.hireDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedStaff.status}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Employment Type</p>
                  <p className="font-medium">{selectedStaff.employmentType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Base Salary</p>
                  <p className="font-medium">${selectedStaff.baseSalary.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Specialization</p>
                <p className="font-medium">{selectedStaff.specialization}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">License Number</p>
                <p className="font-medium">{selectedStaff.licenseNumber}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No staff selected.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStaffDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditStaffDialogOpen} onOpenChange={setIsEditStaffDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input id="edit-name" value={editStaffForm.name} onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Input id="edit-role" value={editStaffForm.role} onChange={(e) => setEditStaffForm({ ...editStaffForm, role: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editStaffForm.email} onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editStaffForm.phone} onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select value={editStaffForm.department} onValueChange={(value) => setEditStaffForm({ ...editStaffForm, department: value })}>
                <SelectTrigger id="edit-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dentistry">Dentistry</SelectItem>
                  <SelectItem value="Hygiene">Hygiene</SelectItem>
                  <SelectItem value="Assistance">Assistance</SelectItem>
                  <SelectItem value="Administration">Administration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-employment">Employment Type</Label>
              <Select value={editStaffForm.employmentType} onValueChange={(value) => setEditStaffForm({ ...editStaffForm, employmentType: value })}>
                <SelectTrigger id="edit-employment">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hire-date">Hire Date</Label>
              <Input id="edit-hire-date" type="date" value={editStaffForm.hireDate} onChange={(e) => setEditStaffForm({ ...editStaffForm, hireDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStaffForm.status} onValueChange={(value) => setEditStaffForm({ ...editStaffForm, status: value })}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="onleave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-salary">Base Salary</Label>
              <Input id="edit-salary" type="number" value={editStaffForm.baseSalary} onChange={(e) => setEditStaffForm({ ...editStaffForm, baseSalary: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-specialization">Specialization</Label>
              <Input id="edit-specialization" value={editStaffForm.specialization} onChange={(e) => setEditStaffForm({ ...editStaffForm, specialization: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-license">License Number</Label>
              <Input id="edit-license" value={editStaffForm.licenseNumber} onChange={(e) => setEditStaffForm({ ...editStaffForm, licenseNumber: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStaffDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStaff} disabled={isSavingStaff}>
              {isSavingStaff ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteStaffDialogOpen} onOpenChange={setIsDeleteStaffDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Staff Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selectedStaff ? `Are you sure you want to remove ${selectedStaff.name}?` : "Are you sure you want to remove this staff member?"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteStaffDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteStaff} disabled={isDeletingStaff}>
              {isDeletingStaff ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditFinancialDialogOpen} onOpenChange={handleFinancialEditDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Financial Record</DialogTitle>
          </DialogHeader>
          {editingFinancialRecord ? (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-financial-staff">Staff Member</Label>
                <Select
                  value={editFinancialForm.staffId}
                  onValueChange={(value) => setEditFinancialForm({ ...editFinancialForm, staffId: value })}
                >
                  <SelectTrigger id="edit-financial-staff">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffData.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.name} - {staff.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-financial-type">Transaction Type</Label>
                <Select
                  value={editFinancialForm.type}
                  onValueChange={(value) => setEditFinancialForm({ ...editFinancialForm, type: value })}
                >
                  <SelectTrigger id="edit-financial-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_advance">Cash Advance</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="salary_adjustment">Salary Adjustment</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-financial-status">Status</Label>
                <Select
                  value={editFinancialForm.status}
                  onValueChange={(value) => setEditFinancialForm({ ...editFinancialForm, status: value })}
                >
                  <SelectTrigger id="edit-financial-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-financial-amount">Amount</Label>
                <Input
                  id="edit-financial-amount"
                  type="number"
                  value={editFinancialForm.amount}
                  onChange={(e) => setEditFinancialForm({ ...editFinancialForm, amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-financial-date">Date</Label>
                <Input
                  id="edit-financial-date"
                  type="date"
                  value={editFinancialForm.date}
                  onChange={(e) => setEditFinancialForm({ ...editFinancialForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-financial-repayment">Repayment Schedule</Label>
                <Input
                  id="edit-financial-repayment"
                  placeholder="e.g., 2 months"
                  value={editFinancialForm.repaymentSchedule}
                  onChange={(e) => setEditFinancialForm({ ...editFinancialForm, repaymentSchedule: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-financial-notes">Notes</Label>
                <Textarea
                  id="edit-financial-notes"
                  value={editFinancialForm.notes}
                  onChange={(e) => setEditFinancialForm({ ...editFinancialForm, notes: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No financial record selected.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleFinancialEditDialogChange(false)}>Cancel</Button>
            <Button onClick={handleUpdateFinancialRecord} disabled={isSavingFinancialRecord || !editingFinancialRecord}>
              {isSavingFinancialRecord ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteFinancialDialogOpen} onOpenChange={handleDeleteFinancialDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Financial Record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {financialRecordToDelete ? `Remove ${financialRecordToDelete.staffName}'s ${financialRecordToDelete.type.replace(/_/g, " ")} record?` : "Remove this financial record?"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDeleteFinancialDialogChange(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFinancialRecord} disabled={isDeletingFinancialRecord}>
              {isDeletingFinancialRecord ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-xs text-muted-foreground">Staff Member</p>
              <p className="font-medium">{attendanceForm.staffName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendance-hours">Hours Worked</Label>
                <Input
                  id="attendance-hours"
                  type="number"
                  value={attendanceForm.hoursWorked}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, hoursWorked: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-overtime">Overtime Hours</Label>
                <Input
                  id="attendance-overtime"
                  type="number"
                  value={attendanceForm.overtimeHours}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, overtimeHours: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-present">Days Present</Label>
                <Input
                  id="attendance-present"
                  type="number"
                  value={attendanceForm.daysPresent}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, daysPresent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-absent">Days Absent</Label>
                <Input
                  id="attendance-absent"
                  type="number"
                  value={attendanceForm.daysAbsent}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, daysAbsent: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAttendanceSave}>Save Attendance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-violet-600" />
              {scheduleStaff?.name}'s Schedule
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(scheduleDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  handleScheduleMonthChange(newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <h3 className="text-lg font-semibold">
                {scheduleDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(scheduleDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  handleScheduleMonthChange(newDate);
                }}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {isLoadingSchedule ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
                  Loading schedule...
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}

                  {/* Calendar Days */}
                  {(() => {
                    const year = scheduleDate.getFullYear();
                    const month = scheduleDate.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    const daysInMonth = lastDay.getDate();
                    const startingDay = firstDay.getDay();

                    const days = [];

                    // Empty cells for days before the first day of the month
                    for (let i = 0; i < startingDay; i++) {
                      days.push(
                        <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50 rounded-md"></div>
                      );
                    }

                    // Days of the month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const currentDate = new Date(year, month, day);
                      const appointments = getAppointmentsForDate(currentDate);
                      const isToday = new Date().toDateString() === currentDate.toDateString();

                      days.push(
                        <div
                          key={day}
                          className={`min-h-[80px] border rounded-md p-1 ${
                            isToday ? 'border-violet-500 bg-violet-50' : 'border-gray-200'
                          }`}
                        >
                          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-violet-600' : ''}`}>
                            {day}
                          </div>
                          <div className="space-y-1">
                            {appointments.slice(0, 3).map((apt, idx) => (
                              <div
                                key={idx}
                                className="text-xs bg-violet-100 text-violet-800 rounded px-1 py-0.5 truncate"
                                title={`${formatTime(apt.time)} - ${apt.patientName}`}
                              >
                                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                                {formatTime(apt.time)}
                              </div>
                            ))}
                            {appointments.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{appointments.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return days;
                  })()}
                </div>

                {/* Appointment List for Selected Month */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Appointments this month ({staffAppointments.length})
                  </h4>
                  {staffAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No appointments scheduled for this month
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {staffAppointments
                        .sort((a, b) => {
                          const dateCompare = a.date.localeCompare(b.date);
                          if (dateCompare !== 0) return dateCompare;
                          return (a.time || '').localeCompare(b.time || '');
                        })
                        .map((apt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-center min-w-[50px]">
                                <div className="text-lg font-bold text-violet-600">
                                  {new Date(apt.date + 'T00:00:00').getDate()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                              </div>
                              <div>
                                <p className="font-medium">{apt.patientName}</p>
                                <p className="text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {formatTime(apt.time)}
                                  {apt.duration && ` · ${apt.duration} min`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={
                                apt.status === "completed" ? "bg-green-100 text-green-800" :
                                apt.status === "confirmed" ? "bg-blue-100 text-blue-800" :
                                apt.status === "cancelled" ? "bg-red-100 text-red-800" :
                                "bg-yellow-100 text-yellow-800"
                              }>
                                {apt.status}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewAppointment(apt)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditAppointment(apt)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteAppointmentClick(apt)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Appointment Dialog (Read-only) */}
      <Dialog open={isViewAppointmentOpen} onOpenChange={setIsViewAppointmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-violet-600" />
              Appointment Details
            </DialogTitle>
            <DialogDescription>View appointment information (read-only)</DialogDescription>
          </DialogHeader>
          {viewAppointment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Patient Name</p>
                  <p className="font-medium">{viewAppointment.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={
                    viewAppointment.status === "completed" ? "bg-green-100 text-green-800" :
                    viewAppointment.status === "confirmed" ? "bg-blue-100 text-blue-800" :
                    viewAppointment.status === "cancelled" ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                  }>
                    {viewAppointment.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(viewAppointment.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium">{formatTime(viewAppointment.time)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{viewAppointment.duration || 30} minutes</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Doctor</p>
                  <p className="font-medium">{viewAppointment.doctor}</p>
                </div>
              </div>
              {viewAppointment.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="font-medium">{viewAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewAppointmentOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-violet-600" />
              Edit Appointment
            </DialogTitle>
          </DialogHeader>
          {editAppointment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Patient Name</Label>
                <Input value={editAppointment.patientName} disabled className="bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editAppointment.date}
                    onChange={(e) => setEditAppointment({ ...editAppointment, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={editAppointment.time}
                    onChange={(e) => setEditAppointment({ ...editAppointment, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={editAppointment.duration || 30}
                    onChange={(e) => setEditAppointment({ ...editAppointment, duration: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editAppointment.status}
                    onValueChange={(value) => setEditAppointment({ ...editAppointment, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editAppointment.notes || ''}
                  onChange={(e) => setEditAppointment({ ...editAppointment, notes: e.target.value })}
                  placeholder="Add notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAppointmentOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAppointment} disabled={isSavingAppointment}>
              {isSavingAppointment ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Appointment Confirmation Dialog */}
      <Dialog open={isDeleteAppointmentOpen} onOpenChange={setIsDeleteAppointmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            {deleteAppointment && (
              <>Are you sure you want to delete the appointment for <strong>{deleteAppointment.patientName}</strong> on {new Date(deleteAppointment.date + 'T00:00:00').toLocaleDateString()}?</>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAppointmentOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteAppointment} disabled={isDeletingAppointment}>
              {isDeletingAppointment ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
