# Driver Portal Integration Guide

## Overview

The Thind Transport Driver Portal is built with a flexible API architecture that can integrate with popular trucking software systems. This guide explains how to connect the portal to your existing trucking software.

## Supported Integrations

### 1. **Samsara** (Recommended for ELD/Fleet Management)
- ELD/HOS compliance
- GPS tracking
- Vehicle diagnostics
- Driver behavior analytics
- DVIR management

### 2. **Motive (KeepTruckin)**
- ELD compliance
- Driver management
- Fleet tracking
- Safety analytics

### 3. **McLeod Software**
- TMS (Transportation Management System)
- Dispatch
- Settlement processing
- Load management

### 4. **TMW Systems**
- TMS
- Dispatch
- Accounting integration
- Settlement processing

### 5. **TruckingOffice**
- Small fleet TMS
- Dispatch
- Invoicing
- Settlement

### 6. **Custom API**
- Your own backend system
- Direct database integration

---

## Quick Setup

### Step 1: Environment Variables

Create a `.env.local` file in the project root:

```env
# Base API Configuration
NEXT_PUBLIC_TRUCKING_API_URL=/api/driver-portal
NEXT_PUBLIC_TRUCKING_API_PROVIDER=custom

# For Samsara Integration
SAMSARA_API_KEY=your_samsara_api_key
SAMSARA_ORG_ID=your_organization_id

# For Motive Integration
MOTIVE_API_KEY=your_motive_api_key
MOTIVE_COMPANY_ID=your_company_id

# For TMS Integration (McLeod, TMW, etc.)
TMS_API_URL=https://your-tms.com/api
TMS_API_KEY=your_tms_api_key
TMS_USERNAME=api_user
TMS_PASSWORD=api_password

# JWT Configuration (for driver authentication)
JWT_SECRET=your_super_secret_key_min_32_characters
JWT_EXPIRES_IN=24h

# Database (optional - for caching/custom data)
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Step 2: Choose Your Integration

Edit `src/lib/api/driver-portal-api.ts`:

```typescript
const API_PROVIDER = process.env.NEXT_PUBLIC_TRUCKING_API_PROVIDER || 'custom'
// Options: 'samsara', 'motive', 'mcleod', 'tmw', 'custom'
```

---

## API Integration Examples

### Samsara Integration

```typescript
// src/app/api/driver-portal/eld/status/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const driverId = getDriverIdFromToken(request)
  
  // Fetch from Samsara API
  const response = await fetch(
    `https://api.samsara.com/fleet/drivers/${driverId}/hos_daily_logs`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SAMSARA_API_KEY}`,
      },
    }
  )
  
  const samsaraData = await response.json()
  
  // Transform Samsara data to our format
  return NextResponse.json({
    success: true,
    data: transformSamsaraHOS(samsaraData),
  })
}
```

### Motive (KeepTruckin) Integration

```typescript
// src/app/api/driver-portal/eld/status/route.ts
export async function GET(request: NextRequest) {
  const driverId = getDriverIdFromToken(request)
  
  const response = await fetch(
    `https://api.gomotive.com/v1/users/${driverId}/hos_status`,
    {
      headers: {
        'X-Api-Key': process.env.MOTIVE_API_KEY,
      },
    }
  )
  
  const motiveData = await response.json()
  return NextResponse.json({
    success: true,
    data: transformMotiveHOS(motiveData),
  })
}
```

### McLeod TMS Integration

```typescript
// src/app/api/driver-portal/loads/route.ts
export async function GET(request: NextRequest) {
  const driverId = getDriverIdFromToken(request)
  
  // Fetch loads from McLeod
  const response = await fetch(
    `${process.env.TMS_API_URL}/loads?driver_id=${driverId}`,
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${process.env.TMS_USERNAME}:${process.env.TMS_PASSWORD}`
        ).toString('base64')}`,
      },
    }
  )
  
  const mcleodLoads = await response.json()
  return NextResponse.json({
    success: true,
    data: transformMcLeodLoads(mcleodLoads),
  })
}
```

---

## Data Transformation

Each trucking software has its own data format. Use transformation functions to convert to our standard format:

```typescript
// src/lib/api/transformers/samsara.ts
export function transformSamsaraHOS(samsaraData: SamsaraHOSResponse): ELDStatus {
  return {
    currentStatus: mapSamsaraStatus(samsaraData.currentDutyStatus),
    statusSince: samsaraData.statusStartTime,
    cycleType: samsaraData.cycle === 'US_70_HOUR_8_DAY' ? '70_8' : '60_7',
    hoursAvailable: samsaraData.hoursRemaining.cycle,
    hoursUsedToday: samsaraData.hoursUsed.today,
    driveTimeRemaining: samsaraData.hoursRemaining.drive * 60,
    shiftTimeRemaining: samsaraData.hoursRemaining.shift * 60,
    breakRequired: samsaraData.breakRequired,
    violations: samsaraData.violations.map(v => ({
      id: v.id,
      type: v.violationType,
      description: v.description,
      severity: v.severity,
      occurredAt: v.timestamp,
      resolved: v.resolved,
    })),
  }
}
```

---

## Authentication Flow

### Driver Login Flow

1. Driver enters credentials on portal
2. Portal sends to `/api/driver-portal/auth/login`
3. Backend validates against trucking software OR your database
4. Returns JWT token + driver profile
5. Token stored in localStorage
6. All subsequent requests include Bearer token

### Implementing Real Authentication

```typescript
// src/app/api/driver-portal/auth/login/route.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { driverIdOrEmail, password } = await request.json()
  
  // Option 1: Authenticate against your database
  const driver = await prisma.driver.findFirst({
    where: {
      OR: [
        { driverId: driverIdOrEmail },
        { email: driverIdOrEmail },
      ],
    },
  })
  
  if (!driver || !await bcrypt.compare(password, driver.passwordHash)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_CREDENTIALS' } },
      { status: 401 }
    )
  }
  
  // Option 2: Authenticate via trucking software API
  // const samsaraAuth = await authenticateWithSamsara(driverIdOrEmail, password)
  
  // Generate JWT
  const accessToken = jwt.sign(
    { sub: driver.id, driverId: driver.driverId },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  )
  
  return NextResponse.json({
    success: true,
    data: {
      driver: sanitizeDriver(driver),
      accessToken,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    },
  })
}
```

---

## Feature Implementation Checklist

### Phase 1: Basic Portal (Current)
- [x] Login/logout UI
- [x] Dashboard layout
- [x] Load display
- [x] Settlement display
- [x] Document list
- [x] Message center UI

### Phase 2: API Integration
- [ ] Connect authentication to real backend
- [ ] Integrate ELD/HOS data (Samsara/Motive)
- [ ] Connect load data to TMS
- [ ] Connect settlements to accounting

### Phase 3: Full Features
- [ ] Real-time GPS tracking
- [ ] Document upload/download
- [ ] Push notifications
- [ ] Mobile optimization
- [ ] Offline support

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/driver-portal/auth/login` | POST | Authenticate driver |
| `/api/driver-portal/auth/logout` | POST | End session |
| `/api/driver-portal/auth/refresh` | POST | Refresh token |
| `/api/driver-portal/driver/dashboard` | GET | Get dashboard data |
| `/api/driver-portal/driver/profile` | GET/PATCH | Get/update profile |
| `/api/driver-portal/loads` | GET | Get loads (assigned/available/history) |
| `/api/driver-portal/loads/:id` | GET | Get load details |
| `/api/driver-portal/loads/:id/accept` | POST | Accept offered load |
| `/api/driver-portal/loads/:id/status` | PATCH | Update load status |
| `/api/driver-portal/settlements` | GET | Get settlements |
| `/api/driver-portal/settlements/:id` | GET | Get settlement details |
| `/api/driver-portal/settlements/:id/pdf` | GET | Download PDF |
| `/api/driver-portal/documents` | GET/POST | List/upload documents |
| `/api/driver-portal/eld/status` | GET | Get current HOS status |
| `/api/driver-portal/eld/logs` | GET | Get daily logs |
| `/api/driver-portal/fuel/balance` | GET | Get fuel card balance |
| `/api/driver-portal/messages` | GET/POST | List/send messages |
| `/api/driver-portal/notifications` | GET | Get notifications |

---

## Common Trucking Software API Resources

### Samsara
- **Docs**: https://developers.samsara.com/docs
- **API Key**: Settings → API Tokens
- **Webhooks**: Real-time updates for vehicle/driver events

### Motive (KeepTruckin)
- **Docs**: https://developer.gomotive.com/docs
- **API Key**: Admin Portal → Developer → API Keys
- **Rate Limits**: 100 requests/minute

### McLeod
- **Contact**: Your McLeod account rep for API access
- **Integration**: Usually SOAP/REST hybrid
- **EDI**: Also supports EDI for load tenders

### TMW
- **Contact**: TMW support for API documentation
- **PowerSuite API**: REST API for modern integrations
- **TruckMate**: Legacy SOAP API

---

## Security Best Practices

1. **Never expose API keys in frontend code**
   - Always use server-side routes
   - Store keys in environment variables

2. **Validate all tokens**
   - Check expiration
   - Verify signature
   - Validate driver permissions

3. **Rate limiting**
   - Implement rate limiting on all endpoints
   - Cache frequently accessed data

4. **Audit logging**
   - Log all authentication attempts
   - Track sensitive data access

---

## Support

For integration assistance:
- **Technical Support**: dev@thindtransport.com
- **API Issues**: Create GitHub issue
- **Trucking Software Support**: Contact your vendor directly

---

## Type Definitions

All TypeScript types are defined in:
- `src/types/driver-portal.ts` - Complete type definitions
- `src/lib/api/driver-portal-api.ts` - API client with full typing

These types ensure consistency between frontend and backend, and provide excellent IDE support for development.











