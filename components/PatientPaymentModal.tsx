"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { CreditCard } from "lucide-react";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { getAppointmentTypeName } from "@/lib/appointment-types";
import { formatTimeTo12h } from "@/lib/time-slots";
import { parseBackendDateToLocal } from "@/lib/utils";
import { toast } from "sonner";

export function PatientPaymentModal() {
  const {
    isPatientPaymentModalOpen,
    closePaymentModal,
    appointmentId,
    appointments,
  } = usePaymentModal();

  const [paymentMethod, setPaymentMethod] = useState<string>("GCash");

  const selectedAppointment = appointments.find(
    (a: any) => a.id === appointmentId
  );

  const handleConfirmPayment = () => {
    // Payment logic implementation placeholder
    toast.success("Payment successful! (Simulated)");
    closePaymentModal();
  };

  if (!selectedAppointment) return null;

  return (
    <Dialog open={isPatientPaymentModalOpen} onOpenChange={closePaymentModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Secure your appointment by completing the payment process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Service:</span>
              <span className="font-medium">
                {getAppointmentTypeName(
                  selectedAppointment.type,
                  selectedAppointment.customType
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="font-medium">
                {parseBackendDateToLocal(
                  selectedAppointment.date
                ).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Time:</span>
              <span className="font-medium">
                {formatTimeTo12h(selectedAppointment.time)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="font-bold">Amount Due:</span>
              <span className="font-bold text-lg text-blue-600">
                ₱{selectedAppointment.price || 0}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Select Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className={`h-16 flex flex-col items-center justify-center gap-1 border-2 ${
                  paymentMethod === "GCash"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
                onClick={() => setPaymentMethod("GCash")}
              >
                <span className="font-bold text-blue-700 italic text-xl">
                  GCash
                </span>
              </Button>
              <Button
                variant="outline"
                className={`h-16 flex flex-col items-center justify-center gap-1 border-2 ${
                  paymentMethod === "Card"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
                onClick={() => setPaymentMethod("Card")}
              >
                <CreditCard
                  className={`h-6 w-6 ${
                    paymentMethod === "Card" ? "text-blue-600" : "text-gray-600"
                  }`}
                />
                <span
                  className={`text-xs ${
                    paymentMethod === "Card" ? "text-blue-700" : ""
                  }`}
                >
                  Credit Card
                </span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={closePaymentModal}
            className="w-full sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleConfirmPayment}
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
