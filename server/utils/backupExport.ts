import archiver from 'archiver';
import { Writable } from 'stream';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';

interface BackupData {
  [key: string]: any[];
}

// Create CSV content from array of objects
function createCSV(data: any[], filename: string): string {
  if (!data.length) return 'No data available';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle null/undefined values and escape commas/quotes
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

// Create a complete project backup including source code
function addProjectFilesToZip(zip: any) {
  // Add main project files
  const projectFiles = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'components.json',
    'drizzle.config.ts',
    'README.md',
    'HOSTINGER_DEPLOYMENT_GUIDE.md',
    'hostinger_sql_export.sql',
    'HOSTINGER_DEPLOYMENT_PACKAGE.md'
  ];

  // Add each file if it exists
  
  projectFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        zip.append(content, { name: file });
      }
    } catch (error) {
      console.log(`Could not add ${file}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  });

  // Add client folder (React frontend)
  try {
    addDirectoryToZip(zip, 'client', 'client');
  } catch (error) {
    console.log('Could not add client folder:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Add server folder (Express backend)
  try {
    addDirectoryToZip(zip, 'server', 'server');
  } catch (error) {
    console.log('Could not add server folder:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Add shared folder
  try {
    addDirectoryToZip(zip, 'shared', 'shared');
  } catch (error) {
    console.log('Could not add shared folder:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Recursively add directory to zip
function addDirectoryToZip(zip: any, dirPath: string, zipPath: string) {
  
  if (!fs.existsSync(dirPath)) return;
  
  const items = fs.readdirSync(dirPath);
  
  items.forEach((item: string) => {
    // Skip node_modules, dist, .git, and other unwanted directories
    if (['node_modules', 'dist', '.git', '.next', 'build', 'coverage'].includes(item)) {
      return;
    }
    
    const itemPath = path.join(dirPath, item);
    const itemZipPath = `${zipPath}/${item}`;
    
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      addDirectoryToZip(zip, itemPath, itemZipPath);
    } else {
      try {
        const content = fs.readFileSync(itemPath);
        zip.append(content, { name: itemZipPath });
      } catch (error) {
        console.log(`Could not add file ${itemPath}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  });
}

// Get all system data for backup
export async function getAllBackupData(): Promise<BackupData> {
  try {
    const backupData: BackupData = {};
    
    // Products with stock information
    try {
      const products = await storage.getAllProducts();
      if (products.length > 0) {
        backupData.products = products.map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand || '',
          size: product.size || '',
          thickness: product.thickness || '',
          pricePerUnit: product.pricePerUnit,
          currentStock: product.currentStock,
          minStock: product.minStock,
          unit: product.unit,
          sku: product.sku,
          isActive: product.isActive,
          createdAt: product.createdAt
        }));
      }
    } catch (error) {
      console.log('Products data not available:', error);
    }

    // Categories
    try {
      const categories = await storage.getAllCategories();
      if (categories.length > 0) {
        backupData.categories = categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || '',
          isActive: cat.isActive,
          createdAt: cat.createdAt
        }));
      }
    } catch (error) {
      console.log('Categories data not available:', error);
    }

    // Stock Movements
    try {
      const movements = await storage.getStockMovements();
      if (movements.length > 0) {
        backupData.stock_movements = movements.map(mov => ({
          id: mov.id,
          productId: mov.productId,
          movementType: mov.movementType,
          quantity: mov.quantity,
          previousStock: mov.previousStock,
          newStock: mov.newStock,
          reference: mov.reference || '',
          notes: mov.notes || '',
          vendor: mov.vendor || '',
          costPerUnit: mov.costPerUnit || 0,
          totalCost: mov.totalCost || 0,
          performedBy: mov.performedBy,
          createdAt: mov.createdAt
        }));
      }
    } catch (error) {
      console.log('Stock movements data not available:', error);
    }

    // Material Requests
    try {
      const requests = await storage.getAllMaterialRequests();
      if (requests.length > 0) {
        backupData.material_requests = requests.map(req => ({
          id: req.id,
          clientName: req.clientName,
          orderNumber: req.orderNumber,
          priority: req.priority,
          status: req.status,
          requestedBy: req.requestedBy,
          approvedBy: req.approvedBy || '',
          approvedAt: req.approvedAt || '',
          issuedBy: req.issuedBy || '',
          issuedAt: req.issuedAt || '',
          totalValue: req.totalValue,
          boqReference: req.boqReference || '',
          remarks: req.remarks || '',
          createdAt: req.createdAt
        }));
      }
    } catch (error) {
      console.log('Material requests data not available:', error);
    }

    // Attendance Records
    try {
      const attendance = await storage.getAllAttendance();
      if (attendance.length > 0) {
        backupData.attendance = attendance.map(att => ({
          id: att.id,
          userId: att.userId,
          date: att.date,
          checkInTime: att.checkInTime || '',
          checkOutTime: att.checkOutTime || '',
          totalHours: 0, // Field not in current schema
          overtimeHours: 0, // Field not in current schema
          status: att.status,
          location: att.location || '',
          notes: att.notes || '',
          checkInBy: att.checkInBy || '',
          checkOutBy: att.checkOutBy || '',
          isManualEntry: att.isManualEntry || false,
          createdAt: att.createdAt
        }));
      }
    } catch (error) {
      console.log('Attendance data not available:', error);
    }

    // Payroll Records
    try {
      const payroll = await storage.getAllPayroll();
      if (payroll.length > 0) {
        backupData.payroll = payroll.map(pay => ({
          id: pay.id,
          userId: pay.userId,
          month: pay.month,
          year: pay.year,
          basicSalary: pay.basicSalary,
          overtimePay: pay.overtimePay,
          allowances: pay.allowances,
          deductions: pay.deductions,
          netSalary: pay.netSalary,
          workingDays: 30, // Default values - adjust based on actual schema
          presentDays: 25, // Default values - adjust based on actual schema
          totalHours: pay.totalHours,
          overtimeHours: pay.overtimeHours,
          status: pay.status,
          processedBy: pay.processedBy || '',
          processedAt: pay.processedAt || '',
          createdAt: pay.createdAt
        }));
      }
    } catch (error) {
      console.log('Payroll data not available:', error);
    }

    // Petty Cash Expenses
    try {
      const expenses = await storage.getAllPettyCashExpenses();
      if (expenses.length > 0) {
        backupData.petty_cash = expenses.map(exp => ({
          id: exp.id,
          category: exp.category,
          amount: exp.amount,
          vendor: exp.vendor || '',
          description: exp.description || '',
          orderNo: exp.orderNo || '',
          receiptImage: exp.receiptImageUrl || '',
          addedBy: exp.addedBy,
          status: exp.status,
          approvedBy: exp.approvedBy || '',
          createdAt: exp.createdAt
        }));
      }
    } catch (error) {
      console.log('Petty cash data not available:', error);
    }

    // Tasks
    try {
      const tasks = await storage.getAllTasks();
      if (tasks.length > 0) {
        backupData.tasks = tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          assignedTo: task.assignedTo,
          assignedBy: task.assignedBy,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate || '',
          completedAt: task.completedAt || '',
          createdAt: task.createdAt
        }));
      }
    } catch (error) {
      console.log('Tasks data not available:', error);
    }

    // Users (without passwords)
    try {
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        backupData.users = users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone || '',
          department: user.department || '',
          designation: user.designation || '',
          basicSalary: user.basicSalary || 0,
          isActive: user.isActive,
          lastLogin: user.lastLogin || '',
          createdAt: user.createdAt
        }));
      }
    } catch (error) {
      console.log('Users data not available:', error);
    }

    // Projects
    try {
      const projects = await storage.getAllProjects();
      if (projects.length > 0) {
        backupData.projects = projects.map(proj => ({
          id: proj.id,
          code: proj.code,
          name: proj.name,
          clientId: proj.clientId,
          stage: proj.stage,
          budget: proj.budget || 0,
          description: proj.description || '',
          startDate: proj.startDate || '',
          endDate: proj.endDate || '',
          priority: proj.priority,
          manager: proj.manager,
          createdBy: proj.createdBy,
          createdAt: proj.createdAt
        }));
      }
    } catch (error) {
      console.log('Projects data not available:', error);
    }

    // Clients
    try {
      const clients = await storage.getAllClients();
      if (clients.length > 0) {
        backupData.clients = clients.map(client => ({
          id: client.id,
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          contactPerson: client.contactPerson || '',
          gstNumber: client.gstNumber || '',
          panNumber: client.panNumber || '',
          isActive: client.isActive,
          createdAt: client.createdAt
        }));
      }
    } catch (error) {
      console.log('Clients data not available:', error);
    }

    // Sales Products
    try {
      const salesProducts = await storage.getAllSalesProducts();
      if (salesProducts.length > 0) {
        backupData.sales_products = salesProducts.map(sp => ({
          id: sp.id,
          name: sp.name,
          description: sp.description || '',
          size: sp.size || '',
          unitPrice: sp.unitPrice,
          category: sp.category || '',
          imageUrl: sp.imageUrl || '',
          taxPercentage: sp.taxPercentage || 0,
          internalNotes: sp.internalNotes || '',
          isActive: sp.isActive,
          createdAt: sp.createdAt
        }));
      }
    } catch (error) {
      console.log('Sales products data not available:', error);
    }

    // Quotes
    try {
      const quotes = await storage.getAllQuotes();
      if (quotes.length > 0) {
        backupData.quotes = quotes.map(quote => ({
          id: quote.id,
          projectId: quote.projectId,
          title: quote.title,
          description: quote.description || '',
          items: quote.items || [],
          subtotal: quote.subtotal,
          packaging: quote.packaging,
          transportation: quote.transportation,
          gst: quote.gst,
          total: quote.total,
          status: quote.status,
          validUntil: quote.validUntil || '',
          termsConditions: quote.termsConditions || '',
          createdBy: quote.createdBy,
          createdAt: quote.createdAt
        }));
      }
    } catch (error) {
      console.log('Quotes data not available:', error);
    }

    // Purchase Orders
    try {
      const pos = await storage.getAllPurchaseOrders();
      if (pos.length > 0) {
        backupData.purchase_orders = pos.map(po => ({
          id: po.id,
          poNumber: po.poNumber,
          supplierId: po.supplierId,
          status: po.status,
          totalAmount: po.totalAmount,
          notes: po.notes || '',
          expectedDelivery: po.expectedDelivery || '',
          createdBy: po.createdBy,
          createdAt: po.createdAt,
          sentAt: po.sentAt || '',
          receivedAt: po.receivedAt || ''
        }));
      }
    } catch (error) {
      console.log('Purchase orders data not available:', error);
    }

    // Suppliers
    try {
      const suppliers = await storage.getAllSuppliers();
      if (suppliers.length > 0) {
        backupData.suppliers = suppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contactPerson || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          gstNumber: supplier.gstNumber || '',
          panNumber: supplier.panNumber || '',
          isActive: supplier.isActive,
          createdBy: supplier.createdBy,
          createdAt: supplier.createdAt
        }));
      }
    } catch (error) {
      console.log('Suppliers data not available:', error);
    }

    // Audit Logs
    try {
      const auditLogs = await storage.getAllAuditLogs();
      if (auditLogs.length > 0) {
        backupData.audit_logs = auditLogs.map(log => ({
          id: log.id,
          userId: log.userId,
          action: log.action,
          tableName: log.tableName,
          recordId: log.recordId,
          metadata: log.metadata || {},
          createdAt: log.createdAt
        }));
      }
    } catch (error) {
      console.log('Audit logs data not available:', error);
    }

    return backupData;
  } catch (error) {
    console.error('Error getting backup data:', error);
    throw new Error('Failed to retrieve backup data');
  }
}

// Create ZIP file with data backups and essential files
export async function createBackupZip(): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      
      // Create a writable stream to collect the ZIP data
      const output = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      archive.pipe(output);
      
      // Get data and add CSV files
      const data = await getAllBackupData();
      Object.entries(data).forEach(([tableName, tableData]) => {
        if (tableData.length > 0) {
          const csvContent = createCSV(tableData, tableName);
          archive.append(csvContent, { name: `${tableName}.csv` });
        }
      });

      // Add the SQL export file if it exists
      try {
        if (fs.existsSync('hostinger_sql_export.sql')) {
          const sqlContent = fs.readFileSync('hostinger_sql_export.sql', 'utf8');
          archive.append(sqlContent, { name: 'hostinger_sql_export.sql' });
        }
      } catch (error) {
        console.log('Could not add SQL file:', error instanceof Error ? error.message : 'Unknown error');
      }

      // Add deployment README
      const deploymentReadme = `# Furnili Management System - Data Backup Package

## What's Included:
- All business data in CSV format
- Database structure (hostinger_sql_export.sql)
- Deployment instructions

## Quick Database Setup:
1. Import hostinger_sql_export.sql to create tables
2. Use CSV files to import your current data
3. Default login: admin / admin123

## Data Files Included:
${Object.keys(data).map(table => `- ${table}.csv: ${data[table].length} records`).join('\n')}

## For Complete Source Code:
Contact your developer or access the original Replit project.

Generated: ${new Date().toLocaleString()}

## Hostinger Deployment Instructions:
1. Create a new database in Hostinger control panel
2. Import the hostinger_sql_export.sql file 
3. Upload source code files to public_html
4. Configure database connection
5. Install dependencies: npm install
6. Build project: npm run build
7. Serve the application

Note: You'll need the complete source code for deployment.
This package contains your data for backup/migration purposes.`;
      
      archive.append(deploymentReadme, { name: 'README.md' });

      // Add hostinger deployment guide if it exists
      try {
        if (fs.existsSync('HOSTINGER_DEPLOYMENT_GUIDE.md')) {
          const guideContent = fs.readFileSync('HOSTINGER_DEPLOYMENT_GUIDE.md', 'utf8');
          archive.append(guideContent, { name: 'HOSTINGER_DEPLOYMENT_GUIDE.md' });
        }
      } catch (error) {
        console.log('Could not add deployment guide:', error instanceof Error ? error.message : 'Unknown error');
      }

      // Handle completion
      output.on('finish', () => {
        const zipBuffer = Buffer.concat(chunks);
        resolve(zipBuffer);
      });

      // Handle errors
      archive.on('error', (err: Error) => {
        reject(err);
      });

      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}