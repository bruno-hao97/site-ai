export const paymentEn = {
  'payment.title': 'Payment',
  'payment.close': 'Close',
  'payment.tabsAria': 'Payment method',
  'payment.tab.qr': 'Scan QR code',
  'payment.tab.transfer': 'Bank transfer',
  'payment.qrLoading': 'Generating QR code…',
  'payment.qrAlt': 'Payment QR code for {{planName}}',
  'payment.qrFrameTitle': 'QR payment {{planName}}',
  'payment.noQr': 'No QR code for this transaction.',
  'payment.accountNumber': 'Account number',
  'payment.amount': 'Amount',
  'payment.content': 'Transfer note',
  'payment.transferNote': 'Note: enter exactly',
  'payment.transferNoteSuffix': 'when transferring',
  'payment.noTransfer': 'No bank transfer info for this transaction.',
  'payment.footPrefix': 'After successful payment you can visit the',
  'payment.accountLink': 'account management page',
  'payment.copied': 'Copied',
  'payment.copy': 'Copy',
} as const;

export type PaymentKeys = keyof typeof paymentEn;
