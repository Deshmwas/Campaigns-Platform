# Campaigns Module - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites Check

Make sure you have:
- [ ] **Node.js 18+** installed (`node --version`)
- [ ] **MySQL 8+** running (`mysql --version`)
- [ ] **npm** installed (`npm --version`)

---

## Setup Steps

### 1. Create MySQL Database

Open MySQL console and run:

```sql
CREATE DATABASE campaigns_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'campaigns_user'@'localhost' IDENTIFIED BY 'campaigns_password';
GRANT ALL PRIVILEGES ON campaigns_db.* TO 'campaigns_user'@'localhost';
FLUSH PRIVILEGES;
```

Or use your existing MySQL credentials.

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update the database connection:

```env
DATABASE_URL="mysql://campaigns_user:campaigns_password@localhost:3306/campaigns_db"
```

### 3. Install Dependencies

From the project root:

```bash
npm install
```

This will install dependencies for both server and client.

### 4. Initialize Database

Run Prisma migrations:

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

This creates all database tables.

### 5. Start the Application

From the root directory:

```bash
npm run dev
```

You should see:

```
✅ Server running on port 5000
📧 Email engine initialized (simulated mode)
📱 SMS engine initialized (Logger Gateway)
🚀 Queue processor started
```

### 6. Access the Application

Open your browser:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## First Login

1. Navigate to http://localhost:3000
2. Click **Sign up**
3. Fill in:
   - Organization Name: "My Company"
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "admin@example.com"
   - Password: "password123"
4. Click **Create account**

You're now logged in as an ADMIN! 🎉

---

## Quick Test Campaign

### Add a Contact

1. Go to **Contacts** → **Add Contact**
2. Fill in:
   - First Name: "Test"
   - Last Name: "User"
   - Email: "test@example.com"
3. Click **Add Contact**

### Create a List

1. Go to **Lists** → **Create List**
2. Name: "Test List"
3. Click **Create List**

### Create & Send Campaign

1. Go to **Campaigns** → **Create Campaign**
2. Fill in:
   - Name: "My First Campaign"
   - Type: **Email**
   - Subject: "Hello {{first_name}}!"
   - Content:
     ```html
     <h1>Hi {{first_name}} {{last_name}}</h1>
     <p>This is a test campaign!</p>
     <a href="https://example.com">Click here</a>
     ```
3. Select your test list
4. Click **Create Campaign**
5. Click **Send Now**

### Check the Results

1. **Backend Console**: You'll see simulated email logs:
   ```
   📧 [SIMULATED] Email to test@example.com
      Subject: Hello Test!
   ```

2. **Dashboard**: View updated statistics

3. **Campaign Details**: See recipient status

---

## Enable Real Email Sending

To send actual emails, configure SMTP in `.env`:

### For Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

> **Note**: For Gmail, you need to generate an [App Password](https://support.google.com/accounts/answer/185833).

### For Other Providers

Update with your SMTP settings:

```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

Restart the server after updating `.env`.

---

## Troubleshooting

### Database Connection Error

```
Error: Can't reach database server
```

**Solution**: 
- Ensure MySQL is running: `sudo systemctl status mysql`
- Check credentials in `.env`
- Verify database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**:
- Change `PORT=5000` to `PORT=5001` in `.env`
- Or kill the process using port 5000

### Prisma Migration Fails

```
Error: P1001: Can't reach database server
```

**Solution**:
- Check MySQL is running
- Verify `DATABASE_URL` format is correct
- Try: `cd server && npx prisma db push` instead of migrate

---

## Project Structure

```
📁 Campaigns/
├── 📁 server/           # Backend (Node.js + Express + Prisma)
│   ├── prisma/          # Database schema
│   └── src/             # API code
├── 📁 client/           # Frontend (Next.js)
│   ├── app/             # Pages
│   └── components/      # UI components
├── package.json         # Root config
└── .env                 # Environment variables
```

---

## Next Steps

- ✅ [Read the full walkthrough](file:///c:/Users/HP/.gemini/antigravity/brain/b5104704-7c1a-45d7-acf1-180b2b75c45e/walkthrough.md)
- ✅ Import contacts via CSV
- ✅ Create email templates
- ✅ Send your first real campaign
- ✅ Explore the API at http://localhost:5000/api

---

## Need Help?

Refer to:
- **[Walkthrough](file:///c:/Users/HP/.gemini/antigravity/brain/b5104704-7c1a-45d7-acf1-180b2b75c45e/walkthrough.md)** - Complete system documentation
- **[Implementation Plan](file:///c:/Users/HP/.gemini/antigravity/brain/b5104704-7c1a-45d7-acf1-180b2b75c45e/implementation_plan.md)** - Architecture details
- **[README](file:///c:/Users/HP/Downloads/Campaigns/README.md)** - Project overview

Happy campaigning! 🚀
