export const FAQ_ITEMS = [
  {
    q: 'Credits hoạt động như thế nào?',
    a: 'Mỗi plan mở quyền truy cập model và hạn mức theo ngày/tháng. Khi chạy model tính theo credit, hệ thống sẽ trừ trực tiếp vào quota/credit của gói.',
  },
  {
    q: 'Gói có tự gia hạn không?',
    a: 'Tùy phương thức thanh toán trên cổng nạp. Bạn nên hiển thị trạng thái gia hạn ở trang tài khoản để người dùng kiểm soát.',
  },
  {
    q: 'Tôi có thể đổi gói sau khi mua?',
    a: 'Có. Bạn có thể xử lý theo rule nội bộ: nâng cấp thì cộng phần còn lại, hạ cấp thì áp dụng từ chu kỳ tiếp theo.',
  },
  {
    q: 'Các gói unlimited hoạt động ra sao?',
    a: 'Unlimited thường áp dụng cho quota chính (video/image) nhưng vẫn giới hạn concurrent, queue và loại model để giữ ổn định hạ tầng.',
  },
] as const;
