# Documentation Index
## Recruitment Management System

Welcome to the Recruitment Management System documentation. This folder contains comprehensive documentation for the database schema, relationships, and system architecture.

---

## 📚 Documentation Files

### 1. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
**Complete database schema documentation**

- Full table definitions with all columns
- Data types and constraints
- Enums and their usage
- Indexes and performance optimization
- Soft delete patterns
- Migration commands
- Database design principles

**Use this when:**
- Understanding table structures
- Writing database queries
- Implementing new features
- Reviewing data types and constraints

---

### 2. [DATABASE_RELATIONS.md](./DATABASE_RELATIONS.md)
**Detailed relationship mappings**

- All table relationships explained
- Cascade rules and foreign keys
- Query examples for common operations
- Best practices for database operations
- Transaction examples
- Relationship validation rules

**Use this when:**
- Understanding how tables connect
- Writing complex queries with joins
- Implementing features that span multiple tables
- Debugging relationship issues

---

### 3. [ER_DIAGRAM.md](./ER_DIAGRAM.md)
**Visual database diagrams**

- Complete Entity-Relationship diagram (Mermaid)
- Module-specific diagrams
- Cascade delete visualizations
- Data flow diagrams
- Process sequence diagrams

**Use this when:**
- Getting a visual overview of the database
- Understanding system architecture
- Planning new features
- Onboarding new developers

---

## 🚀 Quick Start Guide

### For New Developers

1. **Understand the System**
   - Start with [ER_DIAGRAM.md](./ER_DIAGRAM.md) for visual overview
   - Read [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed structure
   - Review [DATABASE_RELATIONS.md](./DATABASE_RELATIONS.md) for relationships

2. **Set Up Database**
   ```bash
   # Copy environment variables
   cp env.sample .env
   
   # Edit .env with your database credentials
   nano .env
   
   # Generate Prisma Client
   npx prisma generate
   
   # Run migrations to create database tables
   npx prisma migrate dev
   
   # Open Prisma Studio to view database
   npx prisma studio
   ```

3. **Explore the Code**
   - Database schema: `prisma/schema.prisma`
   - API routes: `app/api/`
   - Components: `components/`

---

## 📊 Database Modules

The database is organized into 5 main modules:

### 1. 👤 User Management
**Tables:** user, user_education, user_skills, user_info_*

Handles user profiles, authentication, education, and skills.

### 2. 💼 Jobs & Applications
**Tables:** jobs, job_skills, jobs_applied, jobs_bookmark

Manages job postings and application tracking.

### 3. 📄 Document Management
**Tables:** cv_manager*, gallery*

Stores and manages resumes and documents.

### 4. 🎯 Recruitment Process
**Tables:** screening_interview, final_interview, br_appointment, etc.

Tracks candidates through the hiring pipeline.

### 5. 🏫 Supporting Tables
**Tables:** institute, user_education_level

Reference data for other modules.

---

## 🔗 Key Relationships

```
User
├── has many → UserEducation
├── has many → UserSkills
├── has many → JobsApplied
├── has many → CvManagerCv
└── has many → Interviews

Job
├── has many → JobSkill
├── has many → JobsApplied
└── belongs to → User (creator)

JobsApplied
├── belongs to → User
├── belongs to → Job
└── belongs to → CvManagerCv
```

---

## 🛠️ Common Operations

### Query User with All Data
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    educations: { include: { educationLevel: true } },
    skills: true,
    cvs: true,
    jobsApplied: { include: { job: true } }
  }
});
```

### Query Job with Applications
```typescript
const job = await prisma.job.findUnique({
  where: { id: jobId },
  include: {
    skills: true,
    applications: {
      include: {
        user: true,
        cv: true
      }
    }
  }
});
```

### Create Job Application
```typescript
const application = await prisma.jobsApplied.create({
  data: {
    jobId: jobId,
    userId: userId,
    cvId: cvId,
    status: 'SUBMITTED',
    appliedAt: BigInt(Date.now())
  }
});
```

---

## 📐 Database Schema Overview

| Module | Tables | Purpose |
|--------|--------|---------|
| User Management | 8 | User profiles, education, skills |
| Jobs & Applications | 5 | Job postings and applications |
| Document Management | 6 | CV and document storage |
| Recruitment Process | 5 | Interview and hiring workflow |
| Supporting | 4 | Reference data |
| **Total** | **28** | Complete recruitment system |

---

## 🔐 Security Considerations

1. **Password Storage**
   - Passwords are hashed using bcrypt
   - Never store plain text passwords

2. **Soft Deletes**
   - Important records use soft delete (`deletedAt`)
   - Allows recovery and maintains audit trail

3. **Access Control**
   - User `auth` field defines role/permissions
   - Implement proper authorization in API routes

4. **Data Privacy**
   - PII stored in user table
   - Consider encryption for sensitive fields
   - Implement GDPR compliance features

---

## 🎯 Data Integrity Rules

### Cascade Deletes
When a User is deleted:
- ✅ UserEducation, UserSkills, UserInfoData
- ✅ CvManagerCv, GalleryCv
- ✅ JobsApplied, JobsBookmark
- ✅ All interview records
- ✅ UtTest (as test taker)

When a Job is deleted:
- ✅ JobSkill, JobsApplied, JobsBookmark
- ✅ UtTest records

### Restricted Deletes
Cannot delete:
- ❌ User who created jobs (unless jobs deleted first)
- ❌ UserEducationLevel in use
- ❌ Institute in use
- ❌ UserInfoField with data

---

## 📝 Timestamps

All timestamps use **Unix timestamp (BigInt)** format:

```typescript
// Store current time
const now = BigInt(Date.now());

// Convert to Date
const date = new Date(Number(record.createdAt));

// Format for display
const formatted = new Date(Number(record.createdAt)).toLocaleDateString();
```

---

## 🔍 Indexes

### Automatic Indexes
- All primary keys (id)
- All foreign keys
- Unique constraints (username, email)

### Custom Indexes
```prisma
@@index([userId])
@@index([jobId, userId])
@@index([status, deletedAt])
```

Use indexes for:
- Foreign key lookups
- Frequently filtered fields
- Sorting columns
- Composite queries

---

## 🧪 Testing Queries

Use Prisma Studio for visual database exploration:

```bash
npx prisma studio
```

Or run queries in the terminal:

```bash
npx prisma db execute --stdin < query.sql
```

---

## 📦 Database Migrations

### Create Migration
```bash
npx prisma migrate dev --name description_of_changes
```

### Apply Migrations (Production)
```bash
npx prisma migrate deploy
```

### Reset Database (Dev Only)
```bash
npx prisma migrate reset
```

### Generate Client
```bash
npx prisma generate
```

---

## 🔄 Workflow: Job Application

```
1. User registers/logs in
   ↓
2. User creates/uploads CV
   ↓
3. User browses jobs
   ↓
4. User applies to job (with CV)
   ↓
5. Application tracked in jobs_applied
   ↓
6. Admin assigns test (ut_test)
   ↓
7. User completes test
   ↓
8. Screening interview
   ↓
9. Focus group interview
   ↓
10. Final interview
    ↓
11. Letter of intent
    ↓
12. Appointment/Hiring
```

---

## 📚 Additional Resources

### Prisma Documentation
- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

### PostgreSQL Resources
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)

### Database Design
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- [ER Diagrams](https://www.lucidchart.com/pages/er-diagrams)

---

## 🤝 Contributing

When modifying the database schema:

1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev`
3. Update documentation in this folder
4. Update ER diagrams if structure changes
5. Test all affected queries
6. Update API routes if needed

---

## 📞 Support

For questions about the database:
- Review documentation in this folder
- Check Prisma logs: Enable `PRISMA_QUERY_LOG=true` in .env
- Use Prisma Studio: `npx prisma studio`
- Check migration history: `prisma/migrations/`

---

## 🎨 Visualization Tools

### View ER Diagrams
1. **Mermaid Live Editor**: https://mermaid.live/
2. **VS Code Extension**: Markdown Preview Mermaid Support
3. **GitHub**: Native Mermaid rendering

### Database Visualization
1. **Prisma Studio**: `npx prisma studio`
2. **pgAdmin**: PostgreSQL GUI tool
3. **DBeaver**: Universal database tool

---

## 📄 File Structure

```
docs/
├── README.md                    # This file
├── DATABASE_SCHEMA.md           # Complete schema documentation
├── DATABASE_RELATIONS.md        # Relationships and queries
└── ER_DIAGRAM.md               # Visual diagrams

prisma/
├── schema.prisma               # Database schema definition
└── migrations/                 # Migration history

env.sample                      # Environment variables template
```

---

## ✅ Documentation Checklist

When adding new features:

- [ ] Update `prisma/schema.prisma`
- [ ] Create migration
- [ ] Update DATABASE_SCHEMA.md with new tables/fields
- [ ] Update DATABASE_RELATIONS.md with new relationships
- [ ] Update ER_DIAGRAM.md with visual changes
- [ ] Add query examples for new features
- [ ] Update API documentation
- [ ] Test all queries

---

**Last Updated:** October 28, 2025  
**Database Version:** 1.0  
**Prisma Version:** 5.22.0  
**PostgreSQL Version:** 14+

---

**Happy Coding! 🚀**

