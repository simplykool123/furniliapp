import { pgTable, foreignKey, serial, integer, timestamp, real, text, boolean, unique, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const attendance = pgTable("attendance", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	checkInTime: timestamp("check_in_time", { mode: 'string' }),
	checkOutTime: timestamp("check_out_time", { mode: 'string' }),
	workingHours: real("working_hours").default(0),
	overtimeHours: real("overtime_hours").default(0),
	status: text().default('present').notNull(),
	leaveType: text("leave_type"),
	checkInBy: integer("check_in_by"),
	checkOutBy: integer("check_out_by"),
	location: text(),
	notes: text(),
	isManualEntry: boolean("is_manual_entry").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.checkInBy],
			foreignColumns: [users.id],
			name: "attendance_check_in_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.checkOutBy],
			foreignColumns: [users.id],
			name: "attendance_check_out_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "attendance_user_id_users_id_fk"
		}),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("categories_name_unique").on(table.name),
]);

export const boqUploads = pgTable("boq_uploads", {
	id: serial().primaryKey().notNull(),
	filename: text().notNull(),
	originalName: text("original_name").notNull(),
	uploadedBy: integer("uploaded_by").notNull(),
	status: text().default('processing').notNull(),
	extractedData: jsonb("extracted_data"),
	projectName: text("project_name"),
	boqReference: text("boq_reference"),
	totalValue: real("total_value"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "boq_uploads_uploaded_by_users_id_fk"
		}),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	contactPerson: text("contact_person"),
	email: text(),
	phone: text(),
	address: text(),
	gstNumber: text("gst_number"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("clients_name_unique").on(table.name),
]);

export const leaves = pgTable("leaves", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	leaveType: text("leave_type").notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	totalDays: integer("total_days").notNull(),
	reason: text().notNull(),
	status: text().default('pending').notNull(),
	appliedAt: timestamp("applied_at", { mode: 'string' }).defaultNow(),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	documentUrl: text("document_url"),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "leaves_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "leaves_user_id_users_id_fk"
		}),
]);

export const materialRequests = pgTable("material_requests", {
	id: serial().primaryKey().notNull(),
	clientName: text("client_name").notNull(),
	orderNumber: text("order_number").notNull(),
	requestedBy: integer("requested_by").notNull(),
	status: text().default('pending').notNull(),
	priority: text().default('medium').notNull(),
	boqReference: text("boq_reference"),
	remarks: text(),
	totalValue: real("total_value").default(0).notNull(),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	issuedBy: integer("issued_by"),
	issuedAt: timestamp("issued_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "material_requests_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.issuedBy],
			foreignColumns: [users.id],
			name: "material_requests_issued_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.requestedBy],
			foreignColumns: [users.id],
			name: "material_requests_requested_by_users_id_fk"
		}),
]);

export const payroll = pgTable("payroll", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	month: integer().notNull(),
	year: integer().notNull(),
	basicSalary: real("basic_salary").notNull(),
	allowances: real().default(0),
	overtimePay: real("overtime_pay").default(0),
	bonus: real().default(0),
	deductions: real().default(0),
	netSalary: real("net_salary").notNull(),
	totalWorkingDays: integer("total_working_days").default(30),
	actualWorkingDays: integer("actual_working_days").notNull(),
	totalHours: real("total_hours").default(0),
	overtimeHours: real("overtime_hours").default(0),
	leaveDays: integer("leave_days").default(0),
	paySlipUrl: text("pay_slip_url"),
	status: text().default('draft').notNull(),
	processedBy: integer("processed_by"),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.processedBy],
			foreignColumns: [users.id],
			name: "payroll_processed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payroll_user_id_users_id_fk"
		}),
]);

export const stockMovements = pgTable("stock_movements", {
	id: serial().primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	movementType: text("movement_type").notNull(),
	quantity: integer().notNull(),
	previousStock: integer("previous_stock").notNull(),
	newStock: integer("new_stock").notNull(),
	reference: text(),
	vendor: text(),
	costPerUnit: real("cost_per_unit"),
	totalCost: real("total_cost"),
	notes: text(),
	performedBy: integer("performed_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.performedBy],
			foreignColumns: [users.id],
			name: "stock_movements_performed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "stock_movements_product_id_products_id_fk"
		}),
]);

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	status: text().default('todo').notNull(),
	priority: text().default('medium').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	assignedTo: integer("assigned_to").notNull(),
	assignedBy: integer("assigned_by").notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "tasks_assigned_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "tasks_assigned_to_users_id_fk"
		}),
]);

export const requestItems = pgTable("request_items", {
	id: serial().primaryKey().notNull(),
	requestId: integer("request_id").notNull(),
	productId: integer("product_id").notNull(),
	requestedQuantity: integer("requested_quantity").notNull(),
	approvedQuantity: integer("approved_quantity"),
	unitPrice: real("unit_price").notNull(),
	totalPrice: real("total_price").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "request_items_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [materialRequests.id],
			name: "request_items_request_id_material_requests_id_fk"
		}),
]);

export const products = pgTable("products", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	brand: text(),
	size: text(),
	thickness: text(),
	sku: text(),
	pricePerUnit: real("price_per_unit").notNull(),
	currentStock: integer("current_stock").default(0).notNull(),
	minStock: integer("min_stock").default(10).notNull(),
	unit: text().default('pieces').notNull(),
	imageUrl: text("image_url"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("products_sku_unique").on(table.sku),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	name: text().notNull(),
	role: text().default('staff').notNull(),
	phone: text(),
	aadharNumber: text("aadhar_number"),
	employeeId: text("employee_id"),
	department: text(),
	designation: text(),
	joiningDate: timestamp("joining_date", { mode: 'string' }),
	basicSalary: real("basic_salary").default(0),
	allowances: real().default(0),
	profilePhotoUrl: text("profile_photo_url"),
	aadharCardUrl: text("aadhar_card_url"),
	documentsUrls: text("documents_urls").array().default([""]),
	bankAccountNumber: text("bank_account_number"),
	ifscCode: text("ifsc_code"),
	address: text(),
	emergencyContact: text("emergency_contact"),
	emergencyContactPhone: text("emergency_contact_phone"),
	isActive: boolean("is_active").default(true).notNull(),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
	unique("users_aadhar_number_unique").on(table.aadharNumber),
	unique("users_employee_id_unique").on(table.employeeId),
]);

export const pettyCashExpenses = pgTable("petty_cash_expenses", {
	id: serial().primaryKey().notNull(),
	category: text().notNull(),
	amount: real().notNull(),
	vendor: text(),
	description: text(),
	orderNo: text("order_no"),
	paidBy: integer("paid_by"),
	receiptImageUrl: text("receipt_image_url"),
	extractedData: jsonb("extracted_data"),
	expenseDate: timestamp("expense_date", { mode: 'string' }).notNull(),
	addedBy: integer("added_by").notNull(),
	approvedBy: integer("approved_by"),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [users.id],
			name: "petty_cash_expenses_added_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "petty_cash_expenses_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.paidBy],
			foreignColumns: [users.id],
			name: "petty_cash_expenses_paid_by_users_id_fk"
		}),
]);

export const priceComparisons = pgTable("price_comparisons", {
	id: serial().primaryKey().notNull(),
	productName: text("product_name").notNull(),
	size: text(),
	thickness: text(),
	brand: text().notNull(),
	price: real().notNull(),
	vendor: text(),
	imageUrl: text("image_url"),
	addedBy: integer("added_by").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [users.id],
			name: "price_comparisons_added_by_users_id_fk"
		}),
]);
