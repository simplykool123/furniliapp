# Furnili Management System

A professional management platform with comprehensive inventory tracking, project management, and staff administration capabilities.

## 🌟 Key Features

### 🔐 Role-Based Access Control
- **4-Tier Role System**: Admin, Manager, Store Incharge, Staff
- **JWT Authentication** with secure session management
- **Permission-based UI** with role-specific navigation

### 📦 Inventory Management
- Complete product catalog with categories and specifications
- Real-time stock tracking with low-stock alerts
- SKU management and barcode support
- Stock movement audit trails

### 🏗️ Project Management
- **Project lifecycle tracking** with stages: Prospect → Recce Done → Design In Progress → Design Approved → Estimate Given → Client Approved → Production → Installation → Handover → Completed
- **Project code generation** (Fur/25-26/XXX format)
- **Client database integration**
- **Project file management** with comments and tagging

### 📋 Material Requests
- **Workflow management**: Submit → Pending → Approved → Issued → Completed
- Multi-item requests with quantity validation
- Project-specific context linking
- Priority levels and approval workflows

### 👥 Staff Management
- **Attendance tracking** with check-in/out controls
- **Payroll management** with automated calculations
- **Leave management** with approval workflows
- **Role-based access** to staff functions

### 💰 Financial Management
- **Petty cash tracking** with OCR receipt processing
- **Expense categorization** and approval workflows
- **Balance tracking** with debit/credit indicators
- **Staff-wise expense monitoring**

### 📊 Reports & Analytics
- **Role-specific dashboards** with key metrics
- **CSV export capabilities** for all data types
- **Category-wise analysis** and financial summaries
- **Real-time statistics** and performance tracking

## 🚀 Technology Stack

- **Frontend**: React 18 + TypeScript, Wouter routing, TanStack Query
- **Backend**: Express.js + Node.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: shadcn/ui components on Tailwind CSS
- **Authentication**: JWT with role-based permissions
- **File Processing**: Tesseract.js for OCR capabilities

## 🏗️ Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   └── lib/           # Utilities and configurations
├── server/                # Express.js backend
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── db.ts             # Database connection
├── shared/                # Shared types and schemas
│   └── schema.ts         # Drizzle ORM schema definitions
└── migrations/           # Database migration files
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git for version control

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd workforce-management
npm install
```

2. **Database setup**
```bash
# Set up your DATABASE_URL environment variable
# Run database migrations
npm run db:push
```

3. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 👥 Default Users

| Role | Username | Email | Password |
|------|----------|-------|----------|
| Admin | admin | admin@demo.com | admin123 |
| Manager | manager | manager@demo.com | manager123 |
| Store Incharge | store | store@demo.com | store123 |
| Staff | staff | staff@demo.com | staff123 |

## 🔧 Configuration

Environment variables required:
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: development/production
- `JWT_SECRET`: Secret for JWT token signing

## 📱 Mobile-First Design

The system is fully responsive with:
- **Compact mobile layouts** optimized for small screens
- **Touch-friendly interfaces** with proper spacing
- **Mobile navigation** with collapsible sidebar
- **Responsive tables** with mobile-optimized views

## 🏢 Furnili Design System

Consistent branding with:
- **Professional brown theme** (hsl(28, 100%, 25%))
- **Unified component library** across all modules
- **Consistent spacing and typography**
- **Modern card-based layouts**

## 📝 License

This project is licensed under the MIT License.

## 🤝 Support

For support and questions, please contact the development team.