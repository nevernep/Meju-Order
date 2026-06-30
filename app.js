const API_URL =
"https://script.google.com/macros/s/AKfycbwlP_cg6nY1vR533frvpC4Rns57IgOqhzj2JMb2KV33jmXWuOsuWVQdIuzQa1GUQ_w2ag/exec";

function generateTimeline(status) {

  const steps = [
    "ยืนยันคำสั่งซื้อ",
    "ร้านค้าส่งแล้ว",
    "ถึงโกดังจีน",
    "กำลังขนส่งมาไทย",
    "ถึงไทยแล้ว",
    "จัดส่งสำเร็จ"
  ];

  const icons = [
    "🛒",
    "📦",
    "🏢",
    "🚚",
    "🇹🇭",
    "🎉"
  ];

  const currentIndex = steps.indexOf(status);

  let timelineHTML = `<div class="timeline">`;

  steps.forEach((step, index) => {

    const isCompleted = index <= currentIndex;

    timelineHTML += `
      <div class="timeline-step ${isCompleted ? "active" : ""}">
        ${isCompleted ? icons[index] : "⚪"}
        ${step}
      </div>
    `;
  });

  timelineHTML += `</div>`;

  return timelineHTML;
}

async function searchOrder() {

  const customerId =
    document.getElementById("customerId").value.trim();

  const results =
    document.getElementById("results");

  if (!customerId) {
    alert("กรุณากรอก Customer ID");
    return;
  }

  results.innerHTML = `
    <div class="loading">
      กำลังค้นหาข้อมูล...
    </div>
  `;

  try {

    const response =
      await fetch(`${API_URL}?customerId=${customerId}`);

    const data =
      await response.json();

    if (!data.length) {

      results.innerHTML = `
        <div class="not-found">
          <h3>ไม่พบ Customer ID นี้</h3>
          <p>กรุณาตรวจสอบอีกครั้ง</p>
        </div>
      `;

      return;
    }

    let html = "";

    data.forEach(item => {

      const paymentBadge =
        item.payment === "ชำระเต็มจำนวน"
          ? `<span class="badge badge-paid">💚 ชำระเต็มจำนวน</span>`
          : `<span class="badge badge-deposit">🧡 มัดจำ</span>`;

      html += `
<div class="order-card">

  <div class="product-section">

    <img
      class="product-image"
      src="${item.imageUrl}"
      alt="${item.productName}"
      onerror="this.src='https://placehold.co/400x400?text=No+Image'"
    >

    <div class="payment-card">

      <div class="payment-title">
        การชำระเงิน ♡
      </div>

      <div class="payment-status">
        ${
          item.payment === "ชำระเต็มจำนวน"
            ? "ชำระเต็มแล้ว ✓"
            : "มัดจำแล้ว ✓"
        }
      </div>

      <div class="payment-amount">
        ${item.amount || "-"}
      </div>

    </div>

  </div>

  <div class="detail-section">

    <div class="top-bar">

      <h2>${item.productName}</h2>

      <div class="update-box">
        📅 ${item.updateDate || "-"}
      </div>

    </div>

    <div class="qty-box">
      จำนวน : ${item.qty} ชิ้น
    </div>

    <div class="status-badge">
      📦 ${item.status}
    </div>

    <div class="info-grid">

      <div class="info-item">
        🚚 Tracking :
        ${item.tracking || "-"}
      </div>

      <div class="info-item">
        💬 หมายเหตุ :
        ${item.remark || "-"}
      </div>

    </div>

    ${generateTimeline(item.status)}

  </div>

</div>
`;
    });

    results.innerHTML = html;

  } catch (error) {

    console.error(error);

    results.innerHTML = `
      <div class="not-found">
        เกิดข้อผิดพลาดในการเชื่อมต่อระบบ
      </div>
    `;
  }
}