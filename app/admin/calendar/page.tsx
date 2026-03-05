import { CalendarView } from '@/components/CalendarView';
import { Suspense } from 'react';

export default function CalendarPage() {
  return (
    <Suspense fallback={<div>Loading calendar...</div>}>
      <CalendarView />
    </Suspense>
  );
}
