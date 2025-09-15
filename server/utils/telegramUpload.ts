import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Ensure uploads/telegram directory exists
const uploadDir = 'uploads/telegram';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const telegramFileUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/telegram/');
    },
    filename: function (req, file, cb) {
      // Generate unique filename for telegram uploads
      const uniqueName = crypto.randomBytes(8).toString('hex');
      let ext = path.extname(file.originalname);
      
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
      
      const baseName = file.originalname ? path.parse(file.originalname).name : 'telegram_file';
      cb(null, `${baseName}_${uniqueName}${ext}`);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for Telegram files
  },
  fileFilter: (req, file, cb) => {
    // Allow most common file types for Telegram uploads
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|mp4|mov|avi/;
    const extname = file.originalname ? allowedTypes.test(path.extname(file.originalname).toLowerCase()) : true;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'video/mp4', 'video/quicktime', 'video/x-msvideo'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype || extname || !file.originalname) {
      return cb(null, true);
    } else {
      cb(new Error("File type not allowed for Telegram uploads"));
    }
  },
});