import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { useAppointmentStatuses } from "@/hooks/useAppointmentStatuses";
import { usePaymentStatuses } from "@/hooks/usePaymentStatuses";
import { Calendar as CalendarIcon, Clock, Award, Loader2, CheckCircle2, CreditCard, Banknote, Stethoscope, ChevronLeft } from "lucide-react";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { formatTimeTo12h } from "@/lib/time-slots";
import { APPOINTMENT_PRICES, APPOINTMENT_TYPES, getAppointmentTypeName } from "@/lib/appointmentTypes";
import { Dialog as SmallDialog, DialogContent as SmallDialogContent, DialogFooter as SmallDialogFooter } from "@/components/ui/dialog";
import { toast } from 'sonner';
import AppointmentHistoryView from "./AppointmentHistoryView";

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
const getStatusLabel = (statusValue: string, statuses: any[]): string => {
  const status = statuses.find(s => s.value === statusValue);
  return status?.label || statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
};

// Helper function to get payment status label from payment status array
const getPaymentStatusLabel = (statusValue: string, statuses: any[]): string => {
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
  appointmentToEdit?: any; // optional appointment object to edit
  title?: string; // optional override for dialog title
  isReschedule?: boolean; // new prop to indicate if this is a reschedule
  onDeleted?: () => void; // callback when appointment is deleted
}

export default function BookingModal({ open, onOpenChange, defaultDate, defaultTime, doctorName, onBooked, appointmentToEdit, title, isReschedule, onDeleted }: BookingModalProps) {
  const { user } = useAuth();
  const { addAppointment, updateAppointment, isPaymentFlow } = useAppointmentModal();
  const { openPatientPaymentFor } = usePaymentModal();
  const { statuses: appointmentStatuses, isLoading: isLoadingStatuses } = useAppointmentStatuses();
  const { statuses: paymentStatuses, isLoading: isLoadingPaymentStatuses } = usePaymentStatuses();

  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
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
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingPaymentLogs, setIsLoadingPaymentLogs] = useState(false);

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

  // read-only for patient viewing their own booked/reserved appointment: only notes editable
  const isCancelled = (appointmentStatus || appointmentToEdit?.status || '').toLowerCase() === 'cancelled';
  const isPatientReadonly = Boolean(appointmentToEdit && user?.role === 'patient');
  const isEditMode = Boolean(appointmentToEdit);

  // Fetch logs when appointment is being edited
  useEffect(() => {
    if (open && appointmentToEdit?.id) {
      console.log(`[BookingModal] 🔍 FETCHING LOGS for appointment: ${appointmentToEdit.id}`);
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
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
        } finally {
          setIsLoadingLogs(false);
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
        setIsLoadingPaymentLogs(true);
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
        } finally {
          setIsLoadingPaymentLogs(false);
        }
      };
      fetchPaymentLogs();
    } else if (!open) {
      setPaymentLogs([]);
    }
  }, [open, appointmentToEdit]);

  // Map appointment types to default durations (in minutes)
  const appointmentTypeDurations: Record<string, number> = {
    "Routine Cleaning": 30,
    "Checkup": 30,
    "Filling": 60,
    "Root Canal": 90,
    "Extraction": 45,
    "Whitening": 45,
    "Other": 30,
  };

  // Update duration when appointment type changes
  useEffect(() => {
    const defaultDur = appointmentTypeDurations[appointmentType] || 30;
    setDuration(String(defaultDur));
  }, [appointmentType]);

  useEffect(() => {
    setSelectedDate(defaultDate ?? new Date());
  }, [defaultDate]);

  useEffect(() => {
    setSelectedTime(defaultTime ?? "");
  }, [defaultTime]);

  // Price calculations - handle custom types
  // In edit mode, use the appointment's stored price. In create mode, calculate from form
  const basePrice = appointmentType === "Other" ? Number(customPrice) : (APPOINTMENT_PRICES[appointmentType] || 0);
  const finalPrice = appointmentToEdit 
    ? appointmentToEdit.price  // Use stored price when editing
    : (appointmentType === "Other" ? basePrice : Math.max(0, basePrice - (Number(discount) || 0)));

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
    }
  }, [appointmentType, user?.role, duration]);

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
          try { window.dispatchEvent(new CustomEvent('bookingmodal:patients', { detail: { source: user?.role === 'patient' ? 'server-filtered' : 'admin-fetch', count: list.length, patients: list } })); } catch (e) {}
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
        setCustomPrice(String(appointmentToEdit.price || 0));
      } else {
        setAppointmentType(typeName);
      }
      
      setDuration(String(appointmentToEdit.duration || 30));
      setDiscount(String(0));
      setNotes(appointmentToEdit.notes || '');
      setSelectedDate(appointmentToEdit.date ? new Date(appointmentToEdit.date) : (defaultDate ?? new Date()));
      setSelectedTime(appointmentToEdit.time || (defaultTime ?? ''));
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
      // Otherwise, always start with details step
      setModalStep(isPaymentFlow ? 'payment' : 'details');
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
      setModalStep('details');
    }
  }, [appointmentToEdit, defaultDate, defaultTime, patients]);

  // Derived display values for schedule block
  const displayDoctor = formatDoctorName(appointmentToEdit?.doctor || doctorName);
  const displayStatus = appointmentToEdit?.status || appointmentStatus;
  
  // Calculate remaining balance for display in payment step
  const previouslyPaidAmount = appointmentToEdit?.totalPaid !== undefined 
    ? appointmentToEdit.totalPaid 
    : (appointmentToEdit?.price !== undefined && appointmentToEdit?.balance !== undefined)
      ? Math.max(0, appointmentToEdit.price - appointmentToEdit.balance)
      : 0;
  const remainingBalance = Math.max(0, finalPrice - previouslyPaidAmount);

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
    if (!selectedPatient || !appointmentType) return;
    setIsBooking(true);
    try {
      // perform lightweight validation here (conflicts handled elsewhere)
      setModalStep("payment");
    } catch (err) {
      console.error('Booking: details error', err);
    } finally {
      setIsBooking(false);
    }
  };

  // Second step: show summary confirmation before saving
  const handleConfirmPayment = async () => {
    if (!selectedPatient || !appointmentType) return;
    setIsConfirmSummaryOpen(true);
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
        let updatePaymentStatus = getProjectedPaymentStatus();
        
        // Determine appointment status using the new function that includes override logic
        let updateAppointmentStatus = getFinalAppointmentStatus();

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
        try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: updated } })); } catch (e) {}
        if (onBooked) onBooked(updated);
        // close modal after updating
        onOpenChange(false);
      } else {
        // create new appointment
        // Determine payment status
        let paymentStatus = getProjectedPaymentStatus();
        
        // Determine appointment status using the new function that includes override logic
        let autoStatus = getFinalAppointmentStatus();

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
          doctor: doctorName || '',
          date: dateStr,
          time: selectedTime,
          type: getAppointmentTypeIndex(appointmentType),
          customType: appointmentType === "Other" ? customAppointmentTypeName : undefined,
          duration: Number(duration) || 30,
          price: finalPrice,
          notes,
          status: autoStatus as any,
          paymentStatus: paymentStatus as any,
          totalPaid: amountPaid,
          balance: newBalance,
        });

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
        try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: newApt } })); } catch (e) {}
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
      try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: updated, appointmentId: appointmentToEdit.id, newStatus: 'cancelled' } })); } catch (e) {}
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
    setAmountToPay("");
    setCustomAppointmentTypeName("");
    setCustomPrice("0");
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
        <DialogContent className="max-w-2xl">
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
                      <Label className="text-sm font-bold text-gray-700">Who is this appointment for?</Label>
                      <Select value={selectedPatient} onValueChange={setSelectedPatient} disabled={isLoadingPatients || isPatientReadonly}>
                        <SelectTrigger className="h-11 rounded-lg border-gray-200">
                          <SelectValue placeholder={isLoadingPatients ? 'Loading...' : 'Select patient'} />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Duration (mins)</Label>
                        <Select value={duration} onValueChange={setDuration} disabled={isPatientReadonly}>
                          <SelectTrigger className="h-11 rounded-lg border-gray-200">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="60">60</SelectItem>
                            <SelectItem value="90">90</SelectItem>
                            <SelectItem value="120">120</SelectItem>
                          </SelectContent>
                        </Select>
                        {user?.role === 'patient' && <p className="text-xs text-gray-500">Set based on appointment type</p>}
                      </div>
                      {appointmentType === "Other" ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-gray-700">Price ($)</Label>
                          <Input type="number" min="0" step="0.01" value={customPrice} onChange={(e: any) => setCustomPrice(e.target.value)} placeholder="0.00" className="h-11 rounded-lg border-gray-200" disabled={isPatientReadonly} />
                        </div>
                      ) : user?.role !== 'patient' ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-gray-700">Discount</Label>
                          <Input type="number" value={discount} onChange={(e: any) => setDiscount(e.target.value)} placeholder="0" className="h-11 rounded-lg border-gray-200" disabled={isPatientReadonly} />
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Total Price</Label>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-lg font-bold text-blue-700">₱{finalPrice.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 mt-1">Base price for {appointmentType === "Other" ? (customAppointmentTypeName || "Other") : (appointmentType || 'selected type')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Selected Schedule</Label>
                    <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <CalendarIcon className="h-4 w-4 text-violet-500" />
                          <div className="font-medium">{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                        {/* Status - Dropdown for Admin/Doctor, Badge for Patient */}
                        {user?.role === "admin" || user?.role === "doctor" ? (
                          <Select value={appointmentStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className={`h-8 px-3 rounded-full text-xs font-bold border-0 w-auto ${
                              appointmentStatuses.find(s => s.value === appointmentStatus)?.bgColor || 'bg-gray-100'
                            } ${
                              appointmentStatuses.find(s => s.value === appointmentStatus)?.textColor || 'text-gray-700'
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {appointmentStatuses.map((status: any) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            appointmentStatuses.find(s => s.value === appointmentStatus)?.bgColor || 'bg-gray-100'
                          } ${
                            appointmentStatuses.find(s => s.value === appointmentStatus)?.textColor || 'text-gray-700'
                          }`}>
                            {getStatusLabel(appointmentStatus, appointmentStatuses)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <Clock className="h-4 w-4 text-violet-500" />
                          <div className="font-medium">{selectedTime ? formatTimeTo12h(selectedTime) : '—'}</div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <Stethoscope className="h-4 w-4 text-violet-500" />
                          <div className="font-medium">Dr. {displayDoctor}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700">
                    {user?.role === 'patient' ? 'My Notes' : 'Notes (Optional)'}
                  </Label>
                  <Textarea 
                    placeholder={user?.role === 'patient' ? "Add any notes for your dentist here..." : "Any details you'd like to add..."}
                    value={notes} 
                    onChange={(e: any) => setNotes(e.target.value)} 
                    className="resize-none rounded-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500" 
                    rows={3} 
                    disabled={isPatientReadonly && isCancelled}
                  />
                </div>

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
                                  {new Date(log.changedAt).toLocaleString('en-PH', { 
                                    month: 'numeric', 
                                    day: 'numeric', 
                                    year: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
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

                                    {/* Show notes if they were updated or exist in this log AND are not empty */}
                                    {(log.newState?.notes !== undefined && log.newState.notes !== log.previousState?.notes && log.newState.notes.trim() !== '' && log.newState.notes.trim() !== '-') && (
                                      <div className="mt-1.5 p-1.5 bg-blue-50/50 rounded border border-blue-100/50">
                                        <p className="text-[10px] text-blue-800 font-semibold mb-0.5">{user?.role === 'patient' ? 'Note added:' : 'Notes updated:'}</p>
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
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-blue-100"
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
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="font-bold">Total Price:</span>
                    <span className="font-bold text-lg text-gray-900">₱{finalPrice.toLocaleString()}</span>
                  </div>
                  {appointmentToEdit && previouslyPaidAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Already Paid:</span>
                      <span className="text-sm font-semibold text-green-600">₱{previouslyPaidAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Remaining Balance:</span>
                    <span className="font-bold text-lg text-blue-600">₱{remainingBalance.toLocaleString()}</span>
                  </div>
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

                {/* Status Field - Only for Admin/Doctor in Edit Mode */}
                {/* {isEditMode && (user?.role === "admin" || user?.role === "doctor") && (
                  <div className="space-y-2">
                    <Label htmlFor="appointmentStatus">Appointment Status</Label>
                    <Select value={appointmentStatus} onValueChange={handleStatusChange}>
                      <SelectTrigger id="appointmentStatus">
                        <SelectValue placeholder="Select appointment status" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentStatuses.map((status: any) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )} */}

                {/* Payment Status Display - Read-only for Patient, Editable for Admin/Doctor */}
                {isEditMode && (
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus" className="text-sm font-semibold">Payment Status</Label>
                    {user?.role === "patient" ? (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          paymentStatus === 'unpaid' ? 'bg-red-100 text-red-700' :
                          paymentStatus === 'half-paid' ? 'bg-amber-100 text-amber-700' :
                          paymentStatus === 'overdue' ? 'bg-orange-100 text-orange-700' :
                          paymentStatus === 'pay-at-clinic' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {getPaymentStatusLabel(paymentStatus, paymentStatuses)}
                        </span>
                      </div>
                    ) : (
                      <Select value={paymentStatus} onValueChange={handlePaymentStatusChange}>
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
                    <span className="text-blue-700">₱{finalPrice.toLocaleString()}</span>
                  </div>
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
                  <span>₱{Math.max(0, finalPrice - previouslyPaidAmount - (parseFloat(amountToPay) || 0)).toLocaleString()}</span>
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
    </>
   );
 }
