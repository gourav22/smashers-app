const parsedBookingCost = Number(process.env.NEXT_PUBLIC_BOOKING_COST);

export const BOOKING_COST = Number.isFinite(parsedBookingCost) && parsedBookingCost > 0
  ? parsedBookingCost
  : 4;

export function formatCurrencyAmount(amount: number): string {
  return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
}
