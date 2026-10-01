export const sampleLeft = {
  service: 'payments',
  version: 3,
  environment: 'production',
  features: { retry: true, timeout: 30, audit: false },
  limits: { requests: 1200, burst: 60, dailyQuota: 100000 },
  regions: ['ap-south-1', 'eu-west-1'],
  database: {
    engine: 'postgresql',
    pool: { min: 5, max: 20, idleTimeout: 30000 },
    ssl: true,
    readReplica: { enabled: false, region: 'eu-west-1' },
  },
  cache: { enabled: true, ttl: 300, prefix: 'payments:v3', legacyMode: true },
  endpoints: [
    { path: '/payments', method: 'POST', timeout: 5000, auth: true },
    { path: '/refunds', method: 'POST', timeout: 5000, auth: true },
    { path: '/health', method: 'GET', timeout: 1000, auth: false },
  ],
  notifications: {
    email: { enabled: true, recipients: ['ops@example.com', 'finance@example.com'] },
    webhook: null,
  },
  security: {
    allowedOrigins: ['https://app.example.com', 'https://admin.example.com'],
    session: { ttl: 3600, refresh: true },
    apiKeyRotation: 90,
  },
  logging: { level: 'info', format: 'json', sampling: 0.5, destinations: ['stdout', 'file'] },
  metadata: { owner: 'platform', tags: ['critical', 'billing'], description: '支付服务配置', deprecated: false },
}

export const sampleRight = {
  service: 'payments',
  version: '3',
  environment: 'production',
  features: { retry: true, timeout: 45, trace: true },
  limits: { requests: 1500, burst: 60, dailyQuota: 100000 },
  regions: ['ap-south-1', 'eu-central-1', 'us-east-1'],
  database: {
    engine: 'postgresql',
    pool: { min: 5, max: 40, idleTimeout: 30000 },
    ssl: { enabled: true, verifyCertificate: true },
    readReplica: { enabled: true, region: 'eu-west-1' },
  },
  cache: { enabled: true, ttl: 600, prefix: 'payments:v3', compression: true },
  endpoints: [
    { path: '/payments', method: 'POST', timeout: 8000, auth: true },
    { path: '/refunds', method: 'POST', timeout: 5000, auth: true, rateLimit: 100 },
    { path: '/health', method: 'GET', timeout: 1000, auth: false },
    { path: '/metrics', method: 'GET', timeout: 2000, auth: true },
  ],
  notifications: {
    email: { enabled: true, recipients: ['ops@example.com'] },
    webhook: { url: 'https://hooks.example.com/payments', retries: 3 },
  },
  security: {
    allowedOrigins: ['https://app.example.com', 'https://admin.example.com'],
    session: { ttl: 7200, refresh: true },
    apiKeyRotation: '90d',
  },
  logging: { level: 'warn', format: 'json', sampling: 1, destinations: ['stdout'] },
  metadata: { owner: 'platform', tags: ['critical', 'billing', 'v3'], description: '支付与退款服务配置' },
}

export const sampleLeftText = JSON.stringify(sampleLeft, null, 2)
export const sampleRightText = JSON.stringify(sampleRight, null, 2)
