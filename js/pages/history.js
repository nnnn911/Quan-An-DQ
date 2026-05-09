/**
 * history.js - Order history page/modal
 */
import { getUserOrders, getCurrentUser, formatPrice, formatDate, getOrderById } from '../modules/store.js';

const STATUS_MAP = {
  confirmed:   { label: 'Đã xác nhận', class: 'badge-success' },
  preparing:   { label: 'Đang chuẩn bị', class: 'badge-warning' },
  shipping:    { label: 'Đang giao', class: 'badge-info' },
  delivered:   { label: 'Đã giao', class: 'badge-primary' },
  cancelled:   { label: 'Đã hủy', class: 'badge-danger' },
};

const PAYMENT_LABELS = {
  cash: '💵 Tiền mặt', transfer: '🏦 Chuyển khoản', momo: '💜 MoMo', vnpay: '🔵 VNPay'
};

export const showHistoryModal = (highlightId = null) => {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById('history-modal')?.remove();

  const orders = getUserOrders(user.id);
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop active';
  modal.id = 'history-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Lịch sử đơn hàng');

  modal.innerHTML = `
    <div class="modal" style="max-width:700px;width:100%">
      <div class="modal-header">
        <span class="modal-title">📋 Lịch sử đơn hàng</span>
        <button class="modal-close" id="history-close" aria-label="Đóng">✕</button>
      </div>
      <div class="modal-body" style="max-height:75vh;overflow-y:auto">
        ${!orders.length ? `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3>Chưa có đơn hàng nào</h3>
            <p>Hãy đặt món ngay để trải nghiệm dịch vụ của chúng tôi!</p>
          </div>` :
          `<div class="order-list">
            ${orders.map(order => renderOrderCard(order, order.id === highlightId)).join('')}
          </div>`}
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.querySelector('#history-close').addEventListener('click', () => {
    modal.remove(); document.body.style.overflow = '';
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
  });

  // Toggle detail
  modal.querySelectorAll('.order-toggle-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const detailEl = modal.querySelector(`#order-detail-${btn.dataset.id}`);
      const visible = detailEl.style.display !== 'none';
      detailEl.style.display = visible ? 'none' : 'block';
      btn.textContent = visible ? 'Xem chi tiết ▾' : 'Thu gọn ▴';
    });
  });

  if (highlightId) {
    setTimeout(() => {
      modal.querySelector(`[data-order="${highlightId}"]`)?.scrollIntoView({ block: 'center' });
    }, 100);
  }
};

const renderOrderCard = (order, highlight = false) => {
  const status = STATUS_MAP[order.status] || STATUS_MAP.confirmed;
  return `
    <div class="order-card${highlight ? ' ' : ''}" data-order="${order.id}" ${highlight ? 'style="border-color:var(--color-primary-400);box-shadow:0 0 0 2px var(--color-primary-200)"' : ''}>
      <div class="order-card-header">
        <div>
          <div class="order-id" style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-text)">🧾 ${order.id}</div>
          <div class="order-date">${formatDate(order.createdAt)}</div>
        </div>
        <span class="badge ${status.class}">${status.label}</span>
      </div>
      <div class="order-card-body">
        <div style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin-bottom:var(--space-2)">
          📍 ${order.address || 'Tại quán'} &nbsp;|&nbsp; ${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
        </div>
        <div class="order-items-preview">
          ${order.items.slice(0, 4).map(item => `
            <div class="order-item-thumb" title="${item.name} x${item.qty}">
              <div style="width:40px;height:40px;background:var(--color-beige-100);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🍽️</div>
            </div>`).join('')}
          ${order.items.length > 4 ? `<div style="width:40px;height:40px;background:var(--color-beige-100);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:var(--font-size-xs);font-weight:700;color:var(--color-text-muted)">+${order.items.length - 4}</div>` : ''}
        </div>
        <!-- Detail (collapsible) -->
        <div id="order-detail-${order.id}" style="display:${highlight ? 'block' : 'none'};margin-top:var(--space-3);padding:var(--space-3);background:var(--color-beige-50);border-radius:var(--radius-md)">
          <table style="width:100%;font-size:var(--font-size-xs);border-collapse:collapse">
            <thead>
              <tr style="text-align:left;color:var(--color-text-muted);border-bottom:1px solid var(--color-border)">
                <th style="padding:4px 0">Món</th><th style="text-align:center">SL</th><th style="text-align:right">Giá</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr style="border-bottom:1px solid var(--color-beige-100)">
                  <td style="padding:6px 0">${item.name}${item.note ? ` <span style="color:var(--color-text-muted)">(${item.note})</span>` : ''}</td>
                  <td style="text-align:center">x${item.qty}</td>
                  <td style="text-align:right;font-weight:600">${formatPrice(item.price * item.qty)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${order.discount ? `<div style="text-align:right;font-size:var(--font-size-xs);color:var(--color-success);margin-top:4px">Voucher: -${formatPrice(order.discount)}</div>` : ''}
          ${order.note ? `<div style="margin-top:var(--space-2);font-size:var(--font-size-xs);color:var(--color-text-muted)">📝 ${order.note}</div>` : ''}
        </div>
      </div>
      <div class="order-card-footer">
        <button class="btn btn-ghost btn-sm order-toggle-detail" data-id="${order.id}" style="font-size:var(--font-size-xs);padding:4px 10px">
          ${highlight ? 'Thu gọn ▴' : 'Xem chi tiết ▾'}
        </button>
        <div class="order-total">${formatPrice(order.total)}</div>
      </div>
    </div>`;
};
