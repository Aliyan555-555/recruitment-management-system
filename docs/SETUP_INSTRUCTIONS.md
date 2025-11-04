# Setup Instructions
## Recruitment Management System

Complete step-by-step guide to set up the Recruitment Management System.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ database
- ✅ Git (optional)
- ✅ Code editor (VS Code recommended)

---

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- Next.js 14
- Prisma ORM
- NextAuth.js
- React
- Tailwind CSS
- And all other dependencies

---

### Step 2: Configure Environment Variables

#### Option A: Use the Sample File

```bash
# Copy the sample file
cp env.sample .env
```

#### Option B: Create Manually

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/recruitment_db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3001"

# App
NODE_ENV="development"
PORT=3000
```

#### Generate NEXTAUTH_SECRET

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Online:**
Visit https://generate-secret.vercel.app/32

---

### Step 3: Set Up Database

#### Option A: Local PostgreSQL

1. **Create Database:**
```sql
CREATE DATABASE recruitment_management;
```

2. **Update .env:**
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/recruitment_management"
```

#### Option B: Supabase (Cloud)

1. **Create Project:** https://supabase.com
2. **Get Connection String:**
   - Go to Project Settings → Database
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]`

3. **Update .env:**
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
```

#### Option C: Railway (Cloud)

1. **Create Project:** https://railway.app
2. **Add PostgreSQL:** Click "New" → "Database" → "PostgreSQL"
3. **Copy Connection String:** From database settings
4. **Update .env**

#### Option D: Neon (Cloud)

1. **Create Project:** https://neon.tech
2. **Get Connection String:** From dashboard
3. **Update .env:**
```env
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST].neon.tech/[DATABASE]?sslmode=require"
```

---

### Step 4: Initialize Database Schema

**IMPORTANT:** Stop the dev server before running these commands!

#### Method 1: Database Push (Quick & Simple)

```bash
npx prisma db push
```

This will:
- ✅ Create all tables
- ✅ Set up relationships
- ✅ Generate Prisma Client
- ✅ No migration files

**Use this for:** Quick setup, development

#### Method 2: Migrations (Production-Ready)

```bash
npx prisma migrate dev --name init
```

This will:
- ✅ Create all tables
- ✅ Generate migration files
- ✅ Generate Prisma Client
- ✅ Track schema changes

**Use this for:** Production, version control, team projects

---

### Step 5: Verify Database Setup

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio
```

Visit: http://localhost:5555

You should see 28 tables:
- user
- user_education
- user_education_level
- user_skills
- jobs
- jobs_applied
- (and 22 more...)

---

### Step 6: Seed Initial Data (Optional)

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create education levels
  await prisma.userEducationLevel.createMany({
    data: [
      { name: 'High School' },
      { name: 'Associate Degree' },
      { name: "Bachelor's Degree" },
      { name: "Master's Degree" },
      { name: 'Doctorate / PhD' }
    ],
    skipDuplicates: true
  });

  // Create sample institutes
  await prisma.institute.createMany({
    data: [
      { name: 'Harvard University', visible: true },
      { name: 'Stanford University', visible: true },
      { name: 'MIT', visible: true },
      { name: 'Oxford University', visible: true },
      { name: 'Cambridge University', visible: true }
    ],
    skipDuplicates: true
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const now = BigInt(Date.now());

  try {
    await prisma.user.create({
      data: {
        auth: 'admin',
        username: 'admin',
        password: hashedPassword,
        firstname: 'System',
        lastname: 'Administrator',
        email: 'admin@recruitment.com',
        suspended: false,
        createdAt: now,
        updatedAt: now
      }
    });
    console.log('✅ Admin user created');
  } catch (e) {
    console.log('ℹ️  Admin user already exists');
  }

  // Create test user
  const testPassword = await bcrypt.hash('test123', 10);
  try {
    await prisma.user.create({
      data: {
        auth: 'user',
        username: 'testuser',
        password: testPassword,
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        suspended: false,
        createdAt: now,
        updatedAt: now
      }
    });
    console.log('✅ Test user created');
  } catch (e) {
    console.log('ℹ️  Test user already exists');
  }

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Update `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run seed:
```bash
npx prisma db seed
```

**Default Credentials:**
- Admin: `admin` / `admin123`
- Test User: `testuser` / `test123`

---

### Step 7: Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3001

---

### Step 8: Test the Application

1. **Register New User:**
   - Go to http://localhost:3001/register
   - Fill in the form
   - Click "Register"
   - Should redirect to login

2. **Login:**
   - Use your registered credentials
   - Or use test credentials: `testuser` / `test123`
   - Should redirect to dashboard

3. **Verify in Database:**
   ```bash
   npx prisma studio
   ```
   - Check `user` table
   - Should see your registered user

---

## 🎯 Production Deployment

### Step 1: Update Environment Variables

```env
NODE_ENV="production"
DATABASE_URL="your-production-database-url"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="different-secret-for-production"
```

### Step 2: Build Application

```bash
npm run build
```

### Step 3: Apply Migrations

```bash
npx prisma migrate deploy
```

### Step 4: Start Production Server

```bash
npm start
```

---

## 🔧 Common Commands

### Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Database

```bash
# Visual database browser
npx prisma studio

# Push schema changes
npx prisma db push

# Create migration
npx prisma migrate dev

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (DEV ONLY!)
npx prisma migrate reset

# Seed database
npx prisma db seed

# Generate Prisma Client
npx prisma generate
```

### Prisma

```bash
# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Pull schema from database
npx prisma db pull

# Check migration status
npx prisma migrate status
```

---

## 📁 Project Structure

```
recruitment-management-system/
├── app/                          # Next.js 14 app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth routes
│   │   └── register/             # Registration endpoint
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── ui/                       # UI components
│   └── Navbar.tsx                # Navigation bar
├── docs/                         # Documentation
│   ├── DATABASE_SCHEMA.md        # Complete schema docs
│   ├── DATABASE_RELATIONS.md     # Relationships guide
│   ├── ER_DIAGRAM.md            # Visual diagrams
│   └── README.md                # Documentation index
├── lib/                          # Utilities
│   ├── auth.ts                   # NextAuth config
│   ├── prisma.ts                 # Prisma client
│   └── validations.ts            # Validation schemas
├── prisma/                       # Prisma files
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Seed data
│   └── migrations/               # Migration history
├── types/                        # TypeScript types
│   └── next-auth.d.ts            # NextAuth types
├── .env                          # Environment variables (DO NOT COMMIT)
├── env.sample                    # Environment template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── README.md                     # Project README
```

---

## 🐛 Troubleshooting

### "Table does not exist" Error

**Solution:**
```bash
# Stop dev server (Ctrl + C)
npx prisma db push
npm run dev
```

### "EPERM: operation not permitted"

**Cause:** Prisma Client locked by dev server

**Solution:**
```bash
# Stop dev server first
# Then run prisma commands
# Then restart dev server
```

### "Database connection error"

**Check:**
1. Is PostgreSQL running?
2. Is DATABASE_URL correct in `.env`?
3. Can you connect with psql or pgAdmin?
4. For cloud databases, check if project is active

**Test connection:**
```bash
npx prisma db execute --stdin
# Then type: SELECT NOW();
# Press Ctrl+D (Windows) or Ctrl+Z+Enter
```

### "Migration out of sync"

**Solution:**
```bash
# Option 1: Push current schema
npx prisma db push

# Option 2: Create new migration
npx prisma migrate dev --name sync_fix

# Option 3: Reset (DELETES DATA!)
npx prisma migrate reset
```

### Port 3000 Already in Use

**Solution:**
```bash
# Use different port
PORT=3001 npm run dev

# Or update .env
PORT=3001
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Use strong, unique NEXTAUTH_SECRET
- [ ] Use SSL for database connection
- [ ] Enable CORS properly
- [ ] Set up rate limiting
- [ ] Enable logging and monitoring
- [ ] Regular security updates
- [ ] Never commit `.env` file
- [ ] Use environment-specific secrets
- [ ] Enable database backups

---

## 📊 Database Statistics

After setup, you'll have:

- **28 Tables** across 5 modules
- **3 Enums** for type safety
- **50+ Relationships** properly configured
- **Multiple Indexes** for performance
- **Cascade Rules** for data integrity
- **Soft Deletes** for audit trail

---

## 🎓 Learning Resources

### Documentation
- `docs/DATABASE_SCHEMA.md` - Complete schema reference
- `docs/DATABASE_RELATIONS.md` - Relationships and queries
- `docs/ER_DIAGRAM.md` - Visual diagrams

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## ✅ Setup Completion Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Database created
- [ ] Schema applied (`npx prisma db push`)
- [ ] Database verified (`npx prisma studio`)
- [ ] Seed data loaded (optional)
- [ ] Dev server started (`npm run dev`)
- [ ] User registration tested
- [ ] Login tested
- [ ] Database connection verified

---

## 🎉 Success!

If you've completed all steps, your Recruitment Management System is ready to use!

**Next Steps:**
1. Explore the application
2. Read the documentation in `docs/`
3. Start building features
4. Deploy to production when ready

**Need help?** Check the troubleshooting section or documentation files.

---

**Happy Coding! 🚀**

**Last Updated:** October 28, 2025


