import { initNavbar, updateCartBadge } from '../ui/navbar.js';
import { renderFooter } from '../ui/footer.js';
import { renderCheckoutPage } from '../features/customer/checkout.js';

const init = () => {
  initNavbar();
  renderCheckoutPage();
  renderFooter();

  updateCartBadge();
  window.addEventListener("user:loggedin", () => {
    updateCartBadge();
    renderCheckoutPage();
  });
};

document.addEventListener("DOMContentLoaded", init);
