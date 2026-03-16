/**
 * Appointment Status Constants (Frontend)
 * 
 * Standardized appointment status system
 */

export const APPOINTMENT_STATUSES = {
  SCHEDULED: 'scheduled',   // Confirmed and scheduled
  PENDING: 'pending',       // Awaiting confirmation
  RESERVED: 'reserved',     // Tentatively reserved
  CANCELLED: 'cancelled',   // Appointment cancelled
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[keyof typeof APPOINTMENT_STATUSES];

/**
 * Status Descriptions for UI/Documentation
 */
export const STATUS_DESCRIPTIONS: Record<AppointmentStatus, string> = {
  [APPOINTMENT_STATUSES.SCHEDULED]: 'Appointment is confirmed and scheduled',
  [APPOINTMENT_STATUSES.PENDING]: 'Awaiting confirmation from patient or clinic',
  [APPOINTMENT_STATUSES.RESERVED]: 'Time slot is tentatively reserved',
  [APPOINTMENT_STATUSES.CANCELLED]: 'Appointment has been cancelled',
} as const;

/**
 * Get available status options for UI dropdowns
 */
export const getStatusOptions = () => [
  { label: 'Scheduled', value: APPOINTMENT_STATUSES.SCHEDULED },
  { label: 'Pending', value: APPOINTMENT_STATUSES.PENDING },
  { label: 'Reserved', value: APPOINTMENT_STATUSES.RESERVED },
  { label: 'Cancelled', value: APPOINTMENT_STATUSES.CANCELLED },
];