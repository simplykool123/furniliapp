import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"), // admin, manager, staff, store_incharge
  phone: text("phone"),
  // Staff Management Fields
  aadharNumber: text("aadhar_number"),
  employeeId: text("employee_id").unique(),
  department: text("department"),
  designation: text("designation"),
  joiningDate: timestamp("joining_date"),
  basicSalary: real("basic_salary").default(0),
  allowances: real("allowances").default(0), // HRA, DA, etc.
  profilePhotoUrl: text("profile_photo_url"),
  aadharCardUrl: text("aadhar_card_url"),
  documentsUrls: text("documents_urls").array().default([]), // Additional documents
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyContactPhone: text("emergency_contact_phone"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM Lead Sources
export const leadSources = pgTable("lead_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull().default("online"), // online, referral, direct, social, exhibition
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM Pipeline Stages
export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"), // Added to match database
  order: integer("order").notNull().default(0),
  probability: integer("probability").default(0), // 0-100 percentage
  color: text("color").default("#6b7280"), // Hex color for UI
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM will use the clients table with type field - removing separate leads table for now

// Customer Interaction History
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // lead, client, project
  entityId: integer("entity_id").notNull(),
  // NEW: Track client ID for unified notes across lead→project transition
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id), // Direct reference for project notes
  type: text("type").notNull(), // call, email, meeting, whatsapp, visit, demo, note
  direction: text("direction").notNull().default("outbound"), // inbound, outbound
  subject: text("subject").notNull(),
  content: text("content"),
  outcome: text("outcome"), // interested, not_interested, follow_up_needed, converted
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  duration: integer("duration"), // in minutes
  userId: integer("user_id").references(() => users.id).notNull(),
  attachments: text("attachments").array().default([]),
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  email: text("email"),
  mobile: text("mobile").notNull(),
  city: text("city").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address1: text("address1"),
  address2: text("address2"),
  state: text("state"),
  pinCode: text("pin_code"),
  gstNumber: text("gst_number"),
  // Simple field to differentiate leads from clients
  type: text("type").notNull().default("client"), // "lead" or "client"
  // CRM fields for lead management
  leadSourceId: integer("lead_source_id").references(() => leadSources.id),
  pipelineStageId: integer("pipeline_stage_id").references(() => pipelineStages.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Satisfaction Surveys
export const satisfactionSurveys = pgTable("satisfaction_surveys", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  surveyType: text("survey_type").notNull().default("project_completion"), // project_completion, service_quality, overall
  rating: integer("rating").notNull(), // 1-5 stars
  feedback: text("feedback"),
  improvements: text("improvements"), // What could be improved
  recommend: boolean("recommend").default(true), // Would recommend to others
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Management Tables - Updated for User Requirements
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Auto-generated: P-181, P-182, etc.
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  stage: text("stage").notNull().default("prospect"), // prospect, recce-done, design-in-progress, design-approved, estimate-given, client-approved, production, installation, handover, completed, on-hold, lost
  budget: real("budget").default(0),
  // Site Address - only used when differentSiteLocation is true
  differentSiteLocation: boolean("different_site_location").default(false),
  siteAddressLine1: text("site_address_line_1"),
  siteAddressLine2: text("site_address_line_2"),
  siteState: text("site_state"),
  siteCity: text("site_city"),
  siteLocation: text("site_location"),
  sitePincode: text("site_pincode"),
  completionPercentage: integer("completion_percentage").default(0),
  notes: text("notes"),
  files: text("files").array().default([]), // File URLs/paths
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectLogs = pgTable("project_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  logType: text("log_type").notNull(), // activity, note, milestone, issue, update
  title: text("title").notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id),
  attachments: text("attachments").array().default([]),
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});


export const projectQuotes = pgTable("project_quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(), // QT-001, QT-002, etc.
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  subtotal: real("subtotal").default(0),
  taxAmount: real("tax_amount").default(0),
  totalAmount: real("total_amount").default(0),
  validUntil: timestamp("valid_until"),
  status: text("status").default("draft"), // draft, sent, approved, rejected, expired
  terms: text("terms"),
  items: jsonb("items").default([]), // Quote line items with quantities, rates
  createdBy: integer("created_by").references(() => users.id),
  sentAt: timestamp("sent_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  notes: text("notes"),
  attachments: text("attachments").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectOrders = pgTable("project_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(), // PO-001, PO-002, etc.
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  vendorName: text("vendor_name").notNull(),
  vendorContact: text("vendor_contact"),
  vendorEmail: text("vendor_email"),
  vendorAddress: text("vendor_address"),
  orderType: text("order_type").default("material"), // material, service, equipment
  totalAmount: real("total_amount").default(0),
  paidAmount: real("paid_amount").default(0),
  status: text("status").default("pending"), // pending, confirmed, shipped, delivered, completed, cancelled
  expectedDelivery: timestamp("expected_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  items: jsonb("items").default([]), // Order items with quantities, rates, specifications
  paymentTerms: text("payment_terms"),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  attachments: text("attachments").array().default([]),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectFinances = pgTable("project_finances", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  entryType: text("entry_type").notNull(), // income, expense, budget_allocation
  category: text("category").notNull(), // materials, labor, equipment, overhead, payment_received
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  transactionDate: timestamp("transaction_date").defaultNow(),
  paymentMethod: text("payment_method"), // cash, cheque, bank_transfer, upi
  referenceNumber: text("reference_number"), // Receipt/Invoice number
  approvedBy: integer("approved_by").references(() => users.id),
  notes: text("notes"),
  attachments: text("attachments").array().default([]),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: text("recurring_frequency"), // monthly, quarterly, yearly
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectManpower = pgTable("project_manpower", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  workerId: integer("worker_id").references(() => users.id), // Link to existing staff or external worker
  workerName: text("worker_name").notNull(), // For external workers not in users table
  role: text("role").notNull(), // supervisor, mason, helper, electrician, plumber, etc.
  skillLevel: text("skill_level").default("intermediate"), // beginner, intermediate, expert
  dailyRate: real("daily_rate").default(0),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  contactNumber: text("contact_number"),
  address: text("address"),
  aadharNumber: text("aadhar_number"),
  bankDetails: text("bank_details"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").default(0),
  mimeType: text("mime_type"),
  category: text("category").default("general"), // drawings, photos, documents, contracts, permits, delivery_chalan, manual_quote
  description: text("description"),
  comment: text("comment"), // New field for image comments
  uploadedBy: integer("uploaded_by").references(() => users.id),
  isPublic: boolean("is_public").default(false), // Client can view
  version: integer("version").default(1),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled, on_hold
  category: text("category").default("general"), // design, procurement, construction, inspection, documentation
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  estimatedHours: real("estimated_hours").default(0),
  actualHours: real("actual_hours").default(0),
  dependencies: text("dependencies").array().default([]), // Task IDs that must be completed first
  attachments: text("attachments").array().default([]),
  comments: jsonb("comments").default([]), // Task comments and updates
  tags: text("tags").array().default([]),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: text("recurring_frequency"), // daily, weekly, monthly
  reminderDate: timestamp("reminder_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Moodboards table - simplified for manual image uploads only
export const moodboards = pgTable("moodboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keywords: text("keywords").notNull(), // comma-separated tags/keywords
  roomType: text("room_type").notNull(), // Living Room, Bedroom, Kitchen, etc.
  imageUrls: text("image_urls").array().default([]), // array of uploaded image URLs
  imageData: jsonb("image_data"), // metadata for images (name, size, etc.)
  linkedProjectId: integer("linked_project_id").references(() => projects.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  sourceType: text("source_type").default("manual_upload"), // simplified to manual_upload only
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});







export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  brand: text("brand"),
  size: text("size"),
  thickness: text("thickness"), // e.g., "12 mm", "6 mm", "16 mm"
  sku: text("sku").unique(),
  pricePerUnit: real("price_per_unit").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(10),
  unit: text("unit").notNull().default("pieces"),
  imageUrl: text("image_url"),
  productType: text("product_type").notNull().default("raw_material"), // raw_material, finishing_good, assembly, seasonal
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialRequests = pgTable("material_requests", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientName: text("client_name").notNull(),
  orderNumber: text("order_number").notNull().default(""), // Auto-generated if not provided
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, issued, completed, rejected
  priority: text("priority").notNull().default("medium"), // high, medium, low
  boqReference: text("boq_reference"),
  remarks: text("remarks"),
  totalValue: real("total_value").notNull().default(0),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  issuedBy: integer("issued_by").references(() => users.id),
  issuedAt: timestamp("issued_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const requestItems = pgTable("request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => materialRequests.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  requestedQuantity: integer("requested_quantity").notNull(),
  approvedQuantity: integer("approved_quantity"),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

export const boqUploads = pgTable("boq_uploads", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  extractedData: jsonb("extracted_data"),
  projectName: text("project_name"),
  boqReference: text("boq_reference"),
  totalValue: real("total_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  movementType: text("movement_type").notNull(), // in, out, adjustment
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reference: text("reference"), // request ID, purchase order, etc.
  vendor: text("vendor"), // For inward movements
  costPerUnit: real("cost_per_unit"), // Purchase cost for inward movements
  totalCost: real("total_cost"), // Total cost for the movement
  notes: text("notes"),
  performedBy: integer("performed_by").references(() => users.id).notNull(),
  // Enhanced tracking fields
  projectId: integer("project_id").references(() => projects.id), // Which project this movement is for
  materialRequestId: integer("material_request_id").references(() => materialRequests.id), // Associated material request
  reason: text("reason").notNull().default("General"), // Purchase, Sale, Issue, Return, Adjustment, Damage, etc.
  destination: text("destination"), // Workshop, Site, Storage, Client, etc.
  invoiceNumber: text("invoice_number"), // For purchase/sales movements
  batchNumber: text("batch_number"), // For quality tracking
  expiryDate: timestamp("expiry_date"), // For perishable items
  location: text("location"), // Specific storage location
  approvedBy: integer("approved_by").references(() => users.id), // Who approved this movement
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff Attendance Table - Enhanced for Payroll
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(), // Date of attendance
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  workingHours: real("working_hours").default(0), // Calculated hours
  overtimeHours: real("overtime_hours").default(0), // Hours above 8
  status: text("status").notNull().default("present"), // present, absent, half_day, late, on_leave
  leaveType: text("leave_type"), // sick, casual, earned, emergency
  checkInBy: integer("check_in_by").references(() => users.id), // Admin who checked in
  checkOutBy: integer("check_out_by").references(() => users.id), // Admin who checked out
  location: text("location"), // Check-in location if needed
  notes: text("notes"),
  isManualEntry: boolean("is_manual_entry").default(false), // Admin manual entry
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monthly Payroll Table
export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  basicSalary: real("basic_salary").notNull(),
  allowances: real("allowances").default(0),
  overtimePay: real("overtime_pay").default(0),
  bonus: real("bonus").default(0),
  deductions: real("deductions").default(0), // PF, ESI, tax, etc.
  netSalary: real("net_salary").notNull(),
  totalWorkingDays: integer("total_working_days").default(30),
  actualWorkingDays: real("actual_working_days").notNull(),
  totalHours: real("total_hours").default(0),
  overtimeHours: real("overtime_hours").default(0),
  leaveDays: integer("leave_days").default(0),
  paySlipUrl: text("pay_slip_url"), // Generated PDF
  status: text("status").notNull().default("draft"), // draft, processed, paid
  processedBy: integer("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leave Management Table
export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leaveType: text("leave_type").notNull(), // sick, casual, earned, emergency, maternity
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  appliedAt: timestamp("applied_at").defaultNow(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  documentUrl: text("document_url"), // Medical certificate, etc.
});

// Petty Cash Expenses Table
export const pettyCashExpenses = pgTable("petty_cash_expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // food, transport, office_supplies, etc.
  amount: real("amount").notNull(),
  vendor: text("vendor"),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id), // Project reference for expense tracking
  orderNo: text("order_no"), // Legacy field - keeping for backward compatibility
  paidBy: integer("paid_by").references(() => users.id), // Staff member who paid
  receiptImageUrl: text("receipt_image_url"), // Google Pay screenshot
  billImageUrl: text("bill_image_url"), // Bills/invoices image
  materialImageUrl: text("material_image_url"), // Material/product photos
  extractedData: jsonb("extracted_data"), // OCR extracted data
  expenseDate: timestamp("expense_date").notNull(),
  addedBy: integer("added_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  status: text("status").notNull().default("expense"), // expense, income, pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Management Table - Enhanced for Phase 1
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id), // Link to project
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  estimatedHours: integer("estimated_hours").default(0),
  actualHours: integer("actual_hours").default(0),
  tags: text("tags").array().default([]), // For categorization
  attachments: text("attachments").array().default([]), // File attachments
  comments: text("comments"), // Latest comment/note
  assignedTo: integer("assigned_to").references(() => users.id),
  assignedToOther: text("assigned_to_other"), // For "Others" option
  assignedBy: integer("assigned_by").references(() => users.id).notNull(),
  updatedBy: integer("updated_by").references(() => users.id), // Track who last updated
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Price Comparison Table for Multiple Brands
export const priceComparisons = pgTable("price_comparisons", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  size: text("size"),
  thickness: text("thickness"),
  brand: text("brand").notNull(),
  price: real("price").notNull(),
  vendor: text("vendor"),
  imageUrl: text("image_url"),
  addedBy: integer("added_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales Products Table for Quote Management
export const salesProducts = pgTable("sales_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  size: text("size"), // Product dimensions/size specifications
  unitPrice: real("unit_price").notNull().default(0),
  category: text("category"), // Furniture, Seating, Storage, etc.
  taxPercentage: real("tax_percentage").default(0), // GST/VAT %
  internalNotes: text("internal_notes"), // Cost, profit margin, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quotes Table - Enhanced for Professional Quote Generation
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(), // Auto-generated: Q-001, Q-002, etc.
  projectId: integer("project_id").references(() => projects.id),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  // Financial calculations
  subtotal: real("subtotal").default(0),
  discountType: text("discount_type").default("percentage"), // percentage, fixed
  discountValue: real("discount_value").default(0), // 5% or ₹500
  discountAmount: real("discount_amount").default(0), // Calculated discount
  taxAmount: real("tax_amount").default(0),
  totalAmount: real("total_amount").default(0),
  // Quote details
  status: text("status").notNull().default("draft"), // draft, sent, approved, rejected, expired
  validUntil: timestamp("valid_until"),
  expirationDate: timestamp("expiration_date"),
  paymentTerms: text("payment_terms").default("Immediate Payment"), // Payment terms
  pricelist: text("pricelist").default("Public Pricelist (EGP)"), // Pricelist type
  terms: text("terms"), // Terms and conditions
  notes: text("notes"), // Additional notes
  // Additional calculations fields
  furnitureSpecifications: text("furniture_specifications").default("All furniture will be manufactured using Said Materials\n- All hardware considered of standard make.\n- Standard laminates considered as per selection.\n- Any modifications or changes in material selection may result in additional charges."),
  packingChargesType: text("packing_charges_type").default("percentage"), // percentage or fixed
  packingChargesValue: real("packing_charges_value").default(2), // 2% or fixed amount
  packingChargesAmount: real("packing_charges_amount").default(0), // calculated amount
  transportationCharges: real("transportation_charges").default(5000), // fixed transportation cost
  createdBy: integer("created_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quote Items Table - Enhanced with UOM and better pricing
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id).notNull(),
  salesProductId: integer("sales_product_id").references(() => salesProducts.id),
  itemName: text("item_name").notNull(), // Manual item entry or from sales product
  description: text("description"),
  quantity: real("quantity").notNull().default(1),
  uom: text("uom").default("pcs"), // Unit of Measurement (pcs, sqft, lm, etc.)
  unitPrice: real("unit_price").notNull().default(0), // Rate
  discountPercentage: real("discount_percentage").default(0), // Item-level discount
  discountAmount: real("discount_amount").default(0), // Calculated item discount
  taxPercentage: real("tax_percentage").default(0), // Tax %
  taxAmount: real("tax_amount").default(0), // Calculated tax
  lineTotal: real("line_total").notNull().default(0), // Final amount after discount and tax
  sortOrder: integer("sort_order").default(0), // For ordering items
  notes: text("notes"), // Item-specific notes
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users, {
  joiningDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  productType: z.enum(['raw_material', 'finishing_good', 'assembly', 'seasonal']).default('raw_material'),
});

export const insertMaterialRequestSchema = createInsertSchema(materialRequests).omit({
  id: true,
  createdAt: true,
  approvedBy: true,
  approvedAt: true,
  issuedBy: true,
  issuedAt: true,
}).extend({
  orderNumber: z.string().optional(), // Make orderNumber optional for frontend
});

export const insertRequestItemSchema = createInsertSchema(requestItems).omit({
  id: true,
  requestId: true, // This will be set by the server
});

export const insertBOQUploadSchema = createInsertSchema(boqUploads).omit({
  id: true,
  createdAt: true,
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollSchema = createInsertSchema(payroll).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveSchema = createInsertSchema(leaves).omit({
  id: true,
  appliedAt: true,
});

export const insertPettyCashExpenseSchema = createInsertSchema(pettyCashExpenses).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceComparisonSchema = createInsertSchema(priceComparisons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesProductSchema = createInsertSchema(salesProducts, {
  unitPrice: z.number().min(0, "Unit price must be positive"),
  taxPercentage: z.number().min(0).max(100, "Tax percentage must be between 0-100").optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  quoteNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
});

export const insertClientSchema = createInsertSchema(clients, {
  name: z.string().min(1, "Client name is required"),
  mobile: z.string().min(1, "Mobile number is required"),
  city: z.string().min(1, "City is required"),
  email: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address1: z.string().optional().or(z.literal("")),
  address2: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  pinCode: z.string().optional().or(z.literal("")),
  gstNumber: z.string().optional().or(z.literal("")),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  code: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const insertProjectLogSchema = createInsertSchema(projectLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMoodboardSchema = createInsertSchema(moodboards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



// Phase 3 CRM Module Schemas
export const insertProjectQuoteSchema = createInsertSchema(projectQuotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectOrderSchema = createInsertSchema(projectOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectFinanceSchema = createInsertSchema(projectFinances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectManpowerSchema = createInsertSchema(projectManpower).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type PettyCashExpense = typeof pettyCashExpenses.$inferSelect;
export type InsertPettyCashExpense = z.infer<typeof insertPettyCashExpenseSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type PriceComparison = typeof priceComparisons.$inferSelect;
export type InsertPriceComparison = z.infer<typeof insertPriceComparisonSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectLog = typeof projectLogs.$inferSelect;
export type InsertProjectLog = z.infer<typeof insertProjectLogSchema>;
export type Payroll = typeof payroll.$inferSelect;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type MaterialRequest = typeof materialRequests.$inferSelect;
export type InsertMaterialRequest = z.infer<typeof insertMaterialRequestSchema>;
export type RequestItem = typeof requestItems.$inferSelect;
export type InsertRequestItem = z.infer<typeof insertRequestItemSchema>;
export type BOQUpload = typeof boqUploads.$inferSelect;
export type InsertBOQUpload = z.infer<typeof insertBOQUploadSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

export type SalesProduct = typeof salesProducts.$inferSelect;
export type InsertSalesProduct = z.infer<typeof insertSalesProductSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;



// Phase 3 CRM Module Types
export type ProjectQuote = typeof projectQuotes.$inferSelect;
export type InsertProjectQuote = z.infer<typeof insertProjectQuoteSchema>;
export type ProjectOrder = typeof projectOrders.$inferSelect;
export type InsertProjectOrder = z.infer<typeof insertProjectOrderSchema>;
export type ProjectFinance = typeof projectFinances.$inferSelect;
export type InsertProjectFinance = z.infer<typeof insertProjectFinanceSchema>;
export type ProjectManpower = typeof projectManpower.$inferSelect;
export type InsertProjectManpower = z.infer<typeof insertProjectManpowerSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

// Moodboard types
export type Moodboard = typeof moodboards.$inferSelect;
export type InsertMoodboard = z.infer<typeof insertMoodboardSchema>;

// Extended types for API responses
export type MaterialRequestWithItems = MaterialRequest & {
  items: (RequestItem & { product: Product })[];
  requestedByUser: { name: string; email: string };
  approvedByUser?: { name: string; email: string };
  issuedByUser?: { name: string; email: string };
};

export type ProductWithStock = Product & {
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
};

export type BOQExtractedItem = {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  matchedProductId?: number;
};

// Purchase Order System Tables
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  paymentTerms: text("payment_terms").default("30 days"), // e.g., "30 days", "Net 15", "COD"
  gstin: text("gstin"),
  preferred: boolean("preferred").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(), // Auto-generated: PO-001, PO-002
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  status: text("status").notNull().default("draft"), // draft, sent, received, cancelled
  totalAmount: real("total_amount").notNull().default(0),
  notes: text("notes"),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
  autoGenerated: boolean("auto_generated").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").references(() => purchaseOrders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  sku: text("sku"), // Copied from product for historical reference
  description: text("description").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(), // qty * unit_price
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  receivedQty: integer("received_qty").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Supplier-Product Relationship Table (Many-to-Many)
export const supplierProducts = pgTable("supplier_products", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  isPreferred: boolean("is_preferred").notNull().default(false), // Mark as preferred supplier for this product
  leadTimeDays: integer("lead_time_days").default(7), // Delivery time in days
  minOrderQty: integer("min_order_qty").default(1), // Minimum order quantity
  unitPrice: real("unit_price").default(0), // Supplier's price for this product
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // e.g., "po.created", "po.sent", "po.received", "po.cancelled"
  tableName: text("table_name").notNull(),
  recordId: integer("record_id").notNull(),
  metadata: jsonb("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow(),
});

// BOM Calculator Tables
export const bomCalculations = pgTable("bom_calculations", {
  id: serial("id").primaryKey(),
  calculationNumber: text("calculation_number").notNull().unique(), // BOM-001, BOM-002, etc.
  unitType: text("unit_type").notNull(), // wardrobe, storage_unit, shoe_rack, tv_panel, bed, custom
  height: real("height").notNull(), // in mm
  width: real("width").notNull(), // in mm
  depth: real("depth").notNull(), // in mm
  unitOfMeasure: text("unit_of_measure").notNull().default("mm"), // mm, ft
  partsConfig: jsonb("parts_config").default({}), // shelves count, drawers count, shutters count etc
  boardType: text("board_type").notNull(), // pre_lam_particle_board, mdf, ply, etc
  boardThickness: text("board_thickness").notNull().default("18mm"), // 18mm, 12mm, 6mm
  finish: text("finish").notNull(), // laminate, acrylic, paint, etc
  calculatedBy: integer("calculated_by").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id), // Optional project reference
  totalBoardArea: real("total_board_area").default(0), // in sqft
  totalEdgeBanding2mm: real("total_edge_banding_2mm").default(0), // in feet
  totalEdgeBanding0_8mm: real("total_edge_banding_0_8mm").default(0), // in feet
  totalMaterialCost: real("total_material_cost").default(0),
  totalHardwareCost: real("total_hardware_cost").default(0),
  totalCost: real("total_cost").default(0),
  status: text("status").default("draft"), // draft, finalized, exported
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bomItems = pgTable("bom_items", {
  id: serial("id").primaryKey(),
  bomId: integer("bom_id").references(() => bomCalculations.id).notNull(),
  itemType: text("item_type").notNull(), // board, hardware, edge_banding
  itemCategory: text("item_category").notNull(), // panel, shutter, shelf, drawer, minifix, dowel, lock, etc
  partName: text("part_name").notNull(), // Left Side Panel, Right Side Panel, Top Shelf, etc
  materialType: text("material_type"), // board type for panels, hardware type for hardware
  length: real("length"), // in mm
  width: real("width"), // in mm
  thickness: real("thickness"), // in mm
  quantity: integer("quantity").notNull().default(1),
  unit: text("unit").notNull().default("pieces"), // pieces, feet, sqft
  edgeBandingType: text("edge_banding_type"), // 2mm, 0.8mm, none
  edgeBandingLength: real("edge_banding_length").default(0), // total edge banding needed in feet
  unitRate: real("unit_rate").default(0),
  totalCost: real("total_cost").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 🎯 BOM Settings: Map BOM materials to existing products for real pricing
export const bomSettings = pgTable("bom_settings", {
  id: serial("id").primaryKey(),
  bomMaterialType: text("bom_material_type").notNull().unique(), // '18mm_plywood', 'soft_close_hinge', etc.
  bomMaterialCategory: text("bom_material_category").notNull(), // 'board', 'hardware', 'edge_banding', 'laminate'  
  bomMaterialName: text("bom_material_name").notNull(), // '18mm Plywood', 'Soft Close Hinge', etc.
  linkedProductId: integer("linked_product_id").references(() => products.id), // Maps to actual product
  useRealPricing: boolean("use_real_pricing").notNull().default(false), // Enable/disable real pricing
  customDefaultPrice: numeric("custom_default_price", { precision: 10, scale: 2 }), // Custom default price override
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bomHardwareRates = pgTable("bom_hardware_rates", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull().unique(), // Minifix, Dowel, Lock, Straightener, etc
  category: text("category").notNull(), // hardware, edge_banding, board
  subcategory: text("subcategory"), // fasteners, locking, support, etc
  unit: text("unit").notNull(), // pieces, feet, sqft
  currentRate: real("current_rate").notNull(),
  supplier: text("supplier"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
});

export const bomBoardRates = pgTable("bom_board_rates", {
  id: serial("id").primaryKey(),
  boardType: text("board_type").notNull(), // pre_lam_particle_board, mdf, ply
  thickness: text("thickness").notNull(), // 18mm, 12mm, 6mm
  finish: text("finish").notNull(), // laminate, acrylic, paint
  ratePerSqft: real("rate_per_sqft").notNull(),
  supplier: text("supplier"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
});

// Telegram User Sessions - tracks active project selections per user
export const telegramUserSessions = pgTable("telegram_user_sessions", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id"), // Telegram user ID (as string)
  telegramUsername: text("telegram_username"), // Telegram username (optional)
  telegramFirstName: text("telegram_first_name"), // User's first name
  whatsappUserId: text("whatsapp_user_id"), // WhatsApp user ID (as string)
  whatsappUsername: text("whatsapp_username"), // WhatsApp username (optional)
  whatsappName: text("whatsapp_name"), // User's WhatsApp name
  phoneNumber: text("phone_number"), // Phone number for authentication
  systemUserId: integer("system_user_id").references(() => users.id), // Link to actual system user
  activeProjectId: integer("active_project_id").references(() => projects.id), // Currently selected project
  activeClientId: integer("active_client_id").references(() => clients.id), // Currently selected client
  lastInteraction: timestamp("last_interaction").defaultNow(),
  sessionState: text("session_state").default("idle"), // idle, selecting_client, selecting_project, selecting_category, uploading
  currentStep: text("current_step"), // Additional context for multi-step flows
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp Messages - stores all messages for real-time console feed
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(), // WhatsApp message ID
  fromUserId: text("from_user_id").notNull(), // WhatsApp user ID (sender)
  fromUserName: text("from_user_name"), // Display name of sender
  chatId: text("chat_id").notNull(), // WhatsApp chat ID
  messageType: text("message_type").notNull().default("text"), // text, image, document, audio, video
  messageBody: text("message_body"), // Text content
  mediaUrl: text("media_url"), // URL to media file if applicable
  timestamp: timestamp("timestamp").notNull(), // Message timestamp
  direction: text("direction").notNull(), // inbound, outbound
  isFromBot: boolean("is_from_bot").default(false), // Is this a bot response
  sessionId: integer("session_id").references(() => telegramUserSessions.id), // Link to user session
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for PO system and brand management
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSupplierProductSchema = createInsertSchema(supplierProducts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ 
  id: true, 
  poNumber: true, 
  createdAt: true, 
  updatedAt: true,
  sentAt: true,
  receivedAt: true 
});
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ 
  id: true, 
  poId: true, // poId is added by the backend when creating items
  totalPrice: true, // totalPrice is calculated by the backend
  createdAt: true 
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertBomCalculation = createInsertSchema(bomCalculations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBomItem = createInsertSchema(bomItems).omit({ id: true, createdAt: true });
export const insertBomSettingsSchema = createInsertSchema(bomSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBomHardwareRate = createInsertSchema(bomHardwareRates).omit({ id: true, lastUpdated: true });
export const insertBomBoardRate = createInsertSchema(bomBoardRates).omit({ id: true, lastUpdated: true });
export const insertTelegramUserSessionSchema = createInsertSchema(telegramUserSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, createdAt: true });

// Production Planning & Manufacturing Tables
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(), // WO-001, WO-002, etc.
  projectId: integer("project_id").references(() => projects.id).notNull(),
  quoteId: integer("quote_id").references(() => projectQuotes.id), // Reference to approved quote
  clientId: integer("client_id").references(() => clients.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, planned, in_progress, paused, completed, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  orderType: text("order_type").notNull().default("manufacturing"), // manufacturing, assembly, finishing, installation
  estimatedStartDate: timestamp("estimated_start_date"),
  estimatedEndDate: timestamp("estimated_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  estimatedHours: real("estimated_hours").default(0),
  actualHours: real("actual_hours").default(0),
  completionPercentage: integer("completion_percentage").default(0),
  totalQuantity: integer("total_quantity").default(1),
  completedQuantity: integer("completed_quantity").default(0),
  rejectedQuantity: integer("rejected_quantity").default(0),
  assignedTeam: text("assigned_team").array().default([]), // Array of user IDs
  workstationRequired: text("workstation_required"), // Required machine/workstation
  materials: jsonb("materials").default([]), // Required materials with quantities
  specifications: text("specifications"), // Technical specifications
  qualityStandards: text("quality_standards"), // Quality requirements
  notes: text("notes"),
  attachments: text("attachments").array().default([]),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productionSchedules = pgTable("production_schedules", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").references(() => workOrders.id).notNull(),
  workstationId: text("workstation_id").notNull(), // Machine/workstation identifier
  workstationName: text("workstation_name").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  duration: integer("duration").notNull(), // Duration in minutes
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled, delayed
  assignedWorkers: text("assigned_workers").array().default([]), // Array of user IDs
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  notes: text("notes"),
  delayReason: text("delay_reason"),
  setupTime: integer("setup_time").default(0), // Setup time in minutes
  operationType: text("operation_type").notNull(), // cutting, assembly, finishing, inspection, etc.
  capacity: integer("capacity").default(1), // How many units can be processed
  scheduledBy: integer("scheduled_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const qualityChecks = pgTable("quality_checks", {
  id: serial("id").primaryKey(),
  checkNumber: text("check_number").notNull().unique(), // QC-001, QC-002, etc.
  workOrderId: integer("work_order_id").references(() => workOrders.id).notNull(),
  productionTaskId: integer("production_task_id"), // References production task if applicable
  checkType: text("check_type").notNull(), // incoming, in_process, final, customer_inspection
  inspectionStage: text("inspection_stage").notNull(), // material_received, cutting_complete, assembly_complete, finishing_complete, packaging_complete
  furnitureType: text("furniture_type"), // chair, table, cabinet, sofa, etc.
  checklist: jsonb("checklist").default([]), // Array of inspection items with pass/fail status
  overallStatus: text("overall_status").notNull().default("pending"), // pending, passed, failed, conditional_pass
  defectsFound: jsonb("defects_found").default([]), // Array of defect details
  correctionRequired: boolean("correction_required").default(false),
  correctionNotes: text("correction_notes"),
  reworkRequired: boolean("rework_required").default(false),
  reworkNotes: text("rework_notes"),
  quantityInspected: integer("quantity_inspected").default(1),
  quantityPassed: integer("quantity_passed").default(0),
  quantityFailed: integer("quantity_failed").default(0),
  inspectedBy: integer("inspected_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  inspectionDate: timestamp("inspection_date").defaultNow(),
  approvalDate: timestamp("approval_date"),
  photoUrls: text("photo_urls").array().default([]), // Photos of defects/quality issues
  measurementData: jsonb("measurement_data").default([]), // Dimensional measurements
  materialGrade: text("material_grade"), // A, B, C grade classification
  finishQuality: text("finish_quality"), // excellent, good, acceptable, poor
  notes: text("notes"),
  correctionDeadline: timestamp("correction_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productionTasks = pgTable("production_tasks", {
  id: serial("id").primaryKey(),
  taskNumber: text("task_number").notNull().unique(), // PT-001, PT-002, etc.
  workOrderId: integer("work_order_id").references(() => workOrders.id).notNull(),
  scheduleId: integer("schedule_id").references(() => productionSchedules.id),
  title: text("title").notNull(),
  description: text("description"),
  operationType: text("operation_type").notNull(), // cutting, drilling, assembly, sanding, finishing, packaging
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, paused, cancelled, quality_check
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  sequence: integer("sequence").default(1), // Task sequence in the workflow
  estimatedDuration: integer("estimated_duration").default(0), // In minutes
  actualDuration: integer("actual_duration").default(0), // In minutes
  quantityToProcess: integer("quantity_to_process").default(1),
  quantityCompleted: integer("quantity_completed").default(0),
  assignedTo: integer("assigned_to").references(() => users.id),
  workstation: text("workstation"), // Machine/workstation used
  toolsRequired: text("tools_required").array().default([]), // Required tools
  materialsUsed: jsonb("materials_used").default([]), // Materials consumed with quantities
  workInstructions: text("work_instructions"), // Detailed instructions
  safetyNotes: text("safety_notes"), // Safety requirements
  qualityStandards: text("quality_standards"), // Quality requirements for this task
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  pausedTime: integer("paused_time").default(0), // Total paused time in minutes
  issues: text("issues"), // Any issues encountered
  notes: text("notes"),
  photoUrls: text("photo_urls").array().default([]), // Progress photos
  completedBy: integer("completed_by").references(() => users.id),
  verifiedBy: integer("verified_by").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const machineDowntime = pgTable("machine_downtime", {
  id: serial("id").primaryKey(),
  workstationId: text("workstation_id").notNull(),
  workstationName: text("workstation_name").notNull(),
  downtimeType: text("downtime_type").notNull(), // planned_maintenance, breakdown, material_shortage, no_operator, power_outage
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration").default(0), // Duration in minutes
  reason: text("reason").notNull(),
  description: text("description"),
  impactedOrders: text("impacted_orders").array().default([]), // Work order IDs affected
  repairCost: real("repair_cost").default(0),
  maintenanceNotes: text("maintenance_notes"),
  reportedBy: integer("reported_by").references(() => users.id).notNull(),
  resolvedBy: integer("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Production Insert Schemas
export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({ 
  id: true, 
  orderNumber: true, // Auto-generated
  createdAt: true, 
  updatedAt: true 
});

export const insertProductionScheduleSchema = createInsertSchema(productionSchedules).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertQualityCheckSchema = createInsertSchema(qualityChecks).omit({ 
  id: true, 
  checkNumber: true, // Auto-generated
  createdAt: true, 
  updatedAt: true 
});

export const insertProductionTaskSchema = createInsertSchema(productionTasks).omit({ 
  id: true, 
  taskNumber: true, // Auto-generated
  createdAt: true, 
  updatedAt: true 
});

export const insertMachineDowntimeSchema = createInsertSchema(machineDowntime).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// PO System and Brand Management Types
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type InsertSupplierProduct = z.infer<typeof insertSupplierProductSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Extended types for API responses
export type PurchaseOrderWithDetails = PurchaseOrder & {
  supplier: Supplier;
  items: (PurchaseOrderItem & { product: Product })[];
  createdByUser: { name: string; email: string };
};

export type SupplierWithStats = Supplier & {
  totalOrders: number;
  totalValue: number;
  lastOrderDate?: Date;
};

// BOM Calculator Types
export type BomCalculation = typeof bomCalculations.$inferSelect;
export type InsertBomCalculation = z.infer<typeof insertBomCalculation>;
export type BomItem = typeof bomItems.$inferSelect;
export type InsertBomItem = z.infer<typeof insertBomItem>;
export type BomHardwareRate = typeof bomHardwareRates.$inferSelect;
export type InsertBomHardwareRate = z.infer<typeof insertBomHardwareRate>;
export type BomBoardRate = typeof bomBoardRates.$inferSelect;
export type InsertBomBoardRate = z.infer<typeof insertBomBoardRate>;
export type BomSettings = typeof bomSettings.$inferSelect;
export type InsertBomSettings = z.infer<typeof insertBomSettingsSchema>;
export type TelegramUserSession = typeof telegramUserSessions.$inferSelect;
export type InsertTelegramUserSession = z.infer<typeof insertTelegramUserSessionSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;

// Production Planning & Manufacturing Types
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type ProductionSchedule = typeof productionSchedules.$inferSelect;
export type InsertProductionSchedule = z.infer<typeof insertProductionScheduleSchema>;
export type QualityCheck = typeof qualityChecks.$inferSelect;
export type InsertQualityCheck = z.infer<typeof insertQualityCheckSchema>;
export type ProductionTask = typeof productionTasks.$inferSelect;
export type InsertProductionTask = z.infer<typeof insertProductionTaskSchema>;
export type MachineDowntime = typeof machineDowntime.$inferSelect;
export type InsertMachineDowntime = z.infer<typeof insertMachineDowntimeSchema>;

// Extended Production types for API responses
export type WorkOrderWithDetails = WorkOrder & {
  project: { name: string; code: string };
  client: { name: string };
  quote?: { quoteNumber: string; title: string };
  createdByUser: { name: string };
  approvedByUser?: { name: string };
  schedules: ProductionSchedule[];
  tasks: ProductionTask[];
  qualityChecks: QualityCheck[];
};

export type ProductionScheduleWithDetails = ProductionSchedule & {
  workOrder: { orderNumber: string; title: string };
  scheduledByUser: { name: string };
  assignedWorkerNames: string[];
};

export type QualityCheckWithDetails = QualityCheck & {
  workOrder: { orderNumber: string; title: string };
  inspectedByUser: { name: string };
  approvedByUser?: { name: string };
};

export type ProductionTaskWithDetails = ProductionTask & {
  workOrder: { orderNumber: string; title: string };
  assignedToUser?: { name: string };
  createdByUser: { name: string };
  completedByUser?: { name: string };
};

// Extended BOM types for API responses
export type BomCalculationWithDetails = BomCalculation & {
  items: BomItem[];
  calculatedByUser: { name: string };
  project?: { name: string; code: string };
};

// CRM Insert Schemas
export const insertLeadSourceSchema = createInsertSchema(leadSources).omit({ 
  id: true, 
  createdAt: true 
});

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({ 
  id: true, 
  createdAt: true 
});

// Lead functionality will use clients table with type field

export const insertInteractionSchema = createInsertSchema(interactions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertSatisfactionSurveySchema = createInsertSchema(satisfactionSurveys).omit({ 
  id: true, 
  createdAt: true 
});

// CRM Types
export type LeadSource = typeof leadSources.$inferSelect;
export type InsertLeadSource = z.infer<typeof insertLeadSourceSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
// Lead types removed - using clients table instead
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type SatisfactionSurvey = typeof satisfactionSurveys.$inferSelect;
export type InsertSatisfactionSurvey = z.infer<typeof insertSatisfactionSurveySchema>;

// Extended CRM types for API responses  
// Lead functionality moved to clients table - types simplified

export type InteractionWithDetails = Interaction & {
  user: { name: string; email: string };
  entityDetails?: {
    name: string;
    type: string;
    phone?: string;
    email?: string;
  };
};


