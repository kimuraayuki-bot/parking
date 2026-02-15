'use client';

import { FormEvent, useState } from 'react';
import { adminBlock, adminList } from '@/lib/web-client';
import { todayJstDateString, toIsoWithJstOffset } from '@/lib/date';
import { Reservation } from '@/lib/types';

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

  const onLoad = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setItems([]);
    const result = await adminList({ dateFrom, dateTo, adminKey });
    if (!result.ok) {
      setError(`${result.error.code}: ${result.error.message}`);
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
      setError(`${result.error.code}: ${result.error.message}`);
    } else {
      setBlockMessage(`BLOCKEDを作成しました。ID: ${result.data.id}`);
    }
    setLoading(false);
  };

  return (
    <>
      <h2>管理画面</h2>
      <section className="panel">
        <label htmlFor="adminKey">管理キー</label>
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
          {loading ? '取得中...' : '一覧取得'}
        </button>
      </form>

      <form className="panel" onSubmit={onBlock}>
        <h3>ブロック作成</h3>
        <label htmlFor="blockSlot">枠</label>
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
            <label htmlFor="blockStart">開始</label>
            <input id="blockStart" type="datetime-local" step={1800} value={blockStartAt} onChange={(e) => setBlockStartAt(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="blockEnd">終了</label>
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
        <h3>予約一覧結果</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>枠</th>
              <th>開始</th>
              <th>終了</th>
              <th>Status</th>
              <th>名前</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.slotId}</td>
                <td>{item.startAt}</td>
                <td>{item.endAt}</td>
                <td>{item.status}</td>
                <td>{item.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
