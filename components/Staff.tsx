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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
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
  Eye
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

      <Tabs defaultValue="staff" className="space-y-6">
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
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
                              <Button variant="outline" size="sm" onClick={() => openStaffDetails(staff)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openEditStaffDialog(staff)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openDeleteStaffDialog(staff)}>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
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
    </div>
  );
}
