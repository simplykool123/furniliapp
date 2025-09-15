import { relations } from "drizzle-orm/relations";
import { users, attendance, boqUploads, leaves, materialRequests, payroll, stockMovements, products, tasks, requestItems, pettyCashExpenses, priceComparisons } from "./schema";

export const attendanceRelations = relations(attendance, ({one}) => ({
	user_checkInBy: one(users, {
		fields: [attendance.checkInBy],
		references: [users.id],
		relationName: "attendance_checkInBy_users_id"
	}),
	user_checkOutBy: one(users, {
		fields: [attendance.checkOutBy],
		references: [users.id],
		relationName: "attendance_checkOutBy_users_id"
	}),
	user_userId: one(users, {
		fields: [attendance.userId],
		references: [users.id],
		relationName: "attendance_userId_users_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	attendances_checkInBy: many(attendance, {
		relationName: "attendance_checkInBy_users_id"
	}),
	attendances_checkOutBy: many(attendance, {
		relationName: "attendance_checkOutBy_users_id"
	}),
	attendances_userId: many(attendance, {
		relationName: "attendance_userId_users_id"
	}),
	boqUploads: many(boqUploads),
	leaves_approvedBy: many(leaves, {
		relationName: "leaves_approvedBy_users_id"
	}),
	leaves_userId: many(leaves, {
		relationName: "leaves_userId_users_id"
	}),
	materialRequests_approvedBy: many(materialRequests, {
		relationName: "materialRequests_approvedBy_users_id"
	}),
	materialRequests_issuedBy: many(materialRequests, {
		relationName: "materialRequests_issuedBy_users_id"
	}),
	materialRequests_requestedBy: many(materialRequests, {
		relationName: "materialRequests_requestedBy_users_id"
	}),
	payrolls_processedBy: many(payroll, {
		relationName: "payroll_processedBy_users_id"
	}),
	payrolls_userId: many(payroll, {
		relationName: "payroll_userId_users_id"
	}),
	stockMovements: many(stockMovements),
	tasks_assignedBy: many(tasks, {
		relationName: "tasks_assignedBy_users_id"
	}),
	tasks_assignedTo: many(tasks, {
		relationName: "tasks_assignedTo_users_id"
	}),
	pettyCashExpenses_addedBy: many(pettyCashExpenses, {
		relationName: "pettyCashExpenses_addedBy_users_id"
	}),
	pettyCashExpenses_approvedBy: many(pettyCashExpenses, {
		relationName: "pettyCashExpenses_approvedBy_users_id"
	}),
	pettyCashExpenses_paidBy: many(pettyCashExpenses, {
		relationName: "pettyCashExpenses_paidBy_users_id"
	}),
	priceComparisons: many(priceComparisons),
}));

export const boqUploadsRelations = relations(boqUploads, ({one}) => ({
	user: one(users, {
		fields: [boqUploads.uploadedBy],
		references: [users.id]
	}),
}));

export const leavesRelations = relations(leaves, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [leaves.approvedBy],
		references: [users.id],
		relationName: "leaves_approvedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [leaves.userId],
		references: [users.id],
		relationName: "leaves_userId_users_id"
	}),
}));

export const materialRequestsRelations = relations(materialRequests, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [materialRequests.approvedBy],
		references: [users.id],
		relationName: "materialRequests_approvedBy_users_id"
	}),
	user_issuedBy: one(users, {
		fields: [materialRequests.issuedBy],
		references: [users.id],
		relationName: "materialRequests_issuedBy_users_id"
	}),
	user_requestedBy: one(users, {
		fields: [materialRequests.requestedBy],
		references: [users.id],
		relationName: "materialRequests_requestedBy_users_id"
	}),
	requestItems: many(requestItems),
}));

export const payrollRelations = relations(payroll, ({one}) => ({
	user_processedBy: one(users, {
		fields: [payroll.processedBy],
		references: [users.id],
		relationName: "payroll_processedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [payroll.userId],
		references: [users.id],
		relationName: "payroll_userId_users_id"
	}),
}));

export const stockMovementsRelations = relations(stockMovements, ({one}) => ({
	user: one(users, {
		fields: [stockMovements.performedBy],
		references: [users.id]
	}),
	product: one(products, {
		fields: [stockMovements.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	stockMovements: many(stockMovements),
	requestItems: many(requestItems),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	user_assignedBy: one(users, {
		fields: [tasks.assignedBy],
		references: [users.id],
		relationName: "tasks_assignedBy_users_id"
	}),
	user_assignedTo: one(users, {
		fields: [tasks.assignedTo],
		references: [users.id],
		relationName: "tasks_assignedTo_users_id"
	}),
}));

export const requestItemsRelations = relations(requestItems, ({one}) => ({
	product: one(products, {
		fields: [requestItems.productId],
		references: [products.id]
	}),
	materialRequest: one(materialRequests, {
		fields: [requestItems.requestId],
		references: [materialRequests.id]
	}),
}));

export const pettyCashExpensesRelations = relations(pettyCashExpenses, ({one}) => ({
	user_addedBy: one(users, {
		fields: [pettyCashExpenses.addedBy],
		references: [users.id],
		relationName: "pettyCashExpenses_addedBy_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [pettyCashExpenses.approvedBy],
		references: [users.id],
		relationName: "pettyCashExpenses_approvedBy_users_id"
	}),
	user_paidBy: one(users, {
		fields: [pettyCashExpenses.paidBy],
		references: [users.id],
		relationName: "pettyCashExpenses_paidBy_users_id"
	}),
}));

export const priceComparisonsRelations = relations(priceComparisons, ({one}) => ({
	user: one(users, {
		fields: [priceComparisons.addedBy],
		references: [users.id]
	}),
}));