# Chem-Base Laboratory Analysis Platform

## Overview

Chem-Base is a comprehensive laboratory analysis platform designed for processing and analyzing chemical data. The system provides automated file processing, AI-powered chemistry insights, task management, and real-time analysis results for laboratory workflows. It supports multiple analytical data formats including chromatography, spectroscopy, and general data files (CSV, XLSX, CDF, JDX/DX).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **File Processing**: Multer for file uploads with support for multiple scientific data formats
- **API Design**: RESTful API with structured error handling and logging middleware

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Entities**:
  - Users with role-based access (admin, lab_manager, technician, analyst)
  - Experiments with file metadata and analysis results
  - Tasks for workflow management
  - Chat messages for AI interactions
  - Reports for analysis summaries
  - Audit logs for system tracking

### AI Integration
- **Chemistry Expert**: OpenAI GPT integration for chemical analysis insights
- **Analysis Capabilities**: Automated data quality assessment, parameter validation, and safety flag detection
- **Chat Interface**: Real-time AI consultation for chemistry questions

### File Processing Pipeline
- **Supported Formats**: CSV, XLSX, CDF (chromatography), JDX/DX (spectroscopy)
- **Processing Flow**: Upload → Format detection → Parsing → Analysis → Report generation
- **Storage**: Local file system with metadata stored in database

### Authentication & Authorization
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **Role-based Access**: User roles controlling feature access and data visibility

### Development Tools
- **Hot Reloading**: Vite development server with Express middleware integration
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Code Quality**: ESLint and TypeScript compiler checks

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM and query builder
- **@tanstack/react-query**: Server state management and caching

### UI Framework
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant styling

### File Processing
- **multer**: File upload middleware for Express
- **File format parsers**: Custom parsers for scientific data formats

### AI Services
- **openai**: OpenAI API client for GPT integration

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety across the entire stack
- **@replit/vite-plugin-***: Replit-specific development plugins

### Styling & Icons
- **lucide-react**: Icon library
- **react-dropzone**: Drag-and-drop file upload interface
- **Google Fonts**: Inter font family for typography