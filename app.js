const CONFIG = window.MEJU_CONFIG || {};
const API_URL = CONFIG.API_URL || "";
const LINE_OA_ID = CONFIG.LINE_OA_ID || "@703ocmqz";
const toast = document.getElementById("toast");
const cartKey = "meju_whisper_cart";

let products = [];
let activeStatus = "all";

let cart = loadCart();

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function money(value) { return `฿${Number(value).toLocaleString("th-TH")}`; }
function imageUrl(value) {
  const url = String(value || "").trim();
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const driveId = driveMatch ? driveMatch[1] : url.match(/[?&]id=([^&]+)/)?.[1];
  return driveId
    ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1600`
    : url;
}
function optionList(value, fallback) {
  const values = String(value || "").split(",").map(item => item.trim()).filter(Boolean);
  return values.length ? values : fallback;
}
function loadCart() { try { return JSON.parse(localStorage.getItem(cartKey)) || []; } catch { return []; } }
function saveCart() { localStorage.setItem(cartKey, JSON.stringify(cart)); updateCartCount(); }
function showToast(message) { toast.textContent = message; toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800); }
function lineUrl(message) { return `https://line.me/R/oaMessage/${LINE_OA_ID}/?${encodeURIComponent(message)}`; }
function getProduct(id) { return products.find(product => product.id === id); }
function productUrl(id) {
  return `${location.origin}${location.pathname}#product?id=${encodeURIComponent(id)}`;
}
function isPreOrder(status) { return ["พรีออเดอร์", "Pre-order", "pre-order"].includes(String(status || "").trim()); }
function isShopProduct(product) { return ["พร้อมส่ง", "พรีออเดอร์", "Pre-order", "pre-order"].includes(String(product.status || "").trim()) && Number(product.stock ?? 1) > 0; }

function productCard(product) {
  return `<article class="product-card">
    <a class="product-image" href="#product?id=${encodeURIComponent(product.id)}" data-route="product">
      <span class="product-tag">${escapeHtml(product.status)}</span><img src="${escapeHtml(imageUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.src='';this.alt='ไม่พบรูปสินค้า'">
    </a>
    <div class="product-info"><h3>${escapeHtml(product.name)}</h3><div class="product-brand">${escapeHtml(product.brand)}</div>
      <div class="product-bottom"><span class="product-price">${money(product.price)}</span><button class="add-button" type="button" data-add="${product.id}" aria-label="เพิ่ม ${escapeHtml(product.name)}">+</button></div>
    </div>
  </article>`;
}

function renderFeatured() {
  document.getElementById("featuredProducts").innerHTML = products.filter(isShopProduct).slice(0, 4).map(productCard).join("");
}
function renderShop() {
  const query = document.getElementById("productSearch").value.trim().toLowerCase();
  const price = document.getElementById("priceFilter").value;
  const sort = document.getElementById("sortProducts").value;
  let list = products.filter(isShopProduct).filter(product => activeStatus === "all" || (activeStatus === "preorder" ? isPreOrder(product.status) : product.status === "พร้อมส่ง")).filter(product => !query || `${product.name} ${product.brand}`.toLowerCase().includes(query));
  if (price === "under1000") list = list.filter(product => product.price < 1000);
  if (price === "1000to2000") list = list.filter(product => product.price >= 1000 && product.price <= 2000);
  if (price === "over2000") list = list.filter(product => product.price > 2000);
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  document.getElementById("shopProducts").innerHTML = list.length ? list.map(productCard).join("") : '<div class="empty-state">ไม่พบสินค้าที่ตรงกับการค้นหา</div>';
}

function renderProduct(id) {
  const product = getProduct(id) || products[0];
  document.getElementById("productDetail").innerHTML = `<div class="detail-layout">
    <div class="detail-image"><img src="${escapeHtml(imageUrl(product.image))}" alt="${escapeHtml(product.name)}" onerror="this.src='';this.alt='ไม่พบรูปสินค้า'"></div>
    <div class="detail-copy"><div class="product-brand">${escapeHtml(product.brand)}</div><h1>${escapeHtml(product.name)}</h1><div class="detail-price">${money(product.price)}</div><p>${escapeHtml(product.description)}</p>
      <div class="option-title">Color</div><div class="option-buttons" data-option="color">${optionList(product.colors, ["ไม่ระบุ"]).map((color, index) => `<button class="${index === 0 ? "selected" : ""}" type="button" data-option-value="${escapeHtml(color)}">${escapeHtml(color)}</button>`).join("")}</div>
      <div class="option-title">Size</div><div class="option-buttons" data-option="size">${optionList(product.sizes, ["Free size"]).map((size, index) => `<button class="${index === 0 ? "selected" : ""}" type="button" data-option-value="${escapeHtml(size)}">${escapeHtml(size)}</button>`).join("")}</div>
      <button class="button button-dark detail-action" type="button" data-add="${product.id}" ${product.status === "สินค้าหมด" ? "disabled" : ""}>${product.status === "สินค้าหมด" ? "สินค้าหมดชั่วคราว" : "เพิ่มลงตะกร้า"} <span>＋</span></button>
      <div class="delivery-note">● ${escapeHtml(product.status)} · ${escapeHtml(product.delivery)}<br>มัดจำ 50% สำหรับสินค้าพรีออเดอร์</div>
    </div></div>`;
}

function updateCartCount() { document.getElementById("cartCount").textContent = cart.reduce((total, item) => total + item.qty, 0); }
function addToCart(id) {
  const product = getProduct(id);
  if (!product || product.status === "สินค้าหมด") return showToast("สินค้านี้หมดชั่วคราว");
  const detail = document.getElementById("productDetail");
  const color = detail?.querySelector('[data-option="color"] .selected')?.dataset.optionValue || "";
  const size = detail?.querySelector('[data-option="size"] .selected')?.dataset.optionValue || "";
  const item = cart.find(entry =>
    entry.id === id &&
    String(entry.color || "") === color &&
    String(entry.size || "") === size
  );
  if (item) item.qty += 1; else cart.push({ id, qty: 1, color, size });
  saveCart(); showToast("เพิ่มสินค้าลงตะกร้าแล้ว ✓");
}
function renderCart() {
  const items = cart.map((item, cartIndex) => ({ ...item, cartIndex, product: getProduct(item.id) })).filter(item => item.product);
  const itemsEl = document.getElementById("cartItems");
  const summaryEl = document.getElementById("cartSummary");
  if (!items.length) { itemsEl.innerHTML = '<div class="empty-state">ตะกร้ายังว่างอยู่<br><a class="text-link" href="#shop" data-route="shop">ไปเลือกสินค้ากันเลย ↗</a></div>'; summaryEl.innerHTML = ""; return; }
  itemsEl.innerHTML = items.map((item, index) => {
    const optionText = [item.color, item.size].filter(Boolean).join(" · ");
    return `<div class="cart-item"><img src="${escapeHtml(imageUrl(item.product.image))}" alt="${escapeHtml(item.product.name)}" onerror="this.src='';this.alt='ไม่พบรูปสินค้า'"><div><h3>${escapeHtml(item.product.name)}</h3><p>${escapeHtml(item.product.brand)} · ${escapeHtml(item.product.status)}${optionText ? ` · ${escapeHtml(optionText)}` : ""}</p><div class="cart-price">${money(item.product.price * item.qty)}</div><div class="quantity-control"><button type="button" data-decrease-index="${item.cartIndex}">−</button><span>${item.qty}</span><button type="button" data-increase-index="${item.cartIndex}">＋</button></div></div><button class="remove-cart" type="button" data-remove-index="${item.cartIndex}">ลบ</button></div>`;
  }).join("");
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const orderLines = items.map((item, index) => {
    const options = [item.color, item.size].filter(Boolean).join(" / ");
    return `${index + 1}. ${item.product.name}${options ? ` (${options})` : ""}\nจำนวน ${item.qty} ชิ้น\nราคา ${money(item.product.price * item.qty)}\nลิงก์สินค้า: ${productUrl(item.id)}`;
  }).join("\n\n");
  const lineMessage = `สวัสดีค่ะ สนใจสั่งซื้อสินค้า\n\n${orderLines}\n\nรวมสินค้า ${cart.reduce((sum, item) => sum + item.qty, 0)} ชิ้น\nยอดรวม ${money(total)}\nค่าจัดส่ง แจ้งภายหลัง\n\nชื่อผู้รับ: \nเบอร์โทร: \nที่อยู่จัดส่ง: `;
  summaryEl.innerHTML = `<h2>สรุปออเดอร์</h2><div class="summary-row"><span>สินค้า ${cart.reduce((sum, item) => sum + item.qty, 0)} ชิ้น</span><strong>${money(total)}</strong></div><div class="summary-row"><span>ค่าจัดส่ง</span><span>แจ้งภายหลัง</span></div><div class="summary-row summary-total"><span>ยอดประมาณการ</span><strong>${money(total)}</strong></div><a class="button button-dark" href="${lineUrl(lineMessage)}" target="_blank" rel="noopener">สั่งซื้อผ่าน LINE ↗</a><p class="delivery-note">ทีมงานจะสรุปค่าส่งและยอดมัดจำ 50% ให้ทาง LINE</p>`;
}

function route() {
  const raw = location.hash.slice(1) || "home";
  const [routeName, queryString] = raw.split("?");
  const params = new URLSearchParams(queryString || "");
  const page = ["home", "shop", "product", "cart", "orders", "faq"].includes(routeName) ? routeName : "home";
  document.querySelectorAll(".page-section").forEach(section => section.classList.toggle("active-page", section.dataset.page === page));
  document.querySelectorAll(".main-nav a").forEach(link => link.classList.toggle("active", link.dataset.route === page));
  document.querySelector(".main-nav").classList.remove("open");
  if (page === "product") renderProduct(params.get("id"));
  if (page === "cart") renderCart();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function normalizePhone(value) { let phone = String(value || "").replace(/\D/g, ""); if (phone.length === 11 && phone.startsWith("66")) phone = "0" + phone.slice(2); if (phone.length === 9) phone = "0" + phone; return phone; }
function hasTracking(value) { return value && !["-", "ไม่มี", "ยังไม่มี"].includes(String(value).trim()); }
function statusClass(status) { return { "ยืนยันคำสั่งซื้อ": "status-confirmed", "ร้านค้าส่งแล้ว": "status-shipped", "ถึงโกดังจีน": "status-warehouse", "กำลังขนส่งมาไทย": "status-transit", "สินค้าถึงไทย": "status-thailand", "ออกจัดส่ง": "status-dispatch" }[status] || "status-special"; }
function orderInquiryMessage(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemLines = items.map((item, index) => {
    return `${index + 1}. ${item.productName || "-"}\nสถานะ: ${item.effectiveStatus || "รอตรวจสอบ"}`;
  }).join("\n");

  return [
    `สวัสดีค่ะ สอบถามออเดอร์ #${order.orderId || "-"}`,
    `รายการสินค้า:\n${itemLines || "-"}`,
    `อัปเดตล่าสุด: ${order.updateDate || "-"}`
  ].filter(Boolean).join("\n\n");
}
function orderCard(order, index) {
  const items = Array.isArray(order.items) ? order.items : [];
  return `<article class="order-card"><div class="order-top"><div><div class="order-title">คำสั่งซื้อ #${escapeHtml(order.orderId || "-")} ${index === 0 ? '<span class="latest-badge">ล่าสุด</span>' : ""}</div><div class="order-meta">${items.length} รายการ · อัปเดต ${escapeHtml(order.updateDate || "-")}</div></div><div class="update-box"><div class="update-label">การชำระเงิน</div><div class="update-date">${escapeHtml(order.payment || "-")}</div></div></div><div class="items-section"><div class="items-title">รายการสินค้า</div><div class="items-list">${items.map(item => { const status = item.effectiveStatus || "รอตรวจสอบ"; return `<div class="item-row"><div class="item-main-row"><span class="item-name">${escapeHtml(item.productName || "-")}</span><span class="item-qty">× ${Number(item.qty) || 1}</span></div><div class="item-sub-row"><span class="item-status ${statusClass(status)}">● ${escapeHtml(status)}</span>${hasTracking(item.effectiveTracking) ? `<span class="item-tracking">Tracking: ${escapeHtml(item.effectiveTracking)} <button class="copy-tracking" data-tracking="${escapeHtml(item.effectiveTracking)}" type="button">คัดลอก</button></span>` : ""}</div></div>`; }).join("")}</div></div><div class="order-actions"><a class="line-contact-button" href="${lineUrl(orderInquiryMessage(order))}" target="_blank" rel="noopener">สอบถามออเดอร์นี้ ↗</a></div></article>`;
}
async function searchOrder() {
  const input = document.getElementById("phoneNumber"); const results = document.getElementById("results"); const button = document.getElementById("searchButton"); const phone = normalizePhone(input.value);
  if (phone.length < 9 || phone.length > 10) { showToast("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง"); input.focus(); return; }
  if (!API_URL || API_URL.includes("วาง_URL")) { results.innerHTML = '<div class="error-box"><div class="error-title">ยังไม่ได้เชื่อมต่อระบบ</div><div class="error-text">กรุณาตั้งค่า API_URL ใน config.js ก่อนใช้งาน</div></div>'; return; }
  button.disabled = true; button.textContent = "กำลังค้นหา..."; results.innerHTML = '<div class="loading-box">กำลังค้นหาข้อมูล...</div>';
  try { const response = await fetch(`${API_URL}?action=search&phone=${encodeURIComponent(phone)}`, { cache: "no-store" }); const data = await response.json(); if (!Array.isArray(data)) throw new Error(data.message || "รูปแบบข้อมูลไม่ถูกต้อง"); results.innerHTML = data.length ? data.map(orderCard).join("") : '<div class="not-found"><div class="not-found-title">ไม่พบข้อมูล</div><div class="not-found-text">ไม่พบคำสั่งซื้อจากเบอร์โทรศัพท์นี้</div></div>'; } catch (error) { results.innerHTML = `<div class="error-box"><div class="error-title">เกิดข้อผิดพลาด</div><div class="error-text">${escapeHtml(error.message)}</div></div>`; } finally { button.disabled = false; button.textContent = "ค้นหา"; }
}

document.addEventListener("click", event => {
  const option = event.target.closest("[data-option-value]");
  if (option) {
    const group = option.closest("[data-option]");
    group.querySelectorAll("[data-option-value]").forEach(button => button.classList.toggle("selected", button === option));
    return;
  }
  const add = event.target.closest("[data-add]"); if (add) { event.preventDefault(); addToCart(add.dataset.add); return; }
  const increase = event.target.closest("[data-increase-index]");
  if (increase) { const item = cart[Number(increase.dataset.increaseIndex)]; if (item) item.qty += 1; saveCart(); renderCart(); return; }
  const decrease = event.target.closest("[data-decrease-index]");
  if (decrease) { const item = cart[Number(decrease.dataset.decreaseIndex)]; if (item) item.qty -= 1; cart = cart.filter(entry => entry.qty > 0); saveCart(); renderCart(); return; }
  const remove = event.target.closest("[data-remove-index]");
  if (remove) { cart.splice(Number(remove.dataset.removeIndex), 1); saveCart(); renderCart(); return; }
  const copy = event.target.closest(".copy-tracking"); if (copy) navigator.clipboard?.writeText(copy.dataset.tracking).then(() => showToast("คัดลอก Tracking แล้ว ✓"));
});
["productSearch", "priceFilter", "sortProducts"].forEach(id => document.getElementById(id).addEventListener("input", renderShop));
document.querySelectorAll(".status-tab").forEach(tab => tab.addEventListener("click", () => {
  activeStatus = tab.dataset.status;
  document.querySelectorAll(".status-tab").forEach(item => item.classList.toggle("active", item === tab));
  renderShop();
}));
document.getElementById("searchButton").addEventListener("click", searchOrder);
document.getElementById("phoneNumber").addEventListener("keydown", event => { if (event.key === "Enter") searchOrder(); });
document.querySelector(".mobile-menu-button").addEventListener("click", () => document.querySelector(".main-nav").classList.toggle("open"));
document.getElementById("lineContact").href = lineUrl("สวัสดีค่ะ สนใจสอบถามสินค้า meju whisper");
window.addEventListener("hashchange", route);
renderFeatured(); renderShop(); updateCartCount(); route();

async function loadStoreProducts() {
  if (!API_URL || API_URL.includes("วาง_URL")) return;
  try {
    const response = await fetch(`${API_URL}?action=products`, { cache: "no-store" });
    const data = await response.json();
    if (Array.isArray(data)) {
      products = data;
      renderFeatured();
      renderShop();
    }
  } catch (error) {
    console.warn("ใช้รายการสินค้าสำรอง เนื่องจากโหลดสินค้าจากระบบไม่ได้", error);
  }
}

loadStoreProducts();
