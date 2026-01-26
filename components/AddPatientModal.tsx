"use client";

import { useState } from "react";
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
    refreshPatients 
  } = useAppointmentModal();
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
    dentalCharts: []
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("=== ADD PATIENT SUBMIT ===");
    setIsLoading(true);
    
    try {
      const patientData = {
        ...formData,
        createdAt: new Date().toISOString() // Add creation timestamp
      };
      console.log("Submitting patient data:", patientData);
      const response = await fetch("http://localhost:3001/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patientData),
      });

      console.log("Add patient response status:", response.status);
      const result = await response.json();
      console.log("Add patient response:", result);

      if (result.success) {
        toast.success("Patient added successfully!");
        refreshPatients(); // Refresh patient list to show new patient immediately
        closeAddPatientModal();
        // Reset form
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
          dentalCharts: []
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
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Phone *</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Email (Personal)</Label>
                <Input
                  type="email"
                  value={formData.alternateEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, alternateEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Phone (Personal)</Label>
                <Input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, alternatePhone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Insurance Provider</Label>
                <Select
                  value={formData.insurance}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, insurance: value }))}
                >
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

          {/* Address Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  value={formData.zipCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
            <div className="space-y-2">
              <Label>Allergies</Label>
              <Textarea
                placeholder="List any known allergies..."
                value={formData.allergies}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Medical History</Label>
              <Textarea
                placeholder="Relevant medical history..."
                value={formData.medicalHistory}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, medicalHistory: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="cancel" type="button" onClick={() => closeAddPatientModal()} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="brand" type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Patient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}