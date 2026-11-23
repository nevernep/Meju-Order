MEJU ORDER - BATCH STATUS SYSTEM

โครงสร้างเว็บ
- /                 หน้าลูกค้า
- /admin/           หน้าแอดมิน
- apps-script/Code.gs  โค้ด Google Apps Script (ไม่ต้องอัปโหลดขึ้น Netlify)

==================================================
1) สำรองข้อมูลเดิมก่อน
==================================================

ระบบใหม่นี้ใช้ 3 ชีต:
- Orders
- OrderItems
- Batches
- Products (สินค้าหน้าร้านพร้อมส่ง)

ถ้า Google Sheet เดิมมีชีตชื่อ Orders ที่เป็นโครงสร้างเก่า
ให้เปลี่ยนชื่อชีตเดิมเป็น Orders_Old ก่อน
เพื่อป้องกันข้อมูลเสียหาย

==================================================
2) ตั้งค่า Apps Script
==================================================

วาง Code.gs ใหม่ทั้งหมดจาก:
apps-script/Code.gs

จากนั้นตั้ง Script Properties:

ADMIN_PASSWORD = รหัสผ่านแอดมินของคุณ

ถ้า Apps Script ไม่ได้ผูกกับ Google Sheet โดยตรง ให้เพิ่ม:
SPREADSHEET_ID = ID ของ Google Sheet

จากนั้นเลือกฟังก์ชัน:
setupMejuSystem

กด Run 1 ครั้ง

ระบบจะสร้างชีตและหัวคอลัมน์ดังนี้:

Orders
OrderID | Phone | Payment | Remark | UpdateDate

OrderItems
OrderItemID | OrderID | Phone | ProductID | ProductName | Qty | BatchID | StatusOverride | TrackingOverride | UpdateDate

Batches
BatchID | ProductID | BatchName | Status | Tracking | UpdateDate

Products
ProductID | ProductName | Brand | Category (legacy) | Price | Status | Stock | ImageURL | Description | UpdateDate | Colors | Sizes

หมายเหตุ:
- หน้าร้านจะแสดงเฉพาะ Products ที่ Status = พร้อมส่ง และ Stock มากกว่า 0
- สินค้าที่เป็น พรีออเดอร์ หรือ สินค้าหมด จะไม่แสดงใน Shop
- เพิ่ม แก้ไข ลบสินค้าได้จาก Admin > สินค้าพร้อมส่ง
- ImageURL ต้องเป็นลิงก์รูปภาพที่เปิดดูได้จากเว็บ
- Colors และ Sizes ให้กรอกหลายค่าโดยคั่นด้วยเครื่องหมายจุลภาค เช่น `Cream, Brown, Pink` และ `Free size, S, M`

==================================================
3) Deploy Apps Script
==================================================

Deploy
> Manage deployments
> Edit
> New version
> Execute as: Me
> Who has access: Anyone
> Deploy

คัดลอก URL ที่ลงท้ายด้วย /exec

==================================================
4) ตั้งค่า config.js
==================================================

เปิด config.js แล้วใส่ URL จริง:

window.MEJU_CONFIG = Object.freeze({
  API_URL: "https://script.google.com/macros/s/xxxx/exec",
  LINE_OA_ID: "@703ocmqz"
});

==================================================
5) ทดสอบระบบ
==================================================

ทดสอบตามลำดับนี้:

1. เปิด /admin/
2. Login
3. ไปที่แท็บ "สินค้าพร้อมส่ง" แล้วเพิ่มสินค้า
4. ตรวจสอบหรือแก้ไขชื่อ ราคา สต๊อก สี ไซซ์ และลิงก์รูปได้จากแท็บนี้
5. เพิ่ม Batch เช่น:
   Mido banana รอบ 7/7
6. เพิ่มออเดอร์
7. เพิ่มรายการสินค้า
8. เลือก Batch ให้สินค้า
9. บันทึก
10. เปิดหน้าลูกค้าเพื่อดูสินค้าพร้อมส่ง
11. ค้นหาด้วยเบอร์โทร
12. กลับ Admin > รอบสินค้า
13. เปลี่ยนสถานะ Batch
14. กด "อัปเดตทั้งรอบ"
15. กลับหน้าลูกค้าและค้นหาใหม่

สถานะของลูกค้าทุกคนที่ผูก Batch เดียวกันจะเปลี่ยนพร้อมกัน

==================================================
6) Status Override
==================================================

ปกติปล่อย Status Override ว่าง
ระบบจะใช้สถานะจาก Batch

ใช้ Override เฉพาะกรณีพิเศษ เช่น:
- รอตรวจสอบสินค้า
- สินค้ามีปัญหา
- แยกจัดส่ง

สถานะที่แสดง:
StatusOverride ถ้ามี
ไม่งั้นใช้ Batch Status

Tracking ก็ใช้หลักเดียวกัน:
TrackingOverride ถ้ามี
ไม่งั้นใช้ Tracking ของ Batch

==================================================
7) ขึ้น Netlify
==================================================

อัปโหลดโฟลเดอร์นี้ทั้งโฟลเดอร์ขึ้น Netlify

หน้าลูกค้า:
https://ชื่อเว็บ.netlify.app/

หน้าแอดมิน:
https://ชื่อเว็บ.netlify.app/admin/
