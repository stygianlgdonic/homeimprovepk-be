export default () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  otp: {
    stub: process.env.OTP_STUB === 'true',
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  payments: {
    jazzCashStub: process.env.JAZZCASH_STUB === 'true',
    easypaisaStub: process.env.EASYPAISA_STUB === 'true',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});
