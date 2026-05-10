import React, { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompactNotesField } from "@/components/CompactNotesField";
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
import useSharedBookingLogic, {
  PAST_APPOINTMENT_STATUS_VALUES,
  getBookingActor,
  getBookingConflictWarnings,
  getDefaultPastAppointmentDate,
  getProjectedBookingStatus,
  getProjectedPaymentStatus,
} from './sharedBookingLogic';
import AppointmentHistoryView from "./AppointmentHistoryView";
import { DatePickerModal } from "./DatePickerModal";
import { TimePickerModal } from "./TimePickerModal";
import { useDoctors } from "@/hooks/useDoctors";
import { cachePublicBookingPatient, createPublicBookingAppointment, getCachedPublicBookingPatients } from "@/lib/publicBookingCache";
import type { BookingCreationMode, BookingMode } from "./sharedBookingLogic";

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

const defaultAppointmentStatusOptions: AppointmentStatusOption[] = [
  { key: 1, value: "scheduled", label: "Scheduled", description: "Confirmed and scheduled", bgColor: "bg-emerald-100", textColor: "text-emerald-700" },
  { key: 2, value: "pending", label: "Pending", description: "Awaiting confirmation", bgColor: "bg-purple-100", textColor: "text-purple-700" },
  { key: 3, value: "reserved", label: "Reserved", description: "Tentatively reserved", bgColor: "bg-amber-100", textColor: "text-amber-700" },
  { key: 4, value: "cancelled", label: "Cancelled", description: "Appointment cancelled", bgColor: "bg-red-100", textColor: "text-red-700" },
  { key: 5, value: "completed", label: "Completed", description: "Appointment completed", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  { key: 6, value: "tbd", label: "TBD", description: "Past appointment awaiting completion status", bgColor: "bg-red-100", textColor: "text-red-700" },
];

// Helper function to format doctor name consistently
const formatDoctorName = (name?: string): string => {
  if (!name || name === '—') return "—";
  const cleanName = name.replace(/^Dr\.\s+/i, "");
  return `Dr. ${cleanName}`;
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
  appointmentToEdit?: any; // optional appointment object to edit
  title?: string; // optional override for dialog title
  bookingMode?: BookingMode;
  appointmentCreationMode?: BookingCreationMode;
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

export default function BookingModal({ open, onOpenChange, defaultDate, defaultTime, doctorName, defaultPatientId, onBooked, appointmentToEdit, title, bookingMode = "standard", appointmentCreationMode = "standard" }: BookingModalProps) {
  const { user } = useAuth();
  const { doctors } = useDoctors(undefined, { publicBooking: bookingMode === "public" && !user?.role });
  const { addAppointment, updateAppointment, isPaymentFlow, openAddPatientModal, lastAddedPatient, lastAddedPatientAt } = useAppointmentModal();
  const { statuses: appointmentStatuses } = useAppointmentStatuses();
  const { statuses: paymentStatuses } = usePaymentStatuses();

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

  // New states for two-step flow
  const [modalStep, setModalStep] = useState<"details" | "payment">("details");
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

  // If a default patient id is provided (e.g., from PatientsView schedule button), preselect it
  useEffect(() => {
    if (appointmentToEdit) return;
    if (defaultPatientId) {
      setSelectedPatient(String(defaultPatientId));
      return;
    }
    // fallback to first patient when patients load
    if (!selectedPatient && patients && patients.length > 0) {
      setSelectedPatient(patients[0].id);
    }
  }, [appointmentToEdit, defaultPatientId, patients, selectedPatient]);

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
  const isPastAppointmentMode = appointmentCreationMode === "past" && !appointmentToEdit;
  const {
    isPublicBookingMode,
    isPatientLevelBookingMode,
    canCreatePatients,
    canManagePricing,
    canManageStatuses,
    isDoctorSelectionLocked,
  } = getBookingActor({
    userRole: user?.role,
    bookingMode,
  });
  const canEditAppointmentStatus = canManageStatuses && !isPatientReadonly;
  const defaultAppointmentStatusValue = isPastAppointmentMode ? "tbd" : "scheduled";
  const currentAppointmentStatusValue = appointmentStatus || appointmentToEdit?.status || defaultAppointmentStatusValue;
  const baseAppointmentStatusOptions = appointmentStatuses.length > 0 ? appointmentStatuses : defaultAppointmentStatusOptions;
  const selectableAppointmentStatusOptions = canManageStatuses
    ? baseAppointmentStatusOptions.filter((status) =>
        isPastAppointmentMode
          ? PAST_APPOINTMENT_STATUS_VALUES.includes(status.value as typeof PAST_APPOINTMENT_STATUS_VALUES[number])
          : status.value !== "pending"
      )
    : baseAppointmentStatusOptions;
  const appointmentStatusOptions: AppointmentStatusOption[] =
    currentAppointmentStatusValue &&
    !(canManageStatuses && currentAppointmentStatusValue === "pending") &&
    !(isPastAppointmentMode && !PAST_APPOINTMENT_STATUS_VALUES.includes(currentAppointmentStatusValue as typeof PAST_APPOINTMENT_STATUS_VALUES[number])) &&
    !selectableAppointmentStatusOptions.some((status) => status.value === currentAppointmentStatusValue)
      ? [
          {
            key: 0,
            value: currentAppointmentStatusValue,
            label: getStatusLabel(currentAppointmentStatusValue, []),
            description: "Current appointment status",
            bgColor: "bg-gray-100",
            textColor: "text-gray-700",
          },
          ...selectableAppointmentStatusOptions,
        ]
      : selectableAppointmentStatusOptions;
  const getAppointmentStatusOption = (statusValue: string) =>
    appointmentStatusOptions.find((status) => status.value === statusValue);

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

  // When a patient is (pre)selected, ensure the selected date/time is the next available
  // slot for that patient (avoid patient conflicts). This will auto-advance the
  // selected schedule to the nearest non-conflicting slot if the current selection
  // overlaps with an existing appointment for that patient.
  useEffect(() => {
    if (!open || !selectedPatient) return;

    const durationMins = parseInt(duration, 10) || 30;

    // Helper: convert an appointment record to start/end Date objects
    const toRange = (apt: any) => {
      let aptStart: Date;
      if (typeof apt.date === 'string' && apt.date.includes('-') && !apt.date.includes(':')) {
        const [aptHours, aptMinutes] = (apt.time || '00:00').split(':').map(Number);
        aptStart = new Date(apt.date);
        aptStart.setHours(aptHours, aptMinutes, 0, 0);
      } else {
        aptStart = new Date(apt.date);
      }
      const aptEnd = new Date(aptStart.getTime() + (parseInt(String(apt.duration), 10) || 30) * 60000);
      return { start: aptStart, end: aptEnd, doctor: apt.doctor, patientId: apt.patientId };
    };

    // Returns true if candidate slot overlaps any appointment in the list
    const overlapsAny = (candidateStart: Date, candidateEnd: Date, list: any[]) => {
      for (const a of list) {
        const r = toRange(a);
        if (candidateStart < r.end && candidateEnd > r.start) return r;
      }
      return null;
    };

    const trySlot = (date: Date, time: string) => {
      const [h, m] = time.split(':').map(Number);
      const slotStart = new Date(date);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMins * 60000);

      // check patient conflicts
      const patientConflict = overlapsAny(slotStart, slotEnd, patientAppointments);
      if (patientConflict) return { ok: false, reason: 'patient', conflict: patientConflict };

      return { ok: true };
    };

    // If current selection is valid, do nothing
    if (selectedTime) {
      const check = trySlot(selectedDate, selectedTime);
      if (check.ok) return;
      console.log('[BookingModal] Current slot conflicts:', check.reason, check.conflict);
    }

    // Otherwise search forward up to 30 days
    const now = new Date();
    const startDate = selectedDate && selectedDate > now ? new Date(selectedDate) : new Date();
    const maxDays = 30;

    for (let d = 0; d < maxDays; d++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + d);

      for (const slot of TIME_SLOTS) {
        // Skip past times for today
        if (d === 0) {
          const [h, m] = slot.split(':').map(Number);
          const slotDateTime = new Date(checkDate);
          slotDateTime.setHours(h, m, 0, 0);
          if (slotDateTime < new Date()) continue;
        }

        const result = trySlot(checkDate, slot);
        if (result.ok) {
          console.log('[BookingModal] Auto-selecting next free slot for patient conflict:', { patientId: selectedPatient, date: checkDate.toISOString().slice(0,10), time: slot });
          setSelectedDate(checkDate);
          setSelectedTime(slot);
          return;
        }
      }
    }

    console.warn('[BookingModal] No free slot found for patient within 30 days');
  }, [open, selectedPatient, patientAppointments, duration, selectedDate, selectedTime]);

  useEffect(() => {
    setSelectedDate(defaultDate ?? new Date());
  }, [defaultDate]);

  useEffect(() => {
    setSelectedTime(defaultTime ?? "");
  }, [defaultTime]);

  // Debug: log incoming default patient id when prop changes
  useEffect(() => {
    if (defaultPatientId) {
      console.log('[BookingModal] 🔔 defaultPatientId prop received:', defaultPatientId);
    } else {
      console.log('[BookingModal] 🔔 no defaultPatientId provided');
    }
  }, [defaultPatientId]);

  // Sync doctorName prop to selectedDoctor state when it changes
  useEffect(() => {
    if (doctorName) {
      setSelectedDoctor(doctorName);
    }
  }, [doctorName]);

  // Auto-preselect first doctor for non-doctor portals when modal opens
  // BUT: Skip if doctorName was explicitly passed (e.g., from DoctorAvailabilityView)
  useEffect(() => {
    if (!open) return;
    
    // Only auto-preselect if user is NOT a doctor
    if (user?.role === 'doctor') return;
    
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
  const findNextAvailableSlot = useCallback(async (startDate: Date, doctorToCheck: string, durationToCheck: string, patientToCheck?: string, preferredTime?: string): Promise<{ date: Date; time: string } | null> => {
    if (!doctorToCheck || !durationToCheck) return null;

    const durationMins = parseInt(durationToCheck, 10) || 30;
    const maxDaysToCheck = 30; // Check up to 30 days ahead
    const timeToMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

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

        // If a patientToCheck was provided, fetch that patient's appointments for the same date
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
            console.warn('[BookingModal] Failed to fetch patient appointments for', dateStr, patientToCheck, err);
          }
        }

        // Calculate available slots
        const now = new Date();
        const todayStr = formatDateToYYYYMMDD(now);
        const isToday = dateStr === todayStr;

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const availableSlots: string[] = [];

        for (const slot of TIME_SLOTS) {
          const [hour, minute] = slot.split(':').map(Number);
          const isPastTime = isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute));

          if (isPastTime) continue;

          // Check for booking conflicts for doctor
          const slotMinutes = timeToMinutes(slot);
          const slotEndMinutes = slotMinutes + durationMins;

          let isConflict = false;
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

          // Also check for patient conflicts (if provided)
          if (!isConflict && patientAppointmentsForDate.length > 0) {
            for (const papt of patientAppointmentsForDate) {
              if (papt.status === 'cancelled') continue;
              if (papt.status === 'pending') continue;

              const pStart = timeToMinutes(papt.time);
              const pEnd = pStart + (papt.duration || 30);
              if (slotMinutes < pEnd && slotEndMinutes > pStart) {
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
        const preferredMinutes = preferredTime ? timeToMinutes(preferredTime) : null;
        const selectedSlot = preferredTime && daysAhead === 0
          ? (
              availableSlots.find(slot => slot === preferredTime) ||
              availableSlots.find(slot => preferredMinutes !== null && timeToMinutes(slot) >= preferredMinutes)
            )
          : availableSlots[0];

        if (!selectedSlot) continue;

        return {
          date: checkDate,
          time: selectedSlot
        };
      }
    }

    return null;
  }, []);

  // Run auto-preselection logic. Once a date/time exists, schedule is authoritative:
  // doctor selection may surface conflicts, but it must not jump to another slot.
  const runAutoPreselect = useCallback(async (patientId?: string) => {
    if (appointmentToEdit) return; // don't override when editing

    const patientToSearch = patientId || defaultPatientId || selectedPatient || undefined;
    const doctorToSearch = doctorName || selectedDoctor;
    const durationToSearch = String(Number(duration) || appointmentTypeDurations[appointmentType || 'Routine Cleaning'] || 30);

    if ((defaultDate && defaultTime) || selectedTime) {
      if (!appointmentType) setAppointmentType('Routine Cleaning');
      if (defaultDate && defaultTime) {
        setSelectedDate(defaultDate);
        setSelectedTime(defaultTime);
      }
      return;
    }

    if (!doctorToSearch) {
      console.log('[BookingModal] Waiting for doctor to be selected before auto-preselect...');
      return;
    }

    if (!appointmentType) setAppointmentType('Routine Cleaning');

    const nextSlot = await findNextAvailableSlot(new Date(), doctorToSearch, durationToSearch, patientToSearch);
    if (nextSlot) {
      setSelectedDate(nextSlot.date);
      setSelectedTime(nextSlot.time);
      console.log('[BookingModal] Auto-preselected slot:', { date: formatDateToYYYYMMDD(nextSlot.date), time: nextSlot.time });
    }
  }, [appointmentToEdit, defaultDate, defaultTime, doctorName, duration, selectedDoctor, selectedPatient, defaultPatientId, appointmentType, selectedTime, findNextAvailableSlot]);

  const runAutoPreselectRef = useRef(runAutoPreselect);

  useEffect(() => {
    runAutoPreselectRef.current = runAutoPreselect;
  }, [runAutoPreselect]);

  // Auto-preselect date, time, and appointment type for all portals
  useEffect(() => {
    if (!open || appointmentToEdit) return; // Only for new appointments, not editing
    
    // CASE 1: Coming from DoctorAvailabilityView (has defaultDate, defaultTime, and doctorName)
    // Preselect appointment type, but validate the passed date/time/doctor before keeping it.
    if (defaultDate && defaultTime && doctorName) {
      console.log('[BookingModal] 📍 DoctorAvailabilityView context detected');
      console.log('[BookingModal] ℹ️ Pre-filled with: date=' + formatDateToYYYYMMDD(defaultDate) + ', time=' + defaultTime + ', doctor=' + doctorName);
      
      // Only preselect appointment type if not already set
      if (!appointmentType) {
        console.log('[BookingModal] 📋 Preselecting appointment type: Routine Cleaning');
        setAppointmentType("Routine Cleaning");
      }
      setSelectedDate(defaultDate);
      setSelectedTime(defaultTime);
      return;
    }
    
    // CASE 2: Generic booking modal (explicit defaults passed)
    // Keep the clicked slot only after it has been validated against the selected doctor/patient.
    if (defaultDate && defaultTime) {
      console.log('[BookingModal] 📍 Using explicitly passed date/time:', {
        date: formatDateToYYYYMMDD(defaultDate),
        time: defaultTime,
        source: 'clicked_slot'
      });
      if (!appointmentType) {
        setAppointmentType("Routine Cleaning");
      }
      setSelectedDate(defaultDate);
      setSelectedTime(defaultTime);
      return;
    }
    
    // CASE 3: New appointment modal (no defaults at all)
    if (selectedTime) return;

    // Preselect first appointment type
    if (!appointmentType) {
      console.log('[BookingModal] 📋 Preselecting appointment type: Routine Cleaning');
      setAppointmentType("Routine Cleaning");
    }
    
    runAutoPreselect();
  }, [open, appointmentToEdit, defaultDate, defaultTime, doctorName, selectedTime, runAutoPreselect, appointmentType]);

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
              console.warn('[BookingModal] Failed to fetch appointment patient; using appointment snapshot:', patientErr);
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
              // Revalidate once the patient is known so patient conflicts affect preselection.
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
      setPaymentMethod(appointmentToEdit.paymentMethod || (appointmentToEdit.paymentStatus === 'pay-at-clinic' ? 'Pay at Clinic' : ''));
      // Reset the flag when opening for edit
      setStatusChangedByUser(0);
      setPaymentStatusChangedByUser(0);
      // Set the modal step based on isPaymentFlow flag or if we are editing
      // Only skip to payment step if explicitly marked as payment flow (e.g., "Pay Now" click)
      // or if we are viewing/editing an existing appointment
      setModalStep(isPaymentFlow || appointmentToEdit ? 'payment' : 'details');
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
      setSelectedDate(defaultDate ?? (isPastAppointmentMode ? getDefaultPastAppointmentDate() : new Date()));
      setSelectedTime(defaultTime ?? '');
      setAmountToPay('');
      setAppointmentStatus(isPastAppointmentMode ? 'tbd' : 'scheduled');
      setPaymentStatus('unpaid');
      setPaymentMethod('');
      // Reset the flag when opening for new appointment
      setStatusChangedByUser(0);
      setPaymentStatusChangedByUser(0);
      setModalStep('details');
    }
  }, [open, appointmentToEdit, defaultDate, defaultTime, defaultPatientId, isPastAppointmentMode]);

  // Derived display values for schedule block
  const displayDoctor = formatDoctorName(appointmentToEdit?.doctor || selectedDoctor || doctorName);
  
  // Calculate remaining balance for display in payment step
  const previouslyPaidAmount = appointmentToEdit?.totalPaid !== undefined 
    ? appointmentToEdit.totalPaid 
    : (appointmentToEdit?.price !== undefined && appointmentToEdit?.balance !== undefined)
      ? Math.max(0, appointmentToEdit.price - appointmentToEdit.balance)
      : 0;
  const discountedPrice = Math.max(0, finalPrice - Number(discount));
  const remainingBalance = Math.max(0, discountedPrice - previouslyPaidAmount);
  const paymentAmountNow = paymentMethod === "Pay at Clinic" ? 0 : (parseFloat(amountToPay) || 0);
  const bookingConflictWarnings = getBookingConflictWarnings({
    durationConflict,
    patientConflict,
    duration,
  });
  const bookingConflictTitle = bookingConflictWarnings.map(w => w.message).join('\n');

  const { handleNextStep } = useSharedBookingLogic({
    modalStep,
    flow: 'details-payment',
    selectedPatient,
    selectedDate,
    selectedTime,
    appointmentType,
    customAppointmentTypeName,
    selectedDoctor,
    setModalStep: (step) => setModalStep(step as "details" | "payment"),
    setIsConfirmSummaryOpen,
    toast,
    durationConflict,
    patientConflict,
    allowConflictSummary: true,
    scheduleMode: isPastAppointmentMode ? 'past' : 'standard',
  });

  // Handler for status changes that sets the flag
  const handleStatusChange = (newStatus: string) => {
    if (isPastAppointmentMode && !PAST_APPOINTMENT_STATUS_VALUES.includes(newStatus as typeof PAST_APPOINTMENT_STATUS_VALUES[number])) {
      toast.error("Past appointments can only be Cancelled, Completed, or TBD.");
      return;
    }

    if (canManageStatuses && newStatus === "pending") {
      toast.error("Pending is reserved for patient carts.");
      return;
    }
    setAppointmentStatus(newStatus);
    setStatusChangedByUser(1);
  };

  const handlePaymentStatusChange = (newStatus: string) => {
    setPaymentStatus(newStatus as any);
    setPaymentStatusChangedByUser(1);
  };

  // First step: validate details and move to payment
  const handleConfirmBooking = async () => {
    setIsBooking(true);
    try {
      handleNextStep();
    } catch (err) {
      console.error('Booking: details error', err);
    } finally {
      setIsBooking(false);
    }
  };

  // Second step: show summary confirmation before saving
  const handleConfirmPayment = async () => {
    handleNextStep();
  };

  // Calculate what the final status will be for display in summary
  const getProjectedStatus = () => {
    if (isPastAppointmentMode) {
      return PAST_APPOINTMENT_STATUS_VALUES.includes(appointmentStatus as typeof PAST_APPOINTMENT_STATUS_VALUES[number])
        ? appointmentStatus
        : 'tbd';
    }

    const amountPaidRaw = amountToPay.trim() === '' ? '0' : amountToPay;
    const amountPaid = parseFloat(amountPaidRaw) || 0;

    return getProjectedBookingStatus({
      userRole: user?.role,
      bookingMode,
      isEditing: Boolean(appointmentToEdit),
      statusChangedByUser: statusChangedByUser === 1,
      selectedStatus: appointmentStatus,
      existingStatus: appointmentToEdit?.status,
      amountPaid,
      previouslyPaidAmount,
      totalPrice: discountedPrice,
    });
  };

  // Calculate what the final payment status will be for display in summary
  const getFinalPaymentStatus = () => {
    const amountPaidRaw = amountToPay.trim() === '' ? '0' : amountToPay;
    const amountPaid = paymentMethod === "Pay at Clinic" ? 0 : (parseFloat(amountPaidRaw) || 0);

    return getProjectedPaymentStatus({
      paymentMethod,
      statusChangedByUser: paymentStatusChangedByUser === 1,
      selectedStatus: paymentStatus,
      existingStatus: appointmentToEdit?.paymentStatus,
      amountPaid,
      previouslyPaidAmount,
      totalPrice: discountedPrice,
    });
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
        const newBalance = Math.max(0, discountedPrice - newTotalPaid);

        console.log('[BookingModal Payment] Updating appointment:', {
          appointmentId: appointmentToEdit.id,
          previouslyPaid,
          newPayment: amountPaid,
          newTotalPaid,
          newBalance,
        });

        // Determine payment status
        const updatePaymentStatus = getFinalPaymentStatus();
        
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
        const paymentStatus = getFinalPaymentStatus();
        
        // Determine appointment status using the new function that includes override logic
        const autoStatus = getFinalAppointmentStatus();

        console.log('[BookingModal Payment] Calculated status:', { paymentStatus, autoStatus, amountPaid, finalPrice, discountedPrice });

        const newBalance = Math.max(0, discountedPrice - amountPaid);

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

      setModalStep('details');
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
    setModalStep("details");
    setIsRescheduling(false);
    setAmountToPay("");
    setCustomAppointmentTypeName("");
    setCustomPrice("0");
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between mb-4">
              {/* Calendar icon on step 1, Back button on step 2 */}
              {modalStep === 'details' && (
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              )}
              {modalStep === 'payment' && (
                <button
                  onClick={() => setModalStep('details')}
                  disabled={isBooking}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold flex-1 text-center">
                {title ? title : (
                  modalStep === 'details' 
                    ? (appointmentToEdit 
                        ? (isPatientReadonly ? 'View Appointment' : 'Edit Appointment') 
                        : 'Appointment Details') 
                    : 'Payment Summary'
                )}
              </DialogTitle>
              
                {/* Step indicators - hidden if cancelled and patient role */}
                {!(isCancelled && user?.role === 'patient') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalStep('details')}
                      disabled={isBooking}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${
                        modalStep === "details"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${modalStep === "details" ? "bg-white text-blue-600" : "bg-gray-400 text-white"}`}>1</div>
                      Details
                    </button>
                    <button
                      onClick={() => setModalStep('payment')}
                      disabled={isBooking || !selectedPatient || !appointmentType || !duration}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${
                        modalStep === "payment"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : !selectedPatient || !appointmentType || !duration
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${modalStep === "payment" ? "bg-white text-blue-600" : "bg-gray-400 text-white"}`}>2</div>
                      Payment
                    </button>
                  </div>
                )}
            </div>
            <DialogDescription>
              {modalStep === 'details' ? 'Complete the following information to book your appointment' : 'Review and confirm appointment details and payment'}
            </DialogDescription>
          </DialogHeader>

          {modalStep === 'details' ? (
            <>
              <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-bold text-gray-700">Who is this appointment for?</Label>
                        {canCreatePatients && !isPatientReadonly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAddPatientModal({ publicBooking: isPublicBookingMode })}
                            className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            New patient
                          </Button>
                        )}
                      </div>
                      <Select value={selectedPatient} onValueChange={setSelectedPatient} disabled={isLoadingPatients || isPatientReadonly}>
                        <SelectTrigger className={`h-11 rounded-lg transition-colors ${
                          patientConflict
                            ? 'border-red-500 bg-red-50 hover:bg-red-50'
                            : 'border-gray-200'
                        }`}>
                          <SelectValue placeholder={isLoadingPatients ? 'Loading...' : 'Select patient'} />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map(p => {
                            const hasConflict = patientConflictSet.has(p.id);
                            const conflictAppts = dailyAppointments.filter((apt: any) => String(apt.patientId) === String(p.id));
                            const conflictInfo = conflictAppts.length > 0 && hasConflict 
                              ? { 
                                  doctor: conflictAppts[0]?.doctor || 'Another Doctor',
                                  time: conflictAppts[0]?.time
                                }
                              : null;
                            return (
                              <SelectItem 
                                key={p.id}
                                value={p.id} 
                                disabled={hasConflict}
                                className={hasConflict ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{p.name}</span>
                                  {hasConflict && (
                                    <div title={conflictInfo ? `Patient has appointment with ${conflictInfo.doctor} at ${conflictInfo.time}` : 'Has conflict'}>
                                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {patientConflict && (
                        <div className="flex items-center gap-2 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span>{patientConflict}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Appointment Type</Label>
                      <Select value={appointmentType} onValueChange={setAppointmentType} disabled={isPatientReadonly}>
                        <SelectTrigger className="h-11 rounded-lg border-gray-200">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Routine Cleaning">Routine Cleaning</SelectItem>
                          <SelectItem value="Checkup">Checkup</SelectItem>
                          <SelectItem value="Filling">Filling</SelectItem>
                          <SelectItem value="Root Canal">Root Canal</SelectItem>
                          <SelectItem value="Extraction">Extraction</SelectItem>
                          <SelectItem value="Whitening">Whitening</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {appointmentType === "Other" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Custom Appointment Type Name *</Label>
                        <Input 
                          type="text"
                          value={customAppointmentTypeName} 
                          onChange={(e: any) => setCustomAppointmentTypeName(e.target.value)} 
                          placeholder="e.g., Denture Fitting, Implant Consultation" 
                          className="h-11 rounded-lg border-gray-200" 
                          disabled={isPatientReadonly}
                        />
                      </div>
                    )}

                    {/* Price - Moved here with appointment type styling */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Price</Label>
                      <div className="h-11 rounded-lg border border-gray-200 bg-white px-3 py-2.5 flex items-center">
                        <span className="text-gray-400 text-sm font-bold mr-2">₱</span>
                        {canManagePricing ? (
                          <Input 
                            type="number" 
                            min="0" 
                            step="1" 
                            value={Number(customPrice) > 0 ? customPrice : basePrice} 
                            onChange={(e: any) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              setCustomPrice(String(newPrice));
                            }} 
                            placeholder="Enter price"
                            className="h-full px-2 rounded-lg border-0 text-sm w-full font-bold text-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none" 
                            disabled={isPatientReadonly || isEditMode}
                          />
                        ) : (
                          <span className="text-sm font-bold text-blue-700 flex-1">{basePrice.toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Discount Input */}
                    {canManagePricing && (
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Discount</Label>
                      <div className="h-11 rounded-lg border border-gray-200 bg-white px-3 py-2.5 flex items-center">
                        <span className="text-gray-400 text-sm font-bold mr-2">₱</span>
                        <Input 
                          type="number" 
                          min="0" 
                          step="1" 
                          value={discount} 
                          onChange={(e: any) => setDiscount(e.target.value)} 
                          placeholder="Enter discount amount"
                          className="h-full px-2 rounded-lg border-0 text-sm w-full font-bold text-orange-600 focus:ring-1 focus:ring-orange-500 focus:outline-none" 
                          disabled={isPatientReadonly || isEditMode}
                        />
                      </div>
                      {Number(discount) > 0 && (
                        <div className="flex items-center gap-2 text-xs text-orange-600 font-semibold">
                          <span>💰 Savings: ₱{Number(discount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Final Price Display with Strikethrough if Discounted */}
                    {Number(discount) > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Final Price</Label>
                        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Original:</span>
                            <span className="text-base font-bold text-gray-400 line-through">₱{finalPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-lg">
                            <span className="font-bold text-gray-700">Now:</span>
                            <span className="text-2xl font-black text-green-600">₱{Math.max(0, finalPrice - Number(discount)).toLocaleString()}</span>
                            <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-full">SAVE {((Number(discount) / finalPrice) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-gray-700">Selected Schedule</Label>
                    </div>

                    <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm space-y-3">
                      {/* Date - Clickable Button */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-bold text-gray-600 uppercase">Date</span>
                        </div>
                        <button
                          onClick={() => setIsDatePickerOpen(true)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-sm font-semibold text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white"
                          disabled={isPatientReadonly || !selectedDoctor}
                        >
                          {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </button>
                      </div>

                      {/* Time - Clickable Button */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-bold text-gray-600 uppercase">Time</span>
                        </div>
                        <button
                          onClick={() => setIsTimePickerOpen(true)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-sm font-semibold text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white"
                          disabled={isPatientReadonly || !selectedDoctor}
                        >
                          {selectedTime ? formatTimeTo12h(selectedTime) : '—'}
                        </button>
                      </div>

                      {/* Doctor - Select Dropdown */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <Stethoscope className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-bold text-gray-600 uppercase">Doctor</span>
                        </div>
                        <Select value={selectedDoctor} onValueChange={(newDoctor) => {
                          setSelectedDoctor(newDoctor);
                        }} disabled={isDoctorSelectionLocked}>
                          <SelectTrigger className="h-9 w-auto rounded-lg border-gray-300 text-sm font-semibold px-3 bg-white hover:bg-gray-50 transition-colors">
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map((doc) => (
                              <SelectItem key={doc.id} value={doc.name}>
                                {doc.name.replace(/^Dr\.\s+/i, "Dr. ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Duration - Integrated in schedule card */}
                      <div className="pb-3 border-b border-gray-100">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-bold text-gray-600 uppercase">Duration</span>
                          </div>
                          <Select value={duration} onValueChange={setDuration} disabled={isPatientReadonly}>
                            <SelectTrigger className={`h-9 w-auto rounded-lg text-sm font-semibold px-3 transition-colors ${
                              durationConflict 
                                ? 'border-red-500 bg-red-50 hover:bg-red-50 text-red-700' 
                                : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
                            }`}>
                              <SelectValue>
                                {duration ? `${duration} Mins` : 'Select Duration'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {[30, 60, 90, 120].map(dur => {
                                const hasConflict = !isDurationAvailable(dur);
                                return (
                                  <SelectItem 
                                    key={dur}
                                    value={String(dur)} 
                                    disabled={hasConflict}
                                    className={hasConflict ? 'opacity-50 cursor-not-allowed' : ''}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{dur} Mins</span>
                                      {hasConflict && (
                                        <div title={`Conflicts with another appointment`}>
                                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                        </div>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        {durationConflict && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{durationConflict}</span>
                          </div>
                        )}
                      </div>

                      {/* Status - aligned with duration control */}
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-3">
                          <Award className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-bold text-gray-600 uppercase">Status</span>
                        </div>
                        {canEditAppointmentStatus ? (
                          <Select value={getFinalAppointmentStatus()} onValueChange={handleStatusChange} disabled={appointmentStatusOptions.length === 0}>
                            <SelectTrigger className="h-9 w-auto rounded-lg border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {appointmentStatusOptions.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900">
                            {getStatusLabel(getFinalAppointmentStatus(), appointmentStatusOptions)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <CompactNotesField
                  id="booking-notes"
                  label={isPatientLevelBookingMode ? 'My Notes' : 'Notes (Optional)'}
                  placeholder={isPatientLevelBookingMode ? "Add any notes for your dentist here..." : "Any details you'd like to add..."}
                  value={notes}
                  onChange={setNotes}
                  disabled={isPatientReadonly && isCancelled}
                />

                {/* Appointment History Logs */}
                {isEditMode && (appointmentLogs.length > 0 || paymentLogs.length > 0) && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-blue-800 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Appointment History
                      </Label>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Logs</span>
                    </div>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                      {(() => {
                        console.log(`[HistoryLog] Rendering History: appointmentLogs=${appointmentLogs.length}, paymentLogs=${paymentLogs.length}`);
                        // Merge and deduplicate: if an appointment log exists for the same time as a payment log,
                        // we prefer the appointment log because it can show BOTH status and payment.
                        const allCombinedLogs = [
                          ...appointmentLogs.map(l => ({ ...l, logType: 'appointment' as const })),
                          ...paymentLogs.map(l => ({ ...l, logType: 'payment' as const, changedAt: l.changedAt }))
                        ];

                        // Simple deduplication logic: if two logs happen within 2 seconds of each other 
                        // and one is appointment while other is payment, we'll favor the appointment one
                        // but only if we can merge the amount into it.
                        const sorted = allCombinedLogs.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
                        
                        const filteredLogs: typeof sorted = [];
                        for (let i = 0; i < sorted.length; i++) {
                          const current = sorted[i];
                          const prev = filteredLogs[filteredLogs.length - 1];
                          
                          if (prev && 
                              Math.abs(new Date(current.changedAt).getTime() - new Date(prev.changedAt).getTime()) < 3000 &&
                              ((current.logType === 'payment' && prev.logType === 'appointment') || 
                               (current.logType === 'appointment' && prev.logType === 'payment'))) {
                            
                            // MERGE LOGIC: ensure the combined log has the higher amount
                            const currentAmount = (current as any).amount || 0;
                            const prevAmount = (prev as any).amount || 0;
                            const maxAmount = Math.max(currentAmount, prevAmount);

                            if (prev.logType === 'appointment') {
                              (prev as any).amount = maxAmount;
                              // Ensure current also has maxAmount in case logic continues
                              (current as any).amount = maxAmount;
                              // If current was a payment log, it might have extra info
                              if (current.logType === 'payment') {
                                (prev as any).paymentMethod = (current as any).paymentMethod;
                                (prev as any).newBalance = (current as any).newBalance;
                              }
                              console.log(`[HistoryLog] Merged payment into existing appointment log: ${prev.id}, amount=${maxAmount}`);
                              continue;
                            } else if (current.logType === 'appointment') {
                              (current as any).amount = maxAmount;
                              // Ensure prev also has maxAmount in case logic continues
                              (prev as any).amount = maxAmount;
                              // Replace the previous payment log with this richer appointment log
                              filteredLogs[filteredLogs.length - 1] = current;
                              console.log(`[HistoryLog] Replaced payment log with merged appointment log: ${current.id}, amount=${maxAmount}`);
                              continue;
                            }
                          }
                          filteredLogs.push(current);
                        }

                        return filteredLogs.map((log) => {
                          const paidAmount = (log as any).amount || 0;
                          const hasPaymentInfo = (log as any).amount !== undefined;
                          const isInitialCreation = !log.previousState?.id || log.previousState?.status === 'none';
                          
                          // Prioritize the payment amount (e.g. ₱100) in the upper right badge if present
                          let badgeText = "";
                          if (hasPaymentInfo) {
                            badgeText = `₱${paidAmount.toLocaleString()}`;
                          } else {
                            // If it's a status change, show the new status
                            badgeText = log.newState?.status || log.previousState?.status || (isInitialCreation ? "New" : "Updated");
                          }

                          console.log(`[HistoryLog] Render Card: id=${log.id} badgeText=${badgeText} logType=${log.logType} amount=${paidAmount} initial=${isInitialCreation}`);

                          return (
                            <div key={log.id} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px] space-y-1.5 shadow-sm">
                              <div className="flex justify-between items-start gap-2 text-gray-500 font-medium">
                                <span className="flex items-center gap-1.5 opacity-80">
                                  <Clock className="h-3 w-3" />
                                  <span className="flex flex-col">
                                    <span>{new Date(log.changedAt).toLocaleString('en-PH', { 
                                      month: 'numeric', 
                                      day: 'numeric', 
                                      year: 'numeric', 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}</span>
                                    {(log as any).changedByName && (
                                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                                        by {(log as any).changedByName}
                                      </span>
                                    )}
                                  </span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-md uppercase font-black text-[9px] tracking-tight border ${
                                    hasPaymentInfo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-300'
                                  }`}>
                                    {badgeText}
                                  </span>
                                  <button 
                                    onClick={() => {
                                      // Get historical snapshot
                                      const historicalData = (log.logType === 'appointment' && log.newState && Object.keys(log.newState).length > 3) 
                                        ? { ...appointmentToEdit, ...log.newState, changedAt: log.changedAt, changedByName: (log as any).changedByName } 
                                        : { ...appointmentToEdit, ...log.previousState, changedAt: log.changedAt, changedByName: (log as any).changedByName };
                                      
                                      console.log('[HistoryLog] Opening historical snapshot:', historicalData.id);
                                      setSnapshotToView(historicalData);
                                      setIsSnapshotModalOpen(true);
                                    }}
                                    className="p-1 hover:bg-white rounded-md border border-transparent hover:border-gray-200 transition-colors text-gray-400 hover:text-blue-600"
                                    title="View snapshot"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                  </button>
                                </div>
                              </div>
                              <div className="text-gray-800 leading-relaxed font-medium">
                                {log.logType === 'payment' ? (
                                  <div className="space-y-0.5">
                                    <p>
                                      {user?.role === 'patient' 
                                        ? `Payment of ₱${(log.amount || 0).toLocaleString()} made`
                                        : `Payment of ₱${(log.amount || 0).toLocaleString()} received via ${log.paymentMethod || 'cash'}`
                                      }
                                    </p>
                                    <p className="text-[10px] text-gray-500 italic">
                                      {user?.role === 'patient'
                                        ? `Your balance is now ₱${(log.newBalance || 0).toLocaleString()}`
                                        : `Account marked as ${log.paymentStatus?.replace('-', ' ') || 'paid'} by ${log.changedByName || log.changedBy} • Balance: ₱${(log.newBalance || 0).toLocaleString()}`
                                      }
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    {/* Status Summary for Patients vs Technical for Staff */}
                                    {user?.role === 'patient' ? (
                                      <div className="mb-1 text-[10px]">
                                        <p className="text-gray-600">
                                          Status is <span className="font-bold text-purple-700 uppercase">{log.newState?.status || log.previousState?.status || 'scheduled'}</span>
                                          {log.newState?.paymentStatus && ` • Payment: ${log.newState.paymentStatus.replace('-', ' ')}`}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] mb-1">
                                        <p className="text-gray-500">
                                          Status: <span className="font-bold text-purple-700 uppercase tracking-tight">{log.newState?.status || log.previousState?.status || '—'}</span>
                                        </p>
                                        <p className="text-gray-500">
                                          Payment: <span className="font-bold text-emerald-700 uppercase tracking-tight">{(log.newState?.paymentStatus || log.previousState?.paymentStatus || '—').replace('-', ' ')}</span>
                                        </p>
                                        {log.amount !== undefined && (
                                          <p className="text-gray-500">
                                            Paid: <span className="font-bold text-gray-700">₱{(log.amount || 0).toLocaleString()}</span>
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Significant changes list */}
                                    <div className="space-y-0.5 border-l-2 border-gray-100 pl-2 mt-1.5">
                                      {/* Show reschedule if it occurred (ONLY if not initial creation and schedule actually changed) */}
                                      {!isInitialCreation && log.previousState?.date && (
                                        (log.newState?.date && log.newState.date !== log.previousState?.date) || 
                                        (log.newState?.time && log.newState.time !== log.previousState?.time)
                                      ) ? (
                                        <p className="text-[10px]">
                                          {user?.role === 'patient' ? 'Appointment moved to' : 'Schedule moved to'} <span className="font-bold text-blue-700">{log.newState?.date || log.previousState?.date}</span> at <span className="font-bold text-blue-700">{log.newState?.time || log.previousState?.time}</span>
                                        </p>
                                      ) : null}

                                      {/* Default message if no specific significant change detected but it was an update or creation */}
                                      {((!log.changeType || log.changeType === 'update' || log.changeType === 'notes_update' || isInitialCreation) && 
                                       !(log.newState?.status && log.previousState?.status && log.newState.status !== log.previousState?.status) &&
                                       !(log.previousState?.date && ((log.newState?.date && log.newState.date !== log.previousState?.date) || (log.newState?.time && log.newState.time !== log.previousState?.time))) &&
                                       !(log.newState?.paymentStatus && log.previousState?.paymentStatus && log.newState.paymentStatus !== log.previousState?.paymentStatus)) && (
                                        <p className="text-[10px]">
                                          {user?.role === 'patient' 
                                            ? (isInitialCreation ? 'Appointment record created' : 'Appointment details updated')
                                            : (isInitialCreation ? `Appointment created by ${log.changedByName || log.changedBy}` : `Appointment updated by ${log.changedByName || log.changedBy}`)
                                          }
                                        </p>
                                      )}
                                    </div>

                                    {/* Show notes if they exist in newState AND are not empty (show even if unchanged from previousState) */}
                                    {(log.newState?.notes && log.newState.notes.trim() !== '' && log.newState.notes.trim() !== '-') && (
                                      <div className="mt-1.5 p-1.5 bg-blue-50/50 rounded border border-blue-100/50">
                                        <p className="text-[10px] text-blue-800 font-semibold mb-0.5">Notes:</p>
                                        <p className="text-[10px] text-gray-600 italic line-clamp-2">
                                          {log.newState.notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                {/* destructive cancel for all users when editing an appointment */}
                {appointmentToEdit && !isCancelled && (
                  <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isBooking} className="h-11 px-4 rounded-lg mr-auto">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {isBooking ? 'Processing...' : 'Cancel Appointment'}
                  </Button>
                )}
                
                {(isCancelled && user?.role === 'patient') ? (
                  <Button 
                    onClick={handleClose} 
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 h-11 px-8 rounded-lg ml-auto font-bold border border-gray-200"
                  >
                    Close
                  </Button>
                ) : (
                  <Button 
                    onClick={handleConfirmBooking} 
                    disabled={isBooking || !appointmentType || !selectedPatient} 
                    title={bookingConflictTitle}
                    className={`gap-2 h-11 px-8 rounded-lg shadow-lg ${
                      "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Next: Payment'}
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar py-2">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Service:</span>
                    <span className="font-medium">{appointmentType === "Other" ? customAppointmentTypeName : appointmentType || 'Other'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Date:</span>
                    <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Time:</span>
                    <span className="font-medium">{selectedTime ? formatTimeTo12h(selectedTime) : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Duration:</span>
                    <span className="inline-flex items-center gap-2 font-medium">
                      {duration} mins
                      {durationConflict && (
                        <span title={bookingConflictWarnings.find(w => w.type === 'duration')?.message || durationConflict} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                  </div>
                  {bookingConflictWarnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      <span title={bookingConflictTitle} className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 align-middle">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                      This appointment has a scheduling conflict. Hover the warning icon for details.
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="font-bold">Total Price:</span>
                    {Number(discount) > 0 ? (
                      <span className="font-bold text-lg text-gray-400 line-through">₱{finalPrice.toLocaleString()}</span>
                    ) : (
                      <span className="font-bold text-lg text-gray-900">₱{finalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  {Number(discount) > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Discount:</span>
                        <span className="text-sm font-semibold text-orange-600">-₱{Number(discount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-bold">Final Price:</span>
                        <span className="font-bold text-lg text-green-600">₱{Math.max(0, finalPrice - Number(discount)).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {appointmentToEdit && previouslyPaidAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Already Paid:</span>
                      <span className="text-sm font-semibold text-green-600">₱{previouslyPaidAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {isEditMode && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Remaining Balance:</span>
                      <span className="font-bold text-lg text-blue-600">₱{remainingBalance.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentAmount" className="text-sm font-semibold">Amount to Pay Now</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    placeholder={`Enter amount (e.g. ${remainingBalance})`}
                    value={amountToPay}
                    onChange={(e: any) => setAmountToPay(e.target.value)}
                    className="font-bold text-lg h-12"
                    disabled={paymentMethod === "Pay at Clinic"}
                  />
                  <p className="text-[10px] text-gray-500">{paymentMethod === "Pay at Clinic" ? "Amount will be paid at the clinic" : `Leave blank or enter 0 to skip payment. Remaining balance: ₱${remainingBalance.toLocaleString()}`}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Select Payment Method</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 ${paymentMethod === "GCash" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}
                      onClick={() => setPaymentMethod("GCash")}
                    >
                      <span className="font-black text-blue-700 italic text-lg">GCash</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 ${paymentMethod === "Card" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}
                      onClick={() => setPaymentMethod("Card")}
                    >
                      <CreditCard className={`h-6 w-6 ${paymentMethod === "Card" ? "text-blue-600" : "text-gray-600"}`} />
                      <span className={`text-[10px] font-bold uppercase ${paymentMethod === "Card" ? "text-blue-700" : "text-gray-500"}`}>Card</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 ${paymentMethod === "Pay at Clinic" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}
                      onClick={() => { setPaymentMethod("Pay at Clinic"); setAmountToPay("0"); }}
                    >
                      <Banknote className={`h-6 w-6 ${paymentMethod === "Pay at Clinic" ? "text-blue-600" : "text-gray-600"}`} />
                      <span className={`text-[10px] font-bold uppercase text-center leading-tight ${paymentMethod === "Pay at Clinic" ? "text-blue-700" : "text-gray-500"}`}>Pay at Clinic</span>
                    </Button>
                  </div>
                </div>

                {isEditMode && canEditAppointmentStatus && (
                  <div className="space-y-2">
                    <Label htmlFor="appointmentStatus" className="text-sm font-semibold">Appointment Status</Label>
                    <Select value={getFinalAppointmentStatus()} onValueChange={handleStatusChange} disabled={appointmentStatusOptions.length === 0}>
                      <SelectTrigger id="appointmentStatus">
                        <SelectValue placeholder="Select appointment status" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentStatusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Payment Status Display - Read-only for Patient, Editable for Admin/Doctor */}
                {isEditMode && (
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus" className="text-sm font-semibold">Payment Status</Label>
                    {user?.role === "patient" ? (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          getFinalPaymentStatus() === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          getFinalPaymentStatus() === 'unpaid' ? 'bg-red-100 text-red-700' :
                          getFinalPaymentStatus() === 'half-paid' ? 'bg-amber-100 text-amber-700' :
                          getFinalPaymentStatus() === 'overdue' ? 'bg-orange-100 text-orange-700' :
                          getFinalPaymentStatus() === 'pay-at-clinic' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {getPaymentStatusLabel(getFinalPaymentStatus(), paymentStatuses)}
                        </span>
                      </div>
                    ) : (
                      <Select value={getFinalPaymentStatus()} onValueChange={handlePaymentStatusChange}>
                        <SelectTrigger id="paymentStatus">
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentStatuses.map((status: any) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                {appointmentToEdit && !isCancelled && (
                  <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isBooking} className="h-11 px-4 rounded-lg mr-auto">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {isBooking ? 'Processing...' : 'Cancel Appointment'}
                  </Button>
                )}
                
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-green-100"
                  onClick={handleConfirmPayment}
                  disabled={isBooking}
                >
                  {isBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Booking'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-red-600" />
              Cancel Appointment
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-semibold text-gray-900">Cancel this appointment?</p>
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel this appointment? This will mark it as <strong>Cancelled</strong> and release the time slot, but the record will remain in the system history.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isBooking} className="flex-1">
              Keep Appointment
            </Button>
            <Button variant="destructive" onClick={async () => {
              setIsDeleteDialogOpen(false);
              await handleCancel();
            }} disabled={isBooking} className="flex-1">
              {isBooking ? "Processing..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary confirmation dialog */}
      <Dialog open={isConfirmSummaryOpen} onOpenChange={setIsConfirmSummaryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Appointment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Patient:</span>
                  <span className="font-semibold">{patients.find(p => p.id === selectedPatient)?.name || selectedPatient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-semibold">{appointmentType === "Other" ? customAppointmentTypeName : appointmentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold">{selectedTime ? formatTimeTo12h(selectedTime) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Doctor:</span>
                  <span className="font-semibold">{displayDoctor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="inline-flex items-center gap-2 font-semibold">
                    {duration} mins
                    {durationConflict && (
                      <span title={bookingConflictWarnings.find(w => w.type === 'duration')?.message || durationConflict} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </span>
                </div>
                {bookingConflictWarnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    <span title={bookingConflictTitle} className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 align-middle">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </span>
                    This appointment has a scheduling conflict. Hover the warning icon for details.
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  {canEditAppointmentStatus ? (
                    <Select value={getFinalAppointmentStatus()} onValueChange={handleStatusChange} disabled={appointmentStatusOptions.length === 0}>
                      <SelectTrigger className={`h-8 w-auto min-w-[120px] rounded px-2 text-xs font-bold border-0 ${
                        getAppointmentStatusOption(getFinalAppointmentStatus())?.bgColor || 'bg-gray-100'
                      } ${
                        getAppointmentStatusOption(getFinalAppointmentStatus())?.textColor || 'text-gray-700'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentStatusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                      getAppointmentStatusOption(getFinalAppointmentStatus())?.bgColor || 'bg-gray-100'
                    } ${
                      getAppointmentStatusOption(getFinalAppointmentStatus())?.textColor || 'text-gray-700'
                    }`}>
                      {getStatusLabel(getFinalAppointmentStatus(), appointmentStatusOptions)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                    getFinalPaymentStatus() === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    getFinalPaymentStatus() === 'unpaid' ? 'bg-red-100 text-red-700' :
                    getFinalPaymentStatus() === 'half-paid' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {getPaymentStatusLabel(getFinalPaymentStatus(), paymentStatuses)}
                  </span>
                </div>
                <CompactNotesField
                  id="booking-summary-notes"
                  label="Notes:"
                  placeholder="No notes added."
                  value={notes}
                  onChange={setNotes}
                  disabled={isPatientReadonly && isCancelled}
                  className="border-t border-blue-100 pt-2 mt-2"
                  labelClassName="text-sm font-normal text-gray-600"
                  textareaClassName="rounded-md bg-white/70 text-sm font-semibold"
                />
                <div className="border-t border-blue-100 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total Price:</span>
                    <span className={`${Number(discount) > 0 ? 'text-gray-400 line-through' : 'text-blue-700'}`}>₱{finalPrice.toLocaleString()}</span>
                  </div>
                  {Number(discount) > 0 && (
                    <>
                      <div className="flex justify-between text-orange-600 font-semibold">
                        <span>Discount:</span>
                        <span>-₱{Number(discount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-bold text-lg">
                        <span>Final Price:</span>
                        <span>₱{discountedPrice.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
                {previouslyPaidAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Already Paid:</span>
                    <span>₱{previouslyPaidAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Amount to Pay Now:</span>
                  <span>₱{paymentAmountNow.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-blue-700 font-semibold">
                  <span>Remaining Balance:</span>
                  <span>₱{Math.max(0, discountedPrice - previouslyPaidAmount - paymentAmountNow).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmSummaryOpen(false)} disabled={isBooking} className="flex-1">
              Back
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white flex-1" onClick={handleConfirmSummary} disabled={isBooking}>
              {isBooking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historical Snapshot View-only Modal */}
      <AppointmentHistoryView
        open={isSnapshotModalOpen}
        onOpenChange={(val) => {
          setIsSnapshotModalOpen(val);
          if (!val) setSnapshotToView(null);
        }}
        appointmentSnapshot={snapshotToView}
        logDate={snapshotToView?.changedAt || new Date().toISOString()}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        open={isDatePickerOpen}
        onOpenChange={setIsDatePickerOpen}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        doctorName={selectedDoctor}
        selectedTime={selectedTime}
        duration={duration}
        dateSelectionMode={isPastAppointmentMode ? "past" : "standard"}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        open={isTimePickerOpen}
        onOpenChange={setIsTimePickerOpen}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        doctorName={selectedDoctor}
        duration={duration}
        onTimeSelect={setSelectedTime}
        onDateChange={setSelectedDate}
        excludeAppointmentId={appointmentToEdit?.id}
        patientId={selectedPatient}
        dateSelectionMode={isPastAppointmentMode ? "past" : "standard"}
      />
    </>
   );
 }
