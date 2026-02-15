'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAvailability } from '@/lib/web-client';
import type { Reservation } from '@/lib/types';
import { toJapaneseError } from '@/lib/error-ja';
import { todayJstDateString } from '@/lib/date';

const STEP_MIN = 30;
const CELL_COUNT = (24 * 60) / STEP_MIN;

function pad2(n: number) {
  return `${n}`.padStart(2, '0');
}

function cellLabel(index: number) {
  const total = index * STEP_MIN;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function cellRange(date: string, index: number) {
  const startTotal = index * STEP_MIN;
  const endTotal = startTotal + STEP_MIN;
  const sh = Math.floor(startTotal / 60);
  const sm = startTotal % 60;
  const eh = Math.floor(endTotal / 60);
  const em = endTotal % 60;
  const start = new Date(`${date}T${pad2(sh)}:${pad2(sm)}:00+09:00`);
  const end = new Date(`${date}T${pad2(eh % 24)}:${pad2(em)}:00+09:00`);
  if (endTotal >= 24 * 60) {
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

function formatStatus(status: Reservation['status']) {
  if (status === 'BLOCKED') return 'ブロック';
  if (status === 'CONFIRMED') return '予約';
  return '取消';
}

export default function HomePage() {
  const [date, setDate] = useState(todayJstDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<{ slotId: number; name: string }[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      const result = await fetchAvailability(date);
      if (!result.ok) {
        setError(toJapaneseError(result.error));
        setSlots([]);
        setReservations([]);
      } else {
        setSlots(result.data.slots);
        setReservations(result.data.reservations);
      }
      setLoading(false);
    };
    run();
  }, [date]);

  const parsedReservations = useMemo(
    () =>
      reservations.map((r) => ({
        ...r,
        start: new Date(r.startAt),
        end: new Date(r.endAt)
      })),
    [reservations]
  );

  const timeHeaders = useMemo(
    () => Array.from({ length: CELL_COUNT }, (_, i) => ({ index: i, label: cellLabel(i) })),
    []
  );

  return (
    <>
      <h2>空き状況（30分単位）</h2>
      <section className="panel">
        <label htmlFor="date">日付（JST）</label>
        <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </section>

      {loading && <p>読み込み中...</p>}
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <p>白: 空き / 青: 予約 / 灰: ブロック</p>
        <div className="timetable-wrap">
          <table className="timetable">
            <thead>
              <tr>
                <th>枠</th>
                {timeHeaders.map((h) => (
                  <th key={h.index}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.slotId}>
                  <td className="slot-head">{slot.name}</td>
                  {timeHeaders.map((h) => {
                    const { start, end } = cellRange(date, h.index);
                    const hit = parsedReservations.find((r) => r.slotId === slot.slotId && overlaps(r.start, r.end, start, end));
                    const cls = hit ? (hit.status === 'BLOCKED' ? 'cell blocked' : 'cell reserved') : 'cell free';
                    const title = hit
                      ? `${formatStatus(hit.status)} / ${hit.name || '-'} / 部屋:${hit.roomNumber || '-'}`
                      : '空き';
                    return <td key={`${slot.slotId}-${h.index}`} className={cls} title={title} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
