import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar, Clock, User, Stethoscope } from "lucide-react";
import { useAppointmentModal } from "./AdminLayout";
import { toast } from "sonner";
import { useDoctors } from "../hooks/useDoctors";
import { TIME_SLOTS, formatTimeTo12h } from "../lib/time-slots";
import { APPOINTMENT_TYPES } from "../lib/appointment-types";
import { formatDateToYYYYMMDD } from "../lib/utils";

interface CreateAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedTime?: string;
}

interface AppointmentFormData {
  patientName: string;
  patientId: string;
  date: string;
  time: string;
  duration: number;
  type: number;
  customType?: string;
  price?: number;
  doctor: string;
  notes: string;
  status: string;
}

export function CreateAppointmentModal({ 
  open, 
  onOpenChange,
  selectedDate,
  selectedTime
}: CreateAppointmentModalProps) {
  const { addAppointment, refreshPatients, refreshAppointments } = useAppointmentModal();
  const [formData, setFormData] = useState<AppointmentFormData>({
    patientName: "",
    patientId: "",
    date: "",
    time: "",
    duration: 30,
    type: -1,
    customType: "",
    price: 0,
    doctor: "",
    notes: "",
    status: "scheduled"
  });

  const [showNewPatient, setShowNewPatient] = useState(false);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);

  const { refreshTrigger } = useAppointmentModal();
  const { doctors, isLoadingDoctors, reloadDoctors } = useDoctors();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/patients");
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          const list = json.data.map((p: any) => ({ id: String(p.id), name: `${p.firstName} ${p.lastName}` }));
          setPatients(list);
        }
      } catch (err) {
        console.error("Failed to load patients:", err);
      }
    };

    fetchPatients();
  }, [refreshTrigger]);

  useEffect(() => {
    if (open) {
      let dateStr = "";
      if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const day = selectedDate.getDate().toString().padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }

      const newFormData: AppointmentFormData = {
        patientName: "",
        patientId: "",
        date: dateStr,
        time: selectedTime || "",
        duration: 30,
        type: -1,
        customType: "",
        price: 0,
        doctor: "",
        notes: "",
        status: "scheduled"
      };

      console.log("CreateAppointmentModal Details:", {
        selectedDate: selectedDate,
        selectedTime: selectedTime,
        formData: newFormData
      });
      
      setFormData(newFormData);
      setShowNewPatient(false);
      setShowCustomTypeInput(false);
      reloadDoctors();
    }
  }, [open, selectedDate, selectedTime, reloadDoctors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientName || !formData.date || !formData.time || formData.type < 0 || !formData.doctor || formData.price === undefined || formData.price < 0) {
      toast.error("Please fill in all required fields and ensure price is valid.");
      return;
    }
    
    if (formData.type === APPOINTMENT_TYPES.length - 1 && !formData.customType) {
      toast.error("Please specify the appointment type for 'Other'.");
      return;
    }

    try {
      const appointmentDateTime = new Date(`${formData.date}T${formData.time}`);
      if (isNaN(appointmentDateTime.getTime()) || appointmentDateTime.getTime() <= Date.now()) {
        toast.error("Cannot schedule an appointment in the past. Choose a future date/time.");
        return;
      }
    } catch (err) {
      toast.error("Invalid date/time selected");
      return;
    }

    setIsLoading(true);

    let patientId = formData.patientId;
    let patientName = formData.patientName;

    if (showNewPatient && formData.patientName) {
      try {
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
        toast.info("New patient created successfully!");
        refreshPatients();

      } catch (err) {
        console.error("Error creating patient:", err);
        toast.error("Could not create patient");
        setIsLoading(false);
        return;
      }
    }

    try {
      await addAppointment({
        patientName: patientName,
        patientId: patientId || patientName, // Fallback for safety
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        type: formData.type,
        customType: formData.customType,
        price: formData.price,
        doctor: formData.doctor,
        notes: formData.notes,
        status: formData.status as "scheduled" | "confirmed" | "pending" | "tentative" | "completed" | "cancelled"
      });

      toast.success("Appointment created successfully!");
      refreshAppointments();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Failed to create appointment");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSelect = (value: string) => {
    if (value === "new") {
      setShowNewPatient(true);
      setFormData(prev => ({ ...prev, patientId: "", patientName: "" }));
      return;
    }

    const found = patients.find(p => p.id === value);
    if (found) {
      setShowNewPatient(false);
      setFormData(prev => ({ ...prev, patientId: found.id, patientName: found.name }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Create New Appointment</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Section */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Patient Information</span>
            </h3>
            
            {!showNewPatient ? (
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select
                  value={formData.patientId || ""}
                  onValueChange={handlePatientSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient or create new" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.length > 0 ? (
                      patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500">No patients found</div>
                    )}
                    <SelectItem value="new">+ Create New Patient</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setShowNewPatient(false)}
                >
                  ← Back to Patient Selection
                </Button>
                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input
                    placeholder="Enter patient name"
                    value={formData.patientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="patient@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Appointment Details Section */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Appointment Details</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  min={formatDateToYYYYMMDD(new Date())}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Select
                  value={formData.time ? TIME_SLOTS.indexOf(formData.time).toString() : "-1"}
                  onValueChange={(value) => {
                    const index = parseInt(value);
                    if (index >= 0) {
                      setFormData(prev => ({ ...prev, time: TIME_SLOTS[index] }));
                    }
                  }}
                  required
                >
                  <SelectTrigger id="time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot, index) => (
                      <SelectItem key={slot} value={index.toString()}>
                        {formatTimeTo12h(slot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Service Section */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <Stethoscope className="h-4 w-4" />
              <span>Service & Provider</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="type">Appointment Type</Label>
                <Select
                  value={formData.type.toString()}
                  onValueChange={(value) => {
                    const typeIndex = parseInt(value);
                    setFormData(prev => ({ ...prev, type: typeIndex, customType: "" }));
                    setShowCustomTypeInput(typeIndex === APPOINTMENT_TYPES.length - 1);
                  }}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type, index) => (
                      <SelectItem key={index} value={index.toString()}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showCustomTypeInput && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="customType">Please Specify</Label>
                  <Input
                      id="customType"
                      placeholder="e.g., 'Denture Fitting', 'Braces Adjustment'"
                      value={formData.customType}
                      onChange={(e) => setFormData(prev => ({...prev, customType: e.target.value}))}
                      required
                  />
                </div>
              )}
            
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price !== undefined ? formData.price : ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select
                  value={String(formData.duration)}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
                >
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 mins</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor">Doctor/Provider</Label>
                <Select
                  value={formData.doctor}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, doctor: value }))}
                  disabled={isLoadingDoctors}
                >
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder={isLoadingDoctors ? "Loading doctors..." : doctors.length === 0 ? "No doctors available" : "Select doctor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDoctors ? (
                      <div className="p-2 text-sm text-gray-500">Loading doctors...</div>
                    ) : doctors.length > 0 ? (
                      doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.name}>
                          {doctor.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500">No doctors available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="tentative">Tentative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes or special requirements for this appointment..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="brand" 
              type="submit"
              disabled={!formData.patientName || !formData.date || !formData.time || formData.type < 0 || !formData.doctor || isLoading}
            >
              {isLoading ? "Creating..." : "Create Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );}