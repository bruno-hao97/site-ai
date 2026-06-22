import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  gommo: {
    baseUrl: process.env.GOMMO_API_BASE_URL || process.env.GOMMO_BASE_URL || 'https://v2.api.gommo.net',
    authBaseUrl: process.env.GOMMO_AUTH_BASE_URL || 'https://api.gommo.net',
    authPath: process.env.GOMMO_AUTH_PATH || '/api/apps/go-mmo',
    accessToken: process.env.GOMMO_ACCESS_TOKEN || '',
    domain: process.env.GOMMO_DOMAIN || '79ai.net',
    projectId: process.env.GOMMO_PROJECT_ID || 'default',
  },
  credits: {
    signupBonus: Number(process.env.SIGNUP_BONUS_CREDITS) || 1000,
    imageJobCost: Number(process.env.IMAGE_JOB_COST) || 10,
    videoJobCost: Number(process.env.VIDEO_JOB_COST) || 25,
    audioJobCost: Number(process.env.AUDIO_JOB_COST) || 8,
    musicJobCost: Number(process.env.MUSIC_JOB_COST) || 15,
    lipsyncJobCost: Number(process.env.LIPSYNC_JOB_COST) || 30,
  },
  dbPath: process.env.DB_PATH || 'data/app.db',
  topup: {
    allowMock: process.env.ALLOW_MOCK_TOPUP !== 'false',
    firstTopupBonusPercent: Number(process.env.FIRST_TOPUP_BONUS_PERCENT) || 10,
    packages: [
      { id: 'starter', name: 'Starter', credits: 100, priceVnd: 49000, popular: false },
      { id: 'pro', name: 'Pro', credits: 500, priceVnd: 199000, popular: true },
      { id: 'mega', name: 'Mega', credits: 1200, priceVnd: 399000, popular: false },
    ],
  },
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  passwordReset: {
    expiresHours: Number(process.env.PASSWORD_RESET_EXPIRES_HOURS) || 1,
    devReturnLink: process.env.DEV_RETURN_RESET_LINK !== 'false',
  },
};
