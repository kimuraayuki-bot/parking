import { callGas } from '@/lib/gas-client';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = await callGas<ApiResponse<{ id: string }>>({
    method: 'POST',
    action: 'create',
    body
  });
  return NextResponse.json(data);
}
