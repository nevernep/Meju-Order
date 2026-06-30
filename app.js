const API_URL =
"https://script.google.com/macros/s/AKfycbxg4pX79ymPteh4NAipdI_27EX8YVimlJdAT5qd35gpLQZlbGWr6TYaaWjNMqfyMGXsPQ/exec";

async function searchOrder() {

  const customerId =
    document.getElementById("customerId").value.trim();

  const results =
    document.getElementById("results");

  if(!customerId){
    alert("กรุณากรอก Customer ID");
    return;
  }

  results.innerHTML = "กำลังค้นหา...";

  try {

    const response =
      await fetch(`${API_URL}?customerId=${customerId}`);

    const data =
      await response.json();

    if(data.length === 0){

      results.innerHTML = `
        <div class="not-found">
          ไม่พบ Customer ID นี้
        </div>
      `;

      return;
    }

    let html = "";

    data.forEach(item=>{

html += `
<div class="card">

<img src="${item.imageUrl}" alt="">

<div class="content">

<div class="product-name">
${item.productName}
</div>

<div class="info">จำนวน : ${item.qty}</div>

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
อัปเดตล่าสุด : ${item.updateDate}
</div>

<div class="timeline">
<div class="timeline-step active">✓ สั่งซื้อแล้ว</div>
<div class="timeline-step active">✓ ร้านค้าส่งแล้ว</div>
<div class="timeline-step active">✓ ถึงโกดังจีน</div>
<div class="timeline-step">○ กำลังขนส่งมาไทย</div>
<div class="timeline-step">○ ถึงไทยแล้ว</div>
<div class="timeline-step">○ จัดส่งสำเร็จ</div>
</div>

</div>

</div>
`;
    });

    results.innerHTML = html;

  } catch(error){

    console.error(error);

    results.innerHTML = `
      <div class="not-found">
        เกิดข้อผิดพลาดในการเชื่อมต่อระบบ
      </div>
    `;
  }
}