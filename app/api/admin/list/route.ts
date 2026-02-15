import { callGas } from '@/lib/gas-client';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, Reservation } from '@/lib/types';

export async function GET(request: NextRequest) {
  const dateFrom = request.nextUrl.searchParams.get('dateFrom') || '';
  const dateTo = request.nextUrl.searchParams.get('dateTo') || '';
  const adminKey = request.nextUrl.searchParams.get('adminKey') || '';
  const data = await callGas<ApiResponse<{ items: Reservation[] }>>({
    method: 'GET',
    action: 'admin_list',
    query: { dateFrom, dateTo, adminKey }
  });
  return NextResponse.json(data);
}
