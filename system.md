## Ranh giới hệ thống (System Boundary):

**Hệ thống quản lý bán hàng và vận hành nội bộ quán gà/vịt**

- Quản lý đơn hàng (order)
- Quản lý đặt gà cúng (reservation)
- Quản lý kho (inventory)
- Quản lý khách hàng (customer)
- Thanh toán & in hóa đơn
- Báo cáo doanh thu

## Các Tác nhân (Actors)

- **Chủ quán (Primary Actor):**  
   Quản lý toàn bộ hệ thống, thực đơn, kho, xem báo cáo doanh thu, tạo voucher.
- **Nhân viên phụ quán:**  
   Ghi nhận đơn hàng, thanh toán, quản lý đơn đặt gà cúng, phục vụ khách.
- **Khách hàng:**  
   Đặt món, đặt gà cúng, thanh toán, nhận hóa đơn, tích điểm, sử dụng voucher.
- **Shipper:**  
   Nhận đơn giao hàng và cập nhật trạng thái giao hàng.


## Đặc tả Use case

**UC-01: Đăng nhập**

- **Mô tả:** Xác thực thông tin người dùng để truy cập hệ thống.
- **Actor:** Người dùng hệ thống
- **Trigger:** Mở ứng dụng và chọn đăng nhập
- **Tiền điều kiện:** Có tài khoản hợp lệ
- **Hậu điều kiện:** Vào màn hình chính
- **Normal Flow:**

1.  Nhập tài khoản, mật khẩu
2.  Hệ thống kiểm tra
3.  Hiển thị màn hình chính

- **Alternative:** Sai thông tin → báo lỗi

**UC-02: Quản lý thực đơn**

- **Mô tả:** Thêm/sửa/xóa món ăn
- **Actor:** Chủ quán
- **Trigger:** Chọn chức năng quản lý menu
- **Tiền điều kiện:** Đã đăng nhập
- **Hậu điều kiện:** Menu được cập nhật
- **Normal Flow:**

1.  Chọn thêm/sửa/xóa
2.  Nhập thông tin
3.  Lưu

- **Alternative:** Dữ liệu không hợp lệ

**UC-03: Tạo đơn hàng**

- **Mô tả:** Tạo đơn cho khách
- **Actor:** Nhân viên, Khách hàng
- **Trigger:** Chọn đặt món
- **Tiền điều kiện:** Đã đăng nhập
- **Hậu điều kiện:** Đơn được tạo
- **Normal Flow:**

1.  Chọn món
2.  Nhập số lượng
3.  Xác nhận

- **Alternative:** Hết món

**UC-04: Cập nhật đơn hàng**

- **Mô tả:** Sửa đơn hàng
- **Actor:** Nhân viên
- **Trigger:** Chọn đơn cần sửa
- **Tiền điều kiện:** Đơn tồn tại
- **Hậu điều kiện:** Đơn được cập nhật
- **Normal Flow:**

1.  Chọn đơn
2.  Sửa thông tin
3.  Lưu

- **Alternative:** Không tìm thấy đơn

**UC-05: Thanh toán**

- **Mô tả:** Xử lý thanh toán đơn
- **Actor:** Nhân viên, Khách hàng
- **Trigger:** Chọn thanh toán
- **Tiền điều kiện:** Có đơn hợp lệ
- **Hậu điều kiện:** Đơn hoàn tất
- **Normal Flow:**

1.  Chọn phương thức
2.  Xác nhận
3.  Hoàn tất

- **Alternative:** Thanh toán thất bại

**UC-06: In hóa đơn**

- **Mô tả:** Xuất hóa đơn
- **Actor:** Nhân viên
- **Trigger:** Sau thanh toán
- **Tiền điều kiện:** Thanh toán thành công
- **Hậu điều kiện:** Hóa đơn được in
- **Normal Flow:**

1.  Gửi lệnh in
2.  In hóa đơn

- **Alternative:** Lỗi máy in

**UC-07: Quản lý đặt gà cúng**

- **Mô tả:** Lưu đơn đặt trước
- **Actor:** Nhân viên
- **Trigger:** Khách đặt trước
- **Tiền điều kiện:** Có thông tin khách
- **Hậu điều kiện:** Lưu đơn đặt
- **Normal Flow:**

1.  Nhập thông tin
2.  Lưu

- **Alternative:** Thiếu thông tin

**UC-08: Quản lý kho**

- **Mô tả:** Theo dõi tồn kho
- **Actor:** Chủ quán
- **Trigger:** Chọn quản lý kho
- **Tiền điều kiện:** Đã đăng nhập
- **Hậu điều kiện:** Kho cập nhật
- **Normal Flow:**

1.  Nhập/xem dữ liệu
2.  Lưu

- **Alternative:** Sai dữ liệu

**UC-09: Quản lý khách hàng**

- **Mô tả:** Lưu thông tin khách
- **Actor:** Chủ quán
- **Trigger:** Thêm khách
- **Tiền điều kiện:** Đã đăng nhập
- **Hậu điều kiện:** Lưu thành công
- **Normal Flow:**

1.  Nhập thông tin
2.  Lưu

- **Alternative:** Trùng dữ liệu

**UC-10: Tích điểm**

- **Mô tả:** Cộng điểm cho khách
- **Actor:** Hệ thống
- **Trigger:** Sau thanh toán
- **Tiền điều kiện:** Có tài khoản khách
- **Hậu điều kiện:** Điểm tăng
- **Normal Flow:**

1.  Tính điểm
2.  Cộng điểm

- **Alternative:** Lỗi hệ thống

**UC-11: Quản lý voucher**

- **Mô tả:** Tạo/sửa voucher
- **Actor:** Chủ quán
- **Trigger:** Chọn quản lý voucher
- **Tiền điều kiện:** Đã đăng nhập
- **Hậu điều kiện:** Voucher cập nhật
- **Normal Flow:**

1.  Nhập thông tin
2.  Lưu

- **Alternative:** Sai dữ liệu

**UC-12: Áp dụng voucher**

- **Mô tả:** Áp dụng giảm giá
- **Actor:** Khách hàng, Nhân viên
- **Trigger:** Nhập mã voucher
- **Tiền điều kiện:** Voucher hợp lệ
- **Hậu điều kiện:** Giảm giá đơn
- **Normal Flow:**

1.  Nhập mã
2.  Kiểm tra
3.  Áp dụng

- **Alternative:** Mã sai/hết hạn

**UC-13: Xem báo cáo doanh thu**

- **Mô tả:** Xem doanh thu
- **Actor:** Chủ quán
- **Trigger:** Chọn báo cáo
- **Tiền điều kiện:** Có dữ liệu
- **Hậu điều kiện:** Hiển thị báo cáo
- **Normal Flow:**

1.  Chọn thời gian
2.  Xem báo cáo

- **Alternative:** Không có dữ liệu

**UC-14: Thống kê bán hàng**

- **Mô tả:** Xem món bán chạy
- **Actor:** Chủ quán
- **Trigger:** Chọn thống kê
- **Tiền điều kiện:** Có dữ liệu
- **Hậu điều kiện:** Hiển thị thống kê
- **Normal Flow:**

1.  Chọn tiêu chí
2.  Hiển thị

- **Alternative:** Không có dữ liệu

**UC-15: Giao hàng**

- **Mô tả:** Giao đơn cho khách
- **Actor:** Shipper
- **Trigger:** Nhận đơn
- **Tiền điều kiện:** Có đơn giao
- **Hậu điều kiện:** Cập nhật trạng thái
- **Normal Flow:**

1.  Nhận đơn
2.  Giao hàng
3.  Cập nhật trạng thái

- **Alternative:** Giao thất bại
