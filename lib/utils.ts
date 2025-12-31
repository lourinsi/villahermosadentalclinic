import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parseBackendDateToLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Using local time components to avoid timezone issues
  return new Date(year, month - 1, day); // month - 1 because months are 0-indexed
};

export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};