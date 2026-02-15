import { callGas } from '@/lib/gas-client';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Reservation, Slot } from '@/lib/types';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') || '';
  const data = await callGas<ApiResponse<{ date: string; slots: Slot[]; reservations: Reservation[] }>>({
    method: 'GET',
    action: 'availability',
    query: { date }
  });
  return NextResponse.json(data);
}
