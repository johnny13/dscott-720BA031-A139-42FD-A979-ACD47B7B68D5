# Task Management System

A full-stack Task Management System built with NX Monorepo, featuring a NestJS backend and Angular frontend.

## Project Structure

This is an NX monorepo containing:

- **`api`** - NestJS backend application
- **`dashboard`** - Angular frontend application

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeORM** - ORM for database management
- **SQLite** - Database
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **class-validator** - DTO validation
- **Swagger/OpenAPI** - API documentation

### Frontend
- **Angular** - Frontend framework
- **TailwindCSS** - Utility-first CSS framework
- **Angular CDK** - Drag and drop functionality
- **Angular Signals** - Reactive state management

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

### Running the Applications

#### Backend (API)

```bash
npx nx serve api
```

The API will be available at `http://localhost:3000/api`

**Swagger Documentation:** `http://localhost:3000/api/docs`

#### Frontend (Dashboard)

```bash
npx nx serve dashboard
```

The dashboard will be available at `http://localhost:4200`

**Note:** Make sure the backend API is running on `http://localhost:3000` for the frontend to work properly.

## Database

The application uses SQLite with TypeORM. The database file (`task-management.db`) will be created automatically on first run. All entities are synchronized automatically (set `synchronize: false` in production).

## Frontend Features

### Authentication
- **Login/Register Page**: Beautiful TailwindCSS-styled authentication interface
- **JWT Token Management**: Automatic token storage and retrieval from localStorage
- **AuthInterceptor**: Automatically attaches JWT token to all API requests
- **Route Protection**: Redirects to login if not authenticated

### Task Dashboard
- **Board View**: Kanban-style board with three columns (Todo, In Progress, Done)
- **List View**: Clean list view of all tasks with status and category badges
- **Drag & Drop**: Drag tasks between columns to update their status automatically
- **Create Task Modal**: Easy-to-use form for creating new tasks with validation
- **Filtering**: Filter tasks by Category (Work/Personal) and Status (Todo/In Progress/Done)
- **Real-time Updates**: Tasks update immediately using Angular Signals
- **Task Management**: Delete tasks with confirmation dialog
- **Optimistic Updates**: Immediate UI feedback when dragging tasks or making changes

### User Experience
- **Dark/Light Mode**: Toggle between themes with persistent preference (stored in localStorage)
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Visual Feedback**: Loading states, error messages, and smooth transitions
- **Branding**: Logo image (36px) in header and crest SVG at bottom of dashboard (centered)
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## Backend Architecture

### Entities

#### BaseEntity
Abstract base class providing:
- `id` (UUID)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### User Entity
- `email` (unique)
- `password` (hashed with bcrypt)
- `role` (owner/admin/viewer) - Role-Based Access Control
- `organizationId` (foreign key)

#### Organization Entity
- `name`
- `parentId` (supports 2-level hierarchy)
- Relationships: users, tasks, parent/children organizations

#### Task Entity
- `title`
- `description`
- `status` (todo/in_progress/done)
- `category` (Work/Personal)
- `userId` (foreign key)
- `organizationId` (foreign key)

### Authentication

The backend implements JWT authentication using Passport.js:

- **JWT Strategy**: Validates JWT tokens from Authorization header
- **JWT Guard**: `JwtAuthGuard` for protecting routes
- **Password Hashing**: bcrypt with 10 salt rounds

### Role-Based Access Control (RBAC)

The system implements three roles with hierarchical permissions:

- **Owner**: Can see/edit everything in their Organization and sub-organizations
- **Admin**: Can see/edit everything in their specific Organization
- **Viewer**: Can only see tasks assigned to them

**Role Assignment:**
- First user in an organization becomes `Owner` automatically
- Subsequent users default to `Viewer` role

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "organizationName": "My Organization"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "owner",
    "organizationId": "uuid"
  }
}
```

**Note:** The first user in an organization automatically receives the `owner` role. Subsequent users default to `viewer` role.

**Error Responses:**
- `409 Conflict` - User with this email already exists
- `400 Bad Request` - Validation errors

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "organizationId": "uuid"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials

### Tasks

All task endpoints require JWT authentication and implement role-based filtering.

#### Get All Tasks
```http
GET /api/tasks
Authorization: Bearer <token>
```

**Response:** Returns tasks filtered by user role:
- **Owner**: All tasks in organization and sub-organizations
- **Admin**: All tasks in their organization
- **Viewer**: Only tasks assigned to them

#### Get Single Task
```http
GET /api/tasks/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Task title",
  "description": "Task description",
  "status": "todo",
  "category": "Work",
  "userId": "uuid",
  "organizationId": "uuid",
  "createdAt": "2025-12-18T...",
  "updatedAt": "2025-12-18T..."
}
```

**Error Responses:**
- `404 Not Found` - Task not found
- `403 Forbidden` - Insufficient permissions

#### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Complete project documentation",
  "description": "Write comprehensive documentation",
  "category": "Work",
  "status": "todo",
  "userId": "uuid" // optional, defaults to current user
}
```

**Response:** Created task object

**Error Responses:**
- `403 Forbidden` - Viewers cannot create tasks
- `400 Bad Request` - Validation errors

#### Update Task
```http
PATCH /api/tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "status": "in_progress",
  "category": "Personal"
}
```

**Error Responses:**
- `404 Not Found` - Task not found
- `403 Forbidden` - Viewers cannot update; Admins cannot edit tasks from different organizations

#### Delete Task
```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

**Error Responses:**
- `404 Not Found` - Task not found
- `403 Forbidden` - Viewers cannot delete; Admins cannot delete tasks from different organizations

### Audit Logs

#### Get Audit Logs
```http
GET /api/audit-log
Authorization: Bearer <token>
```

**Response:** Array of audit log entries

**Access:** Only `Owner` and `Admin` roles can access audit logs

**Error Responses:**
- `403 Forbidden` - Insufficient permissions (Viewers cannot access)

### Using the JWT Token

Include the JWT token in the Authorization header for protected routes:

```http
GET /api/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Swagger Documentation

Interactive API documentation is available at:
- **URL**: `http://localhost:3000/api/docs`
- Features:
  - Try out all endpoints directly from the browser
  - View request/response schemas
  - Test authentication with the "Authorize" button
  - See example values for all fields

## Development

### Building

Build the backend:
```bash
npx nx build api
```

Build the frontend:
```bash
npx nx build dashboard
```

### Testing

Run tests:
```bash
npx nx test api
npx nx test dashboard
```

Run tests for just the backend API
```bash
nx run api:test # same as `npx nx test api`

 PASS   api  api/src/app/guards/access.guard.spec.ts
  AccessGuard
    ✓ should be defined (8 ms)
    ✓ should allow access when no roles are required (3 ms)
    ✓ should allow access when user has required role (OWNER) (2 ms)
    ✓ should allow access when user has required role (ADMIN) (2 ms)
    ✓ should allow access when user has one of multiple required roles (2 ms)
    ✓ should deny access when user does not have required role (8 ms)
    ✓ should deny access when user is not authenticated (2 ms)
    ✓ should verify role inheritance - VIEWER cannot access OWNER/ADMIN endpoints (2 ms)
    ✓ should verify role inheritance - ADMIN can access ADMIN endpoints (1 ms)
    ✓ should verify role inheritance - OWNER can access OWNER endpoints (1 ms)
    ✓ should verify role inheritance - OWNER can access ADMIN endpoints (2 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        2.255 s
Ran all test suites.
```


## Environment Variables

Create a `.env` file in the root directory (optional):

```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

**Note:** If `JWT_SECRET` is not set, a default secret will be used. **Always use a strong, unique secret in production.**

## Security Notes

1. **JWT Secret**: Change the default JWT secret in production
2. **Database Synchronization**: Set `synchronize: false` in production and use migrations
3. **Password Requirements**: Currently minimum 6 characters (can be enhanced)
4. **CORS**: Configure CORS properly for production
5. **HTTPS**: Always use HTTPS in production

## Project Status

### Phase 1 - Completed ✅
- [x] NX workspace setup
- [x] NestJS backend with TypeORM and SQLite
- [x] BaseEntity with audit fields
- [x] User, Organization, and Task entities
- [x] JWT authentication with Passport.js
- [x] Login and Register endpoints
- [x] Password hashing with bcrypt

### Phase 2 - Completed ✅
- [x] Role-Based Access Control (RBAC) with Owner, Admin, Viewer roles
- [x] @Roles() decorator and AccessGuard implementation
- [x] Tasks CRUD operations with role-based filtering
- [x] GET /tasks endpoint with automatic role-based filtering
- [x] POST, PATCH, DELETE /tasks with permission checks
- [x] AuditService for logging all task access/modifications
- [x] GET /audit-log endpoint (Owner/Admin only)
- [x] Swagger/OpenAPI documentation
- [x] Jest unit tests for AccessGuard

### Phase 3 - Completed ✅
- [x] TailwindCSS setup and configuration with dark mode support
- [x] Auth UI with login/register page (TailwindCSS styled)
- [x] JWT token storage in localStorage
- [x] AuthInterceptor for automatic token attachment to all API requests
- [x] Task Dashboard with board view (Kanban-style columns)
- [x] Task Dashboard with list view (table-style display)
- [x] Create Task modal with form validation
- [x] Filtering by Category (Work/Personal) and Status (Todo/In Progress/Done)
- [x] CDK drag-drop for task reordering between status columns
- [x] State management with Angular Signals for reactive updates
- [x] Responsive design for mobile, tablet, and desktop
- [x] Dark/Light mode toggle with theme persistence
- [x] Logo image in header (36px height)
- [x] Crest SVG image at bottom of dashboard (centered)

### Future Phases
- User management interface
- Organization hierarchy management UI
- Task assignment and reassignment features
- Advanced filtering and search
- Email notifications
- Task comments and attachments
- Real-time collaboration features

## License

This project is part of a development exercise.
