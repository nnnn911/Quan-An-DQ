import { initNavbar, updateCartBadge } from "./modules/navbar.js";
import { toast } from "./modules/toast.js";
import { renderFooter } from "./modules/footer.js";
import { createReservation } from "./modules/store.js";

const renderPreorderSection = () => {
  const section = document.createElement("section");
  section.id = "reservation-section";
  section.className = "reservation-section";
  section.setAttribute("aria-label", "Đặt gà trước");
  section.innerHTML = `
    <div class="container">
      <div style="text-align:center;margin-bottom:var(--space-6)">
        <h1 class="section-title" style="font-size:var(--font-size-3xl)">Đặt Gà Trước</h1>
        <p class="section-subtitle" style="margin-top:var(--space-5)">
          Đặt gà/vịt nguyên con trước để chúng tôi chuẩn bị chu đáo nhất.
        </p>
      </div>
      <div class="reservation-form-card">
        <form id="reservation-form" novalidate>
          <div class="reservation-grid">
            <div class="form-group">
              <label class="form-label" for="res-name">Họ và tên *</label>
              <input class="form-control" type="text" id="res-name" placeholder="Nguyễn Văn A" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="res-phone">Số điện thoại *</label>
              <input class="form-control" type="tel" id="res-phone" placeholder="0901234567" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="res-type">Loại *</label>
              <select class="form-control" id="res-type" required>
                <option value="">-- Chọn loại --</option>
                <option value="ga-nguyen-con">Gà nguyên con</option>
                <option value="vit-nguyen-con">Vịt nguyên con</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="res-date">Ngày cần *</label>
              <input class="form-control" type="text" id="res-date" inputmode="numeric" placeholder="dd/mm/yyyy" autocomplete="off" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="res-note">Ghi chú thêm</label>
            <input class="form-control" type="text" id="res-note" placeholder="Ví dụ: Làm sạch, chặt sẵn, ghi chú cúng lễ..." maxlength="120">
          </div>
          <div id="res-error" class="form-error" style="display:none;margin-bottom:var(--space-4)"></div>
          <div id="res-success" style="display:none;padding:var(--space-4);background:var(--color-primary-50);border:1px solid var(--color-primary-200);border-radius:var(--radius-lg);color:var(--color-primary-700);font-size:var(--font-size-sm);margin-bottom:var(--space-4)"></div>
          <div style="display:flex;justify-content:center">
            <button type="submit" class="btn btn-primary btn-lg" id="btn-reserve" style="min-width:240px">
              Gửi yêu cầu đặt trước
            </button>
          </div>
        </form>
      </div>
    </div>`;

  document.querySelector(".page-content")?.appendChild(section);

  const dateInput = document.getElementById("res-date");

  const parseDateVi = (value) => {
    const v = (value || "").trim();
    const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    d.setHours(0, 0, 0, 0);
    const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { date: d, iso };
  };

  const getTomorrowLocal = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + 1);
    return t;
  };

  document.getElementById("reservation-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const errEl = document.getElementById("res-error");
    const successEl = document.getElementById("res-success");

    const name = document.getElementById("res-name").value.trim();
    const phone = document.getElementById("res-phone").value.trim();
    const type = document.getElementById("res-type").value;
    const parsed = parseDateVi(document.getElementById("res-date").value);
    const note = document.getElementById("res-note").value.trim();

    if (!name || !phone || !type || !parsed) {
      errEl.innerHTML = "Vui lòng điền đầy đủ thông tin bắt buộc.";
      errEl.style.display = "flex";
      successEl.style.display = "none";
      return;
    }

    const tomorrow = getTomorrowLocal();
    if (parsed.date < tomorrow) {
      errEl.innerHTML = "Ngày cần phải từ ngày mai trở đi.";
      errEl.style.display = "flex";
      successEl.style.display = "none";
      return;
    }

    errEl.style.display = "none";

    createReservation({
      name,
      phone,
      type,
      date: parsed.iso,
      note,
    });

    successEl.innerHTML = `Đã ghi nhận yêu cầu đặt <strong>${type === "ga-nguyen-con" ? "gà" : "vịt"}</strong> cho ngày <strong>${parsed.date.toLocaleDateString("vi-VN")}</strong>. Chúng tôi sẽ liên hệ xác nhận sớm!`;
    successEl.style.display = "block";
    document.getElementById("reservation-form").reset();

    toast.success("Đã gửi yêu cầu đặt trước!");
  });
};

const init = () => {
  initNavbar();
  document.body.classList.add('page-preorder');
  renderPreorderSection();
  renderFooter();
  updateCartBadge();
  window.addEventListener("user:loggedin", () => updateCartBadge());
};

document.addEventListener("DOMContentLoaded", init);
