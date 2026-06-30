const API_URL =
"https://script.google.com/macros/s/AKfycbxg4pX79ymPteh4NAipdI_27EX8YVimlJdAT5qd35gpLQZlbGWr6TYaaWjNMqfyMGXsPQ/exec";

function generateTimeline(status) {

  const steps = [
    "ยืนยันคำสั่งซื้อ",
    "ร้านค้าส่งแล้ว",
    "ถึงโกดังจีน",
    "กำลังขนส่งมาไทย",
    "ถึงไทยแล้ว",
    "จัดส่งสำเร็จ"
  ];

  const currentIndex = steps.indexOf(status);

  let timelineHTML = '<div class="timeline">';

  steps.forEach((step, index) => {

    const isCompleted = index <= currentIndex;

    timelineHTML += `
      <div class="timeline-step ${isCompleted ? 'active' : ''}">
        ${isCompleted ? '✓' : '○'} ${step}
      </div>
    `;
  });

  timelineHTML += '</div>';

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

  results.innerHTML = "กำลังค้นหา...";

  try {

    const response =
      await fetch(`${API_URL}?customerId=${customerId}`);

    const data =
      await response.json();

    if (data.length === 0) {

      results.innerHTML = `
        <div class="not-found">
          ไม่พบ Customer ID นี้
        </div>
      `;

      return;
    }

    let html = "";

    data.forEach(item => {

      html += `
      <div class="card">

        <img
          src="${item.imageUrl}"
          alt="${item.productName}"
          onerror="this.src='https://placehold.co/600x600?text=No+Image'"
        >

        <div class="content">

          <div class="product-name">
            ${item.productName}
          </div>

          <div class="info">
            จำนวน : ${item.qty}
          </div>

          <div class="status">
            ${item.status}
          </div>

          <div class="info">
            Tracking : ${item.tracking || "-"}
          </div>

          <div class="info">
            หมายเหตุ : ${item.remark || "-"}
          </div>

          <div class="info">
            อัปเดตล่าสุด :
            ${new Date(item.updateDate).toLocaleDateString("th-TH")}
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