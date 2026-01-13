"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { toast } from "sonner";
import { Appointment } from "../hooks/useAppointments";
import { useDoctors } from "../hooks/useDoctors";
import { TIME_SLOTS, formatTimeTo12h } from "../lib/time-slots";
import { APPOINTMENT_TYPES, getAppointmentTypeName } from "../lib/appointment-types";

interface PatientOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export function EditAppointmentModal() {
  const { 
    isEditModalOpen, 
    closeEditModal, 
    selectedAppointment: appointment, // Rename selectedAppointment to appointment for consistency
    updateAppointment, 
    deleteAppointment, 
    refreshAppointments,
    isPatientFieldReadOnly
  } = useAppointmentModal();
  const [form, setForm] = useState<Partial<Appointment>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);
  const { doctors, isLoadingDoctors, reloadDoctors } = useDoctors();

  const [allPatients, setAllPatients] = useState<PatientOption[]>([]);
  const [selectedPatientOption, setSelectedPatientOption] = useState<string>(""); // Stores patient ID or "new-patient"
  const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);
  const [newPatientFormData, setNewPatientFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  
  // New state for pagination
  const [patientPage, setPatientPage] = useState(1);
  const [hasMorePatients, setHasMorePatients] = useState(true);

  const fetchPatients = useCallback(async (page: number) => {
    setIsLoadingPatients(true);
    try {
      const res = await fetch(`http://localhost:3001/api/patients?page=${page}&limit=20`);
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        const list: PatientOption[] = json.data.map((p: any) => ({ id: String(p.id), name: `${p.firstName} ${p.lastName}`, email: p.email, phone: p.phone }));
        
        setAllPatients(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = list.filter(p => !existingIds.has(p.id));
          return page === 1 ? list : [...prev, ...newItems];
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
  }, []);

  // Infinite scroll observer
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPatientElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoadingPatients) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMorePatients) {
        setPatientPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoadingPatients, hasMorePatients]);

  useEffect(() => {
    if (patientPage > 1) {
      fetchPatients(patientPage);
    }
  }, [patientPage, fetchPatients]);


  useEffect(() => {
    if (isEditModalOpen) {
      reloadDoctors();
    }
  }, [isEditModalOpen, reloadDoctors]);

  useEffect(() => {
    if (isEditModalOpen && appointment) {
      setForm({ ...appointment });
      // Set initial selected patient option
      if (appointment.patientId && appointment.patientName) {
        setAllPatients([{ id: appointment.patientId, name: appointment.patientName, email: appointment.email, phone: appointment.phone }]);
        setSelectedPatientOption(appointment.patientId);
        setIsCreatingNewPatient(false);
      } else {
        setSelectedPatientOption(""); // No patient selected
      }

      if (appointment.type === APPOINTMENT_TYPES.length - 1) {
        setShowCustomTypeInput(true);
      } else {
        setShowCustomTypeInput(false);
      }
    } else {
      // Reset form and state when no appointment is provided (e.g., modal is closed)
      setForm({});
      setSelectedPatientOption("");
      setIsCreatingNewPatient(false);
      setNewPatientFormData({ firstName: "", lastName: "", email: "", phone: "" });
      setShowCustomTypeInput(false); // Also reset this when no appointment
    }
    
    // Reset pagination when appointment changes
    setPatientPage(1);
    setHasMorePatients(true);

  }, [appointment, isEditModalOpen]);

  const sortedPatients = useMemo(() => {
    if (!selectedPatientOption) return allPatients;

    const selectedPatient = allPatients.find(p => p.id === selectedPatientOption);
    if (!selectedPatient) return allPatients;
    
    const filteredPatients = allPatients.filter(p => p.id !== selectedPatientOption);
    return [selectedPatient, ...filteredPatients];
  }, [allPatients, selectedPatientOption]);


  const handleSave = async () => {
    if (form.type == null || form.type < 0) {
      toast.error("Please select an appointment type.");
      return;
    }
    
    if (form.type === APPOINTMENT_TYPES.length - 1 && !form.customType) {
      toast.error("Please specify the appointment type for 'Other'.");
      return;
    }

    // Patient validation and creation logic
    let finalPatientId = form.patientId;
    let finalPatientName = form.patientName;

    if (isCreatingNewPatient) {
      if (!newPatientFormData.firstName || !newPatientFormData.lastName || !newPatientFormData.email || !newPatientFormData.phone) {
        toast.error("Please fill all required fields for the new patient.");
        return;
      }
      setIsLoading(true);
      try {
        const newPatient = {
          firstName: newPatientFormData.firstName,
          lastName: newPatientFormData.lastName,
          email: newPatientFormData.email,
          phone: newPatientFormData.phone,
          // Add other required fields for patient creation, even if empty
          dateOfBirth: "", address: "", city: "", zipCode: "", insurance: "",
          emergencyContact: "", emergencyPhone: "", medicalHistory: "", allergies: "", notes: "",
          dentalCharts: [],
          createdAt: new Date().toISOString()
        };
        const response = await fetch("http://localhost:3001/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPatient),
        });
        const result = await response.json();
        if (result.success && result.data) {
          finalPatientId = result.data.id;
          finalPatientName = `${result.data.firstName} ${result.data.lastName}`;
          const finalEmail = result.data.email;
          const finalPhone = result.data.phone;
          
          toast.success("New patient created successfully!");
          refreshAppointments(); // Refresh to ensure patient list is up to date

          // Update updatedForm with new patient details
          const updatedForm = {
            ...form,
            patientId: finalPatientId,
            patientName: finalPatientName,
            email: finalEmail,
            phone: finalPhone,
          };
          await updateAppointment(appointment?.id!, updatedForm as Partial<Appointment>);
          toast.success("Appointment updated");
          refreshAppointments();
          closeEditModal();
          return;
        } else {
          toast.error(result.message || "Failed to create new patient.");
          return;
        }
      } catch (error) {
        console.error("Error creating new patient:", error);
        toast.error("Error creating new patient.");
        return;
      } finally {
        setIsLoading(false);
      }
    } else {
      // If not creating new patient, ensure a patient is selected
      if (!finalPatientId || !finalPatientName) {
        toast.error("Please select a patient or create a new one.");
        return;
      }
    }

    if (!form.date || !form.time || !form.doctor || !appointment?.id || form.price === undefined || form.price < 0) {
      toast.error("Please fill all required fields and ensure price is valid.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("=== UPDATING APPOINTMENT ===", appointment?.id);
      const updatedForm = {
        ...form,
        patientId: finalPatientId,
        patientName: finalPatientName,
      };
      await updateAppointment(appointment?.id, updatedForm as Partial<Appointment>);
      toast.success("Appointment updated");
      refreshAppointments();
      closeEditModal();
    } catch (err) {
      console.error("Error updating appointment:", err);
      toast.error("Failed to update appointment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointment?.id) return;
    setIsLoading(true);
    try {
      console.log("=== DELETING APPOINTMENT ===", appointment.id);
      await deleteAppointment(appointment.id);
      toast.success("Appointment deleted");
      refreshAppointments();
      setIsDeleteDialogOpen(false);
      closeEditModal();
    } catch (err) {
      console.error("Error deleting appointment:", err);
      toast.error("Failed to delete appointment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Patient</Label>
            {isPatientFieldReadOnly && form.patientName ? (
              <div className="bg-gray-100 p-2 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-800">{form.patientName}</div>
              </div>
            ) : (
            <Select
              value={selectedPatientOption}
              onValueChange={(value) => {
                setSelectedPatientOption(value);
                if (value === "new-patient") {
                  setIsCreatingNewPatient(true);
                  // Clear existing patient details from form
                  setForm(prev => ({ ...prev, patientId: undefined, patientName: undefined, email: undefined, phone: undefined }));
                } else {
                  setIsCreatingNewPatient(false);
                  const selected = allPatients.find(p => p.id === value);
                  if (selected) {
                    setForm(prev => ({ ...prev, patientId: selected.id, patientName: selected.name, email: selected.email, phone: selected.phone }));
                  }
                }
              }}
              onOpenChange={(open) => {
                if (open) {
                  // Only fetch if the list is just the one pre-filled patient
                  if (allPatients.length <= 1) {
                    fetchPatients(1);
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select patient or create new" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new-patient" className="font-semibold text-blue-600">
                  + Create New Patient
                </SelectItem>
                {sortedPatients.map((p, index) => {
                  if (sortedPatients.length === index + 1) {
                    return <div ref={lastPatientElementRef} key={p.id}><SelectItem value={p.id}>{p.name}</SelectItem></div>;
                  }
                  return <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>;
                })}
                {isLoadingPatients && (
                  <div className="p-2 text-center text-sm text-gray-500">Loading more...</div>
                )}
                {!isLoadingPatients && sortedPatients.length === 0 && (
                  <div className="p-2 text-center text-sm text-gray-500">No patients found.</div>
                )}
              </SelectContent>
            </Select>
            )}
          </div>

          {isCreatingNewPatient && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={newPatientFormData.firstName}
                    onChange={(e) => setNewPatientFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={newPatientFormData.lastName}
                    onChange={(e) => setNewPatientFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newPatientFormData.email}
                  onChange={(e) => setNewPatientFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={newPatientFormData.phone}
                  onChange={(e) => setNewPatientFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date || ''} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select 
                value={form.time ? TIME_SLOTS.indexOf(form.time).toString() : "-1"} 
                onValueChange={(v) => {
                  const index = parseInt(v);
                  if (index >= 0) {
                    setForm(prev => ({ ...prev, time: TIME_SLOTS[index] }));
                  }
                }}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Type</Label>
              <Select 
                value={form.type != null ? form.type.toString() : "-1"} 
                onValueChange={(v) => {
                  const typeIndex = parseInt(v);
                  setForm(prev => ({ ...prev, type: typeIndex, customType: "" }));
                  setShowCustomTypeInput(typeIndex === APPOINTMENT_TYPES.length - 1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
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
                    value={form.customType || ""}
                    onChange={(e) => setForm(prev => ({...prev, customType: e.target.value}))}
                    required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                value={form.price !== undefined ? form.price : ""}
                onChange={(e) => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select 
                value={String(form.duration || 60)} 
                onValueChange={(v) => setForm(prev => ({ ...prev, duration: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 mins</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select
                value={String(form.doctor || '')}
                onValueChange={(v) => setForm(prev => ({ ...prev, doctor: v }))}
                disabled={isLoadingDoctors}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingDoctors ? "Loading doctors..." : doctors.length === 0 ? "No doctors available" : "Doctor"} />
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
                  {!isLoadingDoctors && form.doctor && !doctors.some((doctor) => doctor.name === form.doctor) ? (
                    <SelectItem value={String(form.doctor)}>{form.doctor}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={String(form.status || 'scheduled')} onValueChange={(v) => setForm(prev => ({ ...prev, status: v as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="tentative">Tentative</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => closeEditModal()} disabled={isLoading}>Cancel</Button>
            <Button variant="secondary" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="brand" onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Appointment</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this appointment? This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
