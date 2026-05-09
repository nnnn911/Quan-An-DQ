/**
 * cart.js - Cart sidebar module
 */
import {
  getCart, addToCart, removeFromCart, updateCartQty,
  getCartTotal, getCartCount, clearCart, formatPrice,
  validateVoucher, getCurrentUser
} from './store.js';
import { toast } from './toast.js';
import { updateCartBadge } from './navbar.js';
import { openAuthModal } from './auth.js';

let sidebarEl = null;
let overlayEl = null;
let appliedVoucher = null;

export const openCart = () => {
  if (!getCurrentUser()) {
    openAuthModal('login');
    toast.info('Vui lòng đăng nhập để xem giỏ hàng.');
    return;
  }
  ensureSidebar();
  sidebarEl.classList.add('open');
  overlayEl.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderCartItems();
};

export const closeCart = () => {
  sidebarEl?.classList.remove('open');
  overlayEl?.classList.remove('active');
  document.body.style.overflow = '';
};

export const addItemToCart = (item) => {
  addToCart(item);
  updateCartBadge();
  toast.success(`Đã thêm "${item.name}" vào giỏ hàng! 🛒`);
  // Animate cart btn
  const cartBtn = document.getElementById('cart-btn');
  cartBtn?.classList.add('animate-pulse');
  setTimeout(() => cartBtn?.classList.remove('animate-pulse'), 600);
};

const ensureSidebar = () => {
  if (sidebarEl) return;

  overlayEl = document.createElement('div');
  overlayEl.className = 'overlay';
  overlayEl.id = 'cart-overlay';
  overlayEl.addEventListener('click', closeCart);

  sidebarEl = document.createElement('aside');
  sidebarEl.className = 'cart-sidebar';
  sidebarEl.id = 'cart-sidebar';
  sidebarEl.setAttribute('role', 'complementary');
  sidebarEl.setAttribute('aria-label', 'Giỏ hàng');
  sidebarEl.innerHTML = `
    <div class="cart-header">
      <div class="cart-title">🛒 Giỏ hàng <span class="cart-count-badge" id="cart-count-badge">0</span></div>
      <button class="cart-close" id="cart-close-btn" aria-label="Đóng giỏ hàng">✕</button>
    </div>
    <div class="cart-body" id="cart-body"></div>
    <div class="cart-footer" id="cart-footer"></div>`;

  document.body.append(overlayEl, sidebarEl);
  document.getElementById('cart-close-btn').addEventListener('click', closeCart);
};

const renderCartItems = () => {
  const cart = getCart();
  const bodyEl = document.getElementById('cart-body');
  const footerEl = document.getElementById('cart-footer');
  const countBadge = document.getElementById('cart-count-badge');

  if (countBadge) countBadge.textContent = getCartCount();

  if (!cart.length) {
    bodyEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <h3>Giỏ hàng trống</h3>
        <p>Hãy chọn món ăn yêu thích của bạn nhé!</p>
      </div>`;
    footerEl.innerHTML = '';
    return;
  }

  bodyEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-cart-id="${item.cartId}">
      <div class="cart-item-img">
        <img src="${item.img}" alt="${item.name}" onerror="this.src='assets/images/placeholder.svg'">
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${item.note ? `<div class="cart-item-note">📝 ${item.note}</div>` : ''}
        <div class="cart-item-actions">
          <div class="qty-stepper">
            <button class="qty-btn btn-qty-minus" data-id="${item.cartId}" aria-label="Giảm số lượng">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn btn-qty-plus" data-id="${item.cartId}" aria-label="Tăng số lượng">+</button>
          </div>
          <span class="cart-item-price">${formatPrice(item.price * item.qty)}</span>
        </div>
      </div>
      <button class="cart-item-remove" data-id="${item.cartId}" aria-label="Xóa món">✕</button>
    </div>`).join('');

  // Bind item events
  bodyEl.querySelectorAll('.btn-qty-minus').forEach(btn =>
    btn.addEventListener('click', () => { updateCartQty(btn.dataset.id, getCart().find(c => c.cartId === btn.dataset.id)?.qty - 1); updateCartBadge(); renderCartItems(); }));
  bodyEl.querySelectorAll('.btn-qty-plus').forEach(btn =>
    btn.addEventListener('click', () => { updateCartQty(btn.dataset.id, getCart().find(c => c.cartId === btn.dataset.id)?.qty + 1); updateCartBadge(); renderCartItems(); }));
  bodyEl.querySelectorAll('.cart-item-remove').forEach(btn =>
    btn.addEventListener('click', () => { removeFromCart(btn.dataset.id); updateCartBadge(); renderCartItems(); }));

  renderCartFooter(footerEl);
};

const renderCartFooter = (footerEl) => {
  const total = getCartTotal();
  const discount = appliedVoucher ? appliedVoucher.discount : 0;
  const finalTotal = Math.max(0, total - discount);

  footerEl.innerHTML = `
    <div class="cart-summary">
      <div class="cart-summary-row"><span>Tạm tính</span><span>${formatPrice(total)}</span></div>
      <div class="cart-summary-row"><span>Phí giao hàng</span><span class="text-success">Miễn phí</span></div>
      ${appliedVoucher ? `<div class="cart-summary-row text-success"><span>🎟️ Voucher (${appliedVoucher.voucher.code})</span><span>-${formatPrice(discount)}</span></div>` : ''}
      <div class="cart-summary-row total"><span>Tổng cộng</span><span class="price">${formatPrice(finalTotal)}</span></div>
    </div>
    <div class="voucher-input">
      <input class="form-control" type="text" id="cart-voucher-input" placeholder="Nhập mã voucher..." aria-label="Nhập mã voucher" value="${appliedVoucher ? appliedVoucher.voucher.code : ''}">
      <button class="btn btn-outline btn-sm" id="btn-apply-voucher">Áp dụng</button>
    </div>
    <button class="btn btn-primary btn-block btn-lg" id="btn-checkout" ${!getCartCount() ? 'disabled' : ''}>
      🍽️ Đặt hàng ngay
    </button>
    <button class="btn btn-ghost btn-block" id="btn-clear-cart" style="margin-top:var(--space-2);font-size:var(--font-size-xs);color:var(--color-text-muted)">
      🗑️ Xóa giỏ hàng
    </button>`;

  document.getElementById('btn-apply-voucher')?.addEventListener('click', () => {
    const code = document.getElementById('cart-voucher-input')?.value.trim();
    if (!code) { toast.warning('Vui lòng nhập mã voucher.'); return; }
    const result = validateVoucher(code, total);
    if (!result.ok) { toast.error(result.msg); appliedVoucher = null; }
    else { appliedVoucher = result; toast.success(`Áp dụng voucher thành công! Giảm ${formatPrice(result.discount)}`); }
    renderCartFooter(footerEl);
  });

  document.getElementById('btn-checkout')?.addEventListener('click', () => {
    if (!getCurrentUser()) { closeCart(); openAuthModal(); toast.info('Vui lòng đăng nhập để đặt hàng.'); return; }
    closeCart();
    import('../pages/checkout.js').then(m => m.showCheckout(appliedVoucher));
  });

  document.getElementById('btn-clear-cart')?.addEventListener('click', () => {
    if (confirm('Xóa toàn bộ giỏ hàng?')) { clearCart(); appliedVoucher = null; updateCartBadge(); renderCartItems(); }
  });
};

export const resetAppliedVoucher = () => { appliedVoucher = null; };
