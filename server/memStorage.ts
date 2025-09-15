// MemStorage implementation for LOCAL STORAGE ONLY manufacturing workflow
// Stores data in memory with local JSON file persistence for VPS deployment
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getNextWorkOrderNumber, getNextQualityCheckNumber, getNextProductionTaskNumber } from './utils/ids';
import type {
  WorkOrder,
  InsertWorkOrder,
  ProductionSchedule,
  InsertProductionSchedule,
  QualityCheck,
  InsertQualityCheck,
  ProductionTask,
  InsertProductionTask,
  WorkOrderWithDetails,
  ProductionScheduleWithDetails,
  QualityCheckWithDetails,
  ProductionTaskWithDetails,
} from "@shared/schema";

// Local storage directories for VPS deployment
const STORAGE_DIR = 'data';
const WORK_ORDERS_FILE = join(STORAGE_DIR, 'work_orders.json');
const PRODUCTION_SCHEDULES_FILE = join(STORAGE_DIR, 'production_schedules.json');
const QUALITY_CHECKS_FILE = join(STORAGE_DIR, 'quality_checks.json');
const PRODUCTION_TASKS_FILE = join(STORAGE_DIR, 'production_tasks.json');

// Ensure storage directory exists
if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

// In-memory storage
let workOrders: WorkOrder[] = [];
let productionSchedules: ProductionSchedule[] = [];
let qualityChecks: QualityCheck[] = [];
let productionTasks: ProductionTask[] = [];
let nextId = 1;

// Load data from local JSON files on startup
function loadData() {
  try {
    if (existsSync(WORK_ORDERS_FILE)) {
      workOrders = JSON.parse(readFileSync(WORK_ORDERS_FILE, 'utf8'));
    }
    if (existsSync(PRODUCTION_SCHEDULES_FILE)) {
      productionSchedules = JSON.parse(readFileSync(PRODUCTION_SCHEDULES_FILE, 'utf8'));
    }
    if (existsSync(QUALITY_CHECKS_FILE)) {
      qualityChecks = JSON.parse(readFileSync(QUALITY_CHECKS_FILE, 'utf8'));
    }
    if (existsSync(PRODUCTION_TASKS_FILE)) {
      productionTasks = JSON.parse(readFileSync(PRODUCTION_TASKS_FILE, 'utf8'));
    }
    
    // Set next ID based on existing data
    const allIds = [
      ...workOrders.map(w => w.id),
      ...productionSchedules.map(p => p.id),
      ...qualityChecks.map(q => q.id),
      ...productionTasks.map(t => t.id)
    ];
    nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
    
    console.log('✓ Manufacturing workflow data loaded from local storage');
  } catch (error) {
    console.warn('Warning: Could not load manufacturing data from local storage, starting fresh');
  }
}

// Save data to local JSON files
function saveData() {
  try {
    writeFileSync(WORK_ORDERS_FILE, JSON.stringify(workOrders, null, 2));
    writeFileSync(PRODUCTION_SCHEDULES_FILE, JSON.stringify(productionSchedules, null, 2));
    writeFileSync(QUALITY_CHECKS_FILE, JSON.stringify(qualityChecks, null, 2));
    writeFileSync(PRODUCTION_TASKS_FILE, JSON.stringify(productionTasks, null, 2));
  } catch (error) {
    console.error('Error saving manufacturing data to local storage:', error);
  }
}

// Manufacturing MemStorage implementation
export class ManufacturingMemStorage {
  constructor() {
    loadData();
  }

  // Work Orders
  async getAllWorkOrders(): Promise<WorkOrderWithDetails[]> {
    return workOrders.map(wo => ({
      ...wo,
      project: { name: 'Sample Project', code: 'SP-001' },
      client: { name: 'Sample Client' },
      createdByUser: { name: 'System' },
      schedules: [],
      tasks: [],
      qualityChecks: []
    }));
  }

  async getWorkOrder(id: number): Promise<WorkOrderWithDetails | undefined> {
    const workOrder = workOrders.find(wo => wo.id === id);
    if (!workOrder) return undefined;

    return {
      ...workOrder,
      project: { name: 'Sample Project', code: 'SP-001' },
      client: { name: 'Sample Client' },
      createdByUser: { name: 'System' },
      schedules: [],
      tasks: [],
      qualityChecks: []
    };
  }

  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const orderNumber = getNextWorkOrderNumber(
      workOrders.length > 0 ? workOrders[workOrders.length - 1].orderNumber : undefined
    );
    
    const newWorkOrder: WorkOrder = {
      id: nextId++,
      orderNumber,
      projectId: workOrder.projectId,
      clientId: workOrder.clientId,
      title: workOrder.title,
      description: workOrder.description || null,
      status: workOrder.status || 'pending',
      priority: workOrder.priority || 'medium',
      orderType: workOrder.orderType || 'manufacturing',
      estimatedStartDate: workOrder.estimatedStartDate || null,
      estimatedEndDate: workOrder.estimatedEndDate || null,
      actualStartDate: workOrder.actualStartDate || null,
      actualEndDate: workOrder.actualEndDate || null,
      estimatedHours: workOrder.estimatedHours || 0,
      actualHours: workOrder.actualHours || 0,
      completionPercentage: workOrder.completionPercentage || 0,
      totalQuantity: workOrder.totalQuantity || 1,
      completedQuantity: workOrder.completedQuantity || 0,
      rejectedQuantity: workOrder.rejectedQuantity || 0,
      assignedTeam: workOrder.assignedTeam || [],
      workstationRequired: workOrder.workstationRequired || null,
      materials: workOrder.materials || [],
      specifications: workOrder.specifications || null,
      qualityStandards: workOrder.qualityStandards || null,
      notes: workOrder.notes || null,
      attachments: workOrder.attachments || [],
      createdBy: workOrder.createdBy,
      approvedBy: workOrder.approvedBy || null,
      approvedAt: workOrder.approvedAt || null,
      quoteId: workOrder.quoteId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    workOrders.push(newWorkOrder);
    saveData();
    return newWorkOrder;
  }

  async updateWorkOrder(id: number, updates: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined> {
    const index = workOrders.findIndex(wo => wo.id === id);
    if (index === -1) return undefined;

    workOrders[index] = { ...workOrders[index], ...updates, updatedAt: new Date() };
    saveData();
    return workOrders[index];
  }

  async deleteWorkOrder(id: number): Promise<boolean> {
    const index = workOrders.findIndex(wo => wo.id === id);
    if (index === -1) return false;

    workOrders.splice(index, 1);
    saveData();
    return true;
  }

  // Production Schedules  
  async getAllProductionSchedules(): Promise<ProductionScheduleWithDetails[]> {
    return productionSchedules.map(ps => ({
      ...ps,
      workOrder: { orderNumber: 'WO-001', title: 'Sample Work Order' },
      scheduledByUser: { name: 'System' },
      assignedWorkerNames: []
    }));
  }

  async createProductionSchedule(schedule: InsertProductionSchedule): Promise<ProductionSchedule> {
    const newSchedule: ProductionSchedule = {
      id: nextId++,
      workOrderId: schedule.workOrderId || 1,
      workstationId: schedule.workstationId || 'default',
      workstationName: schedule.workstationName,
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime || '09:00',
      endTime: schedule.endTime || '17:00',
      duration: schedule.duration || 480,
      status: schedule.status || 'scheduled',
      assignedWorkers: schedule.assignedWorkers || [],
      actualStartTime: schedule.actualStartTime || null,
      actualEndTime: schedule.actualEndTime || null,
      notes: schedule.notes || null,
      delayReason: schedule.delayReason || null,
      setupTime: schedule.setupTime || 0,
      operationType: schedule.operationType,
      capacity: schedule.capacity || 1,
      scheduledBy: schedule.scheduledBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    productionSchedules.push(newSchedule);
    saveData();
    return newSchedule;
  }

  // Quality Checks
  async getAllQualityChecks(): Promise<QualityCheckWithDetails[]> {
    return qualityChecks.map(qc => ({
      ...qc,
      workOrder: { orderNumber: 'WO-001', title: 'Sample Work Order' },
      inspectedByUser: { name: 'System' }
    }));
  }

  async createQualityCheck(qualityCheck: InsertQualityCheck): Promise<QualityCheck> {
    const checkNumber = getNextQualityCheckNumber(
      qualityChecks.length > 0 ? qualityChecks[qualityChecks.length - 1].checkNumber : undefined
    );

    const newQualityCheck: QualityCheck = {
      id: nextId++,
      checkNumber,
      workOrderId: qualityCheck.workOrderId,
      productionTaskId: qualityCheck.productionTaskId || null,
      checkType: qualityCheck.checkType,
      inspectionStage: qualityCheck.inspectionStage,
      furnitureType: qualityCheck.furnitureType || null,
      checklist: qualityCheck.checklist || [],
      overallStatus: qualityCheck.overallStatus || 'pending',
      defectsFound: qualityCheck.defectsFound || [],
      correctionRequired: qualityCheck.correctionRequired || false,
      correctionNotes: qualityCheck.correctionNotes || null,
      reworkRequired: qualityCheck.reworkRequired || false,
      reworkNotes: qualityCheck.reworkNotes || null,
      quantityInspected: qualityCheck.quantityInspected || 1,
      quantityPassed: qualityCheck.quantityPassed || 0,
      quantityFailed: qualityCheck.quantityFailed || 0,
      inspectedBy: qualityCheck.inspectedBy,
      approvedBy: qualityCheck.approvedBy || null,
      inspectionDate: qualityCheck.inspectionDate || new Date(),
      approvalDate: qualityCheck.approvalDate || null,
      photoUrls: qualityCheck.photoUrls || [],
      measurementData: qualityCheck.measurementData || [],
      materialGrade: qualityCheck.materialGrade || null,
      finishQuality: qualityCheck.finishQuality || null,
      notes: qualityCheck.notes || null,
      correctionDeadline: qualityCheck.correctionDeadline || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    qualityChecks.push(newQualityCheck);
    saveData();
    return newQualityCheck;
  }

  // Production Tasks
  async getAllProductionTasks(): Promise<ProductionTaskWithDetails[]> {
    return productionTasks.map(pt => ({
      ...pt,
      workOrder: { orderNumber: 'WO-001', title: 'Sample Work Order' },
      createdByUser: { name: 'System' }
    }));
  }

  async createProductionTask(task: InsertProductionTask): Promise<ProductionTask> {
    const taskNumber = getNextProductionTaskNumber(
      productionTasks.length > 0 ? productionTasks[productionTasks.length - 1].taskNumber : undefined
    );

    const newTask: ProductionTask = {
      id: nextId++,
      taskNumber,
      workOrderId: task.workOrderId,
      scheduleId: task.scheduleId || null,
      title: task.title,
      description: task.description || null,
      operationType: task.operationType,
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      sequence: task.sequence || 1,
      estimatedDuration: task.estimatedDuration || 0,
      actualDuration: task.actualDuration || 0,
      quantityToProcess: task.quantityToProcess || 1,
      quantityCompleted: task.quantityCompleted || 0,
      assignedTo: task.assignedTo || null,
      workstation: task.workstation || null,
      toolsRequired: task.toolsRequired || [],
      materialsUsed: task.materialsUsed || [],
      workInstructions: task.workInstructions || null,
      safetyNotes: task.safetyNotes || null,
      qualityStandards: task.qualityStandards || null,
      startTime: task.startTime || null,
      endTime: task.endTime || null,
      pausedTime: task.pausedTime || 0,
      issues: task.issues || null,
      notes: task.notes || null,
      photoUrls: task.photoUrls || [],
      completedBy: task.completedBy || null,
      verifiedBy: task.verifiedBy || null,
      createdBy: task.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    productionTasks.push(newTask);
    saveData();
    return newTask;
  }

  // Dashboard stats
  async getProductionDashboardData() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todaySchedule = productionSchedules.filter(ps => 
      ps.scheduledDate >= todayStart && ps.scheduledDate < todayEnd
    );

    const pendingQualityChecks = qualityChecks.filter(qc => qc.overallStatus === 'pending');

    const totalWorkOrders = workOrders.length;
    const activeWorkOrders = workOrders.filter(wo => 
      ['pending', 'planned', 'in_progress'].includes(wo.status)
    ).length;

    const completedToday = workOrders.filter(wo => 
      wo.status === 'completed' && 
      wo.actualEndDate &&
      new Date(wo.actualEndDate) >= todayStart &&
      new Date(wo.actualEndDate) < todayEnd
    ).length;

    return {
      stats: {
        totalWorkOrders,
        activeWorkOrders,
        completedToday,
        pendingQuality: pendingQualityChecks.length,
        capacityUtilization: totalWorkOrders > 0 ? Math.round((activeWorkOrders / totalWorkOrders) * 100) : 0,
        todayScheduleCount: todaySchedule.length
      },
      recentWorkOrders: workOrders.slice(-10).reverse(),
      todaySchedule: todaySchedule.map(schedule => ({
        ...schedule,
        workOrder: { orderNumber: 'WO-001', title: 'Sample Work Order' },
        scheduledByUser: { name: 'System' }
      })),
      pendingQualityChecks: pendingQualityChecks.map(qc => ({
        ...qc,
        workOrder: { orderNumber: 'WO-001', title: 'Sample Work Order' },
        inspector: { name: 'System' }
      }))
    };
  }
}

// Export singleton instance
export const manufacturingStorage = new ManufacturingMemStorage();