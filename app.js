const API_URL =
"hhttps://script.google.com/macros/s/AKfycbwlP_cg6nY1vR533frvpC4Rns57IgOqhzj2JMb2KV33jmXWuOsuWVQdIuzQa1GUQ_w2ag/exec";

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

  const currentIndex =
    steps.indexOf(status);

  let html =
    '<div class="timeline">';

  steps.forEach((step, index) => {

    const active =
      index <= currentIndex;

    html += `
      <div class="timeline-step ${active ? "active" : ""}">
        ${active ? icons[index] : "⚪"} ${step}
      </div>
    `;

  });

  html += "</div>";

  return html;
}

async function searchOrder() {

  const customerId =
    document
      .getElementById("customerId")
      .value
      .trim();

  const results =
    document.getElementById("results");

  if (!customerId) {

    alert("กรุณากรอก Customer ID");
    return;
  }

  results.innerHTML =
    "<div class='loading'>กำลังค้นหา...</div>";

  try {

    const response =
      await fetch(
        `${API_URL}?customerId=${customerId}`
      );

    const data =
      await response.json();

    console.log(data);

    if (!data.length) {

      results.innerHTML = `
      <div class="not-found">
        ไม่พบ Customer ID นี้
      </div>
      `;

      return;
    }

    let html = "";

    data.forEach(item => {

      const payment =
        (item.payment || "").trim();

      const paymentBadge =
        payment === "ชำระเต็มจำนวน"
          ? `<div class="badge fullpaid">💚 ชำระเต็มจำนวน</div>`
          : `<div class="badge deposit">🧡 มัดจำ</div>`;

      const paymentText =
        payment === "ชำระเต็มจำนวน"
          ? "ชำระเต็มแล้ว ✓"
          : "มัดจำแล้ว ✓";

      html += `

      <div class="order-card">

        <div class="left-column">

          <img
            class="product-image"
            src="${item.imageUrl || ''}"
            alt="${item.productName}"
            onerror="this.src='https://placehold.co/400x400?text=No+Image'">

          <div class="payment-card">

            <div class="payment-title">
              การชำระเงิน ♡
            </div>

            <div class="payment-status">
              ${paymentText}
            </div>

            <div class="payment-amount">
              ${payment}
            </div>

          </div>

        </div>

        <div class="right-column">

          <div class="top-bar">

            <div>

              <div class="product-name">
                ${item.productName}
              </div>

              <div class="qty-box">
                จำนวน : ${item.qty} ชิ้น
              </div>

            </div>

            <div class="update-box">
              📅<br>
              ${item.updateDate || "-"}
            </div>

          </div>

          <div class="badges">

            <div class="badge status-badge">
              📦 ${item.status}
            </div>

            ${paymentBadge}

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