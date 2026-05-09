/**
 * checkout.js - Checkout page module
 */
import {
  getCart, getCartTotal, createOrder, clearCart,
  getCurrentUser, addPoints, formatPrice, incrementMenuSoldCounts
} from '../modules/store.js';
import { toast } from '../modules/toast.js';
import { updateCartBadge } from '../modules/navbar.js';
import { updateNavbarUser } from '../modules/navbar.js';
import { resetAppliedVoucher } from '../modules/cart.js';

export const showCheckout = (appliedVoucher = null) => {
  const existing = document.getElementById('checkout-modal');
  if (existing) existing.remove();

  const user = getCurrentUser();
  const cart = getCart();
  if (!cart.length) { toast.warning('Giỏ hàng trống.'); return; }

  const subtotal = getCartTotal();
  const discount = appliedVoucher ? appliedVoucher.discount : 0;
  const total = Math.max(0, subtotal - discount);

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop active';
  modal.id = 'checkout-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Đặt hàng');

  modal.innerHTML = `
    <div class="modal" style="max-width:760px;width:100%">
      <div class="modal-header">
        <span class="modal-title">🍽️ Xác nhận đặt hàng</span>
        <button class="modal-close" id="checkout-close" aria-label="Đóng">✕</button>
      </div>
      <div class="modal-body" style="max-height:80vh;overflow-y:auto">
        <div class="checkout-layout" style="padding:0">
          <!-- Left: Form -->
          <div>
            <!-- Delivery info -->
            <div style="margin-bottom:var(--space-6)">
              <div class="checkout-section-title">
                <span class="checkout-section-num">1</span> Thông tin giao hàng
              </div>
              <div class="reservation-grid">
                <div class="form-group">
                  <label class="form-label" for="co-name">Họ và tên *</label>
                  <input class="form-control" type="text" id="co-name" value="${user?.name || ''}" placeholder="Nguyễn Văn A" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="co-phone">Số điện thoại *</label>
                  <input class="form-control" type="tel" id="co-phone" value="${user?.phone || ''}" placeholder="0901234567" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="co-address">Địa chỉ giao hàng *</label>
                <input class="form-control" type="text" id="co-address" value="${user?.address || ''}" placeholder="Số nhà, đường, phường/xã, quận/huyện...">
              </div>
              <div class="form-group">
                <label class="form-label" for="co-note">Ghi chú đơn hàng</label>
                <input class="form-control" type="text" id="co-note" placeholder="Ghi chú thêm cho đơn hàng...">
              </div>
            </div>

            <!-- Payment -->
            <div>
              <div class="checkout-section-title">
                <span class="checkout-section-num">2</span> Phương thức thanh toán
              </div>
              <div class="payment-methods">
                ${[
                  { id: 'cash', icon: '💵', name: 'Tiền mặt' },
                  { id: 'transfer', icon: '🏦', name: 'Chuyển khoản' },
                  { id: 'momo', icon: '💜', name: 'MoMo' },
                  { id: 'vnpay', icon: '🔵', name: 'VNPay' },
                ].map((m, i) => `
                  <label class="payment-method-card ${i === 0 ? 'selected' : ''}" data-method="${m.id}" style="cursor:pointer">
                    <input type="radio" name="payment" value="${m.id}" ${i === 0 ? 'checked' : ''} style="display:none">
                    <div class="payment-method-icon">${m.icon}</div>
                    <div class="payment-method-name">${m.name}</div>
                  </label>`).join('')}
              </div>
            </div>
          </div>

          <!-- Right: Summary -->
          <div>
            <div class="order-summary-card">
              <div class="order-summary-header">📋 Tóm tắt đơn hàng</div>
              <div class="order-summary-body">
                ${cart.map(item => `
                  <div class="order-summary-item">
                    <div>
                      <div class="order-summary-item-name">${item.name}</div>
                      <div class="order-summary-item-qty">x${item.qty}</div>
                    </div>
                    <strong>${formatPrice(item.price * item.qty)}</strong>
                  </div>`).join('')}
                <div class="order-summary-total-row"><span>Tạm tính</span><span>${formatPrice(subtotal)}</span></div>
                <div class="order-summary-total-row"><span>Giao hàng</span><span class="text-success">Miễn phí</span></div>
                ${appliedVoucher ? `<div class="order-summary-total-row text-success"><span>Voucher</span><span>-${formatPrice(discount)}</span></div>` : ''}
                <div class="order-summary-total-row grand"><span>Tổng cộng</span><span class="price">${formatPrice(total)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div id="checkout-error" class="form-error" style="margin-top:var(--space-4);display:none"></div>
      </div>
      <div class="modal-footer" style="border-top:1px solid var(--color-border);padding:var(--space-4) var(--space-6)">
        <button class="btn btn-outline" id="checkout-cancel">Quay lại</button>
        <button class="btn btn-primary btn-lg" id="btn-place-order">
          ✅ Xác nhận đặt hàng — ${formatPrice(total)}
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Payment method selection
  modal.querySelectorAll('.payment-method-card').forEach(card => {
    card.addEventListener('click', () => {
      modal.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input[type=radio]').checked = true;
    });
  });

  modal.querySelector('#checkout-close').addEventListener('click', closeCheckout);
  modal.querySelector('#checkout-cancel').addEventListener('click', closeCheckout);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeCheckout(); });

  modal.querySelector('#btn-place-order').addEventListener('click', () => {
    const name = document.getElementById('co-name').value.trim();
    const phone = document.getElementById('co-phone').value.trim();
    const address = document.getElementById('co-address').value.trim();
    const note = document.getElementById('co-note').value.trim();
    const payment = modal.querySelector('input[name=payment]:checked')?.value || 'cash';
    const errEl = document.getElementById('checkout-error');

    if (!name || !phone) {
      errEl.innerHTML = '⚠️ Vui lòng nhập đầy đủ họ tên và số điện thoại.';
      errEl.style.display = 'flex';
      return;
    }
    errEl.style.display = 'none';

    const order = createOrder({
      userId: user?.id || 'guest',
      customerName: name,
      customerPhone: phone,
      address,
      note,
      paymentMethod: payment,
      items: getCart().map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, note: i.note })),
      subtotal,
      discount,
      total,
      voucherCode: appliedVoucher?.voucher?.code || null,
    });

    // Update menu sold counts after successful order creation
    incrementMenuSoldCounts(cart.map(i => ({ id: i.id, qty: i.qty })));
    window.dispatchEvent(new CustomEvent('menu:updated'));

    // Award points (1 point per 10,000 VND)
    if (user) {
      const pts = Math.floor(total / 10000);
      addPoints(user.id, pts);
      updateNavbarUser();
    }

    clearCart();
    resetAppliedVoucher();
    updateCartBadge();
    closeCheckout();
    showOrderSuccess(order, user ? Math.floor(total / 10000) : 0);
  });
};

const closeCheckout = () => {
  document.getElementById('checkout-modal')?.remove();
  document.body.style.overflow = '';
};

const showOrderSuccess = (order, pointsEarned) => {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop active';
  modal.id = 'order-success-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-body">
        <div class="order-success">
          <div class="order-success-icon">✅</div>
          <h2>Đặt hàng thành công!</h2>
          <div class="order-number">Mã đơn: ${order.id}</div>
          <p>Cảm ơn bạn đã tin tưởng Quán Ăn Đồng Quê!<br>Đơn hàng của bạn đang được xử lý và sẽ sớm giao đến.</p>
          ${pointsEarned ? `<div style="margin-top:var(--space-4);padding:var(--space-3) var(--space-5);background:var(--color-accent-100);border:1px solid var(--color-accent-300);border-radius:var(--radius-lg);font-size:var(--font-size-sm);color:var(--color-beige-800);font-weight:600">⭐ Bạn vừa tích lũy được <strong>${pointsEarned} điểm</strong>!</div>` : ''}
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6);justify-content:center;flex-wrap:wrap">
            <button class="btn btn-outline" id="view-order-detail">Xem chi tiết đơn</button>
            <button class="btn btn-primary" id="continue-shopping">Tiếp tục mua sắm</button>
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  document.getElementById('continue-shopping').addEventListener('click', () => {
    modal.remove(); document.body.style.overflow = '';
  });
  document.getElementById('view-order-detail').addEventListener('click', () => {
    modal.remove(); document.body.style.overflow = '';
    import('./history.js').then(m => m.showHistoryModal(order.id));
  });
};
