import React, { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { useAppointmentStatuses, AppointmentStatusOption } from "@/hooks/useAppointmentStatuses";
import { usePaymentStatuses, PaymentStatusOption } from "@/hooks/usePaymentStatuses";
import { Calendar as CalendarIcon, Clock, Award, Loader2, CreditCard, Banknote, Stethoscope, ChevronLeft, AlertCircle } from "lucide-react";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { formatTimeTo12h, TIME_SLOTS } from "@/lib/time-slots";
import { APPOINTMENT_PRICES, getAppointmentTypeName } from "@/lib/appointmentTypes";
import { toast } from 'sonner';
import AppointmentHistoryView from "./AppointmentHistoryView";
import { DatePickerModal } from "./DatePickerModal";
import { TimePickerModal } from "./TimePickerModal";
import { useDoctors } from "@/hooks/useDoctors";

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

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultTime?: string;
  doctorName?: string; // doctor's display name
  onBooked?: (apt?: any) => void;
  onDeleted?: (apt?: any) => void;
  appointmentToEdit?: any; // optional appointment object to edit
  title?: string; // optional override for dialog title
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

export default function BookingModal({ open, onOpenChange, defaultDate, defaultTime, doctorName, onBooked, onDeleted, appointmentToEdit, title }: BookingModalProps) {
  const { user } = useAuth();
  const { doctors } = useDoctors();
  const { addAppointment, updateAppointment, isPaymentFlow } = useAppointmentModal();
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
  const [modalStep, setModalStep] = useState<"patient" | "schedule" | "treatment" | "doctor" | "payment">("patient");
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
  const findNextAvailableSlot = useCallback(async (startDate: Date, doctorToCheck: string, durationToCheck: string): Promise<{ date: Date; time: string } | null> => {
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

  // Auto-preselect date, time, and appointment type for all portals
  useEffect(() => {
    if (!open || appointmentToEdit) return; // Only for new appointments, not editing
    
    // CASE 1: Coming from DoctorAvailabilityView (has defaultDate, defaultTime, and doctorName)
    // RULE: Only preselect appointment type, respect the passed date/time/doctor
    if (defaultDate && defaultTime && doctorName) {
      console.log('[BookingModal] 📍 DoctorAvailabilityView context detected');
      console.log('[BookingModal] ℹ️ Pre-filled with: date=' + formatDateToYYYYMMDD(defaultDate) + ', time=' + defaultTime + ', doctor=' + doctorName);
      
      // Only preselect appointment type if not already set
      if (!appointmentType) {
        console.log('[BookingModal] 📋 Preselecting appointment type: Routine Cleaning');
        setAppointmentType("Routine Cleaning");
      }
      return; // Don't do any auto-searching
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
    
    // Find next available slot for preselection (only if no explicit defaults passed)
    const preSelectSlot = async () => {
      if (!selectedDoctor) {
        console.log('[BookingModal] ⏳ Waiting for doctor to be selected...');
        return;
      }
      
      console.log('[BookingModal] 🔍 Auto-searching for next available slot for ' + selectedDoctor);
      const defaultDuration = appointmentTypeDurations["Routine Cleaning"] || 30;
      const nextSlot = await findNextAvailableSlot(new Date(), selectedDoctor, String(defaultDuration));
      
      if (nextSlot) {
        console.log('[BookingModal] ✅ Found next available slot:', {
          date: formatDateToYYYYMMDD(nextSlot.date),
          time: nextSlot.time
        });
        setSelectedDate(nextSlot.date);
        setSelectedTime(nextSlot.time);
      } else {
        console.warn('[BookingModal] ⚠️ No available slots found within 30 days');
      }
    };
    
    preSelectSlot();
    // Fixed dependency array: only include variables that determine when to re-run
    // Removed appointmentType, selectedTime, selectedDoctor as they're internal state
  }, [open, appointmentToEdit, defaultDate, defaultTime, doctorName, findNextAvailableSlot]);

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
          const list = json.data.map((p: any) => ({ id: String(p.id), name: `${p.firstName} ${p.lastName}`, ...p }));
          console.log('BookingModal: patients loaded', { 
            count: list.length, 
            source: user?.role === 'patient' ? 'server-filtered' : 'admin-fetch',
            allIds: list.slice(0, 3).map((p: any) => ({ id: p.id, type: typeof p.id, name: p.name }))
          });
          try { window.dispatchEvent(new CustomEvent('bookingmodal:patients', { detail: { source: user?.role === 'patient' ? 'server-filtered' : 'admin-fetch', count: list.length, patients: list } })); } catch {}
          setPatients(list);
          // preselect first patient if available
          if (list.length > 0) {
            setSelectedPatient(list[0].id);
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
  }, [open, user]);

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
      setSelectedPatient(patients.length > 0 ? patients[0].id : '');
      setAppointmentType('');
      setCustomAppointmentTypeName('');
      setDuration('30');
      setDiscount('0');
      setCustomPrice('0');
      setNotes('');
      setSelectedDate(defaultDate ?? new Date());
      setSelectedTime(defaultTime ?? '');
      setAmountToPay('');
      setAppointmentStatus('scheduled');
      setPaymentStatus('unpaid');
      setPaymentMethod('');
      // Reset the flag when opening for new appointment
      setStatusChangedByUser(0);
      setPaymentStatusChangedByUser(0);
      setModalStep('patient');
    }
  }, [open, appointmentToEdit, defaultDate, defaultTime, patients]);

  // Helper to progress through the multi-step modal
// Helper to progress through the multi-step modal
  const handleNextStep = async () => {
    try {
      if (modalStep === 'patient') {
        if (!selectedPatient) {
          toast.error("Please select a patient before continuing.");
          return;
        }
        setModalStep('schedule');
        return;
      }

      if (modalStep === 'schedule') {
        if (!selectedDate || !selectedTime) {
          toast.error("Please select both a date and a time slot.");
          return;
        }
        setModalStep('treatment');
        return;
      }

      if (modalStep === 'treatment') {
        if (!appointmentType) {
          toast.error("Please choose a service treatment.");
          return;
        }
        if (appointmentType === "Other" && !customAppointmentTypeName.trim()) {
          toast.error("Please type the name of the custom treatment.");
          return;
        }
        setModalStep('doctor');
        return;
      }

      if (modalStep === 'doctor') {
        if (!selectedDoctor) {
          toast.error("Please assign a specialist to this appointment.");
          return;
        }
        setModalStep('payment');
        return;
      }

      if (modalStep === 'payment') {
        // Final step -> show confirmation summary
        setIsConfirmSummaryOpen(true);
        return;
      }
    } catch (err) {
      console.error('[BookingModal] handleNextStep error', err);
    }
  };

  // Helper to go back one step in the flow
  const handlePrevStep = () => {
    try {
      if (modalStep === 'payment') {
        setModalStep('doctor');
        return;
      }
      if (modalStep === 'doctor') {
        setModalStep('treatment');
        return;
      }
      if (modalStep === 'treatment') {
        setModalStep('schedule');
        return;
      }
      if (modalStep === 'schedule') {
        setModalStep('patient');
        return;
      }
    } catch (err) {
      console.error('[BookingModal] handlePrevStep error', err);
    }
  };

  // Derived display values for schedule block
  const displayDoctor = formatDoctorName(appointmentToEdit?.doctor || doctorName);
  
  // Calculate remaining balance for display in payment step
  const previouslyPaidAmount = appointmentToEdit?.totalPaid !== undefined 
    ? appointmentToEdit.totalPaid 
    : (appointmentToEdit?.price !== undefined && appointmentToEdit?.balance !== undefined)
      ? Math.max(0, appointmentToEdit.price - appointmentToEdit.balance)
      : 0;
  const discountedPrice = Math.max(0, finalPrice - Number(discount));
  const remainingBalance = Math.max(0, discountedPrice - previouslyPaidAmount);

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

        const newApt = await addAppointment({
          patientId: selectedPatient,
          patientName: patients.find(p => p.id === selectedPatient)?.name || selectedPatient,
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

            {/* 5-STEP INDICATOR */}
            {!(isCancelled && user?.role === 'patient') && (
              <div className="relative flex items-center justify-between w-full mt-2 mb-4 px-10">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-500 z-0"
                  style={{
                    width: modalStep === 'patient' ? '0%' :
                           modalStep === 'schedule' ? '25%' :
                           modalStep === 'treatment' ? '50%' :
                           modalStep === 'doctor' ? '75%' : '100%'
                  }}
                />

                {[
                  { id: 'patient', label: 'Patient', icon: '1' },
                  { id: 'schedule', label: 'Schedule', icon: '2' },
                  { id: 'treatment', label: 'Treatment', icon: '3' },
                  { id: 'doctor', label: 'Doctor', icon: '4' },
                  { id: 'payment', label: 'Payment', icon: '5' }
                ].map((step, index) => {
                  const isActive = modalStep === step.id;
                  const isCompleted = 
                    (modalStep === 'schedule' && index < 1) ||
                    (modalStep === 'treatment' && index < 2) ||
                    (modalStep === 'doctor' && index < 3) ||
                    (modalStep === 'payment' && index < 4);

                  const isClickable = !isBooking && (
                    step.id === 'patient' ||
                    (step.id === 'schedule' && !!selectedPatient) ||
                    (step.id === 'treatment' && !!selectedPatient && !!selectedDate && !!selectedTime) ||
                    (step.id === 'doctor' && !!selectedPatient && !!selectedDate && !!selectedTime && !!appointmentType) ||
                    (step.id === 'payment' && !!selectedPatient && !!selectedDate && !!selectedTime && !!appointmentType && !!selectedDoctor)
                  );

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => isClickable && setModalStep(step.id as any)}
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
                   <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Stethoscope className="h-5 w-5" /></div>
                    <h3 className="text-lg font-bold">Select Patient</h3>
                  </div>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger className="h-14 rounded-2xl border-2 border-gray-100 bg-white">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => setIsDatePickerOpen(true)} className="flex items-center gap-4 p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-blue-500 transition-all text-left shadow-sm">
                      <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><CalendarIcon className="h-7 w-7" /></div>
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Appointment Date</p>
                        <p className="text-2xl font-black">{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </button>
                    <button onClick={() => setIsTimePickerOpen(true)} className="flex items-center gap-4 p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-blue-500 transition-all text-left shadow-sm">
                      <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><Clock className="h-7 w-7" /></div>
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Time Slot</p>
                        <p className="text-2xl font-black">{selectedTime ? formatTimeTo12h(selectedTime) : '--:--'}</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CHOOSE TREATMENT & FINANCIALS */}
              {modalStep === 'treatment' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  {/* Treatment Selection */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg"><Award className="h-6 w-6" /></div>
                      <h3 className="text-xl font-bold">What service do you need?</h3>
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
                          onClick={() => setAppointmentType(t.name)}
                          className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-4 ${appointmentType === t.name ? 'border-blue-600 bg-blue-50/50 shadow-md scale-105' : 'border-white bg-white hover:border-gray-200 shadow-sm'}`}
                        >
                          <div className={`w-14 h-14 rounded-full ${t.color} flex items-center justify-center text-white text-2xl shadow-sm`}>{t.icon}</div>
                          <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{t.short}</span>
                        </button>
                      ))}
                    </div>
                    {appointmentType === "Other" && (
                      <Input placeholder="Type custom treatment..." value={customAppointmentTypeName} onChange={(e) => setCustomAppointmentTypeName(e.target.value)} className="h-14 rounded-2xl border-gray-200 bg-white font-bold px-6 shadow-inner" />
                    )}
                  </div>

                  {/* Financials & Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-4">
                      {/* Duration Pill */}
                      <div className="bg-white p-3 pr-4 rounded-[2.5rem] border border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-500"><Clock className="h-5 w-5" /></div>
                          <span className="text-sm font-bold text-gray-800">Duration</span>
                        </div>
                        {(user?.role === "admin" || user?.role === "doctor") ? (
                          <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger className="w-24 rounded-full font-bold bg-gray-50 border-none h-10 focus:ring-0 focus:ring-offset-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">{[30, 60, 90, 120].map(d => <SelectItem key={d} value={String(d)}>{d} mins</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center justify-center w-24 h-10 rounded-full font-bold bg-gray-50 text-gray-900">
                            {duration} mins
                          </div>
                        )}
                      </div>

                      {/* Discount Pill */}
                      {(user?.role === "admin" || user?.role === "doctor") && (
                        <div className="bg-white p-3 pr-4 rounded-[2.5rem] border border-gray-100 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600"><Award className="h-5 w-5" /></div>
                            <span className="text-sm font-bold text-gray-800">Discount</span>
                          </div>
                          <div className="flex items-center gap-1 bg-gray-50 px-4 rounded-full h-10">
                            <span className="text-xs font-bold text-gray-400">₱</span>
                            <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-12 border-none bg-transparent font-bold text-right p-0 focus:ring-0" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Blue Estimated Cost Card */}
                    <div 
                      onClick={(e) => {
                        if (isPriceEditable && e.target === e.currentTarget) setIsPriceEditable(false);
                      }}
                      className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200/50 flex flex-col justify-between relative overflow-hidden cursor-default"
                    >
                      <CreditCard className="absolute top-6 right-6 h-10 w-10 text-white/10" />
                      
                      <div className="relative z-10">
                        <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-2">Estimated Cost</p>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xl font-bold">Treatment Fee</h4>
                          {/* ONLY SHOW EDIT PENCIL TO ADMINS/DOCTORS */}
                          {(user?.role === "admin" || user?.role === "doctor") && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsPriceEditable(!isPriceEditable);
                              }} 
                              className={`p-1.5 rounded-md transition-colors ${isPriceEditable ? 'bg-white/20' : 'hover:bg-white/10'}`}
                            >
                              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="relative z-10 mt-6 flex flex-col items-end">
                        {/* Upper small text logic */}
                        {isPriceEditable ? (
                          <p className="text-sm text-blue-200 font-bold opacity-90 mb-1">
                            Reflected Total: ₱{Math.max(0, (Number(customPrice === "0" ? finalPrice : customPrice) - Number(discount))).toLocaleString()}
                          </p>
                        ) : (
                          Number(discount) > 0 && <p className="text-sm text-blue-200 line-through opacity-80 mb-1">₱{finalPrice.toLocaleString()}</p>
                        )}
                        
                        <div className="flex items-center justify-end w-full">
                          <span className="text-[2.5rem] leading-none font-black mr-2">₱</span>
                          {/* AIRTIGHT LOCK: MUST BE EDITABLE *AND* USER MUST BE ADMIN/DOCTOR */}
                          {isPriceEditable && (user?.role === "admin" || user?.role === "doctor") ? (
                            <input 
                              type="number"
                              value={customPrice === "0" ? finalPrice : customPrice}
                              onChange={(e) => setCustomPrice(e.target.value)}
                              onBlur={() => setIsPriceEditable(false)}
                              className="text-[2.5rem] leading-none font-black bg-transparent border-b-2 border-white/50 p-0 w-[120px] text-right outline-none ring-0 focus:border-white text-white appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder-blue-300"
                              placeholder={String(finalPrice)}
                              autoFocus
                            />
                          ) : (
                            <span className="text-[2.5rem] leading-none font-black">
                              {Math.max(0, (Number(customPrice === "0" ? finalPrice : customPrice) - Number(discount))).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: DOCTOR */}
              {modalStep === 'doctor' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-4">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Assign Specialist</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {doctors.map(doc => (
                        <button key={doc.id} onClick={() => setSelectedDoctor(doc.name)} className={`p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-4 ${selectedDoctor === doc.name ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black ${selectedDoctor === doc.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {doc.name.charAt(0)}
                          </div>
                          <span className="font-bold text-gray-900 text-lg">{doc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FINAL STEP: PAYMENT SUMMARY */}
              {modalStep === 'payment' && (
                <div className="space-y-6 max-w-4xl mx-auto py-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Summary Receipt */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg text-green-600"><CreditCard className="h-5 w-5" /></div>
                        <h3 className="text-lg font-bold text-gray-900">Summary</h3>
                      </div>

                      <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                        <div className="bg-gray-50 p-6 border-b border-gray-100">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Patient</span>
                          <h4 className="text-xl font-black text-gray-900">{patients.find(p => p.id === selectedPatient)?.name}</h4>
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400 font-bold uppercase text-[10px]">Date & Time</p>
                              <p className="font-bold text-gray-800">{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTimeTo12h(selectedTime)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 font-bold uppercase text-[10px]">Doctor</p>
                              <p className="font-bold text-gray-800">{selectedDoctor}</p>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-dashed border-gray-200 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Service Price</span>
                              <span className="font-bold">₱{finalPrice.toLocaleString()}</span>
                            </div>
                            {Number(discount) > 0 && (
                              <div className="flex justify-between text-sm text-orange-600">
                                <span>Discount</span>
                                <span className="font-bold">-₱{Number(discount).toLocaleString()}</span>
                              </div>
                            )}
                            
                            {/* SMART SUMMARY: Toggles depending on Edit Mode */}
                            {isEditMode ? (
                              <>
                                <div className="flex justify-between text-sm text-gray-600">
                                  <span>Total Price</span>
                                  <span className="font-bold">₱{(finalPrice - Number(discount)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-emerald-600">
                                  <span>Already Paid</span>
                                  <span className="font-bold">-₱{previouslyPaidAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                  <span className="text-base font-black text-gray-900">Balance Left</span>
                                  <span className={`text-2xl font-black ${remainingBalance <= 0 ? 'text-emerald-500' : 'text-blue-600'}`}>
                                    ₱{remainingBalance.toLocaleString()}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <span className="text-base font-black text-gray-900">Total Price</span>
                                <span className="text-2xl font-black text-blue-600">₱{(finalPrice - Number(discount)).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Actions */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-sm font-bold text-gray-700">Amount to Pay Now</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-400">₱</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={amountToPay}
                            onChange={(e: any) => setAmountToPay(e.target.value)}
                            className="h-16 pl-10 text-2xl font-black rounded-3xl border-2 border-gray-100 bg-white"
                            disabled={paymentMethod === "Pay at Clinic"}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-gray-700">Payment Method</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: "GCash", label: "GCash", sub: "Digital Payment", icon: "GC", color: "bg-blue-600" },
                            { id: "Card", label: "Credit Card", sub: "Secure Processing", icon: <CreditCard className="w-5 h-5"/>, color: "bg-indigo-600" },
                            { id: "Pay at Clinic", label: "Pay at Clinic", sub: "Cash on arrival", icon: <Banknote className="w-5 h-5"/>, color: "bg-emerald-600" }
                          ].map((pm) => (
                            <button
                              key={pm.id}
                              onClick={() => { setPaymentMethod(pm.id); if (pm.id === "Pay at Clinic") setAmountToPay("0"); }}
                              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${paymentMethod === pm.id ? 'border-blue-600 bg-blue-50' : 'border-gray-50 bg-white'}`}
                            >
                              <div className="flex items-center gap-4 text-left">
                                <div className={`w-12 h-12 rounded-xl ${pm.color} flex items-center justify-center text-white font-black italic`}>{pm.icon}</div>
                                <div>
                                  <p className="font-bold text-gray-900">{pm.label}</p>
                                  <p className="text-[10px] text-gray-500">{pm.sub}</p>
                                </div>
                              </div>
                              {paymentMethod === pm.id && <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg></div>}
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
                disabled={isBooking || !!durationConflict}
                className="h-14 px-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 min-w-[220px]"
              >
                {isBooking ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <div className="flex items-center gap-3">
                    <span>
                      {modalStep === 'patient' ? 'Next: Schedule' : 
                       modalStep === 'schedule' ? 'Next: Treatment' : 
                       modalStep === 'treatment' ? 'Next: Doctor' : 
                       modalStep === 'doctor' ? 'Next: Summary' : 'Confirm & Save'}
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
                  <span className="font-semibold">Dr. {displayDoctor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                    appointmentStatuses.find(s => s.value === getFinalAppointmentStatus())?.bgColor || 'bg-gray-100'
                  } ${
                    appointmentStatuses.find(s => s.value === getFinalAppointmentStatus())?.textColor || 'text-gray-700'
                  }`}>
                    {getStatusLabel(getFinalAppointmentStatus(), appointmentStatuses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                    getProjectedPaymentStatus() === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    getProjectedPaymentStatus() === 'unpaid' ? 'bg-red-100 text-red-700' :
                    getProjectedPaymentStatus() === 'half-paid' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {getPaymentStatusLabel(getProjectedPaymentStatus(), paymentStatuses)}
                  </span>
                </div>
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
                        <span>₱{(finalPrice - Number(discount)).toLocaleString()}</span>
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
                  <span>₱{(parseFloat(amountToPay) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-blue-700 font-semibold">
                  <span>Remaining Balance:</span>
                  <span>₱{Math.max(0, (finalPrice - Number(discount)) - previouslyPaidAmount - (parseFloat(amountToPay) || 0)).toLocaleString()}</span>
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

      <DatePickerModal open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen} selectedDate={selectedDate} onDateSelect={setSelectedDate} doctorName={selectedDoctor} selectedTime={selectedTime} duration={duration} />
      <TimePickerModal open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen} selectedDate={selectedDate} selectedTime={selectedTime} doctorName={selectedDoctor} duration={duration} onTimeSelect={setSelectedTime} onDateChange={setSelectedDate} excludeAppointmentId={appointmentToEdit?.id} />
    </>
  );
 }
