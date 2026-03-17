# Appointment Status Mapping

This document defines the meaning of each appointment status in the Villahermosa Dental Clinic system.

## Status Definitions

### 1. **scheduled** ✅ CONFIRMED & PAID
- Appointment is fully booked and paid in full
- Shows in patient's calendar view
- Shows in doctor's calendar view
- Patient can request cancellation
- Doctor/Admin can modify or cancel

### 2. **confirmed** ✅ PAID & ACCEPTED
- Appointment is confirmed by doctor/admin and fully paid
- Shows in patient's calendar view
- Shows in doctor's calendar view
- Patient can request cancellation
- Doctor/Admin can modify or cancel

### 3. **reserved** 🛒 CART ITEM (Unpaid or Partially Paid)
- **Unpaid**: Patient added to cart but hasn't paid
  - Auto-cancels after 24 hours if no payment made
  - Status changes to `cancelled` after 24hr timeout
  
- **Partially Paid**: Patient made partial payment
  - No time limit
  - Awaits doctor approval in the Requests tab
  - Doctor can accept/decline
  - Shows in Requests/Pending section for doctor

- **Does NOT show** in patient's confirmed calendar view (only in cart)
- Doctor sees these in "Requests" tab for action

### 4. **pending** ⏳ PAY AT CLINIC
- Patient chose "Pay at Clinic" option during booking
- Appointment reserved but payment due at visit
- Awaits doctor/admin acceptance
- Doctor/Admin review in Requests tab
- Can be approved or declined
- Once approved, status changes to `scheduled`
- Does NOT show in patient's confirmed calendar view (only in cart)

### 5. **cancelled** ❌ CANCELLED
- Appointment has been cancelled
- Does NOT show in active calendars
- Stays in history/records
- Can be manually cancelled by:
  - Patient (if allowed)
  - Doctor/Admin
  - System (auto-cancel after 24hrs for unpaid "reserved")

## Status Flow Diagram

```
Patient Books Appointment
    ↓
    ├─ Pays Full Amount → scheduled ✅
    │
    ├─ Pays Partial Amount → reserved (partial) → Awaits Doctor Approval
    │   ├─ Doctor Approves → scheduled ✅
    │   └─ Doctor Declines → cancelled ❌
    │
    ├─ No Payment → reserved (unpaid) → 24hr Timer
    │   ├─ Pays within 24hrs → scheduled ✅
    │   └─ No Payment after 24hrs → cancelled ❌ (auto)
    │
    └─ Pay at Clinic → pending → Awaits Doctor Acceptance
        ├─ Doctor Approves → scheduled ✅
        └─ Doctor Declines → cancelled ❌
```

## Patient Calendar View

**Shows ONLY:**
- `scheduled` appointments
- `confirmed` appointments

**Does NOT show:**
- `reserved` (cart items)
- `pending` (pay at clinic)
- `cancelled` (cancelled)

## Doctor/Admin Calendar View

**Shows:**
- `scheduled` (confirmed bookings)
- `confirmed` (confirmed bookings)
- May see `reserved`/`pending` in separate "Requests" tab

## Implementation Notes

1. When a patient books without full payment:
   - If partial payment: Status = `reserved`
   - If no payment: Status = `reserved`
   - If pay at clinic: Status = `pending`

2. Backend should implement 24-hour auto-cancel for `reserved` status with no payment

3. Doctors use Requests tab to manage `reserved` and `pending` appointments

4. Payment updates may automatically promote status:
   - `reserved` (unpaid) + payment → `scheduled`
   - `pending` (doctor approved) → `scheduled`
