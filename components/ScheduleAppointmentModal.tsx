"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDoctors } from "../hooks/useDoctors";
import { TIME_SLOTS, formatTimeTo12h } from "../lib/time-slots";
import { formatDateToYYYYMMDD } from "../lib/utils";
import { APPOINTMENT_TYPES } from "../lib/appointment-types";
import { Appointment } from "@/hooks/useAppointments";

export function ScheduleAppointmentModal() {
  const {
    isScheduleModalOpen,
    closeScheduleModal,
    newAppointmentPatientName,
    newAppointmentPatientId,
    addAppointment,
    refreshAppointments,
    refreshTrigger,
    appointments
  } = useAppointmentModal();
  const { user } = useAuth();

  const [dateAppointments, setDateAppointments] = useState<Appointment[]>([]);
  const [isLoadingDateAppointments, setIsLoadingDateAppointments] = useState(false);

  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const { doctors, isLoadingDoctors, reloadDoctors } = useDoctors();

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    duration: "30",
    type: -1,
    customType: "",
    doctor: user?.role === "doctor" ? user.username : "",
    notes: "",
    patientName: newAppointmentPatientName || "",
    patientId: String(newAppointmentPatientId || "")
  });

  // Update formData when patientName or patientId props change
  useEffect(() => {
    if (newAppointmentPatientName || newAppointmentPatientId) {
      setFormData(prev => ({
        ...prev,
        patientName: newAppointmentPatientName || prev.patientName,
        patientId: String(newAppointmentPatientId || ""),
        type: -1 // Reset type when patient changes
      }));
    }
  }, [newAppointmentPatientName, newAppointmentPatientId, isScheduleModalOpen]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/patients");
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          const list = json.data.map((p: { id: string | number; firstName: string; lastName: string }) => ({ id: String(p.id), name: `${p.firstName} ${p.lastName}` }));
          setPatients(list);
        }
      } catch (err) {
        console.error("Failed to load patients:", err);
      }
    };

    fetchPatients();
  }, [refreshTrigger]);

  useEffect(() => {
    if (isScheduleModalOpen) {
      reloadDoctors();
      
      // Update doctor if logged in as doctor and not already set
      if (user?.role === "doctor" && !formData.doctor) {
        setFormData(prev => ({ ...prev, doctor: user.username }));
      }
    }
  }, [isScheduleModalOpen, reloadDoctors, user, formData.doctor]);

  // Fetch all appointments for the selected date to check for clinic-wide conflicts
  // This bypasses view filters to ensure global conflict detection
  useEffect(() => {
    const fetchDateAppointments = async () => {
      if (!formData.date || !isScheduleModalOpen) {
        setDateAppointments([]);
        return;
      }
      setIsLoadingDateAppointments(true);
      try {
        const response = await fetch(`http://localhost:3001/api/appointments?startDate=${formData.date}&endDate=${formData.date}`);
        const result = await response.json();
        if (result.success) {
          setDateAppointments(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching appointments for date:", error);
      } finally {
        setIsLoadingDateAppointments(false);
      }
    };

    fetchDateAppointments();
  }, [formData.date, isScheduleModalOpen]);

  const isSlotBusy = useCallback((time: string, duration: number) => {
    if (!formData.date || !dateAppointments) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const newStart = hours * 60 + minutes;
    const newEnd = newStart + duration;

    return dateAppointments.some(apt => {
      if (apt.status === 'cancelled') return false;
      
      const [aptHours, aptMinutes] = apt.time.split(':').map(Number);
      const aptStart = aptHours * 60 + aptMinutes;
      const aptDuration = apt.duration || 30;
      const aptEnd = aptStart + aptDuration;

      return (newStart < aptEnd) && (newEnd > aptStart);
    });
  }, [formData.date, dateAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("=== SCHEDULE APPOINTMENT SUBMIT ===");
    console.log("Current formData:", formData);
    console.log("PatientName prop:", newAppointmentPatientName);
    console.log("PatientId prop:", newAppointmentPatientId);

    if (!formData.patientName || !formData.date || !formData.time || formData.type === -1 || !formData.doctor) {
      console.error("Validation failed - missing required fields:", {
        patientName: formData.patientName,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        doctor: formData.doctor
      });
      toast.error("Please complete all required fields");
      return;
    }

    // Check if date has error
    if (dateError) {
      toast.error(dateError);
      return;
    }

    // Relaxed validation: Check if appointment date is in the past
    const selectedDate = new Date(`${formData.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      console.error("Validation failed - appointment is in a past date");
      toast.error(`Cannot schedule appointment for a past date.`);
      return;
    }

    setIsLoading(true);
    console.log("Starting appointment creation...");

    try {
      const appointmentData = {
        patientName: String(formData.patientName),
        patientId: String(formData.patientId),
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration),
        type: formData.type,
        customType: formData.customType,
        doctor: formData.doctor,
        notes: formData.notes,
        status: "scheduled" as const
      };
      console.log("Appointment data being sent:", appointmentData);
      
      const result = await addAppointment(appointmentData);
      console.log("Appointment created successfully:", result);
      
      toast.success("Appointment scheduled successfully!");
      console.log("Calling refreshAppointments...");
      refreshAppointments();
      
      console.log("Closing modal and resetting form...");
      closeScheduleModal();
      setFormData({
        date: "",
        time: "",
        duration: "30",
        type: -1,
        customType: "",
        doctor: "",
        notes: "",
        patientName: newAppointmentPatientName || "",
        patientId: String(newAppointmentPatientId || "")
      });
    } catch (err) {
      console.error("Error scheduling appointment:", err);
      console.error("Error details:", {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      const errorMessage = err instanceof Error ? err.message : "Failed to schedule appointment";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isScheduleModalOpen} onOpenChange={closeScheduleModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {newAppointmentPatientName ? `Schedule Appointment - ${newAppointmentPatientName}` : "Schedule New Appointment"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection (only show if no patient is pre-selected) */}
          {!newAppointmentPatientName && (
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select
                value={String(formData.patientId) || ""}
                onValueChange={(value) => {
                  const found = patients.find(p => p.id === value);
                  if (found) {
                    setFormData(prev => ({ ...prev, patientId: found.id, patientName: found.name }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.length > 0 ? (
                    patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">No patients available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  const selectedDate = new Date(`${e.target.value}T00:00:00`);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  if (selectedDate < today) {
                    setDateError("Cannot select a past date");
                  } else {
                    setDateError("");
                  }
                  
                  setFormData(prev => ({ ...prev, date: e.target.value }));
                }}
                min={formatDateToYYYYMMDD(new Date())}
                required
              />
              {dateError && <p className="text-red-500 text-sm">{dateError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select
                value={formData.time ? TIME_SLOTS.indexOf(formData.time).toString() : ""}
                onValueChange={(value) => {
                  const index = parseInt(value);
                  if (index >= 0) {
                    setFormData(prev => ({ ...prev, time: TIME_SLOTS[index] }));
                  }
                }}
              >
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot, index) => {
                    const busy = isSlotBusy(slot, parseInt(formData.duration));
                    return (
                      <SelectItem key={slot} value={index.toString()} disabled={busy}>
                        {formatTimeTo12h(slot)} {busy && "(Occupied)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={formData.duration}
              onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map((mins) => {
                  const busy = formData.time ? isSlotBusy(formData.time, mins) : false;
                  return (
                    <SelectItem key={mins} value={String(mins)} disabled={busy}>
                      {mins >= 60 ? `${mins / 60} hour${mins / 60 > 1 ? 's' : ''}` : `${mins} minutes`} {busy && "(Conflict)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Appointment Type</Label>
            <Select
              value={formData.type === -1 ? "" : formData.type.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: parseInt(value), customType: "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((type, index) => (
                  <SelectItem key={index} value={index.toString()}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.type === APPOINTMENT_TYPES.length - 1 && (
            <div className="space-y-2">
              <Label>Please Specify Type</Label>
              <Input
                placeholder="Enter custom appointment type"
                value={formData.customType}
                onChange={(e) => setFormData(prev => ({ ...prev, customType: e.target.value }))}
                required
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Doctor</Label>
            <Select
              value={formData.doctor}
              onValueChange={(value) => setFormData(prev => ({ ...prev, doctor: value }))}
              disabled={isLoadingDoctors}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingDoctors ? "Loading doctors..." : doctors.length === 0 ? "No doctors available" : "Select doctor"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDoctors ? (
                  <div className="p-2 text-sm text-gray-500">Loading doctors...</div>
                ) : doctors.length > 0 ? (
                  doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.name}>
                      {doctor.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">No doctors available</div>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes for the appointment..."
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="cancel" type="button" onClick={() => closeScheduleModal()} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="brand" type="submit" disabled={isLoading}>
              {isLoading ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}