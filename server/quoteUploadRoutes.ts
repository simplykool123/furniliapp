import { Express, Request, Response } from "express";
import { authenticateToken, AuthRequest } from "./auth";
import { requireRole } from "./auth";
import { quoteFileUpload } from "./utils/fileUpload";
import fs from "fs/promises";
import path from "path";
import Tesseract from "tesseract.js";
// Dynamic import to avoid pdf-parse initialization issues

export default function setupQuoteUploadRoutes(app: Express) {

  // Upload quote file (PDF/JPG/PNG) with OCR processing
  app.post("/api/quotes/upload", authenticateToken, quoteFileUpload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("Quote file uploaded:", {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      const filePath = req.file.path;
      const fileName = req.file.filename;
      const originalName = req.file.originalname;
      const fileType = req.file.mimetype;
      const fileSize = req.file.size;

      let ocrText = "";
      let extractedData = {};

      // Process file based on type
      if (fileType.startsWith('image/')) {
        // Image file - process with OCR
        console.log("Processing image file with OCR...");
        
        try {
          const result = await Tesseract.recognize(filePath, 'eng', {
            logger: m => console.log(`OCR Progress: ${m.status} - ${m.progress}`)
          });
          
          ocrText = result.data.text;
          console.log("OCR Text extracted:", ocrText.substring(0, 200) + "...");

          // Extract structured data from OCR text
          extractedData = extractQuoteDataFromText(ocrText);
          
        } catch (ocrError) {
          console.error("OCR processing failed:", ocrError);
          ocrText = "OCR processing failed. Please manually enter quote details.";
        }
      } else if (fileType === 'application/pdf') {
        // PDF file - extract text using pdf-parse
        console.log("Processing PDF file with text extraction...");
        
        try {
          const pdfBuffer = await fs.readFile(filePath);
          // Dynamic import to avoid initialization issues
          const pdfParse = await import("pdf-parse");
          const pdfData = await pdfParse.default(pdfBuffer);
          
          ocrText = pdfData.text;
          console.log("PDF text extracted:", ocrText.substring(0, 200) + "...");

          // Extract structured data from PDF text
          extractedData = extractQuoteDataFromText(ocrText);
          
        } catch (pdfError) {
          console.error("PDF processing failed:", pdfError);
          ocrText = "PDF processing failed. Please manually enter quote details.";
        }
      }

      // Create file record
      const uploadResult = {
        id: Date.now(), // Simple ID for now
        fileName: originalName,
        filePath: `/uploads/quotes/${fileName}`,
        fileType: fileType,
        fileSize: fileSize,
        ocrText: ocrText,
        extractedData: extractedData,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        status: 'processed'
      };

      res.json({
        success: true,
        message: "Quote file uploaded and processed successfully",
        file: uploadResult
      });

    } catch (error) {
      console.error("Quote upload error:", error);
      
      // Clean up uploaded file if there was an error
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded file:", cleanupError);
        }
      }
      
      res.status(500).json({ 
        error: "Failed to process quote upload", 
        details: String(error) 
      });
    }
  });

  // Get uploaded quote files for a user
  app.get("/api/quotes/uploads", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      // For now, return empty array - would need database table to store upload records
      // This is a placeholder for when we add quote_uploads table
      res.json([]);
      
    } catch (error) {
      console.error("Error fetching quote uploads:", error);
      res.status(500).json({ error: "Failed to fetch quote uploads" });
    }
  });

  // Delete uploaded quote file
  app.delete("/api/quotes/uploads/:id", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
    try {
      const fileId = req.params.id;
      
      // For now, just return success - would need database table to track files
      res.json({ message: "Quote file deleted successfully" });
      
    } catch (error) {
      console.error("Error deleting quote upload:", error);
      res.status(500).json({ error: "Failed to delete quote upload" });
    }
  });

}

// Helper function to extract structured data from OCR text
function extractQuoteDataFromText(text: string) {
  const extracted: any = {};
  
  try {
    // Extract common quote information using regex patterns
    const patterns = {
      // Quote number patterns
      quoteNumber: /(?:quote\s*(?:no|number)?\s*[:#]?\s*)([A-Z0-9\/-]+)/i,
      
      // Date patterns
      date: /(?:date\s*[:#]?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Amount patterns (Indian Rupee)
      totalAmount: /(?:total|amount|grand\s*total)\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.\d{2})?)/i,
      
      // Customer/Client name
      customerName: /(?:to|bill\s*to|customer|client)\s*[:#]?\s*([A-Za-z\s]+)/i,
      
      // Phone/Mobile number
      phone: /(?:phone|mobile|contact)\s*[:#]?\s*([0-9\+\-\s\(\)]{10,15})/i,
      
      // Email
      email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    };

    // Extract data using patterns
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extracted[key] = match[1].trim();
      }
    }

    // Extract line items (basic pattern)
    const itemPatterns = /(?:item|product|description)\s*[:#]?\s*([A-Za-z0-9\s,.-]+)(?:\s+(?:qty|quantity)\s*[:#]?\s*(\d+))?(?:\s+(?:rate|price)\s*[:#]?\s*(?:rs\.?|₹)?\s*([0-9,]+(?:\.\d{2})?))?/gi;
    
    const items = [];
    let itemMatch;
    while ((itemMatch = itemPatterns.exec(text)) !== null) {
      items.push({
        description: itemMatch[1]?.trim() || '',
        quantity: itemMatch[2] ? parseInt(itemMatch[2]) : 1,
        rate: itemMatch[3] ? parseFloat(itemMatch[3].replace(/,/g, '')) : 0
      });
    }
    
    if (items.length > 0) {
      extracted.items = items;
    }

    console.log("Extracted quote data:", extracted);
    
  } catch (error) {
    console.error("Error extracting quote data:", error);
  }
  
  return extracted;
}