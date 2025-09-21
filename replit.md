# Consulta Ciudadana Honduras

## Overview

This is a citizen consultation web application for Honduras that enables citizens to submit feedback and consultations to government entities. The application features a multi-tier architecture with a React frontend, Express.js backend, and PostgreSQL database. It supports different types of citizen participation (natural persons, legal entities, and anonymous users) with hierarchical location selection and sector-based categorization.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**September 21, 2025:**
- Completely removed sidebar navigation and statistics cards from dashboard for streamlined SPE interface
- Implemented role-specific dashboard views: SPE sees user management interface instead of charts
- Added "planificador" role to schema and updated role hierarchy
- Created SPE-exclusive user management component for creating planificador users
- Added `/login` route alias for easier access to authentication page
- Verified SPE credentials and functionality through automated testing

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Custom components built on Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with Bootstrap 5 integration for specific components
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Color Scheme**: Honduras-themed palette with primary color #1bd1e8 (celeste Honduras)

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple
- **API Design**: RESTful endpoints with JSON responses
- **Password Security**: scrypt-based hashing with salt

### Database Architecture
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Design**: 
  - Hierarchical location structure (departments → municipalities → localities)
  - User role-based access control (ciudadano, admin, super_admin)
  - Consultation system with person type variants (natural, juridica, anonimo)
  - Sector-based categorization with search capabilities
- **Migrations**: Drizzle Kit for schema migrations

### Authentication & Authorization
- **Strategy**: Session-based authentication with PostgreSQL session store
- **User Roles**: Four-tier system (ciudadano, admin, super_admin, planificador)
- **Protected Routes**: Role-based route protection on frontend
- **Password Policy**: Minimum 6 characters with secure hashing
- **SPE Super Admin**: Permanent super administrator account (username: SPE) with deletion protection and exclusive user management capabilities

### Form Architecture
- **Validation**: Zod schemas shared between frontend and backend
- **Dynamic Forms**: Conditional field rendering based on person type selection
- **Location Hierarchy**: Cascading dropdowns for department → municipality → locality selection
- **Sector Search**: Smart search with auto-suggestions for sector selection

### Development Environment
- **Build System**: Vite with TypeScript configuration
- **Development Tools**: tsx for TypeScript execution, esbuild for production builds
- **Code Organization**: Monorepo structure with shared schema definitions
- **Path Aliases**: Configured for clean imports (@/, @shared/, @assets/)

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection for Neon database
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **express**: Web framework for Node.js backend
- **passport**: Authentication middleware with local strategy
- **react**: Frontend framework with TypeScript support

### UI Component Libraries
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **bootstrap**: CSS framework for specific components and icons

### Development Tools
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundler for production builds
- **drizzle-kit**: Database migration and schema management

### Form & Validation
- **react-hook-form**: Performant form library with minimal re-renders
- **@hookform/resolvers**: Validation resolvers for React Hook Form
- **zod**: TypeScript-first schema validation
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation

### Hosting & Infrastructure
- **Replit**: Development and hosting platform
- **Neon**: Serverless PostgreSQL hosting
- **WebSocket**: Real-time capabilities via ws library for database connections