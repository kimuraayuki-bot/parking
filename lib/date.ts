export function todayJstDateString() {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const yyyy = jst.getFullYear();
  const mm = `${jst.getMonth() + 1}`.padStart(2, '0');
  const dd = `${jst.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  const hh = `${d.getHours()}`.padStart(2, '0');
  const min = `${d.getMinutes()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function toIsoWithJstOffset(localInput: string) {
  if (!localInput) return '';
  return `${localInput}:00+09:00`;
}

export function formatTimeRange(startAt: string, endAt: string) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const fmt = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${fmt.format(s)} - ${fmt.format(e)}`;
}
