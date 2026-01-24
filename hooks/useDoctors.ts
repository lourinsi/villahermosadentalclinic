import { useCallback, useEffect, useState } from "react";

export interface DoctorOption {
  id: string;
  name: string;
  role: string;
  specialization?: string;
  email?: string;
  profilePicture?: string;
}

const STAFF_API = "http://localhost:3001/api/staff?limit=100";

export function useDoctors(refreshKey?: number) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  const loadDoctors = useCallback(async () => {
    try {
      setIsLoadingDoctors(true);
      const response = await fetch(STAFF_API);
      const result = await response.json();
      if (result?.success && Array.isArray(result.data)) {
        const dentistOnly = result.data.filter((staff: any) => {
          const role = String(staff.role || "").toLowerCase();
          const specialization = String(staff.specialization || "").toLowerCase();
          return role.includes("dentist") || specialization.includes("dentist");
        });
        setDoctors(
          dentistOnly.map((staff: any) => ({
            id: String(staff.id ?? staff.email ?? staff.name),
            name: staff.name,
            role: staff.role,
            specialization: staff.specialization,
            email: staff.email,
            profilePicture: staff.profilePicture,
          }))
        );
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error("Failed to load doctors:", error);
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors, refreshKey]);

  return { doctors, isLoadingDoctors, reloadDoctors: loadDoctors };
}
