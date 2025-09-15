# Furnili Management System

## Overview
The Furnili Management System is a comprehensive web application designed to enhance operational efficiency and streamline workflows for businesses. It provides robust solutions for staff management, project tracking, inventory control, and financial oversight. Key capabilities include professional PDF export for quotes, mobile-first design, and role-based access control, all while maintaining a consistent Furnili brand identity. The system aims to be a modern, integrated platform for business management, with a vision to become a leading solution for businesses seeking to optimize their operations and maximize market potential.

## User Preferences
Preferred communication style: Simple, everyday language.
Form Layout Requirements: All popup forms must be optimized for screen size with compact layouts - space-y-3 form spacing, h-8 input heights, text-xs labels, max-w-[90vw] mobile width, reduced spacing between rows for maximum space efficiency.

**CRITICAL: LOCAL STORAGE ONLY** - User requires ALL file storage to be local on server (no cloud storage). All images, files, and data must be stored locally in uploads/ folders for VPS deployment. Never use cloud storage services.

Storage Requirements:
- Product images: uploads/products/
- All files: Local filesystem only  
- No cloud dependencies (Google Cloud, AWS, etc.)
- System designed for VPS deployment

## System Architecture

### UI/UX Decisions
The system adheres to a professional and consistent UI/UX based on the "Furnili Design System," featuring a unified component library, a consistent brown theme (hsl(28, 100%, 25%)), and professional color variables. Design elements like consistent styling, proper spacing, and modern card-based layouts are prioritized. The UI is mobile-responsive, with layouts, forms, and tables optimized for various screen sizes, including touch-first UI enhancements. The dashboard layout is standardized to a 3-column responsive grid for admin/manager users, focusing on compact, visually organized information displays.

### Technical Implementations

#### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite

#### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Authentication**: JWT-based authentication
- **File Processing**: Tesseract.js for OCR

### Feature Specifications

#### Authentication & Authorization
- JWT token-based authentication with four distinct user roles (Admin, Manager, Staff, Store Incharge) and role-based access control for route and UI component visibility across all modules. Row Level Security (RLS) is implemented across all database tables.

#### Product Management
- Comprehensive product catalog with categories, brands, specifications, image upload, real-time stock tracking, SKU management, and low-stock alerts. Integrated with a centralized Inventory Movement system for audit trails.

#### BOQ Processing System
- Supports PDF and Excel BOQ uploads with OCR/parsing for automated text extraction and intelligent data extraction (quantities, units, rates, descriptions, project metadata). Includes product matching with existing inventory and auto-generation of material requests.

#### Material Request Workflow
- Full lifecycle management (Submit → Pending → Approved → Issued → Completed) with multi-item support, quantity validation, priority levels, and BOQ reference linking. Dynamic pricing, automatic stock deduction/restoration, and role-based approval workflows are included.

#### Reporting & Analytics
- Role-specific dashboards with key metrics and CSV export functionality for various data types, including category-wise analysis and financial summaries, with comprehensive filtering options.

#### Professional PDF Quote Generation
- Fixed and optimized PDF layout with precise specifications, critical calculation logic (packaging, transportation, GST), and consistent branding.

#### Quote Management Interface
- Complete CRUD operations for quotes with mobile-optimized dialogs, automated title generation, status management, and integrated WhatsApp sharing for PDFs.

#### Staff Management & Payroll
- Comprehensive staff management including attendance tracking, ID details, salary information, document storage, admin check-in/out controls, and automated payroll calculation.

#### Petty Cash Management
- Manual expense entry and OCR processing for UPI payment screenshots, with a dashboard for filtering, search, and balance tracking.

#### Project Management
- Table-based project dashboard with auto-generated project codes, project creation with detailed information, advanced filtering, comprehensive project stages, and integrated quotes functionality. Integrated task management with calendar view.

#### Purchase Order Management
- Complete CRUD operations for purchase orders with supplier management, PO creation, audit logging, mobile-optimized dialogs, and status management. Features auto-generation for low-stock items, integrated supplier database, auto-population of supplier products, and comprehensive stock movement creation/reversal on PO receipt/deletion.

## External Dependencies

### Frontend
- **UI Components**: Radix UI
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **File Upload**: React Dropzone
- **OCR Processing**: Tesseract.js (client-side)
- **Date Manipulation**: date-fns
- **Charts**: Recharts

### Backend
- **Database**: PostgreSQL (via @neondatabase/serverless or standard pg driver)
- **Authentication**: bcryptjs, jsonwebtoken
- **File Upload**: Multer
- **Session Management**: connect-pg-simple
- **Validation**: Zod