import { AdminCalendarView } from '@/components/AdminCalendarView';
import { Suspense } from 'react';

export default function CalendarPage() {
  return (
    <Suspense fallback={<div>Loading calendar...</div>}>
      <AdminCalendarView />
    </Suspense>
  );
}
