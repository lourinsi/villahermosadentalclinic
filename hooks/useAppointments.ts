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

const API_URL = "http://localhost:3001/api/appointments";

export const useAppointments = (refreshTrigger?: number) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load appointments from backend on mount and when refreshTrigger changes
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(API_URL);
        const result = await response.json();
        if (result.success && result.data) {
          setAppointments(result.data);
        }
      } catch (error) {
        console.error("Error loading appointments from backend:", error);
        // Fallback to empty list if backend is unavailable
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, [refreshTrigger]);

  const addAppointment = async (appointment: Omit<Appointment, "id" | "createdAt">) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointment),
      });
      const result = await response.json();
      if (result.success && result.data) {
        const newAppointment = result.data;
        setAppointments([...appointments, newAppointment]);
        return newAppointment;
      }
      throw new Error(result.message || "Failed to add appointment");
    } catch (error) {
      console.error("Error adding appointment:", error);
      throw error;
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success && result.data) {
        const updated = appointments.map((apt) =>
          apt.id === id ? { ...apt, ...result.data } : apt
        );
        setAppointments(updated);
        return result.data;
      }
      throw new Error(result.message || "Failed to update appointment");
    } catch (error) {
      console.error("Error updating appointment:", error);
      throw error;
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        const updated = appointments.filter((apt) => apt.id !== id);
        setAppointments(updated);
      } else {
        throw new Error(result.message || "Failed to delete appointment");
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      throw error;
    }
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
