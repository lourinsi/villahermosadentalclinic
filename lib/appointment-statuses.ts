/**
 * Appointment Status Configuration
 * Single source of truth for all appointment statuses
 * Stored in frontend as this is static configuration, not dynamic data
 */

export interface AppointmentStatusOption {
  key: number;
  value: string;
  label: string;
  description: string;
}

export const APPOINTMENT_STATUSES: AppointmentStatusOption[] = [
  {
    key: 1,
    value: "scheduled",
    label: "Scheduled",
    description: "Confirmed and scheduled"
  },
  {
    key: 2,
    value: "pending",
    label: "Pending",
    description: "Awaiting confirmation"
  },
  {
    key: 3,
    value: "reserved",
    label: "Reserved",
    description: "Tentatively reserved"
  },
  {
    key: 4,
    value: "cancelled",
    label: "Cancelled",
    description: "Appointment cancelled"
  },
  {
    key: 5,
    value: "completed",
    label: "Completed",
    description: "Appointment completed"
  },
];

/**
 * Get status option by value/key
 */
export const getStatusOption = (statusValue: string | number): AppointmentStatusOption | undefined => {
  if (typeof statusValue === 'number') {
    return APPOINTMENT_STATUSES.find(s => s.key === statusValue);
  }
  return APPOINTMENT_STATUSES.find(s => s.value === statusValue);
};

/**
 * Get status label by value
 */
export const getStatusLabel = (statusValue: string | number): string => {
  const status = getStatusOption(statusValue);
  return status?.label || String(statusValue);
};

/**
 * Get status description by value
 */
export const getStatusDescription = (statusValue: string | number): string => {
  const status = getStatusOption(statusValue);
  return status?.description || '';
};

/**
 * All valid status values
 */
export const VALID_STATUS_VALUES = APPOINTMENT_STATUSES.map(s => s.value);

/**
 * Check if a value is a valid status
 */
export const isValidStatus = (value: string | number): boolean => {
  if (typeof value === 'number') {
    return APPOINTMENT_STATUSES.some(s => s.key === value);
  }
  return VALID_STATUS_VALUES.includes(value);
};

/**
 * Status type for TypeScript
 */
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number]['value'];
