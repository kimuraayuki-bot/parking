# 来客駐車場予約システム（Next.js + GAS + Spreadsheet）

来客用の駐車枠（1-16）を対象に、空き確認・予約・取消・管理（ブロック）を行うMVPです。

## 構成

- `gas/Code.gs`: GAS Webアプリ API 本体
- `gas/appsscript.json`: GAS マニフェスト
- `app/`: Next.js App Router
  - `/`: 空き状況
  - `/reserve`: 予約作成
  - `/cancel`: 予約取消
  - `/admin`: 管理画面（一覧・ブロック）

## 1. Spreadsheet 準備

Google Spreadsheet に以下4シートを作成します。

### Slots

ヘッダ行:

`slotId | name | isActive`

初期例:

`1 | 枠1 | true` から `16 | 枠16 | true`

### Reservations

ヘッダ行:

`id | slotId | startAt | endAt | status | name | contact | note | createdAt | canceledAt | createdBy | updatedAt`

### Settings

ヘッダ行:

`key | value`

初期値:

- `SLOT_COUNT | 16`
- `TIME_STEP_MIN | 30`
- `RESERVABLE_DAYS_AHEAD | 30`
- `MIN_DURATION_MIN | 30`
- `MAX_DURATION_MIN | 1440`
- `CANCEL_DEADLINE_MIN | 0`
- `ADMIN_KEY | 任意の管理キー`

### Logs

ヘッダ行:

`id | at | actor | action | payloadJson`

## 2. GAS デプロイ（clasp）

1. Spreadsheet を開き、拡張機能から Apps Script を開く  
2. `gas/Code.gs`, `gas/appsscript.json` の内容を反映  
3. デプロイ > 新しいデプロイ > 種類: ウェブアプリ
4. アクセス: `全員`、実行ユーザー: `自分`
5. 発行された `/exec` URL を控える

`ADMIN_KEY` は `Settings` シート、または Script Properties の `ADMIN_KEY` で管理できます。

## 3. Next.js 起動

### 環境変数

`.env.local` を作成:

```env
GAS_WEB_APP_URL=https://script.google.com/macros/s/xxxxxxxx/exec
```

### ローカル実行

```bash
npm install
npm run dev
```

## 4. Vercel デプロイ

1. 本リポジトリをVercelに接続
2. 環境変数 `GAS_WEB_APP_URL` を設定
3. デプロイ

## 5. API仕様（実装済み）

- `GET availability?date=YYYY-MM-DD`
- `POST create`
- `POST cancel`
- `GET admin_list?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&adminKey=...`
- `POST admin_block`

レスポンス形式:

- 成功: `{ ok: true, data: ... }`
- 失敗: `{ ok: false, error: { code, message } }`

エラーコード:

- `VALIDATION_ERROR`
- `CONFLICT`
- `NOT_FOUND`
- `ALREADY_CANCELED`
- `UNAUTHORIZED`
- `INTERNAL`

## 6. 注意事項（MVP）

- タイムゾーンは `Asia/Tokyo` 固定
- GAS側で `LockService` による排他（`create`, `admin_block`）
- 取消は予約IDベース（将来はトークン式に拡張推奨）
- 管理認可は `adminKey`（将来はOAuth推奨）
