/**
 * store.js - Static db.json + LocalStorage data management module
 * Quán Ăn Đồng Quê
 */

import { getStaticArray, loadStaticDb } from './db.js';
import { readJson, removeStorageKey, writeJson, writeJsonIfChanged } from '../core/storage.js';

// Single-key storage (preparing for Admin/Shipper apps)
const DB_KEY = 'dq_db';
const DB_SCHEMA_VERSION = 5;

// Legacy keys (for one-time migration)
const LEGACY_KEYS = {
  USERS: 'dq_users',
  CURRENT: 'dq_current_user',
  ORDERS: 'dq_orders',
  CART: 'dq_cart',
  VOUCHERS: 'dq_vouchers',
  MENU: 'dq_menu',
  RESERVATIONS: 'dq_reservations',
};

let dbCache = null;

const nowIso = () => new Date().toISOString();

const mergeByKey = (base = [], overrides = [], key = 'id') => {
  const overrideArr = Array.isArray(overrides) ? overrides : [];
  const overrideMap = new Map(overrideArr.filter((i) => i?.[key]).map((i) => [i[key], i]));
  const merged = (Array.isArray(base) ? base : []).map((item) => ({
    ...item,
    ...(overrideMap.get(item[key]) || {}),
  }));
  const extras = overrideArr.filter((item) => item?.[key] && !(base || []).some((baseItem) => baseItem[key] === item[key]));
  return [...merged, ...extras];
};

const mergeById = (base = [], overrides = []) => mergeByKey(base, overrides, 'id');

const getStaticUsers = () => getStaticArray('users');
const getStaticDbSnapshot = () => {
  const source = loadStaticDb();
  return source && typeof source === 'object' ? source : {};
};

const PAYMENT_METHODS = new Set(['cash', 'bank', 'momo', 'vnpay']);

const normalizePaymentMethod = (value) => {
  const method = (value || 'cash').toString().trim().toLowerCase();
  if (method === 'transfer') return 'bank';
  return PAYMENT_METHODS.has(method) ? method : 'cash';
};

const normalizeDateTimeLocal = (value, fallbackTime = '00:00') => {
  const raw = (value || '').toString().trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T${fallbackTime}`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const normalizeVoucher = (voucher = {}) => ({
  ...voucher,
  code: (voucher.code || '').toString().trim().toUpperCase(),
  type: voucher.type === 'percent' ? 'percent' : 'fixed',
  value: Number.isFinite(Number(voucher.value)) ? Number(voucher.value) : 0,
  minOrder: Number.isFinite(Number(voucher.minOrder)) ? Number(voucher.minOrder) : 0,
  startsAt: normalizeDateTimeLocal(voucher.startsAt, '00:00'),
  expiresAt: normalizeDateTimeLocal(voucher.expiresAt, '23:59'),
  desc: (voucher.desc || '').toString(),
  active: Boolean(voucher.active),
});

const normalizeOrderRecord = (order = {}) => ({
  ...order,
  paymentMethod: normalizePaymentMethod(order.paymentMethod),
});

const normalizePhone = (phone = '') => phone.toString().trim().replace(/\s+/g, '');
const isSixDigitId = (id) => /^\d{6}$/.test((id || '').toString());
const formatUserId = (n) => String(n).padStart(6, '0').slice(-6);
const isLegacyCustomerSeed = (user = {}) =>
  user.id === 'u_seed_customer'
  || user.email === 'customer@example.com'
  || (user.name === 'customer' && user.password === '123' && !normalizePhone(user.phone));

const sanitizeUser = (user = {}, id = user?.id) => {
  const points = Number(user.points || 0);
  const vouchers = Array.isArray(user.vouchers)
    ? user.vouchers
        .map((code) => (code || '').toString().trim().toUpperCase())
        .filter(Boolean)
    : [];
  return {
    id,
    name: (user.name || '').toString(),
    password: (user.password || '').toString(),
    phone: normalizePhone(user.phone),
    points: Number.isFinite(points) ? points : 0,
    vouchers,
    createdAt: user.createdAt || nowIso(),
  };
};

const sanitizeUsersWithIds = (users = [], startAt = 0) => {
  const source = (Array.isArray(users) ? users : []).filter((user) => !isLegacyCustomerSeed(user));
  const used = new Set();
  const idMap = new Map();
  let next = startAt;

  const nextId = () => {
    while (used.has(formatUserId(next))) next += 1;
    const id = formatUserId(next);
    used.add(id);
    next += 1;
    return id;
  };

  const normalized = source.map((user) => {
    const rawId = (user?.id || '').toString();
    const id = isSixDigitId(rawId) && !used.has(rawId) ? rawId : nextId();
    used.add(id);
    idMap.set(rawId, id);
    return sanitizeUser(user, id);
  });

  return { users: normalized, idMap };
};

const sanitizeUsers = (users = []) => sanitizeUsersWithIds(users).users;

const getNextUserId = (users = []) => {
  const ids = (Array.isArray(users) ? users : [])
    .map((u) => (isSixDigitId(u?.id) ? Number(u.id) : -1))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const max = ids.length ? Math.max(...ids) : -1;
  return formatUserId(max + 1);
};

const normalizeDbUsers = (db) => {
  const { users, idMap } = sanitizeUsersWithIds(db.users);
  const rawCurrentUserId = (db.currentUserId || '').toString();
  const mappedCurrentUserId = idMap.get(rawCurrentUserId) || rawCurrentUserId;
  const currentUserId = users.some((u) => u.id === mappedCurrentUserId) ? mappedCurrentUserId : null;
  const carts = {};

  Object.entries(db.carts || {}).forEach(([owner, cart]) => {
    if (owner === 'u_seed_customer') return;
    const nextOwner = idMap.get(owner) || owner;
    carts[nextOwner] = [...(carts[nextOwner] || []), ...(Array.isArray(cart) ? cart : [])];
  });

  return { ...db, users, currentUserId, carts };
};

const syncStaticAccounts = (db) => {
  const normalizedDb = normalizeDbUsers(db);
  const users = normalizedDb.users;
  const staticUsers = sanitizeUsers(getStaticUsers());

  staticUsers.forEach((staticUser) => {
    if (!staticUser?.id) return;
    const sameIdIdx = users.findIndex((u) => u.id === staticUser.id);
    if (sameIdIdx >= 0) {
      users[sameIdIdx] = sanitizeUser({
        ...staticUser,
        ...users[sameIdIdx],
        phone: users[sameIdIdx].phone || staticUser.phone,
        password: users[sameIdIdx].phone ? users[sameIdIdx].password : staticUser.password,
      });
      return;
    }
    const exists = users.some((u) => u.phone && u.phone === staticUser.phone);
    if (!exists) users.push({ ...staticUser });
  });

  return { ...normalizedDb, users };
};

const createEmptyDb = () => ({
  schemaVersion: DB_SCHEMA_VERSION,
  createdAt: nowIso(),
  updatedAt: nowIso(),
  users: [],
  currentUserId: null,
  carts: {},
  orders: [],
  vouchers: null,
  menu: null,
  reservations: [],
  meta: {},
});

const createStaticSeedDb = () => {
  const staticDb = getStaticDbSnapshot();
  return {
    ...createEmptyDb(),
    schemaVersion: DB_SCHEMA_VERSION,
    users: Array.isArray(staticDb.users) ? staticDb.users : [],
    orders: Array.isArray(staticDb.orders) ? staticDb.orders : [],
    reservations: Array.isArray(staticDb.reservations) ? staticDb.reservations : [],
    vouchers: Array.isArray(staticDb.vouchers) ? staticDb.vouchers : null,
    menu: Array.isArray(staticDb.menu) ? staticDb.menu : null,
    meta: staticDb.meta && typeof staticDb.meta === 'object' ? { ...staticDb.meta } : {},
  };
};

const mergeStaticSeed = (db = {}) => {
  const seed = createStaticSeedDb();
  const merged = {
    ...seed,
    ...db,
    schemaVersion: DB_SCHEMA_VERSION,
    users: mergeById(seed.users, db.users || []),
    orders: mergeById(seed.orders, db.orders || []).map(normalizeOrderRecord),
    reservations: mergeById(seed.reservations, db.reservations || []),
    vouchers: db.vouchers === null || db.vouchers === undefined
      ? (seed.vouchers || []).map(normalizeVoucher)
      : mergeByKey(seed.vouchers || [], db.vouchers || [], 'code').map(normalizeVoucher),
    menu: db.menu === null || db.menu === undefined
      ? seed.menu
      : mergeById(seed.menu || [], db.menu || []),
    meta: {
      ...(seed.meta || {}),
      ...(db.meta || {}),
    },
  };
  return syncStaticAccounts(merged);
};

/* ---- Checkout draft (transient state stored in dq_db) ---- */
export const getCheckoutDraft = () => {
  const db = ensureDb();
  const draft = db?.meta?.checkoutDraft;
  return draft && typeof draft === 'object' ? draft : null;
};

export const setCheckoutDraft = (draft) => {
  const db = ensureDb();
  const next = draft && typeof draft === 'object' ? { ...draft, updatedAt: nowIso() } : null;
  const meta = { ...(db.meta || {}) };
  if (!next) delete meta.checkoutDraft;
  else meta.checkoutDraft = next;
  saveDb({ ...db, meta });
  return next;
};

export const clearCheckoutDraft = () => setCheckoutDraft(null);

const saveDb = (db) => {
  const safeDb = {
    ...createEmptyDb(),
    ...db,
    schemaVersion: DB_SCHEMA_VERSION,
    updatedAt: nowIso(),
  };
  dbCache = safeDb;
  writeJson(DB_KEY, safeDb);
  return safeDb;
};

const cleanupLegacyKeys = () => {
  Object.values(LEGACY_KEYS).forEach((key) => removeStorageKey(key));
};

const migrateLegacyToDb = () => {
  const legacyUsers = readJson(LEGACY_KEYS.USERS, []);
  const legacyCurrent = readJson(LEGACY_KEYS.CURRENT, null);
  const legacyOrders = readJson(LEGACY_KEYS.ORDERS, []);
  const legacyCart = readJson(LEGACY_KEYS.CART, []);
  const legacyVouchers = readJson(LEGACY_KEYS.VOUCHERS, null);
  const legacyMenu = readJson(LEGACY_KEYS.MENU, null);
  const legacyReservations = readJson(LEGACY_KEYS.RESERVATIONS, []);

  const db = createStaticSeedDb();

  db.users = mergeById(db.users, Array.isArray(legacyUsers) ? legacyUsers : []);

  if (legacyCurrent && legacyCurrent.id) {
    db.currentUserId = legacyCurrent.id;
    const exists = db.users.some((u) => u.id === legacyCurrent.id);
    if (!exists) db.users.push(legacyCurrent);
  }

  const cartOwner = db.currentUserId || 'guest';
  db.carts = { [cartOwner]: Array.isArray(legacyCart) ? legacyCart : [] };

  db.orders = mergeById(db.orders, Array.isArray(legacyOrders) ? legacyOrders : []);
  db.vouchers = Array.isArray(legacyVouchers) ? mergeByKey(db.vouchers || [], legacyVouchers, 'code') : db.vouchers;
  db.menu = Array.isArray(legacyMenu) ? mergeById(db.menu || [], legacyMenu) : db.menu;
  db.reservations = mergeById(db.reservations, Array.isArray(legacyReservations) ? legacyReservations : []);

  db.meta = { ...(db.meta || {}), migratedFromLegacyAt: nowIso() };

  saveDb(mergeStaticSeed(db));
  cleanupLegacyKeys();
  return dbCache;
};

const ensureDb = () => {
  if (dbCache) return dbCache;
  const existing = readJson(DB_KEY, null);
  if (existing && typeof existing === 'object') {
    const merged = mergeStaticSeed({ ...createEmptyDb(), ...existing, schemaVersion: DB_SCHEMA_VERSION });
    dbCache = merged;
    writeJsonIfChanged(DB_KEY, merged);
    return dbCache;
  }
  return migrateLegacyToDb();
};

const getCartOwnerKey = () => {
  const db = ensureDb();
  return db.currentUserId || 'guest';
};

/* ---- Backwards-compatible helpers (previous API) ---- */
const getUsersFromDb = () => ensureDb().users || [];
const setUsersToDb = (users) => saveDb({ ...ensureDb(), users: sanitizeUsers(users) });

/* ---- Users ---- */
export const getUsers = () => getUsersFromDb();
export const saveUsers = (users) => setUsersToDb(users);

export const getCurrentUser = () => {
  const db = ensureDb();
  if (!db.currentUserId) return null;
  return (db.users || []).find((u) => u.id === db.currentUserId) || null;
};

export const saveCurrentUser = (user) => {
  if (!user || !user.id) return;
  const safeUser = sanitizeUser(user);
  const db = ensureDb();
  const users = Array.isArray(db.users) ? [...db.users] : [];
  const idx = users.findIndex((u) => u.id === safeUser.id);
  if (idx >= 0) users[idx] = sanitizeUser({ ...users[idx], ...safeUser });
  else users.push(safeUser);
  saveDb({ ...db, users, currentUserId: safeUser.id });
};

export const clearCurrentUser = () => {
  const db = ensureDb();
  saveDb({ ...db, currentUserId: null });
};

export const registerUser = (data) => {
  const users = getUsers();
  const phone = normalizePhone(data.phone);
  if (users.find(u => normalizePhone(u.phone) === phone)) return { ok: false, msg: 'Số điện thoại đã được sử dụng.' };
  const user = {
    id: getNextUserId(users),
    name: data.name,
    password: data.password,
    phone,
    points: 0,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
};

export const loginUser = (phone, password) => {
  const users = getUsers();
  const user = users.find(u => normalizePhone(u.phone) === normalizePhone(phone) && u.password === password);
  if (!user) return { ok: false, msg: 'Số điện thoại hoặc mật khẩu không đúng.' };
  saveCurrentUser(user);
  return { ok: true, user };
};

export const updateUser = (updates) => {
  const current = getCurrentUser();
  if (!current) return;
  const users = getUsers();
  const idx = users.findIndex(u => u.id === current.id);
  if (idx === -1) return;
  const nextPhone = updates?.phone ? normalizePhone(updates.phone) : '';
  if (nextPhone && users.some((u) => u.id !== current.id && normalizePhone(u.phone) === nextPhone)) {
    return { ok: false, msg: 'Số điện thoại đã được sử dụng.' };
  }
  const updated = sanitizeUser({ ...users[idx], ...updates });
  users[idx] = updated;
  saveUsers(users);
  saveCurrentUser(updated);
  return { ok: true, user: updated };
};

export const addPoints = (userId, points) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  users[idx].points = (users[idx].points || 0) + points;
  saveUsers(users);
  const current = getCurrentUser();
  if (current && current.id === userId) saveCurrentUser(users[idx]);
  return users[idx];
};

export const calculateOrderPoints = (orderOrTotal) => {
  const total = typeof orderOrTotal === 'number' ? orderOrTotal : Number(orderOrTotal?.total || 0);
  return Number.isFinite(total) && total > 0 ? Math.floor(total / 10000) : 0;
};

/* ---- Cart ---- */
export const getCart = () => {
  const db = ensureDb();
  const key = getCartOwnerKey();
  const cart = db.carts?.[key];
  return Array.isArray(cart) ? cart : [];
};

export const saveCart = (cart) => {
  const db = ensureDb();
  const key = getCartOwnerKey();
  const carts = { ...(db.carts || {}) };
  carts[key] = Array.isArray(cart) ? cart : [];
  saveDb({ ...db, carts });
};

export const clearCart = () => {
  saveCart([]);
};

export const addToCart = (item) => {
  const cart = getCart();
  const note = (item.note || '').toString().trim();
  const existing = cart.find(c => c.id === item.id && (c.note || '').toString().trim() === note);
  if (existing) {
    existing.qty += item.qty || 1;
  } else {
    cart.push({ ...item, note, qty: item.qty || 1, cartId: 'ci_' + Date.now() + Math.random() });
  }
  saveCart(cart);
  return cart;
};

export const removeFromCart = (cartId) => {
  const cart = getCart().filter(c => c.cartId !== cartId);
  saveCart(cart);
  return cart;
};

export const updateCartQty = (cartId, qty) => {
  const cart = getCart();
  const item = cart.find(c => c.cartId === cartId);
  if (item) { if (qty <= 0) return removeFromCart(cartId); item.qty = qty; }
  saveCart(cart);
  return cart;
};

export const updateCartItemNote = (cartId, note = '') => {
  const cart = getCart();
  const item = cart.find(c => c.cartId === cartId);
  if (!item) return cart;
  item.note = note.toString().trim();
  saveCart(cart);
  return cart;
};

export const getCartTotal = () =>
  getCart().reduce((sum, c) => sum + c.price * c.qty, 0);

export const getCartCount = () =>
  getCart().reduce((sum, c) => sum + c.qty, 0);

/* ---- Orders ---- */
export const getOrders = () => {
  const db = ensureDb();
  return Array.isArray(db.orders) ? db.orders : [];
};

export const saveOrders = (orders) => {
  const db = ensureDb();
  saveDb({ ...db, orders: Array.isArray(orders) ? orders.map(normalizeOrderRecord) : [] });
};

export const createOrder = (orderData) => {
  const db = ensureDb();
  const orders = Array.isArray(db.orders) ? [...db.orders] : [];

  const meta = { ...(db.meta || {}) };
  const isPosOrder = (orderData?.source || '').toString() === 'pos';
  const idPrefix = isPosOrder ? 'POS' : 'ORD';
  const metaSeqKey = isPosOrder ? 'posOrderSeq' : 'orderSeq';

  const parseSeqFromId = (id) => {
    const m = new RegExp(`^${idPrefix}-(\\d{4})$`).exec((id || '').toString());
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  const maxExistingSeq = orders.reduce((max, o) => {
    const n = parseSeqFromId(o?.id);
    return n && n > max ? n : max;
  }, 0);

  const usedSeq = new Set(
    orders
      .map((o) => parseSeqFromId(o?.id))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9999)
  );

  let seq = Number(meta[metaSeqKey]);
  if (!Number.isFinite(seq) || seq <= 0) seq = maxExistingSeq;

  const findNextAvailableSeq = (start) => {
    const base = Number.isFinite(start) ? start : 1;
    for (let i = 0; i < 9999; i += 1) {
      const candidate = ((base - 1 + i) % 9999) + 1;
      if (!usedSeq.has(candidate)) return candidate;
    }
    return null;
  };

  const nextSeq = findNextAvailableSeq(seq + 1) ?? 9999;
  seq = nextSeq;

  meta[metaSeqKey] = seq;
  const id = `${idPrefix}-${String(seq).padStart(4, '0')}`;

  const order = {
    id,
    ...orderData,
    source: orderData.source || 'order',
    paymentMethod: normalizePaymentMethod(orderData.paymentMethod),
    pointsEarned: calculateOrderPoints(orderData),
    pointsAwarded: false,
    pointsAwardedAt: null,
    status: orderData.status || 'paid',
    createdAt: nowIso(),
  };

  orders.unshift(order);
  saveDb({ ...db, orders, meta });
  return order;
};

export const getUserOrders = (userId) =>
  getOrders().filter(o => o.userId === userId);

export const getOrderById = (id) =>
  getOrders().find(o => o.id === id);

/* ---- Vouchers ---- */
export const getVouchers = () => {
  const db = ensureDb();
  return mergeByKey(getStaticArray('vouchers').map(normalizeVoucher), db.vouchers || [], 'code').map(normalizeVoucher);
};

export const saveVouchers = (vouchers) => {
  const db = ensureDb();
  saveDb({ ...db, vouchers: Array.isArray(vouchers) ? vouchers.map(normalizeVoucher) : [] });
};

export const validateVoucher = (code, orderTotal) => {
  const vouchers = getVouchers();
  const v = vouchers.find(v => v.code === code.toUpperCase());
  if (!v) return { ok: false, msg: 'Mã voucher không tồn tại.' };
  if (!v.active) return { ok: false, msg: 'Mã voucher đã hết hạn.' };
  const now = new Date();
  const startsAt = v.startsAt ? new Date(v.startsAt) : null;
  const expiresAt = v.expiresAt ? new Date(v.expiresAt) : null;
  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) return { ok: false, msg: 'Mã voucher chưa đến thời gian sử dụng.' };
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && now > expiresAt) return { ok: false, msg: 'Mã voucher đã hết hạn.' };
  if (orderTotal < v.minOrder) return { ok: false, msg: `Đơn hàng tối thiểu ${formatPrice(v.minOrder)} để dùng mã này.` };
  const discount = v.type === 'percent'
    ? Math.round(orderTotal * v.value / 100)
    : v.value;
  return { ok: true, voucher: v, discount };
};

const generateVoucherCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const existing = new Set(getVouchers().map((v) => (v.code || '').toString().toUpperCase()));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let code = '';
    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.getRandomValues) {
      const values = new Uint32Array(10);
      cryptoApi.getRandomValues(values);
      code = Array.from(values, (n) => chars[n % chars.length]).join('');
    } else {
      code = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }
    if (!existing.has(code)) return code;
  }
  return `RW${Date.now().toString(36).slice(-8).toUpperCase()}`.slice(0, 10);
};

export const getCurrentUserVouchers = () => {
  const user = getCurrentUser();
  if (!user) return [];
  const owned = new Set((user.vouchers || []).map((code) => (code || '').toString().toUpperCase()));
  return getVouchers().filter((voucher) => owned.has((voucher.code || '').toString().toUpperCase()));
};

export const redeemPointsForVoucher = (amount) => {
  const value = Number(amount || 0);
  const user = getCurrentUser();
  if (!user) return { ok: false, msg: 'Vui lòng đăng nhập để đổi voucher.' };
  if (!Number.isFinite(value) || value <= 0 || value % 1000 !== 0) {
    return { ok: false, msg: 'Mệnh giá voucher phải là bội số của 1.000đ.' };
  }

  const requiredPoints = value / 1000;
  if (Number(user.points || 0) < requiredPoints) {
    return { ok: false, msg: `Bạn cần ${requiredPoints.toLocaleString('vi-VN')} điểm để đổi voucher này.` };
  }

  const users = getUsers();
  const userIdx = users.findIndex((u) => u.id === user.id);
  if (userIdx === -1) return { ok: false, msg: 'Không tìm thấy tài khoản khách hàng.' };

  const code = generateVoucherCode();
  const voucher = {
    code,
    type: 'fixed',
    value,
    minOrder: 0,
    startsAt: '',
    expiresAt: '',
    desc: `Voucher đổi từ ${requiredPoints.toLocaleString('vi-VN')} điểm thưởng`,
    active: true,
    source: 'rewards',
    userId: user.id,
    createdAt: nowIso(),
  };

  const nextUser = sanitizeUser({
    ...users[userIdx],
    points: Math.max(0, Number(users[userIdx].points || 0) - requiredPoints),
    vouchers: [...(users[userIdx].vouchers || []), code],
  }, users[userIdx].id);
  users[userIdx] = nextUser;

  const vouchers = getVouchers();
  saveDb({ ...ensureDb(), users: sanitizeUsers(users), vouchers: [...vouchers, voucher] });
  saveCurrentUser(nextUser);
  return { ok: true, voucher, user: nextUser, pointsSpent: requiredPoints };
};

/* ---- Menu ---- */
const ALLOWED_MENU_CATEGORIES = new Set(['ga', 'vit', 'com', 'uong']);
const MENU_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

const normalizeMenuCategory = (cat) => {
  const raw = (cat || '').toString().trim().toLowerCase();
  if (!raw) return 'com';
  if (['ga', 'gà', 'chicken'].includes(raw)) return 'ga';
  if (['vit', 'vịt', 'duck'].includes(raw)) return 'vit';
  if (['com', 'cơm', 'rice', 'phu', 'món phụ', 'mon phu', 'side'].includes(raw)) return 'com';
  if (['uong', 'đồ uống', 'do uong', 'drink', 'nuoc', 'nước'].includes(raw)) return 'uong';
  return 'com';
};

const slugifyMenuName = (name) =>
  (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const inferMenuImagePath = (item) => {
  const slug = slugifyMenuName(item?.name);
  if (!slug) return '';
  return `assets/images/${slug}.${MENU_IMAGE_EXTENSIONS[0]}`;
};

const isMissingMenuImage = (img) => {
  const value = (img || '').toString().trim();
  return !value || value.endsWith('/placeholder.svg') || value === 'placeholder.svg';
};

const normalizeMenuItem = (item, defaultItem = null) => {
  const { badge, available, isNew, ...itemWithoutLegacyFlags } = item || {};
  delete itemWithoutLegacyFlags['is' + 'New'];
  const normalizedCategory = normalizeMenuCategory(item.category);
  const fixedCategory = ALLOWED_MENU_CATEGORIES.has(normalizedCategory) ? normalizedCategory : 'com';

  const sold = Number.isFinite(Number(item.sold)) ? Number(item.sold) : 0;
  const defaultImage = isMissingMenuImage(defaultItem?.img) ? '' : defaultItem?.img;
  const image = isMissingMenuImage(item.img)
    ? (defaultImage || inferMenuImagePath(item)).toString()
    : item.img.toString();

  const rawStatus = (item.status || '').toString().trim().toLowerCase();
  const status = ['available', 'soldout', 'hidden'].includes(rawStatus)
    ? rawStatus
    : available === false ? 'soldout' : 'available';

  return {
    ...itemWithoutLegacyFlags,
    category: fixedCategory,
    desc: (item.desc || '').toString(),
    img: image,
    status,
    sold,
  };
};

export const getMenu = () => {
  const db = ensureDb();
  const stored = Array.isArray(db.menu) ? db.menu : null;
  const defaults = getStaticArray('menu');

  const storedArr = Array.isArray(stored) ? stored : null;
  const defaultById = new Map(defaults.filter((item) => item?.id).map((item) => [item.id, item]));

  // Merge: defaults first (stored overrides), then any stored extras.
  const merged = mergeById(defaults, storedArr || []);

  const normalized = merged
    .map((item) => normalizeMenuItem(item, defaultById.get(item.id)));

  const shouldSave = storedArr && storedArr.length !== normalized.length;
  if (shouldSave) saveDb({ ...db, menu: normalized });
  else if (storedArr) {
    // Also save if categories/sold fields were missing previously.
    const anyNeedsFix = storedArr.some((it) => {
      const rawCat = (it.category || '').toString().trim().toLowerCase();
      const cat = normalizeMenuCategory(it.category);
      const fixedCat = ALLOWED_MENU_CATEGORIES.has(cat);
      const categoryNeedsFix = rawCat !== cat;
      const hasSold = Number.isFinite(Number(it.sold));
      const defaultImage = defaultById.get(it.id)?.img;
      const replacementImage = !isMissingMenuImage(defaultImage) ? defaultImage : inferMenuImagePath(it);
      const missingImage = isMissingMenuImage(it.img) && !!replacementImage;
      const hasLegacyBadge = Object.prototype.hasOwnProperty.call(it, 'badge');
      const hasStatus = ['available', 'soldout', 'hidden'].includes((it.status || '').toString());
      const hasLegacyIsNew = Object.prototype.hasOwnProperty.call(it, 'isNew');
      const hasLegacyAvailable = Object.prototype.hasOwnProperty.call(it, 'available');
      return !fixedCat || categoryNeedsFix || !hasSold || typeof it.desc !== 'string' || missingImage || hasLegacyBadge || hasLegacyIsNew || hasLegacyAvailable || !hasStatus;
    });
    if (anyNeedsFix) saveDb({ ...db, menu: normalized });
  }

  return normalized;
};
export const saveMenu = (menu) => {
  const db = ensureDb();
  saveDb({ ...db, menu: Array.isArray(menu) ? menu.map((item) => normalizeMenuItem(item)).filter((item) => ALLOWED_MENU_CATEGORIES.has(item.category)) : [] });
};

export const incrementMenuSoldCounts = (orderItems = []) => {
  const menu = getMenu();
  const qtyById = new Map();
  (orderItems || []).forEach((it) => {
    const id = it?.id;
    const qty = Number(it?.qty || 0);
    if (!id || !Number.isFinite(qty) || qty <= 0) return;
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  });

  if (!qtyById.size) return menu;

  const updated = menu.map((m) => {
    const inc = qtyById.get(m.id) || 0;
    if (!inc) return m;
    return { ...m, sold: (Number(m.sold) || 0) + inc };
  });
  saveMenu(updated);
  return updated;
};

/* ---- Reservations (Preorder) ---- */
export const getReservations = () => {
  const db = ensureDb();
  return Array.isArray(db.reservations) ? db.reservations : [];
};

export const saveReservations = (reservations) => {
  const db = ensureDb();
  saveDb({ ...db, reservations: Array.isArray(reservations) ? reservations : [] });
};

export const createReservation = (data = {}) => {
  const db = ensureDb();

  const parseSeqFromId = (id) => {
    const m = /^RES-(\d{4})$/.exec((id || '').toString());
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  const existing = Array.isArray(db.reservations) ? db.reservations : [];
  const usedSeq = new Set(
    existing
      .map((r) => parseSeqFromId(r?.id))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9999)
  );

  const maxExistingSeq = existing.reduce((max, r) => {
    const n = parseSeqFromId(r?.id);
    return n && n > max ? n : max;
  }, 0);

  const meta = { ...(db.meta || {}) };
  let seq = Number(meta.reservationSeq);
  if (!Number.isFinite(seq) || seq <= 0) seq = maxExistingSeq;

  const findNextAvailableSeq = (start) => {
    const base = Number.isFinite(start) ? start : 1;
    for (let i = 0; i < 9999; i += 1) {
      const candidate = ((base - 1 + i) % 9999) + 1;
      if (!usedSeq.has(candidate)) return candidate;
    }
    return null;
  };

  const nextSeq = findNextAvailableSeq(seq + 1) ?? 9999;
  seq = nextSeq;
  meta.reservationSeq = seq;

  const qty = Number(data?.qty || 1);
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const price = Number(data?.price || 0);
  const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;
  const total = Number(data?.total);
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : safePrice * safeQty;

  const reservation = {
    id: `RES-${String(seq).padStart(4, '0')}`,
    userId: data?.userId ? data.userId.toString() : null,
    name: (data?.name || '').toString().trim(),
    phone: (data?.phone || '').toString().trim(),
    type: (data?.type || '').toString(),
    itemName: (data?.itemName || '').toString().trim() || null,
    qty: safeQty,
    price: safePrice,
    total: safeTotal,
    date: (data?.date || '').toString(),
    note: (data?.note || '').toString().trim(),
    status: 'pending',
    createdAt: nowIso(),
  };

  const reservations = [...existing, reservation];
  saveDb({ ...db, meta, reservations });
  return reservation;
};

/* ---- Utils ---- */
export const formatPrice = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const generateOrderCode = () =>
  (() => {
    const db = ensureDb();
    const orders = Array.isArray(db.orders) ? db.orders : [];
    const meta = db.meta || {};

    const parseSeqFromId = (id) => {
      const m = /^ORD-(\d{4})$/.exec((id || '').toString());
      if (!m) return null;
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : null;
    };

    const usedSeq = new Set(
      orders
        .map((o) => parseSeqFromId(o?.id))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9999)
    );

    const maxExistingSeq = orders.reduce((max, o) => {
      const n = parseSeqFromId(o?.id);
      return n && n > max ? n : max;
    }, 0);

    let seq = Number(meta.orderSeq);
    if (!Number.isFinite(seq) || seq <= 0) seq = maxExistingSeq;

    const findNextAvailableSeq = (start) => {
      const base = Number.isFinite(start) ? start : 1;
      for (let i = 0; i < 9999; i += 1) {
        const candidate = ((base - 1 + i) % 9999) + 1;
        if (!usedSeq.has(candidate)) return candidate;
      }
      return null;
    };

    const nextSeq = findNextAvailableSeq(seq + 1) ?? 9999;
    return `ORD-${String(nextSeq).padStart(4, '0')}`;
  })();
