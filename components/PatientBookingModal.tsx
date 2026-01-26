"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, Calendar as CalendarIcon, Clock, Stethoscope, ChevronRight, ChevronLeft, Video, UserCheck } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { toast } from "sonner";
import { useDoctors } from "../hooks/useDoctors";
import { useAuth } from "@/hooks/useAuth.tsx";
import { TIME_SLOTS, formatTimeTo12h, getServiceType } from "../lib/time-slots";
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
    newAppointmentServiceType,
    addAppointment,
    refreshAppointments,
    appointments
  } = useAppointmentModal();

  const { openPatientPaymentModal } = usePaymentModal();
  const { user, isAuthenticated } = useAuth();
  const { doctors, isLoadingDoctors, reloadDoctors } = useDoctors();
  
  const [familyMembers, setFamilyMembers] = useState<Patient[]>([]);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [showSuccessPrompt, setShowSuccessPrompt] = useState(false);
  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(null);
  const [dateAppointments, setDateAppointments] = useState<Appointment[]>([]);
  const [isLoadingDateAppointments, setIsLoadingDateAppointments] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    duration: "30",
    type: -1,
    customType: "",
    doctor: "",
    notes: "",
    patientName: "",
    patientId: "",
    serviceType: ""
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
        patientId: user?.patientId || "",
        serviceType: newAppointmentServiceType || ""
      });

      // Only skip Step 1 if ALL info is provided (Doctor, Date, Time)
      if (newAppointmentDoctorName && newAppointmentDate && newAppointmentTime) {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    }
  }, [isPatientBookingModalOpen, newAppointmentDate, newAppointmentTime, newAppointmentDoctorName, newAppointmentServiceType, user, reloadDoctors]);

  // Recompute serviceType when time changes
  useEffect(() => {
    if (formData.time) {
      const serviceType = getServiceType(formData.time);
      if (formData.serviceType !== serviceType) {
        setFormData(prev => ({ ...prev, serviceType }));
      }
    }
  }, [formData.time, formData.serviceType]);

  const availableDoctorsForStep1 = useMemo(() => {
    if (currentStep !== 1 || !formData.date || !formData.time) return [];
    
    // Check which doctors are available at this time
    return doctors.filter(doctor => {
      const doctorConflict = dateAppointments.find(apt => 
        apt.doctor === doctor.name && 
        apt.time === formData.time && 
        apt.status !== 'cancelled'
      );
      return !doctorConflict;
    });
  }, [currentStep, formData.date, formData.time, doctors, dateAppointments]);

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
        serviceType: formData.serviceType,
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
      // Use the patient-facing payment modal
      openPatientPaymentModal(appointments, bookedAppointmentId);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {currentStep === 1 ? (
              <>
                <Stethoscope className="h-6 w-6 text-blue-600" />
                Select a Doctor
              </>
            ) : (
              <>
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                Appointment Details
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 
              ? (formData.date && formData.time 
                  ? `Showing available doctors for ${new Date(formData.date).toLocaleDateString()} at ${formatTimeTo12h(formData.time)}`
                  : "Please select a doctor for your appointment")
              : "Complete the following information to book your appointment"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {/* Progress Bar */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-2 flex-1 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                    Appointment Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.date}
                    min={formatDateToYYYYMMDD(new Date())}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="h-11 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Preferred Time
                  </Label>
                  <Select
                    value={formData.time}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {formatTimeTo12h(slot)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  Select Available Doctor
                </Label>
                {isLoadingDoctors || isLoadingDateAppointments ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                  </div>
                ) : !formData.date || !formData.time ? (
                  <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">Please select a date and time to see available doctors.</p>
                  </div>
                ) : availableDoctorsForStep1.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
                    <p className="text-gray-500 font-medium">No doctors are available at this specific time.</p>
                    <Button variant="link" onClick={() => router.push('/patient/doctors')} className="text-blue-600 mt-2">
                      View all availability
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableDoctorsForStep1.map((doctor) => (
                      <div 
                        key={doctor.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50 group ${formData.doctor === doctor.name ? 'border-blue-600 bg-blue-50' : 'border-gray-100'}`}
                        onClick={() => setFormData(prev => ({ ...prev, doctor: doctor.name }))}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                            {doctor.name.charAt(0)}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-gray-900 truncate">Dr. {doctor.name}</h4>
                            <p className="text-sm text-gray-500 truncate">{doctor.specialization}</p>
                          </div>
                          {formData.doctor === doctor.name && (
                            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 border-t mt-8">
                <Button 
                  disabled={!formData.doctor || !formData.date || !formData.time} 
                  onClick={() => setCurrentStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-lg"
                >
                  Next Step
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Who is this appointment for?</Label>
                    <Select
                      value={formData.patientId}
                      onValueChange={handlePatientChange}
                      disabled={isLoadingFamily}
                    >
                      <SelectTrigger className="h-11 rounded-lg border-gray-200">
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

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Appointment Type</Label>
                    <Select
                      value={formData.type === -1 ? "" : formData.type.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: parseInt(value), customType: "" }))}
                    >
                      <SelectTrigger className="h-11 rounded-lg border-gray-200">
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
                      <Label className="text-sm font-bold text-gray-700">Please Specify Type</Label>
                      <Input
                        placeholder="Enter custom appointment type"
                        value={formData.customType}
                        onChange={(e) => setFormData(prev => ({ ...prev, customType: e.target.value }))}
                        className="h-11 rounded-lg border-gray-200"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Selected Schedule</Label>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                      <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                        <CalendarIcon className="h-4 w-4" />
                        {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date selected'}
                      </div>
                      <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        {formData.time ? formatTimeTo12h(formData.time) : 'No time selected'}
                      </div>
                      <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                        <Stethoscope className="h-4 w-4" />
                        Dr. {formData.doctor}
                      </div>
                      {formData.serviceType && (
                        <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                          {formData.serviceType === 'ONLINE' ? <Video className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          {formData.serviceType}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Notes (Optional)</Label>
                    <Textarea
                      placeholder="Any details you'd like the doctor to know..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="resize-none rounded-lg border-gray-200"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t mt-8">
                <Button 
                  variant="ghost" 
                  type="button" 
                  onClick={() => setCurrentStep(1)}
                  className="text-gray-500 hover:text-gray-700 gap-2 h-11 px-6"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {newAppointmentDoctorName ? "Back to Schedule" : "Back to Doctors"}
                </Button>
                
                <div className="flex gap-3">
                  <Button variant="outline" type="button" onClick={closePatientBookingModal} disabled={isLoading} className="h-11 px-6 rounded-lg">
                    Cancel
                  </Button>
                  <Button variant="default" type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-lg shadow-lg shadow-blue-100">
                    {isLoading ? "Booking..." : "Confirm Booking"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
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
