import type { Express } from "express";
import { db } from "./db";
import { quotes, quoteItems, clients, salesProducts, users, projects, workOrders } from "@shared/schema";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { insertQuoteSchema, insertQuoteItemSchema, insertWorkOrderSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken, type AuthRequest } from "./middleware/auth";

export function setupQuotesRoutes(app: Express) {
  // Get all quotes with client and project details
  app.get("/api/quotes", authenticateToken, async (req, res) => {
    try {
      const { search, status, clientId } = req.query;
      
      let whereConditions = [eq(quotes.isActive, true)];
      
      if (status && status !== 'all') {
        whereConditions.push(eq(quotes.status, status as string));
      }
      
      if (clientId) {
        whereConditions.push(eq(quotes.clientId, parseInt(clientId as string)));
      }

      const quotesData = await db
        .select({
          quote: quotes,
          client: {
            id: clients.id,
            name: clients.name,
            email: clients.email,
            mobile: clients.mobile,
            city: clients.city,
          },
          project: {
            id: projects.id,
            name: projects.name,
            code: projects.code,
          },
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(quotes.createdAt));

      // Apply search filter if provided
      let filteredQuotes = quotesData;
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredQuotes = quotesData.filter(item => 
          item.quote.quoteNumber.toLowerCase().includes(searchTerm) ||
          item.quote.title.toLowerCase().includes(searchTerm) ||
          item.client?.name.toLowerCase().includes(searchTerm) ||
          item.project?.name.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Get quote by ID with items
  app.get("/api/quotes/:id", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      // Get quote with client and project details
      const quoteData = await db
        .select({
          quote: quotes,
          client: clients,
          project: projects,
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(eq(quotes.id, quoteId), eq(quotes.isActive, true)))
        .limit(1);

      if (quoteData.length === 0) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get quote items with sales product details
      const items = await db
        .select({
          item: quoteItems,
          salesProduct: salesProducts,
        })
        .from(quoteItems)
        .leftJoin(salesProducts, eq(quoteItems.salesProductId, salesProducts.id))
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(quoteItems.sortOrder);

      res.json({
        ...quoteData[0],
        items: items
      });
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Create new quote
  app.post("/api/quotes", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      
      console.log("Creating quote with data:", {
        clientId: req.body.clientId,
        projectId: req.body.projectId,
        title: req.body.title,
        itemsCount: req.body.items?.length || 0
      });
      
      // Validate required fields
      if (!req.body.clientId) {
        return res.status(400).json({ 
          error: "Client ID is required", 
          details: "Quote must be associated with a client" 
        });
      }
      
      // Generate quote number
      const lastQuote = await db
        .select({ quoteNumber: quotes.quoteNumber })
        .from(quotes)
        .orderBy(desc(quotes.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (lastQuote.length > 0) {
        // Extract number from format Q250801, Q250802, etc.
        const lastNumber = parseInt(lastQuote[0].quoteNumber.substring(1));
        nextNumber = lastNumber + 1;
      }
      
      // Format: Q + YYMM + DD + sequential number (QYYMMDDNN)
      const now = new Date();
      const year = now.getFullYear().toString().substring(2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const seq = nextNumber.toString().padStart(2, '0');
      const quoteNumber = `Q${year}${month}${day}${seq}`;

      // Validate quote data
      const quoteData = insertQuoteSchema.parse({
        ...req.body,
        quoteNumber,
        createdBy: userId,
      });

      // Create quote
      const [newQuote] = await db
        .insert(quotes)
        .values([{ ...quoteData, quoteNumber }])
        .returning();

      // Create quote items if provided
      if (req.body.items && req.body.items.length > 0) {
        const itemsData = req.body.items.map((item: any, index: number) => ({
          ...item,
          quoteId: newQuote.id,
          sortOrder: index,
        }));

        await db.insert(quoteItems).values(itemsData);
      }

      res.status(201).json(newQuote);
    } catch (error) {
      console.error("Error creating quote:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // Update quote
  app.put("/api/quotes/:id", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { items, ...quoteData } = req.body;

      // Update quote
      const [updatedQuote] = await db
        .update(quotes)
        .set({ ...quoteData, updatedAt: new Date() })
        .where(eq(quotes.id, quoteId))
        .returning();

      if (!updatedQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Update quote items if provided
      if (items) {
        // Delete existing items
        await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));

        // Insert new items
        if (items.length > 0) {
          const itemsData = items.map((item: any, index: number) => ({
            ...item,
            quoteId: quoteId,
            sortOrder: index,
          }));

          await db.insert(quoteItems).values(itemsData);
        }
      }

      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Delete quote (soft delete)
  app.delete("/api/quotes/:id", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      const [deletedQuote] = await db
        .update(quotes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(quotes.id, quoteId))
        .returning();

      if (!deletedQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // Get quote details for PDF and detailed view
  app.get("/api/quotes/:id/details-fresh", authenticateToken, async (req, res) => {
    // Force no caching - completely disable all cache mechanisms
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('ETag', `"nocache-${Date.now()}-${Math.random()}"`);
    res.set('Last-Modified', new Date().toUTCString());
    res.set('Vary', '*');
    try {
      const quoteId = parseInt(req.params.id);

      // Get quote first
      const [quote] = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.id, quoteId), eq(quotes.isActive, true)))
        .limit(1);

      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get client data - use explicit column selection to avoid schema issues
      const [client] = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          mobile: clients.mobile,
          city: clients.city,
          contactPerson: clients.contactPerson,
          phone: clients.phone,
          address1: clients.address1,
          address2: clients.address2,
          state: clients.state,
          pinCode: clients.pinCode,
          gstNumber: clients.gstNumber,
          isActive: clients.isActive,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt
        })
        .from(clients)
        .where(eq(clients.id, quote.clientId))
        .limit(1);

      // Get project data - use explicit column selection to avoid schema issues  
      const [project] = quote.projectId ? await db
        .select({
          id: projects.id,
          code: projects.code,
          name: projects.name,
          description: projects.description,
          clientId: projects.clientId,
          stage: projects.stage,
          budget: projects.budget,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt
        })
        .from(projects)
        .where(eq(projects.id, quote.projectId))
        .limit(1) : [null];

      // Get created by user data - using correct column name from database
      const [createdByUser] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, quote.createdBy))
        .limit(1);

      // Get quote items with complete sales product details
      const items = await db
        .select({
          item: quoteItems,
          salesProduct: salesProducts,
        })
        .from(quoteItems)
        .leftJoin(salesProducts, eq(quoteItems.salesProductId, salesProducts.id))
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(quoteItems.sortOrder);

      // Data successfully retrieved
      
      const response = {
        ...quote,
        client: client || null,
        project: project || null,
        createdBy: createdByUser || null,
        items: items.map(item => ({
          ...item.item,
          product: item.salesProduct
        }))
      };
      
      // Prepare final response
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching quote details:", error);
      res.status(500).json({ error: "Failed to fetch quote details" });
    }
  });

  // Generate PDF quote
  app.get("/api/quotes/:id/pdf", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      // Get quote with all details
      const quoteData = await db
        .select({
          quote: quotes,
          client: clients,
          project: projects,
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(eq(quotes.id, quoteId), eq(quotes.isActive, true)))
        .limit(1);

      if (quoteData.length === 0) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get quote items
      const items = await db
        .select({
          item: quoteItems,
          salesProduct: salesProducts,
        })
        .from(quoteItems)
        .leftJoin(salesProducts, eq(quoteItems.salesProductId, salesProducts.id))
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(quoteItems.sortOrder);

      const quote = quoteData[0];

      // Generate HTML for PDF
      const html = generateQuotePDFHTML(quote, items);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        html: html,
        filename: `Quote_${quote.quote.quoteNumber}_${quote.client?.name || 'Client'}.pdf`
      });

    } catch (error) {
      console.error("Error generating quote PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Get clients for quote creation
  app.get("/api/quotes/clients/list", authenticateToken, async (req, res) => {
    try {
      const clientsList = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          mobile: clients.mobile,
          city: clients.city,
        })
        .from(clients)
        .where(eq(clients.isActive, true))
        .orderBy(clients.name);

      res.json(clientsList);
    } catch (error) {
      console.error("Error fetching clients list:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Get sales products for quote items
  app.get("/api/quotes/products/list", authenticateToken, async (req, res) => {
    try {
      const productsList = await db
        .select()
        .from(salesProducts)
        .where(eq(salesProducts.isActive, true))
        .orderBy(salesProducts.name);

      res.json(productsList);
    } catch (error) {
      console.error("Error fetching products list:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Update existing quote
  app.put("/api/quotes/:id", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const updateData = req.body;

      console.log('Updating quote:', quoteId, 'with data:', updateData);

      // Update quote basic data
      const [updatedQuote] = await db
        .update(quotes)
        .set({
          title: updateData.title,
          description: updateData.description,
          paymentTerms: updateData.paymentTerms,
          furnitureSpecifications: updateData.furnitureSpecifications,
          packingChargesType: updateData.packingChargesType,
          packingChargesValue: updateData.packingChargesValue,
          packingChargesAmount: updateData.packingCharges,
          transportationCharges: updateData.transportationCharges,
          subtotal: updateData.subtotal,
          discountAmount: updateData.totalDiscount,
          taxAmount: updateData.totalTax,
          totalAmount: updateData.grandTotal,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      if (!updatedQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Delete existing quote items
      await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));

      // Insert new quote items
      if (updateData.items && updateData.items.length > 0) {
        for (let i = 0; i < updateData.items.length; i++) {
          const item = updateData.items[i];
          await db.insert(quoteItems).values({
            quoteId: quoteId,
            salesProductId: item.salesProductId,
            itemName: item.itemName,
            description: item.description,
            quantity: item.quantity,
            uom: item.uom,
            unitPrice: item.unitPrice,
            discountPercentage: item.discountPercentage || 0,
            taxPercentage: item.taxPercentage || 18,
            lineTotal: item.lineTotal,
            // size: item.size, // Removed as it's not in the schema
            sortOrder: i + 1,
          });
        }
      }

      res.json({ 
        message: "Quote updated successfully", 
        quote: updatedQuote 
      });
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Approve quote and create work order
  app.post("/api/quotes/:id/approve", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get the quote details first
      const [existingQuote] = await db
        .select({
          quote: quotes,
          client: {
            id: clients.id,
            name: clients.name,
          },
          project: {
            id: projects.id,
            name: projects.name,
            code: projects.code,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .where(eq(quotes.id, quoteId));

      if (!existingQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Update quote status to approved
      const [updatedQuote] = await db
        .update(quotes)
        .set({ 
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      // Try to create work order if table exists, otherwise just approve quote
      let newWorkOrder = null;
      try {
        // Generate work order number
        const workOrderCount = await db
          .select({ count: sql`count(*)` })
          .from(workOrders);
        
        const orderNumber = `WO-${String(Number(workOrderCount[0].count) + 1).padStart(3, '0')}`;

        // Create work order from approved quote
        const workOrderData = {
          orderNumber,
          projectId: existingQuote.quote.projectId!,
          quoteId: quoteId,
          clientId: existingQuote.quote.clientId,
          title: `Production for ${existingQuote.quote.title}`,
          description: `Manufacturing work order created from approved quote ${existingQuote.quote.quoteNumber}`,
          status: 'pending' as const,
          priority: 'medium' as const,
          orderType: 'manufacturing' as const,
          totalQuantity: 1, // Will be calculated from quote items
          specifications: existingQuote.quote.furnitureSpecifications || '',
          qualityStandards: 'Standard quality control as per company guidelines',
          createdBy: userId,
          estimatedStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          estimatedEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
        };

        [newWorkOrder] = await db
          .insert(workOrders)
          .values(workOrderData)
          .returning();
      } catch (workOrderError: any) {
        // Only skip if table doesn't exist, otherwise log the actual error
        if (workOrderError.code === '42P01') {
          console.log("Work orders table not available, skipping work order creation");
        } else {
          console.error("Error creating work order:", workOrderError);
          // Still proceed with quote approval even if work order fails
        }
      }

      res.json({ 
        message: newWorkOrder ? 
          "Quote approved and work order created successfully" : 
          "Quote approved successfully",
        quote: updatedQuote,
        ...(newWorkOrder && { workOrder: newWorkOrder })
      });
    } catch (error) {
      console.error("Error approving quote:", error);
      res.status(500).json({ error: "Failed to approve quote" });
    }
  });

  // Add missing /details endpoint that frontend expects
  app.get("/api/quotes/:id/details", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      // Get quote with client and project details
      const quoteData = await db
        .select({
          quote: quotes,
          client: clients,
          project: projects,
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(eq(quotes.id, quoteId), eq(quotes.isActive, true)))
        .limit(1);

      if (quoteData.length === 0) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get quote items with sales product details
      const items = await db
        .select({
          item: quoteItems,
          salesProduct: salesProducts,
        })
        .from(quoteItems)
        .leftJoin(salesProducts, eq(quoteItems.salesProductId, salesProducts.id))
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(quoteItems.sortOrder);

      res.json({
        ...quoteData[0],
        items: items
      });
    } catch (error) {
      console.error("Error fetching quote details:", error);
      res.status(500).json({ error: "Failed to fetch quote details" });
    }
  });
}

// HTML template for PDF generation
function generateQuotePDFHTML(quote: any, items: any[]) {
  const { quote: quoteData, client, project, createdBy } = quote;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quote ${quoteData.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #8B4513; padding-bottom: 20px; }
        .company-info { flex: 1; }
        .quote-info { flex: 1; text-align: right; }
        .company-name { font-size: 24px; font-weight: bold; color: #8B4513; margin-bottom: 5px; }
        .company-details { font-size: 12px; color: #666; }
        .quote-number { font-size: 20px; font-weight: bold; color: #8B4513; }
        .client-section { margin: 20px 0; }
        .client-title { font-weight: bold; color: #8B4513; margin-bottom: 10px; }
        .client-details { background: #f8f8f8; padding: 15px; border-radius: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background: #8B4513; color: white; font-weight: bold; }
        .items-table tr:nth-child(even) { background: #f9f9f9; }
        .totals-section { margin-top: 20px; text-align: right; }
        .totals-table { margin-left: auto; }
        .totals-table td { padding: 5px 10px; }
        .total-row { font-weight: bold; font-size: 16px; background: #8B4513; color: white; }
        .terms { margin-top: 30px; font-size: 12px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <img src="/assets/furnili-logo.png" alt="FURNILI Logo" style="height: 60px; margin-bottom: 10px;">
          <div class="company-name">FURNILI</div>
          <div class="company-details">
            Professional Furniture Solutions<br>
            Email: info@furnili.com<br>
            Phone: +91 XXX XXX XXXX
          </div>
        </div>
        <div class="quote-info">
          <div class="quote-number">Quote ${quoteData.quoteNumber}</div>
          <div>Date: ${new Date(quoteData.createdAt).toLocaleDateString()}</div>
          <div>Valid Until: ${quoteData.validUntil ? new Date(quoteData.validUntil).toLocaleDateString() : 'N/A'}</div>
          <div>Status: ${quoteData.status.charAt(0).toUpperCase() + quoteData.status.slice(1)}</div>
        </div>
      </div>

      <div class="client-section">
        <div class="client-title">Bill To:</div>
        <div class="client-details">
          <strong>${client?.name || 'N/A'}</strong><br>
          ${client?.email || ''}<br>
          ${client?.mobile || ''}<br>
          ${client?.city || ''}
        </div>
      </div>

      ${project ? `
        <div class="client-section">
          <div class="client-title">Project:</div>
          <div class="client-details">
            <strong>${project.name}</strong> (${project.code})<br>
            ${quoteData.description || ''}
          </div>
        </div>
      ` : ''}

      <table class="items-table">
        <thead>
          <tr>
            <th>Item Details</th>
            <th>Qty</th>
            <th>UOM</th>
            <th>Rate</th>
            <th>Discount</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(({ item, salesProduct }) => `
            <tr>
              <td>
                <strong>${item.itemName}</strong>
                ${item.description ? `<br><small>${item.description}</small>` : ''}
              </td>
              <td>${item.quantity}</td>
              <td>${item.uom}</td>
              <td>₹${item.unitPrice.toFixed(2)}</td>
              <td>${item.discountPercentage}%</td>
              <td>₹${item.lineTotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr><td>Sub Total:</td><td>₹${quoteData.subtotal.toFixed(2)}</td></tr>
          <tr><td>Discount (${quoteData.discountType === 'percentage' ? quoteData.discountValue + '%' : '₹' + quoteData.discountValue}):</td><td>-₹${quoteData.discountAmount.toFixed(2)}</td></tr>
          <tr><td>GST:</td><td>₹${quoteData.taxAmount.toFixed(2)}</td></tr>
          <tr class="total-row"><td>Total:</td><td>₹${quoteData.totalAmount.toFixed(2)}</td></tr>
        </table>
      </div>

      ${quoteData.terms ? `
        <div class="terms">
          <strong>Terms & Conditions:</strong><br>
          ${quoteData.terms}
        </div>
      ` : ''}

      <div class="footer">
        <div style="display: flex; justify-content: space-between; align-items: end; margin-top: 50px;">
          <div style="text-align: left;">
            <p><strong>For FURNILI</strong></p>
            <img src="/assets/furnili-signature-stamp.png" alt="Authority Signature" style="height: 80px; margin: 10px 0;">
            <p><strong>Authorized Signatory</strong></p>
          </div>
          <div style="text-align: center; font-size: 11px; color: #666; flex: 1;">
            Generated by ${createdBy?.name || 'System'} on ${new Date().toLocaleDateString()}<br>
            This is a computer-generated quote with digital signature.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}