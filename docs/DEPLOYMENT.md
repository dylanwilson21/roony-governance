# Deployment Guide

## Overview

This guide covers deploying Roony to production environments.

## Prerequisites

- Node.js 18+ installed
- Database (PostgreSQL recommended for production)
- Stripe account with Issuing enabled
- Domain name and SSL certificate

## Environment Variables

Create a `.env.production` file:

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://roony.com
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/roony

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Authentication
NEXTAUTH_URL=https://roony.com
NEXTAUTH_SECRET=your-secret-key-here

# Encryption (for storing Stripe tokens)
ENCRYPTION_KEY=your-32-byte-encryption-key

# API
API_RATE_LIMIT=100
```

## Build Process

### 1. Install Dependencies

```bash
npm ci
```

### 2. Run Database Migrations

```bash
npm run db:migrate
```

### 3. Build Application

```bash
npm run build
```

### 4. Start Production Server

```bash
npm start
```

## Deployment Options

### Vercel (Recommended for Next.js)

1. Connect GitHub repository
2. Configure environment variables
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

### Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=roony
      - POSTGRES_USER=roony
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Self-Hosted

1. Set up server (Ubuntu 22.04 recommended)
2. Install Node.js 18+
3. Install PostgreSQL
4. Clone repository
5. Configure environment variables
6. Run migrations
7. Build and start with PM2:

```bash
npm install -g pm2
pm2 start npm --name "roony" -- start
pm2 save
pm2 startup
```

## Database Setup

### PostgreSQL (Production)

1. Create database:
```sql
CREATE DATABASE roony;
```

2. Run migrations:
```bash
npm run db:migrate
```

3. Set up backups:
```bash
# Daily backups
0 2 * * * pg_dump roony > /backups/roony-$(date +\%Y\%m\%d).sql
```

## Stripe Configuration

### Webhook Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://roony.com/api/webhooks/stripe`
3. Select events:
   - `issuing_authorization.request`
   - `issuing_authorization.created`
   - `charge.succeeded`
   - `issuing_card.created`
   - `issuing_card.updated`
4. Copy webhook secret to environment variables

### Stripe Connect

1. Create Connect application in Stripe Dashboard
2. Configure OAuth redirect URL: `https://roony.com/api/stripe/connect/callback`
3. Copy Client ID to environment variables

## Monitoring & Logging

### Application Logs

- Use structured logging (Pino or Winston)
- Log levels: error, warn, info, debug
- Include request IDs for tracing

### Error Tracking

- Integrate Sentry or similar
- Track errors and exceptions
- Alert on critical errors

### Performance Monitoring

- Use Vercel Analytics or similar
- Monitor API response times
- Track database query performance

## Security Checklist

- [ ] All environment variables set
- [ ] Database credentials secure
- [ ] Stripe keys are production keys
- [ ] SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] API keys stored hashed
- [ ] Encryption keys secure
- [ ] Webhook signatures verified
- [ ] Regular security updates

## Backup Strategy

1. **Database**: Daily automated backups
2. **Code**: Version controlled in Git
3. **Environment**: Document all configs
4. **Stripe Data**: Webhooks provide audit trail

## Scaling Considerations

- Use connection pooling for database
- Implement Redis for caching
- Use CDN for static assets
- Consider read replicas for database
- Horizontal scaling with load balancer

## Health Checks

Implement health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  // Check database connection
  // Check Stripe API
  return Response.json({ status: 'ok' });
}
```

## Rollback Procedure

1. Revert to previous Git commit
2. Run database migrations (if needed)
3. Rebuild application
4. Restart services

## Post-Deployment

1. Verify webhook endpoint is receiving events
2. Test Stripe Connect flow
3. Test purchase intent API
4. Monitor error logs
5. Check performance metrics

