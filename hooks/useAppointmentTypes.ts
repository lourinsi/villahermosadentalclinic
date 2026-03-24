import { useEffect, useState, useCallback } from 'react';

export interface AppointmentTypeOption {
  id: number;
  value: string;
  label: string;
  price?: number;
  duration?: number;
}

interface UseAppointmentTypesReturn {
  types: AppointmentTypeOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch appointment types from backend
 * Falls back to frontend config if backend is unavailable
 */
export const useAppointmentTypes = (): UseAppointmentTypesReturn => {
  const [types, setTypes] = useState<AppointmentTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/appointment-types', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch appointment types: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setTypes(data.data);
        setError(null);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching appointment types:', err);
      
      // Fallback to frontend config
      const fallbackTypes: AppointmentTypeOption[] = [
        { id: 0, value: "Routine Cleaning", label: "Routine Cleaning", price: 1500, duration: 30 },
        { id: 1, value: "Checkup", label: "Checkup", price: 500, duration: 30 },
        { id: 2, value: "Filling", label: "Filling", price: 1200, duration: 45 },
        { id: 3, value: "Root Canal", label: "Root Canal", price: 5000, duration: 60 },
        { id: 4, value: "Extraction", label: "Extraction", price: 1500, duration: 45 },
        { id: 5, value: "Whitening", label: "Whitening", price: 3000, duration: 60 },
        { id: 6, value: "Other", label: "Other", duration: 30 }
      ];
      
      setTypes(fallbackTypes);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return {
    types,
    isLoading,
    error,
    refetch: fetchTypes
  };
};
