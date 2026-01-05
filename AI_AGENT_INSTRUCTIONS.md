# AI Agent Instructions for Thind Transport Website

## Purpose

This document provides guidance for AI agents (like Claude, GPT, or other LLMs) working on this codebase in future sessions. Follow these instructions to maintain consistency and continue documenting changes.

---

## Quick Start for New Context Windows

1. **Read these files first:**
   - `DOCUMENTATION.md` - Full project overview
   - `AI_AGENT_INSTRUCTIONS.md` - This file
   - `src/lib/constants.ts` - Company info and rates

2. **Key patterns to know:**
   - Database uses snake_case columns, TypeScript uses camelCase
   - NextAuth v5 cookie name is `authjs.session-token` (not `next-auth`)
   - Always use `trustHost: true` in NextAuth config for Vercel

---

## Documentation Guidelines

### When to Update DOCUMENTATION.md

Update documentation when:
- Adding new features or pages
- Changing authentication logic
- Modifying database schema
- Fixing significant bugs
- Adding new environment variables

### How to Document Changes

Add entries to the "Debugging History & Solutions" section:

```markdown
### Issue X: [Brief description]
**Root Cause:** [What caused the issue]

**Solution:**
```code snippet showing the fix```
```

---

## Key Files Reference

| File | When to Modify |
|------|----------------|
| `src/app/api/auth/[...nextauth]/route.ts` | Authentication changes |
| `src/middleware.ts` | Route protection changes |
| `src/lib/driver-db.ts` | Database abstraction |
| `src/lib/driver-db-postgres.ts` | Postgres queries |
| `src/app/driver/application/page.tsx` | Application form logic |
| `src/components/driver-application/*.tsx` | Individual form steps |
| `src/lib/constants.ts` | Company info, rates |

---

## Common Issues & Solutions

### 1. Login Not Working on Production

**Symptoms:** Login shows success but stays on login page

**Check these:**
1. Is `NEXTAUTH_URL` set correctly in Vercel? Must be `https://thindtransport.com`
2. Is `NEXTAUTH_SECRET` set in Vercel?
3. Is middleware using correct cookie name (`__Secure-authjs.session-token`)?

### 2. Database Column Naming

**Problem:** Postgres returns `first_name` but code expects `firstName`

**Solution:** Always handle both:
```typescript
const firstName = driver.firstName || (driver as any).first_name || '';
```

### 3. Form Validation Errors

**Problem:** Form won't proceed to next step

**Check:**
1. Console for validation errors
2. Zod schema matches form fields
3. Required fields have values

### 4. Session Not Persisting

**Check:**
1. Browser cookies are enabled
2. `trustHost: true` in NextAuth config
3. Correct cookie name in middleware

---

## Code Style Conventions

### TypeScript

```typescript
// Use interfaces for data shapes
interface Driver {
  id: string;
  email: string;
  firstName: string;  // camelCase in TS
}

// Use async/await, not .then()
async function getDriver(id: string): Promise<Driver | null> {
  const result = await sql`SELECT * FROM drivers WHERE id = ${id}`;
  return result.rows[0] || null;
}
```

### React Components

```typescript
// Use function components with TypeScript props
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({ onClick, disabled, children }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
```

### API Routes

```typescript
// Use NextResponse for responses
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Process...
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

---

## Testing Checklist

Before committing changes, verify:

- [ ] Login works on localhost
- [ ] Login works on production (after deploy)
- [ ] Form steps proceed correctly
- [ ] No console errors
- [ ] TypeScript has no errors (`npm run build`)

---

## Resume Experience Template

Use this template to add the project to resumes:

### Full-Stack Developer | Thind Transport Website

**Duration:** [Start Date] - [End Date]

**Description:**
Built and maintained a full-stack trucking company platform featuring driver onboarding, authentication, and document management systems.

**Technical Highlights:**
- Implemented secure authentication with NextAuth v5 and JWT sessions
- Designed PostgreSQL database schema for driver and application data
- Built multi-step form with real-time validation using React Hook Form and Zod
- Created automated PDF generation for DOT-compliant application forms
- Deployed on Vercel with CI/CD pipeline from GitHub

**Technologies:**
Next.js 15, TypeScript, NextAuth v5, PostgreSQL, Tailwind CSS, Vercel, Shadcn UI

**Impact:**
- Reduced driver onboarding time from days to hours
- Eliminated manual PDF filling through automation
- Achieved 99.9% uptime on production deployment

---

## Continuing Development

### Adding New Features

1. Create feature branch (or work on main for small changes)
2. Implement feature following existing patterns
3. Test locally with `npm run dev`
4. Commit with descriptive message
5. Push to trigger Vercel deployment
6. Test on production
7. Update documentation

### Debugging Production Issues

1. Check Vercel function logs
2. Add debug endpoints if needed (remove after fixing)
3. Use browser console for frontend issues
4. Check Network tab for API responses
5. Document the solution in DOCUMENTATION.md

---

## Important Notes

1. **Never commit secrets** - Use environment variables
2. **Test in incognito** - Avoid cached session issues
3. **Check cookie names** - v5 uses `authjs`, not `next-auth`
4. **Handle snake_case** - Database returns different casing
5. **Update documentation** - Keep it current for future agents

---

*This document should be updated whenever significant changes are made to the codebase.*

