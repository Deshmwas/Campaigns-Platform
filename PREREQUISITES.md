# Campaigns Module - Installation Prerequisites

## ⚠️ Node.js Not Found

The Campaigns Module requires **Node.js** to run, but it's not currently installed on your system.

---

## 📥 Install Node.js

### Option 1: Official Installer (Recommended)

1. **Download Node.js**:
   - Visit: https://nodejs.org/
   - Download the **LTS version** (Long Term Support)
   - For Windows: Download the `.msi` installer

2. **Run the Installer**:
   - Double-click the downloaded file
   - Follow the installation wizard
   - ✅ Make sure to check **"Add to PATH"** option

3. **Verify Installation**:
   - Open a **NEW** PowerShell/Command Prompt window
   - Run: `node --version`
   - Run: `npm --version`
   - You should see version numbers (e.g., `v20.10.0`)

### Option 2: Using Chocolatey (Windows Package Manager)

If you have Chocolatey installed:

```powershell
choco install nodejs-lts -y
```

### Option 3: Using Winget (Windows Package Manager)

```powershell
winget install OpenJS.NodeJS.LTS
```

---

## After Installing Node.js

Once Node.js is installed, **restart your terminal** and run:

```bash
cd c:/Users/HP/Downloads/Campaigns
npm install
```

Then continue with the setup steps in [QUICKSTART.md](file:///c:/Users/HP/Downloads/Campaigns/QUICKSTART.md).

---

## Alternative: Use Pre-installed Node.js

If Node.js is installed but not in PATH:

1. **Find Node Installation**:
   - Check: `C:\Program Files\nodejs\`
   - Or: `C:\Program Files (x86)\nodejs\`

2. **Add to PATH**:
   - Open System Environment Variables
   - Add the Node.js folder to your PATH
   - Restart terminal

---

## Recommended Node.js Version

- **Minimum**: Node.js 18.x
- **Recommended**: Node.js 20.x LTS (Latest Long Term Support)

---

## What Node.js Provides

- **node**: JavaScript runtime
- **npm**: Package manager for installing dependencies
- **npx**: Tool for running packages

These are required to:
- Install project dependencies
- Run the backend server (Express)
- Run the frontend server (Next.js)
- Run database migrations (Prisma)

---

## Next Steps After Installation

1. ✅ Install Node.js (see above)
2. ✅ Restart your terminal
3. ✅ Run `node --version` to verify
4. ✅ Follow [QUICKSTART.md](file:///c:/Users/HP/Downloads/Campaigns/QUICKSTART.md)

---

## Need Help?

If you encounter issues:

1. **Node.js download page**: https://nodejs.org/
2. **Installation guide**: https://nodejs.org/en/download/package-manager
3. **Windows-specific guide**: https://nodejs.org/en/download/package-manager#windows-1
