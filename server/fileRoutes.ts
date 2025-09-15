import express, { Request, Response } from "express";
import { authenticateToken, type AuthRequest } from "./middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { db } from "./db";
import { projectFiles, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = express.Router();

// Custom multer configurations for different file types
const deliveryChalanUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const projectId = req.params.projectId;
      const uploadPath = `uploads/delivery_chalans/project_${projectId}`;
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(4).toString('hex');
      const ext = path.extname(file.originalname);
      const baseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
      cb(null, `chalan_${timestamp}_${randomString}_${baseName}${ext}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed for delivery chalans"));
    }
  },
});

const manualQuoteUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const projectId = req.params.projectId;
      const uploadPath = `uploads/manual_quotes/project_${projectId}`;
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(4).toString('hex');
      const ext = path.extname(file.originalname);
      const baseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
      cb(null, `quote_${timestamp}_${randomString}_${baseName}${ext}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|xlsx|xls|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, Excel, and Word documents are allowed for manual quotes"));
    }
  },
});

// Upload delivery chalan
router.post('/projects/:projectId/files/delivery-chalan', authenticateToken, deliveryChalanUpload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify project exists and user has access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      // Clean up uploaded file if project doesn't exist
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save file record to database
    const [savedFile] = await db.insert(projectFiles).values({
      projectId: projectId,
      clientId: project.clientId,
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      category: 'delivery_chalan',
      uploadedBy: req.user!.id,
    }).returning();

    res.status(201).json({
      message: 'Delivery chalan uploaded successfully',
      file: {
        id: savedFile.id,
        fileName: savedFile.fileName,
        originalName: savedFile.originalName,
        fileSize: savedFile.fileSize,
        category: savedFile.category,
        uploadedAt: savedFile.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading delivery chalan:', error);
    
    // Clean up file if database save failed
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload manual quote
router.post('/projects/:projectId/files/manual-quote', authenticateToken, manualQuoteUpload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const file = req.file;
    const description = req.body.description || '';
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify project exists and user has access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      // Clean up uploaded file if project doesn't exist
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save file record to database
    const [savedFile] = await db.insert(projectFiles).values({
      projectId: projectId,
      clientId: project.clientId,
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      category: 'manual_quote',
      description: description,
      uploadedBy: req.user!.id,
    }).returning();

    res.status(201).json({
      message: 'Manual quote uploaded successfully',
      file: {
        id: savedFile.id,
        fileName: savedFile.fileName,
        originalName: savedFile.originalName,
        fileSize: savedFile.fileSize,
        category: savedFile.category,
        description: savedFile.description,
        uploadedAt: savedFile.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading manual quote:', error);
    
    // Clean up file if database save failed
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project files by category
router.get('/projects/:projectId/files', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const fileType = req.query.type as string; // 'delivery_chalan', 'manual_quote', or 'all'
    
    // Verify project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let whereClause;
    if (fileType && fileType !== 'all') {
      whereClause = and(eq(projectFiles.projectId, projectId), eq(projectFiles.category, fileType));
    } else {
      whereClause = eq(projectFiles.projectId, projectId);
    }

    const files = await db.select({
      id: projectFiles.id,
      fileName: projectFiles.fileName,
      originalName: projectFiles.originalName,
      fileSize: projectFiles.fileSize,
      mimeType: projectFiles.mimeType,
      category: projectFiles.category,
      description: projectFiles.description,
      comment: projectFiles.comment,
      uploadedBy: projectFiles.uploadedBy,
      uploadedAt: projectFiles.createdAt,
      isPublic: projectFiles.isPublic
    }).from(projectFiles).where(whereClause).orderBy(projectFiles.createdAt);

    res.json({ files });

  } catch (error) {
    console.error('Error fetching project files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download file
router.get('/files/:fileId/download', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId);
    
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, fileId));
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete file
router.delete('/projects/:projectId/files/:fileId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const fileId = parseInt(req.params.fileId);
    
    // Verify file exists and belongs to project
    const [file] = await db.select().from(projectFiles).where(
      and(eq(projectFiles.id, fileId), eq(projectFiles.projectId, projectId))
    );
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check user permissions (only uploader, admin, or manager can delete)
    const canDelete = req.user!.role === 'admin' || 
                     req.user!.role === 'manager' || 
                     file.uploadedBy === req.user!.id;
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete file from disk
    try {
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file from disk:', deleteError);
      // Continue with database deletion even if file removal fails
    }

    // Delete from database
    await db.delete(projectFiles).where(eq(projectFiles.id, fileId));

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get file preview/metadata
router.get('/files/:fileId/info', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(req.params.fileId);
    
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, fileId));
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file exists on disk
    const fileExists = fs.existsSync(file.filePath);

    res.json({
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      category: file.category,
      description: file.description,
      comment: file.comment,
      uploadedAt: file.createdAt,
      fileExists
    });

  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// General file upload configuration
const generalFileUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const projectId = req.params.projectId;
      const uploadPath = `uploads/general/project_${projectId}`;
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(4).toString('hex');
      const ext = path.extname(file.originalname);
      const baseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
      cb(null, `general_${timestamp}_${randomString}_${baseName}${ext}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|xlsx|xls|doc|docx|txt|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("File type not supported for general uploads"));
    }
  },
});

// Multiple file upload for delivery chalans
router.post('/projects/:projectId/files/delivery-chalans/multiple', authenticateToken, deliveryChalanUpload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Verify project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      // Clean up uploaded files if project doesn't exist
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Error cleaning up file:', error);
        }
      });
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save all files to database
    const savedFiles = [];
    for (const file of files) {
      try {
        const [savedFile] = await db.insert(projectFiles).values({
          projectId: projectId,
          clientId: project.clientId,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          category: 'delivery_chalan',
          uploadedBy: req.user!.id,
        }).returning();
        
        savedFiles.push(savedFile);
      } catch (error) {
        console.error('Error saving file to database:', error);
        // Clean up file if database save failed
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
    }

    res.status(201).json({
      message: `${savedFiles.length} delivery chalan files uploaded successfully`,
      files: savedFiles.map(file => ({
        id: file.id,
        fileName: file.fileName,
        originalName: file.originalName,
        fileSize: file.fileSize,
        category: file.category,
        uploadedAt: file.createdAt
      }))
    });

  } catch (error) {
    console.error('Error uploading multiple delivery chalans:', error);
    
    // Clean up files if error occurred
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Multiple file upload for manual quotes
router.post('/projects/:projectId/files/manual-quotes/multiple', authenticateToken, manualQuoteUpload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const files = req.files as Express.Multer.File[];
    const description = req.body.description || '';
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Verify project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      // Clean up uploaded files if project doesn't exist
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Error cleaning up file:', error);
        }
      });
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save all files to database
    const savedFiles = [];
    for (const file of files) {
      try {
        const [savedFile] = await db.insert(projectFiles).values({
          projectId: projectId,
          clientId: project.clientId,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          category: 'manual_quote',
          description: description,
          uploadedBy: req.user!.id,
        }).returning();
        
        savedFiles.push(savedFile);
      } catch (error) {
        console.error('Error saving file to database:', error);
        // Clean up file if database save failed
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
    }

    res.status(201).json({
      message: `${savedFiles.length} manual quote files uploaded successfully`,
      files: savedFiles.map(file => ({
        id: file.id,
        fileName: file.fileName,
        originalName: file.originalName,
        fileSize: file.fileSize,
        category: file.category,
        description: file.description,
        uploadedAt: file.createdAt
      }))
    });

  } catch (error) {
    console.error('Error uploading multiple manual quotes:', error);
    
    // Clean up files if error occurred
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Multiple file upload for general files
router.post('/projects/:projectId/files/general/multiple', authenticateToken, generalFileUpload.array('files', 20), async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const files = req.files as Express.Multer.File[];
    const description = req.body.description || '';
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Verify project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      // Clean up uploaded files if project doesn't exist
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Error cleaning up file:', error);
        }
      });
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save all files to database
    const savedFiles = [];
    for (const file of files) {
      try {
        const [savedFile] = await db.insert(projectFiles).values({
          projectId: projectId,
          clientId: project.clientId,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          category: 'general',
          description: description,
          uploadedBy: req.user!.id,
        }).returning();
        
        savedFiles.push(savedFile);
      } catch (error) {
        console.error('Error saving file to database:', error);
        // Clean up file if database save failed
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
    }

    res.status(201).json({
      message: `${savedFiles.length} general files uploaded successfully`,
      files: savedFiles.map(file => ({
        id: file.id,
        fileName: file.fileName,
        originalName: file.originalName,
        fileSize: file.fileSize,
        category: file.category,
        description: file.description,
        uploadedAt: file.createdAt
      }))
    });

  } catch (error) {
    console.error('Error uploading multiple general files:', error);
    
    // Clean up files if error occurred
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;