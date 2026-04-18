import { useEffect, useState, useCallback } from 'react';

export interface PaymentStatusOption {
  key: number;
  value: string;
  label: string;
  description: string;
  bgColor?: string;
  textColor?: string;
}

interface UsePaymentStatusesReturn {
  statuses: PaymentStatusOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getPaymentStatusColors: (status: string) => { bgColor: string; textColor: string };
}

/**
 * Hook to fetch payment statuses from backend
 * Falls back to frontend config if backend is unavailable
 */
export const usePaymentStatuses = (): UsePaymentStatusesReturn => {
  const [statuses, setStatuses] = useState<PaymentStatusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getPaymentStatusColors = useCallback((status: string): { bgColor: string; textColor: string } => {
    const statusOption = statuses.find(s => s.value === status);
    if (statusOption?.bgColor && statusOption?.textColor) {
      return {
        bgColor: statusOption.bgColor,
        textColor: statusOption.textColor
      };
    }
    // Fallback colors
    return { bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
  }, [statuses]);

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
          description: "Payment completed in full",
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-700"
        },
        {
          key: 2,
          value: "unpaid",
          label: "Unpaid",
          description: "Payment not yet made",
          bgColor: "bg-gray-50",
          textColor: "text-gray-700"
        },
        {
          key: 3,
          value: "half-paid",
          label: "Half Paid",
          description: "Partial payment received",
          bgColor: "bg-orange-50",
          textColor: "text-orange-700"
        },
        {
          key: 4,
          value: "overdue",
          label: "Overdue",
          description: "Payment past due date",
          bgColor: "bg-red-50",
          textColor: "text-red-700"
        },
        {
          key: 5,
          value: "pay-at-clinic",
          label: "Pay at Clinic",
          description: "Payment to be made at clinic",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700"
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
    getPaymentStatusColors
  };
};
