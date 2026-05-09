/**
 * navbar.js - Sticky navbar with profile dropdown & mobile drawer
 */
import { getCurrentUser, clearCurrentUser, getCartCount } from './store.js';
import { openAuthModal } from './auth.js';
import { openCart } from './cart.js';
import { scrollToElementWithOffset } from './scroll.js';

const NAV_ITEMS = [
  { id: 'order',    label: 'Đặt đồ ăn', href: 'index.html#menu' },
  { id: 'preorder', label: 'Đặt gà trước', href: 'preorder.html' },
  { id: 'about',    label: 'About us', href: 'about.html' },
];

let activeNav = null;

export const initNavbar = (options = {}) => {
  renderNavbar();
  bindNavbarEvents();
};

export const setActiveNav = (navId) => {
  activeNav = navId;
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === navId);
  });
};

export const updateCartBadge = () => {
  const count = getCartCount();
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
};

const updateCartVisibility = () => {
  const user = getCurrentUser();
  const cartBtn = document.getElementById('cart-btn');
  if (!cartBtn) return;
  cartBtn.style.display = user ? 'flex' : 'none';
};

export const updateNavbarUser = () => {
  const user = getCurrentUser();
  const rightArea = document.getElementById('navbar-user-area');
  const mobileUserArea = document.getElementById('mobile-user-area');
  if (!rightArea) return;

  updateCartVisibility();
  if (user) {
    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    rightArea.innerHTML = `
      <div class="dropdown-wrapper">
        <button class="profile-btn" id="profile-btn" aria-label="Tài khoản">
          <div class="profile-avatar" id="nav-avatar">${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : initials}</div>
          <span class="profile-name">${user.name.split(' ').pop()}</span>
          <span class="profile-chevron">▼</span>
        </button>
        <div class="profile-dropdown" id="profile-dropdown">
          <div class="dropdown-header">
            <div class="dropdown-avatar" id="dropdown-avatar">${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : initials}</div>
            <div>
              <div class="dropdown-user-name">${user.name}</div>
              <div class="dropdown-user-email">${user.email}</div>
              <div class="dropdown-user-points">⭐ ${user.points || 0} điểm tích lũy</div>
            </div>
          </div>
          <div class="dropdown-menu">
            <button class="dropdown-item" id="btn-profile-page">
              <div class="dropdown-item-icon">👤</div> Thông tin cá nhân
            </button>
            <button class="dropdown-item" id="btn-order-history">
              <div class="dropdown-item-icon">📋</div> Lịch sử đơn hàng
            </button>
            <button class="dropdown-item" id="btn-my-points">
              <div class="dropdown-item-icon">⭐</div> Điểm tích lũy
            </button>
            <div class="dropdown-separator"></div>
            <button class="dropdown-item logout" id="btn-logout">
              <div class="dropdown-item-icon">🚪</div> Đăng xuất
            </button>
          </div>
        </div>
      </div>`;
    bindUserDropdown();

    if (mobileUserArea) {
      mobileUserArea.innerHTML = `
        <div class="mobile-user-header">
          <div class="profile-avatar">${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : initials}</div>
          <div class="mobile-user-meta">
            <div class="mobile-user-name">${user.name}</div>
            <div class="mobile-user-email">${user.email}</div>
          </div>
        </div>
        <div class="mobile-user-actions">
          <button class="mobile-user-action" id="m-btn-profile">👤 Thông tin cá nhân</button>
          <button class="mobile-user-action" id="m-btn-history">📋 Lịch sử đơn hàng</button>
          <button class="mobile-user-action mobile-logout" id="m-btn-logout">🚪 Đăng xuất</button>
        </div>
      `;

      document.getElementById('m-btn-profile')?.addEventListener('click', () => {
        closeMobileNav();
        import('../pages/profile.js').then(m => m.showProfileModal());
      });
      document.getElementById('m-btn-history')?.addEventListener('click', () => {
        closeMobileNav();
        import('../pages/history.js').then(m => m.showHistoryModal());
      });
      document.getElementById('m-btn-logout')?.addEventListener('click', () => {
        clearCurrentUser();
        updateNavbarUser();
        closeMobileNav();
        import('./toast.js').then(m => m.toast.success('Đã đăng xuất thành công.'));
        window.location.reload();
      });
    }
  } else {
    rightArea.innerHTML = `<button class="login-btn" id="btn-login-nav">Đăng nhập</button>`;
    document.getElementById('btn-login-nav').onclick = () => openAuthModal('login');

    if (mobileUserArea) {
      mobileUserArea.innerHTML = `
        <button class="btn btn-primary btn-block" id="m-btn-login" style="width:100%">Đăng nhập</button>
      `;
      document.getElementById('m-btn-login')?.addEventListener('click', () => {
        closeMobileNav();
        openAuthModal('login');
      });
    }
  }
};

const renderNavbar = () => {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'navbar';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Thanh điều hướng chính');

  const navLinks = NAV_ITEMS.map(i => `
    <a class="nav-link" data-nav="${i.id}" href="${i.href}" aria-label="${i.label}">${i.label}</a>
  `).join('');

  nav.innerHTML = `
    <div class="navbar-inner">
      <button class="hamburger-btn" id="hamburger-btn" aria-label="Mở menu" aria-expanded="false">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
      <a href="#" class="navbar-logo" id="navbar-logo" aria-label="Quán Ăn Đồng Quê - Trang chủ">
        <div class="navbar-logo-icon" aria-hidden="true">🐔</div>
        <div class="navbar-logo-text">
          <span class="navbar-logo-name">Đồng Quê</span>
          <span class="navbar-logo-tagline">Quán Gà & Vịt</span>
        </div>
      </a>
      <div class="navbar-nav" role="menubar" aria-label="Điều hướng">${navLinks}</div>
      <div class="navbar-actions">
        <button class="cart-btn" id="cart-btn" aria-label="Giỏ hàng">
          🛒
          <span class="cart-badge" id="cart-badge" style="display:none">0</span>
        </button>
        <div id="navbar-user-area"></div>
      </div>
    </div>`;

  document.body.prepend(nav);

  // Mobile drawer
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'mobile-nav-overlay';

  const mobileNav = document.createElement('aside');
  mobileNav.className = 'mobile-nav';
  mobileNav.id = 'mobile-nav';
  mobileNav.setAttribute('aria-label', 'Menu điều hướng mobile');

  const mobileNavLinks = NAV_ITEMS.map(i => `
    <a class="mobile-nav-link" data-nav="${i.id}" href="${i.href}">${i.label}</a>
  `).join('');

  mobileNav.innerHTML = `
    <div class="mobile-nav-inner">
      <div class="mobile-user" id="mobile-user-area"></div>
      <div class="mobile-nav-sep" role="separator" aria-hidden="true"></div>
      <nav class="mobile-nav-links" aria-label="Danh mục">
        ${mobileNavLinks}
      </nav>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(mobileNav);

  updateNavbarUser();
  updateCartBadge();
  updateCartVisibility();

  // set active item based on current page
  const path = window.location.pathname.split('/').pop() || 'index.html';
  if (path === 'preorder.html') setActiveNav('preorder');
  else if (path === 'about.html') setActiveNav('about');
  else setActiveNav('order');
};

const bindNavbarEvents = () => {
  // Scroll effect
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Mobile overlay click
  document.getElementById('mobile-nav-overlay')?.addEventListener('click', closeMobileNav);

  // Nav links active state (no SPA routing here)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-nav]');
    if (!link) return;
    const navId = link.dataset.nav;
    setActiveNav(navId);

    if (navId === 'order') {
      const menuSection = document.getElementById('menu-section');
      if (menuSection) {
        e.preventDefault();
        closeMobileNav();
        window.location.hash = 'menu';
        scrollToElementWithOffset(menuSection, { behavior: 'smooth' });
        return;
      }
    }

    closeMobileNav();
  });

  // Hamburger
  document.getElementById('hamburger-btn')?.addEventListener('click', toggleMobileNav);

  // Cart
  document.getElementById('cart-btn')?.addEventListener('click', () => {
    if (!getCurrentUser()) {
      openAuthModal('login');
      import('./toast.js').then(m => m.toast.info('Vui lòng đăng nhập để xem giỏ hàng.'));
      return;
    }
    openCart();
  });

  // Logo → home
  document.getElementById('navbar-logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    const isHome = !!document.getElementById('hero');
    if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' });
    else window.location.href = 'index.html';
  });

  // Close mobile nav on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileNav();
  });
};

const bindUserDropdown = () => {
  const btn = document.getElementById('profile-btn');
  const dropdown = document.getElementById('profile-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-wrapper')) {
      dropdown.classList.remove('open');
      btn?.classList.remove('open');
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    clearCurrentUser();
    updateNavbarUser();
    import('./toast.js').then(m => m.toast.success('Đã đăng xuất thành công.'));
    dropdown.classList.remove('open');
    window.location.reload();
  });

  document.getElementById('btn-order-history')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    document.getElementById('section-history')?.scrollIntoView({ behavior: 'smooth' });
    if (!getCurrentUser()) { import('./auth.js').then(m => m.openAuthModal()); return; }
    import('../pages/history.js').then(m => m.showHistoryModal());
  });

  document.getElementById('btn-profile-page')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    import('../pages/profile.js').then(m => m.showProfileModal());
  });

  document.getElementById('btn-my-points')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    import('../pages/profile.js').then(m => m.showPointsModal());
  });
};

const toggleMobileNav = () => {
  const mobileNav = document.getElementById('mobile-nav');
  const overlay = document.getElementById('mobile-nav-overlay');
  const hamburger = document.getElementById('hamburger-btn');
  const open = mobileNav?.classList.toggle('open');
  hamburger?.classList.toggle('open', open);
  hamburger?.setAttribute('aria-expanded', open ? 'true' : 'false');
  overlay?.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : '';
};

const closeMobileNav = () => {
  document.getElementById('mobile-nav')?.classList.remove('open');
  document.getElementById('mobile-nav-overlay')?.classList.remove('active');
  document.getElementById('hamburger-btn')?.classList.remove('open');
  document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
};
