'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAvailability } from '@/lib/web-client';
import { formatTimeRange, todayJstDateString } from '@/lib/date';
import type { Reservation } from '@/lib/types';
import { toJapaneseError } from '@/lib/error-ja';

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

  const grouped = useMemo(() => {
    const map = new Map<number, Reservation[]>();
    for (const reservation of reservations) {
      if (!map.has(reservation.slotId)) {
        map.set(reservation.slotId, []);
      }
      map.get(reservation.slotId)?.push(reservation);
    }
    return map;
  }, [reservations]);

  return (
    <>
      <h2>空き状況</h2>
      <section className="panel">
        <label htmlFor="date">日付（JST）</label>
        <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </section>

      {loading && <p>読み込み中...</p>}
      {error && <p className="error">{error}</p>}

      <section className="grid">
        {slots.map((slot) => {
          const items = grouped.get(slot.slotId) || [];
          return (
            <article className="slot-card" key={slot.slotId}>
              <h3>{slot.name}</h3>
              {items.length === 0 ? (
                <p className="empty">空き</p>
              ) : (
                <ul>
                  {items
                    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                    .map((item) => (
                      <li key={item.id}>
                        {formatTimeRange(item.startAt, item.endAt)} / {item.status}
                      </li>
                    ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}
