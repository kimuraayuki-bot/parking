import { ApiFail } from '@/lib/types';

const ERROR_MESSAGE_JA: Record<string, string> = {
  VALIDATION_ERROR: '入力内容に不備があります。内容を確認してください。',
  CONFLICT: '指定した時間は既に予約済みです。別の枠または時間を選択してください。',
  NOT_FOUND: '指定した予約が見つかりません。',
  ALREADY_CANCELED: 'この予約はすでに取り消されています。',
  UNAUTHORIZED: '管理者キーが正しくありません。',
  INTERNAL: 'システムエラーが発生しました。時間をおいて再度お試しください。'
};

export function toJapaneseError(error: ApiFail['error']) {
  return ERROR_MESSAGE_JA[error.code] || `エラーが発生しました（${error.code}）。`;
}
