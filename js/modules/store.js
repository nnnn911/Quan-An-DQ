/**
 * store.js - LocalStorage data management module
 * Quán Ăn Đồng Quê
 */

// Single-key storage (preparing for Admin/Shipper apps)
const DB_KEY = 'dq_db';
const DB_SCHEMA_VERSION = 1;

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

const readJson = (key, fallback = null) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
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
  try {
    Object.values(LEGACY_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
};

const migrateLegacyToDb = () => {
  const legacyUsers = readJson(LEGACY_KEYS.USERS, []);
  const legacyCurrent = readJson(LEGACY_KEYS.CURRENT, null);
  const legacyOrders = readJson(LEGACY_KEYS.ORDERS, []);
  const legacyCart = readJson(LEGACY_KEYS.CART, []);
  const legacyVouchers = readJson(LEGACY_KEYS.VOUCHERS, null);
  const legacyMenu = readJson(LEGACY_KEYS.MENU, null);
  const legacyReservations = readJson(LEGACY_KEYS.RESERVATIONS, []);

  const db = createEmptyDb();

  db.users = Array.isArray(legacyUsers) ? legacyUsers : [];

  if (legacyCurrent && legacyCurrent.id) {
    db.currentUserId = legacyCurrent.id;
    const exists = db.users.some((u) => u.id === legacyCurrent.id);
    if (!exists) db.users.push(legacyCurrent);
  }

  const cartOwner = db.currentUserId || 'guest';
  db.carts = { [cartOwner]: Array.isArray(legacyCart) ? legacyCart : [] };

  db.orders = Array.isArray(legacyOrders) ? legacyOrders : [];
  db.vouchers = Array.isArray(legacyVouchers) ? legacyVouchers : null;
  db.menu = Array.isArray(legacyMenu) ? legacyMenu : null;
  db.reservations = Array.isArray(legacyReservations) ? legacyReservations : [];

  db.meta = { migratedFromLegacyAt: nowIso() };

  saveDb(db);
  cleanupLegacyKeys();
  return dbCache;
};

const ensureDb = () => {
  if (dbCache) return dbCache;
  const existing = readJson(DB_KEY, null);
  if (existing && typeof existing === 'object') {
    dbCache = { ...createEmptyDb(), ...existing, schemaVersion: DB_SCHEMA_VERSION };
    // Ensure persisted structure for future tools
    saveDb(dbCache);
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
const setUsersToDb = (users) => saveDb({ ...ensureDb(), users: Array.isArray(users) ? users : [] });

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
  const db = ensureDb();
  const users = Array.isArray(db.users) ? [...db.users] : [];
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = { ...users[idx], ...user };
  else users.push(user);
  saveDb({ ...db, users, currentUserId: user.id });
};

export const clearCurrentUser = () => {
  const db = ensureDb();
  saveDb({ ...db, currentUserId: null });
};

export const registerUser = (data) => {
  const users = getUsers();
  if (users.find(u => u.email === data.email)) return { ok: false, msg: 'Email đã được sử dụng.' };
  const user = {
    id: 'u_' + Date.now(),
    name: data.name,
    email: data.email,
    password: data.password,
    phone: data.phone || '',
    address: data.address || '',
    avatar: '',
    points: 0,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
};

export const loginUser = (email, password) => {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { ok: false, msg: 'Email hoặc mật khẩu không đúng.' };
  saveCurrentUser(user);
  return { ok: true, user };
};

export const updateUser = (updates) => {
  const current = getCurrentUser();
  if (!current) return;
  const users = getUsers();
  const idx = users.findIndex(u => u.id === current.id);
  if (idx === -1) return;
  const updated = { ...users[idx], ...updates };
  users[idx] = updated;
  saveUsers(users);
  saveCurrentUser(updated);
  return updated;
};

export const addPoints = (userId, points) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  users[idx].points = (users[idx].points || 0) + points;
  saveUsers(users);
  const current = getCurrentUser();
  if (current && current.id === userId) saveCurrentUser(users[idx]);
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
  const existing = cart.find(c => c.id === item.id && c.note === (item.note || ''));
  if (existing) {
    existing.qty += item.qty || 1;
  } else {
    cart.push({ ...item, qty: item.qty || 1, cartId: 'ci_' + Date.now() + Math.random() });
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
  saveDb({ ...db, orders: Array.isArray(orders) ? orders : [] });
};

export const createOrder = (orderData) => {
  const orders = getOrders();
  const order = {
    id: 'ORD-' + Date.now(),
    ...orderData,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  orders.unshift(order);
  saveOrders(orders);
  return order;
};

export const getUserOrders = (userId) =>
  getOrders().filter(o => o.userId === userId);

export const getOrderById = (id) =>
  getOrders().find(o => o.id === id);

/* ---- Vouchers ---- */
export const getVouchers = () => {
  const db = ensureDb();
  if (Array.isArray(db.vouchers) && db.vouchers.length) return db.vouchers;
  const defaults = getDefaultVouchers();
  saveDb({ ...db, vouchers: defaults });
  return defaults;
};

const getDefaultVouchers = () => [
  { code: 'WELCOME10', type: 'percent', value: 10, minOrder: 100000, desc: 'Giảm 10% cho đơn từ 100k', active: true, expiresAt: '2026-12-31' },
  { code: 'DONGQUE30K', type: 'fixed', value: 30000, minOrder: 200000, desc: 'Giảm 30,000đ cho đơn từ 200k', active: true, expiresAt: '2026-12-31' },
  { code: 'FREE15', type: 'percent', value: 15, minOrder: 300000, desc: 'Giảm 15% cho đơn từ 300k', active: true, expiresAt: '2026-12-31' },
];

export const validateVoucher = (code, orderTotal) => {
  const vouchers = getVouchers();
  const v = vouchers.find(v => v.code === code.toUpperCase());
  if (!v) return { ok: false, msg: 'Mã voucher không tồn tại.' };
  if (!v.active) return { ok: false, msg: 'Mã voucher đã hết hạn.' };
  if (orderTotal < v.minOrder) return { ok: false, msg: `Đơn hàng tối thiểu ${formatPrice(v.minOrder)} để dùng mã này.` };
  const discount = v.type === 'percent'
    ? Math.round(orderTotal * v.value / 100)
    : v.value;
  return { ok: true, voucher: v, discount };
};

/* ---- Menu ---- */
const ALLOWED_MENU_CATEGORIES = new Set(['ga', 'vit', 'com', 'uong']);

const normalizeMenuCategory = (cat) => {
  const raw = (cat || '').toString().trim().toLowerCase();
  if (!raw) return 'com';
  if (raw === 'cung') return 'cung';
  if (['ga', 'gà', 'chicken'].includes(raw)) return 'ga';
  if (['vit', 'vịt', 'duck'].includes(raw)) return 'vit';
  if (['com', 'cơm', 'rice', 'phu', 'món phụ', 'mon phu', 'side'].includes(raw)) return 'com';
  if (['uong', 'đồ uống', 'do uong', 'drink', 'nuoc', 'nước'].includes(raw)) return 'uong';
  return 'com';
};

const normalizeMenuItem = (item) => {
  const normalizedCategory = normalizeMenuCategory(item.category);
  const fixedCategory = ALLOWED_MENU_CATEGORIES.has(normalizedCategory) ? normalizedCategory : 'com';

  const sold = Number.isFinite(Number(item.sold)) ? Number(item.sold) : 0;

  return {
    ...item,
    category: normalizedCategory === 'cung' ? 'cung' : fixedCategory,
    desc: (item.desc || '').toString(),
    img: (item.img || '').toString(),
    available: typeof item.available === 'boolean' ? item.available : true,
    sold,
  };
};

export const getMenu = () => {
  const db = ensureDb();
  const stored = Array.isArray(db.menu) ? db.menu : null;
  const defaults = getDefaultMenu();

  const storedArr = Array.isArray(stored) ? stored : null;
  const storedMap = new Map((storedArr || []).map(i => [i.id, i]));

  // Merge: defaults first (stored overrides), then any stored extras.
  const merged = defaults.map(d => ({ ...d, ...(storedMap.get(d.id) || {}) }));
  const extras = (storedArr || []).filter(i => !defaults.some(d => d.id === i.id));

  const normalized = [...merged, ...extras]
    .map(normalizeMenuItem)
    .filter(i => i.category !== 'cung');

  const shouldSave = !storedArr || storedArr.length !== normalized.length;
  if (shouldSave) saveDb({ ...db, menu: normalized });
  else {
    // Also save if categories/sold fields were missing previously.
    const anyNeedsFix = storedArr.some((it) => {
      const rawCat = (it.category || '').toString().trim().toLowerCase();
      const cat = normalizeMenuCategory(it.category);
      const fixedCat = cat !== 'cung' && ALLOWED_MENU_CATEGORIES.has(cat);
      const categoryNeedsFix = cat !== 'cung' && rawCat !== cat;
      const hasSold = Number.isFinite(Number(it.sold));
      return (!fixedCat && cat !== 'cung') || categoryNeedsFix || !hasSold || typeof it.desc !== 'string';
    });
    if (anyNeedsFix) saveDb({ ...db, menu: normalized });
  }

  return normalized;
};
export const saveMenu = (menu) => {
  const db = ensureDb();
  saveDb({ ...db, menu: Array.isArray(menu) ? menu : [] });
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

export const createReservation = ({ name, phone, type, date, note } = {}) => {
  const reservation = {
    id: 'RES-' + Date.now(),
    name: (name || '').toString().trim(),
    phone: (phone || '').toString().trim(),
    type: (type || '').toString(),
    date: (date || '').toString(),
    note: (note || '').toString().trim(),
    createdAt: nowIso(),
  };
  const reservations = getReservations();
  reservations.push(reservation);
  saveReservations(reservations);
  return reservation;
};

const getDefaultMenu = () => [
  // Gà
  { id: 'm1', name: 'Gà nướng mật ong', category: 'ga', price: 189000, desc: 'Gà ta nướng với mật ong và gia vị bí truyền, da giòn thịt mềm.', img: 'assets/images/ga-nuong.jpg', badge: 'Bán chạy', available: true, isNew: false, sold: 0 },
  { id: 'm2', name: 'Gà chiên giòn đồng quê', category: 'ga', price: 175000, desc: 'Gà chiên với lớp bột giòn tan, ướp đặc trưng hương đồng quê.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  { id: 'm3', name: 'Gà hấp lá chanh', category: 'ga', price: 195000, desc: 'Gà ta hấp lá chanh thơm phức, giữ trọn vị ngọt tự nhiên.', img: 'assets/images/placeholder.svg', badge: 'Mới', available: true, isNew: true, sold: 0 },
  { id: 'm4', name: 'Gà luộc mắm gừng', category: 'ga', price: 165000, desc: 'Gà ta luộc vàng, chấm mắm gừng chuẩn vị miền quê.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  { id: 'm14', name: 'Gà rang muối', category: 'ga', price: 179000, desc: 'Gà rang muối mặn mà, thơm lừng sả tỏi, ăn kèm rau răm.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  { id: 'm5', name: 'Cơm gà xối mỡ', category: 'com', price: 65000, desc: 'Cơm trắng dẻo với gà xối mỡ vàng giòn, rau cải xào.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  // Vịt
  { id: 'm6', name: 'Vịt quay Đồng Quê', category: 'vit', price: 220000, desc: 'Vịt quay nguyên con với da vàng giòn, thịt đậm đà hương vị.', img: 'assets/images/vit-quay.jpg', badge: 'Đặc biệt', available: true, isNew: false, sold: 0 },
  { id: 'm7', name: 'Vịt nấu chao', category: 'vit', price: 185000, desc: 'Vịt nấu chao béo ngậy, thơm mùi sả gừng đặc trưng miền Nam.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  { id: 'm8', name: 'Bún vịt nấu tiêu', category: 'vit', price: 75000, desc: 'Bún tươi với vịt nấu tiêu xanh thơm nồng, cay nhẹ ngon miệng.', img: 'assets/images/placeholder.svg', badge: 'Yêu thích', available: true, isNew: false, sold: 0 },
  { id: 'm15', name: 'Vịt om sả ớt', category: 'vit', price: 199000, desc: 'Vịt om sả ớt thơm nồng, cay nhẹ, thịt mềm đậm vị.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  // Cơm / món kèm
  { id: 'm9', name: 'Rau muống xào tỏi', category: 'com', price: 45000, desc: 'Rau muống tươi xào tỏi phi thơm, giòn xanh bắt mắt.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  { id: 'm10', name: 'Canh chua đồng quê', category: 'com', price: 55000, desc: 'Canh chua đậm vị với cà chua, thơm, giá đỗ và cá linh.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  { id: 'm16', name: 'Cơm chiên dương châu', category: 'com', price: 70000, desc: 'Cơm chiên hạt tơi, trứng và rau củ, thơm vị xì dầu nhẹ.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  // Đồ uống
  { id: 'm11', name: 'Nước chanh muối', category: 'uong', price: 25000, desc: 'Chanh muối tươi mát, giải nhiệt cực đỉnh ngày hè.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
  { id: 'm13', name: 'Nước mía tươi', category: 'uong', price: 20000, desc: 'Mía cây ép tươi, ngọt thanh mát lạnh.', img: 'assets/images/placeholder.svg', badge: '', available: true, isNew: false, sold: 0 },
];

/* ---- Utils ---- */
export const formatPrice = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const generateOrderCode = () =>
  'ORD' + Date.now().toString().slice(-8);
