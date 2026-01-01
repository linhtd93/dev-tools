/**
 * License Validation Logic
 */

import { LICENSE_CONFIG, isLicenseValid, getLicenseInfo } from '../config/licenseConfig';

export const checkAndEnforceLicense = () => {
  if (!LICENSE_CONFIG.ENABLED) return true;
  
  const licenseInfo = getLicenseInfo();
  
  // Debug logging
  console.log('🔐 License Check:', {
    enabled: LICENSE_CONFIG.ENABLED,
    key: licenseInfo.key ? licenseInfo.key.substring(0, 20) + '...' : 'NO KEY',
    isValid: licenseInfo.isValid,
    error: licenseInfo.error,
    expiryDate: licenseInfo.expiryDate,
    daysLeft: licenseInfo.daysLeft
  });
  
  if (!licenseInfo.isValid) {
    // License không hợp lệ - tắt app
    console.error('❌ License invalid, disabling app:', licenseInfo.error);
    disableApp(licenseInfo);
    return false;
  }
  
  console.log('✅ License valid, app running');
  
  // Cảnh báo nếu sắp hết hạn (dưới 7 ngày)
  if (licenseInfo.daysLeft < 7 && licenseInfo.daysLeft > 0) {
    console.warn('⚠️ License expiring soon:', licenseInfo.daysLeft, 'days');
    showExpiryWarning(licenseInfo);
  }
  
  return true;
};

const disableApp = (licenseInfo) => {
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 500px;
        text-align: center;
      ">
        <div style="
          font-size: 48px;
          margin-bottom: 20px;
        ">🔒</div>
        
        <h1 style="
          margin: 0 0 10px 0;
          color: #333;
          font-size: 24px;
        ">
          ${licenseInfo.isExpired ? 'License Hết Hạn' : 'License Không Hợp Lệ'}
        </h1>
        
        <p style="
          color: #666;
          margin: 0 0 20px 0;
          line-height: 1.6;
        ">
          ${licenseInfo.isExpired 
            ? `Bản này được phép sử dụng đến <strong>${licenseInfo.expiryDate}</strong>`
            : `Domain hoặc license không hợp lệ`
          }
        </p>
        
        <div style="
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: left;
          font-family: monospace;
          font-size: 12px;
        ">
          <p style="margin: 0 0 10px 0;"><strong>License Info:</strong></p>
          <p style="margin: 0; word-break: break-all;">Key: ${licenseInfo.key || 'N/A'}</p>
          <p style="margin: 5px 0;">Expiry: ${licenseInfo.expiryDate || 'Unknown'}</p>
          <p style="margin: 5px 0;">Days Left: ${licenseInfo.daysLeft || 0}</p>
          ${licenseInfo.error ? `<p style="margin: 5px 0; color: red;">Error: ${licenseInfo.error}</p>` : ''}
        </div>
        
        <p style="
          color: #999;
          margin: 0;
          font-size: 12px;
        ">
          Liên hệ quản trị viên để gia hạn license
        </p>
      </div>
    </div>
  `;
  
  // Disable tất cả interactions
  document.addEventListener('click', (e) => e.stopImmediatePropagation(), true);
  document.addEventListener('keydown', (e) => e.preventDefault(), true);
};

const showExpiryWarning = (licenseInfo) => {
  // Tạo warning banner nếu cần
  const warning = document.createElement('div');
  warning.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ff9800;
    color: white;
    padding: 12px 20px;
    text-align: center;
    z-index: 9999;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  warning.textContent = `⚠️ License hết hạn trong ${licenseInfo.daysLeft} ngày (${licenseInfo.expiryDate})`;
  document.body.insertBefore(warning, document.body.firstChild);
};

export const validateLicenseOnDomainChange = () => {
  // Theo dõi thay đổi domain (nếu user thay đổi URL)
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!isLicenseValid()) {
        checkAndEnforceLicense();
      }
    }, 1000);
  });
};
