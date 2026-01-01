// Environment configuration
export const envConfig = {
  development: {
    appName: 'DevTools Pro (Dev)',
    apiUrl: 'http://localhost:3000',
    enableDebug: true,
    logLevel: 'debug',
  },
  staging: {
    appName: 'DevTools Pro (Stg)',
    apiUrl: 'https://api-stg.devtools.pro',
    enableDebug: true,
    logLevel: 'info',
  },
  production: {
    appName: 'DevTools Pro',
    apiUrl: 'https://api.devtools.pro',
    enableDebug: false,
    logLevel: 'error',
  },
}

export const currentEnv = import.meta.env.VITE_ENVIRONMENT || 'development'
export const config = envConfig[currentEnv] || envConfig.development
