# Campaigns Module

Self-hosted email and SMS campaigns system with custom delivery engines.

## Features

- 📧 **Email Campaigns**: Custom SMTP-based email delivery with tracking
- 📱 **SMS Campaigns**: Custom SMS gateway abstraction
- 👥 **Contact Management**: Import, segment, and manage contacts
- 📊 **Analytics**: Track opens, clicks, and campaign performance
- 🏢 **Multi-tenant**: Organization and role-based access control
- 🎨 **Template Builder**: Email and SMS template management
- 🔒 **Self-hosted**: No third-party dependencies for sending

## Tech Stack

- **Backend**: Node.js + Express + Prisma + MySQL
- **Frontend**: Next.js (App Router) + React
- **Database**: MySQL
- **Queue**: MySQL-backed job queue

## Setup

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your settings
3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up the database:
   ```bash
   cd server
   npx prisma migrate dev
   npx prisma generate
   ```

5. Start the development servers:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API: http://localhost:5000
   - Frontend: http://localhost:3000

## Architecture

```
campaigns-module/
├── server/          # Backend API (Express + Prisma)
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── controllers/ # API controllers
│   │   ├── services/    # Business logic
│   │   ├── routes/      # Express routes
│   │   └── middleware/  # Auth, validation, etc.
│   └── prisma/
│       └── schema.prisma
└── client/          # Frontend (Next.js)
    ├── app/         # App Router pages
    ├── components/  # React components
    └── styles/      # CSS styling
```

## License

MIT
