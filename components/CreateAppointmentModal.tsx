"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { useAuth } from "@/hooks/useAuth";
import { useDoctors } from "@/hooks/useDoctors";
import { toast } from "sonner";
import { APPOINTMENT_TYPES, getAppointmentPrice } from "@/lib/appointment-types";
import { APPOINTMENT_STATUSES } from "@/lib/appointment-statuses";
import { TIME_SLOTS, formatTimeTo12h } from "@/lib/time-slots";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { Appointment } from "@/hooks/useAppointments";
import { APPOINTMENT_PRICES, getAppointmentTypeName } from "@/lib/appointmentTypes";
import { ChevronsUpDown, Calendar, Clock, User, Check, ChevronRight, ChevronLeft, Loader2, Stethoscope, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { DoctorCalendar } from "@/components/DoctorCalendar";
import { useRouter } from "next/navigation";

interface AppointmentFormData {
  patientName: string;
  patientId: string;
  date: string;
  time: string;
  duration: number;
  type: number;
  customType?: string;
  price?: number;
  discount?: number;
  doctor: string;
  notes: string;
  status: string;
  paymentStatus: "paid" | "unpaid" | "overdue" | "half-paid";
  balance: number;
}

interface ApiPatient {
  id: string;
  firstName: string;
  lastName: string;
}

interface PatientSelectItem {
  id: string;
  name: string;
}

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
  return typeMap[typeName] ?? 0;
};

export function CreateAppointmentModal() {
  const router = useRouter();
  const { 
    isCreateModalOpen,
    closeCreateModal,
    newAppointmentDate,
    newAppointmentTime,
    addAppointment, 
    refreshPatients, 
    refreshAppointments
  } = useAppointmentModal();
  const { user } = useAuth();
  const { doctors, isLoadingDoctors, reloadDoctors } = useDoctors();

  const [step, setStep] = useState(1);
  const [dateAppointments, setDateAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [patients, setPatients] = useState<PatientSelectItem[]>([]);
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientInputValue, setPatientInputValue] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [hasMorePatients, setHasMorePatients] = useState(true);
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState<AppointmentFormData>({
    patientName: "",
    patientId: "",
    date: "",
    time: "",
    duration: 30,
    type: -1,
    customType: "",
    price: 0,
    discount: 0,
    doctor: user?.role === "doctor" ? user.username : "",
    notes: "",
    status: "scheduled",
    paymentStatus: "unpaid",
    balance: 0
  });

  // New payment-related state
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentTransactionId, setPaymentTransactionId] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  const recalcBalance = (price: number, discount?: number) => {
    const d = discount || 0;
    return Math.max(0, price - d);
  };

  // single observer ref
  const observer = useRef<IntersectionObserver | null>(null);
  // ref to detect modal open transition (false -> true)
  const prevOpenRef = useRef(false);

  const lastPatientElementRef = useCallback((node: HTMLButtonElement | null) => {
    if (isLoadingPatients) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMorePatients) {
        setPatientPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoadingPatients, hasMorePatients]);

  // fetchPatients - note: does not depend on formData to avoid re-creating
  const fetchPatients = useCallback(async (page: number) => {
    setIsLoadingPatients(true);
    try {
      let url = `http://localhost:3001/api/patients?page=${page}&limit=20`;
      
      // If user is a doctor, filter by their patients only
      if (user?.role === "doctor" && user?.username) {
        url += `&doctor=${encodeURIComponent(user.username)}`;
      }
      
      console.log("CreateAppointmentModal: fetchPatients", { url, role: user?.role, username: user?.username });
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        const list: PatientSelectItem[] = json.data.map((p: ApiPatient) => ({ 
          id: String(p.id), 
          name: `${p.firstName} ${p.lastName}` 
        }));

        setPatients(prev => {
          const newList = page === 1 ? list : [...prev, ...list];
          return newList.filter((patient: PatientSelectItem, index: number, self: PatientSelectItem[]) => 
            index === self.findIndex((p: PatientSelectItem) => p.id === patient.id)
          );
        });

        if (json.meta) {
          setHasMorePatients(json.meta.page < json.meta.totalPages);
        } else {
          setHasMorePatients(false);
        }
      }
    } catch (err) {
      console.error("Failed to load patients:", err);
      toast.error("Failed to load patients.");
    } finally {
      setIsLoadingPatients(false);
    }
  }, [user?.role, user?.username]);

  useEffect(() => {
    console.log("CreateAppointmentModal: useEffect(isCreateModalOpen) - entered", { isCreateModalOpen, role: user?.role });
    // Only initialize when modal transitions from closed -> open
    if (!prevOpenRef.current && isCreateModalOpen) {
      // If the opener is an admin or a patient, redirect instead of opening the modal
      if (user?.role === "admin") {
        console.log("CreateAppointmentModal: redirecting admin to /admin/find-doctors");
        closeCreateModal();
        router.push("/admin/find-doctors");
        prevOpenRef.current = isCreateModalOpen;
        return;
      }

      // NOTE: Patients should be allowed to open the create appointment modal
      // from the doctor booking pages. Do not redirect patients here.

      let dateStr = "";
      if (newAppointmentDate) {
        const year = newAppointmentDate.getFullYear();
        const month = (newAppointmentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = newAppointmentDate.getDate().toString().padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      const newFormData: AppointmentFormData = {
        patientName: "",
        patientId: "",
        date: dateStr,
        time: newAppointmentTime || "",
        duration: 30,
        type: -1,
        customType: "",
        price: 0,
        doctor: user?.role === "doctor" ? user.username : "",
        notes: "",
        status: "scheduled",
        paymentStatus: "unpaid",
        balance: 0
      };

      console.log("CreateAppointmentModal: initializing formData", { dateStr, newAppointmentTime, doctor: newFormData.doctor });

      setFormData(newFormData);
      setShowNewPatient(false);
      setShowCustomTypeInput(false);
      setStep(1);
      setPatientPage(1);
      setPatients([]);
      console.log("CreateAppointmentModal: setStep(1) on modal open, starting patient fetch");
      reloadDoctors();

      // Prefetch patients for step 2
      fetchPatients(1);
    }
    prevOpenRef.current = isCreateModalOpen;
  }, [isCreateModalOpen, newAppointmentDate, newAppointmentTime, reloadDoctors, user?.role, user?.username, router, closeCreateModal, fetchPatients]);

  // Log step / patient changes for debugging
  useEffect(() => {
    console.log("CreateAppointmentModal: state changed", {
      step,
      patientId: formData.patientId,
      patientName: formData.patientName,
      date: formData.date,
      time: formData.time
    });
  }, [step, formData.patientId, formData.patientName, formData.date, formData.time]);

  useEffect(() => {
    const fetchDateAppointments = async () => {
      if (!formData.date || !isCreateModalOpen) {
        setDateAppointments([]);
        return;
      }
      try {
        const response = await fetch(`http://localhost:3001/api/appointments?startDate=${formData.date}&endDate=${formData.date}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });
        const result = await response.json();
        if (result.success) {
          setDateAppointments(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching appointments for date:", error);
      }
    };

    fetchDateAppointments();
  }, [formData.date, isCreateModalOpen]);

  useEffect(() => {
    if (patientPage > 1) {
      fetchPatients(patientPage);
    }
  }, [patientPage, fetchPatients]);

  // Initialize paymentAmount whenever balance/price/discount or modal opens
  useEffect(() => {
    const amt = typeof formData.balance === "number"
      ? formData.balance
      : (formData.price ?? 0) - (formData.discount ?? 0);
    setPaymentAmount(Number((amt ?? 0)));
  }, [formData.balance, formData.price, formData.discount, isCreateModalOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      // validation before submit (final)
      if (!formData.patientName || !formData.date || !formData.time || formData.type < 0 || !(formData.doctor || user?.role === "doctor") || formData.price === undefined || formData.price < 0) {
        toast.error("Please fill in all required fields and ensure price is valid.");
        return;
      }
      if (formData.type === APPOINTMENT_TYPES.length - 1 && !formData.customType) {
        toast.error("Please specify the appointment type for 'Other'.");
        return;
      }

      const selectedDate = new Date(`${formData.date}T00:00:00`);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (selectedDate < today) {
        toast.error("Cannot schedule an appointment for a past date.");
        return;
      }

      setIsLoading(true);

      // create patient if needed (reuse existing new-patient logic)
      let patientId = formData.patientId;
      let patientName = formData.patientName;

      if (showNewPatient && formData.patientName) {
        const names = formData.patientName.trim().split(" ");
        const firstName = names.shift() || formData.patientName;
        const lastName = names.join(" ") || "";
        const res = await fetch("http://localhost:3001/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email: "", phone: "" })
        });
        const json = await res.json();
        if (!res.ok || !json?.success || !json.data) {
          toast.error(json?.message || "Failed to create patient");
          setIsLoading(false);
          return;
        }
        patientId = String(json.data.id);
        patientName = `${firstName} ${lastName}`.trim();
        setPatients(prev => [{ id: patientId, name: patientName }, ...prev]);
        refreshPatients();
      }

      // overlap checks and addAppointment
      const [selHours, selMinutes] = formData.time.split(':').map(Number);
      const newStart = selHours * 60 + selMinutes;
      const newEnd = newStart + formData.duration;

      const hasOverlapSameDoctor = dateAppointments.some(apt => {
        if (apt.status === 'cancelled') return false;
        if (String(apt.doctor) !== String(formData.doctor)) return false;
        const [aptH, aptM] = apt.time.split(':').map(Number);
        const aptStart = aptH * 60 + aptM;
        const aptEnd = aptStart + (apt.duration || 30);
        return (newStart < aptEnd) && (newEnd > aptStart);
      });

      const hasOverlapSamePatient = dateAppointments.some(apt => {
        if (apt.status === 'cancelled') return false;
        const samePatient = (patientId && apt.patientId && String(apt.patientId) === String(patientId)) || (!patientId && String(apt.patientName) === String(patientName)) || (patientId && !apt.patientId && String(apt.patientName) === String(patientName));
        if (!samePatient) return false;
        const [aptH, aptM] = apt.time.split(':').map(Number);
        const aptStart = aptH * 60 + aptM;
        const aptEnd = aptStart + (apt.duration || 30);
        return (newStart < aptEnd) && (newEnd > aptStart);
      });

      if (hasOverlapSameDoctor) {
        toast.error("Selected doctor is not available at that time.");
        setIsLoading(false);
        return;
      }
      if (hasOverlapSamePatient) {
        toast.error("Selected patient already has an overlapping appointment.");
        setIsLoading(false);
        return;
      }

      await addAppointment({
        patientName: patientName,
        patientId: patientId || patientName,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        type: formData.type,
        customType: formData.customType,
        price: formData.price,
        doctor: formData.doctor,
        notes: formData.notes,
        status: formData.status as "scheduled" | "pending" | "tentative" | "completed" | "cancelled" | "To Pay",
        paymentStatus: formData.paymentStatus,
        balance: formData.balance
      });

      toast.success("Appointment created successfully!");
      refreshAppointments();
      closeCreateModal();
    } catch (error) {
      console.error("Error creating appointment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create appointment";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedPatients = useMemo(() => {
    const selectedPatientId = formData.patientId;
    if (!selectedPatientId) return patients;

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    if (!selectedPatient) return patients;

    const filteredPatients = patients.filter(p => p.id !== selectedPatientId);
    return [selectedPatient, ...filteredPatients];
  }, [patients, formData.patientId]);

  const isSlotBusy = useCallback((time: string, duration: number) => {
    if (!formData.date || !dateAppointments) return false;
    if (!formData.doctor) return false;

    const [hours, minutes] = time.split(':').map(Number);
    const newStart = hours * 60 + minutes;
    const newEnd = newStart + duration;

    return dateAppointments.some(apt => {
      if (apt.status === 'cancelled') return false;
      if (String(apt.doctor) !== String(formData.doctor)) return false;

      const [aptHours, aptMinutes] = String(apt.time).split(':').map(Number);
      const aptStart = aptHours * 60 + aptMinutes;
      const aptDuration = apt.duration || 30;
      const aptEnd = aptStart + aptDuration;

      return (newStart < aptEnd) && (newEnd > aptStart);
    });
  }, [formData.date, formData.doctor, dateAppointments]);

  // mark a time slot as passed if its datetime is earlier than now (local time)
  const isSlotPassed = useCallback((time: string) => {
    if (!formData.date) return false;
    try {
      const [y, m, d] = formData.date.split('-').map(Number);
      const [h, mi] = time.split(':').map(Number);
      const slotDate = new Date();
      slotDate.setFullYear(y, (m || 1) - 1, d || 1);
      slotDate.setHours(h, mi, 0, 0);
      return slotDate < new Date();
    } catch (err) {
      return false;
    }
  }, [formData.date]);

  // update: step indicator now has 4 steps (select, patient, payment, review)
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-1">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center flex-1">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
            step >= s 
              ? "bg-blue-600 text-white shadow-lg" 
              : "bg-gray-200 text-gray-600"
          )}>
            {step > s ? <Check className="w-5 h-5" /> : s}
          </div>
          {s < 4 && (
            <div className={cn(
              "flex-1 h-1 mx-2 transition-all",
              step > s ? "bg-blue-600" : "bg-gray-200"
            )} />
          )}
        </div>
      ))}
    </div>
  );

  // renderStep1: calendar/time + service inputs (all inputs below calendar)
  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Stethoscope className="w-5 h-5 text-blue-600" />
        Select Doctor, Service & Date/Time
      </h3>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 border-r border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-4">Select Date</h4>
            <DoctorCalendar
              selectedDate={formData.date ? new Date(formData.date) : new Date()}
              onSelect={(date: Date | null) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = (date.getMonth() + 1).toString().padStart(2, '0');
                  const day = date.getDate().toString().padStart(2, '0');
                  setFormData(prev => ({ ...prev, date: `${year}-${month}-${day}` }));
                }
              }}
              disabled={(date: Date) => date < new Date(new Date().setHours(0,0,0,0))}
            />
          </div>

          <div className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4">
              {formData.date
                ? new Date(formData.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
                : "Select a date"}
            </h4>

            {!formData.date ? (
              <div className="flex-1 flex items-center justify-center text-center opacity-50 py-8">
                <div>
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Choose a date to see available times</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                {TIME_SLOTS.map((slot) => {
                  const busy = isSlotBusy(slot, formData.duration);
                  const passed = isSlotPassed(slot);
                  const disabledSlot = busy || passed;
                  const isSelected = formData.time === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={disabledSlot}
                      onClick={() => setFormData(prev => ({ ...prev, time: slot }))}
                      className={`
                        w-full px-4 py-3 rounded-lg text-sm font-medium transition-all border
                        ${isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : disabledSlot
                          ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed opacity-50"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:shadow-sm"}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span>{formatTimeTo12h(slot)}</span>
                        {busy ? <span className="text-xs">(Booked)</span> : passed ? <span className="text-xs">(Passed)</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100">
          <div className="grid grid-cols-1 gap-4">
            {user?.role === "doctor" ? (
              <div>
                <Label className="text-sm">Doctor</Label>
                <div className="p-3 bg-gray-50 rounded-md text-sm font-medium text-gray-700">
                  {formData.doctor || user.username}
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-sm">Doctor *</Label>
                <Select
                  value={formData.doctor}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, doctor: value }))}
                >
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDoctors ? (
                      <div className="p-2 text-sm text-gray-500">Loading doctors...</div>
                    ) : (
                      doctors.map((doc) => <SelectItem key={doc.id} value={doc.name || String(doc.id)}>{doc.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-sm">Service Type *</Label>
              <Select
                value={String(formData.type)}
                onValueChange={(value) => {
                  const typeIndex = parseInt(value);
                  const price = APPOINTMENT_PRICES[APPOINTMENT_TYPES[typeIndex]] || 0;
                  setFormData(prev => ({ ...prev, type: typeIndex, customType: "", price, balance: recalcBalance(price, prev.discount ?? 0) }));
                  setShowCustomTypeInput(typeIndex === APPOINTMENT_TYPES.length - 1);
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t, i) => <SelectItem key={i} value={String(i)}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {showCustomTypeInput && (
              <div>
                <Label className="text-sm">Please specify</Label>
                <Input value={formData.customType} onChange={(e) => setFormData(prev => ({ ...prev, customType: e.target.value }))} placeholder="e.g., Denture Fitting" />
              </div>
            )}

            <div>
              <Label className="text-sm">Duration (mins)</Label>
              <Select value={String(formData.duration)} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}>
                <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15,30,45,60,90,120].map(m => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <Label className="text-sm">Price ($)</Label>
                <Input readOnly value={formData.price !== undefined ? String(typeof formData.price === "number" ? formData.price.toFixed(2) : formData.price) : ""} />
              </div>
              <div>
                <Label className="text-sm">Discount ($)</Label>
                <Input type="number" min={0} step="0.01" value={formData.discount ?? ""} onChange={(e) => {
                  const discount = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, discount, balance: recalcBalance(prev.price ?? 0, discount) }));
                }} />
              </div>
              <div>
                <Label className="text-sm">Balance ($)</Label>
                <Input readOnly value={formData.balance !== undefined ? String(formData.balance.toFixed(2)) : ""} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // renderStep2: patient selection / create
  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600" />
        Select Patient
      </h3>

      {!showNewPatient ? (
        <div className="space-y-3">
          <Label className="text-base font-medium">Patient Name *</Label>
          <div className="relative">
            <Input
              placeholder="Search or select a patient..."
              value={patientInputValue}
              onChange={(e) => { setPatientInputValue(e.target.value); setPatientSearch(e.target.value); setOpen(true); }}
              onFocus={() => { 
                setOpen(true); 
                if (patients.length === 0) { 
                  setPatientPage(1); 
                  fetchPatients(1); 
                } 
              }}
              className="w-full"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>

            {open && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {(() => {
                    const filteredPatients = sortedPatients.filter((p) => p.name.toLowerCase().includes(patientSearch.toLowerCase()));
                    const isSearching = patientSearch !== "";
                    const hasNoResults = isSearching && filteredPatients.length === 0 && !isLoadingPatients;

                    return (
                      <>
                        {patientSearch === "" && (
                          <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md text-blue-600 font-medium flex items-center gap-2"
                            onClick={() => { setStep(prev => Math.max(prev,2)); setShowNewPatient(true); setFormData(prev => ({ ...prev, patientId: "", patientName: "" })); setPatientInputValue(""); setOpen(false); }}>
                            <span>+</span> Create New Patient
                          </button>
                        )}

                        {filteredPatients.length > 0 && (
                          <>
                            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Existing Patients</div>
                            {filteredPatients.map((p, index) => (
                              <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition"
                                onClick={() => { console.log("CreateAppointmentModal: existing patient selected", { id: p.id, name: p.name }); setStep(prev => Math.max(prev,2)); setShowNewPatient(false); setFormData(prev => ({ ...prev, patientId: p.id, patientName: p.name })); setPatientInputValue(p.name); setOpen(false); }}
                                ref={index === filteredPatients.length - 1 ? lastPatientElementRef : undefined}>
                                <div className="font-medium text-gray-900">{p.name}</div>
                              </button>
                            ))}
                          </>
                        )}

                        {hasNoResults && (
                          <>
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">No patients found</div>
                            <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md text-blue-600 font-medium flex items-center gap-2"
                              onClick={() => { setStep(prev => Math.max(prev,2)); setShowNewPatient(true); setFormData(prev => ({ ...prev, patientId: "", patientName: "" })); setPatientInputValue(""); setOpen(false); }}>
                              <span>+</span> Create New Patient Instead
                            </button>
                          </>
                        )}

                        {isLoadingPatients && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading patients...
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {formData.patientName && !showNewPatient && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center"><Check className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-sm font-medium text-gray-900">Patient Selected</p><p className="text-sm text-gray-600">{formData.patientName}</p></div>
            </div>
          )}

          {!formData.patientName && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg"><p className="text-sm text-amber-800">👉 Search for an existing patient or create a new one</p></div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setShowNewPatient(false)}>← Back to Patient Search</Button>
          <div className="space-y-2">
            <Label className="text-base font-medium">New Patient Name *</Label>
            <Input placeholder="Enter first and last name" value={formData.patientName} onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))} autoFocus required />
            <p className="text-xs text-gray-500">e.g., John Doe</p>
          </div>

          {formData.patientName && <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-sm font-medium text-gray-900">New patient will be created as:</p><p className="text-sm text-blue-600 font-semibold mt-1">{formData.patientName}</p></div>}
        </div>
      )}
    </div>
  );

  // Replace renderStep3 (previously service details) with Payment UI
  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        Payment
      </h3>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div>
             <Label>Amount Due ($)</Label>
             <Input readOnly value={String(((formData.balance ?? (formData.price ?? 0) - (formData.discount ?? 0)) || 0).toFixed(2))} />
           </div>

           <div>
             <Label>Payment Method</Label>
             <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(String(v))}>
               <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="Cash">Cash</SelectItem>
                 <SelectItem value="Card">Card</SelectItem>
                 <SelectItem value="Pay at Clinic">Pay at Clinic</SelectItem>
                 <SelectItem value="GCash">GCash</SelectItem>
               </SelectContent>
             </Select>
           </div>

           <div>
             <Label>Status</Label>
             <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: String(v) }))}>
               <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
               <SelectContent>
                 {APPOINTMENT_STATUSES.map((status) => (
                   <SelectItem key={status.value} value={status.value}>
                     {status.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           <div>
             <Label>Amount to Pay Now ($)</Label>
             <Input type="number" min={0} step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value || 0))} />
           </div>
         </div>

         <div>
           <Label>Transaction ID (optional)</Label>
           <Input placeholder="Txn ID or reference" value={paymentTransactionId} onChange={(e) => setPaymentTransactionId(e.target.value)} />
         </div>

         <div>
           <Label>Notes</Label>
           <Textarea placeholder="Payment notes (optional)" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
         </div>
       </div>
     </div>
   );

  // Step 4 => Summary + finalize
  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2"><Check className="w-5 h-5 text-blue-600" /> Review & Confirm</h3>

      <div className="bg-white rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Patient</p>
            <p className="font-medium">{formData.patientName || "—"}</p>
            <p className="text-sm text-gray-500">{formData.patientId ? `ID: ${formData.patientId}` : ""}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Doctor</p>
            <p className="font-medium">{formData.doctor || user?.username || "—"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Date & Time</p>
            <p className="font-medium">{formData.date} {formData.time ? `• ${formatTimeTo12h(formData.time)}` : ""}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Service</p>
            <p className="font-medium">{formData.type >= 0 ? (APPOINTMENT_TYPES[formData.type] || formData.customType) : "—"}</p>
            <p className="text-sm text-gray-500">{formData.duration} min</p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm text-gray-600">Payment Preview</p>
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-sm">Method</p>
              <p className="font-medium">{paymentMethod}</p>
            </div>
            <div>
              <p className="text-sm">Amount to Pay Now</p>
              <p className="font-medium">${paymentAmount.toFixed(2)}</p>
            </div>
          </div>
          {paymentTransactionId && <p className="text-xs text-gray-500 mt-2">Txn: {paymentTransactionId}</p>}
          {paymentNotes && <p className="text-xs text-gray-500 mt-1">{paymentNotes}</p>}
        </div>
      </div>
    </div>
  );

  // update validateStep to include payment requirements and 4-step flow
  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.doctor || user?.role === "doctor") && formData.type >= 0 && !!formData.date && !!formData.time;
      case 2:
        return !!formData.patientName;
      case 3:
        // payment: amount to pay now should not exceed balance (allow pay-at-clinic)
        if (paymentMethod === "Pay at Clinic") return true;
        return paymentAmount >= 0 && paymentAmount <= (formData.balance ?? (formData.price ?? 0) - (formData.discount ?? 0));
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Replace handleSubmit (previous finalizer) with finalizeCreation that also posts payment
  const finalizeCreation = async () => {
    try {
      if (!validateStep(4)) {
        toast.error("Validation failed, please review.");
        return;
      }
      setIsLoading(true);

      // create patient if needed (reuse existing new-patient logic)
      let patientId = formData.patientId;
      let patientName = formData.patientName;

      if (showNewPatient && formData.patientName) {
        const names = formData.patientName.trim().split(" ");
        const firstName = names.shift() || formData.patientName;
        const lastName = names.join(" ") || "";
        const res = await fetch("http://localhost:3001/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email: "", phone: "" })
        });
        const json = await res.json();
        if (!res.ok || !json?.success || !json.data) {
          toast.error(json?.message || "Failed to create patient");
          setIsLoading(false);
          return;
        }
        patientId = String(json.data.id);
        patientName = `${firstName} ${lastName}`.trim();
        setPatients(prev => [{ id: patientId, name: patientName }, ...prev]);
        refreshPatients();
      }

      // overlap checks (reuse existing logic)
      const [selHours, selMinutes] = formData.time.split(':').map(Number);
      const newStart = selHours * 60 + selMinutes;
      const newEnd = newStart + formData.duration;

      const hasOverlapSameDoctor = dateAppointments.some(apt => {
        if (apt.status === 'cancelled') return false;
        if (String(apt.doctor) !== String(formData.doctor)) return false;
        const [aptH, aptM] = apt.time.split(':').map(Number);
        const aptStart = aptH * 60 + aptM;
        const aptEnd = aptStart + (apt.duration || 30);
        return (newStart < aptEnd) && (newEnd > aptStart);
      });

      const hasOverlapSamePatient = dateAppointments.some(apt => {
        if (apt.status === 'cancelled') return false;
        const samePatient = (patientId && apt.patientId && String(apt.patientId) === String(patientId)) || (!patientId && String(apt.patientName) === String(patientName)) || (patientId && !apt.patientId && String(apt.patientName) === String(patientName));
        if (!samePatient) return false;
        const [aptH, aptM] = apt.time.split(':').map(Number);
        const aptStart = aptH * 60 + aptM;
        const aptEnd = aptStart + (apt.duration || 30);
        return (newStart < aptEnd) && (newEnd > aptStart);
      });

      if (hasOverlapSameDoctor) {
        toast.error("Selected doctor is not available at that time.");
        setIsLoading(false);
        return;
      }
      if (hasOverlapSamePatient) {
        toast.error("Selected patient already has an overlapping appointment.");
        setIsLoading(false);
        return;
      }

      // create appointment
      const newApt = await addAppointment({
        patientName: patientName,
        patientId: patientId || patientName,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        type: formData.type,
        customType: formData.type === 6 ? formData.customType : undefined,
        price: formData.price,
        doctor: formData.doctor,
        notes: formData.notes,
        status: formData.status as "scheduled" | "pending" | "reserved" | "completed" | "cancelled",
        paymentStatus: formData.paymentStatus,
        balance: formData.balance
      });

      // If payment amount > 0 or Pay at Clinic chosen, create payment record
      if (paymentAmount > 0 || paymentMethod === "Pay at Clinic") {
        try {
          await fetch("http://localhost:3001/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              appointmentId: newApt?.id || (newApt && newApt.id),
              patientId: patientId || patientName,
              amount: paymentAmount,
              method: paymentMethod,
              date: new Date().toISOString().split('T')[0],
              transactionId: paymentTransactionId || undefined,
              notes: paymentNotes || undefined
            })
          });
        } catch (err) {
          console.error("Payment create failed:", err);
        }
      }

      toast.success("Appointment created successfully.");
      refreshAppointments();
      closeCreateModal();
    } catch (err) {
      console.error("Finalization error:", err);
      toast.error("Failed to create appointment.");
    } finally {
      setIsLoading(false);
    }
  };

  // update rendering mapping to include step 4
  const renderStepContent = () => {
    switch(step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3(); // payment
      case 4: return renderStep4(); // summary
      default: return null;
    }
  };

  // ensure patient selection keeps step >=2
  // in renderStep2 use setStep(prev => Math.max(prev,2)) when selecting/opening create patient (already done)

  const handleNext = () => {
    console.log("CreateAppointmentModal: handleNext called", { step });
    if (validateStep(step)) {
      setStep(prev => {
        const next = prev + 1;
        console.log("CreateAppointmentModal: advancing step", { from: prev, to: next });
        return next;
      });
    } else {
      console.log("CreateAppointmentModal: validateStep failed", { step, formData });
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrevious = () => {
    console.log("CreateAppointmentModal: handlePrevious called", { step });
    setStep(prev => {
      const next = Math.max(1, prev - 1);
      console.log("CreateAppointmentModal: stepping back", { from: prev, to: next });
      return next;
    });
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && closeCreateModal()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {renderStepIndicator()}

          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              {step === 4 ? (
                <Button
                  type="button"
                  onClick={() => finalizeCreation()}
                  disabled={isLoading}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Appointment
                    </>
                  )}
                </Button>
              ) : (
                 <Button
                   type="button"
                   onClick={handleNext}
                   className="gap-2"
                 >
                   Next
                   <ChevronRight className="w-4 h-4" />
                 </Button>
               )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}