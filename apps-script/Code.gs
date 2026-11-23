const ADMIN_SESSION_HOURS = 8;

const ORDERS_SHEET = "Orders";
const ITEMS_SHEET = "OrderItems";
const BATCHES_SHEET = "Batches";
const PRODUCTS_SHEET = "Products";

const ORDERS_HEADERS = [
  "OrderID",
  "Phone",
  "Payment",
  "Remark",
  "UpdateDate"
];

const ITEMS_HEADERS = [
  "OrderItemID",
  "OrderID",
  "Phone",
  "ProductID",
  "ProductName",
  "Qty",
  "BatchID",
  "StatusOverride",
  "TrackingOverride",
  "UpdateDate"
];

const BATCHES_HEADERS = [
  "BatchID",
  "ProductID",
  "BatchName",
  "Status",
  "Tracking",
  "UpdateDate"
];

const PRODUCTS_HEADERS = [
  "ProductID",
  "ProductName",
  "Brand",
  "Category",
  "Price",
  "Status",
  "Stock",
  "ImageURL",
  "Description",
  "UpdateDate",
  "Colors",
  "Sizes"
];

/* ==================================================
   SETUP
   รัน setupMejuSystem() ครั้งเดียวก่อนใช้งาน
================================================== */

function setupMejuSystem() {
  const spreadsheet = getSpreadsheet_();

  ensureSheet_(spreadsheet, ORDERS_SHEET, ORDERS_HEADERS);
  ensureSheet_(spreadsheet, ITEMS_SHEET, ITEMS_HEADERS);
  ensureSheet_(spreadsheet, BATCHES_SHEET, BATCHES_HEADERS);
  ensureSheet_(spreadsheet, PRODUCTS_SHEET, PRODUCTS_HEADERS);

  console.log("MEJU system ready");
}

/* ==================================================
   GET - ลูกค้า
================================================== */

function doGet(e) {
  try {
    const action = String(e?.parameter?.action || "search");

    if (action === "products") {
      return jsonResponse_(publicProducts_());
    }

    if (action !== "search") {
      return jsonResponse_({
        ok: false,
        message: "Invalid action"
      });
    }

    return publicSearch_(e);
  } catch (error) {
    return jsonResponse_({
      ok: false,
      message: error.message
    });
  }
}

/* ==================================================
   POST - ADMIN
================================================== */

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || "");

    if (action === "login") {
      return jsonResponse_(loginAdmin_(body.password));
    }

    if (!verifyAdminToken_(body.token)) {
      return jsonResponse_({
        ok: false,
        code: "UNAUTHORIZED",
        message: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่"
      });
    }

    if (action === "adminDashboard") {
      return jsonResponse_(adminDashboard_());
    }

    if (action === "saveOrder") {
      return jsonResponse_(saveOrder_(body.order || {}));
    }

    if (action === "deleteOrder") {
      return jsonResponse_(deleteOrder_(body.orderId));
    }

    if (action === "saveBatch") {
      return jsonResponse_(saveBatch_(body.batch || {}));
    }

    if (action === "updateBatch") {
      return jsonResponse_(
        updateBatch_(
          body.batchId,
          body.status,
          body.tracking
        )
      );
    }

    if (action === "bulkUpdateBatches") {
      return jsonResponse_(
        bulkUpdateBatches_(
          body.batchIds,
          body.status
        )
      );
    }

    if (action === "deleteBatch") {
      return jsonResponse_(deleteBatch_(body.batchId));
    }

    if (action === "saveProduct") {
      return jsonResponse_(saveProduct_(body.product || {}));
    }

    if (action === "deleteProduct") {
      return jsonResponse_(deleteProduct_(body.productId));
    }

    return jsonResponse_({
      ok: false,
      message: "Unknown action"
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      message: error.message
    });
  }
}

/* ==================================================
   PUBLIC SEARCH
================================================== */

function publicSearch_(e) {
  const phone = normalizePhone_(e?.parameter?.phone || "");

  if (!phone) {
    return jsonResponse_([]);
  }

  const data = loadAllData_();

  const matchingOrders = data.orders
    .filter(order => normalizePhone_(order.Phone) === phone)
    .map(order => buildPublicOrder_(order, data))
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(order => {
      delete order.timestamp;
      return order;
    });

  return jsonResponse_(matchingOrders);
}

function publicProducts_() {
  const data = loadAllData_();
  return data.products
    .filter(product => String(product.Status).trim() === "พร้อมส่ง" && Number(product.Stock || 0) > 0)
    .map(product => ({
      id: product.ProductID,
      name: product.ProductName,
      brand: product.Brand,
      category: product.Category,
      price: Number(product.Price) || 0,
      status: product.Status,
      stock: Number(product.Stock) || 0,
      image: product.ImageURL,
      description: product.Description,
      colors: product.Colors,
      sizes: product.Sizes
    }));
}

function buildPublicOrder_(order, data) {
  const batchMap = indexBy_(data.batches, "BatchID");

  const items = data.items
    .filter(item => item.OrderID === order.OrderID)
    .map(item => {
      const batch = batchMap[item.BatchID] || {};

      const effectiveStatus =
        String(item.StatusOverride || "").trim() ||
        String(batch.Status || "").trim() ||
        "ยืนยันคำสั่งซื้อ";

      const effectiveTracking =
        String(item.TrackingOverride || "").trim() ||
        String(batch.Tracking || "").trim();

      const itemTimestamp = Math.max(
        item._timestamp || 0,
        batch._timestamp || 0
      );

      return {
        orderItemId: item.OrderItemID,
        productId: item.ProductID,
        productName: item.ProductName,
        qty: Number(item.Qty) || 1,
        batchId: item.BatchID,
        batchName: batch.BatchName || "",
        statusOverride: item.StatusOverride || "",
        trackingOverride: item.TrackingOverride || "",
        effectiveStatus: effectiveStatus,
        effectiveTracking: effectiveTracking,
        updateDate:
          formatDateDisplayFromTimestamp_(
            itemTimestamp,
            data.timezone
          ),
        updateIso:
          itemTimestamp
            ? new Date(itemTimestamp).toISOString()
            : ""
      };
    });

  const latestItemTimestamp = items.reduce(
    (max, item) => Math.max(
      max,
      Date.parse(item.updateIso || "") || 0
    ),
    0
  );

  const timestamp = Math.max(
    order._timestamp || 0,
    latestItemTimestamp
  );

  return {
    orderId: order.OrderID,
    phone: order.Phone,
    payment: order.Payment,
    remark: order.Remark,
    updateDate: formatDateDisplayFromTimestamp_(timestamp, data.timezone),
    updateIso: timestamp ? new Date(timestamp).toISOString() : "",
    timestamp: timestamp,
    items: items
  };
}

/* ==================================================
   ADMIN LOGIN
================================================== */

function loginAdmin_(password) {
  const properties = PropertiesService.getScriptProperties();
  const savedPassword = properties.getProperty("ADMIN_PASSWORD");

  if (!savedPassword) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า ADMIN_PASSWORD ใน Script Properties"
    );
  }

  if (!safeEqual_(String(password || ""), savedPassword)) {
    return {
      ok: false,
      message: "รหัสผ่านไม่ถูกต้อง"
    };
  }

  return {
    ok: true,
    token: createAdminToken_(),
    expiresInHours: ADMIN_SESSION_HOURS
  };
}

/* ==================================================
   ADMIN DASHBOARD
================================================== */

function adminDashboard_() {
  const data = loadAllData_();

  const orders = data.orders
    .map(order => buildAdminOrder_(order, data))
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(order => {
      delete order.timestamp;
      return order;
    });

  const batchCounts = getBatchCounts_(data);

  const batches = data.batches
    .map(batch => ({
      batchId: batch.BatchID,
      productId: batch.ProductID,
      batchName: batch.BatchName,
      status: batch.Status,
      tracking: batch.Tracking,
      updateDate: batch._displayDate,
      updateIso: batch._isoDate,
      customerCount: batchCounts[batch.BatchID]?.customerCount || 0,
      orderCount: batchCounts[batch.BatchID]?.orderCount || 0,
      itemCount: batchCounts[batch.BatchID]?.itemCount || 0,
      totalQty: batchCounts[batch.BatchID]?.totalQty || 0,
      timestamp: batch._timestamp || 0
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(batch => {
      delete batch.timestamp;
      return batch;
    });

  const products = data.products
    .map(product => ({
      id: product.ProductID,
      name: product.ProductName,
      brand: product.Brand,
      category: product.Category,
      price: Number(product.Price) || 0,
      status: product.Status,
      stock: Number(product.Stock) || 0,
      image: product.ImageURL,
      description: product.Description,
      colors: product.Colors,
      sizes: product.Sizes,
      updateDate: product._displayDate,
      timestamp: product._timestamp || 0
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(product => {
      delete product.timestamp;
      return product;
    });

  return {
    ok: true,
    orders: orders,
    batches: batches,
    products: products,
    stats: getStats_(orders, batches)
  };
}

function buildAdminOrder_(order, data) {
  const batchMap = indexBy_(data.batches, "BatchID");

  const items = data.items
    .filter(item => item.OrderID === order.OrderID)
    .map(item => {
      const batch = batchMap[item.BatchID] || {};

      const effectiveStatus =
        String(item.StatusOverride || "").trim() ||
        String(batch.Status || "").trim() ||
        "ยืนยันคำสั่งซื้อ";

      const effectiveTracking =
        String(item.TrackingOverride || "").trim() ||
        String(batch.Tracking || "").trim();

      return {
        orderItemId: item.OrderItemID,
        productId: item.ProductID,
        productName: item.ProductName,
        qty: Number(item.Qty) || 1,
        batchId: item.BatchID,
        statusOverride: item.StatusOverride,
        trackingOverride: item.TrackingOverride,
        effectiveStatus: effectiveStatus,
        effectiveTracking: effectiveTracking
      };
    });

  const latestItemTimestamp = data.items
    .filter(item => item.OrderID === order.OrderID)
    .reduce((max, item) => Math.max(max, item._timestamp || 0), 0);

  const timestamp = Math.max(
    order._timestamp || 0,
    latestItemTimestamp
  );

  return {
    orderId: order.OrderID,
    phone: order.Phone,
    payment: order.Payment,
    remark: order.Remark,
    updateDate: formatDateDisplayFromTimestamp_(timestamp, data.timezone),
    updateIso: timestamp ? new Date(timestamp).toISOString() : "",
    timestamp: timestamp,
    items: items
  };
}

/* ==================================================
   SAVE ORDER
================================================== */

function saveOrder_(input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = loadAllData_();
    const phone = normalizePhone_(input.phone);

    if (!phone) {
      throw new Error("กรุณากรอกเบอร์โทรศัพท์");
    }

    const inputItems = Array.isArray(input.items) ? input.items : [];

    if (!inputItems.length) {
      throw new Error("ต้องมีสินค้าอย่างน้อย 1 รายการ");
    }

    const batchMap = indexBy_(data.batches, "BatchID");

    inputItems.forEach((item, index) => {
      if (!String(item.productName || "").trim()) {
        throw new Error(`สินค้ารายการที่ ${index + 1} ไม่มีชื่อสินค้า`);
      }

      if (
        String(item.batchId || "").trim() &&
        !batchMap[String(item.batchId || "").trim()]
      ) {
        throw new Error(
          `ไม่พบ Batch ${item.batchId} ของสินค้ารายการที่ ${index + 1}`
        );
      }
    });

    const orderId =
      String(input.orderId || "").trim() ||
      generateOrderId_(data.timezone);

    const now = new Date();

    upsertRow_(
      data.orderSheet,
      ORDERS_HEADERS,
      "OrderID",
      orderId,
      {
        OrderID: orderId,
        Phone: phone,
        Payment: String(input.payment || "ยังไม่ชำระ").trim(),
        Remark: String(input.remark || "").trim(),
        UpdateDate: now
      }
    );

    deleteRowsByField_(
      data.itemSheet,
      ITEMS_HEADERS,
      "OrderID",
      orderId
    );

    const newItemRows = inputItems.map(item => {
      return [
        generateOrderItemId_(),
        orderId,
        phone,
        String(item.productId || "").trim() || generateProductId_(),
        String(item.productName || "").trim(),
        Math.max(1, Number(item.qty) || 1),
        String(item.batchId || "").trim(),
        String(item.statusOverride || "").trim(),
        String(item.trackingOverride || "").trim(),
        now
      ];
    });

    if (newItemRows.length) {
      data.itemSheet
        .getRange(
          data.itemSheet.getLastRow() + 1,
          1,
          newItemRows.length,
          ITEMS_HEADERS.length
        )
        .setValues(newItemRows);
    }

    return {
      ok: true,
      orderId: orderId
    };
  } finally {
    lock.releaseLock();
  }
}

/* ==================================================
   DELETE ORDER
================================================== */

function deleteOrder_(orderId) {
  const id = String(orderId || "").trim();

  if (!id) {
    throw new Error("ไม่พบ Order ID");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = loadAllData_();

    const removed = deleteRowsByField_(
      data.orderSheet,
      ORDERS_HEADERS,
      "OrderID",
      id
    );

    deleteRowsByField_(
      data.itemSheet,
      ITEMS_HEADERS,
      "OrderID",
      id
    );

    if (!removed) {
      throw new Error("ไม่พบออเดอร์นี้");
    }

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ==================================================
   SAVE BATCH
================================================== */

function saveBatch_(input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = loadAllData_();

    const batchName = String(input.batchName || "").trim();

    if (!batchName) {
      throw new Error("กรุณากรอกชื่อรอบสินค้า");
    }

    const batchId =
      String(input.batchId || "").trim() ||
      generateBatchId_(data.timezone);

    const now = new Date();

    upsertRow_(
      data.batchSheet,
      BATCHES_HEADERS,
      "BatchID",
      batchId,
      {
        BatchID: batchId,
        ProductID:
          String(input.productId || "").trim() ||
          generateProductId_(),
        BatchName: batchName,
        Status:
          String(input.status || "ยืนยันคำสั่งซื้อ").trim(),
        Tracking: String(input.tracking || "").trim(),
        UpdateDate: now
      }
    );

    return {
      ok: true,
      batchId: batchId
    };
  } finally {
    lock.releaseLock();
  }
}

/* ==================================================
   UPDATE BATCH
================================================== */

function updateBatch_(batchId, status, tracking) {
  const id = String(batchId || "").trim();

  if (!id) {
    throw new Error("ไม่พบ Batch ID");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = loadAllData_();
    const current = data.batches.find(batch => batch.BatchID === id);

    if (!current) {
      throw new Error("ไม่พบรอบสินค้านี้");
    }

    upsertRow_(
      data.batchSheet,
      BATCHES_HEADERS,
      "BatchID",
      id,
      {
        BatchID: id,
        ProductID: current.ProductID,
        BatchName: current.BatchName,
        Status: String(status || current.Status).trim(),
        Tracking: String(tracking || "").trim(),
        UpdateDate: new Date()
      }
    );

    const counts = getBatchCounts_(data)[id] || {
      customerCount: 0,
      orderCount: 0,
      totalQty: 0
    };

    return {
      ok: true,
      affected: counts
    };
  } finally {
    lock.releaseLock();
  }
}

/* ==================================================
   BULK UPDATE BATCHES
================================================== */

function bulkUpdateBatches_(batchIds, status) {
  const ids = Array.isArray(batchIds)
    ? batchIds.map(id => String(id || "").trim()).filter(Boolean)
    : [];

  const newStatus = String(status || "").trim();

  if (!ids.length) {
    throw new Error("กรุณาเลือกรอบสินค้า");
  }

  if (!newStatus) {
    throw new Error("กรุณาเลือกสถานะ");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = loadAllData_();
    const now = new Date();

    const batchMap = indexBy_(data.batches, "BatchID");

    ids.forEach(id => {
      const current = batchMap[id];

      if (!current) {
        return;
      }

      upsertRow_(
        data.batchSheet,
        BATCHES_HEADERS,
        "BatchID",
        id,
        {
          BatchID: id,
          ProductID: current.ProductID,
          BatchName: current.BatchName,
          Status: newStatus,
          Tracking: current.Tracking,
          UpdateDate: now
        }
      );
    });

    return {
      ok: true,
      updatedCount: ids.length
    };
  } finally {
    lock.releaseLock();
  }
}

/* ==================================================
   DELETE BATCH
================================================== */

function deleteBatch_(batchId) {
  const id = String(batchId || "").trim();

  if (!id) {
    throw new Error("ไม่พบ Batch ID");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = loadAllData_();

    const linkedCount = data.items.filter(
      item => item.BatchID === id
    ).length;

    if (linkedCount > 0) {
      throw new Error(
        `ลบรอบนี้ไม่ได้ เพราะยังมีสินค้า ${linkedCount} รายการเชื่อมอยู่`
      );
    }

    const removed = deleteRowsByField_(
      data.batchSheet,
      BATCHES_HEADERS,
      "BatchID",
      id
    );

    if (!removed) {
      throw new Error("ไม่พบรอบสินค้านี้");
    }

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function saveProduct_(input) {
  const productId = String(input.id || "").trim() || generateProductId_();
  const name = String(input.name || "").trim();
  if (!name) throw new Error("กรุณากรอกชื่อสินค้า");
  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) throw new Error("กรุณากรอกราคาให้ถูกต้อง");
  const stock = Math.max(0, Number(input.stock) || 0);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = loadAllData_();
    upsertRow_(data.productSheet, PRODUCTS_HEADERS, "ProductID", productId, {
      ProductID: productId,
      ProductName: name,
      Brand: String(input.brand || "").trim(),
      Category: String(input.category || "อื่น ๆ").trim(),
      Price: price,
      Status: String(input.status || "พร้อมส่ง").trim(),
      Stock: stock,
      ImageURL: String(input.image || "").trim(),
      Description: String(input.description || "").trim(),
      UpdateDate: new Date(),
      Colors: String(input.colors || "").trim(),
      Sizes: String(input.sizes || "").trim()
    });
    return { ok: true, productId: productId };
  } finally {
    lock.releaseLock();
  }
}

function deleteProduct_(productId) {
  const id = String(productId || "").trim();
  if (!id) throw new Error("ไม่พบ Product ID");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = loadAllData_();
    if (!deleteRowsByField_(data.productSheet, PRODUCTS_HEADERS, "ProductID", id)) {
      throw new Error("ไม่พบสินค้านี้");
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ==================================================
   COUNTS / STATS
================================================== */

function getBatchCounts_(data) {
  const orderMap = indexBy_(data.orders, "OrderID");
  const result = {};

  data.items.forEach(item => {
    const batchId = String(item.BatchID || "").trim();

    if (!batchId) {
      return;
    }

    if (!result[batchId]) {
      result[batchId] = {
        customerSet: {},
        orderSet: {},
        itemCount: 0,
        totalQty: 0
      };
    }

    const order = orderMap[item.OrderID];

    if (order) {
      result[batchId].customerSet[
        normalizePhone_(order.Phone)
      ] = true;
    }

    result[batchId].orderSet[item.OrderID] = true;
    result[batchId].itemCount++;
    result[batchId].totalQty += Number(item.Qty) || 1;
  });

  Object.keys(result).forEach(batchId => {
    result[batchId].customerCount =
      Object.keys(result[batchId].customerSet).length;

    result[batchId].orderCount =
      Object.keys(result[batchId].orderSet).length;

    delete result[batchId].customerSet;
    delete result[batchId].orderSet;
  });

  return result;
}

function getStats_(orders, batches) {
  let transitItems = 0;
  let thailandItems = 0;

  orders.forEach(order => {
    order.items.forEach(item => {
      const status = normalizeStatus_(item.effectiveStatus);

      if (status === "กำลังขนส่งมาไทย") {
        transitItems++;
      }

      if (status === "สินค้าถึงไทย") {
        thailandItems++;
      }
    });
  });

  return {
    totalOrders: orders.length,
    totalBatches: batches.length,
    transitItems: transitItems,
    thailandItems: thailandItems
  };
}

/* ==================================================
   LOAD DATA
================================================== */

function loadAllData_() {
  const spreadsheet = getSpreadsheet_();

  const orderSheet = getSheetChecked_(
    spreadsheet,
    ORDERS_SHEET,
    ORDERS_HEADERS
  );

  const itemSheet = getSheetChecked_(
    spreadsheet,
    ITEMS_SHEET,
    ITEMS_HEADERS
  );

  const batchSheet = getSheetChecked_(
    spreadsheet,
    BATCHES_SHEET,
    BATCHES_HEADERS
  );

  const productSheet = getSheetChecked_(
    spreadsheet,
    PRODUCTS_SHEET,
    PRODUCTS_HEADERS
  );

  const timezone = spreadsheet.getSpreadsheetTimeZone();

  return {
    spreadsheet: spreadsheet,
    timezone: timezone,
    orderSheet: orderSheet,
    itemSheet: itemSheet,
    batchSheet: batchSheet,
    productSheet: productSheet,
    orders: readObjects_(orderSheet, ORDERS_HEADERS, timezone),
    items: readObjects_(itemSheet, ITEMS_HEADERS, timezone),
    batches: readObjects_(batchSheet, BATCHES_HEADERS, timezone),
    products: readObjects_(productSheet, PRODUCTS_HEADERS, timezone)
  };
}

function readObjects_(sheet, headers, timezone) {
  const range = sheet.getDataRange();
  const raw = range.getValues();
  const display = range.getDisplayValues();

  if (raw.length <= 1) {
    return [];
  }

  return raw.slice(1)
    .map((row, index) => {
      const displayRow = display[index + 1];
      const object = {};

      headers.forEach((header, columnIndex) => {
        if (header === "UpdateDate") {
          const rawDate = row[columnIndex];

          object[header] = formatDateDisplay_(
            rawDate,
            displayRow[columnIndex],
            timezone
          );

          object._timestamp = getTimestamp_(
            rawDate,
            displayRow[columnIndex]
          );

          object._displayDate = object[header];
          object._isoDate = object._timestamp
            ? new Date(object._timestamp).toISOString()
            : "";
        } else {
          object[header] = String(displayRow[columnIndex] || "").trim();
        }
      });

      return object;
    })
    .filter(object => {
      return headers.some(header => {
        return header === "UpdateDate"
          ? Boolean(object._timestamp)
          : Boolean(object[header]);
      });
    });
}

/* ==================================================
   SHEET HELPERS
================================================== */

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID");

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();

  if (!active) {
    throw new Error(
      "ไม่พบ Spreadsheet กรุณาตั้งค่า SPREADSHEET_ID"
    );
  }

  return active;
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(value => String(value).trim());

  if (name === PRODUCTS_SHEET && headers.slice(0, 10).every((header, index) => currentHeaders[index] === header)) {
    const missingHeaders = headers.slice(currentHeaders.length);
    if (missingHeaders.length) {
      sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length)
        .setValues([missingHeaders]);
      return;
    }
  }

  const sameHeaders =
    currentHeaders.length === headers.length &&
    headers.every((header, index) => currentHeaders[index] === header);

  if (!sameHeaders) {
    throw new Error(
      `ชีต ${name} มีหัวคอลัมน์ไม่ตรง กรุณาสำรอง/เปลี่ยนชื่อชีตเดิมก่อน`
    );
  }
}

function getSheetChecked_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    throw new Error(
      `ไม่พบชีต ${name} กรุณารัน setupMejuSystem()`
    );
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(value => String(value).trim());

  if (name === PRODUCTS_SHEET && headers.slice(0, 10).every((header, index) => currentHeaders[index] === header)) {
    const missingHeaders = headers.slice(currentHeaders.length);
    if (missingHeaders.length) {
      sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length)
        .setValues([missingHeaders]);
    }
  }

  const refreshedHeaders = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(value => String(value).trim());

  const sameHeaders =
    refreshedHeaders.length === headers.length &&
    headers.every((header, index) => refreshedHeaders[index] === header);

  if (!sameHeaders) {
    throw new Error(
      `หัวคอลัมน์ของชีต ${name} ไม่ตรงกับระบบ`
    );
  }

  return sheet;
}

function upsertRow_(
  sheet,
  headers,
  keyField,
  keyValue,
  object
) {
  const keyIndex = headers.indexOf(keyField);

  if (keyIndex === -1) {
    throw new Error(`ไม่พบ key field ${keyField}`);
  }

  const values = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyIndex] || "").trim() === String(keyValue)) {
      targetRow = i + 1;
      break;
    }
  }

  const row = headers.map(header => object[header] ?? "");

  if (targetRow === -1) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, 1, headers.length)
      .setValues([row]);
  } else {
    sheet
      .getRange(targetRow, 1, 1, headers.length)
      .setValues([row]);
  }
}

function deleteRowsByField_(
  sheet,
  headers,
  field,
  value
) {
  const fieldIndex = headers.indexOf(field);

  if (fieldIndex === -1) {
    throw new Error(`ไม่พบ field ${field}`);
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  const kept = rows.filter(row => {
    return String(row[fieldIndex] || "").trim() !== String(value || "").trim();
  });

  const removed = kept.length !== rows.length;

  rewriteSheetBody_(sheet, headers.length, kept);

  return removed;
}

function rewriteSheetBody_(sheet, columnCount, rows) {
  const oldCount = Math.max(sheet.getLastRow() - 1, 0);
  const clearCount = Math.max(oldCount, rows.length);

  if (clearCount > 0) {
    sheet
      .getRange(2, 1, clearCount, columnCount)
      .clearContent();
  }

  if (rows.length > 0) {
    sheet
      .getRange(2, 1, rows.length, columnCount)
      .setValues(rows);
  }
}

function indexBy_(records, field) {
  return records.reduce((map, record) => {
    map[record[field]] = record;
    return map;
  }, {});
}

/* ==================================================
   FORMAT / NORMALIZE
================================================== */

function normalizePhone_(value) {
  let phone = String(value || "").replace(/\D/g, "");

  if (phone.length === 11 && phone.startsWith("66")) {
    phone = "0" + phone.slice(2);
  }

  if (phone.length === 9) {
    phone = "0" + phone;
  }

  return phone;
}

function normalizeStatus_(value) {
  const status = String(value || "").trim();

  if (status === "ถึงไทยแล้ว") {
    return "สินค้าถึงไทย";
  }

  if (status === "จัดส่งสำเร็จ") {
    return "ออกจัดส่ง";
  }

  return status;
}

function formatDateDisplay_(
  rawValue,
  fallback,
  timezone
) {
  if (
    rawValue instanceof Date &&
    !isNaN(rawValue.getTime())
  ) {
    return Utilities.formatDate(
      rawValue,
      timezone,
      "d/M/yyyy, HH:mm:ss"
    );
  }

  return String(fallback || "");
}

function formatDateDisplayFromTimestamp_(
  timestamp,
  timezone
) {
  if (!timestamp) {
    return "";
  }

  return Utilities.formatDate(
    new Date(timestamp),
    timezone,
    "d/M/yyyy, HH:mm:ss"
  );
}

function getTimestamp_(
  rawValue,
  fallback
) {
  if (
    rawValue instanceof Date &&
    !isNaN(rawValue.getTime())
  ) {
    return rawValue.getTime();
  }

  const parsed = Date.parse(String(fallback || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/* ==================================================
   ID GENERATORS
================================================== */

function generateOrderId_(timezone) {
  const date = Utilities.formatDate(
    new Date(),
    timezone,
    "yyMMdd"
  );

  const suffix = Utilities
    .getUuid()
    .replace(/-/g, "")
    .slice(0, 4)
    .toUpperCase();

  return `ORD-${date}-${suffix}`;
}

function generateOrderItemId_() {
  return (
    "ITEM-" +
    Utilities
      .getUuid()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()
  );
}

function generateBatchId_(timezone) {
  const date = Utilities.formatDate(
    new Date(),
    timezone,
    "yyMMdd"
  );

  const suffix = Utilities
    .getUuid()
    .replace(/-/g, "")
    .slice(0, 4)
    .toUpperCase();

  return `BATCH-${date}-${suffix}`;
}

function generateProductId_() {
  return (
    "P-" +
    Utilities
      .getUuid()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase()
  );
}

/* ==================================================
   ADMIN TOKEN
================================================== */

function createAdminToken_() {
  const properties = PropertiesService.getScriptProperties();

  let secret = properties.getProperty("ADMIN_SECRET");

  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();

    properties.setProperty(
      "ADMIN_SECRET",
      secret
    );
  }

  const payloadObject = {
    exp:
      Date.now() +
      ADMIN_SESSION_HOURS *
      60 *
      60 *
      1000,

    nonce: Utilities.getUuid()
  };

  const payload = base64WebSafe_(
    JSON.stringify(payloadObject)
  );

  const signature = sign_(payload, secret);

  return `${payload}.${signature}`;
}

function verifyAdminToken_(token) {
  try {
    const parts = String(token || "").split(".");

    if (parts.length !== 2) {
      return false;
    }

    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty("ADMIN_SECRET");

    if (!secret) {
      return false;
    }

    const expected = sign_(parts[0], secret);

    if (!safeEqual_(parts[1], expected)) {
      return false;
    }

    const decoded = Utilities
      .newBlob(
        Utilities.base64DecodeWebSafe(
          padBase64_(parts[0])
        )
      )
      .getDataAsString();

    const payload = JSON.parse(decoded);

    return Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

function sign_(text, secret) {
  const bytes = Utilities.computeHmacSha256Signature(
    text,
    secret
  );

  return Utilities
    .base64EncodeWebSafe(bytes)
    .replace(/=+$/g, "");
}

function base64WebSafe_(text) {
  return Utilities
    .base64EncodeWebSafe(text)
    .replace(/=+$/g, "");
}

function padBase64_(value) {
  let output = value;

  while (output.length % 4) {
    output += "=";
  }

  return output;
}

function safeEqual_(a, b) {
  const first = String(a || "");
  const second = String(b || "");

  if (first.length !== second.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < first.length; i++) {
    result |= first.charCodeAt(i) ^ second.charCodeAt(i);
  }

  return result === 0;
}

/* ==================================================
   REQUEST / RESPONSE
================================================== */

function parseBody_(e) {
  if (!e?.postData?.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ==================================================
   TESTS
================================================== */

function checkAdminSetup() {
  const password = PropertiesService
    .getScriptProperties()
    .getProperty("ADMIN_PASSWORD");

  if (!password) {
    throw new Error(
      "ไม่พบ ADMIN_PASSWORD ใน Script Properties"
    );
  }

  console.log("พบ ADMIN_PASSWORD แล้ว");
}

function testAdminLogin() {
  const password = PropertiesService
    .getScriptProperties()
    .getProperty("ADMIN_PASSWORD");

  console.log(JSON.stringify(loginAdmin_(password)));
}
