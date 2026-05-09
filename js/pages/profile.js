/**
 * profile.js - User profile & points modal
 */
import { getCurrentUser, updateUser, formatPrice } from '../modules/store.js';
import { toast } from '../modules/toast.js';
import { updateNavbarUser } from '../modules/navbar.js';

export const showProfileModal = () => {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById('profile-modal')?.remove();

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop active';
  modal.id = 'profile-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Thông tin cá nhân');

  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <span class="modal-title">👤 Thông tin cá nhân</span>
        <button class="modal-close" id="profile-modal-close" aria-label="Đóng">✕</button>
      </div>
      <div class="modal-body">
        <!-- Avatar section -->
        <div style="text-align:center;margin-bottom:var(--space-6)">
          <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary-400),var(--color-primary-600));display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:700;color:white;margin:0 auto var(--space-3);box-shadow:var(--shadow-primary)">
            ${user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : initials}
          </div>
          <div style="font-weight:700;font-size:var(--font-size-lg)">${user.name}</div>
          <div style="font-size:var(--font-size-sm);color:var(--color-text-muted)">${user.email}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;margin-top:var(--space-2);padding:4px 12px;background:var(--color-accent-100);border-radius:var(--radius-full);font-size:var(--font-size-xs);font-weight:700;color:var(--color-accent-500)">
            ⭐ ${user.points || 0} điểm tích lũy
          </div>
        </div>
        <!-- Edit form -->
        <form id="profile-form" novalidate>
          <div class="reservation-grid">
            <div class="form-group">
              <label class="form-label" for="pf-name">Họ và tên</label>
              <input class="form-control" type="text" id="pf-name" value="${user.name}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="pf-phone">Số điện thoại</label>
              <input class="form-control" type="tel" id="pf-phone" value="${user.phone || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-address">Địa chỉ mặc định</label>
            <input class="form-control" type="text" id="pf-address" value="${user.address || ''}" placeholder="Địa chỉ nhận hàng thường dùng">
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-avatar">Link ảnh đại diện (URL)</label>
            <input class="form-control" type="url" id="pf-avatar" value="${user.avatar || ''}" placeholder="https://...">
          </div>
          <div class="divider"></div>
          <div class="form-group">
            <label class="form-label" for="pf-newpass">Đổi mật khẩu mới (để trống nếu không đổi)</label>
            <input class="form-control" type="password" id="pf-newpass" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)">
          </div>
          <div id="profile-error" class="form-error" style="display:none;margin-bottom:var(--space-3)"></div>
          <button type="submit" class="btn btn-primary btn-block">💾 Lưu thay đổi</button>
        </form>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.querySelector('#profile-modal-close').addEventListener('click', () => { modal.remove(); document.body.style.overflow = ''; });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; } });

  modal.querySelector('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const errEl = modal.querySelector('#profile-error');
    const name = document.getElementById('pf-name').value.trim();
    const phone = document.getElementById('pf-phone').value.trim();
    const address = document.getElementById('pf-address').value.trim();
    const avatar = document.getElementById('pf-avatar').value.trim();
    const newPass = document.getElementById('pf-newpass').value;

    if (!name) { errEl.innerHTML = '⚠️ Tên không được để trống.'; errEl.style.display = 'flex'; return; }
    if (newPass && newPass.length < 6) { errEl.innerHTML = '⚠️ Mật khẩu mới phải có ít nhất 6 ký tự.'; errEl.style.display = 'flex'; return; }
    errEl.style.display = 'none';

    const updates = { name, phone, address, avatar };
    if (newPass) updates.password = newPass;
    updateUser(updates);
    updateNavbarUser();
    toast.success('Cập nhật thông tin thành công!');
    modal.remove();
    document.body.style.overflow = '';
  });
};

export const showPointsModal = () => {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById('points-modal')?.remove();

  const points = user.points || 0;
  const valueInVND = points * 1000;

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop active';
  modal.id = 'points-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">⭐ Điểm tích lũy</span>
        <button class="modal-close" id="pts-close" aria-label="Đóng">✕</button>
      </div>
      <div class="modal-body">
        <div class="points-card" style="margin-bottom:var(--space-6)">
          <div class="points-label">Điểm tích lũy hiện tại</div>
          <div><span class="points-value">${points.toLocaleString('vi-VN')}</span><span class="points-unit">điểm</span></div>
          <div class="points-earn">Tương đương ${formatPrice(valueInVND)} • Tích 1 điểm mỗi 10.000đ chi tiêu</div>
        </div>
        <div style="background:var(--color-beige-50);border-radius:var(--radius-lg);padding:var(--space-4);font-size:var(--font-size-sm)">
          <div style="font-weight:700;color:var(--color-primary-800);margin-bottom:var(--space-3)">📋 Cách tích điểm</div>
          <ul style="list-style:disc;padding-left:1.2rem;display:flex;flex-direction:column;gap:var(--space-2);color:var(--color-text-muted)">
            <li>Đặt hàng trực tuyến — tích 1 điểm mỗi 10.000đ</li>
            <li>Điểm có thể dùng để đổi voucher giảm giá</li>
            <li>1.000 điểm = 1 voucher giảm 10.000đ</li>
          </ul>
        </div>
        <div style="margin-top:var(--space-4);text-align:center">
          <button class="btn btn-primary" id="pts-close-btn">Đóng</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  const close = () => { modal.remove(); document.body.style.overflow = ''; };
  modal.querySelector('#pts-close').addEventListener('click', close);
  modal.querySelector('#pts-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
};
