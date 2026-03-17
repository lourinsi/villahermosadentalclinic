"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import { APPOINTMENT_STATUSES } from "@/lib/appointment-statuses";
import { toast } from "sonner";
import { Appointment } from "../hooks/useAppointments";
import { Calendar as CalendarIcon, CreditCard, Banknote, Trash2 } from "lucide-react";
import { formatTimeTo12h } from "../lib/time-slots";

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

export function EditAppointmentModal() {
  const { 
    isEditModalOpen, 
    closeEditModal, 
    selectedAppointment: appointment,
    updateAppointment, 
    deleteAppointment, 
    refreshAppointments,
  } = useAppointmentModal();

  const [editModalStep, setEditModalStep] = useState<"details" | "payment">("details");
  const [editFormData, setEditFormData] = useState<any>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>("GCash");
  const [editAmountToPay, setEditAmountToPay] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Initialize form data when appointment changes
  useEffect(() => {
    if (isEditModalOpen && appointment) {
      const appointmentType = appointment.customType || APPOINTMENT_TYPE_MAP[appointment.type] || "Other";
      setEditFormData({
        type: appointmentType,
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes,
      });
      setEditPaymentMethod("GCash");
      // Initialize payment amount to empty so user enters NEW payment
      setEditAmountToPay("");
    } else {
      setEditFormData(null);
      setEditModalStep("details");
    }
  }, [appointment, isEditModalOpen]);

  const handleSave = async () => {
    if (!appointment?.id) {
      toast.error("No appointment selected.");
      return;
    }

    if (!editFormData.type) {
      toast.error("Please select an appointment type.");
      return;
    }

    if (!appointment.date || !appointment.time) {
      toast.error("Please fill all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      // Parse payment amount
      const amountPaidRaw = editAmountToPay.trim() === '' ? '0' : editAmountToPay;
      const amountPaid = parseFloat(amountPaidRaw) || 0;

      console.log('[EditAppointmentModal Payment] Payment confirmation:', {
        editAmountToPay,
        amountPaidRaw,
        amountPaid,
        totalPrice: appointment.price,
        parsing: {
          trimmed: editAmountToPay.trim(),
          parseFloat: parseFloat(amountPaidRaw),
        }
      });

      // Calculate new payment totals
      const previouslyPaid = appointment.totalPaid || 0;
      const newTotalPaid = previouslyPaid + amountPaid;
      const newBalance = Math.max(0, (appointment.price || 0) - newTotalPaid);

      // Determine payment status and appointment status
      let paymentStatus: 'paid' | 'unpaid' | 'half-paid' = 'unpaid';
      let autoStatus: string = editFormData.status;

      if (newBalance <= 0) {
        paymentStatus = 'paid';
        autoStatus = 'scheduled';
      } else if (newTotalPaid > 0) {
        paymentStatus = 'half-paid';
        autoStatus = 'reserved';
      } else {
        paymentStatus = 'unpaid';
        autoStatus = editFormData.status;
      }

      console.log('[EditAppointmentModal Payment] Calculated payment details:', {
        previouslyPaid,
        newPayment: amountPaid,
        newTotalPaid,
        newBalance,
        paymentStatus,
        autoStatus,
      });

      const updatedForm = {
        type: appointment.type,
        customType: editFormData.type,
        duration: editFormData.duration,
        status: autoStatus,
        notes: editFormData.notes,
        paymentStatus: paymentStatus,
        totalPaid: newTotalPaid,
        balance: newBalance,
      };

      const updated = await updateAppointment(appointment.id, updatedForm as Partial<Appointment>);

      // Log the updated appointment with all details
      console.log('[EditAppointmentModal Payment] ✅ APPOINTMENT UPDATED SUCCESSFULLY:', {
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

      toast.success(`Appointment updated with payment of ₱${amountPaid.toLocaleString()}!`);
      try { window.dispatchEvent(new CustomEvent('appointments:updated', { detail: { appointment: updated } })); } catch (e) {}
      refreshAppointments();
      closeEditModal();
    } catch (err) {
      console.error("Error updating appointment:", err);
      toast.error("Failed to update appointment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment?.id) return;
    setIsLoading(true);
    try {
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

  if (!appointment || !editFormData) return null;

  return (
    <>
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          closeEditModal();
          setEditModalStep("details");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                Edit Appointment
              </DialogTitle>
              <div className="flex gap-2">
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${editModalStep === "details" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                  Step 1: Details
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${editModalStep === "payment" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
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

          {editModalStep === "details" ? (
            <>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Appointment Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Patient Name</Label>
                      <Input 
                        type="text"
                        value={appointment.patientName}
                        readOnly
                        className="bg-gray-100 border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Doctor</Label>
                      <Input 
                        type="text"
                        value={appointment.doctor}
                        readOnly
                        className="bg-gray-100 border-gray-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Date</Label>
                      <div className="h-11 rounded-lg border border-gray-200 bg-gray-100 flex items-center px-3 text-sm font-medium">
                        {appointment.date}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600">Time</Label>
                      <div className="h-11 rounded-lg border border-gray-200 bg-gray-100 flex items-center px-3 text-sm font-medium">
                        {formatTimeTo12h(appointment.time)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label className="text-sm font-bold text-gray-700">Appointment Status</Label>
                  <Select value={editFormData.status} onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}>
                    <SelectTrigger className="h-11 rounded-lg border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_STATUSES.map((option) => (
                        <SelectItem key={option.key} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-3 pt-6 border-t">
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isLoading}
                  className="h-11 px-6 rounded-lg"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => closeEditModal()}
                  disabled={isLoading}
                  className="h-11 px-6 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setEditModalStep("payment")}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8 rounded-lg shadow-lg shadow-blue-100"
                >
                  Next: Payment
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Service:</span>
                    <span className="font-medium text-gray-900">{editFormData?.type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Date:</span>
                    <span className="font-medium text-gray-900">{appointment.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Time:</span>
                    <span className="font-medium text-gray-900">{formatTimeTo12h(appointment.time)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="font-bold text-gray-900">Total Price:</span>
                    <span className="font-bold text-lg text-gray-900">
                      ₱{((appointment?.price) || 0).toLocaleString()}
                    </span>
                  </div>
                  {(appointment?.totalPaid || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Already Paid:</span>
                      <span className="font-medium text-green-600">
                        ₱{(appointment?.totalPaid || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Remaining Balance:</span>
                    <span className="font-bold text-lg text-blue-600">
                      ₱{((appointment?.balance ?? appointment?.price) || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editPaymentAmount" className="text-sm font-semibold text-gray-700">Amount to Pay Now</Label>
                  <Input
                    id="editPaymentAmount"
                    type="number"
                    placeholder={`Enter amount (e.g. ${((appointment?.balance ?? appointment?.price) || 0).toLocaleString()})`}
                    value={editAmountToPay}
                    onChange={(e) => setEditAmountToPay(e.target.value)}
                    className="font-bold text-lg h-12 border-gray-200"
                  />
                  <p className="text-xs text-gray-500">Leave blank or enter 0 to skip payment. Remaining balance: ₱{((appointment?.balance ?? appointment?.price) || 0).toLocaleString()}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-900">Select Payment Method</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 rounded-lg transition-all ${
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
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 rounded-lg transition-all ${
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
                      className={`h-20 flex flex-col items-center justify-center gap-1 border-2 rounded-lg transition-all ${
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
                  disabled={isLoading}
                  className="h-11 px-6 rounded-lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8 rounded-lg shadow-lg shadow-blue-100"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
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
            <DialogTitle>Delete Appointment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this appointment? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
