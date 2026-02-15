const TZ = 'Asia/Tokyo';
const SHEET_SLOTS = 'Slots';
const SHEET_RESERVATIONS = 'Reservations';
const SHEET_SETTINGS = 'Settings';
const SHEET_LOGS = 'Logs';

function doGet(e) {
  return handleRequest_('GET', e);
}

function doPost(e) {
  return handleRequest_('POST', e);
}

function handleRequest_(method, e) {
  try {
    const action = getAction_(method, e);
    switch (action) {
      case 'availability':
        ensureMethod_(method, 'GET');
        return json_(ok_(getAvailability_(e.parameter.date)));
      case 'create':
        ensureMethod_(method, 'POST');
        return json_(ok_(createReservation_(getJsonBody_(e), 'USER')));
      case 'cancel':
        ensureMethod_(method, 'POST');
        return json_(ok_(cancelReservation_(getJsonBody_(e), 'USER')));
      case 'admin_list':
        ensureMethod_(method, 'GET');
        assertAdmin_(e, method);
        return json_(ok_(adminList_(e.parameter.dateFrom, e.parameter.dateTo)));
      case 'admin_block':
        ensureMethod_(method, 'POST');
        assertAdmin_(e, method);
        return json_(ok_(adminBlock_(getJsonBody_(e))));
      default:
        throw appError_('VALIDATION_ERROR', 'Unknown action');
    }
  } catch (err) {
    const normalized = normalizeError_(err);
    return json_(fail_(normalized.code, normalized.message));
  }
}

function getAction_(method, e) {
  if (method === 'GET') {
    return (e.parameter && e.parameter.action) || '';
  }
  const body = getJsonBody_(e);
  return body.action || (e.parameter && e.parameter.action) || '';
}

function getJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (_err) {
    throw appError_('VALIDATION_ERROR', 'Invalid JSON body');
  }
}

function ensureMethod_(actual, expected) {
  if (actual !== expected) {
    throw appError_('VALIDATION_ERROR', `Method must be ${expected}`);
  }
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  return { ok: true, data: data };
}

function fail_(code, message) {
  return { ok: false, error: { code: code, message: message } };
}

function normalizeError_(err) {
  if (err && err.code && err.message) {
    return err;
  }
  return { code: 'INTERNAL', message: 'Unexpected error' };
}

function appError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertAdmin_(e, method) {
  const settings = getSettings_();
  const expected = settings.ADMIN_KEY || PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  const body = method === 'POST' ? getJsonBody_(e) : {};
  const provided = (e && e.parameter && e.parameter.adminKey) || body.adminKey || '';
  if (!expected || provided !== expected) {
    throw appError_('UNAUTHORIZED', 'Invalid admin key');
  }
}

function getAvailability_(dateStr) {
  const date = parseDateOnly_(dateStr);
  const dayStart = startOfDay_(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const slots = getActiveSlots_();
  const reservations = getReservations_()
    .filter(function (r) {
      return (r.status === 'CONFIRMED' || r.status === 'BLOCKED') && overlaps_(r.startAtDate, r.endAtDate, dayStart, dayEnd);
    })
    .map(function (r) {
      return {
        id: r.id,
        slotId: r.slotId,
        startAt: toIsoJst_(r.startAtDate),
        endAt: toIsoJst_(r.endAtDate),
        status: r.status,
        name: r.name,
        note: r.note
      };
    });

  return {
    date: dateStr,
    slots: slots,
    reservations: reservations
  };
}

function createReservation_(input, actorType) {
  const settings = getSettings_();
  const payload = validateCreateLikeInput_(input, settings);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const reservations = getReservations_();
    assertNoConflict_(reservations, payload.slotId, payload.startAt, payload.endAt);
    const now = new Date();
    const id = Utilities.getUuid();
    appendReservationRow_({
      id: id,
      slotId: payload.slotId,
      startAt: payload.startAt,
      endAt: payload.endAt,
      status: 'CONFIRMED',
      name: payload.name,
      contact: payload.contact,
      note: payload.note || '',
      createdAt: now,
      canceledAt: '',
      createdBy: actorType,
      updatedAt: now
    });
    appendLog_(actorType, 'create', { id: id, slotId: payload.slotId, startAt: toIsoJst_(payload.startAt), endAt: toIsoJst_(payload.endAt) });
    return { id: id };
  } finally {
    lock.releaseLock();
  }
}

function cancelReservation_(input, actorType) {
  const id = (input.id || '').toString().trim();
  if (!id) {
    throw appError_('VALIDATION_ERROR', 'id is required');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESERVATIONS);
  if (!sheet) {
    throw appError_('INTERNAL', 'Reservations sheet not found');
  }
  const rows = readSheetObjects_(sheet);
  let target = null;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      target = { rowIndex: i + 2, row: rows[i] };
      break;
    }
  }
  if (!target) {
    throw appError_('NOT_FOUND', 'Reservation not found');
  }
  if (target.row.status === 'CANCELED') {
    throw appError_('ALREADY_CANCELED', 'Reservation already canceled');
  }

  const settings = getSettings_();
  const deadlineMin = toInt_(settings.CANCEL_DEADLINE_MIN, 0);
  if (deadlineMin > 0) {
    const now = new Date();
    const startAt = parseIso_(target.row.startAt);
    const diffMin = (startAt.getTime() - now.getTime()) / 60000;
    if (diffMin < deadlineMin) {
      throw appError_('VALIDATION_ERROR', `Cannot cancel within ${deadlineMin} minutes`);
    }
  }

  const now = new Date();
  sheet.getRange(target.rowIndex, 5).setValue('CANCELED');
  sheet.getRange(target.rowIndex, 10).setValue(toIsoJst_(now));
  sheet.getRange(target.rowIndex, 12).setValue(toIsoJst_(now));
  appendLog_(actorType, 'cancel', { id: id });
  return { id: id, status: 'CANCELED' };
}

function adminList_(dateFromStr, dateToStr) {
  const dateFrom = parseDateOnly_(dateFromStr);
  const dateTo = parseDateOnly_(dateToStr);
  if (dateTo.getTime() < dateFrom.getTime()) {
    throw appError_('VALIDATION_ERROR', 'dateTo must be >= dateFrom');
  }
  const start = startOfDay_(dateFrom);
  const end = new Date(startOfDay_(dateTo).getTime() + 24 * 60 * 60 * 1000);
  const data = getReservations_()
    .filter(function (r) {
      return overlaps_(r.startAtDate, r.endAtDate, start, end);
    })
    .map(function (r) {
      return serializeReservation_(r);
    });
  appendLog_('ADMIN', 'admin_list', { dateFrom: dateFromStr, dateTo: dateToStr, count: data.length });
  return { items: data };
}

function adminBlock_(input) {
  const settings = getSettings_();
  const payload = validateCreateLikeInput_(
    {
      slotId: input.slotId,
      startAt: input.startAt,
      endAt: input.endAt,
      name: 'BLOCK',
      contact: 'ADMIN',
      note: input.reason || ''
    },
    settings
  );

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const reservations = getReservations_();
    assertNoConflict_(reservations, payload.slotId, payload.startAt, payload.endAt);
    const now = new Date();
    const id = Utilities.getUuid();
    appendReservationRow_({
      id: id,
      slotId: payload.slotId,
      startAt: payload.startAt,
      endAt: payload.endAt,
      status: 'BLOCKED',
      name: 'BLOCK',
      contact: 'ADMIN',
      note: payload.note || '',
      createdAt: now,
      canceledAt: '',
      createdBy: 'ADMIN',
      updatedAt: now
    });
    appendLog_('ADMIN', 'block', { id: id, slotId: payload.slotId, startAt: toIsoJst_(payload.startAt), endAt: toIsoJst_(payload.endAt) });
    return { id: id, status: 'BLOCKED' };
  } finally {
    lock.releaseLock();
  }
}

function validateCreateLikeInput_(input, settings) {
  const slotId = toInt_(input.slotId);
  if (!slotId || slotId < 1 || slotId > toInt_(settings.SLOT_COUNT, 16)) {
    throw appError_('VALIDATION_ERROR', 'slotId is invalid');
  }
  const startAt = parseIso_(input.startAt);
  const endAt = parseIso_(input.endAt);
  if (endAt.getTime() <= startAt.getTime()) {
    throw appError_('VALIDATION_ERROR', 'endAt must be after startAt');
  }

  const now = new Date();
  const reservableDaysAhead = toInt_(settings.RESERVABLE_DAYS_AHEAD, 30);
  const latest = new Date(startOfDay_(now).getTime() + reservableDaysAhead * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
  if (startAt.getTime() < now.getTime() || startAt.getTime() > latest.getTime()) {
    throw appError_('VALIDATION_ERROR', 'startAt is out of reservable range');
  }

  const durationMin = (endAt.getTime() - startAt.getTime()) / 60000;
  const minDuration = toInt_(settings.MIN_DURATION_MIN, 30);
  const maxDuration = toInt_(settings.MAX_DURATION_MIN, 1440);
  if (durationMin < minDuration || durationMin > maxDuration) {
    throw appError_('VALIDATION_ERROR', 'Duration is out of allowed range');
  }

  const stepMin = toInt_(settings.TIME_STEP_MIN, 30);
  if (!isStepAligned_(startAt, stepMin) || !isStepAligned_(endAt, stepMin)) {
    throw appError_('VALIDATION_ERROR', `Time must be aligned to ${stepMin} minute steps`);
  }

  const name = (input.name || '').toString().trim();
  const contact = (input.contact || '').toString().trim();
  if (!name || !contact) {
    throw appError_('VALIDATION_ERROR', 'name and contact are required');
  }

  const isActive = isSlotActive_(slotId);
  if (!isActive) {
    throw appError_('VALIDATION_ERROR', 'slot is inactive');
  }

  return {
    slotId: slotId,
    startAt: startAt,
    endAt: endAt,
    name: name,
    contact: contact,
    note: (input.note || '').toString().trim()
  };
}

function assertNoConflict_(reservations, slotId, startAt, endAt) {
  for (let i = 0; i < reservations.length; i++) {
    const r = reservations[i];
    if (r.slotId !== slotId) {
      continue;
    }
    if (r.status !== 'CONFIRMED' && r.status !== 'BLOCKED') {
      continue;
    }
    if (overlaps_(startAt, endAt, r.startAtDate, r.endAtDate)) {
      throw appError_('CONFLICT', 'Reservation conflicts with existing booking');
    }
  }
}

function overlaps_(aStart, aEnd, bStart, bEnd) {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

function appendReservationRow_(record) {
  const sheet = getRequiredSheet_(SHEET_RESERVATIONS);
  sheet.appendRow([
    record.id,
    record.slotId,
    toIsoJst_(record.startAt),
    toIsoJst_(record.endAt),
    record.status,
    record.name,
    record.contact,
    record.note || '',
    toIsoJst_(record.createdAt),
    record.canceledAt || '',
    record.createdBy,
    toIsoJst_(record.updatedAt)
  ]);
}

function appendLog_(actor, action, payload) {
  const sheet = getRequiredSheet_(SHEET_LOGS);
  sheet.appendRow([Utilities.getUuid(), toIsoJst_(new Date()), actor, action, JSON.stringify(payload)]);
}

function getReservations_() {
  const sheet = getRequiredSheet_(SHEET_RESERVATIONS);
  const rows = readSheetObjects_(sheet);
  return rows
    .filter(function (r) {
      return r.id && r.slotId && r.startAt && r.endAt && r.status;
    })
    .map(function (r) {
      return {
        id: r.id,
        slotId: toInt_(r.slotId),
        startAt: r.startAt,
        endAt: r.endAt,
        startAtDate: parseIso_(r.startAt),
        endAtDate: parseIso_(r.endAt),
        status: r.status,
        name: r.name || '',
        contact: r.contact || '',
        note: r.note || '',
        createdAt: r.createdAt || '',
        canceledAt: r.canceledAt || '',
        createdBy: r.createdBy || '',
        updatedAt: r.updatedAt || ''
      };
    });
}

function getActiveSlots_() {
  const sheet = getRequiredSheet_(SHEET_SLOTS);
  const rows = readSheetObjects_(sheet);
  return rows
    .filter(function (r) {
      return toBoolean_(r.isActive);
    })
    .map(function (r) {
      return {
        slotId: toInt_(r.slotId),
        name: (r.name || '').toString()
      };
    })
    .sort(function (a, b) {
      return a.slotId - b.slotId;
    });
}

function isSlotActive_(slotId) {
  const sheet = getRequiredSheet_(SHEET_SLOTS);
  const rows = readSheetObjects_(sheet);
  for (let i = 0; i < rows.length; i++) {
    if (toInt_(rows[i].slotId) === slotId) {
      return toBoolean_(rows[i].isActive);
    }
  }
  return false;
}

function getSettings_() {
  const sheet = getRequiredSheet_(SHEET_SETTINGS);
  const rows = readSheetObjects_(sheet);
  const map = {};
  for (let i = 0; i < rows.length; i++) {
    const key = (rows[i].key || '').toString().trim();
    if (!key) {
      continue;
    }
    map[key] = (rows[i].value || '').toString().trim();
  }
  return map;
}

function getRequiredSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw appError_('INTERNAL', `Sheet not found: ${name}`);
  }
  return sheet;
}

function readSheetObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }
  const headers = values[0].map(function (h) {
    return (h || '').toString().trim();
  });
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = values[r][c];
    }
    out.push(row);
  }
  return out;
}

function serializeReservation_(r) {
  return {
    id: r.id,
    slotId: r.slotId,
    startAt: r.startAt,
    endAt: r.endAt,
    status: r.status,
    name: r.name,
    contact: r.contact,
    note: r.note,
    createdAt: r.createdAt,
    canceledAt: r.canceledAt,
    createdBy: r.createdBy,
    updatedAt: r.updatedAt
  };
}

function parseDateOnly_(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw appError_('VALIDATION_ERROR', 'date must be YYYY-MM-DD');
  }
  const d = new Date(`${s}T00:00:00+09:00`);
  if (isNaN(d.getTime())) {
    throw appError_('VALIDATION_ERROR', 'Invalid date');
  }
  return d;
}

function parseIso_(s) {
  if (!s || typeof s !== 'string') {
    throw appError_('VALIDATION_ERROR', 'Datetime is required');
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    throw appError_('VALIDATION_ERROR', 'Invalid datetime format');
  }
  return d;
}

function toIsoJst_(date) {
  return Utilities.formatDate(date, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function startOfDay_(date) {
  const s = Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
  return new Date(`${s}T00:00:00+09:00`);
}

function isStepAligned_(date, stepMin) {
  return date.getMinutes() % stepMin === 0 && date.getSeconds() === 0;
}

function toInt_(v, fallback) {
  const n = parseInt(v, 10);
  if (isNaN(n)) {
    return fallback;
  }
  return n;
}

function toBoolean_(v) {
  if (v === true || v === 'true' || v === 'TRUE' || v === 1 || v === '1') {
    return true;
  }
  return false;
}
