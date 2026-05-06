"use client";

import React from "react";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";
import BookingModalWrapper from "./BookingModalWrapper";

/**
 * ContextBookingModal
 * 
 * Wrapper component that listens to appointment modal context state
 * and renders BookingModal with context values.
 * 
 * Use this in layouts where you want the BookingModal to be controlled
 * via the useAppointmentModal context (e.g., openEditModal).
 */
export function ContextBookingModal() {
  const {
    isEditModalOpen,
    closeEditModal,
    selectedAppointment,
    isPatientFieldReadOnly,
  } = useAppointmentModal();

  return (
    <BookingModalWrapper
      open={isEditModalOpen}
      onOpenChange={closeEditModal}
      appointmentToEdit={selectedAppointment || undefined}
      onBooked={() => {
        closeEditModal();
      }}
      onDeleted={() => {
        closeEditModal();
      }}
    />
  );
}
