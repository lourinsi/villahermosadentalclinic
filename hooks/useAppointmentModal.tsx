"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useAppointments, Appointment, AppointmentFilters } from "./useAppointments";

interface AppointmentModalContextType {
  isCreateModalOpen: boolean;
  isScheduleModalOpen: boolean;
  isAddPatientModalOpen: boolean;
  isEditModalOpen: boolean;
  isPatientFieldReadOnly: boolean;
  selectedAppointment: Appointment | null;
  newAppointmentDate?: Date;
  newAppointmentTime?: string;
  newAppointmentPatientName?: string;
  newAppointmentPatientId?: string;
  openCreateModal: (date?: Date, time?: string) => void;
  closeCreateModal: () => void;
  openScheduleModal: (patientName?: string, patientId?: string) => void;
  closeScheduleModal: () => void;
  openAddPatientModal: () => void;
  closeAddPatientModal: () => void;
  openEditModal: (appointment: Appointment, isPatientReadOnly?: boolean) => void;
  closeEditModal: () => void;
  refreshAppointments: (filters?: AppointmentFilters) => void;
  refreshPatients: () => void;
  refreshFinanceData: () => void;
  refreshTrigger: number;
  appointments: Appointment[];
  isLoading: boolean;
  addAppointment: (appointment: Omit<Appointment, "id" | "createdAt">) => Promise<any>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  deleteAppointment: (id: string) => Promise<void>;
}

const AppointmentModalContext = createContext<AppointmentModalContextType | undefined>(undefined);

export const AppointmentModalProvider = ({ children }: { children: ReactNode }) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [isAddPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isPatientFieldReadOnly, setPatientFieldReadOnly] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [newAppointmentDate, setNewAppointmentDate] = useState<Date>();
  const [newAppointmentTime, setNewAppointmentTime] = useState<string>();
  const [newAppointmentPatientName, setNewAppointmentPatientName] = useState<string>();
  const [newAppointmentPatientId, setNewAppointmentPatientId] = useState<string>();

  const [filters, setFilters] = useState<AppointmentFilters | undefined>(undefined);

  const { appointments, isLoading, addAppointment, updateAppointment, deleteAppointment } = useAppointments(refreshTrigger, filters);

  const refreshAppointments = (newFilters?: AppointmentFilters) => {
    setFilters(newFilters);
    setRefreshTrigger(prev => prev + 1);
  };
  const refreshPatients = () => setRefreshTrigger(prev => prev + 1);
  const refreshFinanceData = () => setRefreshTrigger(prev => prev + 1);

  const openCreateModal = (date?: Date, time?: string) => {
    setNewAppointmentDate(date);
    setNewAppointmentTime(time);
    setCreateModalOpen(true);
  };
  const closeCreateModal = () => setCreateModalOpen(false);

  const openScheduleModal = (patientName?: string, patientId?: string) => {
    setNewAppointmentPatientName(patientName);
    setNewAppointmentPatientId(patientId);
    setScheduleModalOpen(true);
  };
  const closeScheduleModal = () => setScheduleModalOpen(false);

  const openAddPatientModal = () => setAddPatientModalOpen(true);
  const closeAddPatientModal = () => setAddPatientModalOpen(false);
  
  const openEditModal = (appointment: Appointment, isPatientReadOnly: boolean = false) => {
    setSelectedAppointment(appointment);
    setPatientFieldReadOnly(isPatientReadOnly);
    setEditModalOpen(true);
  };
  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedAppointment(null);
    setPatientFieldReadOnly(false);
  };

  const value = {
    isCreateModalOpen,
    isScheduleModalOpen,
    isAddPatientModalOpen,
    isEditModalOpen,
    isPatientFieldReadOnly,
    selectedAppointment,
    newAppointmentDate,
    newAppointmentTime,
    newAppointmentPatientName,
    newAppointmentPatientId,
    openCreateModal,
    closeCreateModal,
    openScheduleModal,
    closeScheduleModal,
    openAddPatientModal,
    closeAddPatientModal,
    openEditModal,
    closeEditModal,
    refreshAppointments,
    refreshPatients,
    refreshFinanceData,
    refreshTrigger,
    appointments,
    isLoading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  };

  return (
    <AppointmentModalContext.Provider value={value}>
      {children}
    </AppointmentModalContext.Provider>
  );
};

export const useAppointmentModal = () => {
  const context = useContext(AppointmentModalContext);
  if (context === undefined) {
    throw new Error("useAppointmentModal must be used within an AppointmentModalProvider");
  }
  return context;
};
