/**
 * Shared time-slot utilities — used by book-appointment page AND PatientModals booking modal.
 */

/** Format a Date as "09:00 AM" */
export function formatSlot(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Round a Date UP to the nearest 30-minute boundary */
export function roundUpToSlot(date: Date): Date {
  const d = new Date(date);
  const rem = d.getMinutes() % 30;
  if (rem !== 0) d.setMinutes(d.getMinutes() + (30 - rem));
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

/**
 * Generate all 30-min slots from 9:00 AM to 9:00 PM.
 * If selectedDate === today (YYYY-MM-DD), only future slots are returned.
 * Optionally exclude already-booked slot strings.
 */
export function getAvailableTimeSlots(
  selectedDate: string,
  bookedSlots: string[] = []
): string[] {
  const slots: string[] = [];
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  const end = new Date();
  end.setHours(21, 0, 0, 0);

  const todayYMD = new Date().toISOString().split("T")[0];
  const isToday  = selectedDate === todayYMD;
  const cutoff   = isToday ? roundUpToSlot(new Date()) : null;

  const cur = new Date(base);
  while (cur <= end) {
    const label = formatSlot(cur);
    const notPast   = !cutoff || cur >= cutoff;
    const notBooked = !bookedSlots.includes(label);
    if (notPast && notBooked) slots.push(label);
    cur.setMinutes(cur.getMinutes() + 30);
  }
  return slots;
}
