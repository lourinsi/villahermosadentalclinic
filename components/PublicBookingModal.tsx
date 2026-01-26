"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Loader2,
  LogIn,
} from "lucide-react";
import { APPOINTMENT_TYPES } from "@/lib/appointment-types";
import { TIME_SLOTS, formatTimeTo12h, getServiceType } from "@/lib/time-slots";
import { useDoctors } from "@/hooks/useDoctors";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PublicBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PublicBookingModal({ isOpen, onClose }: PublicBookingModalProps) {
  const { doctors, isLoadingDoctors } = useDoctors();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    duration: 30,
    type: -1,
    customType: "",
    doctor: "",
    notes: "",
    serviceType: "",
  });

  const [dateAppointments, setDateAppointments] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  useEffect(() => {
    const fetchDateAppointments = async () => {
      if (!formData.date) {
        setDateAppointments([]);
        return;
      }
      setIsLoadingAppointments(true);
      try {
        const response = await fetch(`http://localhost:3001/api/appointments?startDate=${formData.date}&endDate=${formData.date}&anonymize=true`);
        const result = await response.json();
        if (result.success) {
          setDateAppointments(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching appointments for date:", error);
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    fetchDateAppointments();
  }, [formData.date]);

  // Recompute serviceType when time changes
  useEffect(() => {
    if (formData.time) {
      const serviceType = getServiceType(formData.time);
      if (formData.serviceType !== serviceType) {
        setFormData(prev => ({ ...prev, serviceType }));
      }
    }
  }, [formData.time, formData.serviceType]);

  const isSlotBusy = useCallback((time: string) => {
    if (!formData.date || !dateAppointments) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const newStart = hours * 60 + minutes;
    const newEnd = newStart + 30; // Default public booking duration is 30 mins

    return dateAppointments.some(apt => {
      if (apt.status === 'cancelled') return false;
      
      const [aptHours, aptMinutes] = apt.time.split(':').map(Number);
      const aptStart = aptHours * 60 + aptMinutes;
      const aptDuration = apt.duration || 30;
      const aptEnd = aptStart + aptDuration;

      return (newStart < aptEnd) && (newEnd > aptStart);
    });
  }, [formData.date, dateAppointments]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        date: "",
        time: "",
        type: -1,
        customType: "",
        doctor: "",
        notes: "",
        serviceType: "",
      });
      setDateError("");
    }
  }, [isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = (): boolean => {
    if (!formData.firstName.trim()) {
      toast.error("First name is required");
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error("Last name is required");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (formData.type === -1) {
      toast.error("Please select an appointment type");
      return false;
    }
    if (!formData.date) {
      toast.error("Please select a date");
      return false;
    }
    if (!formData.time) {
      toast.error("Please select a time");
      return false;
    }
    if (!formData.doctor) {
      toast.error("Please select a doctor");
      return false;
    }

    // Validate date/time is in the future
    const appointmentDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    
    if (appointmentDateTime <= now) {
      setDateError("Cannot schedule appointment for past date/time");
      toast.error("Please select a future date and time");
      return false;
    }

    if (formData.type === APPOINTMENT_TYPES.length - 1 && !formData.customType.trim()) {
      toast.error("Please specify the appointment type");
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setDateError("");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3001/api/appointments/public-book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Auto-login: Store temporary patient session in localStorage
        const patientSession = {
          isTemporaryLogin: true,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          loginTime: new Date().toISOString(),
        };
        
        // Store in both localStorage and sessionStorage for persistence
        localStorage.setItem("tempPatientSession", JSON.stringify(patientSession));
        sessionStorage.setItem("tempPatientSession", JSON.stringify(patientSession));
        
        setStep(3); // Success step
        toast.success("Appointment request sent successfully!");
        
        // Close modal after 3 seconds and auto-login
        setTimeout(() => {
          onClose();
          // Trigger a refresh or navigation to update auth state
          window.location.reload();
        }, 3000);
      } else {
        toast.error(result.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Your Contact Information"}
            {step === 2 && "Appointment Details"}
            {step === 3 && "Appointment Confirmed"}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div
            className={`flex flex-col items-center ${
              step >= 1 ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-bold ${
                step >= 1
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 bg-white"
              }`}
            >
              1
            </div>
            <span className="text-xs mt-1 font-medium">Contact</span>
          </div>
          <div
            className={`flex-grow h-0.5 mx-2 ${
              step >= 2 ? "bg-blue-600" : "bg-gray-300"
            }`}
          ></div>
          <div
            className={`flex flex-col items-center ${
              step >= 2 ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-bold ${
                step >= 2
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 bg-white"
              }`}
            >
              2
            </div>
            <span className="text-xs mt-1 font-medium">Appointment</span>
          </div>
          <div
            className={`flex-grow h-0.5 mx-2 ${
              step >= 3 ? "bg-blue-600" : "bg-gray-300"
            }`}
          ></div>
          <div
            className={`flex flex-col items-center ${
              step >= 3 ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-bold ${
                step >= 3
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 bg-white"
              }`}
            >
              3
            </div>
            <span className="text-xs mt-1 font-medium">Confirm</span>
          </div>
        </div>

        {/* Step 1: Contact Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    className="pl-10"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    className="pl-10"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(555) 000-0000"
                    className="pl-10"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={nextStep}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Next Step
              </Button>
            </div>

            {/* Already have an account? */}
            <div className="border-t pt-4 mt-6">
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  onClick={() => onClose()}
                  className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <LogIn className="w-3 h-3" />
                  Login here
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Appointment Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">Appointment Type *</Label>
              <Select
                value={formData.type === -1 ? "" : String(formData.type)}
                onValueChange={(value) =>
                  handleSelectChange("type", value)
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select appointment type" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((type, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.type === APPOINTMENT_TYPES.length - 1 && (
              <div className="space-y-2">
                <Label htmlFor="customType">Specify Type *</Label>
                <Input
                  id="customType"
                  name="customType"
                  placeholder="Please describe the appointment type"
                  value={formData.customType}
                  onChange={handleInputChange}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    className="pl-10"
                    value={formData.date}
                    onChange={handleInputChange}
                    min={getTodayDate()}
                  />
                </div>
                {dateError && (
                  <p className="text-sm text-red-500">{dateError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Select
                  value={formData.time}
                  onValueChange={(value) => handleSelectChange("time", value)}
                >
                  <SelectTrigger id="time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {TIME_SLOTS.map((slot) => {
                      const busy = isSlotBusy(slot);
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
              <Label htmlFor="doctor">Doctor *</Label>
              <Select
                value={formData.doctor}
                onValueChange={(value) => handleSelectChange("doctor", value)}
                disabled={isLoadingDoctors}
              >
                <SelectTrigger id="doctor">
                  <SelectValue
                    placeholder={
                      isLoadingDoctors ? "Loading doctors..." : "Select a doctor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional information or special requests?"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={prevStep}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>

            {/* Already have an account? */}
            <div className="border-t pt-4 mt-6">
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  onClick={() => onClose()}
                  className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <LogIn className="w-3 h-3" />
                  Login here
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-900">
              Appointment Request Submitted!
            </h3>
            <p className="text-gray-600">
              Thank you for choosing Villahermosa Dental Clinic. We've received
              your appointment request and will confirm it shortly.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-700">
                <strong>Patient:</strong> {formData.firstName} {formData.lastName}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> {formData.email}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Phone:</strong> {formData.phone}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Date:</strong> {formData.date}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Time:</strong> {formatTimeTo12h(formData.time)}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              A confirmation email has been sent to <strong>{formData.email}</strong>
            </p>
            <Button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
