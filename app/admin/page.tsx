'use client';

import { FormEvent, useMemo, useState } from 'react';
import { adminBlock, adminList } from '@/lib/web-client';
import { todayJstDateString, toIsoWithJstOffset } from '@/lib/date';
import { Reservation } from '@/lib/types';
import { toJapaneseError } from '@/lib/error-ja';

function statusJa(status: Reservation['status']) {
  if (status === 'CONFIRMED') return '予約確定';
  if (status === 'CANCELED') return '取消済み';
  return '利用不可（ブロック）';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

export default function AdminPage() {
  const today = todayJstDateString();
  const [adminKey, setAdminKey] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [items, setItems] = useState<Reservation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockSlotId, setBlockSlotId] = useState(1);
  const [blockStartAt, setBlockStartAt] = useState('');
  const [blockEndAt, setBlockEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [blockMessage, setBlockMessage] = useState('');

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [items]
  );

  const onLoad = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setItems([]);
    const result = await adminList({ dateFrom, dateTo, adminKey });
    if (!result.ok) {
      setError(toJapaneseError(result.error));
    } else {
      setItems(result.data.items);
    }
    setLoading(false);
  };

  const onBlock = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBlockMessage('');
    const result = await adminBlock({
      slotId: blockSlotId,
      startAt: toIsoWithJstOffset(blockStartAt),
      endAt: toIsoWithJstOffset(blockEndAt),
      reason,
      adminKey
    });
    if (!result.ok) {
      setError(toJapaneseError(result.error));
    } else {
      setBlockMessage(`ブロックを作成しました。予約ID: ${result.data.id}`);
    }
    setLoading(false);
  };

  return (
    <>
      <h2>管理画面</h2>
      <section className="panel">
        <label htmlFor="adminKey">管理者キー</label>
        <input id="adminKey" type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
      </section>

      <form className="panel" onSubmit={onLoad}>
        <h3>予約一覧</h3>
        <div className="row">
          <div>
            <label htmlFor="dateFrom">開始日</label>
            <input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="dateTo">終了日</label>
            <input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} required />
          </div>
        </div>
        <button disabled={loading} type="submit">
          {loading ? '取得中...' : '一覧を表示'}
        </button>
      </form>

      <form className="panel" onSubmit={onBlock}>
        <h3>ブロック作成</h3>
        <label htmlFor="blockSlot">対象枠</label>
        <select id="blockSlot" value={blockSlotId} onChange={(e) => setBlockSlotId(Number(e.target.value))}>
          {Array.from({ length: 16 }).map((_, idx) => {
            const n = idx + 1;
            return (
              <option key={n} value={n}>
                枠{n}
              </option>
            );
          })}
        </select>
        <div className="row">
          <div>
            <label htmlFor="blockStart">開始日時</label>
            <input id="blockStart" type="datetime-local" step={1800} value={blockStartAt} onChange={(e) => setBlockStartAt(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="blockEnd">終了日時</label>
            <input id="blockEnd" type="datetime-local" step={1800} value={blockEndAt} onChange={(e) => setBlockEndAt(e.target.value)} required />
          </div>
        </div>
        <label htmlFor="reason">理由</label>
        <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button disabled={loading} type="submit">
          {loading ? '作成中...' : 'ブロック作成'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {blockMessage && <p className="success">{blockMessage}</p>}

      <section className="panel">
        <h3>予約一覧結果（{sortedItems.length}件）</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>予約ID</th>
                <th>枠</th>
                <th>開始日時</th>
                <th>終了日時</th>
                <th>状態</th>
                <th>予約者名</th>
                <th>連絡先</th>
                <th>部屋番号</th>
                <th>メモ</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>枠{item.slotId}</td>
                  <td>{formatDateTime(item.startAt)}</td>
                  <td>{formatDateTime(item.endAt)}</td>
                  <td>{statusJa(item.status)}</td>
                  <td>{item.name || '-'}</td>
                  <td>{item.contact || '-'}</td>
                  <td>{item.roomNumber || '-'}</td>
                  <td>{item.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
