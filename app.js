const CONFIG = window.MEJU_CONFIG || {};
const API_URL = CONFIG.API_URL || "";
const LINE_OA_ID = CONFIG.LINE_OA_ID || "@703ocmqz";

const phoneInput = document.getElementById("phoneNumber");
const searchButton = document.getElementById("searchButton");
const results = document.getElementById("results");
const toast = document.getElementById("toast");

const STATUS_STEPS = [
  "ยืนยันคำสั่งซื้อ",
  "ร้านค้าส่งแล้ว",
  "ถึงโกดังจีน",
  "กำลังขนส่งมาไทย",
  "สินค้าถึงไทย",
  "ออกจัดส่ง"
];

const STATUS_ICONS = {
  "ยืนยันคำสั่งซื้อ": "🛒",
  "ร้านค้าส่งแล้ว": "📦",
  "ถึงโกดังจีน": "🏢",
  "กำลังขนส่งมาไทย": "✈️",
  "สินค้าถึงไทย": "🇹🇭",
  "ออกจัดส่ง": "🚚"
};

const STATUS_CLASSES = {
  "ยืนยันคำสั่งซื้อ": "status-confirmed",
  "ร้านค้าส่งแล้ว": "status-shipped",
  "ถึงโกดังจีน": "status-warehouse",
  "กำลังขนส่งมาไทย": "status-transit",
  "สินค้าถึงไทย": "status-thailand",
  "ออกจัดส่ง": "status-dispatch"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/\D/g, "");

  if (phone.length === 11 && phone.startsWith("66")) {
    phone = "0" + phone.slice(2);
  }

  if (phone.length === 9) {
    phone = "0" + phone;
  }

  return phone;
}

function normalizeStatus(value) {
  const status = String(value || "").trim();

  if (status === "ถึงไทยแล้ว") {
    return "สินค้าถึงไทย";
  }

  if (status === "จัดส่งสำเร็จ") {
    return "ออกจัดส่ง";
  }

  return status;
}

function statusClass(status) {
  const cleanStatus = normalizeStatus(status);
  return STATUS_CLASSES[cleanStatus] || "status-special";
}

function statusIcon(status) {
  const cleanStatus = normalizeStatus(status);
  return STATUS_ICONS[cleanStatus] || "•";
}

function hasTracking(value) {
  const tracking = String(value || "").trim();

  return Boolean(
    tracking &&
    tracking !== "-" &&
    tracking !== "ไม่มี" &&
    tracking !== "ยังไม่มี"
  );
}

function getPaymentText(value) {
  const payment = String(value || "").trim();

  if (payment === "ชำระเต็มจำนวน") {
    return "ชำระเต็มแล้ว ✓";
  }

  if (payment === "มัดจำ") {
    return "มัดจำแล้ว ✓";
  }

  return payment || "-";
}

function getOrderSummaryStatus(items) {
  if (!items.length) {
    return "-";
  }

  const statuses = items.map(item => normalizeStatus(item.effectiveStatus));
  const uniqueStatuses = [...new Set(statuses)];

  if (uniqueStatuses.length === 1) {
    const onlyStatus = uniqueStatuses[0];

    if (onlyStatus === "สินค้าถึงไทย") {
      return "สินค้าถึงไทยครบแล้ว";
    }

    if (onlyStatus === "ออกจัดส่ง") {
      return "ออกจัดส่งแล้ว";
    }

    return onlyStatus || "-";
  }

  const ranks = statuses.map(status => STATUS_STEPS.indexOf(status));
  const validRanks = ranks.filter(rank => rank >= 0);

  if (validRanks.length !== statuses.length) {
    return "มีสินค้าบางรายการต้องตรวจสอบ";
  }

  const reachedThailand = validRanks.some(rank => rank >= STATUS_STEPS.indexOf("สินค้าถึงไทย"));

  if (reachedThailand) {
    return "สินค้าทยอยถึงไทย";
  }

  return "กำลังทยอยเดินทาง";
}

function getVisibleItemLimit() {
  return window.innerWidth <= 480 ? 2 : 4;
}

function createTrackingHtml(tracking) {
  if (!hasTracking(tracking)) {
    return "";
  }

  const safeTracking = escapeHtml(tracking);

  return `
    <span class="item-tracking">
      Tracking: ${safeTracking}
      <button
        type="button"
        class="copy-tracking"
        data-tracking="${safeTracking}"
      >
        คัดลอก
      </button>
    </span>
  `;
}

function createItemsList(items) {
  const rows = items.map(item => {
    const status = normalizeStatus(item.effectiveStatus);

    return `
      <div class="item-row">
        <div class="item-main-row">
          <div class="item-name">${escapeHtml(item.productName || "ไม่ระบุชื่อสินค้า")}</div>
          <div class="item-qty">× ${Number(item.qty) || 1}</div>
        </div>

        <div class="item-sub-row">
          <span class="item-status ${statusClass(status)}">
            <span>${statusIcon(status)}</span>
            <span>${escapeHtml(status || "-")}</span>
          </span>

          ${createTrackingHtml(item.effectiveTracking)}
        </div>
      </div>
    `;
  }).join("");

  const toggle = items.length > 2
    ? `
      <button
        type="button"
        class="items-toggle"
        data-total="${items.length}"
      >
        <span class="items-toggle-text"></span>
        <span class="items-toggle-arrow">↓</span>
      </button>
    `
    : "";

  return `
    <div class="items-section">
      <div class="items-title">รายการสินค้า</div>
      <div class="items-list">
        ${rows}
      </div>
      ${toggle}
    </div>
  `;
}

function getLineUrl(orderId) {
  const message = `สวัสดีค่ะ ต้องการสอบถามเกี่ยวกับออเดอร์ #${orderId || "ไม่ระบุ"}`;

  return (
    `https://line.me/R/oaMessage/${LINE_OA_ID}/?` +
    encodeURIComponent(message)
  );
}

function createOrderCard(order, index) {
  const items = Array.isArray(order.items) ? order.items : [];
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const summaryStatus = getOrderSummaryStatus(items);

  return `
    <article class="order-card ${index === 0 ? "latest-order" : ""}">
      <div class="order-top">
        <div class="order-main">
          <div class="order-title-row">
            <div class="order-title">
              คำสั่งซื้อ #${escapeHtml(order.orderId || "-")}
            </div>
            ${index === 0 ? '<span class="latest-badge">ออเดอร์ล่าสุด</span>' : ""}
          </div>

          <div class="order-meta">
            ${items.length} รายการ · รวม ${totalQty} ชิ้น
          </div>
        </div>

        <div class="update-box">
          <div class="update-label">อัปเดตล่าสุด</div>
          <div class="update-date">${escapeHtml(order.updateDate || "-")}</div>
        </div>
      </div>

      <div class="order-overview">
        <div class="overview-box">
          <div class="overview-label">สถานะรวม</div>
          <div class="overview-value">${escapeHtml(summaryStatus)}</div>
        </div>

        <div class="overview-box">
          <div class="overview-label">การชำระเงิน</div>
          <div class="overview-value">${escapeHtml(getPaymentText(order.payment))}</div>
        </div>
      </div>

      ${createItemsList(items)}

      ${
        order.remark
          ? `
            <div class="order-overview">
              <div class="overview-box" style="grid-column: 1 / -1;">
                <div class="overview-label">หมายเหตุ</div>
                <div class="overview-value">${escapeHtml(order.remark)}</div>
              </div>
            </div>
          `
          : ""
      }

      <div class="order-actions">
        <a
          class="line-contact-button"
          href="${getLineUrl(order.orderId)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          สอบถามเกี่ยวกับออเดอร์นี้
        </a>
      </div>
    </article>
  `;
}

function updateItemsToggle(button) {
  const card = button.closest(".order-card");
  const list = card?.querySelector(".items-list");
  const text = button.querySelector(".items-toggle-text");
  const arrow = button.querySelector(".items-toggle-arrow");

  if (!list || !text || !arrow) {
    return;
  }

  const total = Number(button.dataset.total || 0);
  const isOpen = list.classList.contains("is-open");

  if (isOpen) {
    text.textContent = "ซ่อนรายการสินค้า";
    arrow.textContent = "↑";
    return;
  }

  const hidden = Math.max(total - getVisibleItemLimit(), 0);
  text.textContent = `ดูสินค้าเพิ่มเติมอีก ${hidden} รายการ`;
  arrow.textContent = "↓";
}

function refreshItemButtons() {
  results.querySelectorAll(".items-toggle").forEach(updateItemsToggle);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function showLoading() {
  results.innerHTML = `
    <div class="loading-box">
      <div class="loading-spinner"></div>
      <div class="loading-text">กำลังค้นหาข้อมูล...</div>
    </div>
  `;
}

function showNotFound() {
  results.innerHTML = `
    <div class="not-found">
      <div class="not-found-title">ไม่พบข้อมูล</div>
      <div class="not-found-text">ไม่พบคำสั่งซื้อจากเบอร์โทรศัพท์นี้</div>
    </div>
  `;
}

function showError(error) {
  console.error(error);

  results.innerHTML = `
    <div class="error-box">
      <div class="error-title">เกิดข้อผิดพลาด</div>
      <div class="error-text">ไม่สามารถเชื่อมต่อระบบได้</div>
      <div class="error-detail">${escapeHtml(error.message || "Unknown error")}</div>
    </div>
  `;
}

async function searchOrder() {
  const rawPhone = phoneInput.value.trim();

  if (!rawPhone) {
    alert("กรุณากรอกเบอร์โทรศัพท์");
    phoneInput.focus();
    return;
  }

  const phone = normalizePhone(rawPhone);

  if (phone.length < 9 || phone.length > 10) {
    alert("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
    phoneInput.focus();
    return;
  }

  if (!API_URL || API_URL.includes("วาง_URL")) {
    showError(new Error("ยังไม่ได้ตั้งค่า API_URL ใน config.js"));
    return;
  }

  showLoading();
  searchButton.disabled = true;
  searchButton.textContent = "กำลังค้นหา...";

  try {
    const requestUrl =
      `${API_URL}?action=search&phone=${encodeURIComponent(phone)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      cache: "no-store"
    });

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(data.message || "รูปแบบข้อมูลไม่ถูกต้อง");
    }

    if (!data.length) {
      showNotFound();
      return;
    }

    results.innerHTML = data.map(createOrderCard).join("");
    refreshItemButtons();
  } catch (error) {
    showError(error);
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "ค้นหา";
  }
}

searchButton.addEventListener("click", searchOrder);

phoneInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    searchOrder();
  }
});

results.addEventListener("click", async event => {
  const itemsButton = event.target.closest(".items-toggle");

  if (itemsButton) {
    const list = itemsButton.closest(".order-card")?.querySelector(".items-list");

    if (list) {
      list.classList.toggle("is-open");
      updateItemsToggle(itemsButton);
    }

    return;
  }

  const copyButton = event.target.closest(".copy-tracking");

  if (copyButton) {
    await copyText(copyButton.dataset.tracking || "");
    showToast("คัดลอก Tracking แล้ว ✓");
  }
});

window.addEventListener("resize", refreshItemButtons);
