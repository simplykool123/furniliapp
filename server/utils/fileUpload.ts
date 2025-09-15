import multer from "multer";
import path from "path";
import crypto from "crypto";

// Product image upload configuration with memory storage for object storage
export const productImageUpload = multer({
  storage: multer.memoryStorage(), // Use memory storage for object storage uploads
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Product image upload - File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = file.originalname ? allowedTypes.test(path.extname(file.originalname).toLowerCase()) : true;
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'  // Add webp support for pasted images
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && (extname || !file.originalname)) {
      console.log('Product image accepted by multer filter');
      return cb(null, true);
    } else {
      console.log('Product image rejected by multer filter - Invalid type');
      cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
    }
  },
});

// BOQ file upload configuration
export const boqFileUpload = multer({
  dest: "uploads/boq/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|xlsx|xls|png|jpg|jpeg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpg',
      'image/jpeg'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, Excel (.xlsx, .xls), and Image files (.png, .jpg) are allowed"));
    }
  },
});

// CSV/Excel file upload for bulk operations
export const csvFileUpload = multer({
  dest: "uploads/csv/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are allowed"));
    }
  },
});

// Project file upload configuration (for all project files)
export const projectFileUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/projects/');
    },
    filename: function (req, file, cb) {
      // Keep original filename or generate unique one
      const originalName = file.originalname || 'upload';
      const uniqueName = crypto.randomBytes(8).toString('hex');
      let ext = path.extname(originalName);
      
      // If no extension, derive from mimetype
      if (!ext) {
        switch (file.mimetype) {
          case 'image/jpeg':
            ext = '.jpg';
            break;
          case 'image/png':
            ext = '.png';
            break;
          case 'image/gif':
            ext = '.gif';
            break;
          case 'image/webp':
            ext = '.webp';
            break;
          case 'application/pdf':
            ext = '.pdf';
            break;
          default:
            ext = '.file';
        }
      }
      
      // Use original name if it exists, otherwise use unique name
      const baseName = originalName ? path.parse(originalName).name : uniqueName;
      cb(null, `${baseName}_${uniqueName}${ext}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Project file upload filter:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/;
    const extname = file.originalname ? allowedTypes.test(path.extname(file.originalname).toLowerCase()) : true;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype || extname || !file.originalname) {
      console.log('Project file accepted by multer filter');
      return cb(null, true);
    } else {
      console.log('Project file rejected by multer filter - Invalid type');
      cb(new Error("File type not allowed for project files"));
    }
  },
});

// Receipt image upload for petty cash (single receipt)
export const receiptImageUpload = multer({
  dest: "uploads/receipts/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer file filter - File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'  // Add webp support for pasted images
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype || extname) {
      console.log('File accepted by multer filter');
      return cb(null, true);
    } else {
      console.log('File rejected by multer filter - Invalid type');
      cb(new Error("Only image files are allowed for receipts"));
    }
  },
});

// Multiple image upload for petty cash (receipt, bill, material)
export const pettyCashMultipleImageUpload = multer({
  dest: "uploads/receipts/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = file.originalname ? allowedTypes.test(path.extname(file.originalname).toLowerCase()) : true;
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'  // Add webp support for pasted images
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && (extname || !file.originalname)) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for petty cash images"));
    }
  },
});

// Quote File Upload Configuration (PDF/JPG/PNG with OCR support)
export const quoteFileUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/quotes/');
    },
    filename: function (req, file, cb) {
      const originalName = file.originalname || 'quote';
      const uniqueName = crypto.randomBytes(8).toString('hex');
      let ext = path.extname(originalName);
      
      // If no extension, derive from mimetype
      if (!ext) {
        switch (file.mimetype) {
          case 'image/jpeg':
            ext = '.jpg';
            break;
          case 'image/png':
            ext = '.png';
            break;
          case 'application/pdf':
            ext = '.pdf';
            break;
          default:
            ext = '.file';
        }
      }
      
      const baseName = originalName ? path.parse(originalName).name : 'quote';
      cb(null, `${baseName}_${uniqueName}${ext}`);
    }
  }),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for quote files
  },
  fileFilter: (req, file, cb) => {
    console.log('Quote file upload filter:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = file.originalname ? allowedTypes.test(path.extname(file.originalname).toLowerCase()) : true;
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png',
      'application/pdf'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && (extname || !file.originalname)) {
      console.log('Quote file accepted by multer filter');
      return cb(null, true);
    } else {
      console.log('Quote file rejected by multer filter - Invalid type');
      cb(new Error("Only PDF, JPG, and PNG files are allowed for quote uploads"));
    }
  },
});