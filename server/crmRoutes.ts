import type { Express } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "./middleware/auth";
import { db } from "./db";
import { 
  leadSources, 
  pipelineStages, 
  clients, 
  interactions, 
  users,
  projects
} from "@shared/schema";
import { eq, and, or, desc, asc, like, sql } from "drizzle-orm";

export function registerCRMRoutes(app: Express) {
  // ============ LEAD SOURCES API ============
  app.get("/api/crm/lead-sources", authenticateToken, async (req, res) => {
    try {
      const sources = await db
        .select({
          id: leadSources.id,
          name: leadSources.name,
          type: leadSources.type,
          description: leadSources.description,
          isActive: leadSources.isActive,
          createdAt: leadSources.createdAt
        })
        .from(leadSources)
        .where(eq(leadSources.isActive, true))
        .orderBy(asc(leadSources.name));
      
      res.json(sources);
    } catch (error) {
      console.error("Error fetching lead sources:", error);
      res.status(500).json({ error: "Failed to fetch lead sources" });
    }
  });

  app.post("/api/crm/lead-sources", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { name, type, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const newSource = await db
        .insert(leadSources)
        .values({ name, type, description })
        .returning();
      
      res.status(201).json(newSource[0]);
    } catch (error) {
      console.error("Error creating lead source:", error);
      res.status(400).json({ error: "Failed to create lead source" });
    }
  });

  // ============ PIPELINE STAGES API ============
  app.get("/api/crm/pipeline-stages", authenticateToken, async (req, res) => {
    try {
      const stages = await db
        .select({
          id: pipelineStages.id,
          name: pipelineStages.name,
          description: pipelineStages.description,
          order: pipelineStages.order,
          probability: pipelineStages.probability,
          color: pipelineStages.color,
          isActive: pipelineStages.isActive,
          createdAt: pipelineStages.createdAt
        })
        .from(pipelineStages)
        .where(eq(pipelineStages.isActive, true))
        .orderBy(asc(pipelineStages.order));
      
      res.json(stages);
    } catch (error) {
      console.error("Error fetching pipeline stages:", error);
      res.status(500).json({ error: "Failed to fetch pipeline stages" });
    }
  });

  app.post("/api/crm/pipeline-stages", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { name, description, order, probability, color } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const newStage = await db
        .insert(pipelineStages)
        .values({ name, description, order: order || 0, probability, color })
        .returning();
      
      res.status(201).json(newStage[0]);
    } catch (error) {
      console.error("Error creating pipeline stage:", error);
      res.status(400).json({ error: "Failed to create pipeline stage" });
    }
  });

  // ============ LEADS API ============ 
  // Using clients table with type='lead' instead of separate leads table
  app.get("/api/crm/leads", authenticateToken, async (req, res) => {
    try {
      const { search } = req.query;
      
      // TEMPORARY FIX: Use raw SQL to bypass Drizzle ORM issue
      let sqlQuery = `
        SELECT 
          c.id, c.name, c.email, c.mobile, c.city, c.contact_person as "contactPerson",
          c.phone, c.address1, c.address2, c.state, c.pin_code as "pinCode", 
          c.gst_number as "gstNumber", c.type, c.lead_source_id as "leadSourceId",
          c.pipeline_stage_id as "pipelineStageId", c.is_active as "isActive",
          c.created_at as "createdAt", c.updated_at as "updatedAt",
          ls.id as "leadSourceId_join", ls.name as "leadSourceName", ls.type as "leadSourceType",
          ps.id as "pipelineStageId_join", ps.name as "pipelineStageName", 
          ps.color as "pipelineStageColor", ps.probability as "pipelineStageProbability"
        FROM clients c
        LEFT JOIN lead_sources ls ON c.lead_source_id = ls.id
        LEFT JOIN pipeline_stages ps ON c.pipeline_stage_id = ps.id
        WHERE c.is_active = true AND c.type = 'lead'
      `;

      const queryParams: any[] = [];

      // Add search functionality
      if (search && search !== 'all') {
        sqlQuery += ` AND (c.name ILIKE $${queryParams.length + 1} OR c.email ILIKE $${queryParams.length + 2} OR c.mobile ILIKE $${queryParams.length + 3} OR c.city ILIKE $${queryParams.length + 4})`;
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sqlQuery += ` ORDER BY c.created_at DESC`;

      const result = await db.execute(sql.raw(sqlQuery, queryParams));
      const leads = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        mobile: row.mobile,
        city: row.city,
        contactPerson: row.contactPerson,
        phone: row.phone,
        address1: row.address1,
        address2: row.address2,
        state: row.state,
        pinCode: row.pinCode,
        gstNumber: row.gstNumber,
        type: row.type,
        leadSourceId: row.leadSourceId,
        pipelineStageId: row.pipelineStageId,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        leadSource: row.leadSourceId_join ? {
          id: row.leadSourceId_join,
          name: row.leadSourceName, 
          type: row.leadSourceType
        } : null,
        pipelineStage: row.pipelineStageId_join ? {
          id: row.pipelineStageId_join,
          name: row.pipelineStageName,
          color: row.pipelineStageColor,
          probability: row.pipelineStageProbability
        } : null
      }));

      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Get leads by stage and source for pipeline view
  app.get("/api/crm/leads/:stage/:source", authenticateToken, async (req, res) => {
    try {
      const { stage, source } = req.params;
      
      // TEMPORARY FIX: Use raw SQL to bypass Drizzle ORM issue
      let sqlQuery = `
        SELECT 
          c.id, c.name, c.email, c.mobile, c.city, c.contact_person as "contactPerson",
          c.phone, c.address1, c.address2, c.state, c.pin_code as "pinCode", 
          c.gst_number as "gstNumber", c.type, c.lead_source_id as "leadSourceId",
          c.pipeline_stage_id as "pipelineStageId", c.is_active as "isActive",
          c.created_at as "createdAt", c.updated_at as "updatedAt",
          ls.id as "leadSourceId_join", ls.name as "leadSourceName", ls.type as "leadSourceType",
          ps.id as "pipelineStageId_join", ps.name as "pipelineStageName", 
          ps.color as "pipelineStageColor", ps.probability as "pipelineStageProbability"
        FROM clients c
        LEFT JOIN lead_sources ls ON c.lead_source_id = ls.id
        LEFT JOIN pipeline_stages ps ON c.pipeline_stage_id = ps.id
        WHERE c.is_active = true AND c.type = 'lead'
      `;

      const queryParams: any[] = [];
      
      // Add stage filter
      if (stage && stage !== 'all') {
        const stageId = parseInt(stage);
        if (!isNaN(stageId)) {
          sqlQuery += ` AND c.pipeline_stage_id = $${queryParams.length + 1}`;
          queryParams.push(stageId);
        }
      }

      // Add source filter  
      if (source && source !== 'all') {
        const sourceId = parseInt(source);
        if (!isNaN(sourceId)) {
          sqlQuery += ` AND c.lead_source_id = $${queryParams.length + 1}`;
          queryParams.push(sourceId);
        }
      }

      sqlQuery += ` ORDER BY c.created_at DESC`;

      const result = await db.execute(sql.raw(sqlQuery, queryParams));
      const leads = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        mobile: row.mobile,
        city: row.city,
        contactPerson: row.contactPerson,
        phone: row.phone,
        address1: row.address1,
        address2: row.address2,
        state: row.state,
        pinCode: row.pinCode,
        gstNumber: row.gstNumber,
        type: row.type,
        leadSourceId: row.leadSourceId,
        pipelineStageId: row.pipelineStageId,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        leadSource: row.leadSourceId_join ? {
          id: row.leadSourceId_join,
          name: row.leadSourceName, 
          type: row.leadSourceType
        } : null,
        pipelineStage: row.pipelineStageId_join ? {
          id: row.pipelineStageId_join,
          name: row.pipelineStageName,
          color: row.pipelineStageColor,
          probability: row.pipelineStageProbability
        } : null
      }));

      res.json(leads);
    } catch (error) {
      console.error("Error fetching filtered leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/crm/leads", authenticateToken, requireRole(['admin', 'manager', 'staff']), async (req, res) => {
    try {
      const { name, email, mobile, city, contactPerson, phone, address1, address2, state, pinCode, leadSourceId, pipelineStageId } = req.body;
      
      if (!name || !mobile || !city) {
        return res.status(400).json({ error: "Name, mobile, and city are required" });
      }

      const newLead = await db
        .insert(clients)
        .values({
          name,
          email,
          mobile, 
          city,
          contactPerson,
          phone,
          address1,
          address2,
          state,
          pinCode,
          leadSourceId: leadSourceId || null,
          pipelineStageId: pipelineStageId || null,
          type: "lead" // This makes it a lead instead of a client
        })
        .returning();
      
      res.status(201).json(newLead[0]);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(400).json({ error: "Failed to create lead" });
    }
  });

  // Convert lead to client
  app.put("/api/crm/leads/:id/convert", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      
      const updatedClient = await db
        .update(clients)
        .set({ 
          type: "client", // Convert from lead to client
          updatedAt: new Date()
        })
        .where(and(
          eq(clients.id, leadId),
          eq(clients.type, "lead")
        ))
        .returning();

      if (!updatedClient[0]) {
        return res.status(404).json({ error: "Lead not found" });
      }

      res.json(updatedClient[0]);
    } catch (error) {
      console.error("Error converting lead to client:", error);
      res.status(500).json({ error: "Failed to convert lead" });
    }
  });

  // ============ UNIFIED INTERACTIONS API ============
  
  // Get interactions by entity (original method)
  app.get("/api/crm/interactions/:entityType/:entityId", authenticateToken, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      
      const interactionData = await db
        .select({
          interaction: interactions,
          user: {
            id: users.id,
            name: users.name,
          }
        })
        .from(interactions)
        .leftJoin(users, eq(interactions.userId, users.id))
        .where(and(
          eq(interactions.entityType, entityType),
          eq(interactions.entityId, parseInt(entityId))
        ))
        .orderBy(desc(interactions.createdAt));

      res.json(interactionData);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });

  // FLAT-RESPONSE: Get ALL interactions for a client (across lead→project transition)
  app.get("/api/crm/interactions/client/:clientId", authenticateToken, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const interactionData = await db
        .select({
          id: interactions.id,
          type: interactions.type,
          direction: interactions.direction,
          subject: interactions.subject,
          content: interactions.content,
          outcome: interactions.outcome,
          duration: interactions.duration,
          completedDate: interactions.completedDate,
          entityType: interactions.entityType,
          entityId: interactions.entityId,
          clientId: interactions.clientId,
          projectId: interactions.projectId,
          createdAt: interactions.createdAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email
          },
          client: {
            id: clients.id,
            name: clients.name,
            email: clients.email,
            type: clients.type
          },
          project: {
            id: projects.id,
            name: projects.name,
            code: projects.code
          }
        })
        .from(interactions)
        .leftJoin(users, eq(interactions.userId, users.id))
        .leftJoin(clients, eq(interactions.clientId, clients.id))
        .leftJoin(projects, eq(interactions.projectId, projects.id))
        .where(eq(interactions.clientId, parseInt(clientId)))
        .orderBy(desc(interactions.createdAt));

      res.json(interactionData);
    } catch (error) {
      console.error("Error fetching client interactions:", error);
      res.status(500).json({ error: "Failed to fetch client interactions" });
    }
  });

  // FLAT-RESPONSE: Get interactions for a specific project
  app.get("/api/crm/interactions/project/:projectId", authenticateToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      
      const interactionData = await db
        .select({
          id: interactions.id,
          type: interactions.type,
          direction: interactions.direction,
          subject: interactions.subject,
          content: interactions.content,
          outcome: interactions.outcome,
          duration: interactions.duration,
          completedDate: interactions.completedDate,
          entityType: interactions.entityType,
          entityId: interactions.entityId,
          clientId: interactions.clientId,
          projectId: interactions.projectId,
          createdAt: interactions.createdAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email
          },
          client: {
            id: clients.id,
            name: clients.name,
            email: clients.email,
            type: clients.type
          },
          project: {
            id: projects.id,
            name: projects.name,
            code: projects.code
          }
        })
        .from(interactions)
        .leftJoin(users, eq(interactions.userId, users.id))
        .leftJoin(clients, eq(interactions.clientId, clients.id))
        .leftJoin(projects, eq(interactions.projectId, projects.id))
        .where(eq(interactions.projectId, parseInt(projectId)))
        .orderBy(desc(interactions.createdAt));

      res.json(interactionData);
    } catch (error) {
      console.error("Error fetching project interactions:", error);
      res.status(500).json({ error: "Failed to fetch project interactions" });
    }
  });

  // FLAT-RESPONSE: Get ALL interactions (for "all" view)
  app.get("/api/crm/interactions/all", authenticateToken, async (req, res) => {
    try {
      const interactionData = await db
        .select({
          id: interactions.id,
          type: interactions.type,
          direction: interactions.direction,
          subject: interactions.subject,
          content: interactions.content,
          outcome: interactions.outcome,
          duration: interactions.duration,
          completedDate: interactions.completedDate,
          entityType: interactions.entityType,
          entityId: interactions.entityId,
          clientId: interactions.clientId,
          projectId: interactions.projectId,
          createdAt: interactions.createdAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email
          },
          client: {
            id: clients.id,
            name: clients.name,
            email: clients.email,
            type: clients.type
          },
          project: {
            id: projects.id,
            name: projects.name,
            code: projects.code
          }
        })
        .from(interactions)
        .leftJoin(users, eq(interactions.userId, users.id))
        .leftJoin(clients, eq(interactions.clientId, clients.id))
        .leftJoin(projects, eq(interactions.projectId, projects.id))
        .orderBy(desc(interactions.createdAt))
        .limit(200); // Limit for performance

      res.json(interactionData);
    } catch (error) {
      console.error("Error fetching all interactions:", error);
      res.status(500).json({ error: "Failed to fetch all interactions" });
    }
  });

  app.post("/api/crm/interactions", authenticateToken, async (req, res) => {
    try {
      const { entityType, entityId, clientId, projectId, type, direction, subject, content, outcome, duration } = req.body;
      
      if (!entityType || !entityId || !type || !subject) {
        return res.status(400).json({ error: "EntityType, entityId, type, and subject are required" });
      }

      // Smart client/project ID detection
      let resolvedClientId = clientId ? parseInt(clientId) : null;
      let resolvedProjectId = projectId ? parseInt(projectId) : null;

      // If entityType is "lead" or "client", use entityId as clientId
      if (entityType === "lead" || entityType === "client") {
        resolvedClientId = parseInt(entityId);
      }
      
      // If entityType is "project", use entityId as projectId and fetch clientId
      if (entityType === "project") {
        resolvedProjectId = parseInt(entityId);
        
        // Get the client ID from the project
        const project = await db
          .select({ clientId: projects.clientId })
          .from(projects)
          .where(eq(projects.id, resolvedProjectId))
          .limit(1);
          
        if (project[0]) {
          resolvedClientId = project[0].clientId;
        }
      }

      const newInteraction = await db
        .insert(interactions)
        .values({
          entityType,
          entityId: parseInt(entityId),
          clientId: resolvedClientId, // Track client for unified notes
          projectId: resolvedProjectId, // Track project for project-specific notes
          type,
          direction: direction || "outbound",
          subject,
          content,
          outcome,
          duration: duration ? parseInt(duration) : null,
          userId: (req as AuthRequest).user!.id,
          completedDate: new Date()
        })
        .returning();
      
      res.status(201).json(newInteraction[0]);
    } catch (error) {
      console.error("Error creating interaction:", error);
      res.status(400).json({ error: "Failed to create interaction" });
    }
  });

  // NEW: Create note specifically for project (unified with client tracking)
  app.post("/api/projects/:projectId/notes", authenticateToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { subject, content, isImportant } = req.body;
      
      if (!subject) {
        return res.status(400).json({ error: "Subject is required" });
      }

      // Get the client ID from the project for unified tracking
      const project = await db
        .select({ clientId: projects.clientId })
        .from(projects)
        .where(eq(projects.id, parseInt(projectId)))
        .limit(1);
        
      if (!project[0]) {
        return res.status(404).json({ error: "Project not found" });
      }

      const newNote = await db
        .insert(interactions)
        .values({
          entityType: "project",
          entityId: parseInt(projectId),
          clientId: project[0].clientId, // Maintain client continuity
          projectId: parseInt(projectId),
          type: "note",
          direction: "outbound",
          subject,
          content,
          userId: (req as AuthRequest).user!.id,
          isImportant: isImportant || false,
          completedDate: new Date()
        })
        .returning();
      
      res.status(201).json(newNote[0]);
    } catch (error) {
      console.error("Error creating project note:", error);
      res.status(400).json({ error: "Failed to create project note" });
    }
  });
}