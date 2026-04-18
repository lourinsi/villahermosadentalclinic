"use client";
import { useCallback, useEffect, useState } from "react";
import { Staff } from "../lib/staff-types";

export interface DoctorOption {
  id: string;
  name: string;
  role: string;
  specialization?: string;
  email?: string;
  profilePicture?: string;
  bio?: string;
}

const STAFF_API = "http://localhost:3001/api/staff?limit=100";

export function useDoctors(refreshKey?: number) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  const loadDoctors = useCallback(async () => {
    try {
      setIsLoadingDoctors(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      
      const response = await fetch(STAFF_API, { headers, credentials: "include" });
      
      if (!response.ok) {
        console.error('[useDoctors] Fetch failed with status:', response.status, response.statusText);
        setDoctors([]);
        setIsLoadingDoctors(false);
        return;
      }
      
      const result = await response.json();
      
      if (result?.success && Array.isArray(result.data)) {
        const dentistOnly = result.data.filter((staff: Staff) => {
          const role = String(staff.role || "").toLowerCase();
          const specialization = String(staff.specialization || "").toLowerCase();
          return role.includes("dentist") || specialization.includes("dentist");
        });
        setDoctors(
          dentistOnly.map((staff: Staff) => ({
            id: String(staff.id ?? staff.email ?? staff.name),
            name: staff.name,
            role: staff.role,
            specialization: staff.specialization,
            email: staff.email,
            profilePicture: staff.profilePicture,
            bio: staff.bio,
          }))
        );
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error('[useDoctors] Failed to load doctors:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[useDoctors] Network error - backend server may not be running at', STAFF_API);
      }
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