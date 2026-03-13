"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDoctors } from "@/hooks/useDoctors";
import { useAppointments } from "@/hooks/useAppointments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DoctorCalendar } from "@/components/DoctorCalendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Award,
  Mail,
  CheckCircle2,
  CreditCard,
  Banknote,
} from "lucide-react";
import { TIME_SLOTS, formatTimeTo12h } from "@/lib/time-slots";
import { formatDateToYYYYMMDD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ViewMode from "@/components/viewMode";
import { toast } from "sonner";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { Input } from "@/components/ui/input";
import { APPOINTMENT_PRICES } from "@/lib/appointment-types";

// Map numeric type IDs to appointment type strings
const APPOINTMENT_TYPE_MAP: { [key: number]: string } = {
  0: "Other",
  1: "Routine Cleaning",
  2: "Checkup",
  3: "Filling",
  4: "Root Canal",
  5: "Extraction",
  6: "Whitening",
};

const AdminBookAppointmentPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { doctors } = useDoctors();
  const { appointments: doctorAppointments, addAppointment } = useAppointments();
  const { openPatientPaymentFor } = usePaymentModal();

  const doctorIdParam = searchParams.get("doctorId");

  const [selectedDoctor, setSelectedDoctor] = useState(doctorIdParam || "");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalStep, setEditModalStep] = useState<"details" | "payment">("details");
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [modalStep, setModalStep] = useState<"details" | "payment">("details");
  const [selectedTime, setSelectedTime] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [duration, setDuration] = useState("30");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountToPay, setAmountToPay] = useState<string>("");
  const [appointmentStatus, setAppointmentStatus] = useState<string>("scheduled");
  const [showSuccessPrompt, setShowSuccessPrompt] = useState(false);
  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<any>(null);

  // Edit appointment state
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>("GCash");
  const [editAmountToPay, setEditAmountToPay] = useState<string>("");

  const basePrice = APPOINTMENT_PRICES[appointmentType] || 0;
  const finalPrice = Math.max(0, basePrice - (Number(discount) || 0));

  const selectedDoctorObj = useMemo(() => {
    return doctors.find(d => String(d.id) === String(selectedDoctor));
  }, [doctors, selectedDoctor]);

  // Log edit form data changes
  useEffect(() => {
    if (editFormData) {
      console.log("[Edit Form Data Updated]:", {
        type: editFormData.type,
        duration: editFormData.duration,
        status: editFormData.status,
        notes: editFormData.notes,
        timestamp: new Date().toISOString()
      });
    }
  }, [editFormData]);

  // Log appointment type changes with price
  useEffect(() => {
    if (appointmentType) {
      console.log(`[Admin BookingModal] Appointment Type Changed:`, {
        event: 'appointmentTypeChanged',
        type: appointmentType,
        basePrice,
        discount: Number(discount) || 0,
        finalPrice,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }, [appointmentType, discount, duration, basePrice, finalPrice]);

  // Fetch all patients
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
        const res = await fetch("http://localhost:3001/api/patients?limit=1000", { credentials: 'include' });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPatients(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch patients:", err);
        toast.error("Failed to load patients");
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  // Fetch doctor appointments
  useEffect(() => {
    if (!selectedDoctorObj) return;

    const fetchAppointments = async () => {
      try {
        setIsLoadingAvailability(true);
        // Fetch ALL appointments to check for patient conflicts across all doctors
        const response = await fetch(`http://localhost:3001/api/appointments`);
        const result = await response.json();
        console.log("[fetchAppointments] Response from API:", {
          success: result.success,
          appointmentCount: result.data?.length || 0,
          appointments: result.data,
        });
        if (result.success) {
          setAppointments(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch doctor appointments", error);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchAppointments();
  }, [selectedDoctorObj]);

  const getDaySlots = useCallback((date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    // Filter for selected doctor's appointments only
    const dayAppointments = appointments.filter(
      apt => apt.date === dateStr && apt.doctor === selectedDoctorObj?.name && apt.status !== "cancelled" && apt.paymentStatus !== "unpaid"
    );

    // Also filter for selected patient's appointments (if one is selected)
    const patientAppointments = selectedPatient
      ? appointments.filter(
          apt => apt.date === dateStr && apt.patientId === selectedPatient && apt.status !== "cancelled" && apt.paymentStatus !== "unpaid"
        )
      : [];

    const durationMinutes = Number(duration) || 30;

    const now = new Date();
    const todayStr = formatDateToYYYYMMDD(now);
    const isToday = dateStr === todayStr;
    const isPastDate = !isToday && date < new Date(now.setHours(0, 0, 0, 0));

    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();

    return TIME_SLOTS.map(slot => {
      const [hour, minute] = slot.split(":").map(Number);
      const slotStartTime = hour * 60 + minute;
      const slotEndTime = slotStartTime + durationMinutes;

      const isPastTime = isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute));
      
      // Check if doctor has any appointment that conflicts with this slot (considering duration)
      const doctorConflict = dayAppointments.some(apt => {
        const aptStartHour = parseInt(apt.time.split(":")[0]);
        const aptStartMinute = parseInt(apt.time.split(":")[1]);
        const aptDuration = apt.duration || 30;
        const aptStartTime = aptStartHour * 60 + aptStartMinute;
        const aptEndTime = aptStartTime + aptDuration;

        // Check if slot overlaps with doctor's existing appointment
        return (slotStartTime < aptEndTime && slotEndTime > aptStartTime);
      });

      // Check if any appointment at this time is tentative (reserved)
      const isTentative = dayAppointments.some(apt => 
        apt.time === slot && 
        (apt.status === "tentative" || apt.status === "pending")
      );

      // Check if selected patient has any appointment that conflicts with this slot (considering duration)
      let patientConflict = false;
      if (selectedPatient && patientAppointments.length > 0) {
        patientConflict = patientAppointments.some(apt => {
          const aptStartHour = parseInt(apt.time.split(":")[0]);
          const aptStartMinute = parseInt(apt.time.split(":")[1]);
          const aptDuration = apt.duration || 30;
          const aptStartTime = aptStartHour * 60 + aptStartMinute;
          const aptEndTime = aptStartTime + aptDuration;

          // Check if slot overlaps with patient's existing appointment
          return (slotStartTime < aptEndTime && slotEndTime > aptStartTime);
        });
      }
      
      const isPast = isPastTime || isPastDate;

      return {
        time: slot,
        isAvailable: !doctorConflict && !isPast && !isTentative && !patientConflict,
        isBooked: doctorConflict,
        isTentative,
        isPast,
        patientConflict,
      };
    });
  }, [appointments, selectedDoctorObj, selectedPatient, duration]);

  // Get patients with conflicts at selected time (check ALL doctors, not just selected one)
  const getPatientsWithConflicts = useCallback(() => {
    if (!selectedTime || !selectedDate) return new Set();

    const dateStr = formatDateToYYYYMMDD(selectedDate);
    const patientConflicts = new Set<string>();

    // Check ALL appointments in the system, not just for the selected doctor
    const allAppointments = appointments;
    
    allAppointments.forEach(apt => {
      if (apt.date === dateStr && apt.time === selectedTime && apt.status !== "cancelled" && apt.paymentStatus !== "unpaid") {
        patientConflicts.add(apt.patientId);
      }
    });

    return patientConflicts;
  }, [selectedTime, selectedDate, appointments]);

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") {
      newDate.setDate(selectedDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      newDate.setDate(selectedDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(selectedDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const handleTimeSlotClick = (time: string) => {
    setSelectedTime(time);
    setIsModalOpen(true);
  };

  const handleBookedSlotClick = (time: string) => {
    const dateStr = formatDateToYYYYMMDD(selectedDate);
    const clickedHour = parseInt(time.split(":")[0]);
    const clickedMinute = parseInt(time.split(":")[1]);
    const clickedTime = clickedHour * 60 + clickedMinute;

    console.log("[handleBookedSlotClick] Clicked slot info:", {
      time,
      dateStr,
      clickedHour,
      clickedMinute,
      clickedTime,
      selectedDoctorName: selectedDoctorObj?.name,
    });

    // Find any appointment that overlaps with the clicked time
    const appointment = appointments.find(apt => {
      if (apt.date !== dateStr || apt.doctor !== selectedDoctorObj?.name) {
        console.log("[handleBookedSlotClick] Filtering out appointment:", {
          aptDate: apt.date,
          aptDoctor: apt.doctor,
          dateStr,
          selectedDoctor: selectedDoctorObj?.name,
          dateMatch: apt.date === dateStr,
          doctorMatch: apt.doctor === selectedDoctorObj?.name,
        });
        return false;
      }
      
      const aptStartHour = parseInt(apt.time.split(":")[0]);
      const aptStartMinute = parseInt(apt.time.split(":")[1]);
      const aptDuration = apt.duration || 30;
      const aptStartTime = aptStartHour * 60 + aptStartMinute;
      const aptEndTime = aptStartTime + aptDuration;

      const isOverlap = clickedTime >= aptStartTime && clickedTime < aptEndTime;
      console.log("[handleBookedSlotClick] Checking overlap for appointment:", {
        aptTime: apt.time,
        aptDuration,
        aptStartTime,
        aptEndTime,
        clickedTime,
        isOverlap,
      });

      return isOverlap;
    });

    console.log("[handleBookedSlotClick] Found appointment:", appointment);

    if (appointment) {
      console.log("[handleBookedSlotClick] Full appointment object:", {
        id: appointment.id,
        patientName: appointment.patientName,
        doctor: appointment.doctor,
        date: appointment.date,
        time: appointment.time,
        customType: appointment.customType,
        type: appointment.type,
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes,
        price: appointment.price,
        paymentStatus: appointment.paymentStatus,
        totalPaid: appointment.totalPaid,
        balance: appointment.balance,
      });

      console.log("[handleBookedSlotClick] Setting edit form data:", {
        type: appointment.customType || APPOINTMENT_TYPE_MAP[appointment.type] || "Other",
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes,
      });

      setEditingAppointment(appointment);
      setEditFormData({
        type: appointment.customType || APPOINTMENT_TYPE_MAP[appointment.type] || "Other",
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes,
      });
      setEditPaymentMethod("GCash");
      setEditAmountToPay("");
      setEditModalStep("details");
      setIsEditModalOpen(true);
    } else {
      console.warn("[handleBookedSlotClick] No appointment found for:", { time, dateStr, selectedDoctorName: selectedDoctorObj?.name });
      console.log("[handleBookedSlotClick] All appointments:", appointments);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedPatient || !appointmentType) {
      toast.error("Please select a patient and appointment type");
      return;
    }

    setIsBooking(true);
    try {
      const selectedPatientObj = patients.find(p => p.id === selectedPatient);
      const dateStr = formatDateToYYYYMMDD(selectedDate);

      // Check for patient conflict (same patient, same time, same date)
      const patientConflict = appointments.some(apt => 
        apt.patientId === selectedPatient && 
        apt.date === dateStr && 
        apt.time === selectedTime &&
        apt.status !== 'cancelled' &&
        apt.paymentStatus !== 'unpaid'
      );

      if (patientConflict) {
        toast.error(`This patient already has an appointment at this time.`);
        setIsBooking(false);
        return;
      }

      // Check for doctor conflict (same doctor, same time, same date)
      const doctorConflict = appointments.some(apt => 
        apt.doctor === selectedDoctorObj?.name && 
        apt.date === dateStr && 
        apt.time === selectedTime &&
        apt.status !== 'cancelled' &&
        apt.paymentStatus !== 'unpaid'
      );

      if (doctorConflict) {
        toast.error(`The doctor already has an appointment at this time.`);
        setIsBooking(false);
        return;
      }

      // Move to payment step
      setModalStep("payment");
      setIsBooking(false);
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err?.message || "Failed to proceed");
    } finally {
      setIsBooking(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPatient || !appointmentType) {
      toast.error("Please select a patient and appointment type");
      return;
    }

    setIsBooking(true);
    try {
      const selectedPatientObj = patients.find(p => p.id === selectedPatient);
      const dateStr = formatDateToYYYYMMDD(selectedDate);
      const amountPaid = parseFloat(amountToPay) || 0;

      // Determine payment status and appointment status based on amount
      let paymentStatus: "paid" | "unpaid" | "half-paid" = "unpaid";
      let autoStatus = appointmentStatus;

      if (amountPaid >= finalPrice) {
        paymentStatus = "paid";
        autoStatus = "confirmed";
      } else if (amountPaid > 0) {
        paymentStatus = "half-paid";
        autoStatus = "scheduled";
      } else {
        paymentStatus = "unpaid";
        autoStatus = "pending";
      }

      const newApt = await addAppointment({
        patientId: selectedPatient,
        patientName: selectedPatientObj?.name || selectedPatientObj?.firstName,
        doctor: selectedDoctorObj?.name || "",
        date: dateStr,
        time: selectedTime,
        type: 0,
        customType: appointmentType,
        duration: Number(duration),
        price: finalPrice,
        status: autoStatus as any,
        paymentStatus: paymentStatus,
        totalPaid: amountPaid,
        balance: finalPrice - amountPaid,
        notes,
      });

      setBookedAppointmentId(newApt.id);
      setBookedAppointment(newApt);
      setShowSuccessPrompt(true);
      setIsModalOpen(false);
      setModalStep("details");
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err?.message || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const handleConfirmSuccess = () => {
    setShowSuccessPrompt(false);
    setSelectedTime("");
    setAppointmentType("");
    setNotes("");
    setSelectedPatient("");
    setBookedAppointmentId(null);
    setBookedAppointment(null);
    router.push("/admin/calendar");
  };

  const handlePayNow = () => {
    setShowSuccessPrompt(false);
    if (bookedAppointment) {
      openPatientPaymentFor(bookedAppointment);
    }
  };

  const handlePayLater = () => {
    setShowSuccessPrompt(false);
    setSelectedTime("");
    setAppointmentType("");
    setNotes("");
    setSelectedPatient("");
    setBookedAppointmentId(null);
    setBookedAppointment(null);
    router.push("/admin/calendar");
  };

  const renderDayView = () => {
    const slots = getDaySlots(selectedDate);
    const isPastDate = selectedDate < new Date(new Date().setHours(0, 0, 0, 0));

    return (
      <div className="space-y-6">
        {/* Calendar and Time Slots - improved styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 bg-transparent rounded-[2rem] overflow-hidden">
          <div className="p-6 bg-white rounded-l-[1.5rem] border border-gray-50 shadow-sm">
            <DoctorCalendar
              selectedDate={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>

          <div className="p-6 flex flex-col bg-white rounded-r-[1.5rem] border border-gray-50 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-lg text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                <Clock className="h-5 w-5 text-blue-600" />
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[520px] pr-2 custom-scrollbar">
              {isPastDate ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <CalendarIcon className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Past Date</p>
                  <p className="text-xs text-gray-400 mt-1">Schedule is not available for past dates</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.isAvailable && !slot.isBooked}
                      onClick={() => {
                        if (slot.isAvailable) {
                          handleTimeSlotClick(slot.time);
                        } else if (slot.isBooked) {
                          handleBookedSlotClick(slot.time);
                        }
                      }}
                      className={`
                        group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200
                        ${slot.isAvailable
                          ? "bg-white border-gray-100 hover:border-emerald-400 hover:shadow-md cursor-pointer"
                          : slot.isBooked
                          ? "bg-white border-gray-100 hover:border-emerald-400 hover:shadow-md cursor-pointer"
                          : "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className={`font-bold text-sm ${slot.isAvailable ? "text-gray-900" : "text-gray-400"}`}>
                            {formatTimeTo12h(slot.time)}
                          </p>
                        </div>
                        <div className="hidden md:block text-xs text-gray-500">{slot.isAvailable ? 'Available' : (slot.isTentative ? 'Reserved' : (slot.isBooked ? 'Booked' : 'Passed'))}</div>
                      </div>

                      <Badge
                        className={`
                          font-bold px-3 py-1 text-[11px] uppercase rounded-full min-w-[64px] text-center
                          ${slot.isAvailable
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : slot.isTentative
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : slot.patientConflict
                            ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                            : slot.isBooked
                            ? "bg-emerald-700 text-white border-emerald-800"
                            : "bg-gray-400 text-white border-gray-500"}
                        `}
                      >
                        {slot.isAvailable ? "Open" : (slot.isTentative ? "Reserved" : (slot.patientConflict ? "Patient Busy" : (slot.isBooked ? "Booked" : "Passed")))}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 px-6 py-4 bg-white rounded-3xl shadow-sm border border-gray-100 w-fit">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-600" />
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Open Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-100 border border-emerald-200" />
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Reserved Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-100 border border-yellow-200" />
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Patient Busy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-700" />
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Booked Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Passed Slot</span>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedDoctor) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Book Appointment</h1>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Doctor *</label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(doctor => (
                    <SelectItem key={doctor.id} value={String(doctor.id)}>
                      Dr. {doctor.name} ({doctor.specialization})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDoctor("")}
              className="rounded-xl border-gray-200 shadow-sm bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-none">Book with Dr. {selectedDoctorObj?.name}</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">{selectedDoctorObj?.specialization} Specialist</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex bg-gray-100/80 rounded-xl p-1">
              {(["day", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                    px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all
                    ${
                      viewMode === mode
                        ? "bg-white text-blue-600 shadow-sm scale-[1.02]"
                        : "text-gray-500 hover:text-gray-700"
                    }
                  `}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="h-8 w-[1px] bg-gray-200 mx-1" />

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateDate("prev")}
                className="h-9 w-9 rounded-xl hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="px-3 h-9 text-xs font-black uppercase tracking-tighter hover:bg-gray-100"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateDate("next")}
                className="h-9 w-9 rounded-xl hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* New Appointment button for admins -> redirect to admin find-doctors */}
            <div className="ml-4">
              <Button
                onClick={() => router.push("/admin/find-doctors")}
                className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                New Appointment
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Doctor Card */}
          <div className="lg:col-span-3">
            <Card className="border-none shadow-2xl shadow-blue-900/5 overflow-hidden rounded-[2rem] bg-white sticky top-8">
              <div className="relative">
                <div className="aspect-[4/5] overflow-hidden">
                  <Avatar className="h-full w-full rounded-none">
                    <AvatarImage src={selectedDoctorObj?.profilePicture} alt={selectedDoctorObj?.name} className="object-cover" />
                    <AvatarFallback className="text-5xl bg-blue-600 text-white font-black">
                      {selectedDoctorObj?.name?.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Lead Specialist</p>
                  <h2 className="text-2xl font-black leading-tight">Dr. {selectedDoctorObj?.name}</h2>
                </div>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase font-semibold text-gray-500 mb-2 block">Select Patient *</label>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient} disabled={isLoadingPatients}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={isLoadingPatients ? "Loading..." : "Choose patient"} />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name || `${patient.firstName} ${patient.lastName}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Award className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase">Specialization</p>
                      <p className="text-xs text-gray-500 font-medium">{selectedDoctorObj?.specialization}</p>
                    </div>
                  </div>
                  {selectedDoctorObj?.email && (
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900 uppercase">Contact</p>
                        <p className="text-xs text-gray-500 font-medium truncate w-[140px]">{selectedDoctorObj.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <p className="text-xs text-gray-400 leading-relaxed font-medium italic">
                    &quot;{selectedDoctorObj?.bio || "Providing personalized dental care with excellence and compassion."}&quot;
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main View Area */}
          <div className="lg:col-span-9 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                {viewMode === "day"
                  ? selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  : viewMode === "week"
                  ? `Week of ${selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
                  : selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
            </div>

            {isLoadingAvailability ? (
              <div className="min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Updating Schedules...</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {viewMode === "day" && renderDayView()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal - 2 Steps */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false);
          setModalStep("details");
        } else {
          setIsModalOpen(true);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                {modalStep === "details" ? "Appointment Details" : "Payment Summary"}
              </DialogTitle>
              <div className="flex gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${modalStep === "details" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                  Step 1: Details
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${modalStep === "payment" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                  Step 2: Payment
                </div>
              </div>
            </div>
            <DialogDescription>
              {modalStep === "details" 
                ? "Complete the following information to book your appointment" 
                : "Review and confirm the appointment details and payment"}
            </DialogDescription>
          </DialogHeader>

          {modalStep === "details" ? (
            <>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Who is this appointment for?</Label>
                      <Select value={selectedPatient} onValueChange={setSelectedPatient} disabled={isLoadingPatients}>
                        <SelectTrigger className="h-11 rounded-lg border-gray-200">
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map(patient => {
                            const patientsWithConflicts = getPatientsWithConflicts();
                            const hasConflict = patientsWithConflicts.has(patient.id);
                            return (
                              <SelectItem key={patient.id} value={patient.id} disabled={hasConflict}>
                                {patient.name || `${patient.firstName} ${patient.lastName}`}
                                {hasConflict && " (Unavailable at this time)"}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {selectedPatient && getPatientsWithConflicts().has(selectedPatient) && (
                        <p className="text-xs text-orange-600">This patient has an appointment at the selected time</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Appointment Type</Label>
                      <Select value={appointmentType} onValueChange={setAppointmentType}>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Duration (mins)</Label>
                        <Input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="30"
                          className="h-11 rounded-lg border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Discount</Label>
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          placeholder="0"
                          className="h-11 rounded-lg border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Total Price</Label>
                      <Input
                        type="text"
                        value={`₱${finalPrice.toLocaleString()}`}
                        readOnly
                        className="h-11 rounded-lg border-gray-200 bg-gray-50 font-bold text-blue-700"
                      />
                      <p className="text-[10px] text-gray-400">Base price: ₱{basePrice.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Selected Schedule</Label>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                      <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                        <CalendarIcon className="h-4 w-4" />
                        {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        {formatTimeTo12h(selectedTime)}
                      </div>
                      <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                        <Award className="h-4 w-4" />
                        Dr. {selectedDoctorObj?.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700">Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any details you'd like to add..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none rounded-lg border-gray-200"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isBooking}
                  className="h-11 px-6 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmBooking}
                  disabled={isBooking || !appointmentType || !selectedPatient}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-blue-100"
                >
                  {isBooking && <Loader2 className="h-4 w-4 animate-spin" />}
                  Next: Payment
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-6">
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900">Appointment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Patient:</span>
                      <span className="font-medium">{patients.find(p => p.id === selectedPatient)?.name || `${patients.find(p => p.id === selectedPatient)?.firstName} ${patients.find(p => p.id === selectedPatient)?.lastName}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{appointmentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium">{selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {formatTimeTo12h(selectedTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Doctor:</span>
                      <span className="font-medium">Dr. {selectedDoctorObj?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{duration} mins</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                      <span>Total Amount:</span>
                      <span className="text-blue-600">₱{finalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Appointment Status</Label>
                    <Select value={appointmentStatus} onValueChange={setAppointmentStatus}>
                      <SelectTrigger className="h-11 rounded-lg border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="tentative">Tentative</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Amount to Pay</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">₱</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={finalPrice}
                        placeholder="0.00"
                        value={amountToPay}
                        onChange={(e) => setAmountToPay(e.target.value)}
                        className="pl-7 h-11 rounded-lg border-gray-200"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>Total: ₱{finalPrice.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => setAmountToPay(String(finalPrice.toFixed(2)))}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Pay in full
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-11 rounded-lg border-gray-200">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Payment Status</Label>
                    <Select value={amountToPay ? (parseFloat(amountToPay) >= finalPrice ? "paid" : "half-paid") : "unpaid"} disabled>
                      <SelectTrigger className="h-11 rounded-lg border-gray-200 bg-gray-50">
                        <SelectValue />
                      </SelectTrigger>
                    </Select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    ✓ Review appointment details and payment information. Payment can be recorded later if needed.
                  </p>
                </div>
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setModalStep("details")}
                  disabled={isBooking}
                  className="h-11 px-6 rounded-lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={isBooking}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-green-100"
                >
                  {isBooking && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Booking
                </Button>
              </DialogFooter>
            </>
          )}
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
                Appointment has been successfully booked. Would you like to proceed with payment?
              </DialogDescription>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handlePayNow} className="w-full bg-blue-600 hover:bg-blue-700">
              Pay Now
            </Button>
            <Button variant="ghost" onClick={handlePayLater} className="w-full">
              Pay Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Modal - 2 Steps */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditModalOpen(false);
          setEditModalStep("details");
        } else {
          setIsEditModalOpen(true);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                {editModalStep === "details" ? "Edit Appointment" : "Payment Summary"}
              </DialogTitle>
              <div className="flex gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${editModalStep === "details" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                  Step 1: Details
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${editModalStep === "payment" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                  Step 2: Payment
                </div>
              </div>
            </div>
            <DialogDescription>
              {editModalStep === "details" 
                ? "Modify appointment details" 
                : "Review and manage payment"}
            </DialogDescription>
          </DialogHeader>

          {editModalStep === "details" && editingAppointment && editFormData ? (
            <>
              <div className="space-y-6">
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900">Appointment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Patient Name</Label>
                      <Input 
                        type="text"
                        value={editingAppointment.patientName}
                        readOnly
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Doctor</Label>
                      <Input 
                        type="text"
                        value={editingAppointment.doctor}
                        readOnly
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Type</Label>
                      <Select value={editFormData?.type || ""} onValueChange={(val) => setEditFormData({ ...editFormData, type: val })}>
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
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Duration (mins)</Label>
                      <Select value={String(editFormData.duration)} onValueChange={(val) => setEditFormData({ ...editFormData, duration: Number(val) })}>
                        <SelectTrigger className="h-11 rounded-lg border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 mins</SelectItem>
                          <SelectItem value="30">30 mins</SelectItem>
                          <SelectItem value="45">45 mins</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="150">2.5 hours</SelectItem>
                          <SelectItem value="180">3 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Date</Label>
                      <div className="h-11 rounded-lg border border-gray-200 bg-gray-100 flex items-center px-3 text-sm">
                        {editingAppointment.date}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Time</Label>
                      <div className="h-11 rounded-lg border border-gray-200 bg-gray-100 flex items-center px-3 text-sm">
                        {formatTimeTo12h(editingAppointment.time)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700">Appointment Status</Label>
                  <Select value={editFormData.status} onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}>
                    <SelectTrigger className="h-11 rounded-lg border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="tentative">Tentative</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700">Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={editFormData.notes || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="resize-none rounded-lg border-gray-200"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={false}
                  className="h-11 px-6 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setEditModalStep("payment")}
                  disabled={false}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-blue-100"
                >
                  Next: Payment
                </Button>
              </DialogFooter>
            </>
          ) : editModalStep === "payment" && editingAppointment ? (
            <>
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Service:</span>
                    <span className="font-medium">{editFormData?.type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Date:</span>
                    <span className="font-medium">{editingAppointment.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Time:</span>
                    <span className="font-medium">{formatTimeTo12h(editingAppointment.time)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="font-bold">Total Price:</span>
                    <span className="font-bold text-lg text-gray-900">
                      ₱{editingAppointment.price || 0}
                    </span>
                  </div>
                  {editingAppointment.totalPaid && editingAppointment.totalPaid > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Already Paid:</span>
                      <span className="font-medium text-green-600">
                        ₱{editingAppointment.totalPaid}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Remaining Balance:</span>
                    <span className="font-bold text-lg text-blue-600">
                      ₱{editingAppointment.balance ?? (editingAppointment.price || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editPaymentAmount" className="text-sm font-semibold">Amount to Pay Now</Label>
                  <Input
                    id="editPaymentAmount"
                    type="number"
                    placeholder={`Enter amount (e.g. ${editingAppointment.balance ?? editingAppointment.price})`}
                    value={editAmountToPay}
                    onChange={(e) => setEditAmountToPay(e.target.value)}
                    className="font-bold text-lg h-12"
                  />
                  <p className="text-[10px] text-gray-500">Leave blank to pay the full remaining balance.</p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Select Payment Method</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 ${
                        editPaymentMethod === "GCash"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-200"
                      }`}
                      onClick={() => setEditPaymentMethod("GCash")}
                    >
                      <span className="font-black text-blue-700 italic text-lg">
                        GCash
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 ${
                        editPaymentMethod === "Card"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-200"
                      }`}
                      onClick={() => setEditPaymentMethod("Card")}
                    >
                      <CreditCard
                        className={`h-6 w-6 ${
                          editPaymentMethod === "Card" ? "text-blue-600" : "text-gray-600"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          editPaymentMethod === "Card" ? "text-blue-700" : "text-gray-500"
                        }`}
                      >
                        Card
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 ${
                        editPaymentMethod === "Pay at Clinic"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-200"
                      }`}
                      onClick={() => {
                        setEditPaymentMethod("Pay at Clinic");
                        setEditAmountToPay("0");
                      }}
                    >
                      <Banknote
                        className={`h-6 w-6 ${
                          editPaymentMethod === "Pay at Clinic" ? "text-blue-600" : "text-gray-600"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase text-center leading-tight ${
                          editPaymentMethod === "Pay at Clinic" ? "text-blue-700" : "text-gray-500"
                        }`}
                      >
                        Pay at Clinic
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditModalStep("details")}
                  disabled={false}
                  className="h-11 px-6 rounded-lg"
                >
                  Back
                </Button>
                <Button
                  onClick={async () => {
                    toast.success("Appointment updated successfully!");
                    setIsEditModalOpen(false);
                    setEditModalStep("details");
                  }}
                  disabled={false}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-green-100"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default AdminBookAppointmentPage;
