const CONFIG = window.MEJU_CONFIG || {};
const API_URL = CONFIG.API_URL || "";
const TOKEN_KEY = "meju_admin_token";

const STATUS_OPTIONS = [
  "ยืนยันคำสั่งซื้อ",
  "ร้านค้าส่งแล้ว",
  "ถึงโกดังจีน",
  "กำลังขนส่งมาไทย",
  "สินค้าถึงไทย",
  "ออกจัดส่ง"
];

const loginScreen = document.getElementById("loginScreen");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const adminPassword = document.getElementById("adminPassword");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const logoutButton = document.getElementById("logoutButton");

const statsGrid = document.getElementById("statsGrid");
const adminOrders = document.getElementById("adminOrders");
const adminBatches = document.getElementById("adminBatches");
const orderCount = document.getElementById("orderCount");
const batchCount = document.getElementById("batchCount");

const orderSearchInput = document.getElementById("orderSearchInput");
const orderSearchButton = document.getElementById("orderSearchButton");
const batchSearchInput = document.getElementById("batchSearchInput");
const batchSearchButton = document.getElementById("batchSearchButton");

const newOrderButton = document.getElementById("newOrderButton");
const newBatchButton = document.getElementById("newBatchButton");
const bulkStatus = document.getElementById("bulkStatus");
const bulkUpdateButton = document.getElementById("bulkUpdateButton");

const orderModal = document.getElementById("orderModal");
const orderModalTitle = document.getElementById("orderModalTitle");
const closeOrderModal = document.getElementById("closeOrderModal");
const cancelOrderModal = document.getElementById("cancelOrderModal");
const orderForm = document.getElementById("orderForm");
const formOrderId = document.getElementById("formOrderId");
const displayOrderId = document.getElementById("displayOrderId");
const formPhone = document.getElementById("formPhone");
const formPayment = document.getElementById("formPayment");
const formRemark = document.getElementById("formRemark");
const itemRows = document.getElementById("itemRows");
const addItemButton = document.getElementById("addItemButton");
const saveOrderButton = document.getElementById("saveOrderButton");

const batchModal = document.getElementById("batchModal");
const batchModalTitle = document.getElementById("batchModalTitle");
const closeBatchModal = document.getElementById("closeBatchModal");
const cancelBatchModal = document.getElementById("cancelBatchModal");
const batchForm = document.getElementById("batchForm");
const formBatchId = document.getElementById("formBatchId");
const displayBatchId = document.getElementById("displayBatchId");
const formBatchProductId = document.getElementById("formBatchProductId");
const formBatchName = document.getElementById("formBatchName");
const formBatchStatus = document.getElementById("formBatchStatus");
const formBatchTracking = document.getElementById("formBatchTracking");
const saveBatchButton = document.getElementById("saveBatchButton");

const adminToast = document.getElementById("adminToast");

let adminToken = localStorage.getItem(TOKEN_KEY) || "";
let orders = [];
let batches = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusOptions(selected = "", includeEmpty = false) {
  const emptyOption = includeEmpty
    ? '<option value="">ใช้สถานะจาก Batch</option>'
    : "";

  return (
    emptyOption +
    STATUS_OPTIONS.map(status => `
      <option
        value="${escapeHtml(status)}"
        ${status === selected ? "selected" : ""}
      >
        ${escapeHtml(status)}
      </option>
    `).join("")
  );
}

function batchOptions(selected = "") {
  const options = batches.map(batch => `
    <option
      value="${escapeHtml(batch.batchId)}"
      ${batch.batchId === selected ? "selected" : ""}
    >
      ${escapeHtml(batch.batchName)} (${escapeHtml(batch.batchId)})
    </option>
  `).join("");

  return `
    <option value="">ยังไม่ผูก Batch</option>
    ${options}
  `;
}

async function postApi(payload) {
  if (!API_URL || API_URL.includes("วาง_URL")) {
    throw new Error("ยังไม่ได้ตั้งค่า API_URL ใน config.js");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("API ไม่ได้ส่ง JSON กลับมา");
  }

  if (data.code === "UNAUTHORIZED") {
    logout();
    throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  if (data.ok === false) {
    throw new Error(data.message || "เกิดข้อผิดพลาด");
  }

  return data;
}

function showToast(message) {
  adminToast.textContent = message;
  adminToast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    adminToast.classList.remove("show");
  }, 1800);
}

function showAdmin() {
  loginScreen.hidden = true;
  adminApp.hidden = false;
}

function showLogin() {
  loginScreen.hidden = false;
  adminApp.hidden = true;
}

function logout() {
  adminToken = "";
  localStorage.removeItem(TOKEN_KEY);
  showLogin();
}

async function login(password) {
  loginButton.disabled = true;
  loginButton.textContent = "กำลังเข้าสู่ระบบ...";
  loginError.textContent = "";

  try {
    const data = await postApi({
      action: "login",
      password
    });

    if (!data.token) {
      throw new Error("ระบบไม่ได้ส่ง Token กลับมา");
    }

    adminToken = data.token;
    localStorage.setItem(TOKEN_KEY, adminToken);
    adminPassword.value = "";

    showAdmin();
    await loadDashboard();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "เข้าสู่ระบบ";
  }
}

async function loadDashboard() {
  const data = await postApi({
    action: "adminDashboard",
    token: adminToken
  });

  orders = Array.isArray(data.orders) ? data.orders : [];
  batches = Array.isArray(data.batches) ? data.batches : [];

  renderStats(data.stats || {});
  renderOrders();
  renderBatches();
}

function renderStats(stats) {
  const cards = [
    ["ออเดอร์ทั้งหมด", stats.totalOrders || 0],
    ["รอบสินค้าทั้งหมด", stats.totalBatches || 0],
    ["กำลังขนส่งมาไทย", stats.transitItems || 0],
    ["สินค้าถึงไทย", stats.thailandItems || 0]
  ];

  statsGrid.innerHTML = cards.map(([label, value]) => `
    <div class="stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `).join("");
}

function filteredOrders() {
  const query = orderSearchInput.value.trim().toLowerCase();

  if (!query) {
    return orders;
  }

  return orders.filter(order => {
    const haystack = [
      order.orderId,
      order.phone,
      order.payment,
      order.remark,
      ...order.items.map(item => item.productName)
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

function renderOrders() {
  const list = filteredOrders();
  orderCount.textContent = `${list.length} ออเดอร์`;

  if (!list.length) {
    adminOrders.innerHTML = '<div class="admin-card">ไม่พบออเดอร์</div>';
    return;
  }

  adminOrders.innerHTML = list.map(order => {
    const preview = order.items
      .slice(0, 4)
      .map(item => `${escapeHtml(item.productName)} × ${Number(item.qty) || 1}`)
      .join("<br>");

    const more = order.items.length > 4
      ? `<br>+ อีก ${order.items.length - 4} รายการ`
      : "";

    return `
      <article class="admin-card">
        <div class="admin-card-top">
          <div>
            <div class="card-title">#${escapeHtml(order.orderId)}</div>
            <div class="card-meta">
              ${escapeHtml(order.phone)} · ${order.items.length} รายการ · ${escapeHtml(order.updateDate || "-")}
            </div>
            <div class="card-preview">${preview}${more}</div>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="small-button edit-button edit-order"
              data-order-id="${escapeHtml(order.orderId)}"
            >
              แก้ไข
            </button>

            <button
              type="button"
              class="small-button delete-button delete-order"
              data-order-id="${escapeHtml(order.orderId)}"
            >
              ลบ
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function filteredBatches() {
  const query = batchSearchInput.value.trim().toLowerCase();

  if (!query) {
    return batches;
  }

  return batches.filter(batch => {
    const haystack = [
      batch.batchId,
      batch.batchName,
      batch.productId,
      batch.status,
      batch.tracking
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

function renderBatches() {
  const list = filteredBatches();
  batchCount.textContent = `${list.length} รอบ`;

  if (!list.length) {
    adminBatches.innerHTML = '<div class="admin-card">ไม่พบรอบสินค้า</div>';
    return;
  }

  adminBatches.innerHTML = list.map(batch => `
    <article class="admin-card batch-card">
      <div class="batch-select-wrap">
        <input
          class="batch-select"
          type="checkbox"
          value="${escapeHtml(batch.batchId)}"
          aria-label="เลือกรอบ ${escapeHtml(batch.batchName)}"
        >
      </div>

      <div>
        <div class="admin-card-top">
          <div>
            <div class="card-title">${escapeHtml(batch.batchName)}</div>
            <div class="card-meta">
              ${escapeHtml(batch.batchId)} · ลูกค้า ${batch.customerCount || 0} คน ·
              ${batch.orderCount || 0} ออเดอร์ · รวม ${batch.totalQty || 0} ชิ้น
            </div>
            <div class="card-status">${escapeHtml(batch.status || "-")}</div>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="small-button edit-button edit-batch"
              data-batch-id="${escapeHtml(batch.batchId)}"
            >
              แก้ข้อมูล
            </button>

            <button
              type="button"
              class="small-button delete-button delete-batch"
              data-batch-id="${escapeHtml(batch.batchId)}"
            >
              ลบ
            </button>
          </div>
        </div>

        <div class="batch-inline-editor">
          <select class="inline-batch-status">
            ${statusOptions(batch.status)}
          </select>

          <input
            class="inline-batch-tracking"
            type="text"
            value="${escapeHtml(batch.tracking || "")}"
            placeholder="Tracking ของรอบ"
          >

          <button
            type="button"
            class="primary-button update-batch"
            data-batch-id="${escapeHtml(batch.batchId)}"
          >
            อัปเดตทั้งรอบ
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

function clearOrderForm() {
  orderForm.reset();
  formOrderId.value = "";
  displayOrderId.value = "สร้างให้อัตโนมัติ";
  formPayment.value = "ยังไม่ชำระ";
  itemRows.innerHTML = "";
  addItemRow();
}

function addItemRow(item = {}) {
  const row = document.createElement("div");
  row.className = "item-editor-row";

  row.innerHTML = `
    <input
      class="item-product-id"
      type="text"
      placeholder="Product ID"
      value="${escapeHtml(item.productId || "")}"
    >

    <input
      class="item-product-name"
      type="text"
      placeholder="ชื่อสินค้า"
      value="${escapeHtml(item.productName || "")}"
      required
    >

    <input
      class="item-qty"
      type="number"
      min="1"
      value="${Number(item.qty) || 1}"
      required
    >

    <select class="item-batch">
      ${batchOptions(item.batchId || "")}
    </select>

    <select class="item-override-status">
      ${statusOptions(item.statusOverride || "", true)}
    </select>

    <input
      class="item-override-tracking"
      type="text"
      placeholder="Tracking Override"
      value="${escapeHtml(item.trackingOverride || "")}"
    >

    <button class="remove-item" type="button">×</button>
  `;

  itemRows.appendChild(row);
}

function openNewOrder() {
  orderModalTitle.textContent = "เพิ่มออเดอร์";
  clearOrderForm();
  orderModal.hidden = false;
}

function openEditOrder(orderId) {
  const order = orders.find(item => item.orderId === orderId);

  if (!order) {
    return;
  }

  orderModalTitle.textContent = "แก้ไขออเดอร์";
  formOrderId.value = order.orderId;
  displayOrderId.value = order.orderId;
  formPhone.value = order.phone || "";
  formPayment.value = order.payment || "ยังไม่ชำระ";
  formRemark.value = order.remark || "";

  itemRows.innerHTML = "";
  order.items.forEach(addItemRow);

  if (!order.items.length) {
    addItemRow();
  }

  orderModal.hidden = false;
}

function closeOrder() {
  orderModal.hidden = true;
}

function collectOrderItems() {
  return Array.from(itemRows.querySelectorAll(".item-editor-row"))
    .map(row => ({
      productId: row.querySelector(".item-product-id").value.trim(),
      productName: row.querySelector(".item-product-name").value.trim(),
      qty: Number(row.querySelector(".item-qty").value) || 1,
      batchId: row.querySelector(".item-batch").value,
      statusOverride: row.querySelector(".item-override-status").value,
      trackingOverride: row.querySelector(".item-override-tracking").value.trim()
    }))
    .filter(item => item.productName);
}

async function saveOrder() {
  const items = collectOrderItems();

  if (!items.length) {
    alert("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
    return;
  }

  saveOrderButton.disabled = true;
  saveOrderButton.textContent = "กำลังบันทึก...";

  try {
    const data = await postApi({
      action: "saveOrder",
      token: adminToken,
      order: {
        orderId: formOrderId.value,
        phone: formPhone.value,
        payment: formPayment.value,
        remark: formRemark.value,
        items
      }
    });

    closeOrder();
    showToast(`บันทึก ${data.orderId} แล้ว`);
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  } finally {
    saveOrderButton.disabled = false;
    saveOrderButton.textContent = "บันทึกออเดอร์";
  }
}

async function deleteOrder(orderId) {
  if (!confirm(`ต้องการลบออเดอร์ ${orderId} ใช่หรือไม่?`)) {
    return;
  }

  await postApi({
    action: "deleteOrder",
    token: adminToken,
    orderId
  });

  showToast("ลบออเดอร์แล้ว");
  await loadDashboard();
}

function clearBatchForm() {
  batchForm.reset();
  formBatchId.value = "";
  displayBatchId.value = "สร้างให้อัตโนมัติ";
  formBatchStatus.value = "ยืนยันคำสั่งซื้อ";
}

function openNewBatch() {
  batchModalTitle.textContent = "เพิ่มรอบสินค้า";
  clearBatchForm();
  batchModal.hidden = false;
}

function openEditBatch(batchId) {
  const batch = batches.find(item => item.batchId === batchId);

  if (!batch) {
    return;
  }

  batchModalTitle.textContent = "แก้ไขรอบสินค้า";
  formBatchId.value = batch.batchId;
  displayBatchId.value = batch.batchId;
  formBatchProductId.value = batch.productId || "";
  formBatchName.value = batch.batchName || "";
  formBatchStatus.value = batch.status || "ยืนยันคำสั่งซื้อ";
  formBatchTracking.value = batch.tracking || "";
  batchModal.hidden = false;
}

function closeBatch() {
  batchModal.hidden = true;
}

async function saveBatch() {
  saveBatchButton.disabled = true;
  saveBatchButton.textContent = "กำลังบันทึก...";

  try {
    const data = await postApi({
      action: "saveBatch",
      token: adminToken,
      batch: {
        batchId: formBatchId.value,
        productId: formBatchProductId.value,
        batchName: formBatchName.value,
        status: formBatchStatus.value,
        tracking: formBatchTracking.value
      }
    });

    closeBatch();
    showToast(`บันทึก ${data.batchId} แล้ว`);
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  } finally {
    saveBatchButton.disabled = false;
    saveBatchButton.textContent = "บันทึกรอบสินค้า";
  }
}

async function updateBatchFromCard(button) {
  const card = button.closest(".batch-card");
  const batchId = button.dataset.batchId;
  const status = card.querySelector(".inline-batch-status").value;
  const tracking = card.querySelector(".inline-batch-tracking").value.trim();

  const batch = batches.find(item => item.batchId === batchId);

  if (!batch) {
    return;
  }

  const message =
    `การเปลี่ยนสถานะนี้จะมีผลกับ\n` +
    `${batch.customerCount || 0} ลูกค้า\n` +
    `${batch.orderCount || 0} ออเดอร์\n` +
    `${batch.totalQty || 0} ชิ้น\n\n` +
    `ยืนยันการอัปเดตทั้งรอบหรือไม่?`;

  if (!confirm(message)) {
    return;
  }

  button.disabled = true;
  button.textContent = "กำลังอัปเดต...";

  try {
    await postApi({
      action: "updateBatch",
      token: adminToken,
      batchId,
      status,
      tracking
    });

    showToast("อัปเดตทั้งรอบแล้ว");
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "อัปเดตทั้งรอบ";
  }
}

async function bulkUpdateBatches() {
  const batchIds = Array.from(
    document.querySelectorAll(".batch-select:checked")
  ).map(input => input.value);

  const status = bulkStatus.value;

  if (!batchIds.length) {
    alert("กรุณาเลือกรอบสินค้าอย่างน้อย 1 รอบ");
    return;
  }

  if (!status) {
    alert("กรุณาเลือกสถานะ");
    return;
  }

  if (!confirm(`ยืนยันการอัปเดต ${batchIds.length} รอบเป็น "${status}" หรือไม่?`)) {
    return;
  }

  await postApi({
    action: "bulkUpdateBatches",
    token: adminToken,
    batchIds,
    status
  });

  bulkStatus.value = "";
  showToast("อัปเดตหลายรอบแล้ว");
  await loadDashboard();
}

async function deleteBatch(batchId) {
  const batch = batches.find(item => item.batchId === batchId);

  if (!batch) {
    return;
  }

  const message =
    `ต้องการลบรอบ ${batch.batchName} ใช่หรือไม่?\n` +
    `ระบบจะไม่อนุญาตให้ลบถ้ายังมีสินค้าเชื่อมกับรอบนี้`;

  if (!confirm(message)) {
    return;
  }

  try {
    await postApi({
      action: "deleteBatch",
      token: adminToken,
      batchId
    });

    showToast("ลบรอบสินค้าแล้ว");
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.getElementById("ordersPanel").hidden = tabName !== "orders";
  document.getElementById("batchesPanel").hidden = tabName !== "batches";
}

loginForm.addEventListener("submit", event => {
  event.preventDefault();
  login(adminPassword.value);
});

logoutButton.addEventListener("click", logout);

document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

orderSearchButton.addEventListener("click", renderOrders);
orderSearchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    renderOrders();
  }
});

batchSearchButton.addEventListener("click", renderBatches);
batchSearchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    renderBatches();
  }
});

newOrderButton.addEventListener("click", openNewOrder);
closeOrderModal.addEventListener("click", closeOrder);
cancelOrderModal.addEventListener("click", closeOrder);
addItemButton.addEventListener("click", () => addItemRow());

orderForm.addEventListener("submit", event => {
  event.preventDefault();
  saveOrder();
});

itemRows.addEventListener("click", event => {
  const button = event.target.closest(".remove-item");

  if (!button) {
    return;
  }

  const allRows = itemRows.querySelectorAll(".item-editor-row");

  if (allRows.length === 1) {
    alert("ต้องมีสินค้าอย่างน้อย 1 รายการ");
    return;
  }

  button.closest(".item-editor-row").remove();
});

adminOrders.addEventListener("click", event => {
  const editButton = event.target.closest(".edit-order");

  if (editButton) {
    openEditOrder(editButton.dataset.orderId);
    return;
  }

  const deleteButton = event.target.closest(".delete-order");

  if (deleteButton) {
    deleteOrder(deleteButton.dataset.orderId);
  }
});

newBatchButton.addEventListener("click", openNewBatch);
closeBatchModal.addEventListener("click", closeBatch);
cancelBatchModal.addEventListener("click", closeBatch);

batchForm.addEventListener("submit", event => {
  event.preventDefault();
  saveBatch();
});

adminBatches.addEventListener("click", event => {
  const updateButton = event.target.closest(".update-batch");

  if (updateButton) {
    updateBatchFromCard(updateButton);
    return;
  }

  const editButton = event.target.closest(".edit-batch");

  if (editButton) {
    openEditBatch(editButton.dataset.batchId);
    return;
  }

  const deleteButton = event.target.closest(".delete-batch");

  if (deleteButton) {
    deleteBatch(deleteButton.dataset.batchId);
  }
});

bulkUpdateButton.addEventListener("click", bulkUpdateBatches);

orderModal.addEventListener("click", event => {
  if (event.target === orderModal) {
    closeOrder();
  }
});

batchModal.addEventListener("click", event => {
  if (event.target === batchModal) {
    closeBatch();
  }
});

(async function init() {
  if (!adminToken) {
    showLogin();
    return;
  }

  showAdmin();

  try {
    await loadDashboard();
  } catch {
    logout();
  }
})();
