'use client';

import { FormEvent, useState } from 'react';
import { cancelReservation } from '@/lib/web-client';
import { toJapaneseError } from '@/lib/error-ja';

export default function CancelPage() {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await cancelReservation(id.trim());
    if (!result.ok) {
      setError(toJapaneseError(result.error));
    } else {
      setSuccess(`予約ID ${result.data.id} を取消しました。`);
    }
    setLoading(false);
  };

  return (
    <>
      <h2>予約取消</h2>
      <form className="panel" onSubmit={onSubmit}>
        <label htmlFor="id">予約ID</label>
        <input id="id" value={id} onChange={(e) => setId(e.target.value)} required />
        <button disabled={loading} type="submit">
          {loading ? '取消中...' : '取消する'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
    </>
  );
}
