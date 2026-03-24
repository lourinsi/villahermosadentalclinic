import { useEffect, useState, useCallback } from 'react';

export interface PaymentStatusOption {
  key: number;
  value: string;
  label: string;
  description: string;
}

interface UsePaymentStatusesReturn {
  statuses: PaymentStatusOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch payment statuses from backend
 * Falls back to frontend config if backend is unavailable
 */
export const usePaymentStatuses = (): UsePaymentStatusesReturn => {
  const [statuses, setStatuses] = useState<PaymentStatusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatuses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/statuses/payments', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment statuses: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setStatuses(data.data);
        setError(null);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching payment statuses:', err);
      
      // Fallback to frontend config
      const fallbackStatuses: PaymentStatusOption[] = [
        {
          key: 1,
          value: "paid",
          label: "Paid",
          description: "Payment completed in full"
        },
        {
          key: 2,
          value: "unpaid",
          label: "Unpaid",
          description: "Payment not yet made"
        },
        {
          key: 3,
          value: "half-paid",
          label: "Half Paid",
          description: "Partial payment received"
        },
        {
          key: 4,
          value: "overdue",
          label: "Overdue",
          description: "Payment past due date"
        },
        {
          key: 5,
          value: "pay-at-clinic",
          label: "Pay at Clinic",
          description: "Payment to be made at clinic"
        },
        {
          key: 6,
          value: "partially-paid-at-clinic",
          label: "Partially Paid at Clinic",
          description: "Partial payment made at clinic"
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
    refetch: fetchStatuses
  };
};
