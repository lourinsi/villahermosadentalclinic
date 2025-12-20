import { useState, useEffect } from "react";

export interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  date: string;
  time: string;
  type: string;
  doctor: string;
  notes: string;
  status: "scheduled" | "confirmed" | "pending" | "tentative" | "completed" | "cancelled";
  createdAt?: string;
}

const STORAGE_KEY = "dental_clinic_appointments";

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load appointments from localStorage on mount
  useEffect(() => {
    const loadAppointments = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setAppointments(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error loading appointments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, []);

  // Save appointments to localStorage whenever they change
  const saveAppointments = (newAppointments: Appointment[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAppointments));
    } catch (error) {
      console.error("Error saving appointments:", error);
    }
  };

  const addAppointment = (appointment: Omit<Appointment, "id" | "createdAt">) => {
    const newAppointment: Appointment = {
      ...appointment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...appointments, newAppointment];
    setAppointments(updated);
    saveAppointments(updated);
    return newAppointment;
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    const updated = appointments.map((apt) =>
      apt.id === id ? { ...apt, ...updates } : apt
    );
    setAppointments(updated);
    saveAppointments(updated);
  };

  const deleteAppointment = (id: string) => {
    const updated = appointments.filter((apt) => apt.id !== id);
    setAppointments(updated);
    saveAppointments(updated);
  };

  const getAppointmentsByDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return appointments.filter((apt) => apt.date === dateStr);
  };

  const getUpcomingAppointments = (doctor?: string) => {
    const today = new Date().toISOString().split("T")[0];
    return appointments
      .filter((apt) => {
        const matchesDate = apt.date >= today;
        const matchesDoctor = !doctor || apt.doctor === doctor;
        return matchesDate && matchesDoctor;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.time.localeCompare(b.time);
      });
  };

  return {
    appointments,
    isLoading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByDate,
    getUpcomingAppointments,
  };
};
