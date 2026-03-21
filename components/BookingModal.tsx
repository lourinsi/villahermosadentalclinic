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
import { Calendar as CalendarIcon, Clock, Award, Loader2, CheckCircle2, CreditCard, Banknote, Stethoscope, Trash2, ChevronLeft } from "lucide-react";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { formatTimeTo12h } from "@/lib/time-slots";
import { APPOINTMENT_PRICES, APPOINTMENT_TYPES, getAppointmentTypeName } from "@/lib/appointmentTypes";
import { Dialog as SmallDialog, DialogContent as SmallDialogContent, DialogFooter as SmallDialogFooter } from "@/components/ui/dialog";
import { toast } from 'sonner';

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

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultTime?: string;
  doctorName?: string; // doctor's display name
  onBooked?: (apt?: any) => void;
  appointmentToEdit?: any; // optional appointment object to edit
  onDeleted?: (id?: string) => void;
  title?: string; // optional override for dialog title
  isReschedule?: boolean; // new prop to indicate if this is a reschedule
}

export default function BookingModal({ open, onOpenChange, defaultDate, defaultTime, doctorName, onBooked, appointmentToEdit, onDeleted, title, isReschedule }: BookingModalProps) {
  const { user } = useAuth();
  const { addAppointment, deleteAppointment, updateAppointment } = useAppointmentModal();
  const { openPatientPaymentFor } = usePaymentModal();

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

  // New states for two-step flow
  const [modalStep, setModalStep] = useState<"details" | "payment">("details");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountToPay, setAmountToPay] = useState<string>("");
  const [appointmentStatus, setAppointmentStatus] = useState<string>("scheduled");
  const [statusChangedByUser, setStatusChangedByUser] = useState<number>(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmSummaryOpen, setIsConfirmSummaryOpen] = useState(false);

  // read-only for patient viewing their own booked/reserved appointment: only notes editable
  const isPatientReadonly = Boolean(appointmentToEdit && user?.role === 'patient');
  const isEditMode = Boolean(appointmentToEdit);

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
  const basePrice = appointmentType === "Other" ? Number(customPrice) : (APPOINTMENT_PRICES[appointmentType] || 0);
  const finalPrice = appointmentType === "Other" ? basePrice : Math.max(0, basePrice - (Number(discount) || 0));

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
        patientId: appointmentToEdit.patientId,
        patientName: appointmentToEdit.patientName,
        date: appointmentToEdit.date,
        time: appointmentToEdit.time,
        type: appointmentToEdit.type,
        customType: appointmentToEdit.customType,
        duration: appointmentToEdit.duration,
        price: appointmentToEdit.price,
        status: appointmentToEdit.status,
        paymentStatus: appointmentToEdit.paymentStatus,
        totalPaid: appointmentToEdit.totalPaid,
        balance: appointmentToEdit.balance,
        doctor: appointmentToEdit.doctor,
        notes: appointmentToEdit.notes,
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
      setPaymentMethod(appointmentToEdit.paymentMethod || '');
      // Reset the flag when opening for edit
      setStatusChangedByUser(0);
      // ensure we start on details step when opening
      setModalStep('details');
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
      setPaymentMethod('');
      // Reset the flag when opening for new appointment
      setStatusChangedByUser(0);
      setModalStep('details');
    }
  }, [appointmentToEdit, defaultDate, defaultTime, patients]);

  // Derived display values for schedule block
  const displayDoctor = appointmentToEdit?.doctor || doctorName || '—';
  const displayStatus = appointmentToEdit?.status || appointmentStatus;
  
  // Calculate remaining balance for display in payment step
  const previouslyPaidAmount = appointmentToEdit?.totalPaid || 0;
  const remainingBalance = Math.max(0, finalPrice - previouslyPaidAmount);

  // Handler for status changes that sets the flag
  const handleStatusChange = (newStatus: string) => {
    setAppointmentStatus(newStatus);
    setStatusChangedByUser(1);
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
    
    if (appointmentToEdit) {
      const previouslyPaid = appointmentToEdit.totalPaid || 0;
      const newTotalPaid = amountPaid > 0 ? previouslyPaid + amountPaid : previouslyPaid;
      const newBalance = Math.max(0, finalPrice - newTotalPaid);

      if (newBalance <= 0) {
        return statusChangedByUser === 1 ? appointmentStatus : 'scheduled';
      } else if (newTotalPaid > 0) {
        return statusChangedByUser === 1 ? appointmentStatus : 'reserved';
      } else {
        return statusChangedByUser === 1 ? appointmentStatus : 'reserved';
      }
    } else {
      const newBalance = Math.max(0, finalPrice - amountPaid);
      if (amountPaid >= finalPrice) {
        return 'scheduled';
      } else if (amountPaid > 0) {
        return 'reserved';
      } else {
        return 'reserved';
      }
    }
  };

  // Final step: save after confirmation
  const handleConfirmSummary = async () => {
    if (!selectedPatient || !appointmentType) return;
    setIsBooking(true);
    setIsConfirmSummaryOpen(false);
    try {
      const dateStr = formatDateToYYYYMMDD(selectedDate);
      const amountPaidRaw = amountToPay.trim() === '' ? '0' : amountToPay;
      const amountPaid = parseFloat(amountPaidRaw) || 0;

      console.log('[BookingModal Payment] Payment confirmation:', {
        amountToPay,
        amountPaidRaw,
        amountPaid,
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

        // Determine payment status based on final balance
        let updatePaymentStatus: 'paid' | 'unpaid' | 'half-paid' = 'unpaid';
        let updateAppointmentStatus: string = 'reserved';

        if (newBalance <= 0) {
          updatePaymentStatus = 'paid';
          // If fully paid and user hasn't manually changed status, set to scheduled
          updateAppointmentStatus = statusChangedByUser === 1 ? appointmentStatus : 'scheduled';
        } else if (newTotalPaid > 0) {
          updatePaymentStatus = 'half-paid';
          updateAppointmentStatus = statusChangedByUser === 1 ? appointmentStatus : 'reserved';
        } else {
          updatePaymentStatus = 'unpaid';
          updateAppointmentStatus = statusChangedByUser === 1 ? appointmentStatus : 'reserved';
        }

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
          status: updateAppointmentStatus,
          paymentStatus: updatePaymentStatus,
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
        } else {
          toast.success(`Appointment updated successfully!`);
        }
        try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: updated } })); } catch (e) {}
        if (onBooked) onBooked(updated);
        // close modal after updating
        onOpenChange(false);
      } else {
        // create new appointment
        // Map payment amount to appointment status and payment status:
        // - Full payment => paymentStatus: paid, appointment status: scheduled
        // - Partial payment (>0 && < total) => paymentStatus: half-paid, appointment status: reserved
        // - No payment (0) => paymentStatus: unpaid, appointment status: reserved
        let paymentStatus: 'paid' | 'unpaid' | 'half-paid' = 'unpaid';
        let autoStatus: string = 'reserved';

        if (amountPaid >= finalPrice) {
          paymentStatus = 'paid';
          autoStatus = 'scheduled';
        } else if (amountPaid > 0) {
          paymentStatus = 'half-paid';
          autoStatus = 'reserved';
        } else {
          paymentStatus = 'unpaid';
          autoStatus = 'reserved';
        }

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
          status: newBalance <= 0 ? 'scheduled' : autoStatus as any,
          paymentStatus: newBalance <= 0 ? 'paid' : paymentStatus,
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

        toast.success(`Appointment booked with payment of ₱${amountPaid.toLocaleString()}!`);
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
      await deleteAppointment(appointmentToEdit.id);
      try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointmentId: appointmentToEdit.id, newStatus: 'cancelled' } })); } catch (e) {}
      if (onDeleted) onDeleted(appointmentToEdit.id);
      toast?.success?.('Appointment canceled');
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
              
              <DialogTitle className="flex items-center gap-2 text-2xl flex-1 text-center">
                {title ? title : (modalStep === 'details' ? (appointmentToEdit ? 'Edit Appointment' : 'Appointment Details') : 'Payment Summary')}
              </DialogTitle>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setModalStep('details')}
                  disabled={isBooking}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    modalStep === "details"
                      ? "bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                      : "bg-gray-200 text-gray-600 cursor-pointer hover:bg-gray-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Step 1: Details
                </button>
                <button
                  onClick={() => setModalStep('payment')}
                  disabled={isBooking || !selectedPatient || !appointmentType || !duration}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    modalStep === "payment"
                      ? "bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                      : !selectedPatient || !appointmentType || !duration
                      ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                      : "bg-gray-200 text-gray-600 cursor-pointer hover:bg-gray-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Step 2: Payment
                </button>
              </div>
            </div>
            <DialogDescription>
              {modalStep === 'details' ? 'Complete the following information to book your appointment' : 'Review and confirm appointment details and payment'}
            </DialogDescription>
          </DialogHeader>

          {modalStep === 'details' ? (
            <>
              <div className="space-y-6">
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
                          <SelectItem value="Other">{customAppointmentTypeName || "Other"}</SelectItem>
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
                        <Input type="number" value={duration} onChange={(e: any) => setDuration(e.target.value)} placeholder="30" className="h-11 rounded-lg border-gray-200" disabled={isPatientReadonly} />
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
                              appointmentStatus === 'scheduled' ? 'bg-emerald-100 text-emerald-700' :
                              appointmentStatus === 'reserved' ? 'bg-amber-100 text-amber-700' :
                              appointmentStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
                              appointmentStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            appointmentStatus === 'scheduled' ? 'bg-emerald-100 text-emerald-700' :
                            appointmentStatus === 'reserved' ? 'bg-amber-100 text-amber-700' :
                            appointmentStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
                            appointmentStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {String(appointmentStatus).charAt(0).toUpperCase() + String(appointmentStatus).slice(1)}
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
                  <Label className="text-sm font-bold text-gray-700">Notes (Optional)</Label>
                  <Textarea placeholder="Any details you'd like to add..." value={notes} onChange={(e: any) => setNotes(e.target.value)} className="resize-none rounded-lg border-gray-200" rows={3} />
                </div>
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                {/* destructive cancel for all users when editing an appointment */}
                {appointmentToEdit && (
                  <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isBooking} className="h-11 px-4 rounded-lg mr-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isBooking ? 'Canceling...' : 'Cancel Appointment'}
                  </Button>
                )}
                <Button onClick={handleConfirmBooking} disabled={isBooking || !appointmentType || !selectedPatient} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-blue-100">
                  {isBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Next: Payment'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-6">
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
                  />
                  <p className="text-[10px] text-gray-500">Leave blank or enter 0 to skip payment. Remaining balance: ₱{remainingBalance.toLocaleString()}</p>
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
                {isEditMode && (user?.role === "admin" || user?.role === "doctor") && (
                  <div className="space-y-2">
                    <Label htmlFor="appointmentStatus">Appointment Status</Label>
                    <Select value={appointmentStatus} onValueChange={setAppointmentStatus}>
                      <SelectTrigger id="appointmentStatus">
                        <SelectValue placeholder="Select appointment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Status Display - Read-only for Patient */}
                {isEditMode && user?.role === "patient" && (
                  <div className="space-y-2">
                    <Label htmlFor="appointmentStatusReadonly">Appointment Status</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        appointmentStatus === 'scheduled' ? 'bg-emerald-100 text-emerald-700' :
                        appointmentStatus === 'reserved' ? 'bg-amber-100 text-amber-700' :
                        appointmentStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
                        appointmentStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {appointmentStatus.charAt(0).toUpperCase() + appointmentStatus.slice(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                {appointmentToEdit && (
                  <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isBooking} className="h-11 px-4 rounded-lg mr-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isBooking ? 'Canceling...' : 'Cancel Appointment'}
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

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Cancel Appointment
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="h-8 w-8" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-semibold text-gray-900">Cancel this appointment?</p>
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel this appointment? This action cannot be undone and the appointment will be permanently removed from the system.
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
              {isBooking ? "Canceling..." : "Yes, Cancel"}
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
                    getProjectedStatus() === 'scheduled' ? 'bg-emerald-100 text-emerald-700' :
                    getProjectedStatus() === 'reserved' ? 'bg-amber-100 text-amber-700' :
                    getProjectedStatus() === 'completed' ? 'bg-blue-100 text-blue-700' :
                    getProjectedStatus() === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {getProjectedStatus().charAt(0).toUpperCase() + getProjectedStatus().slice(1)}
                  </span>
                </div>
                <div className="border-t border-blue-100 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total Price:</span>
                    <span className="text-blue-700">₱{finalPrice.toLocaleString()}</span>
                  </div>
                </div>
                {(parseFloat(amountToPay) || 0) > 0 && (
                  <>
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Amount to Pay:</span>
                      <span>₱{(parseFloat(amountToPay) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-700 font-semibold">
                      <span>Balance Left:</span>
                      <span>₱{Math.max(0, finalPrice - (previouslyPaidAmount + (parseFloat(amountToPay) || 0))).toLocaleString()}</span>
                    </div>
                  </>
                )}
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
    </>
   );
 }
