import { lazy } from 'react';

// Lazy load heavy components for better performance
export const LazyDashboard = lazy(() => import('@/pages/Dashboard'));
export const LazyProducts = lazy(() => import('@/pages/Products'));
export const LazyMaterialRequests = lazy(() => import('@/pages/MaterialRequests'));
export const LazyPurchaseOrders = lazy(() => import('@/pages/PurchaseOrders'));
export const LazyProjects = lazy(() => import('@/pages/Projects'));
export const LazyAttendance = lazy(() => import('@/pages/Attendance'));
export const LazyPettyCash = lazy(() => import('@/pages/PettyCash'));
export const LazyInventoryMovement = lazy(() => import('@/pages/InventoryMovement'));
export const LazySuppliers = lazy(() => import('@/pages/Suppliers'));
export const LazyClients = lazy(() => import('@/pages/Clients'));
export const LazyUsers = lazy(() => import('@/pages/Users'));
export const LazyCategories = lazy(() => import('@/pages/Categories'));
// Tasks page doesn't exist yet - will be created later
export const LazyReports = lazy(() => import('@/pages/Reports'));

// Lazy load complex UI components
export const LazyOCRWizard = lazy(() => import('@/pages/OCRWizard'));
export const LazyProductComparison = lazy(() => import('@/pages/ProductComparison'));
export const LazyPriceComparison = lazy(() => import('@/pages/PriceComparison'));
export const LazyWhatsAppExport = lazy(() => import('@/pages/WhatsAppExport'));

// Mobile-specific components
export const LazyMobileDashboard = lazy(() => import('@/components/Mobile/MobileDashboard'));