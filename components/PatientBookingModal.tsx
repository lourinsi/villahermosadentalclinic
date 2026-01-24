"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2 } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { toast } from "sonner";
import { useDoctors } from "../hooks/useDoctors";
import { useAuth } from "@/hooks/useAuth.tsx";
import { TIME_SLOTS, formatTimeTo12h } from "../lib/time-slots";
import { formatDateToYYYYMMDD } from "../lib/utils";
import { APPOINTMENT_TYPES } from "../lib/appointment-types";
import { Patient } from "@/lib/patient-types";
import { Appointment } from "@/hooks/useAppointments";

export function PatientBookingModal() {
  const {
    isPatientBookingModalOpen,
    closePatientBookingModal,
    newAppointmentDate,
    newAppointmentTime,
    newAppointmentDoctorName,
    addAppointment,
    refreshAppointments,
    appointments
  } = useAppointmentModal();

  const { openPaymentModal } = usePaymentModal();
  const { user, isAuthenticated } = useAuth();
  const { doctors, isLoadingDoctors, reloadDoctors } = useDoctors();
  
  const [familyMembers, setFamilyMembers] = useState<Patient[]>([]);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [showSuccessPrompt, setShowSuccessPrompt] = useState(false);
  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(null);
  const [dateAppointments, setDateAppointments] = useState<any[]>([]);
  const [isLoadingDateAppointments, setIsLoadingDateAppointments] = useState(false);

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    duration: "30",
    type: -1,
    customType: "",
    doctor: "",
    notes: "",
    patientName: "",
    patientId: ""
  });

  // Fetch family members for the dropdown
  useEffect(() => {
    const fetchFamily = async () => {
      if (isAuthenticated && user?.patientId && isPatientBookingModalOpen) {
        try {
          setIsLoadingFamily(true);
          const response = await fetch(`http://localhost:3001/api/patients?parentId=${user.patientId}`);
          const result = await response.json();
          if (result.success) {
            setFamilyMembers(result.data);
          }
        } catch (error) {
          console.error("Error fetching family members:", error);
        } finally {
          setIsLoadingFamily(false);
        }
      }
    };

    fetchFamily();
  }, [isAuthenticated, user, isPatientBookingModalOpen]);

  // Fetch all appointments for the selected date (anonymized) to check for clinic-wide conflicts
  useEffect(() => {
    const fetchDateAppointments = async () => {
      if (!formData.date || !isPatientBookingModalOpen) {
        setDateAppointments([]);
        return;
      }
      setIsLoadingDateAppointments(true);
      try {
        const response = await fetch(`http://localhost:3001/api/appointments?startDate=${formData.date}&endDate=${formData.date}&anonymize=true`);
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
  }, [formData.date, isPatientBookingModalOpen]);

  // Update formData when modal opens or props change
  useEffect(() => {
    if (isPatientBookingModalOpen) {
      reloadDoctors();
      
      // Initial form state
      setFormData({
        date: newAppointmentDate ? formatDateToYYYYMMDD(newAppointmentDate) : "",
        time: newAppointmentTime || "",
        duration: "30",
        type: -1,
        customType: "",
        doctor: newAppointmentDoctorName || "",
        notes: "",
        patientName: user?.username || "",
        patientId: user?.patientId || ""
      });
    }
  }, [isPatientBookingModalOpen, newAppointmentDate, newAppointmentTime, newAppointmentDoctorName, user, reloadDoctors]);

  const handlePatientChange = (value: string) => {
    if (value === user?.patientId) {
      setFormData(prev => ({
        ...prev,
        patientId: user.patientId!,
        patientName: user.username || "Me"
      }));
    } else {
      const member = familyMembers.find(m => m.id === value);
      if (member) {
        setFormData(prev => ({
          ...prev,
          patientId: member.id!,
          patientName: `${member.firstName} ${member.lastName}`
        }));
      }
    }
  };

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

    if (!formData.date || !formData.time || formData.type === -1 || !formData.doctor) {
      toast.error("Please complete all required fields");
      return;
    }

    if (dateError) {
      toast.error(dateError);
      return;
    }

    // Past date/time validation
    const appointmentDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (appointmentDateTime <= now) {
      toast.error("Cannot schedule appointment for past date/time.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check for patient conflict within family (using current appointments in context)
      const patientConflict = appointments.find(apt => 
        apt.patientId === formData.patientId && 
        apt.date === formData.date && 
        apt.time === formData.time &&
        apt.status !== 'cancelled'
      );

      if (patientConflict) {
        toast.error(`${formData.patientName} already has an appointment at this time.`);
        setIsLoading(false);
        return;
      }

      // 2. Check for doctor conflict (fetching from backend to see ALL patients for this doctor)
      const conflictCheckUrl = `http://localhost:3001/api/appointments?startDate=${formData.date}&endDate=${formData.date}&anonymize=true`;
      const conflictResponse = await fetch(conflictCheckUrl);
      const conflictResult = await conflictResponse.json();
      
      if (conflictResult.success && conflictResult.data) {
        const doctorConflict = conflictResult.data.find((apt: Appointment) => 
          apt.time === formData.time && 
          apt.status !== 'cancelled'
        );
        
        if (doctorConflict) {
          toast.error(`The selected time slot is already booked. Please choose another time.`);
          setIsLoading(false);
          return;
        }
      }

      const appointmentData = {
        patientName: formData.patientName,
        patientId: formData.patientId,
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration),
        type: formData.type,
        customType: formData.customType,
        doctor: formData.doctor,
        notes: formData.notes,
        status: "pending" as const
      };
      
      const newApt = await addAppointment(appointmentData);
      setBookedAppointmentId(newApt.id);
      setShowSuccessPrompt(true);
      refreshAppointments();
    } catch (err) {
      console.error("Error booking appointment:", err);
      toast.error("Failed to book appointment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = () => {
    setShowSuccessPrompt(false);
    closePatientBookingModal();
    if (bookedAppointmentId && user) {
      // Find the newly created appointment in the context list (it should be there after refreshTrigger)
      // Or just pass the ID if the modal can handle it
      openPaymentModal(user.patientId!, user.username!, appointments, bookedAppointmentId);
    }
  };

  const handlePayLater = () => {
    setShowSuccessPrompt(false);
    closePatientBookingModal();
    toast.info("You can pay for your appointment later in the Orders page.");
  };

  return (
    <>
    <Dialog open={isPatientBookingModalOpen && !showSuccessPrompt} onOpenChange={closePatientBookingModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book an Appointment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ... existing form fields ... */}
          {familyMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Who is this appointment for?</Label>
              <Select
                value={formData.patientId}
                onValueChange={handlePatientChange}
                disabled={isLoadingFamily}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user?.patientId || ""}>Myself</SelectItem>
                  {familyMembers
                    .filter(m => m.id !== user?.patientId)
                    .map(m => (
                      <SelectItem key={m.id} value={m.id!}>
                        {m.firstName} {m.lastName} ({m.relationship})
                      </SelectItem>
                    ))
                  }
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
              <Label>Time</Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => {
                    const busy = isSlotBusy(slot, parseInt(formData.duration));
                    return (
                      <SelectItem key={slot} value={slot} disabled={busy}>
                        {formatTimeTo12h(slot)} {busy && "(Occupied)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
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
            <Label>Preferred Doctor</Label>
            <Select
              value={formData.doctor}
              onValueChange={(value) => setFormData(prev => ({ ...prev, doctor: value }))}
              disabled={isLoadingDoctors}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingDoctors ? "Loading..." : "Select doctor"} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.name}>
                    {doctor.name} - {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any details you'd like the doctor to know..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="resize-none"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" type="button" onClick={closePatientBookingModal} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="default" type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Success Prompt Dialog */}
    <Dialog open={showSuccessPrompt} onOpenChange={setShowSuccessPrompt}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-xl">Appointment Booked!</DialogTitle>
            <DialogDescription>
              Your appointment has been successfully scheduled and is currently pending. 
              Would you like to pay for it now to secure your slot?
            </DialogDescription>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handlePayNow} className="w-full bg-blue-600 hover:bg-blue-700">
            Pay Now
          </Button>
          <Button variant="ghost" onClick={handlePayLater} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
