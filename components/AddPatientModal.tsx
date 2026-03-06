"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";

export function AddPatientModal() {
  const {
    isAddPatientModalOpen,
    closeAddPatientModal,
    refreshPatients,
  } = useAppointmentModal();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    alternateEmail: "",
    alternatePhone: "",
    dateOfBirth: "",
    address: "",
    city: "",
    zipCode: "",
    insurance: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalHistory: "",
    allergies: "",
    notes: "",
    dentalCharts: [] as any[],
  });

  // focus management and draft persistence
  const firstNameRef = useRef<HTMLInputElement | null>(null);

  // Load draft from localStorage once on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem('addPatientDraft');
      const savedStep = localStorage.getItem('addPatientStep');
      if (draft) {
        setFormData(JSON.parse(draft));
      }
      if (savedStep) {
        const s = parseInt(savedStep, 10);
        if (!isNaN(s)) setStep(s);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Persist draft whenever formData or step changes
  useEffect(() => {
    try {
      localStorage.setItem('addPatientDraft', JSON.stringify(formData));
      localStorage.setItem('addPatientStep', String(step));
    } catch (e) {
      // ignore
    }
  }, [formData, step]);

  // Focus appropriate input when modal opens (do not reset step)
  useEffect(() => {
    if (isAddPatientModalOpen) {
      setTimeout(() => {
        if (step === 1) {
          firstNameRef.current?.focus();
        }
      }, 50);
    }
  }, [isAddPatientModalOpen, step]);

  const validateStep = (s: number) => {
    if (s === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast.error("Please enter first and last name");
        return false;
      }
      if (!formData.email.trim()) {
        toast.error("Please enter primary email");
        return false;
      }
      if (!formData.phone.trim()) {
        toast.error("Please enter primary phone");
        return false;
      }
      if (!formData.dateOfBirth) {
        toast.error("Please enter date of birth");
        return false;
      }
    }
    // step 2 and 3 optional for now, but could add validation
    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((p) => Math.min(3, p + 1));
  };
  const prevStep = () => setStep((p) => Math.max(1, p - 1));

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && typeof (e as any).preventDefault === 'function') e.preventDefault();
    // If not on final step, advance instead of submitting
    if (step < 3) {
      nextStep();
      return;
    }

    // final validation optionally
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    setIsLoading(true);
    try {
      const patientData = {
        ...formData,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch("http://localhost:3001/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Patient added successfully!");
        refreshPatients();
        closeAddPatientModal();
        localStorage.removeItem('addPatientDraft');
        localStorage.removeItem('addPatientStep');
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          alternateEmail: "",
          alternatePhone: "",
          dateOfBirth: "",
          address: "",
          city: "",
          zipCode: "",
          insurance: "",
          emergencyContact: "",
          emergencyPhone: "",
          medicalHistory: "",
          allergies: "",
          notes: "",
          dentalCharts: [],
        });
      } else {
        toast.error(result.message || "Failed to add patient");
      }
    } catch (error) {
      console.error("Error adding patient:", error);
      toast.error("Error connecting to server. Make sure the backend is running on port 3001.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isAddPatientModalOpen} onOpenChange={closeAddPatientModal}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>

        <form onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLElement;
              // Allow Enter in textareas only; prevent and stop for other elements (including selects/inputs)
              if (target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                e.stopPropagation();
              }
            }
          }} className="space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-4">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>

          {/* Step content */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input ref={firstNameRef} value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Primary Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Primary Phone *</Label>
                  <Input type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Insurance Provider</Label>
                  <Select value={formData.insurance} onValueChange={(value) => setFormData(prev => ({ ...prev, insurance: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select insurance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue-cross">Blue Cross</SelectItem>
                      <SelectItem value="aetna">Aetna</SelectItem>
                      <SelectItem value="delta-dental">Delta Dental</SelectItem>
                      <SelectItem value="cigna">Cigna</SelectItem>
                      <SelectItem value="unitedhealth">UnitedHealth</SelectItem>
                      <SelectItem value="none">No Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Contact & Address</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Alternate Email</Label>
                  <Input value={formData.alternateEmail} onChange={(e) => setFormData(prev => ({ ...prev, alternateEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Alternate Phone</Label>
                  <Input type="tel" value={formData.alternatePhone} onChange={(e) => setFormData(prev => ({ ...prev, alternatePhone: e.target.value }))} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Street Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input value={formData.zipCode} onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input value={formData.emergencyContact} onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Phone</Label>
                  <Input type="tel" value={formData.emergencyPhone} onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Medical Information & Review</h3>
              <div className="space-y-2">
                <Label>Allergies</Label>
                <Textarea placeholder="List any known allergies..." value={formData.allergies} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, allergies: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Medical History</Label>
                <Textarea placeholder="Relevant medical history..." value={formData.medicalHistory} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, medicalHistory: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea placeholder="Any additional notes..." value={formData.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold">Review</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="font-medium">{formData.firstName} {formData.lastName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Primary Email</div>
                    <div className="font-medium">{formData.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Primary Phone</div>
                    <div className="font-medium">{formData.phone}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">DOB</div>
                    <div className="font-medium">{formData.dateOfBirth}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Address</div>
                    <div className="font-medium">{formData.address} {formData.city} {formData.zipCode}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {step > 1 && (
                <Button variant="outline" type="button" onClick={prevStep} disabled={isLoading} className="mr-2">Back</Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="cancel" type="button" onClick={closeAddPatientModal} disabled={isLoading}>Cancel</Button>
              {step < 3 ? (
                <Button type="button" onClick={nextStep} className="bg-blue-600 hover:bg-blue-700 text-white">Next</Button>
              ) : (
                <Button variant="brand" type="button" onClick={handleSubmit} disabled={isLoading}>{isLoading ? "Adding..." : "Add Patient"}</Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}