import React, { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { useAppointmentStatuses, AppointmentStatusOption } from "@/hooks/useAppointmentStatuses";
import { usePaymentStatuses, PaymentStatusOption } from "@/hooks/usePaymentStatuses";
import { Calendar as CalendarIcon, Clock, Award, Loader2, CreditCard, Banknote, Stethoscope, ChevronLeft, AlertCircle, Plus } from "lucide-react";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { formatTimeTo12h, TIME_SLOTS } from "@/lib/time-slots";
import { APPOINTMENT_PRICES, getAppointmentTypeName } from "@/lib/appointmentTypes";
import { toast } from 'sonner';
import useSharedBookingLogic, { getBookingActor, getBookingConflictWarnings } from './sharedBookingLogic';
import AppointmentHistoryView from "./AppointmentHistoryView";
import { DatePickerModal } from "./DatePickerModal";
import { TimePickerModal } from "./TimePickerModal";
import { useDoctors } from "@/hooks/useDoctors";
import { cachePublicBookingPatient, createPublicBookingAppointment, getCachedPublicBookingPatients } from "@/lib/publicBookingCache";
import type { BookingMode } from "./sharedBookingLogic";

type ImprovedBookingStep = "patient" | "schedule" | "doctor" | "treatment" | "payment";

// Helper function to get appointment type index from name
const getAppointmentTypeIndex = (typeName: string): number => {
  const typeMap: Record<string, number> = {
    "Routine Cleaning": 0,
    "Checkup": 1,
    "Filling": 2,
    "Root Canal": 3,
    "Extraction": 4,
    "Whitening": 5,
    "Other": 6,
  };
  return typeMap[typeName] ?? 6;
};




// Helper function to get status label from status array
const getStatusLabel = (statusValue: string, statuses: AppointmentStatusOption[]): string => {
  const status = statuses.find(s => s.value === statusValue);
  return status?.label || statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
};

// Helper function to get payment status label from payment status array
const getPaymentStatusLabel = (statusValue: string, statuses: PaymentStatusOption[]): string => {
  const status = statuses.find(s => s.value === statusValue);
  return status?.label || statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
};

// Helper function to format doctor name consistently
const formatDoctorName = (name?: string): string => {
  if (!name || name === '—') return "—";
  const cleanName = name.replace(/^Dr\.\s+/i, "");
  return `Dr. ${cleanName}`;
};

const normalizeDoctorName = (name?: string) => (name || "").replace(/^Dr\.\s+/i, "").toLowerCase().trim();

const getDoctorInitials = (name?: string) => {
  const cleanName = (name || "Doctor").replace(/^Dr\.\s+/i, "").trim();
  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const toPatientOption = (patient: any) => ({
  id: String(patient.id),
  name: patient.name || `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient",
  ...patient,
});

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultTime?: string;
  doctorName?: string; // doctor's display name
  defaultPatientId?: string;
  onBooked?: (apt?: any) => void;
  onDeleted?: (apt?: any) => void;
  appointmentToEdit?: any; // optional appointment object to edit
  title?: string; // optional override for dialog title
  bookingMode?: BookingMode;
}

// Map appointment types to default durations (in minutes)
const appointmentTypeDurations: Record<string, number> = {
  "Routine Cleaning": 30,
  "Checkup": 30,
  "Filling": 60,
  "Root Canal": 90,
  "Extraction": 60,
  "Whitening": 60,
  "Other": 30,
};

export default function BookingModal({ open, onOpenChange, defaultDate, defaultTime, doctorName, defaultPatientId, onBooked, onDeleted, appointmentToEdit, title, bookingMode = "standard" }: BookingModalProps) {
  const { user } = useAuth();
  const { doctors } = useDoctors(undefined, { publicBooking: bookingMode === "public" && !user?.role });
  const { addAppointment, updateAppointment, isPaymentFlow, openAddPatientModal, lastAddedPatient, lastAddedPatientAt } = useAppointmentModal();
  const { statuses: appointmentStatuses } = useAppointmentStatuses();
  const { statuses: paymentStatuses } = usePaymentStatuses();
  
  const [isPriceEditable, setIsPriceEditable] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>(doctorName || "");
  const [appointmentType, setAppointmentType] = useState<string>("");
  const [customAppointmentTypeName, setCustomAppointmentTypeName] = useState<string>("");
  const [duration, setDuration] = useState<string>("30");
  const [discount, setDiscount] = useState<string>("0");
  const [customPrice, setCustomPrice] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate ?? new Date());
  const [selectedTime, setSelectedTime] = useState<string>(defaultTime ?? "");
  const [isBooking, setIsBooking] = useState(false);
  const [appointmentLogs, setAppointmentLogs] = useState<any[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [durationConflict, setDurationConflict] = useState<string>("");

  // New states for multi-step flow (patient -> schedule -> treatment -> doctor -> payment)
  const [modalStep, setModalStep] = useState<ImprovedBookingStep>("patient");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountToPay, setAmountToPay] = useState<string>("");
  const [appointmentStatus, setAppointmentStatus] = useState<string>("scheduled");
  const [paymentStatus, setPaymentStatus] = useState<string>("unpaid");
  const [statusChangedByUser, setStatusChangedByUser] = useState<number>(0);
  const [paymentStatusChangedByUser, setPaymentStatusChangedByUser] = useState<number>(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmSummaryOpen, setIsConfirmSummaryOpen] = useState(false);
  const [snapshotToView, setSnapshotToView] = useState<any>(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [dailyAppointments, setDailyAppointments] = useState<any[]>([]);
  const [patientConflict, setPatientConflict] = useState("");
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const lastHandledAddedPatientAtRef = useRef<number | null>(null);

  // Log all available statuses when modal opens
  useEffect(() => {
    if (open && appointmentStatuses && appointmentStatuses.length > 0) {
      console.log('[BookingModal] Available appointment statuses:', appointmentStatuses.map(s => s.value));
    }
  }, [open, appointmentStatuses]);

  // Fetch all appointments for the day to check conflicts across all doctors and patients
  useEffect(() => {
    if (!open || !selectedDate) return;
    
    const fetchDailyAppointments = async () => {
      try {
        const dateStr = formatDateToYYYYMMDD(selectedDate);
        const res = await fetch(
          `http://localhost:3001/api/appointments?startDate=${dateStr}&endDate=${dateStr}`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            // Exclude cancelled appointments and current appointment being edited
            const filtered = (json.data || []).filter((apt: any) => 
              apt.status !== 'cancelled' && apt.id !== appointmentToEdit?.id
            );
            
            // Group appointments by doctor and status for detailed logging
            const byDoctor: Record<string, any[]> = {};
            const byStatus: Record<string, any[]> = {};
            
            filtered.forEach((apt: any) => {
              // Group by doctor
              if (!byDoctor[apt.doctor]) byDoctor[apt.doctor] = [];
              byDoctor[apt.doctor].push(apt);
              
              // Group by status
              if (!byStatus[apt.status]) byStatus[apt.status] = [];
              byStatus[apt.status].push(apt);
            });
            
            // Log comprehensive schedule information
            console.log('[BookingModal] 📅 DAILY SCHEDULE - ALL APPOINTMENTS:', {
              date: dateStr,
              formattedDate: selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
              totalAppointments: filtered.length,
              
              // Summary by status
              summary: {
                scheduled: byStatus['scheduled']?.length || 0,
                reserved: byStatus['reserved']?.length || 0,
                pending: byStatus['pending']?.length || 0,
                completed: byStatus['completed']?.length || 0,
              },
              
              // Detailed breakdown by doctor
              byDoctor: Object.keys(byDoctor).sort().map(doctor => ({
                doctor,
                appointments: byDoctor[doctor].map((apt: any) => ({
                  time: apt.time,
                  duration: `${apt.duration} mins`,
                  endTime: (() => {
                    const [h, m] = (apt.time || '00:00').split(':').map(Number);
                    const end = new Date(selectedDate);
                    end.setHours(h, m + apt.duration, 0, 0);
                    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                  })(),
                  status: apt.status,
                  patient: apt.patientName,
                  patientId: apt.patientId
                }))
              })),
              
              // Alternative view: all appointments in chronological order
              chronological: filtered
                .sort((a: any, b: any) => {
                  const aTime = a.time.split(':').map(Number);
                  const bTime = b.time.split(':').map(Number);
                  return (aTime[0] * 60 + aTime[1]) - (bTime[0] * 60 + bTime[1]);
                })
                .map((apt: any) => ({
                  time: apt.time,
                  duration: `${apt.duration} mins`,
                  status: apt.status,
                  doctor: apt.doctor,
                  patient: apt.patientName
                }))
            });
            
            setDailyAppointments(filtered);
            
            // Also filter for current patient if one is selected
            if (selectedPatient) {
              const pAppts = filtered.filter((apt: any) => String(apt.patientId) === String(selectedPatient));
              setPatientAppointments(pAppts);
            } else {
              setPatientAppointments([]);
            }
          }
        }
      } catch (err) {
        console.warn("[BookingModal] Could not fetch daily appointments:", err);
      }
    };
    
    fetchDailyAppointments();
  }, [open, selectedDate, selectedPatient, appointmentToEdit?.id]);

  // Read-only for patient viewing their own booked/reserved appointment: only notes editable
  const isCancelled = (appointmentStatus || appointmentToEdit?.status || '').toLowerCase() === 'cancelled';
  const isPatientReadonly = Boolean(appointmentToEdit && user?.role === 'patient');
  const isEditMode = Boolean(appointmentToEdit);
  const {
    isPublicBookingMode,
    canCreatePatients,
    canManagePricing,
    isDoctorSelectionLocked,
  } = getBookingActor({
    userRole: user?.role,
    bookingMode,
  });

  useEffect(() => {
    if (!open || appointmentToEdit || !canCreatePatients || !lastAddedPatient || !lastAddedPatientAt) return;
    if (lastHandledAddedPatientAtRef.current === lastAddedPatientAt) return;

    const patientOption = toPatientOption(lastAddedPatient);
    if (isPublicBookingMode) {
      cachePublicBookingPatient(patientOption);
    }
    setPatients(prev => {
      const filtered = prev.filter((patient: any) => String(patient.id) !== String(patientOption.id));
      return [patientOption, ...filtered];
    });
    setSelectedPatient(patientOption.id);
    lastHandledAddedPatientAtRef.current = lastAddedPatientAt;
  }, [open, appointmentToEdit, canCreatePatients, isPublicBookingMode, lastAddedPatient, lastAddedPatientAt]);

  // Fetch logs when appointment is being edited
  useEffect(() => {
    if (open && appointmentToEdit?.id) {
      console.log(`[BookingModal] 🔍 FETCHING LOGS for appointment: ${appointmentToEdit.id}`);
      const fetchLogs = async () => {
        // Add a small delay to ensure backend has finished saving before fetching
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          const res = await fetch(`http://localhost:3001/api/appointments/${appointmentToEdit.id}/logs`, { credentials: 'include' });
          if (res.ok) {
            const json = await res.json();
            console.log(`[BookingModal] ✅ LOGS FETCHED:`, { 
              count: json.data?.length, 
              logs: json.data 
            });
            if (json.success) {
              setAppointmentLogs(json.data || []);
            }
          } else if (res.status === 404) {
            // 404 is expected if logs endpoint doesn't exist or no logs available yet
            console.log(`[BookingModal] ℹ️ No logs available for this appointment`);
            setAppointmentLogs([]);
          } else {
            console.warn(`[BookingModal] ⚠️ Failed to fetch logs with status:`, res.status);
            setAppointmentLogs([]);
          }
        } catch (err) {
          console.warn("[BookingModal] ⚠️ Could not fetch appointment logs:", err);
          setAppointmentLogs([]);
        }
      };
      fetchLogs();
    } else if (!open) {
      setAppointmentLogs([]);
    }
  }, [open, appointmentToEdit]);

  // Fetch payment logs when appointment is being edited
  useEffect(() => {
    if (open && appointmentToEdit?.id) {
      const fetchPaymentLogs = async () => {
        // Add a small delay to ensure backend has finished saving before fetching
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          const res = await fetch(`http://localhost:3001/api/appointments/${appointmentToEdit.id}/payments`, { credentials: 'include' });
          if (res.ok) {
            const json = await res.json();
            if (json.success) {
              setPaymentLogs(json.data || []);
            }
          }
        } catch (err) {
          console.warn("[BookingModal] ⚠️ Could not fetch payment logs:", err);
          setPaymentLogs([]);
        }
      };
      fetchPaymentLogs();
    } else if (!open) {
      setPaymentLogs([]);
    }
  }, [open, appointmentToEdit]);

  // Check if a time + duration combination overlaps with existing appointments for selected doctor
  const checkDurationConflict = useCallback((time: string, durationMins: number): boolean => {
    if (!time || !selectedDate || !selectedDoctor) return false;

    const [hours, minutes] = time.split(':').map(Number);
    const slotStartDate = new Date(selectedDate);
    slotStartDate.setHours(hours, minutes, 0, 0);
    const slotEndDate = new Date(slotStartDate.getTime() + durationMins * 60000);

    // Normalize doctor name for more robust matching (remove "Dr. " prefix and case-insensitive)
    const normalizeName = (name: string) => (name || "").replace(/^Dr\.\s+/i, "").toLowerCase().trim();
    const targetDoctor = normalizeName(selectedDoctor);

    // Filter daily appointments for the selected doctor - exclude pending as they can be overridden
    const doctorAppts = dailyAppointments.filter(apt => 
      normalizeName(apt.doctor) === targetDoctor && 
      (apt.status || "").toLowerCase() !== "pending"
    );
    
    // DEBUG: Log the filtering process
    console.log('[BookingModal] 🔍 DOCTOR NAME MATCHING DEBUG:', {
      selectedDoctor,
      targetDoctor,
      totalDailyAppointments: dailyAppointments.length,
      allDoctorNames: Array.from(new Set(dailyAppointments.map(apt => apt.doctor))),
      normalizedDoctorNames: Array.from(new Set(dailyAppointments.map(apt => normalizeName(apt.doctor)))),
      matchedCount: doctorAppts.length
    });

    for (const apt of doctorAppts) {
      // Parse the appointment date - it might be YYYY-MM-DD format
      let aptStart: Date;
      if (typeof apt.date === 'string' && apt.date.includes('-') && !apt.date.includes(':')) {
        const [aptHours, aptMinutes] = (apt.time || '00:00').split(':').map(Number);
        aptStart = new Date(apt.date);
        aptStart.setHours(aptHours, aptMinutes, 0, 0);
      } else {
        aptStart = new Date(apt.date);
      }
      
      const aptDurationMins = parseInt(String(apt.duration), 10) || 30;
      const aptEnd = new Date(aptStart.getTime() + aptDurationMins * 60000);

      // Check if times overlap
      if (slotStartDate < aptEnd && slotEndDate > aptStart) {
        return true;
      }
    }

    return false;
  }, [selectedDate, selectedDoctor, dailyAppointments]);

  // Get conflict info for a specific duration
  const getDurationConflictInfo = useCallback((durationMins: number): { hasConflict: boolean; conflictTime?: string } => {
    if (!selectedTime || !selectedDate || !selectedDoctor) return { hasConflict: false };
    
    const hasConflict = checkDurationConflict(selectedTime, durationMins);
    if (!hasConflict) return { hasConflict: false };

    // Find the conflicting appointment time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const slotStartDate = new Date(selectedDate);
    slotStartDate.setHours(hours, minutes, 0, 0);
    const slotEndDate = new Date(slotStartDate.getTime() + durationMins * 60000);

    const normalizeName = (name: string) => (name || "").replace(/^Dr\.\s+/i, "").toLowerCase().trim();
    const targetDoctor = normalizeName(selectedDoctor);
    const doctorAppts = dailyAppointments.filter(apt => 
      normalizeName(apt.doctor) === targetDoctor && 
      (apt.status || "").toLowerCase() !== "pending"
    );

    for (const apt of doctorAppts) {
      let aptStart: Date;
      if (typeof apt.date === 'string' && apt.date.includes('-') && !apt.date.includes(':')) {
        const [aptHours, aptMinutes] = (apt.time || '00:00').split(':').map(Number);
        aptStart = new Date(apt.date);
        aptStart.setHours(aptHours, aptMinutes, 0, 0);
      } else {
        aptStart = new Date(apt.date);
      }
      
      const aptDurationMins = parseInt(String(apt.duration), 10) || 30;
      const aptEnd = new Date(aptStart.getTime() + aptDurationMins * 60000);
      
      if (slotStartDate < aptEnd && slotEndDate > aptStart) {
        return { 
          hasConflict: true, 
          conflictTime: `${String(aptStart.getHours()).padStart(2, '0')}:${String(aptStart.getMinutes()).padStart(2, '0')}` 
        };
      }
    }

    return { hasConflict: true };
  }, [selectedTime, selectedDate, selectedDoctor, dailyAppointments, checkDurationConflict]);

  // Check if a specific duration option is available (no conflict)
  const isDurationAvailable = useCallback((durationMins: number): boolean => {
    if (!selectedTime) return true;
    return !checkDurationConflict(selectedTime, durationMins);
  }, [selectedTime, checkDurationConflict]);

  // Update conflict status when duration changes
  useEffect(() => {
    if (!selectedTime || !selectedDoctor) {
      setDurationConflict("");
      return;
    }

    const durationMins = parseInt(duration, 10) || 30;
    const conflict = getDurationConflictInfo(durationMins);
    
    if (conflict.hasConflict) {
      setDurationConflict(`Conflicts with appointment at ${conflict.conflictTime || 'this time'}`);
    } else {
      setDurationConflict("");
    }

    // Log available durations when time is set
    const availableDurations = [30, 60, 90, 120].filter(dur => isDurationAvailable(dur));
    const unavailableDurations = [30, 60, 90, 120].filter(dur => !isDurationAvailable(dur));
    
    console.log('[BookingModal] ⏱️ DURATION AVAILABILITY AT TIME:', {
      doctor: selectedDoctor,
      date: selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      selectedTime: selectedTime,
      currentDuration: `${durationMins} mins`,
      availableDurations: availableDurations.length > 0 ? availableDurations.map(d => `${d} mins`) : '❌ NONE',
      unavailableDurations: unavailableDurations.length > 0 ? unavailableDurations.map(d => `${d} mins`) : 'None',
      
      // DEBUG: Show all doctor appointments being checked
      debugDoctorAppts: dailyAppointments
        .filter(apt => (apt.doctor || "").replace(/^Dr\.\s+/i, "").toLowerCase().trim() === (selectedDoctor || "").replace(/^Dr\.\s+/i, "").toLowerCase().trim())
        .map(apt => ({ time: apt.time, duration: apt.duration, status: apt.status, patient: apt.patientName })),
      
      // Show which appointments are blocking each unavailable duration
      blockedBy: unavailableDurations.length > 0 ? unavailableDurations.map(dur => {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(hours, minutes, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + dur * 60000);
        
        const normalizeName = (name: string) => (name || "").replace(/^Dr\.\s+/i, "").toLowerCase().trim();
        const targetDoctor = normalizeName(selectedDoctor);
        const doctorAppts = dailyAppointments.filter(apt => 
          normalizeName(apt.doctor) === targetDoctor && 
          (apt.status || "").toLowerCase() !== "pending"
        );
        
        const blockingAppts = doctorAppts.filter((apt: any) => {
          let aptStart: Date;
          if (typeof apt.date === 'string' && apt.date.includes('-') && !apt.date.includes(':')) {
            const [aptHours, aptMinutes] = (apt.time || '00:00').split(':').map(Number);
            aptStart = new Date(apt.date);
            aptStart.setHours(aptHours, aptMinutes, 0, 0);
          } else {
            aptStart = new Date(apt.date);
          }
          const aptDurationMins = parseInt(String(apt.duration), 10) || 30;
          const aptEnd = new Date(aptStart.getTime() + aptDurationMins * 60000);
          return slotStart < aptEnd && slotEnd > aptStart;
        });
        
        return {
          duration: `${dur} mins`,
          blocked: blockingAppts.length > 0,
          blockingAppointments: blockingAppts.map((apt: any) => ({
            time: apt.time,
            duration: `${apt.duration} mins`,
            status: apt.status,
            patient: apt.patientName
          }))
        };
      }) : []
    });
  }, [duration, selectedTime, getDurationConflictInfo, isDurationAvailable, selectedDoctor, selectedDate, dailyAppointments]);

  // Check if patient has a conflicting appointment at the selected time
  const checkPatientConflict = useCallback((time: string, durationMins: number): boolean => {
    if (!time || !selectedDate) return false;

    const [hours, minutes] = time.split(':').map(Number);
    const slotStartDate = new Date(selectedDate);
    slotStartDate.setHours(hours, minutes, 0, 0);
    const slotEndDate = new Date(slotStartDate.getTime() + durationMins * 60000);

    for (const apt of patientAppointments) {
      let aptStart: Date;
      if (typeof apt.date === 'string' && apt.date.includes('-') && !apt.date.includes(':')) {
        const [aptHours, aptMinutes] = (apt.time || '00:00').split(':').map(Number);
        aptStart = new Date(apt.date);
        aptStart.setHours(aptHours, aptMinutes, 0, 0);
      } else {
        aptStart = new Date(apt.date);
      }
      
      const aptDurationMins = parseInt(String(apt.duration), 10) || 30;
      const aptEnd = new Date(aptStart.getTime() + aptDurationMins * 60000);

      // Check if times overlap
      if (slotStartDate < aptEnd && slotEndDate > aptStart) {
        return true;
      }
    }

    return false;
  }, [selectedDate, patientAppointments]);

  // Get conflict info for patient
  const getPatientConflictInfo = useCallback(() => {
    if (!selectedTime || !selectedDate) return { hasConflict: false };
    
    const durationMins = parseInt(duration, 10) || 30;
    const hasConflict = checkPatientConflict(selectedTime, durationMins);
    if (!hasConflict) return { hasConflict: false };

    // Find the conflicting appointment
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const slotStartDate = new Date(selectedDate);
    slotStartDate.setHours(hours, minutes, 0, 0);
    const slotEndDate = new Date(slotStartDate.getTime() + durationMins * 60000);

    for (const apt of patientAppointments) {
      let aptStart: Date;
      if (typeof apt.date === 'string' && apt.date.includes('-') && !apt.date.includes(':')) {
        const [aptHours, aptMinutes] = (apt.time || '00:00').split(':').map(Number);
        aptStart = new Date(apt.date);
        aptStart.setHours(aptHours, aptMinutes, 0, 0);
      } else {
        aptStart = new Date(apt.date);
      }
      
      const aptDurationMins = parseInt(String(apt.duration), 10) || 30;
      const aptEnd = new Date(aptStart.getTime() + aptDurationMins * 60000);
      
      if (slotStartDate < aptEnd && slotEndDate > aptStart) {
        return { 
          hasConflict: true, 
          conflictTime: `${String(aptStart.getHours()).padStart(2, '0')}:${String(aptStart.getMinutes()).padStart(2, '0')}`,
          conflictDoctor: apt.doctor || 'Another Doctor'
        };
      }
    }

    return { hasConflict: true };
  }, [selectedTime, selectedDate, duration, checkPatientConflict, patientAppointments]);

  // Update conflict status when patient, time, or duration changes
  useEffect(() => {
    if (!selectedTime || !selectedPatient) {
      setPatientConflict("");
      return;
    }

    // Get the selected patient's name
    const selectedPatientObj = patients.find(p => String(p.id) === String(selectedPatient));
    const selectedPatientName = selectedPatientObj?.name || 'Patient';

    const conflict = getPatientConflictInfo();
    
    if (conflict.hasConflict) {
      setPatientConflict(`${selectedPatientName} has appointment with ${conflict.conflictDoctor} at ${conflict.conflictTime}`);
    } else {
      setPatientConflict("");
    }
  }, [selectedPatient, selectedTime, duration, patients, getPatientConflictInfo]);

  // Compute which patients have conflicts for the selected time/duration/date
  const computePatientConflicts = useCallback((): Set<string> => {
    if (!selectedTime || !selectedDate) return new Set();
    
    const durationMins = parseInt(duration, 10) || 30;
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const slotStartDate = new Date(selectedDate);
    slotStartDate.setHours(hours, minutes, 0, 0);
    const slotEndDate = new Date(slotStartDate.getTime() + durationMins * 60000);

    const conflictingPatientIds = new Set<string>();

    // For each appointment in dailyAppointments, check if it overlaps with our selected time slot
    for (const apt of dailyAppointments) {
      if ((apt.status || "").toLowerCase() === "pending") continue;
      let aptStart: Date;
      if (typeof apt.date === 'string' && apt.date.includes('-') && !apt.date.includes(':')) {
        const [aptHours, aptMinutes] = (apt.time || '00:00').split(':').map(Number);
        aptStart = new Date(apt.date);
        aptStart.setHours(aptHours, aptMinutes, 0, 0);
      } else {
        aptStart = new Date(apt.date);
      }
      
      const aptDurationMins = parseInt(String(apt.duration), 10) || 30;
      const aptEnd = new Date(aptStart.getTime() + aptDurationMins * 60000);
      
      if (slotStartDate < aptEnd && slotEndDate > aptStart) {
        if (apt.patientId) {
          conflictingPatientIds.add(String(apt.patientId));
        }
      }
    }

    return conflictingPatientIds;
  }, [selectedTime, selectedDate, duration, dailyAppointments]);

  const patientConflictSet = computePatientConflicts();

  // Log patient conflicts when date/time changes
  useEffect(() => {
    if (!open || !selectedDate || !selectedTime) return;

    const durationMins = parseInt(duration, 10) || 30;
    const dateStr = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const disabledPatients = Array.from(patientConflictSet);
    const enabledPatients = patients.filter(p => !patientConflictSet.has(p.id));

    console.log('[BookingModal] 👥 PATIENT AVAILABILITY:', {
      date: dateStr,
      time: selectedTime,
      duration: `${durationMins} mins`,
      totalPatients: patients.length,
      availablePatients: enabledPatients.length,
      disabledPatients: disabledPatients.length,
      available: enabledPatients.map(p => p.name),
      disabled: disabledPatients.map(id => {
        const patient = patients.find(p => p.id === id);
        const appts = patientAppointments.filter((apt: any) => apt.patientId === id);
        return {
          name: patient?.name,
          conflicts: appts.map((apt: any) => ({
            time: apt.time,
            duration: `${apt.duration} mins`,
            doctor: apt.doctor
          }))
        };
      })
    });
  }, [selectedDate, selectedTime, duration, patientConflictSet, patients, patientAppointments, open]);

  // Update duration when appointment type changes - always reset to default when type changes
  useEffect(() => {
    if (!appointmentType) {
      setDuration("");
      return;
    }
    // Always set default duration when appointment type changes
    const defaultDur = appointmentTypeDurations[appointmentType] || 30;
    setDuration(String(defaultDur));
  }, [appointmentType]);

  useEffect(() => {
    setSelectedDate(defaultDate ?? new Date());
  }, [defaultDate]);

  useEffect(() => {
    setSelectedTime(defaultTime ?? "");
  }, [defaultTime]);

  // Debug: log incoming default patient id
  useEffect(() => {
    if (defaultPatientId) {
      console.log('[ImprovedBookingModal] 🔔 defaultPatientId prop:', defaultPatientId);
    } else {
      console.log('[ImprovedBookingModal] 🔔 no defaultPatientId provided');
    }
  }, [defaultPatientId]);

  // Sync doctorName prop to selectedDoctor state when it changes
  useEffect(() => {
    if (doctorName) {
      setSelectedDoctor(doctorName);
    }
  }, [doctorName]);

  useEffect(() => {
    if (!open || appointmentToEdit || doctorName) return;
    if (user?.role === 'doctor' && user.username) {
      setSelectedDoctor(user.username);
    }
  }, [open, appointmentToEdit, doctorName, user?.role, user?.username]);

  // Auto-preselect first doctor for non-doctor portals when modal opens
  // BUT: Skip if doctorName was explicitly passed (e.g., from DoctorAvailabilityView)
  useEffect(() => {
    if (!open) return;
    
    // Only auto-preselect if user is NOT a doctor
    if (user?.role === 'doctor') return;

    // Non-doctor users choose a doctor explicitly in the doctor step.
    if (!doctorName) return;
    
    // If doctorName prop was explicitly passed, don't auto-select a different doctor
    // The doctorName will be synced via the other useEffect that watches doctorName prop
    if (doctorName) {
      console.log('[BookingModal] 📋 Skipping auto-doctor-selection: doctorName explicitly passed from props');
      return;
    }
    
    // Only auto-preselect if no doctor is currently selected
    if (selectedDoctor) return;
    
    // Only auto-preselect if editing an appointment (use doctor from appointment)
    if (appointmentToEdit?.doctor) return;
    
    // Auto-preselect first available doctor (only when NO doctorName prop passed)
    if (doctors && doctors.length > 0) {
      console.log('[BookingModal] 🏥 Auto-selecting first available doctor');
      setSelectedDoctor(doctors[0].name);
    }
  }, [open, user?.role, doctors, selectedDoctor, appointmentToEdit?.doctor, doctorName]);

  // Helper function to find next available slot (date + time)
  const findNextAvailableSlot = useCallback(async (startDate: Date, doctorToCheck: string, durationToCheck: string, patientToCheck?: string): Promise<{ date: Date; time: string } | null> => {
    if (!doctorToCheck || !durationToCheck) return null;
    
    const durationMins = parseInt(durationToCheck, 10) || 30;
    const maxDaysToCheck = 30; // Check up to 30 days ahead
    
    // Helper to get available slots for a given date
    const getSlotsForDate = async (date: Date): Promise<string[]> => {
      try {
        const dateStr = formatDateToYYYYMMDD(date);
        const res = await fetch(
          `http://localhost:3001/api/appointments?doctor=${encodeURIComponent(doctorToCheck)}&startDate=${dateStr}&endDate=${dateStr}&includeUnpaid=true`,
          { credentials: 'include' }
        );
        
        if (!res.ok) return [];

        const json = await res.json();
        const appointments = json.data || [];
        console.log('[BookingModal] findNextAvailableSlot fetched appointments for', dateStr, { doctorToCheck, appointmentsCount: appointments.length });

        // If patientToCheck is provided, also fetch that patient's appointments for the same date
        let patientAppointmentsForDate: any[] = [];
        if (patientToCheck) {
          try {
            const pres = await fetch(
              `http://localhost:3001/api/appointments?patientId=${encodeURIComponent(patientToCheck)}&startDate=${dateStr}&endDate=${dateStr}&includeUnpaid=true`,
              { credentials: 'include' }
            );
            if (pres.ok) {
              const pjson = await pres.json();
              patientAppointmentsForDate = pjson.data || [];
            }
          } catch (err) {
            console.warn('[BookingModal] Failed to fetch patient appointments for auto-search', err);
            patientAppointmentsForDate = [];
          }
          console.log('[BookingModal] findNextAvailableSlot fetched patient appointments for', dateStr, { patientToCheck, patientCount: patientAppointmentsForDate.length });
        }
        
        // Calculate available slots
        const now = new Date();
        const todayStr = formatDateToYYYYMMDD(now);
        const isToday = dateStr === todayStr;
        
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const timeToMinutes = (time: string): number => {
          const [h, m] = time.split(':').map(Number);
          return h * 60 + m;
        };
        
        const availableSlots: string[] = [];
        
        for (const slot of TIME_SLOTS) {
          const [hour, minute] = slot.split(':').map(Number);
          const isPastTime = isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute));
          
          if (isPastTime) continue;
          
          // Check for booking conflicts
          const slotMinutes = timeToMinutes(slot);
          const slotEndMinutes = slotMinutes + durationMins;
          
          let isConflict = false;
          // Check conflicts against doctor's appointments
          for (const apt of appointments) {
            if (apt.status === 'cancelled') continue;
            if (apt.status === 'pending') continue; // Pending can be overridden

            const aptStart = timeToMinutes(apt.time);
            const aptEnd = aptStart + (apt.duration || 30);

            if (slotMinutes < aptEnd && slotEndMinutes > aptStart) {
              isConflict = true;
              break;
            }
          }

          // Also check conflicts against patient's own appointments for that date
          if (!isConflict && patientAppointmentsForDate && patientAppointmentsForDate.length > 0) {
            for (const apt of patientAppointmentsForDate) {
              if (apt.status === 'cancelled') continue;
              if (apt.status === 'pending') continue;

              const aptStart = timeToMinutes(apt.time);
              const aptEnd = aptStart + (apt.duration || 30);

              if (slotMinutes < aptEnd && slotEndMinutes > aptStart) {
                isConflict = true;
                break;
              }
            }
          }
          
          if (!isConflict) {
            availableSlots.push(slot);
          }
        }
        
        return availableSlots;
      } catch (err) {
        console.warn(`[BookingModal] Failed to fetch appointments for date ${formatDateToYYYYMMDD(date)}:`, err);
        return [];
      }
    };
    
    // Search for next available slot starting from startDate
    for (let daysAhead = 0; daysAhead < maxDaysToCheck; daysAhead++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + daysAhead);
      
      // Skip past dates
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (checkDate < now) continue;
      
      const availableSlots = await getSlotsForDate(checkDate);
      
      if (availableSlots.length > 0) {
        return {
          date: checkDate,
          time: availableSlots[0] // Return first available slot
        };
      }
    }
    
    return null;
  }, []);

  // Centralized auto-preselect/validation runner — callable on open and after patients load
  const runAutoPreselect = useCallback(async (patientId?: string) => {
    if (appointmentToEdit) return; // don't preselect when editing

    // CASE A: DoctorAvailabilityView validation
    if (defaultDate && defaultTime && doctorName) {
      const defaultDuration = appointmentTypeDurations[appointmentType || 'Routine Cleaning'] || 30;
      const patientToSearch = patientId || selectedPatient || defaultPatientId || undefined;
      try {
        const nextSlot = await findNextAvailableSlot(defaultDate, doctorName, String(defaultDuration), patientToSearch);
        if (!nextSlot) return;
        const defaultDateStr = formatDateToYYYYMMDD(defaultDate);
        const nextDateStr = formatDateToYYYYMMDD(nextSlot.date);
        if (!(nextDateStr === defaultDateStr && nextSlot.time === defaultTime)) {
          console.log('[BookingModal] ⚠️ Provided default slot conflicts; overriding to next available slot (on open):', { date: nextDateStr, time: nextSlot.time });
          setSelectedDate(nextSlot.date);
          setSelectedTime(nextSlot.time);
        } else {
          console.log('[BookingModal] ✅ Provided default slot is available (on open)');
        }
      } catch (err) {
        console.warn('[BookingModal] Error validating default slot on open:', err);
      }
      return;
    }

    // CASE B: Explicit clicked slot (respect it)
    if (defaultDate && defaultTime) {
      if (!appointmentType) setAppointmentType('Routine Cleaning');
      return;
    }

    // CASE C: Generic auto-search for next free slot
    if (!selectedDoctor) {
      console.log('[BookingModal] ⏳ Waiting for doctor to be selected before auto-preselect...');
      return;
    }

    const defaultDur = appointmentTypeDurations[appointmentType || 'Routine Cleaning'] || 30;
    const patientToSearch = patientId || selectedPatient || defaultPatientId || undefined;
    const nextSlot = await findNextAvailableSlot(new Date(), selectedDoctor, String(defaultDur), patientToSearch);
    if (nextSlot) {
      console.log('[BookingModal] ✅ Found next available slot (on open):', { date: formatDateToYYYYMMDD(nextSlot.date), time: nextSlot.time });
      setSelectedDate(nextSlot.date);
      setSelectedTime(nextSlot.time);
    }
  }, [appointmentToEdit, defaultDate, defaultTime, doctorName, appointmentType, selectedDoctor, selectedPatient, defaultPatientId, findNextAvailableSlot]);

  const runAutoPreselectRef = useRef(runAutoPreselect);

  useEffect(() => {
    runAutoPreselectRef.current = runAutoPreselect;
  }, [runAutoPreselect]);

  // Auto-preselect date, time, and appointment type for all portals
  useEffect(() => {
    if (!open || appointmentToEdit) return; // Only for new appointments, not editing
    
    // CASE 1: Coming from DoctorAvailabilityView (has defaultDate, defaultTime, and doctorName)
    // RULE: Preselect appointment type, but validate the provided date/time/doctor
    // If the provided slot conflicts for the patient/doctor, override with next available slot.
    if (defaultDate && defaultTime && doctorName) {
      console.log('[BookingModal] 📍 DoctorAvailabilityView context detected');
      console.log('[BookingModal] ℹ️ Pre-filled with: date=' + formatDateToYYYYMMDD(defaultDate) + ', time=' + defaultTime + ', doctor=' + doctorName);

      // Only preselect appointment type if not already set
      if (!appointmentType) {
        console.log('[BookingModal] 📋 Preselecting appointment type: Routine Cleaning');
        setAppointmentType("Routine Cleaning");
      }

      // Validate the provided default slot against doctor+patient conflicts and override if needed
      (async () => {
        try {
          const defaultDuration = appointmentTypeDurations[appointmentType || 'Routine Cleaning'] || 30;
          const patientToSearch = selectedPatient || defaultPatientId || undefined;
          console.log('[BookingModal] 🔍 Validating provided default slot for patient:', patientToSearch);

          const nextSlot = await findNextAvailableSlot(defaultDate, doctorName, String(defaultDuration), patientToSearch);

          if (!nextSlot) {
            console.warn('[BookingModal] ⚠️ No available slots found during validation; keeping provided defaults');
            return;
          }

          const defaultDateStr = formatDateToYYYYMMDD(defaultDate);
          const nextDateStr = formatDateToYYYYMMDD(nextSlot.date);

          if (nextDateStr === defaultDateStr && nextSlot.time === defaultTime) {
            console.log('[BookingModal] ✅ Provided default slot is available');
            return;
          }

          console.log('[BookingModal] ⚠️ Provided default slot conflicts; overriding to next available slot:', { date: nextDateStr, time: nextSlot.time });
          setSelectedDate(nextSlot.date);
          setSelectedTime(nextSlot.time);
        } catch (err) {
          console.warn('[BookingModal] Error validating default slot:', err);
        }
      })();

      return;
    }
    
    // CASE 2: Generic booking modal (explicit defaults passed)
    // Find next available slot automatically
    if (defaultDate && defaultTime) {
      // User clicked a specific time slot - respect it
      console.log('[BookingModal] 📍 Using explicitly passed date/time:', {
        date: formatDateToYYYYMMDD(defaultDate),
        time: defaultTime,
        source: 'clicked_slot'
      });
      if (!appointmentType) {
        setAppointmentType("Routine Cleaning");
      }
      return;
    }
    
    // CASE 3: New appointment modal (no defaults at all)
    // Only preselect if not already set
    if (appointmentType && selectedTime && selectedDate > new Date()) return;
    
    // Preselect first appointment type
    if (!appointmentType) {
      console.log('[BookingModal] 📋 Preselecting appointment type: Routine Cleaning');
      setAppointmentType("Routine Cleaning");
    }
    
    // Delegate to centralized runner which also validates defaults
    runAutoPreselect();
    // Re-run when selectedDoctor or selectedPatient change so auto-selection accounts for patient-specific conflicts
  }, [open, appointmentToEdit, defaultDate, defaultTime, doctorName, findNextAvailableSlot, selectedDoctor, selectedPatient, defaultPatientId]);

  // Price calculations - handle custom types
  // finalPrice is the base price (before discount) - used in payment calculations
  const basePrice = appointmentType === "Other" ? Number(customPrice) : (APPOINTMENT_PRICES[appointmentType] || 0);
  const finalPrice = Number(customPrice) > 0 ? Number(customPrice) : basePrice;

  // Log appointment type changes with price
  useEffect(() => {
    if (appointmentType) {
      const basePriceLog = APPOINTMENT_PRICES[appointmentType] || 0;
      console.log(`[BookingModal] Appointment Type Changed:`, {
        event: 'appointmentTypeChanged',
        type: appointmentType,
        basePrice: basePriceLog,
        duration: duration,
        userRole: user?.role,
        timestamp: new Date().toISOString()
      });
      // Reset custom price when appointment type changes (unless in edit mode)
      if (!isEditMode) {
        setCustomPrice("0");
      }
    }
  }, [appointmentType, user?.role, duration, isEditMode]);

  useEffect(() => {
    if (!open) return;
    // fetch patients based on role - rely on server-side filtering for patient role
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
        if (isPublicBookingMode) {
          const cachedPatients = getCachedPublicBookingPatients().map(toPatientOption);
          setPatients(cachedPatients);

          if (cachedPatients.length > 0) {
            const foundDefault = defaultPatientId
              ? cachedPatients.find((p: any) => String(p.id) === String(defaultPatientId))
              : null;
            setSelectedPatient((current) => current || foundDefault?.id || cachedPatients[0].id);
          }

          setIsLoadingPatients(false);
          return;
        }

        const fetchOpts: RequestInit = { credentials: 'include' };
        
        // Always fetch from /api/patients - server will filter based on requester role
        const res = await fetch(`http://localhost:3001/api/patients?limit=1000`, fetchOpts);
        
        if (!res.ok) {
          console.error('BookingModal: fetch failed', { status: res.status, statusText: res.statusText });
          setIsLoadingPatients(false);
          return;
        }
        
        const json = await res.json();
        console.log('BookingModal: fetch response', { success: json?.success, dataCount: json?.data?.length, user: { username: user?.username, role: user?.role } });
        
        if (json?.success && Array.isArray(json.data)) {
          let list = json.data.map(toPatientOption);
          const editPatientId = appointmentToEdit?.patientId ? String(appointmentToEdit.patientId) : "";

          if (editPatientId && !list.some((p: any) => String(p.id) === editPatientId)) {
            try {
              const patientRes = await fetch(`http://localhost:3001/api/patients/${encodeURIComponent(editPatientId)}`, fetchOpts);
              const patientJson = await patientRes.json();
              if (patientJson?.success && patientJson.data) {
                list = [toPatientOption(patientJson.data), ...list];
              }
            } catch (patientErr) {
              console.warn('[ImprovedBookingModal] Failed to fetch appointment patient; using appointment snapshot:', patientErr);
            }

            if (!list.some((p: any) => String(p.id) === editPatientId)) {
              list = [
                toPatientOption({
                  id: editPatientId,
                  name: appointmentToEdit.patientName || 'Patient',
                }),
                ...list,
              ];
            }
          }
          console.log('BookingModal: patients loaded', { 
            count: list.length, 
            source: user?.role === 'patient' ? 'server-filtered' : 'admin-fetch',
            allIds: list.slice(0, 3).map((p: any) => ({ id: p.id, type: typeof p.id, name: p.name }))
          });
          try { window.dispatchEvent(new CustomEvent('bookingmodal:patients', { detail: { source: user?.role === 'patient' ? 'server-filtered' : 'admin-fetch', count: list.length, patients: list } })); } catch {}
          setPatients(list);
          // Edit/view mode must always use the appointment patient, never the default/first patient.
          let chosenPatientId: string | undefined = undefined;
          if (editPatientId) {
            chosenPatientId = editPatientId;
          } else if (defaultPatientId) {
            const found = list.find((p: any) => String(p.id) === String(defaultPatientId));
            if (found) chosenPatientId = String(defaultPatientId);
            else if (list.length > 0) chosenPatientId = list[0].id;
          } else if (list.length > 0) {
            chosenPatientId = list[0].id;
          }

          if (chosenPatientId) {
            setSelectedPatient(chosenPatientId);
            if (!appointmentToEdit) {
              // Trigger auto-preselect validation now that we have a selected patient.
              runAutoPreselectRef.current(chosenPatientId).catch((err) => {
                console.warn('[BookingModal] Failed to validate schedule after patient load:', err);
              });
            }
          }
        } else {
          console.warn('BookingModal: empty or failed response', json);
          setPatients([]);
        }
      } catch (err) {
        console.error('Failed to fetch patients for booking modal', err);
        setPatients([]);
      } finally {
        setIsLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [open, user, defaultPatientId, appointmentToEdit, isPublicBookingMode]);

  // When an appointment is provided for editing, prefill the form
  useEffect(() => {
    if (appointmentToEdit) {
      console.log('[BookingModal] 📂 OPENING APPOINTMENT FOR EDITING:', {
        appointmentId: appointmentToEdit.id,
        patientName: appointmentToEdit.patientName,
        currentStatus: appointmentToEdit.status,
        currentPaymentStatus: appointmentToEdit.paymentStatus,
        totalPaid: appointmentToEdit.totalPaid,
        balance: appointmentToEdit.balance,
        logsCount: appointmentLogs.length,
        paymentLogsCount: paymentLogs.length,
        timestamp: new Date().toISOString()
      });

      setSelectedPatient(String(appointmentToEdit.patientId || appointmentToEdit.patientId));
      // Use getAppointmentTypeName to convert type index to string name
      // This handles both standard types (0-5) and custom type (6 with customType)
      const typeName = getAppointmentTypeName(appointmentToEdit.type, appointmentToEdit.customType);
      console.log('[BookingModal Edit] Converted appointment type:', {
        type: appointmentToEdit.type,
        customType: appointmentToEdit.customType,
        convertedTypeName: typeName
      });

      // If it's a custom type (type 6), set appointmentType to "Other"
      // This ensures the Select matches "Other" and custom fields are shown
      if (appointmentToEdit.type === 6) {
        setAppointmentType("Other");
        setCustomAppointmentTypeName(appointmentToEdit.customType || "");
      } else {
        setAppointmentType(typeName);
      }
      
      // Always set the stored price (whether custom or standard type)
      setCustomPrice(String(appointmentToEdit.price || 0));
      setDuration(String(appointmentToEdit.duration || 30));
      // Prefill discount if it exists in the appointment (from discount field)
      setDiscount(String(appointmentToEdit.discount || 0));
      // For both editing and creating via the BookingModal we intentionally
      // clear the notes field so the modal opens with an empty notes input.
      // Notes from history remain visible in the AppointmentHistoryView below,
      // but they are not auto-copied into the editable notes field.
      setNotes('');
      setSelectedDate(appointmentToEdit.date ? new Date(appointmentToEdit.date) : (defaultDate ?? new Date()));
      setSelectedTime(appointmentToEdit.time || (defaultTime ?? ''));
      // Set doctor from the appointment
      if (appointmentToEdit.doctor) {
        setSelectedDoctor(appointmentToEdit.doctor);
      }
      // For editing, initialize payment amount to empty so user enters NEW payment amount
      setAmountToPay('');
      setAppointmentStatus(appointmentToEdit.status || 'scheduled');
      setPaymentStatus(appointmentToEdit.paymentStatus || 'unpaid');
      setPaymentMethod(appointmentToEdit.paymentMethod || '');
      // Reset the flag when opening for edit
      setStatusChangedByUser(0);
      setPaymentStatusChangedByUser(0);
      // Set the modal step based on isPaymentFlow flag
      // Only skip to payment step if explicitly marked as payment flow (e.g., "Pay Now" click)
      // Otherwise, start at the first step: patient selection
      setModalStep(isPaymentFlow ? 'payment' : 'patient');
      setIsRescheduling(false);
    } else {
      // Reset form when creating new appointment
      // If a defaultPatientId was provided (e.g., user clicked Schedule on a patient), prefer it
      setSelectedPatient(defaultPatientId ? String(defaultPatientId) : '');
      setAppointmentType('');
      setCustomAppointmentTypeName('');
      setDuration('30');
      setDiscount('0');
      setCustomPrice('0');
      setNotes('');
      setSelectedDate(defaultDate ?? new Date());
      setSelectedTime(defaultTime ?? '');
      setSelectedDoctor(doctorName || (user?.role === 'doctor' ? user.username : ''));
      setAmountToPay('');
      setAppointmentStatus('scheduled');
      setPaymentStatus('unpaid');
      setPaymentMethod('');
      // Reset the flag when opening for new appointment
      setStatusChangedByUser(0);
      setPaymentStatusChangedByUser(0);
      setModalStep('patient');
    }
  }, [open, appointmentToEdit, defaultDate, defaultTime, defaultPatientId, doctorName, user?.role, user?.username]);

    // Use shared booking logic for next/prev step handling
    const { handleNextStep, handlePrevStep } = useSharedBookingLogic({
      modalStep,
      flow: 'multi-step',
      selectedPatient,
      selectedDate,
      selectedTime,
      appointmentType,
      customAppointmentTypeName,
      selectedDoctor,
      setModalStep: (step) => setModalStep(step as ImprovedBookingStep),
      setIsConfirmSummaryOpen,
      toast,
      durationConflict,
      patientConflict,
      skipDoctorStep: isDoctorSelectionLocked,
    });

  // Derived display values for schedule block
  const displayDoctor = formatDoctorName(appointmentToEdit?.doctor || selectedDoctor || doctorName);
  const showDoctorStep = !isDoctorSelectionLocked;
  const visibleBookingSteps: Array<{ id: ImprovedBookingStep; label: string; icon: string }> = [
    { id: 'patient', label: 'Patient', icon: '1' },
    { id: 'schedule', label: 'Schedule', icon: '2' },
    ...(showDoctorStep ? [{ id: 'doctor' as ImprovedBookingStep, label: 'Doctor', icon: '3' }] : []),
    { id: 'treatment', label: 'Treatment', icon: showDoctorStep ? '4' : '3' },
    { id: 'payment', label: 'Payment', icon: showDoctorStep ? '5' : '4' },
  ];
  const activeStepIndex = Math.max(0, visibleBookingSteps.findIndex((step) => step.id === modalStep));
  const progressWidth = visibleBookingSteps.length > 1
    ? `${(activeStepIndex / (visibleBookingSteps.length - 1)) * 100}%`
    : '0%';
  const selectedDoctorRecord = doctors.find((doctor) => normalizeDoctorName(doctor.name) === normalizeDoctorName(selectedDoctor));

  const hasDoctorScheduleConflict = (doctorNameToCheck: string) => {
    if (!selectedDate || !selectedTime || !doctorNameToCheck) return false;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(hours, minutes, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + (Number(duration) || 30) * 60000);
    const targetDoctor = normalizeDoctorName(doctorNameToCheck);

    return dailyAppointments.some((apt: any) => {
      if (normalizeDoctorName(apt.doctor) !== targetDoctor) return false;
      if ((apt.status || "").toLowerCase() === "pending") return false;

      const aptDate = typeof apt.date === 'string' && apt.date.includes('-') && !apt.date.includes(':')
        ? new Date(apt.date)
        : new Date(apt.date);
      const [aptHours, aptMinutes] = (apt.time || '00:00').split(':').map(Number);
      aptDate.setHours(aptHours, aptMinutes, 0, 0);
      const aptEnd = new Date(aptDate.getTime() + (Number(apt.duration) || 30) * 60000);

      return slotStart < aptEnd && slotEnd > aptDate;
    });
  };

  const canOpenStep = (stepId: ImprovedBookingStep) => {
    if (isBooking) return false;
    if (stepId === 'patient') return true;
    if (stepId === 'schedule') return !!selectedPatient;
    if (stepId === 'doctor') return showDoctorStep && !!selectedPatient && !!selectedDate && !!selectedTime;
    if (stepId === 'treatment') {
      return !!selectedPatient && !!selectedDate && !!selectedTime && (!showDoctorStep || !!selectedDoctor);
    }
    if (stepId === 'payment') {
      return !!selectedPatient && !!selectedDate && !!selectedTime && !!appointmentType && !!selectedDoctor;
    }
    return false;
  };

  const getNextButtonLabel = () => {
    if (modalStep === 'patient') return 'Next: Schedule';
    if (modalStep === 'schedule') return showDoctorStep ? 'Next: Doctor' : 'Next: Treatment';
    if (modalStep === 'doctor') return 'Next: Treatment';
    if (modalStep === 'treatment') return 'Next: Payment';
    return 'Confirm & Save';
  };
  
  // Calculate remaining balance for display in payment step
  const previouslyPaidAmount = appointmentToEdit?.totalPaid !== undefined 
    ? appointmentToEdit.totalPaid 
    : (appointmentToEdit?.price !== undefined && appointmentToEdit?.balance !== undefined)
      ? Math.max(0, appointmentToEdit.price - appointmentToEdit.balance)
      : 0;
  const discountedPrice = Math.max(0, finalPrice - Number(discount));
  const remainingBalance = Math.max(0, discountedPrice - previouslyPaidAmount);
  const bookingConflictWarnings = getBookingConflictWarnings({
    durationConflict,
    patientConflict,
    duration,
  });
  const bookingConflictTitle = bookingConflictWarnings.map(w => w.message).join('\n');

  // Handler for status changes that sets the flag
  const handleStatusChange = (newStatus: string) => {
    setAppointmentStatus(newStatus);
    setStatusChangedByUser(1);
  };

  const handlePaymentStatusChange = (newStatus: string) => {
    setPaymentStatus(newStatus as any);
    setPaymentStatusChangedByUser(1);
  };

  // First step: validate details and move to payment
  const handleConfirmBooking = async () => {
    // Progress to the next step in the multi-step flow
    setIsBooking(true);
    try {
      await handleNextStep();
    } catch (err) {
      console.error('Booking: details error', err);
    } finally {
      setIsBooking(false);
    }
  };

  // Second step: show summary confirmation before saving
  const handleConfirmPayment = async () => {
    // Use the shared next-step helper: if already at payment, this will open the summary
    await handleNextStep();
  };

  // Calculate what the final status will be for display in summary
  const getProjectedStatus = () => {
    const amountPaidRaw = amountToPay.trim() === '' ? '0' : amountToPay;
    const amountPaid = parseFloat(amountPaidRaw) || 0;
    
    // If user manually changed status, respect that choice
    if (statusChangedByUser === 1) {
      return appointmentStatus;
    }

    if (appointmentToEdit) {
      // Editing existing appointment - consider previously paid + new payment
      const newTotalPaid = amountPaid > 0 ? previouslyPaidAmount + amountPaid : previouslyPaidAmount;
      const newBalance = Math.max(0, finalPrice - newTotalPaid);

      // Auto-determine status based on payment balance
      if (newBalance <= 0) {
        // Fully paid
        return 'scheduled';
      } else if (newTotalPaid > 0) {
        // Partially paid
        return 'reserved';
      } else {
        // No payment yet - keep current status
        return appointmentStatus || 'pending';
      }
    } else {
      // Creating new appointment
      const balance = Math.max(0, finalPrice - amountPaid);

      if (balance <= 0) {
        // Fully paid
        return 'scheduled';
      } else if (amountPaid > 0) {
        // Partially paid
        return 'reserved';
      } else {
        // No payment
        return 'pending';
      }
    }
  };

  // Calculate what the final payment status will be for display in summary
  const getProjectedPaymentStatus = () => {
    // If payment method is "Pay at Clinic", return that status
    if (paymentMethod === "Pay at Clinic") {
      return 'pay-at-clinic';
    }

    const amountPaidRaw = amountToPay.trim() === '' ? '0' : amountToPay;
    const amountPaid = parseFloat(amountPaidRaw) || 0;
    
    if (paymentStatusChangedByUser === 1) {
      return paymentStatus;
    }

    const newTotalPaid = amountPaid > 0 ? previouslyPaidAmount + amountPaid : previouslyPaidAmount;
    const newBalance = Math.max(0, finalPrice - newTotalPaid);

    if (newBalance <= 0) {
      return 'paid';
    } else if (newTotalPaid > 0) {
      return 'half-paid';
    } else {
      return 'unpaid';
    }
  };

  // Calculate the FINAL appointment status
  const getFinalAppointmentStatus = () => {
    return getProjectedStatus();
  };

  // Final step: save after confirmation
  const handleConfirmSummary = async () => {
    if (!selectedPatient || !appointmentType) return;
    
    // Log the current state and history logs before submitting
    console.log('[BookingModal] 🚀 SUBMITTING APPOINTMENT:', {
      mode: appointmentToEdit ? 'EDIT' : 'CREATE',
      appointmentId: appointmentToEdit?.id,
      patientId: selectedPatient,
      type: appointmentType,
      date: formatDateToYYYYMMDD(selectedDate),
      time: selectedTime,
      price: finalPrice,
      payment: {
        amountToPay,
        method: paymentMethod,
        previouslyPaid: previouslyPaidAmount,
        remaining: remainingBalance
      },
      historyLogs: appointmentLogs,
      timestamp: new Date().toISOString()
    });

    setIsBooking(true);
    setIsConfirmSummaryOpen(false);
    try {
      const dateStr = formatDateToYYYYMMDD(selectedDate);
      
      // Handle "Pay at Clinic" - set amount to pay as 0
      let amountPaidRaw = amountToPay.trim() === '' ? '0' : amountToPay;
      if (paymentMethod === "Pay at Clinic") {
        amountPaidRaw = '0';
      }
      const amountPaid = parseFloat(amountPaidRaw) || 0;

      console.log('[BookingModal Payment] Payment confirmation:', {
        amountToPay,
        amountPaidRaw,
        amountPaid,
        paymentMethod,
        finalPrice,
        parsing: {
          trimmed: amountToPay.trim(),
          parseFloat: parseFloat(amountPaidRaw),
        }
      });

      if (appointmentToEdit) {
        // update existing appointment
        // If editing, ADD the new payment to existing totalPaid (only if amountPaid > 0)
        const previouslyPaid = appointmentToEdit.totalPaid || 0;
        const newTotalPaid = amountPaid > 0 ? previouslyPaid + amountPaid : previouslyPaid;
        const newBalance = Math.max(0, finalPrice - newTotalPaid);

        console.log('[BookingModal Payment] Updating appointment:', {
          appointmentId: appointmentToEdit.id,
          previouslyPaid,
          newPayment: amountPaid,
          newTotalPaid,
          newBalance,
        });

        // Determine payment status
        const updatePaymentStatus = getProjectedPaymentStatus();
        
        // Determine appointment status using the new function that includes override logic
        const updateAppointmentStatus = getFinalAppointmentStatus();

        const updated = await updateAppointment(appointmentToEdit.id, {
          patientId: selectedPatient,
          patientName: patients.find(p => p.id === selectedPatient)?.name || selectedPatient,
          doctor: appointmentToEdit.doctor || doctorName || '',
          date: dateStr,
          time: selectedTime,
          type: getAppointmentTypeIndex(appointmentType),
          customType: appointmentType === "Other" ? customAppointmentTypeName : undefined,
          duration: Number(duration) || 30,
          price: finalPrice,
          discount: Number(discount) || 0,
          notes,
          status: updateAppointmentStatus as any,
          paymentStatus: updatePaymentStatus as any,
          totalPaid: newTotalPaid,
          balance: newBalance,
        });

        // Log the updated appointment details
        console.log('[BookingModal Payment] ✅ APPOINTMENT UPDATED SUCCESSFULLY:', {
          appointmentId: updated?.id,
          patientName: updated?.patientName,
          service: updated?.customType,
          scheduleDate: updated?.date,
          scheduleTime: updated?.time,
          totalPrice: updated?.price,
          paymentDetails: {
            previouslyPaid,
            newPayment: amountPaid,
            totalPaid: updated?.totalPaid,
            balance: updated?.balance,
            paymentStatus: updated?.paymentStatus,
          },
          appointmentStatus: updated?.status,
          timestamp: new Date().toISOString(),
        });

        if (amountPaid > 0) {
          toast.success(`Payment of ₱${amountPaid.toLocaleString()} recorded successfully!`);
        } else if (paymentMethod === "Pay at Clinic") {
          toast.success(`Appointment set to pay at clinic!`);
        } else {
          toast.success(`Appointment updated successfully!`);
        }
        try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: updated } })); } catch {}
        if (onBooked) onBooked(updated);
        // close modal after updating
        onOpenChange(false);
      } else {
        // create new appointment
        // Determine payment status
        const paymentStatus = getProjectedPaymentStatus();
        
        // Determine appointment status using the new function that includes override logic
        const autoStatus = getFinalAppointmentStatus();

        console.log('[BookingModal Payment] Calculated status:', { paymentStatus, autoStatus, amountPaid, finalPrice });

        const newBalance = Math.max(0, finalPrice - amountPaid);

        console.log('[BookingModal Payment] Creating new appointment:', {
          selectedPatient,
          appointmentType,
          amountPaid,
          finalPrice,
          newBalance,
          autoStatus,
          paymentStatus,
          paymentMethod,
        });

        const selectedPatientRecord = patients.find(p => String(p.id) === String(selectedPatient));
        const newApt = isPublicBookingMode
          ? await createPublicBookingAppointment({
              patient: selectedPatientRecord || { id: selectedPatient, name: selectedPatient },
              date: dateStr,
              time: selectedTime,
              duration: Number(duration) || 30,
              type: getAppointmentTypeIndex(appointmentType),
              customType: appointmentType === "Other" ? customAppointmentTypeName : undefined,
              doctor: selectedDoctor || '',
              notes,
            })
          : await addAppointment({
              patientId: selectedPatient,
              patientName: selectedPatientRecord?.name || selectedPatient,
              doctor: selectedDoctor || '',
              date: dateStr,
              time: selectedTime,
              type: getAppointmentTypeIndex(appointmentType),
              customType: appointmentType === "Other" ? customAppointmentTypeName : undefined,
              duration: Number(duration) || 30,
              price: finalPrice,
              discount: Number(discount) || 0,
              notes,
              status: autoStatus as any,
              paymentStatus: paymentStatus as any,
              totalPaid: amountPaid,
              balance: newBalance,
            });

        // Auto-cancel any overlapping pending appointments for the same doctor
        if (newApt && dailyAppointments.length > 0) {
          const timeToMinutes = (time: string): number => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
          };

          const newSlotStart = timeToMinutes(selectedTime);
          const newSlotEnd = newSlotStart + (Number(duration) || 30);

          const pendingToCancel = dailyAppointments.filter((apt: any) => {
            // Only cancel pending appointments
            if (apt.status !== 'pending') return false;
            // For the same doctor - use selectedDoctor (the actually selected doctor), not the prop
            const currentDocNormalized = (selectedDoctor || '').replace(/^Dr\.\s+/i, "").toLowerCase();
            const aptDocNormalized = apt.doctor.replace(/^Dr\.\s+/i, "").toLowerCase();
            if (aptDocNormalized !== currentDocNormalized) return false;
            // On the same date
            if (apt.date !== dateStr) return false;
            // That overlap with the new appointment
            const aptStart = timeToMinutes(apt.time);
            const aptEnd = aptStart + (apt.duration || 30);
            return newSlotStart < aptEnd && newSlotEnd > aptStart;
          });

          // Cancel all overlapping pending appointments
          for (const pendingApt of pendingToCancel) {
            await updateAppointment(pendingApt.id, {
              ...pendingApt,
              status: 'cancelled',
            });
            console.log('[BookingModal] 🔄 Auto-cancelled overlapping pending appointment:', {
              pendingId: pendingApt.id,
              pendingPatient: pendingApt.patientName,
              newAppointmentId: newApt.id,
              reason: 'Overlapping time slot',
            });
          }
        }

        // Log the new appointment details
        console.log('[BookingModal Payment] ✅ APPOINTMENT CREATED SUCCESSFULLY:', {
          appointmentId: newApt?.id,
          patientName: newApt?.patientName,
          service: newApt?.customType,
          scheduleDate: newApt?.date,
          scheduleTime: newApt?.time,
          totalPrice: newApt?.price,
          paymentDetails: {
            amountPaid: newApt?.totalPaid,
            balance: newApt?.balance,
            paymentStatus: newApt?.paymentStatus,
          },
          appointmentStatus: newApt?.status,
          timestamp: new Date().toISOString(),
        });

        if (paymentMethod === "Pay at Clinic") {
          toast.success(`Appointment created (Pay at Clinic)!`);
        } else if (amountPaid > 0) {
          toast.success(`Appointment booked with payment of ₱${amountPaid.toLocaleString()}!`);
        } else {
          toast.success(`Appointment booked successfully!`);
        }
        try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: newApt } })); } catch {}
        if (onBooked) onBooked(newApt);
        // close modal after creating
        onOpenChange(false);
      }

      setModalStep('patient');
      setAmountToPay('');
    } catch (err) {
      console.error('Booking payment error:', err);
    } finally {
      setIsBooking(false);
    }
  };

  // Cancel handler (previously named handleDelete) — preserve behavior but use clearer name
  const handleCancel = async () => {
    if (!appointmentToEdit) return;
    setIsBooking(true);
    try {
      // Update status to cancelled instead of deleting
      const updated = await updateAppointment(appointmentToEdit.id, {
        ...appointmentToEdit,
        status: 'cancelled',
      });
      try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: updated, appointmentId: appointmentToEdit.id, newStatus: 'cancelled' } })); } catch {}
      if (onBooked) onBooked(updated);
        if (onDeleted) onDeleted(updated);
      toast?.success?.('Appointment marked as cancelled');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      toast?.error?.('Failed to cancel appointment');
    } finally {
      setIsBooking(false);
    }
  };

  const handleClose = () => {
    setModalStep("patient");
    setIsRescheduling(false);
    setAmountToPay("");
    setCustomAppointmentTypeName("");
    setCustomPrice("0");
    onOpenChange(false);
  };

return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-white border-b sticky top-0 z-20">
            <div className="flex items-center justify-between mb-4">
              {modalStep !== 'patient' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevStep}
                  disabled={isBooking}
                  className="rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </Button>
              ) : (
                <div className="w-10" />
              )}

              <DialogTitle className="text-2xl font-bold text-gray-900 flex-1 text-center">
                {title ? title : (
                  modalStep === 'payment' ? 'Payment Summary' : 
                  appointmentToEdit ? (isPatientReadonly ? 'View Appointment' : 'Edit Appointment') : 'Appointment Details'
                )}
              </DialogTitle>
              <div className="w-10" />
            </div>

            {/* STEP INDICATOR */}
            {!(isCancelled && user?.role === 'patient') && (
              <div className="relative flex items-center justify-between w-full mt-2 mb-4 px-10">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-500 z-0"
                  style={{ width: progressWidth }}
                />

                {visibleBookingSteps.map((step, index) => {
                  const isActive = modalStep === step.id;
                  const isCompleted = index < activeStepIndex;
                  const isClickable = canOpenStep(step.id);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => isClickable && setModalStep(step.id)}
                      disabled={!isClickable}
                      className={`relative z-10 flex flex-col items-center group outline-none transition-all ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300
                        ${isActive ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-md' :
                          isCompleted ? 'bg-blue-600 border-blue-600 text-white' :
                            'bg-white border-gray-200 text-gray-400'}
                      `}>
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-xs font-bold">{step.icon}</span>
                        )}
                      </div>
                      <span className={`absolute -bottom-6 text-[9px] font-black uppercase tracking-tighter ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </DialogHeader>

          <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)] bg-gray-50/30">
            <div className="max-w-3xl mx-auto">
              
              {/* STEP 1: PATIENT */}
              {modalStep === 'patient' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-100">
                      <Stethoscope className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">Select Patient</h3>
                      <p className="text-sm font-bold text-gray-500">Who is this appointment for?</p>
                    </div>
                    {canCreatePatients && !isPatientReadonly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openAddPatientModal({ publicBooking: isPublicBookingMode })}
                        className="ml-auto h-11 px-4 gap-2 rounded-2xl text-xs font-bold border-2 hover:bg-gray-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New patient
                      </Button>
                    )}
                  </div>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger className="h-16 rounded-[2rem] border-2 border-gray-100 bg-white px-6 text-base font-bold">
                      <SelectValue placeholder="Choose a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* STEP 2: SCHEDULE */}
              {modalStep === 'schedule' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-100">
                      <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">Pick Schedule</h3>
                      <p className="text-sm font-bold text-gray-500">Select your preferred date and time</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                      onClick={() => setIsDatePickerOpen(true)} 
                      className="flex flex-col gap-6 p-8 bg-white rounded-[2.5rem] border-2 border-gray-100 hover:border-blue-500 transition-all text-left shadow-sm hover:shadow-xl hover:shadow-blue-50 group"
                    >
                      <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors w-fit">
                        <CalendarIcon className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Appointment Date</p>
                        <p className="text-3xl font-black text-gray-900">{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-sm font-bold text-gray-400 mt-1">{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => setIsTimePickerOpen(true)} 
                      className="flex flex-col gap-6 p-8 bg-white rounded-[2.5rem] border-2 border-gray-100 hover:border-blue-500 transition-all text-left shadow-sm hover:shadow-xl hover:shadow-blue-50 group"
                    >
                      <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors w-fit">
                        <Clock className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Time Slot</p>
                        <p className="text-3xl font-black text-gray-900">{selectedTime ? formatTimeTo12h(selectedTime) : '--:--'}</p>
                        <p className="text-sm font-bold text-gray-400 mt-1">{selectedTime ? 'Confirmed Slot' : 'Please select'}</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DOCTOR */}
              {modalStep === 'doctor' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-100">
                      <Award className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900">Choose Doctor</h3>
                      <p className="text-sm font-bold text-gray-500">Select your dental specialist</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="rounded-2xl bg-blue-50 px-4 py-2 text-[10px] font-black uppercase text-blue-700">
                        {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} @ {selectedTime ? formatTimeTo12h(selectedTime) : '--:--'}
                      </div>
                    </div>
                  </div>

                  {doctors.length === 0 ? (
                    <div className="rounded-[2.5rem] border-2 border-dashed border-gray-200 bg-white p-12 text-center">
                      <Stethoscope className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <p className="text-lg font-bold text-gray-900">No doctors available</p>
                      <p className="mt-2 text-sm text-gray-500">Please try again in a moment.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {doctors.map((doctor) => {
                        const selected = normalizeDoctorName(selectedDoctor) === normalizeDoctorName(doctor.name);
                        const unavailable = hasDoctorScheduleConflict(doctor.name);

                        return (
                          <button
                            key={doctor.id}
                            type="button"
                            onClick={() => !unavailable && setSelectedDoctor(doctor.name)}
                            disabled={unavailable}
                            className={`group flex min-h-[180px] flex-col justify-between rounded-[2.5rem] border-2 bg-white p-6 text-left shadow-sm transition-all ${
                              selected
                                ? 'border-blue-600 bg-blue-50/60 shadow-lg shadow-blue-100'
                                : unavailable
                                ? 'cursor-not-allowed border-gray-100 opacity-55'
                                : 'border-gray-100 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-50'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <Avatar className={`h-20 w-20 border-4 transition-transform group-hover:scale-105 ${selected ? 'border-blue-200' : 'border-gray-50'} shadow-sm`}>
                                <AvatarImage src={doctor.profilePicture} alt={doctor.name} className="object-cover" />
                                <AvatarFallback className="bg-blue-100 text-lg font-black text-blue-700">
                                  {getDoctorInitials(doctor.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-base font-black leading-tight text-gray-900">{formatDoctorName(doctor.name)}</h4>
                                    <p className="mt-1 text-[10px] font-black uppercase text-blue-600/70">{doctor.role || 'Dentist'}</p>
                                  </div>
                                  <span className={`mt-0.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-tighter ${
                                    unavailable
                                      ? 'bg-gray-100 text-gray-500'
                                      : selected
                                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {unavailable ? 'Busy' : selected ? 'Selected' : 'Open'}
                                  </span>
                                </div>
                                {doctor.specialization && (
                                  <p className="mt-3 inline-flex rounded-full bg-gray-50 px-3 py-1 text-[9px] font-black uppercase tracking-tight text-gray-500">
                                    {doctor.specialization}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="mt-4 line-clamp-2 text-xs font-bold leading-relaxed text-gray-400 group-hover:text-gray-500 transition-colors">
                              {doctor.bio || 'Gentle, detail-focused care for comfortable dental visits.'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: CHOOSE TREATMENT & FINANCIALS */}
              {modalStep === 'treatment' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                  {/* Treatment Selection */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-100">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">Select Treatment</h3>
                        <p className="text-sm font-bold text-gray-500">What service do you need today?</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { name: "Routine Cleaning", short: "Cleaning", icon: "✨", color: "bg-blue-500" },
                        { name: "Checkup", short: "Checkup", icon: "🔍", color: "bg-emerald-500" },
                        { name: "Filling", short: "Filling", icon: "🦷", color: "bg-amber-500" },
                        { name: "Root Canal", short: "Root Canal", icon: "🔬", color: "bg-rose-500" },
                        { name: "Extraction", short: "Extraction", icon: "🦷", color: "bg-slate-700" },
                        { name: "Whitening", short: "Whitening", icon: "💎", color: "bg-cyan-400" },
                        { name: "Other", short: "Other", icon: "➕", color: "bg-gray-400" }
                      ].map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setAppointmentType(t.name)}
                          className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-4 shadow-sm ${appointmentType === t.name ? 'border-blue-600 bg-blue-50/50 shadow-blue-100 scale-105' : 'border-white bg-white hover:border-gray-200 hover:-translate-y-1'}`}
                        >
                          <div className={`w-14 h-14 rounded-full ${t.color} flex items-center justify-center text-white text-2xl shadow-lg shadow-gray-100`}>{t.icon}</div>
                          <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">{t.short}</span>
                        </button>
                      ))}
                    </div>
                    {appointmentType === "Other" && (
                      <Input placeholder="Type custom treatment..." value={customAppointmentTypeName} onChange={(e) => setCustomAppointmentTypeName(e.target.value)} className="h-14 rounded-2xl border-gray-100 bg-white font-bold px-6 shadow-inner" />
                    )}
                  </div>

                  {/* Financials & Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-4">
                      {/* Duration Pill */}
                      <div className="bg-white p-4 pr-6 rounded-[2.5rem] border-2 border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Clock className="h-6 w-6" /></div>
                          <span className="text-sm font-black text-gray-800 uppercase tracking-widest">Duration</span>
                        </div>
                        {canManagePricing ? (
                          <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger className="w-32 rounded-xl font-bold bg-gray-50 border-none h-10 focus:ring-0 focus:ring-offset-0 px-4">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">{[15, 30, 45, 60, 75, 90, 105, 120].map(d => <SelectItem key={d} value={String(d)}>{d} mins</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center justify-center px-6 h-10 rounded-xl font-black bg-gray-50 text-blue-600 text-sm">
                            {duration} mins
                          </div>
                        )}
                      </div>

                      {/* Discount Pill */}
                      {canManagePricing && (
                        <div className="bg-white p-4 pr-6 rounded-[2.5rem] border-2 border-gray-100 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600"><Award className="h-6 w-6" /></div>
                            <span className="text-sm font-black text-gray-800 uppercase tracking-widest">Discount</span>
                          </div>
                          <div className="flex items-center gap-1 bg-gray-50 px-4 rounded-xl h-10">
                            <span className="text-xs font-black text-orange-400">₱</span>
                            <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-16 border-none bg-transparent font-black text-right p-0 focus:ring-0 text-orange-600" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 pt-2">
                         <div className="flex items-center gap-3">
                           <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Clock className="h-5 w-5" /></div>
                           <h4 className="font-bold text-gray-900">Notes</h4>
                         </div>
                         <Textarea
                           placeholder="Any special instructions..."
                           value={notes}
                           onChange={(e) => setNotes(e.target.value)}
                           className="min-h-[120px] rounded-[2rem] border-2 border-gray-100 bg-white p-6 font-medium focus:border-blue-500 transition-all"
                         />
                      </div>
                    </div>

                    {/* Blue Estimated Cost Card */}
                    <div 
                      onClick={(e) => {
                        if (isPriceEditable && e.target === e.currentTarget) setIsPriceEditable(false);
                      }}
                      className="bg-blue-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-200/50 flex flex-col justify-between relative overflow-hidden cursor-default group"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                      <CreditCard className="absolute top-8 right-8 h-12 w-12 text-white/10" />
                      
                      <div className="relative z-10">
                        <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-2">Estimated Cost</p>
                        <div className="flex items-center gap-2">
                          <h4 className="text-2xl font-black">Treatment Fee</h4>
                          {/* ONLY SHOW EDIT PENCIL TO ADMINS/DOCTORS */}
                          {canManagePricing && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsPriceEditable(!isPriceEditable);
                              }} 
                              className={`p-2 rounded-xl transition-colors ${isPriceEditable ? 'bg-white/20' : 'hover:bg-white/10'}`}
                            >
                              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="relative z-10 mt-12 flex flex-col items-end">
                        {/* Upper small text logic */}
                        {isPriceEditable ? (
                          <p className="text-sm text-blue-100 font-bold opacity-90 mb-2 bg-white/10 px-3 py-1 rounded-full">
                            Reflected Total: ₱{Math.max(0, (Number(customPrice === "0" ? finalPrice : customPrice) - Number(discount))).toLocaleString()}
                          </p>
                        ) : (
                          Number(discount) > 0 && <p className="text-sm text-blue-200 line-through opacity-80 mb-1">₱{finalPrice.toLocaleString()}</p>
                        )}
                        
                        <div className="flex items-center justify-end w-full">
                          <span className="text-5xl font-black mr-2 opacity-40">₱</span>
                          {/* AIRTIGHT LOCK: MUST BE EDITABLE *AND* USER MUST BE ADMIN/DOCTOR */}
                          {isPriceEditable && canManagePricing ? (
                            <input 
                              type="number"
                              value={customPrice === "0" ? finalPrice : customPrice}
                              onChange={(e) => setCustomPrice(e.target.value)}
                              onBlur={() => setIsPriceEditable(false)}
                              className="text-5xl font-black bg-transparent border-b-4 border-white/50 p-0 w-[180px] text-right outline-none ring-0 focus:border-white text-white appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder-blue-300 transition-all"
                              placeholder={String(finalPrice)}
                              autoFocus
                            />
                          ) : (
                            <span className="text-6xl font-black tracking-tighter">
                              {Math.max(0, (Number(customPrice === "0" ? finalPrice : customPrice) - Number(discount))).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FINAL STEP: PAYMENT SUMMARY */}
              {modalStep === 'payment' && (
                <div className="space-y-6 max-w-4xl mx-auto py-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-emerald-600 p-3.5 rounded-2xl text-white shadow-lg shadow-emerald-100">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">Booking Summary</h3>
                      <p className="text-sm font-bold text-gray-500">Review and confirm your appointment</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Summary Receipt */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Stethoscope className="h-5 w-5" /></div>
                        <h3 className="text-lg font-bold text-gray-900">Appointment Info</h3>
                      </div>

                      <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                        <div className="bg-gray-50 p-8 border-b border-gray-100">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Patient</span>
                          <h4 className="text-2xl font-black text-gray-900">{patients.find(p => p.id === selectedPatient)?.name}</h4>
                        </div>
                        <div className="p-8 space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">Date & Time</p>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-800">{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTimeTo12h(selectedTime)}</p>
                                {bookingConflictWarnings.length > 0 && (
                                  <span title={bookingConflictTitle} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">Doctor</p>
                              <p className="font-bold text-gray-800">{formatDoctorName(selectedDoctor)}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-3xl bg-gray-50 px-6 py-4">
                            <span className="text-gray-500 font-bold">Duration</span>
                            <span className="inline-flex items-center gap-2 font-black text-gray-800">
                              {duration} mins
                              {durationConflict && (
                                <span title={bookingConflictWarnings.find(w => w.type === 'duration')?.message || durationConflict} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </span>
                          </div>
                          {bookingConflictWarnings.length > 0 && (
                            <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                              This appointment has a scheduling conflict. Hover the warning icon for details.
                            </div>
                          )}
                          
                          <div className="pt-6 border-t-2 border-dashed border-gray-100 space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 font-bold">Service Price</span>
                              <span className="font-black text-gray-900">₱{finalPrice.toLocaleString()}</span>
                            </div>
                            {Number(discount) > 0 && (
                              <div className="flex justify-between text-sm text-orange-600">
                                <span className="font-bold">Discount</span>
                                <span className="font-black">-₱{Number(discount).toLocaleString()}</span>
                              </div>
                            )}
                            
                            {/* SMART SUMMARY: Toggles depending on Edit Mode */}
                            {isEditMode ? (
                              <>
                                <div className="flex justify-between text-sm text-gray-600">
                                  <span className="font-bold">Total Price</span>
                                  <span className="font-black">₱{(finalPrice - Number(discount)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-emerald-600">
                                  <span className="font-bold">Already Paid</span>
                                  <span className="font-black">-₱{previouslyPaidAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t-2 border-gray-50">
                                  <span className="text-base font-black text-gray-900">Balance Left</span>
                                  <span className={`text-3xl font-black ${remainingBalance <= 0 ? 'text-emerald-500' : 'text-blue-600'}`}>
                                    ₱{remainingBalance.toLocaleString()}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between items-center pt-4 border-t-2 border-gray-50">
                                <span className="text-base font-black text-gray-900">Total Price</span>
                                <span className="text-4xl font-black text-blue-600 tracking-tighter">₱{(finalPrice - Number(discount)).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Actions */}
                    <div className="space-y-8 pt-10">
                      <div className="space-y-4">
                        <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Amount to Pay Now</Label>
                        <div className="relative group">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300 transition-colors group-focus-within:text-blue-600">₱</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={amountToPay}
                            onChange={(e: any) => setAmountToPay(e.target.value)}
                            className="h-20 pl-14 text-3xl font-black rounded-[2rem] border-2 border-gray-100 bg-white shadow-sm focus:border-blue-600 transition-all appearance-none"
                            disabled={paymentMethod === "Pay at Clinic"}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: "GCash", label: "GCash", sub: "Digital Payment", icon: "GC", color: "bg-blue-600" },
                            { id: "Card", label: "Credit Card", sub: "Secure Processing", icon: <CreditCard className="w-6 h-6"/>, color: "bg-indigo-600" },
                            { id: "Pay at Clinic", label: "Pay at Clinic", sub: "Cash on arrival", icon: <Banknote className="w-6 h-6"/>, color: "bg-emerald-600" }
                          ].map((pm) => (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => { setPaymentMethod(pm.id); if (pm.id === "Pay at Clinic") setAmountToPay("0"); }}
                              className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all group ${paymentMethod === pm.id ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100 scale-[1.02]' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                            >
                              <div className="flex items-center gap-5 text-left">
                                <div className={`w-14 h-14 rounded-2xl ${pm.color} flex items-center justify-center text-white font-black italic shadow-lg shadow-gray-200 transition-transform group-hover:scale-105`}>{pm.icon}</div>
                                <div>
                                  <p className="font-black text-gray-900 uppercase tracking-tight">{pm.label}</p>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{pm.sub}</p>
                                </div>
                              </div>
                              {paymentMethod === pm.id && <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md shadow-blue-200 animate-in zoom-in-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg></div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

           <DialogFooter className="p-6 bg-white border-t flex items-center justify-end">
             <Button
               onClick={modalStep === 'payment' ? handleConfirmPayment : handleConfirmBooking}
               disabled={isBooking}
               className="h-14 px-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 min-w-[220px]"
              >
                {isBooking ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <div className="flex items-center gap-3">
                    <span>
                      {getNextButtonLabel()}
                    </span>
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </div>
                )}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><CalendarIcon className="h-10 w-10" /></div>
          <div className="text-center space-y-2 mb-8">
            <h3 className="text-xl font-black">Cancel Appointment?</h3>
            <p className="text-sm text-gray-500">This releases the time slot. This action is permanent.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="h-14 rounded-2xl font-bold">No, Keep it</Button>
            <Button variant="destructive" onClick={handleCancel} className="h-14 rounded-2xl font-black">Yes, Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary confirmation dialog */}
      <Dialog open={isConfirmSummaryOpen} onOpenChange={setIsConfirmSummaryOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
          <DialogHeader className="p-8 bg-gray-50 border-b">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-gray-900">Confirm Appointment</DialogTitle>
                <p className="text-sm font-bold text-gray-500">Please review all details before saving</p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Patient</p>
                  <p className="text-base font-black text-gray-900">{patients.find(p => p.id === selectedPatient)?.name || selectedPatient}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Service</p>
                  <p className="text-base font-black text-gray-900">{appointmentType === "Other" ? customAppointmentTypeName : appointmentType}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Schedule</p>
                  <p className="text-base font-black text-gray-900">
                    {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {selectedTime ? formatTimeTo12h(selectedTime) : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Doctor</p>
                  <p className="text-base font-black text-gray-900">{displayDoctor}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-black text-gray-900">{duration} mins</p>
                    {durationConflict && (
                      <span title={bookingConflictWarnings.find(w => w.type === 'duration')?.message || durationConflict} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${
                    appointmentStatuses.find(s => s.value === getFinalAppointmentStatus())?.bgColor || 'bg-gray-100'
                  } ${
                    appointmentStatuses.find(s => s.value === getFinalAppointmentStatus())?.textColor || 'text-gray-700'
                  }`}>
                    {getStatusLabel(getFinalAppointmentStatus(), appointmentStatuses)}
                  </span>
                </div>
              </div>
            </div>

            {bookingConflictWarnings.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 text-xs font-bold text-amber-800 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <p>This appointment has a scheduling conflict. Hover the warning icon for details.</p>
              </div>
            )}

            <div className="pt-6 border-t-2 border-dashed border-gray-100">
              <div className="bg-gray-50 rounded-3xl p-6 space-y-3">
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>Total Price</span>
                  <span>₱{finalPrice.toLocaleString()}</span>
                </div>
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-sm font-bold text-orange-600">
                    <span>Discount</span>
                    <span>-₱{Number(discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-lg font-black text-gray-900">Final Price</span>
                  <span className="text-2xl font-black text-blue-600">₱{(finalPrice - Number(discount)).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
              {previouslyPaidAmount > 0 && (
                <p className="text-emerald-600">Already Paid: ₱{previouslyPaidAmount.toLocaleString()}</p>
              )}
              <p className="text-blue-700">Paying Now: ₱{(parseFloat(amountToPay) || 0).toLocaleString()}</p>
              <p>Remaining: ₱{Math.max(0, (finalPrice - Number(discount)) - previouslyPaidAmount - (parseFloat(amountToPay) || 0)).toLocaleString()}</p>
            </div>
          </div>

          <DialogFooter className="p-8 bg-white border-t flex gap-4">
            <Button variant="outline" onClick={() => setIsConfirmSummaryOpen(false)} disabled={isBooking} className="h-14 flex-1 rounded-2xl font-bold border-2">
              Back to Edit
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white h-14 flex-1 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-100" onClick={handleConfirmSummary} disabled={isBooking}>
              {isBooking ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DatePickerModal open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen} selectedDate={selectedDate} onDateSelect={setSelectedDate} doctorName={selectedDoctor} selectedTime={selectedTime} duration={duration} />
      <TimePickerModal open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen} selectedDate={selectedDate} selectedTime={selectedTime} doctorName={selectedDoctor} duration={duration} onTimeSelect={setSelectedTime} onDateChange={setSelectedDate} excludeAppointmentId={appointmentToEdit?.id} patientId={selectedPatient} />
    </>
  );
 }
