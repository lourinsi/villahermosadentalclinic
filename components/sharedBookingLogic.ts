type Toast = { error?: (msg: string) => void } | ((msg: string) => void);

type BookingFlow = 'details-payment' | 'multi-step';
type BookingStep = 'details' | 'patient' | 'schedule' | 'treatment' | 'doctor' | 'payment';

export type BookingConflictWarning = {
  type: 'duration' | 'patient';
  label: string;
  message: string;
};

type UseSharedBookingLogicArgs = {
  modalStep: BookingStep;
  flow?: BookingFlow;
  selectedPatient?: string | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  appointmentType?: string | null;
  customAppointmentTypeName?: string;
  selectedDoctor?: string | null;
  setModalStep: (step: BookingStep) => void;
  setIsConfirmSummaryOpen?: (v: boolean) => void;
  toast: Toast;
  durationConflict?: string;
  patientConflict?: string;
  skipDoctorStep?: boolean;
  allowConflictSummary?: boolean;
};

export function getBookingConflictWarnings({
  durationConflict,
  patientConflict,
  duration,
}: {
  durationConflict?: string;
  patientConflict?: string;
  duration?: string | number | null;
}): BookingConflictWarning[] {
  const warnings: BookingConflictWarning[] = [];
  const durationLabel = duration ? `${duration} minute duration` : 'Selected duration';

  if (durationConflict) {
    warnings.push({
      type: 'duration',
      label: 'Duration conflict',
      message: `${durationLabel} conflicts with ${durationConflict.replace(/^conflicts with\s+/i, '')}.`,
    });
  }

  if (patientConflict) {
    warnings.push({
      type: 'patient',
      label: 'Patient conflict',
      message: patientConflict,
    });
  }

  return warnings;
}

function safeToastError(toast: Toast, msg: string) {
  try {
    if (!toast) return;
    if (typeof toast === 'function') return toast(msg);
    if (typeof toast.error === 'function') return toast.error(msg);
  } catch {
    // no-op
  }
}

export default function useSharedBookingLogic({
  modalStep,
  flow,
  selectedPatient,
  selectedDate,
  selectedTime,
  appointmentType,
  customAppointmentTypeName,
  selectedDoctor,
  setModalStep,
  setIsConfirmSummaryOpen,
  toast,
  durationConflict,
  patientConflict,
  skipDoctorStep = false,
  allowConflictSummary = false,
}: UseSharedBookingLogicArgs) {
  const isDetailsPaymentFlow = flow === 'details-payment' || modalStep === 'details';

  function validatePatient() {
    if (!selectedPatient) {
      safeToastError(toast, 'Please select a patient before continuing.');
      return false;
    }

    return true;
  }

  function validateScheduleAvailability() {
    if (durationConflict) {
      safeToastError(toast, durationConflict);
      return false;
    }

    if (patientConflict) {
      safeToastError(toast, patientConflict);
      return false;
    }

    return true;
  }

  function validateSchedule() {
    if (!selectedDate || !selectedTime) {
      safeToastError(toast, 'Please choose a date and time for the appointment.');
      return false;
    }

    return validateScheduleAvailability();
  }

  function validateScheduleSelection() {
    if (!selectedDate || !selectedTime) {
      safeToastError(toast, 'Please choose a date and time for the appointment.');
      return false;
    }

    return true;
  }

  function validateTreatment() {
    if (!appointmentType) {
      safeToastError(toast, 'Please select a treatment before continuing.');
      return false;
    }

    if (appointmentType === 'Other' && !String(customAppointmentTypeName || '').trim()) {
      safeToastError(toast, 'Please type the name of the custom treatment.');
      return false;
    }

    return true;
  }

  function validateDoctor() {
    if (!selectedDoctor) {
      safeToastError(toast, 'Please select a doctor before continuing.');
      return false;
    }

    return validateScheduleAvailability();
  }

  function openSummary() {
    if (typeof setIsConfirmSummaryOpen === 'function') {
      setIsConfirmSummaryOpen(true);
      return true;
    }

    return false;
  }

  function handleNextStep() {
    if (isDetailsPaymentFlow) {
      if (modalStep === 'details') {
        if (!validatePatient() || !(allowConflictSummary ? validateScheduleSelection() : validateSchedule()) || !validateTreatment()) return false;
        setModalStep('payment');
        return true;
      }

      if (modalStep === 'payment') {
        if (!validatePatient() || !validateSchedule() || !validateTreatment() || !validateDoctor()) return false;
        return openSummary();
      }

      return false;
    }

    if (modalStep === 'patient') {
      if (!validatePatient()) return false;
      setModalStep('schedule');
      return true;
    }

    if (modalStep === 'schedule') {
      if (!validateSchedule()) return false;
      setModalStep('treatment');
      return true;
    }

    if (modalStep === 'treatment') {
      if (!validateTreatment()) return false;
      setModalStep(skipDoctorStep ? 'payment' : 'doctor');
      return true;
    }

    if (modalStep === 'doctor') {
      if (!validateDoctor()) return false;
      setModalStep('payment');
      return true;
    }

    if (modalStep === 'payment') {
      if (!validatePatient() || !validateSchedule() || !validateTreatment() || !validateDoctor()) return false;
      return openSummary();
    }

    return false;
  }

  function handlePrevStep() {
    if (isDetailsPaymentFlow && modalStep === 'payment') return setModalStep('details');
    if (modalStep === 'payment') return setModalStep(skipDoctorStep ? 'treatment' : 'doctor');
    if (modalStep === 'doctor') return setModalStep('treatment');
    if (modalStep === 'treatment') return setModalStep('schedule');
    if (modalStep === 'schedule') return setModalStep('patient');
    return setModalStep('patient');
  }

  return { handleNextStep, handlePrevStep };
}
