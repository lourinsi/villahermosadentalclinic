"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { useAppointments, Appointment, AppointmentFilters } from "./useAppointments";

interface AppointmentModalContextType {
  isCreateModalOpen: boolean;
  isScheduleModalOpen: boolean;
  isPatientBookingModalOpen: boolean;
  isAddPatientModalOpen: boolean;
  isEditModalOpen: boolean;
  isPatientFieldReadOnly: boolean;
  selectedAppointment: Appointment | null;
  newAppointmentDate?: Date;
  newAppointmentTime?: string;
  newAppointmentPatientName?: string;
  newAppointmentPatientId?: string;
  newAppointmentDoctorName?: string;
  newAppointmentServiceType?: string;
  openCreateModal: (date?: Date, time?: string) => void;
  closeCreateModal: () => void;
  openScheduleModal: (patientName?: string, patientId?: string) => void;
  closeScheduleModal: () => void;
  openPatientBookingModal: (date?: Date, time?: string, doctorName?: string, serviceType?: string) => void;
  closePatientBookingModal: () => void;
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
  addAppointment: (appointment: Omit<Appointment, "id" | "createdAt">) => Promise<Appointment>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
}

const AppointmentModalContext = createContext<AppointmentModalContextType | undefined>(undefined);

export const AppointmentModalProvider = ({ children }: { children: ReactNode }) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [isPatientBookingModalOpen, setPatientBookingModalOpen] = useState(false);
  const [isAddPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isPatientFieldReadOnly, setPatientFieldReadOnly] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [newAppointmentDate, setNewAppointmentDate] = useState<Date>();
  const [newAppointmentTime, setNewAppointmentTime] = useState<string>();
  const [newAppointmentPatientName, setNewAppointmentPatientName] = useState<string>();
  const [newAppointmentPatientId, setNewAppointmentPatientId] = useState<string>();
  const [newAppointmentDoctorName, setNewAppointmentDoctorName] = useState<string>();
  const [newAppointmentServiceType, setNewAppointmentServiceType] = useState<string>();

  const [filters, setFilters] = useState<AppointmentFilters | undefined>(undefined);

  const { appointments, isLoading, addAppointment, updateAppointment, deleteAppointment } = useAppointments(refreshTrigger, filters);

  const refreshAppointments = useCallback((newFilters?: AppointmentFilters) => {
    setFilters(newFilters);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const refreshPatients = useCallback(() => setRefreshTrigger(prev => prev + 1), []);
  const refreshFinanceData = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  const openCreateModal = useCallback((date?: Date, time?: string) => {
    setNewAppointmentDate(date);
    setNewAppointmentTime(time);
    setCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);

  const openScheduleModal = useCallback((patientName?: string, patientId?: string) => {
    setNewAppointmentPatientName(patientName);
    setNewAppointmentPatientId(patientId);
    setScheduleModalOpen(true);
  }, []);

  const closeScheduleModal = useCallback(() => setScheduleModalOpen(false), []);

  // openPatientBookingModal should open the create appointment modal for patients
  // without performing any redirects. It sets the tentative date/time/doctor
  // then opens the modal.
  // 
  // Status logic for patient bookings:
  // - If NO payment: status = "reserved" (24hr timer, auto-cancel if unpaid)
  // - If PARTIAL payment: status = "reserved" (no time limit, awaits doctor approval)
  // - If FULL payment: status = "scheduled" (confirmed)
  // - Pay at clinic: status = "pending" (awaits doctor/admin acceptance)
  const openPatientBookingModal = (date?: Date | null, time?: string, doctor?: string) => {
    try {
      if (date !== undefined) setNewAppointmentDate(date ?? undefined);
      if (time !== undefined) setNewAppointmentTime(time ?? "");
      if (doctor !== undefined) setNewAppointmentDoctorName(doctor ?? "");

      // DO NOT redirect patients — just open the modal
      setCreateModalOpen(true);
    } catch (err) {
      // fallback: ensure modal still opens
      setCreateModalOpen(true);
    }
  };

  const closePatientBookingModal = useCallback(() => setPatientBookingModalOpen(false), []);

  const openAddPatientModal = useCallback(() => setAddPatientModalOpen(true), []);
  const closeAddPatientModal = useCallback(() => setAddPatientModalOpen(false), []);
  
  const openEditModal = useCallback((appointment: Appointment, isPatientReadOnly: boolean = false) => {
    setSelectedAppointment(appointment);
    setPatientFieldReadOnly(isPatientReadOnly);
    setEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setSelectedAppointment(null);
    setPatientFieldReadOnly(false);
  }, []);

  const value = useMemo(() => ({
    isCreateModalOpen,
    isScheduleModalOpen,
    isPatientBookingModalOpen,
    isAddPatientModalOpen,
    isEditModalOpen,
    isPatientFieldReadOnly,
    selectedAppointment,
    newAppointmentDate,
    newAppointmentTime,
    newAppointmentPatientName,
    newAppointmentPatientId,
    newAppointmentDoctorName,
    newAppointmentServiceType,
    openCreateModal,
    closeCreateModal,
    openScheduleModal,
    closeScheduleModal,
    openPatientBookingModal,
    closePatientBookingModal,
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
  }), [
    isCreateModalOpen,
    isScheduleModalOpen,
    isPatientBookingModalOpen,
    isAddPatientModalOpen,
    isEditModalOpen,
    isPatientFieldReadOnly,
    selectedAppointment,
    newAppointmentDate,
    newAppointmentTime,
    newAppointmentPatientName,
    newAppointmentPatientId,
    newAppointmentDoctorName,
    newAppointmentServiceType,
    openCreateModal,
    closeCreateModal,
    openScheduleModal,
    closeScheduleModal,
    openPatientBookingModal,
    closePatientBookingModal,
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
  ]);

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
