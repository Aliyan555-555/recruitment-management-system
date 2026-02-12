# Recruitment Management System

A professional-grade Next.js application for managing recruitment processes, job postings, applications, and candidate tracking.

## Features

- 🔐 **Secure Authentication** - NextAuth v5 with credentials provider and JWT sessions
- 👥 **User Management** - Comprehensive user profiles with education, skills, and experience
- 💼 **Job Management** - Post, edit, and manage job listings
- 📝 **Application Tracking** - Track applications through the entire recruitment process
- 🎯 **Interview Management** - Schedule and manage screening, focus group, and final interviews
- 📊 **Dashboard Analytics** - Real-time insights into recruitment metrics
- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS and shadcn/ui
- 🗄️ **PostgreSQL Database** - Robust data storage with Prisma ORM

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Authentication**: NextAuth v5 (Auth.js)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Form Validation**: Zod
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn or pnpm

### Installation

1. **Clone the repository** (or you're already here!)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/recruitment_db?schema=public"
   NEXTAUTH_URL="http://localhost:3001"
   NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
   ```

   Generate a secure secret for `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

4. **Set up the database**
   
   Push the Prisma schema to your database:
   ```bash
   npx prisma db push
   ```

   Or if you prefer migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3001](http://localhost:3001)

## Database Schema

The system includes comprehensive models for:

- **User Management**: Users, education, skills, custom fields
- **Job Management**: Jobs, job skills, employment types
- **Applications**: Job applications, bookmarks, CV management
- **Recruitment Process**: Appointments, interviews (screening, focus group, final), letters of intent
- **Testing**: Candidate assessments and tests
- **Supporting Data**: Institutes, education levels

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # NextAuth endpoints
│   │   └── register/     # User registration
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── Navbar.tsx        # Navigation component
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── utils.ts          # Helper functions
│   └── validations.ts    # Zod schemas
├── prisma/
│   └── schema.prisma     # Database schema
├── types/                 # TypeScript type definitions
└── middleware.ts          # Next.js middleware for auth
```

## Authentication

The application uses NextAuth v5 with:
- Credentials provider for email/password login
- JWT session strategy
- Secure password hashing with bcryptjs
- Protected routes via middleware
- Automatic login timestamp tracking

### User Roles

The `auth` field in the User model can be used for role-based access control:
- `user` - Standard user (default)
- `admin` - Administrator
- `recruiter` - Recruiter/HR personnel
- Custom roles as needed

## API Routes

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### User Management
- `POST /api/register` - Register new user

## Development

### Database Management

View your database in Prisma Studio:
```bash
npx prisma studio
```

### Type Safety

The project uses TypeScript for full type safety. Prisma Client is automatically generated with types matching your database schema.

## Deployment

### Environment Variables

Make sure to set all required environment variables in your production environment:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your production URL
- `NEXTAUTH_SECRET` - A secure random string

Optional (for Cloudinary image hosting – organization logos and profile avatars):
- `CLOUDINARY_CLOUD_NAME` - From [Cloudinary Console](https://console.cloudinary.com/)
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

When these are set, logos and avatars are uploaded to Cloudinary instead of local storage. Copy from `.env.example` for a full template.

### Build

```bash
npm run build
npm start
```

## Security Best Practices

- ✅ Passwords are hashed using bcryptjs
- ✅ JWT tokens for session management
- ✅ Environment variables for sensitive data
- ✅ CSRF protection via NextAuth
- ✅ SQL injection protection via Prisma
- ✅ Input validation with Zod schemas

## Contributing

This is a professional recruitment management system. Feel free to extend it with additional features:

- Email notifications
- Calendar integration
- Document management
- Advanced search and filtering
- Analytics and reporting
- Multi-language support

## License

MIT License - feel free to use this project for your recruitment needs!

## Support

For issues or questions, please create an issue in the repository.

