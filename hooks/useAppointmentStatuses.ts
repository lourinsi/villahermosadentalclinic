import { useEffect, useState, useCallback } from 'react';

export interface AppointmentStatusOption {
  key: number;
  value: string;
  label: string;
  description: string;
  bgColor?: string;
  textColor?: string;
}

interface UseAppointmentStatusesReturn {
  statuses: AppointmentStatusOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getStatusColors: (status: string) => { bgColor: string; textColor: string };
}

/**
 * Hook to fetch appointment statuses from backend
 * Falls back to frontend config if backend is unavailable
 */
export const useAppointmentStatuses = (): UseAppointmentStatusesReturn => {
  const [statuses, setStatuses] = useState<AppointmentStatusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getStatusColors = useCallback((status: string): { bgColor: string; textColor: string } => {
    const statusOption = statuses.find(s => s.value === status);
    if (statusOption?.bgColor && statusOption?.textColor) {
      return {
        bgColor: statusOption.bgColor,
        textColor: statusOption.textColor
      };
    }
    // Fallback colors
    return { bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
  }, [statuses]);

  const fetchStatuses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/statuses/appointments', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch appointment statuses: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setStatuses(data.data);
        setError(null);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching appointment statuses:', err);
      
      // Fallback to frontend config with colors
      const fallbackStatuses: AppointmentStatusOption[] = [
        {
          key: 1,
          value: "scheduled",
          label: "Scheduled",
          description: "Confirmed and scheduled",
          bgColor: "bg-emerald-100",
          textColor: "text-emerald-700"
        },
        {
          key: 2,
          value: "pending",
          label: "Pending",
          description: "Awaiting confirmation",
          bgColor: "bg-purple-100",
          textColor: "text-purple-700"
        },
        {
          key: 3,
          value: "reserved",
          label: "Reserved",
          description: "Tentatively reserved",
          bgColor: "bg-amber-100",
          textColor: "text-amber-700"
        },
        {
          key: 4,
          value: "cancelled",
          label: "Cancelled",
          description: "Appointment cancelled",
          bgColor: "bg-red-100",
          textColor: "text-red-700"
        },
        {
          key: 5,
          value: "completed",
          label: "Completed",
          description: "Appointment completed",
          bgColor: "bg-blue-100",
          textColor: "text-blue-700"
        },
        {
          key: 6,
          value: "tbd",
          label: "TBD",
          description: "Past appointment awaiting completion status",
          bgColor: "bg-red-100",
          textColor: "text-red-700"
        },
      ];
      
      setStatuses(fallbackStatuses);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  return {
    statuses,
    isLoading,
    error,
    refetch: fetchStatuses,
    getStatusColors
  };
};
