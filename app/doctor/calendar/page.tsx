"use client";

import { DoctorCalendarView } from '@/components/DoctorCalendarView';
import { Suspense } from 'react';

export default function DoctorCalendarPage() {
  return (
    <Suspense fallback={<div>Loading calendar...</div>}>
      <DoctorCalendarView />
    </Suspense>
  );
}
