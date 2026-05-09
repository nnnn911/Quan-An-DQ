/**
 * auth.js - Authentication modal (login/register)
 */
import { loginUser, registerUser, getCurrentUser, saveCurrentUser } from './store.js';
import { toast } from './toast.js';
import { updateNavbarUser } from './navbar.js';

let modalEl = null;

export const openAuthModal = (defaultTab = 'login') => {
  if (!modalEl) createModal();
  modalEl.classList.add('active');
  document.body.style.overflow = 'hidden';
  switchTab(defaultTab);
};

export const closeAuthModal = () => {
  modalEl?.classList.remove('active');
  document.body.style.overflow = '';
};

const createModal = () => {
  modalEl = document.createElement('div');
  modalEl.className = 'modal-backdrop auth-modal';
  modalEl.id = 'auth-modal';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', 'Đăng nhập');

  modalEl.innerHTML = `
    <div class="modal" role="document">
      <div class="modal-body" style="padding:var(--space-8)">
        <div class="auth-logo">
          <div class="auth-logo-icon" aria-hidden="true">🐔</div>
          <div class="auth-logo-title">Quán Ăn Đồng Quê</div>
          <div class="auth-logo-sub">Đăng nhập để đặt hàng và tích điểm</div>
        </div>

        <!-- Login Form -->
        <form class="auth-form active" id="form-login" novalidate>
          <div class="form-group">
            <label class="form-label" for="login-email">Email</label>
            <div class="input-group">
              <span class="input-icon" aria-hidden="true">✉️</span>
              <input class="form-control" type="email" id="login-email" name="email" placeholder="email@example.com" autocomplete="email" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Mật khẩu</label>
            <div class="input-group">
              <span class="input-icon" aria-hidden="true">🔒</span>
              <input class="form-control" type="password" id="login-password" name="password" placeholder="••••••••" autocomplete="current-password" required>
              <span class="input-icon-right" id="toggle-login-pw" role="button" aria-label="Hiện mật khẩu" title="Hiện/ẩn mật khẩu">👁️</span>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:8px">
              <button type="button" id="btn-forgot-password" style="background:none;border:none;color:var(--color-primary-600);font-weight:600;font-size:var(--font-size-xs);cursor:pointer;font-family:inherit">
                Quên mật khẩu?
              </button>
            </div>
          </div>
          <div id="login-error" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-login-submit">Đăng nhập</button>
          <p style="text-align:center;margin-top:var(--space-4);font-size:var(--font-size-sm);color:var(--color-text-muted)">
            Chưa có tài khoản? <button type="button" class="auth-switch" data-tab="register" style="color:var(--color-primary-600);font-weight:600;background:none;border:none;cursor:pointer;font-family:inherit">Đăng ký ngay</button>
          </p>
        </form>

        <!-- Register Form -->
        <form class="auth-form" id="form-register" novalidate>
          <div class="form-group">
            <label class="form-label" for="reg-name">Họ và tên</label>
            <div class="input-group">
              <span class="input-icon" aria-hidden="true">👤</span>
              <input class="form-control" type="text" id="reg-name" name="name" placeholder="Nguyễn Văn A" autocomplete="name" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-email">Email</label>
            <div class="input-group">
              <span class="input-icon" aria-hidden="true">✉️</span>
              <input class="form-control" type="email" id="reg-email" name="email" placeholder="email@example.com" autocomplete="email" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-phone">Số điện thoại</label>
            <div class="input-group">
              <span class="input-icon" aria-hidden="true">📱</span>
              <input class="form-control" type="tel" id="reg-phone" name="phone" placeholder="0901234567" autocomplete="tel">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">Mật khẩu</label>
            <div class="input-group">
              <span class="input-icon" aria-hidden="true">🔒</span>
              <input class="form-control" type="password" id="reg-password" name="password" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password" required>
              <span class="input-icon-right" id="toggle-reg-pw" role="button" aria-label="Hiện mật khẩu" title="Hiện/ẩn mật khẩu">👁️</span>
            </div>
          </div>
          <div id="reg-error" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-register-submit">Tạo tài khoản</button>
          <p style="text-align:center;margin-top:var(--space-4);font-size:var(--font-size-sm);color:var(--color-text-muted)">
            Đã có tài khoản? <button type="button" class="auth-switch" data-tab="login" style="color:var(--color-primary-600);font-weight:600;background:none;border:none;cursor:pointer;font-family:inherit">Đăng nhập</button>
          </p>
        </form>
      </div>
    </div>`;

  document.body.appendChild(modalEl);
  bindAuthEvents();
};

const switchTab = (tab) => {
  document.querySelectorAll('.auth-tab').forEach(t => {
    const isActive = t.id === `tab-${tab}`;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
  });
  document.querySelectorAll('.auth-form').forEach(f => {
    f.classList.toggle('active', f.id === `form-${tab}`);
  });
};

const bindAuthEvents = () => {
  // Close on backdrop click
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeAuthModal(); });

  modalEl.querySelectorAll('.auth-switch').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Toggle password
  const togglePw = (toggleId, inputId) => {
    document.getElementById(toggleId)?.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  };
  togglePw('toggle-login-pw', 'login-password');
  togglePw('toggle-reg-pw', 'reg-password');

  // Forgot password (placeholder)
  document.getElementById('btn-forgot-password')?.addEventListener('click', () => {
    toast.info('Tính năng đang phát triển');
  });

  // Login submit
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    if (!email || !pass) { showError(errEl, 'Vui lòng nhập đầy đủ thông tin.'); return; }
    const result = loginUser(email, pass);
    if (!result.ok) { showError(errEl, result.msg); return; }
    toast.success(`Chào mừng, ${result.user.name}! 🎉`);
    updateNavbarUser();
    closeAuthModal();
    // Trigger custom event for pages to respond
    window.dispatchEvent(new CustomEvent('user:loggedin', { detail: result.user }));
  });

  // Register submit
  document.getElementById('form-register').addEventListener('submit', (e) => {
    e.preventDefault();
    const errEl = document.getElementById('reg-error');
    errEl.style.display = 'none';
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-password').value;
    if (!name || !email || !pass) { showError(errEl, 'Vui lòng nhập đầy đủ thông tin bắt buộc.'); return; }
    if (pass.length < 6) { showError(errEl, 'Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { showError(errEl, 'Email không hợp lệ.'); return; }
    const result = registerUser({ name, email, phone, password: pass });
    if (!result.ok) { showError(errEl, result.msg); return; }
    // Auto login after register
    loginUser(email, pass);
    toast.success('Đăng ký thành công! Chào mừng bạn 🎉');
    updateNavbarUser();
    closeAuthModal();
    window.dispatchEvent(new CustomEvent('user:loggedin', { detail: result.user }));
  });
};

const showError = (el, msg) => {
  el.innerHTML = `<span>⚠️</span> ${msg}`;
  el.style.display = 'flex';
};
