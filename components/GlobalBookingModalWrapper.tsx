"use client";

import BookingModal from "./BookingModal";
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
    <BookingModal
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
