import CryptoJS from 'crypto-js';

/**
 * License Configuration - HMAC-SHA256 Validation
 * 
 * HOW TO USE:
 * 1. Generate key using: node scripts/generateLicense.js 30
 * 2. Set environment variable: export VITE_LICENSE_KEY="<generated-key>"
 * 3. Build: npm run build:prod
 * 4. Key format: "YYYY-MM-DD|signature|v1"
 */

// Secret key - CHANGE THIS! Keep it safe and secret
const SECRET_KEY = process.env.VITE_LICENSE_SECRET || 'devtools-pro-secret-key-2025';

/**
 * Convert CryptoJS HmacSHA256 to hex string (to match Node.js crypto.createHmac)
 */
function hmacSha256(message, secret) {
  // CryptoJS.HmacSHA256 returns WordArray, convert to hex
  const hmac = CryptoJS.HmacSHA256(message, secret);
  return hmac.toString(CryptoJS.enc.Hex);
}

// License key from environment or embedded
export const LICENSE_CONFIG = {
  // Get from environment variable VITE_LICENSE_KEY
  KEY: import.meta.env.VITE_LICENSE_KEY || '',
  
  // Enable/disable license check
  ENABLED: import.meta.env.VITE_LICENSE_ENABLED !== 'false',
  
  // Allowed domains (empty = all domains allowed)
  ALLOWED_DOMAINS: [],
  
  // Secret key for verification
  SECRET: SECRET_KEY
};

// Debug log
console.log('📋 License Config Loaded:', {
  keyExists: !!LICENSE_CONFIG.KEY,
  keyPreview: LICENSE_CONFIG.KEY ? LICENSE_CONFIG.KEY.substring(0, 30) + '...' : 'NO KEY',
  enabled: LICENSE_CONFIG.ENABLED,
  secret: LICENSE_CONFIG.SECRET,
  env_var: import.meta.env.VITE_LICENSE_KEY
});

/**
 * Verify license key signature
 * @param {string} licenseKey - Format: "YYYY-MM-DD|signature|v1"
 * @returns {object} { isValid, expiryDate, daysLeft, error }
 */
export const verifyLicenseKey = (licenseKey) => {
  try {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return { isValid: false, error: 'No license key provided' };
    }

    const parts = licenseKey.split('|');
    
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid license format' };
    }

    const [expiryDateStr, signature, version] = parts;

    if (version !== 'v1') {
      return { isValid: false, error: 'Unsupported license version' };
    }

    // Verify HMAC signature
    const data = `${expiryDateStr}|${version}`;
    const expectedSignature = hmacSha256(data, LICENSE_CONFIG.SECRET);

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'Invalid license signature (tampered)' };
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(expiryDateStr)) {
      return { isValid: false, error: 'Invalid expiry date format' };
    }

    // Check expiry
    const expiryDate = new Date(expiryDateStr);
    const today = new Date();
    
    // Set time to midnight for fair comparison
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(23, 59, 59, 999);

    const timeLeft = expiryDate - today;
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

    if (timeLeft < 0) {
      return {
        isValid: false,
        expiryDate: expiryDateStr,
        daysLeft: 0,
        error: `License expired on ${expiryDateStr}`
      };
    }

    return {
      isValid: true,
      expiryDate: expiryDateStr,
      daysLeft
    };
  } catch (err) {
    return { isValid: false, error: `License verification failed: ${err.message}` };
  }
};

/**
 * Check if current license is valid
 */
export const isLicenseValid = () => {
  if (!LICENSE_CONFIG.ENABLED) return true;
  
  if (!LICENSE_CONFIG.KEY) {
    console.warn('⚠️ No license key found. Set VITE_LICENSE_KEY environment variable.');
    return false;
  }

  const verification = verifyLicenseKey(LICENSE_CONFIG.KEY);
  
  if (!verification.isValid) {
    console.error('❌ License verification failed:', verification.error);
    return false;
  }

  // Check domain if configured
  if (LICENSE_CONFIG.ALLOWED_DOMAINS.length > 0) {
    const currentDomain = window.location.hostname;
    const isDomainAllowed = LICENSE_CONFIG.ALLOWED_DOMAINS.includes(currentDomain);
    
    if (!isDomainAllowed) {
      console.error(`❌ Domain ${currentDomain} not allowed`);
      return false;
    }
  }

  return true;
};

/**
 * Get license information
 */
export const getLicenseInfo = () => {
  const verification = verifyLicenseKey(LICENSE_CONFIG.KEY);

  return {
    key: LICENSE_CONFIG.KEY,
    expiryDate: verification.expiryDate || 'Unknown',
    daysLeft: verification.daysLeft || 0,
    isValid: verification.isValid,
    isExpired: !verification.isValid && verification.error?.includes('expired'),
    error: verification.error || null
  };
};
