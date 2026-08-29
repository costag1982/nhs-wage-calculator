# NHS Wage & Shift Calculator 🏥💷

A modern, high-precision NHS wage calculator and shift rota planner built for NHS staff (Agenda for Change Section 2 Unsocial Hours Enhancements, High Cost Area Supplements, Overtime, Pension Tiers, and Student Loans).

---

## 🔒 Protected GitHub Pages Hosting

This site can be deployed directly to **GitHub Pages** (even with a public repository) while keeping your data and application code protected behind a client-side **AES-256-GCM encryption layer**.

### How the Security Works

1. When GitHub Actions runs the build command (`pnpm build:encrypted`), the entire compiled application is encrypted using your secret passphrase.
2. The deployed `index.html` file serves only a lightweight, modern authorisation screen.
3. Visitors must enter the correct passphrase to derive the AES key in-memory via the browser's Web Crypto API (`window.crypto.subtle`) and decrypt the application.
4. Without the passphrase, it is cryptographically impossible for web crawlers or unauthorised viewers to inspect or run your calculator.

---

## 🚀 Setting Up GitHub Pages Deployment

### Step 1: Create a GitHub Repository

1. Initialise and commit this project locally:

   ```bash
   git init
   git add .
   git commit -m "Initial commit with encrypted GitHub Pages deployment"
   ```

2. Create a new repository on GitHub (e.g. `gemma-wage-calc` or `nhs-wage-calculator`).
3. Link your remote repository and push to `main`:

   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Add the Repository Secret

1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret**.
3. Name: `PAGE_PASSWORD`
4. Secret: Enter the passphrase you want to use to unlock the site.
5. Click **Add secret**.

### Step 3: Enable GitHub Pages with GitHub Actions

1. Go to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Re-run or trigger the action by pushing to `main` (or run manually under the **Actions** tab via `Deploy Protected Site to GitHub Pages` > `Run workflow`).

Your protected calculator will be live at:
`https://<your-username>.github.io/<your-repo-name>/`

---

## 💻 Local Development

### Prerequisites

- Node.js (v20+)
- `pnpm` (v9+)

### Commands

```bash
# Install dependencies
pnpm install

# Start local dev server (unencrypted hot reload)
pnpm dev

# Run test suite
pnpm test

# Run linter
pnpm lint

# Format code
pnpm format

# Build standard unencrypted bundle
pnpm build

# Build and encrypt bundle locally (uses 'nhs2025' by default or PAGE_PASSWORD)
pnpm build:encrypted

# Preview the encrypted production build locally
pnpm preview
```
