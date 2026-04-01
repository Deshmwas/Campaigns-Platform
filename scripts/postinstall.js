// Conditional Prisma generate hook for monorepo (client + server)
// Skips Prisma on demand to avoid failing frontend-only Vercel builds.

const { execSync } = require('child_process');

const shouldSkip = process.env.SKIP_PRISMA_GENERATE === '1' || process.env.SKIP_PRISMA_GENERATE === 'true';

if (shouldSkip) {
  console.log('SKIP_PRISMA_GENERATE set; skipping prisma generate');
  process.exit(0);
}

try {
  execSync('npm run prisma:generate --workspace=server', { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to run prisma generate for server workspace');
  process.exit(1);
}
