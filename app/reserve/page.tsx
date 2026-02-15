'use client';

import { FormEvent, useState } from 'react';
import { createReservation } from '@/lib/web-client';
import { toIsoWithJstOffset } from '@/lib/date';
import { toJapaneseError } from '@/lib/error-ja';

const SLOT_COUNT = 16;

function is30MinAligned(value: string) {
  if (!value) return false;
  const minute = Number(value.slice(14, 16));
  return minute % 30 === 0;
}

function diffMinutes(start: string, end: string) {
  const s = new Date(`${start}:00+09:00`).getTime();
  const e = new Date(`${end}:00+09:00`).getTime();
  return (e - s) / 60000;
}

export default function ReservePage() {
  const [slotId, setSlotId] = useState(1);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservedId, setReservedId] = useState('');
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReservedId('');
    setCopied(false);

    if (!is30MinAligned(startAt) || !is30MinAligned(endAt)) {
      setError('時間は30分区切りで入力してください（例: 10:00 / 10:30）。');
      setLoading(false);
      return;
    }

    const minutes = diffMinutes(startAt, endAt);
    if (minutes <= 0) {
      setError('終了日時は開始日時より後にしてください。');
      setLoading(false);
      return;
    }
    if (minutes > 24 * 60) {
      setError('予約は24時間以内で入力してください。');
      setLoading(false);
      return;
    }

    const result = await createReservation({
      slotId,
      startAt: toIsoWithJstOffset(startAt),
      endAt: toIsoWithJstOffset(endAt),
      name,
      contact,
      roomNumber,
      note
    });
    if (!result.ok) {
      setError(toJapaneseError(result.error));
    } else {
      setReservedId(result.data.id);
    }
    setLoading(false);
  };

  const copyId = async () => {
    if (!reservedId) return;
    try {
      await navigator.clipboard.writeText(reservedId);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <h2>予約作成</h2>

      <section className="panel">
        <p>入力時の注意点</p>
        <p>予約は24時間以内で入力してください。</p>
        <p>時間は30分区切りで入力してください。</p>
      </section>

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
            <label htmlFor="startAt">開始日時</label>
            <input id="startAt" type="datetime-local" step={1800} value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="endAt">終了日時</label>
            <input id="endAt" type="datetime-local" step={1800} value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </div>
        </div>

        <label htmlFor="name">予約者名</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />

        <label htmlFor="contact">連絡先</label>
        <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} required />

        <label htmlFor="roomNumber">部屋番号</label>
        <input id="roomNumber" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} required />

        <label htmlFor="note">メモ</label>
        <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />

        <button disabled={loading} type="submit">
          {loading ? '作成中...' : '予約する'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {reservedId && (
        <section className="panel">
          <p className="success">予約が完了しました。</p>
          <p>
            予約ID: <strong>{reservedId}</strong>
          </p>
          <p>取消時に必要です。必ず保存してください。</p>
          <button type="button" onClick={copyId}>
            予約IDをコピー
          </button>
          {copied && <p className="success">コピーしました。</p>}
        </section>
      )}
    </>
  );
}
