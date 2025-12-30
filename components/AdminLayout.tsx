"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, useSidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import { ScheduleAppointmentModal } from "./ScheduleAppointmentModal";
import { CreateAppointmentModal } from "./CreateAppointmentModal";
import { AddPatientModal } from "./AddPatientModal";
import { AddTransactionModal } from "./AddTransactionModal"; // Import AddTransactionModal // Import AddStaffModal
import { useAppointments, type Appointment, type AppointmentFilters } from "../hooks/useAppointments";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings, 
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Briefcase
} from "lucide-react";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { StaffView } from "./Staff";

interface AdminLayoutProps {
  currentView: string;
  onViewChange: (view: string) => void;
  children: React.ReactNode;
}

interface AppointmentModalContext {
  openScheduleModal: (patientName?: string, patientId?: string | number) => void;
  openCreateModal: (selectedDate?: Date, selectedTime?: string) => void;
  openAddPatientModal: () => void;
  openAddStaffModal: () => void;
  openAddTransactionModal: () => void; // New: function to open AddTransactionModal // New: function to open AddStaffModal
  refreshPatients: () => void;
  refreshAppointments: (filters?: AppointmentFilters) => void;
  refreshTrigger: number;
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, "id" | "createdAt">) => Promise<Appointment>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  getUpcomingAppointments: (doctor?: string) => Appointment[];
  refreshFinanceData: () => void; // New: function to trigger finance data refresh
}

const AppointmentModalContext = createContext<AppointmentModalContext | null>(null);

export const useAppointmentModal = () => {
  const context = useContext(AppointmentModalContext);
  if (!context) {
    throw new Error("useAppointmentModal must be used within AdminLayout");
  }
  return context;
};

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "staff", label: "Staff", icon: Briefcase },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "settings", label: "Settings", icon: Settings },
];

function SidebarContentWrapper({ currentView, onViewChange }: { currentView: string; onViewChange: (view: string) => void }) {
  const { collapsed, toggleSidebar } = useSidebar()
  
  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            {!collapsed && <span className="font-semibold">Villahermosa</span>}
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => onViewChange(item.id)}
                isActive={currentView === item.id}
                className="w-full justify-start"
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        <div className="absolute bottom-4 left-4 right-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>Logout</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </>
  )
}

export function AdminLayout({ currentView, onViewChange, children }: AdminLayoutProps) {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [addTransactionModalOpen, setAddTransactionModalOpen] = useState(false); // New state for AddTransactionModal // New state for AddStaffModal
  
  const [selectedPatient, setSelectedPatient] = useState<{ name?: string; id?: string | number }>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [appointmentRefreshTrigger, setAppointmentRefreshTrigger] = useState(0);
  const [appointmentFilters, setAppointmentFilters] = useState<AppointmentFilters>({});
  
  const { 
    appointments, 
    addAppointment, 
    updateAppointment, 
    deleteAppointment, 
    getUpcomingAppointments 
  } = useAppointments(appointmentRefreshTrigger, appointmentFilters);

  // Clear filters when switching away from calendar to ensure other views see all appointments
  useEffect(() => {
    if (currentView !== 'calendar' && (appointmentFilters.startDate || appointmentFilters.endDate || appointmentFilters.search)) {
      setAppointmentFilters({});
    }
  }, [currentView, appointmentFilters]);

  const openScheduleModal = (patientName?: string, patientId?: string | number) => {
    setSelectedPatient({ name: patientName, id: patientId });
    setScheduleModalOpen(true);
  };

  const openCreateModal = (date?: Date, time?: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setCreateModalOpen(true);
  };

  const openAddPatientModal = () => {
    setAddPatientModalOpen(true);
  };

  const openAddStaffModal = () => { 
    setAddStaffModalOpen(true);
  };

  const openAddTransactionModal = () => { // New function to open AddTransactionModal
    setAddTransactionModalOpen(true);
  };

  const refreshPatients = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const refreshAppointments = (filters?: AppointmentFilters) => {
    if (filters) {
      setAppointmentFilters(filters);
    }
    setAppointmentRefreshTrigger(prev => prev + 1);
  };

  const refreshFinanceData = () => { // New function for finance data refresh
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <SidebarProvider>
      <AppointmentModalContext.Provider value={{ openScheduleModal, openCreateModal, openAddPatientModal, openAddStaffModal, openAddTransactionModal, refreshPatients, refreshAppointments, refreshTrigger, appointments, addAppointment, updateAppointment, deleteAppointment, getUpcomingAppointments, refreshFinanceData }}>
        <div className="flex h-screen w-full">
          <Sidebar className="border-r">
            <SidebarContentWrapper currentView={currentView} onViewChange={onViewChange} />
          </Sidebar>
          
          <div className="flex-1 flex flex-col">
            <header className="border-b bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patients, appointments..."
                      className="pl-9 w-80"
                    />
                  </div> */}
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="icon">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>DR</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">Dr. Sarah Johnson</div>
                    <div className="text-muted-foreground">Administrator</div>
                  </div>
                </div>
              </div>
            </header>
            
            <main className="flex-1 overflow-auto bg-gray-50">
              {currentView === "staff" ? <StaffView /> : children}
            </main>
          </div>
        </div>

        {/* Global Modals */}
        <ScheduleAppointmentModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          patientName={selectedPatient.name}
          patientId={selectedPatient.id}
        />
        <CreateAppointmentModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />
        <AddPatientModal
          open={addPatientModalOpen}
          onOpenChange={setAddPatientModalOpen}
        />
        <AddTransactionModal // New AddTransactionModal
          open={addTransactionModalOpen}
          onOpenChange={setAddTransactionModalOpen}
        />
        </AppointmentModalContext.Provider>
    </SidebarProvider>
  );
}