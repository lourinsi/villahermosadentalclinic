"use client";

import BookingModalWrapper from "./BookingModalWrapper";
import { useAppointmentModal } from "@/hooks/useAppointmentModal";

/**
 * GlobalBookingModalWrapper
 * 
 * Connects BookingModal to the appointment modal context for patient booking flow.
 * This wrapper makes BookingModal available globally for all users (patients/admins).
 */
export function GlobalBookingModalWrapper() {
  const {
    isPatientBookingModalOpen,
    closePatientBookingModal,
    newAppointmentDate,
    newAppointmentTime,
    newAppointmentDoctorName,
  } = useAppointmentModal();

  return (
    <BookingModalWrapper
      open={isPatientBookingModalOpen}
      onOpenChange={(open) => {
        if (!open) {
          closePatientBookingModal();
        }
      }}
      defaultDate={newAppointmentDate}
      defaultTime={newAppointmentTime}
      doctorName={newAppointmentDoctorName}
    />
  );
}
