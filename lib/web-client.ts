import { ApiResponse, Reservation, Slot } from '@/lib/types';

export async function fetchAvailability(date: string) {
  const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`, { method: 'GET' });
  return (await res.json()) as ApiResponse<{ date: string; slots: Slot[]; reservations: Reservation[] }>;
}

export async function createReservation(input: {
  slotId: number;
  startAt: string;
  endAt: string;
  name: string;
  contact: string;
  note: string;
}) {
  const res = await fetch('/api/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return (await res.json()) as ApiResponse<{ id: string }>;
}

export async function cancelReservation(id: string) {
  const res = await fetch('/api/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  return (await res.json()) as ApiResponse<{ id: string; status: 'CANCELED' }>;
}

export async function adminList(input: { dateFrom: string; dateTo: string; adminKey: string }) {
  const params = new URLSearchParams({
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    adminKey: input.adminKey
  });
  const res = await fetch(`/api/admin/list?${params.toString()}`, { method: 'GET' });
  return (await res.json()) as ApiResponse<{ items: Reservation[] }>;
}

export async function adminBlock(input: {
  slotId: number;
  startAt: string;
  endAt: string;
  reason: string;
  adminKey: string;
}) {
  const res = await fetch('/api/admin/block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return (await res.json()) as ApiResponse<{ id: string; status: 'BLOCKED' }>;
}
