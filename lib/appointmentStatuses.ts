/**
 * Appointment Status Constants (Frontend)
 * 
 * Standardized appointment status system with color definitions
 */

export const APPOINTMENT_STATUSES = {
  SCHEDULED: 'scheduled',   // Confirmed and scheduled
  PENDING: 'pending',       // Awaiting confirmation
  RESERVED: 'reserved',     // Tentatively reserved
  CANCELLED: 'cancelled',   // Appointment cancelled
  COMPLETED: 'completed',   // Appointment completed
  TBD: 'tbd',               // Past appointment awaiting completion status
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
  [APPOINTMENT_STATUSES.COMPLETED]: 'Appointment has been completed',
  [APPOINTMENT_STATUSES.TBD]: 'Past appointment awaiting completion status',
} as const;

/**
 * Status Colors for UI display
 */
export const STATUS_COLORS: Record<AppointmentStatus, { bgColor: string; textColor: string }> = {
  [APPOINTMENT_STATUSES.SCHEDULED]: { bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  [APPOINTMENT_STATUSES.PENDING]: { bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  [APPOINTMENT_STATUSES.RESERVED]: { bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  [APPOINTMENT_STATUSES.CANCELLED]: { bgColor: 'bg-red-100', textColor: 'text-red-700' },
  [APPOINTMENT_STATUSES.COMPLETED]: { bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  [APPOINTMENT_STATUSES.TBD]: { bgColor: 'bg-red-100', textColor: 'text-red-700' },
} as const;

/**
 * Get available status options for UI dropdowns
 */
export const getStatusOptions = () => [
  { label: 'Scheduled', value: APPOINTMENT_STATUSES.SCHEDULED },
  { label: 'Pending', value: APPOINTMENT_STATUSES.PENDING },
  { label: 'Reserved', value: APPOINTMENT_STATUSES.RESERVED },
  { label: 'Cancelled', value: APPOINTMENT_STATUSES.CANCELLED },
  { label: 'Completed', value: APPOINTMENT_STATUSES.COMPLETED },
  { label: 'TBD', value: APPOINTMENT_STATUSES.TBD },
];

/**
 * Get color for a status value
 */
export const getStatusColor = (status: string): { bgColor: string; textColor: string } => {
  return STATUS_COLORS[status as AppointmentStatus] || { bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
};