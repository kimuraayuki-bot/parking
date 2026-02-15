'use client';

import { FormEvent, useState } from 'react';
import { createReservation } from '@/lib/web-client';
import { toIsoWithJstOffset } from '@/lib/date';
import { toJapaneseError } from '@/lib/error-ja';

const SLOT_COUNT = 16;

export default function ReservePage() {
  const [slotId, setSlotId] = useState(1);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservedId, setReservedId] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReservedId('');
    const result = await createReservation({
      slotId,
      startAt: toIsoWithJstOffset(startAt),
      endAt: toIsoWithJstOffset(endAt),
      name,
      contact,
      note
    });
    if (!result.ok) {
      setError(toJapaneseError(result.error));
    } else {
      setReservedId(result.data.id);
    }
    setLoading(false);
  };

  return (
    <>
      <h2>予約作成</h2>
      <form className="panel" onSubmit={onSubmit}>
        <label htmlFor="slot">枠</label>
        <select id="slot" value={slotId} onChange={(e) => setSlotId(Number(e.target.value))}>
          {Array.from({ length: SLOT_COUNT }).map((_, idx) => {
            const num = idx + 1;
            return (
              <option key={num} value={num}>
                枠{num}
              </option>
            );
          })}
        </select>

        <div className="row">
          <div>
            <label htmlFor="startAt">開始</label>
            <input id="startAt" type="datetime-local" step={1800} value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="endAt">終了</label>
            <input id="endAt" type="datetime-local" step={1800} value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </div>
        </div>

        <label htmlFor="name">予約者名</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />

        <label htmlFor="contact">連絡先</label>
        <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} required />

        <label htmlFor="note">メモ</label>
        <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />

        <button disabled={loading} type="submit">
          {loading ? '作成中...' : '予約する'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {reservedId && <p className="success">予約ID: {reservedId}</p>}
    </>
  );
}
