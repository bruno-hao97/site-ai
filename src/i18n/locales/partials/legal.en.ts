export const legalEn = {
  'legal.terms.pageTitle': 'Terms of Service',
  'legal.terms.title': 'Terms of Service',
  'legal.terms.s1.title': '1. Acceptance of terms',
  'legal.terms.s1.body':
    'By registering or using {{siteName}} at {{brand}}, you agree to these terms and the privacy policy. If you do not agree, please stop using the service.',
  'legal.terms.s2.title': '2. Service & credits',
  'legal.terms.s2.item1': 'Service is billed by credits or subscription plans as shown on the pricing page.',
  'legal.terms.s2.item2':
    'Model prices and limits may change; we will notify on the website for important updates.',
  'legal.terms.s2.item3':
    'Credits used for AI tasks are non-refundable unless a system error is confirmed.',
  'legal.terms.s3.title': '3. Prohibited content',
  'legal.terms.s3.lead': 'You must not create, upload, or distribute content that:',
  'legal.terms.s3.item1': 'Is adult, pornographic, or illegal under applicable law.',
  'legal.terms.s3.item2': 'Involves gambling, fake documents, or identity fraud.',
  'legal.terms.s3.item3': 'Spreads misinformation, hate speech, or misuses government imagery.',
  'legal.terms.s3.item4': 'Violates copyright, trademarks, or third-party privacy.',
  'legal.terms.s4.title': '4. Responsibility & termination',
  'legal.terms.s4.body':
    'You are responsible for content created from your account. {{siteName}} may suspend or terminate violating accounts without refunding credits. Data may be provided to authorities as required by law.',
  'legal.privacy.pageTitle': 'Privacy Policy',
  'legal.privacy.title': 'Privacy Policy',
  'legal.privacy.s1.title': '1. Data we collect',
  'legal.privacy.s1.body':
    '{{siteName}} ({{brand}}) may collect account information (email, display name), service usage data (prompts, generation history, credits), and technical data (device, IP, access logs) to operate the platform safely.',
  'legal.privacy.s2.title': '2. How we use data',
  'legal.privacy.s2.item1': 'Provide and maintain AI services (image, video, voice, chat, API).',
  'legal.privacy.s2.item2': 'Improve experience, provide support, and contact when needed.',
  'legal.privacy.s2.item3': 'Detect fraud, abuse, or terms violations.',
  'legal.privacy.s3.title': '3. Data security',
  'legal.privacy.s3.body':
    'We apply appropriate security measures (SSL/TLS encryption, access controls) and do not sell your personal data to third parties for marketing.',
  'legal.privacy.s4.title': '4. Third-party services',
  'legal.privacy.s4.body':
    'To generate AI content, your requests may be processed through upstream providers (e.g. Google Gemini, OpenAI, Anthropic, and other catalog models). We only transmit data necessary for the task you request, per each provider\'s policy.',
} as const;

export type LegalKeys = keyof typeof legalEn;
