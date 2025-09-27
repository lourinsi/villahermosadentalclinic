"use client";

import { useState, createContext, useContext } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, useSidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import { ScheduleAppointmentModal } from "./ScheduleAppointmentModal";
import { AddPatientModal } from "./AddPatientModal";
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
  ChevronRight
} from "lucide-react";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

interface AdminLayoutProps {
  currentView: string;
  onViewChange: (view: string) => void;
  children: React.ReactNode;
}

interface AppointmentModalContext {
  openScheduleModal: (patientName?: string, patientId?: number) => void;
  openAddPatientModal: () => void;
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
  const [addPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ name?: string; id?: number }>({});

  const openScheduleModal = (patientName?: string, patientId?: number) => {
    setSelectedPatient({ name: patientName, id: patientId });
    setScheduleModalOpen(true);
  };

  const openAddPatientModal = () => {
    setAddPatientModalOpen(true);
  };

  return (
    <SidebarProvider>
      <AppointmentModalContext.Provider value={{ openScheduleModal, openAddPatientModal }}>
        <div className="flex h-screen w-full">
          <Sidebar className="border-r">
            <SidebarContentWrapper currentView={currentView} onViewChange={onViewChange} />
          </Sidebar>
          
          <div className="flex-1 flex flex-col">
            <header className="border-b bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patients, appointments..."
                      className="pl-9 w-80"
                    />
                  </div>
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
              {children}
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
        <AddPatientModal
          open={addPatientModalOpen}
          onOpenChange={setAddPatientModalOpen}
        />
      </AppointmentModalContext.Provider>
    </SidebarProvider>
  );
}