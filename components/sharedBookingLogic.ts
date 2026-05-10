type Toast = { error?: (msg: string) => void } | ((msg: string) => void);

type BookingFlow = 'details-payment' | 'multi-step';
type BookingStep = 'details' | 'patient' | 'schedule' | 'treatment' | 'doctor' | 'payment';
type BookingActorRole = 'public' | 'patient' | 'admin' | 'doctor' | '';
export type BookingMode = 'standard' | 'public';
export type BookingCreationMode = 'standard' | 'past';

export const PAST_APPOINTMENT_STATUS_VALUES = ['cancelled', 'completed', 'tbd'] as const;

export function getDefaultPastAppointmentDate(now: Date = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

export function getDefaultPastAppointmentTime() {
  return '09:00';
}

export type BookingConflictWarning = {
  type: 'duration' | 'patient';
  label: string;
  message: string;
};

export function getBookingActor({
  userRole,
  bookingMode = 'standard',
}: {
  userRole?: string | null;
  bookingMode?: BookingMode;
}) {
  const isPublicBookingMode = bookingMode === 'public' && !userRole;
  const effectiveRole = (isPublicBookingMode ? 'public' : userRole || '') as BookingActorRole;
  const isStaffBookingMode = effectiveRole === 'admin' || effectiveRole === 'doctor';
  const isPatientLevelBookingMode = effectiveRole === 'patient' || effectiveRole === 'public';
  const canManageStatuses = Boolean(effectiveRole) && !isPatientLevelBookingMode;

  return {
    effectiveRole,
    isPublicBookingMode,
    isStaffBookingMode,
    isPatientLevelBookingMode,
    canCreatePatients: isStaffBookingMode || effectiveRole === 'public',
    canManagePricing: isStaffBookingMode,
    canManageStatuses,
    isDoctorSelectionLocked: userRole === 'doctor',
  };
}

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
  scheduleMode?: BookingCreationMode;
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

export function getBookingSummaryNotes(notes?: string | null) {
  const text = String(notes || '').trim();

  return {
    hasNotes: text.length > 0,
    text: text || 'No notes added.',
  };
}

export function getProjectedBookingStatus({
  userRole,
  bookingMode = 'standard',
  isEditing,
  statusChangedByUser,
  selectedStatus,
  existingStatus,
  amountPaid,
  previouslyPaidAmount,
  totalPrice,
}: {
  userRole?: string | null;
  bookingMode?: BookingMode;
  isEditing: boolean;
  statusChangedByUser: boolean;
  selectedStatus?: string | null;
  existingStatus?: string | null;
  amountPaid: number;
  previouslyPaidAmount: number;
  totalPrice: number;
}) {
  const { isStaffBookingMode } = getBookingActor({ userRole, bookingMode });
  const safeSelectedStatus =
    isStaffBookingMode && selectedStatus === 'pending'
      ? 'reserved'
      : selectedStatus || existingStatus || (isStaffBookingMode ? 'reserved' : 'pending');

  if (statusChangedByUser) {
    return safeSelectedStatus;
  }

  if (isEditing) {
    if (amountPaid <= 0) {
      return safeSelectedStatus;
    }

    const newTotalPaid = previouslyPaidAmount + amountPaid;
    const newBalance = Math.max(0, totalPrice - newTotalPaid);

    if (newBalance <= 0) return 'scheduled';
    if (newTotalPaid > 0) return 'reserved';
    return safeSelectedStatus;
  }

  const balance = Math.max(0, totalPrice - amountPaid);

  if (isStaffBookingMode && amountPaid <= 0) return 'reserved';
  if (balance <= 0) return 'scheduled';
  if (amountPaid > 0) return 'reserved';

  return isStaffBookingMode ? 'reserved' : 'pending';
}

export function getProjectedPaymentStatus({
  paymentMethod,
  statusChangedByUser,
  selectedStatus,
  existingStatus,
  amountPaid,
  previouslyPaidAmount,
  totalPrice,
}: {
  paymentMethod?: string | null;
  statusChangedByUser: boolean;
  selectedStatus?: string | null;
  existingStatus?: string | null;
  amountPaid: number;
  previouslyPaidAmount: number;
  totalPrice: number;
}) {
  if (String(paymentMethod || '').trim().toLowerCase() === 'pay at clinic') {
    return 'pay-at-clinic';
  }

  if (statusChangedByUser) {
    return selectedStatus || existingStatus || 'unpaid';
  }

  const safeAmountPaid = Number.isFinite(amountPaid) ? Math.max(0, amountPaid) : 0;
  const safePreviouslyPaidAmount = Number.isFinite(previouslyPaidAmount) ? Math.max(0, previouslyPaidAmount) : 0;
  const safeTotalPrice = Number.isFinite(totalPrice) ? Math.max(0, totalPrice) : 0;
  const newTotalPaid = safeAmountPaid > 0 ? safePreviouslyPaidAmount + safeAmountPaid : safePreviouslyPaidAmount;
  const newBalance = Math.max(0, safeTotalPrice - newTotalPaid);

  if (newBalance <= 0) return 'paid';
  if (newTotalPaid > 0) return 'half-paid';

  return 'unpaid';
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
  scheduleMode = 'standard',
}: UseSharedBookingLogicArgs) {
  const isDetailsPaymentFlow = flow === 'details-payment' || modalStep === 'details';

  function getSelectedAppointmentDateTime() {
    if (!selectedDate || !selectedTime) return null;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    return appointmentDateTime;
  }

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

    if (!validateScheduleWindow()) return false;

    return validateScheduleAvailability();
  }

  function validateScheduleSelection() {
    if (!selectedDate || !selectedTime) {
      safeToastError(toast, 'Please choose a date and time for the appointment.');
      return false;
    }

    return validateScheduleWindow();
  }

  function validateScheduleWindow() {
    if (scheduleMode !== 'past') return true;

    const appointmentDateTime = getSelectedAppointmentDateTime();
    if (!appointmentDateTime) return true;

    if (appointmentDateTime.getTime() > Date.now()) {
      safeToastError(toast, 'Past appointment entries must use a date and time that have already passed.');
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
      if (skipDoctorStep) {
        if (!validateDoctor()) return false;
        setModalStep('treatment');
      } else {
        setModalStep('doctor');
      }
      return true;
    }

    if (modalStep === 'treatment') {
      if (!validateTreatment()) return false;
      setModalStep('payment');
      return true;
    }

    if (modalStep === 'doctor') {
      if (!validateDoctor()) return false;
      setModalStep('treatment');
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
    if (modalStep === 'payment') return setModalStep('treatment');
    if (modalStep === 'treatment') return setModalStep(skipDoctorStep ? 'schedule' : 'doctor');
    if (modalStep === 'doctor') return setModalStep('schedule');
    if (modalStep === 'schedule') return setModalStep('patient');
    return setModalStep('patient');
  }

  return { handleNextStep, handlePrevStep };
}
