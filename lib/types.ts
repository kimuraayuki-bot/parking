export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'ALREADY_CANCELED'
  | 'UNAUTHORIZED'
  | 'INTERNAL';

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: { code: ApiErrorCode; message: string } };
export type ApiResponse<T> = ApiOk<T> | ApiFail;

export type Slot = {
  slotId: number;
  name: string;
};

export type Reservation = {
  id: string;
  slotId: number;
  startAt: string;
  endAt: string;
  status: 'CONFIRMED' | 'CANCELED' | 'BLOCKED';
  name: string;
  contact?: string;
  roomNumber?: string;
  note?: string;
  createdAt?: string;
  canceledAt?: string;
  createdBy?: 'USER' | 'ADMIN';
  updatedAt?: string;
};
