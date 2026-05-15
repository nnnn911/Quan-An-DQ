import { initNavbar, updateCartBadge } from '../ui/navbar.js';
import { renderFooter } from '../ui/footer.js';
import { renderRewardsPage } from '../features/customer/rewards.js';

const init = () => {
  initNavbar();
  renderRewardsPage();
  renderFooter();

  updateCartBadge();
  window.addEventListener("user:loggedin", () => {
    updateCartBadge();
    renderRewardsPage();
  });
};

document.addEventListener("DOMContentLoaded", init);
