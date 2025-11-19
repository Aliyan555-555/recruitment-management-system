# Quick Fixes Implementation Guide

This guide provides step-by-step instructions for implementing the most critical improvements.

## 1. Environment Variable Validation

### Step 1: Create `lib/env.ts`

```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),
  DIRECT_URL: z.string().url('Invalid DIRECT_URL').optional(),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('Invalid NEXTAUTH_URL'),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional: Email configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
})

// Validate and export
function getEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      throw new Error('Invalid environment variables')
    }
    throw error
  }
}

export const env = getEnv()
```

### Step 2: Update files to use validated env

**Before:**
```typescript
secret: process.env.NEXTAUTH_SECRET,
```

**After:**
```typescript
import { env } from '@/lib/env'

secret: env.NEXTAUTH_SECRET,
```

---

## 2. Centralized Error Handling

### Step 1: Create `lib/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}
```

### Step 2: Create `lib/api-error-handler.ts`

```typescript
import { NextResponse } from 'next/server'
import { AppError, ValidationError, NotFoundError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export function handleApiError(error: unknown): NextResponse {
  // Log error
  if (error instanceof AppError) {
    logger.error('Application error', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      stack: error.stack,
    })
  } else {
    logger.error('Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
  }

  // Return appropriate response
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    )
  }

  // Unknown error - don't leak details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  return NextResponse.json(
    {
      error: isDevelopment
        ? error instanceof Error
          ? error.message
          : 'An unexpected error occurred'
        : 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  )
}
```

### Step 3: Use in API routes

**Before:**
```typescript
export async function GET(req: NextRequest) {
  try {
    // ... code
  } catch (error: any) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 500 }
    )
  }
}
```

**After:**
```typescript
import { handleApiError } from '@/lib/api-error-handler'
import { NotFoundError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    // ... code
    if (!resource) {
      throw new NotFoundError('Resource')
    }
    // ... code
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## 3. Proper Logging Setup

### Step 1: Install pino (or use console for now)

```bash
npm install pino pino-pretty
```

### Step 2: Create `lib/logger.ts`

```typescript
import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
})
```

### Step 3: Replace console statements

**Before:**
```typescript
console.error("Error advancing to next step:", error)
console.log("User created:", user)
```

**After:**
```typescript
import { logger } from '@/lib/logger'

logger.error({ error, pipelineId }, "Error advancing to next step")
logger.info({ userId: user.id }, "User created successfully")
```

---

## 4. Fix Type Safety Issues

### Step 1: Create Prisma type helpers

Create `lib/prisma-types.ts`:

```typescript
import { Prisma } from '@prisma/client'

// Batch with relations
export type BatchWithRelations = Prisma.BatchGetPayload<{
  include: {
    batchCandidates: {
      include: {
        candidate: true
        application: {
          include: {
            cv: true
          }
        }
      }
    }
  }
}>

// Pipeline with relations
export type PipelineWithRelations = Prisma.CandidatePipelineGetPayload<{
  include: {
    job: {
      include: {
        workflow: {
          include: {
            steps: true
          }
        }
      }
    }
    candidate: true
    steps: {
      include: {
        workflowStep: true
      }
    }
  }
}>
```

### Step 2: Use types instead of `as any`

**Before:**
```typescript
const batch = await (prisma as any).batch.findUnique({
  where: { id: currentStep.batchId },
  select: { status: true }
})
```

**After:**
```typescript
import { prisma } from '@/lib/prisma'

const batch = await prisma.batch.findUnique({
  where: { id: currentStep.batchId },
  select: { status: true }
})
```

**Note**: If Prisma types are missing, run:
```bash
npx prisma generate
```

---

## 5. Remove Legacy Code

### Step 1: Clean up `lib/pipeline-helpers.ts`

Remove all commented legacy code (lines 4-283) since you're already using `pipeline-service.ts`.

**After cleanup, file should be:**
```typescript
// Re-export from unified pipeline service for backward compatibility
export { advanceToNextStep, handleStepRejection } from "@/lib/services/pipeline-service"
```

---

## 6. Add API Response Types

### Step 1: Create `types/api.ts`

```typescript
// Standard API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  details?: unknown
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Common API responses
export type SuccessResponse<T> = ApiResponse<T> & { success: true; data: T }
export type ErrorResponse = ApiResponse & { success: false; error: string }
```

### Step 2: Use in API routes

```typescript
import { ApiResponse, SuccessResponse } from '@/types/api'

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<User[]>>> {
  try {
    const users = await prisma.user.findMany()
    const response: SuccessResponse<User[]> = {
      success: true,
      data: users,
    }
    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## 7. Add Request Validation Middleware

### Step 1: Create `lib/middleware/validate-request.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema } from 'zod'

export function validateRequest<T extends ZodSchema>(
  schema: T,
  getData: (req: NextRequest) => Promise<unknown> | unknown
) {
  return async (req: NextRequest) => {
    try {
      const data = await getData(req)
      const validated = schema.parse(data)
      return { data: validated, error: null }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          data: null,
          error: NextResponse.json(
            {
              error: 'Validation failed',
              details: error.errors,
            },
            { status: 400 }
          ),
        }
      }
      throw error
    }
  }
}
```

### Step 2: Use in API routes

```typescript
import { validateRequest } from '@/lib/middleware/validate-request'
import { z } from 'zod'

const createBatchSchema = z.object({
  jobId: z.string().transform(BigInt),
  workflowStepId: z.string().transform(BigInt),
  candidateIds: z.array(z.string().transform(BigInt)),
})

export async function POST(req: NextRequest) {
  const validation = await validateRequest(
    createBatchSchema,
    (req) => req.json()
  )(req)

  if (validation.error) {
    return validation.error
  }

  const { jobId, workflowStepId, candidateIds } = validation.data
  // ... rest of handler
}
```

---

## Implementation Order

1. **Day 1**: Environment validation + Error handling
2. **Day 2**: Logging setup + Replace console statements
3. **Day 3**: Fix type safety (remove `as any`)
4. **Day 4**: Clean up legacy code + Add API types
5. **Day 5**: Add validation middleware

---

## Testing Your Changes

After each change:

1. **Build the project**: `npm run build`
2. **Check for TypeScript errors**: `npx tsc --noEmit`
3. **Run linter**: `npm run lint`
4. **Test manually**: Start dev server and test critical flows

---

## Next Steps

After completing these quick fixes:

1. Set up testing framework
2. Add rate limiting
3. Implement input sanitization
4. Add monitoring
5. Optimize database queries

See `IMPROVEMENTS_ANALYSIS.md` for full details.

