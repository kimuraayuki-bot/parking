import { ApiFail } from '@/lib/types';

const ERROR_MESSAGE_JA: Record<string, string> = {
  CONFLICT: '指定した時間はすでに予約済みです。別の枠または時間を選択してください。',
  NOT_FOUND: '指定した予約が見つかりません。',
  ALREADY_CANCELED: 'この予約はすでに取り消されています。',
  UNAUTHORIZED: '管理者キーが正しくありません。',
  INTERNAL: 'システムエラーが発生しました。時間をおいて再度お試しください。'
};

export function toJapaneseError(error: ApiFail['error']) {
  if (error.code === 'VALIDATION_ERROR') {
    if (/aligned|30 minute|30分/i.test(error.message)) {
      return '時間は30分区切りで入力してください（例: 10:00 / 10:30）。';
    }
    if (/Duration is out|24時間|1440/i.test(error.message)) {
      return '予約は24時間以内で入力してください。';
    }
    return '入力内容に不備があります。内容を確認してください。';
  }
  return ERROR_MESSAGE_JA[error.code] || `エラーが発生しました（${error.code}）。`;
}
