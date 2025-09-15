// Comprehensive System Check - Furnili Management System
// Testing frontend-backend-database connectivity for all major pages

const fs = require('fs');
const path = require('path');

console.log("=== FURNILI MANAGEMENT SYSTEM - COMPREHENSIVE CHECK ===\n");

// 1. Check if all required files exist
const requiredFiles = [
  'client/src/pages/Dashboard.tsx',
  'client/src/pages/Products.tsx', 
  'client/src/pages/Projects.tsx',
  'client/src/pages/MaterialRequests.tsx',
  'client/src/pages/Reports.tsx',
  'client/src/pages/BOQ.tsx',
  'client/src/pages/PettyCash.tsx',
  'client/src/pages/Attendance.tsx',
  'client/src/pages/Users.tsx',
  'client/src/pages/Categories.tsx',
  'client/src/pages/Clients.tsx',
  'client/src/pages/Suppliers.tsx',
  'client/src/pages/PurchaseOrders.tsx',
  'client/src/pages/SalesProducts.tsx',
  'client/src/pages/InventoryMovement.tsx',
  'server/routes.ts',
  'server/storage.ts',
  'shared/schema.ts'
];

console.log("1. FILE STRUCTURE CHECK");
console.log("========================");
let fileIssues = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ ${file} - MISSING`);
    fileIssues.push(file);
  }
});

if (fileIssues.length > 0) {
  console.log(`\n⚠️  ${fileIssues.length} missing files found!`);
} else {
  console.log("\n✅ All core files present");
}

// 2. Check routes.ts for API endpoint coverage
console.log("\n\n2. API ROUTES COVERAGE CHECK");
console.log("==============================");

if (fs.existsSync('server/routes.ts')) {
  const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
  
  const expectedRoutes = [
    '/api/auth/login',
    '/api/dashboard/stats',
    '/api/products',
    '/api/categories', 
    '/api/clients',
    '/api/projects',
    '/api/requests', // material requests
    '/api/quotes',
    '/api/suppliers',
    '/api/purchase-orders',
    '/api/sales-products',
    '/api/users',
    '/api/attendance',
    '/api/petty-cash',
    '/api/reports',
    '/api/inventory-movements'
  ];

  expectedRoutes.forEach(route => {
    if (routesContent.includes(route)) {
      console.log(`✓ ${route}`);
    } else {
      console.log(`✗ ${route} - MISSING OR INCOMPLETE`);
    }
  });
}

// 3. Check schema.ts for database table definitions
console.log("\n\n3. DATABASE SCHEMA CHECK");
console.log("=========================");

if (fs.existsSync('shared/schema.ts')) {
  const schemaContent = fs.readFileSync('shared/schema.ts', 'utf8');
  
  const expectedTables = [
    'users',
    'categories',
    'products',
    'clients', 
    'projects',
    'materialRequests',
    'quotes',
    'suppliers',
    'purchaseOrders',
    'salesProducts',
    'attendance',
    'pettyCashExpenses',
    'stockMovements',
    'projectLogs',
    'projectFiles'
  ];

  expectedTables.forEach(table => {
    if (schemaContent.includes(`export const ${table}`)) {
      console.log(`✓ ${table}`);
    } else {
      console.log(`✗ ${table} - MISSING TABLE DEFINITION`);
    }
  });
}

// 4. Check package.json dependencies
console.log("\n\n4. DEPENDENCIES CHECK");
console.log("======================");

if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const criticalDeps = [
    'express',
    'react',
    'drizzle-orm',
    '@tanstack/react-query',
    'wouter',
    'zod',
    'bcryptjs',
    'jsonwebtoken',
    '@types/node',
    'typescript'
  ];

  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  criticalDeps.forEach(dep => {
    if (allDeps[dep]) {
      console.log(`✓ ${dep} v${allDeps[dep]}`);
    } else {
      console.log(`✗ ${dep} - MISSING`);
    }
  });
}

console.log("\n\n=== SYSTEM CHECK COMPLETED ===");
console.log("\nNext steps:");
console.log("1. Check console logs for runtime errors");
console.log("2. Test API endpoints with proper authentication"); 
console.log("3. Verify database connectivity");
console.log("4. Test frontend page loading and data fetching");