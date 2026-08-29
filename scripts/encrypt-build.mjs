import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('❌ Error: dist/index.html not found. Please run "vite build" first.');
  process.exit(1);
}

const password = process.env.PAGE_PASSWORD || process.argv[2] || 'nhs2025';

if (!process.env.PAGE_PASSWORD && !process.argv[2]) {
  console.log('⚠️  No PAGE_PASSWORD provided. Using default fallback password: "nhs2025"');
  console.log('💡 Tip: Set PAGE_PASSWORD="your-secret" or pass as argument to customise.');
}

console.log('🔒 Encrypting application bundle for secure GitHub Pages hosting...');

// Read original HTML
const originalHtml = fs.readFileSync(indexPath, 'utf-8');

// Generate random salt and IV
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);

// Derive 256-bit AES key using PBKDF2 (100,000 iterations, SHA-256)
const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

// Encrypt with AES-256-GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(originalHtml, 'utf-8'), cipher.final()]);
const tag = cipher.getAuthTag();

const payload = {
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  tag: tag.toString('base64'),
  ciphertext: encrypted.toString('base64'),
};

// Generate lock screen HTML
const lockScreenHtml = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Protected | NHS Wage & Shift Calculator</title>
  <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 60%, #020617 100%);
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.1);
      --primary: #005eb8;
      --primary-hover: #004b93;
      --accent: #10b981;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --danger: #ef4444;
      --radius: 16px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg-gradient);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .auth-container {
      width: 100%;
      max-width: 440px;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 2.5rem 2rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
      text-align: center;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .shake {
      animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
    }

    @keyframes shake {
      10%, 90% { transform: translate3d(-2px, 0, 0); }
      20%, 80% { transform: translate3d(3px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }

    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 14px;
      background: linear-gradient(135deg, #005eb8 0%, #003087 100%);
      color: #ffffff;
      margin-bottom: 1.25rem;
      box-shadow: 0 8px 20px rgba(0, 94, 184, 0.35);
    }

    .logo-badge svg {
      width: 30px;
      height: 30px;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }

    p.subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.45;
      margin-bottom: 1.75rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      text-align: left;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    input[type="password"],
    input[type="text"] {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 0.85rem 2.8rem 0.85rem 1rem;
      color: #fff;
      font-size: 1rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s ease;
    }

    input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
    }

    .toggle-visibility {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0.25rem;
    }

    .toggle-visibility:hover {
      color: #fff;
    }

    .options-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: -0.25rem;
    }

    .remember-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
      font-size: 0.85rem;
      text-transform: none;
      letter-spacing: normal;
    }

    .remember-label input {
      accent-color: var(--primary);
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    button[type="submit"] {
      margin-top: 0.5rem;
      background: linear-gradient(135deg, #005eb8 0%, #004b93 100%);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 0.9rem;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 94, 184, 0.4);
    }

    button[type="submit"]:hover {
      background: linear-gradient(135deg, #0069cf 0%, #0054a6 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(0, 94, 184, 0.5);
    }

    button[type="submit"]:active {
      transform: translateY(0);
    }

    button[type="submit"]:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .error-banner {
      display: none;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
      text-align: left;
    }

    .spinner {
      display: none;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .footer-badge {
      margin-top: 2rem;
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }
  </style>
</head>
<body>
  <div class="auth-container" id="authBox">
    <div class="logo-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </div>

    <h1>Authorisation Required</h1>
    <p class="subtitle">Enter your passphrase to access the NHS Wage & Shift Calculator.</p>

    <div class="error-banner" id="errorMsg">
      Incorrect passphrase. Please try again.
    </div>

    <form id="authForm">
      <div class="input-group">
        <label for="passphrase">Passphrase</label>
        <div class="input-wrapper">
          <input type="password" id="passphrase" autocomplete="current-password" required placeholder="Enter passphrase..." autofocus />
          <button type="button" class="toggle-visibility" id="toggleBtn" aria-label="Toggle password visibility">
            <svg id="eyeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>

      <div class="options-row">
        <label class="remember-label">
          <input type="checkbox" id="rememberMe" checked />
          <span>Remember on this device</span>
        </label>
      </div>

      <button type="submit" id="submitBtn">
        <span class="spinner" id="btnSpinner"></span>
        <span id="btnText">Unlock Calculator</span>
      </button>
    </form>

    <div class="footer-badge">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
      <span>Client-Side AES-256-GCM Encrypted</span>
    </div>
  </div>

  <script id="encrypted-payload" type="application/json">
${JSON.stringify(payload)}
  </script>

  <script>
    (function() {
      const payloadEl = document.getElementById('encrypted-payload');
      const payload = JSON.parse(payloadEl.textContent);
      const authBox = document.getElementById('authBox');
      const authForm = document.getElementById('authForm');
      const passwordInput = document.getElementById('passphrase');
      const rememberCheckbox = document.getElementById('rememberMe');
      const errorMsg = document.getElementById('errorMsg');
      const submitBtn = document.getElementById('submitBtn');
      const btnSpinner = document.getElementById('btnSpinner');
      const btnText = document.getElementById('btnText');
      const toggleBtn = document.getElementById('toggleBtn');

      // Toggle password visibility
      toggleBtn.addEventListener('click', function() {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
      });

      function b64ToBuf(b64) {
        const bin = atob(b64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return buf;
      }

      async function decryptApp(passphrase) {
        const enc = new TextEncoder();
        const salt = b64ToBuf(payload.salt);
        const iv = b64ToBuf(payload.iv);
        const tag = b64ToBuf(payload.tag);
        const ciphertext = b64ToBuf(payload.ciphertext);

        // Combine ciphertext + tag for Web Crypto AES-GCM
        const combined = new Uint8Array(ciphertext.length + tag.length);
        combined.set(ciphertext, 0);
        combined.set(tag, ciphertext.length);

        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          enc.encode(passphrase),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        const key = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv,
            tagLength: 128
          },
          key,
          combined
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
      }

      function launchDecryptedApp(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        document.title = doc.title;

        // Replace head links and meta
        document.head.innerHTML = doc.head.innerHTML;

        // Replace body
        document.body.innerHTML = doc.body.innerHTML;

        // Execute all scripts in order
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(function(oldScript) {
          const newScript = document.createElement('script');
          for (let i = 0; i < oldScript.attributes.length; i++) {
            const attr = oldScript.attributes[i];
            newScript.setAttribute(attr.name, attr.value);
          }
          newScript.textContent = oldScript.textContent;
          document.body.appendChild(newScript);
        });
      }

      async function attemptUnlock(passphrase, isAuto = false) {
        if (!passphrase) return;

        submitBtn.disabled = true;
        btnSpinner.style.display = 'inline-block';
        btnText.textContent = 'Decrypting...';
        errorMsg.style.display = 'none';

        try {
          const decryptedHtml = await decryptApp(passphrase);

          // Save passphrase cache if requested
          if (rememberCheckbox.checked) {
            localStorage.setItem('__calc_auth_pass', passphrase);
          } else {
            sessionStorage.setItem('__calc_auth_pass', passphrase);
          }

          launchDecryptedApp(decryptedHtml);
        } catch (err) {
          console.error('Decryption failed:', err);
          submitBtn.disabled = false;
          btnSpinner.style.display = 'none';
          btnText.textContent = 'Unlock Calculator';

          // Clear cached password if invalid
          localStorage.removeItem('__calc_auth_pass');
          sessionStorage.removeItem('__calc_auth_pass');

          if (!isAuto) {
            errorMsg.style.display = 'block';
            authBox.classList.remove('shake');
            void authBox.offsetWidth; // Trigger reflow
            authBox.classList.add('shake');
            passwordInput.focus();
            passwordInput.select();
          }
        }
      }

      // Check for cached passphrase
      const cachedPass = sessionStorage.getItem('__calc_auth_pass') || localStorage.getItem('__calc_auth_pass');
      if (cachedPass) {
        attemptUnlock(cachedPass, true);
      }

      authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        attemptUnlock(passwordInput.value);
      });
    })();
  </script>
</body>
</html>`;

fs.writeFileSync(indexPath, lockScreenHtml, 'utf-8');
console.log('✅ Successfully encrypted dist/index.html with AES-256-GCM.');
