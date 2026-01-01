#!/usr/bin/env node

/**
 * License Key Generator
 * 
 * Usage:
 * node generateLicense.js                    # Default: 30 days from today
 * node generateLicense.js 60                 # 60 days from today
 * node generateLicense.js --date 2026-02-28  # Specific date
 * 
 * Output: License key to use in your app
 */

import crypto from 'crypto';

// ⚠️ CHANGE THIS TO YOUR SECRET KEY (keep it safe!)
// Must match the SECRET_KEY in fe/src/config/licenseConfig.js
const SECRET_KEY = process.env.LICENSE_SECRET || 'devtools-pro-secret-key-2025';

/**
 * Generate license key with expiry date
 * @param {Date|string} expiryDate - When license expires
 * @returns {string} Signed license key
 */
function generateLicense(expiryDate) {
  // Format: expiryDate|signature|version
  const expiry = typeof expiryDate === 'string' 
    ? expiryDate 
    : expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const data = `${expiry}|v1`;
  
  // Create HMAC-SHA256 signature (hex format to match CryptoJS output)
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');

  // Final license key format: expiry|signature|version
  const licenseKey = `${expiry}|${signature}|v1`;
  
  return licenseKey;
}

/**
 * Verify license key
 * @param {string} licenseKey - License key to verify
 * @returns {object} { isValid, expiryDate, daysLeft, error }
 */
function verifyLicense(licenseKey) {
  try {
    const parts = licenseKey.split('|');
    
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid license format' };
    }

    const [expiryDateStr, signature, version] = parts;

    if (version !== 'v1') {
      return { isValid: false, error: 'Unsupported license version' };
    }

    // Verify signature
    const data = `${expiryDateStr}|${version}`;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(data)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'Invalid license signature (tampered)' };
    }

    // Check expiry date
    const expiryDate = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const daysLeft = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { 
        isValid: false, 
        expiryDate: expiryDateStr,
        daysLeft,
        error: 'License expired' 
      };
    }

    return {
      isValid: true,
      expiryDate: expiryDateStr,
      daysLeft
    };
  } catch (err) {
    return { isValid: false, error: err.message };
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  let daysFromNow = 30; // Default: 30 days
  let expiryDate = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      expiryDate = new Date(args[i + 1]);
      i++;
    } else if (!isNaN(parseInt(args[i]))) {
      daysFromNow = parseInt(args[i]);
    }
  }

  // Calculate expiry date if not provided
  if (!expiryDate) {
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);
  }

  // Generate license
  const licenseKey = generateLicense(expiryDate);
  
  // Format output
  console.log('\n' + '='.repeat(70));
  console.log('📜 LICENSE KEY GENERATED');
  console.log('='.repeat(70));
  console.log(`\n📅 Expiry Date: ${expiryDate.toISOString().split('T')[0]}`);
  console.log(`⏰ Days Valid: ${Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24))}`);
  console.log('\n🔑 LICENSE KEY (copy entire line):');
  console.log('─'.repeat(70));
  console.log(licenseKey);
  console.log('─'.repeat(70));
  console.log('\n✅ Usage:');
  console.log('export VITE_LICENSE_KEY="' + licenseKey + '"');
  console.log('\nOr in one command:');
  console.log('VITE_LICENSE_KEY="' + licenseKey + '" npm run build:prod');
  console.log('\n' + '='.repeat(70));
  
  // Verify the generated key
  console.log('\n🔍 Verifying generated key...');
  const verification = verifyLicense(licenseKey);
  console.log('✅ Verification result:', verification);
  console.log('');
}

main();

export { generateLicense, verifyLicense };
