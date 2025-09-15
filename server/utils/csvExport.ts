import { Response } from "express";
import { storage } from "../storage";

export const exportProductsCSV = async (res: Response) => {
  try {
    const products = await storage.getAllProducts(); // Use main products
    
    if (!products || products.length === 0) {
      throw new Error("No products found for export");
    }
    
    const csvHeaders = "ID,Name,Category,Description,SKU,Price,Stock Quantity,Min Stock Level,Active,Created At\n";
    
    const csvData = products.map(product => 
      `${product.id},"${(product.name || '').replace(/"/g, '""')}","${(product.category || '').replace(/"/g, '""')}","${(product.description || '').replace(/"/g, '""')}","${(product.sku || '').replace(/"/g, '""')}",${product.pricePerUnit || 0},${product.currentStock || 0},${product.minStock || 0},${product.isActive || false},"${product.createdAt || ''}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=inventory_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export products error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

export const exportRequestsCSV = async (res: Response) => {
  try {
    const requests = await storage.getAllMaterialRequests();
    
    if (!requests || requests.length === 0) {
      throw new Error("No material requests found for export");
    }
    
    const csvHeaders = "ID,Client Name,Order Number,Status,Priority,Total Value,Requested By,Created At\n";
    
    const csvData = requests.map(request => 
      `${request.id},"${(request.clientName || '').replace(/"/g, '""')}","${(request.orderNumber || '').replace(/"/g, '""')}","${(request.status || '').replace(/"/g, '""')}","${(request.priority || '').replace(/"/g, '""')}",${request.totalValue || 0},"${request.requestedBy || ''}","${request.createdAt || ''}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=material_requests.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export requests error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

export const exportLowStockCSV = async (res: Response) => {
  try {
    const products = await storage.getAllProducts(); // Use main products
    
    if (!products || products.length === 0) {
      throw new Error("No products found for low stock analysis");
    }
    
    // Filter products with stock below minimum threshold
    const lowStockProducts = products.filter(p => (p.currentStock || 0) < (p.minStock || 10));
    
    if (lowStockProducts.length === 0) {
      // Create empty CSV with headers
      const csvHeaders = "ID,Name,Category,Current Stock,Min Stock Level,Status,Action Needed\n";
      const noDataRow = ",,,,,'No low stock items found',''";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=low_stock_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    const csvHeaders = "ID,Name,Category,Current Stock,Min Stock Level,Status,Action Needed\n";
    
    const csvData = lowStockProducts.map(product => 
      `${product.id},"${(product.name || '').replace(/"/g, '""')}","${(product.category || '').replace(/"/g, '""')}",${product.currentStock || 0},${product.minStock || 10},"Low Stock","Reorder required"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=low_stock_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export low stock error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

// Additional CSV export functions for new report types
export const exportQuotesCSV = async (res: Response, month?: number, year?: number) => {
  try {
    const quotes = await storage.getAllQuotes();
    
    if (!quotes || quotes.length === 0) {
      const csvHeaders = "Quote Number,Project,Client,Status,Date,Amount,Items Count\n";
      const noDataRow = ",,,,,'No quotes found',''";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=quotes_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    let filteredQuotes = quotes;
    if (month && year) {
      filteredQuotes = quotes.filter(quote => {
        const quoteDate = new Date(quote.createdAt);
        return quoteDate.getMonth() + 1 === month && quoteDate.getFullYear() === year;
      });
    }
    
    const csvHeaders = "Quote Number,Project,Client,Status,Date,Amount,Items Count\n";
    
    const csvData = filteredQuotes.map(quote => 
      `"${quote.quoteNumber || ''}","${(quote.projectName || '').replace(/"/g, '""')}","${(quote.clientName || '').replace(/"/g, '""')}","${quote.status || ''}","${quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : ''}","${quote.totalAmount || 0}","${quote.itemsCount || 0}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=quotes_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export quotes error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

export const exportSuppliersCSV = async (res: Response) => {
  try {
    const suppliers = await storage.getAllSuppliers();
    
    if (!suppliers || suppliers.length === 0) {
      const csvHeaders = "Supplier Name,Contact Person,Email,Phone,Address,Status\n";
      const noDataRow = ",,,,,'No suppliers found'";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=suppliers_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    const csvHeaders = "Supplier Name,Contact Person,Email,Phone,Address,Status\n";
    
    const csvData = suppliers.map(supplier => 
      `"${(supplier.name || '').replace(/"/g, '""')}","${(supplier.contactPerson || '').replace(/"/g, '""')}","${(supplier.email || '').replace(/"/g, '""')}","${(supplier.phone || '').replace(/"/g, '""')}","${(supplier.address || '').replace(/"/g, '""')}","Active"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=suppliers_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export suppliers error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

export const exportStockMovementsCSV = async (res: Response, month?: number, year?: number) => {
  try {
    const stockMovements = await storage.getAllStockMovements();
    
    if (!stockMovements || stockMovements.length === 0) {
      const csvHeaders = "Date,Product,Type,Quantity,Reference,User,Notes\n";
      const noDataRow = ",,,,,'No stock movements found',";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=stock_movements_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    let filteredMovements = stockMovements;
    if (month && year) {
      filteredMovements = stockMovements.filter(movement => {
        const movementDate = new Date(movement.createdAt);
        return movementDate.getMonth() + 1 === month && movementDate.getFullYear() === year;
      });
    }
    
    const movementsWithDetails = await Promise.all(
      filteredMovements.map(async (movement) => {
        const product = await storage.getProduct(movement.productId);
        const user = await storage.getUser(movement.userId);
        return {
          ...movement,
          productName: product ? product.name : 'Unknown Product',
          userName: user ? user.name || user.username : 'Unknown User'
        };
      })
    );
    
    const csvHeaders = "Date,Product,Type,Quantity,Reference,User,Notes\n";
    
    const csvData = movementsWithDetails.map(movement => 
      `"${movement.createdAt ? new Date(movement.createdAt).toLocaleDateString() : ''}","${(movement.productName || '').replace(/"/g, '""')}","${movement.type || ''}","${movement.quantity || 0}","${(movement.reference || '').replace(/"/g, '""')}","${(movement.userName || '').replace(/"/g, '""')}","${(movement.notes || '').replace(/"/g, '""')}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=stock_movements_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export stock movements error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

export const exportUserActivityCSV = async (res: Response, month?: number, year?: number) => {
  try {
    let userActivity = [];
    try {
      userActivity = await storage.getAllAuditLogs();
    } catch (error) {
      // If audit logs don't exist, provide empty data
      userActivity = [];
    }
    
    if (!userActivity || userActivity.length === 0) {
      const csvHeaders = "Date,User,Action,Entity Type,Entity ID,Details\n";
      const noDataRow = ",,,,,'No user activity found'";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=user_activity_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    let filteredActivity = userActivity;
    if (month && year) {
      filteredActivity = userActivity.filter(activity => {
        const activityDate = new Date(activity.createdAt);
        return activityDate.getMonth() + 1 === month && activityDate.getFullYear() === year;
      });
    }
    
    const activityWithUsers = await Promise.all(
      filteredActivity.map(async (activity) => {
        const user = await storage.getUser(activity.userId);
        return {
          ...activity,
          userName: user ? user.name || user.username : 'Unknown User'
        };
      })
    );
    
    const csvHeaders = "Date,User,Action,Entity Type,Entity ID,Details\n";
    
    const csvData = activityWithUsers.map(activity => 
      `"${activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : ''}","${(activity.userName || '').replace(/"/g, '""')}","${activity.action || ''}","${activity.entityType || ''}","${activity.entityId || ''}","${(activity.details || '').replace(/"/g, '""')}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=user_activity_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export user activity error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

export const exportAttendanceCSV = async (res: Response, month?: number, year?: number) => {
  try {
    const attendance = await storage.getAllAttendance();
    
    if (!attendance || attendance.length === 0) {
      // Create empty CSV with headers when no data
      const csvHeaders = "Date,Employee Name,Employee ID,Check In,Check Out,Total Hours,Status,Notes\n";
      const noDataRow = ",,,,,'No attendance records found',,";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=attendance_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    // Filter by month and year if provided
    let filteredAttendance = attendance;
    if (month && year) {
      filteredAttendance = attendance.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year;
      });
    }
    
    // Get user details for each attendance record
    const attendanceWithUsers = await Promise.all(
      filteredAttendance.map(async (record) => {
        const user = await storage.getUser(record.userId);
        return {
          ...record,
          userName: user ? user.name || user.username : 'Unknown User'
        };
      })
    );
    
    const csvHeaders = "Date,Employee Name,Employee ID,Check In,Check Out,Total Hours,Status,Notes\n";
    
    const csvData = attendanceWithUsers.map(record => {
      const checkInTime = record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const totalHours = record.totalHours || 0;
      
      return `"${record.date ? new Date(record.date).toLocaleDateString() : ''}","${(record.userName || '').replace(/"/g, '""')}","${record.userId || ''}","${checkInTime}","${checkOutTime}","${totalHours}","${record.status || 'present'}","${(record.notes || '').replace(/"/g, '""')}"`;
    }).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=attendance_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};