# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server (starts Express + Vite dev server)
npm run dev

# Build for production (builds client + server)
npm run build

# Start production server
npm run start

# TypeScript type checking
npm run check

# Database schema push to Neon PostgreSQL
npm run db:push
```

## Project Architecture

LabPilot is a fullstack laboratory analysis platform built with a React frontend, Express.js backend, and PostgreSQL database. The architecture follows a monorepo structure with shared TypeScript types.

### Directory Structure

- `client/` - React frontend built with Vite
- `server/` - Express.js backend with API routes and services  
- `shared/` - Shared TypeScript types and database schema
- `attached_assets/` - Static assets and uploaded files
- `uploads/` - File upload storage directory

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling and development
- Wouter for client-side routing
- TanStack React Query for server state management
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling
- React Hook Form with Zod validation

**Backend:**
- Node.js with Express.js framework
- Drizzle ORM with PostgreSQL (Neon serverless)
- Session-based authentication with PostgreSQL session store
- Multer for file upload handling
- OpenAI integration for AI chemistry analysis

**Database:**
- PostgreSQL with Neon serverless hosting
- Drizzle ORM for type-safe database operations
- Schema defined in `shared/schema.ts` with full relation mapping

### Key Features

The platform handles scientific data analysis with support for:
- Multiple analytical data formats (CSV, XLSX, CDF chromatography, JDX/DX spectroscopy)
- Project-based organization with team collaboration
- AI-powered chemistry analysis and chat interface
- Task management workflow system
- Role-based access control (admin, lab_manager, technician, analyst)
- Audit logging and data integrity tracking

### Database Schema

Core entities include:
- `users` - User management with role-based access
- `projects` - Project organization with team members
- `experiments` - File uploads with analysis results and metadata
- `tasks` - Workflow management with priority and status tracking
- `reports` - AI-generated analysis summaries with flags and recommendations
- `chatMessages` - AI consultation history with different agent types
- `auditLogs` - System activity tracking

### API Structure

The backend API is organized in `server/routes.ts` with endpoints for:
- User authentication and session management
- Project CRUD operations and team management
- File upload and scientific data processing
- AI chat interface with multiple agent types
- Task management and assignment workflows
- Analysis report generation and retrieval

### File Processing Pipeline

Scientific data files are processed through:
1. Upload via Multer to `uploads/` directory
2. Format detection and parsing in `server/services/fileParser.ts`
3. AI analysis via OpenAI integration in `server/services/openai.ts`
4. Report generation with flags and recommendations
5. Storage of processed results in PostgreSQL

### Development Notes

- Uses ES modules throughout (package.json has `"type": "module"`)
- Shared types between frontend/backend via `@shared` alias
- Path aliases configured: `@/` for client src, `@shared/` for shared types
- No test framework currently configured
- No linting/formatting tools currently configured
- Development server integrates Vite dev server with Express backend
- Replit-specific plugins for development environment