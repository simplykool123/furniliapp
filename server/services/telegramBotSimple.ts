import TelegramBot from 'node-telegram-bot-api';
import { Pool } from 'pg';
import { telegramUserSessions, projects, clients, projectFiles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Force use exact same connection as main app
const SUPABASE_DATABASE_URL = "postgresql://postgres.qopynbelowyghyciuofo:Furnili@123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const botPool = new Pool({ 
  connectionString: SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10
});

// In-memory user tracking (simple solution)
const userModes = new Map<string, string>();
const userProjects = new Map<string, number>();
const userStates = new Map<string, string>(); // Track user authentication state

// No session timeouts - permanent authentication after first verification

export class FurniliTelegramBot {
  private bot: TelegramBot;
  
  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupHandlers();
    console.log('🤖 Furnili Telegram Bot initialized - permanent authentication');
  }

  private setupHandlers() {
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/projects/, (msg) => this.handleProjects(msg));
    this.bot.onText(/\/select (.+)/, (msg, match) => this.handleSelectProject(msg, match));
    this.bot.onText(/\/recce/, (msg) => this.handleCategorySelection(msg, 'recce'));
    this.bot.onText(/\/design/, (msg) => this.handleCategorySelection(msg, 'design'));
    this.bot.onText(/\/drawings/, (msg) => this.handleCategorySelection(msg, 'drawings'));
    this.bot.onText(/\/notes/, (msg) => this.handleCategorySelection(msg, 'notes'));
    this.bot.on('photo', (msg) => this.handlePhoto(msg));
    this.bot.on('document', (msg) => this.handleDocument(msg));
    // Handle simple number inputs for project selection and phone authentication  
    this.bot.on('message', (msg) => this.handleMessage(msg));
  }

  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    // Check if user is already authenticated
    const isAuthenticated = await this.checkUserAuthentication(userId);
    
    if (isAuthenticated) {
      await this.createOrUpdateSession(userId, msg.from?.username, msg.from?.first_name);
      
      const welcomeMessage = `🏠 Welcome back to Furnili Assistant!

I'll help you organize your project files efficiently.

📋 Commands:
• /projects - View all active projects

Quick Start:
1. Type /projects
2. Select with /select [number]
3. Choose category and upload!`;

      await this.bot.sendMessage(chatId, welcomeMessage);
    } else {
      // Request phone number for authentication
      userStates.set(userId, 'awaiting_phone');
      await this.bot.sendMessage(chatId, `🔐 Welcome to Furnili Assistant!

For security, I need to verify your phone number.

Please share your registered phone number (10 digits):
Example: 9876543210`);
    }
  }

  private async checkUserAuthentication(telegramUserId: string): Promise<boolean> {
    try {
      const client = await botPool.connect();
      try {
        // Check if telegram user is linked to a system user via phone
        const result = await client.query(`
          SELECT tus.*, u.id as system_user_id, u.name, u.phone 
          FROM telegram_user_sessions tus
          LEFT JOIN users u ON tus.phone_number = u.phone
          WHERE tus.telegram_user_id = $1 AND tus.phone_number IS NOT NULL AND u.phone IS NOT NULL
        `, [telegramUserId]);

        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error checking user authentication:', error);
      return false;
    }
  }

  private async authenticateUserByPhone(telegramUserId: string, phoneNumber: string): Promise<boolean> {
    try {
      const client = await botPool.connect();
      try {
        // Check if phone exists in users table
        const userResult = await client.query(`
          SELECT id, name, phone FROM users WHERE phone = $1 AND is_active = true
        `, [phoneNumber]);

        if (userResult.rows.length === 0) {
          return false; // Phone not found
        }

        const user = userResult.rows[0];

        // Update telegram session with phone number and link to system user
        await client.query(`
          UPDATE telegram_user_sessions 
          SET phone_number = $1, system_user_id = $2, updated_at = NOW()
          WHERE telegram_user_id = $3
        `, [phoneNumber, user.id, telegramUserId]);

        console.log(`✅ User ${telegramUserId} authenticated with phone ${phoneNumber}, linked to system user ${user.id} (${user.name})`);
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error authenticating user by phone:', error);
      return false;
    }
  }

  private async getSystemUserInfo(telegramUserId: string): Promise<{id: number, name: string} | null> {
    try {
      const client = await botPool.connect();
      try {
        const result = await client.query(`
          SELECT u.id, u.name 
          FROM telegram_user_sessions tus
          JOIN users u ON tus.system_user_id = u.id
          WHERE tus.telegram_user_id = $1
        `, [telegramUserId]);

        return result.rows.length > 0 ? result.rows[0] : null;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting system user info:', error);
      return null;
    }
  }

  private async handleProjects(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    // Check authentication before proceeding
    const isAuthenticated = await this.checkUserAuthentication(userId);
    if (!isAuthenticated) {
      await this.bot.sendMessage(chatId, "🔐 Please authenticate first with /start command.");
      return;
    }



    try {
      // Use direct database connection like other methods
      const client = await botPool.connect();
      try {
        const result = await client.query(`
          SELECT p.id, p.code, p.name, p.stage, c.name as client_name
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id
          WHERE p.is_active = true 
            AND p.stage NOT IN ('completed', 'handover', 'lost')
          ORDER BY p.created_at
        `);
        const projectList = result.rows;

      if (projectList.length === 0) {
        await this.bot.sendMessage(chatId, "📋 No active projects found.");
        return;
      }

        let message = "📋 Active Projects (ongoing):\n\n";
        projectList.forEach((project, index) => {
          message += `${index + 1}. ${project.code} - ${project.name}\n`;
          message += `   Client: ${project.client_name || 'Unknown'}\n`;
          message += `   Stage: ${project.stage}\n\n`;
        });
        message += "Reply with the Number to choose the project";

        await this.bot.sendMessage(chatId, message);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      await this.bot.sendMessage(chatId, "Error fetching projects. Please try again.");
    }
  }


  private async handleSelectProject(msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !match) return;

    const projectNumber = parseInt(match[1]);

    try {
      // Use dedicated bot pool with exact same connection
      const client = await botPool.connect();
      
      try {
        const projectListResult = await client.query(`
          SELECT p.id, p.code, p.name, p.client_id, c.name as client_name
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id
          WHERE p.is_active = true 
            AND p.stage NOT IN ('completed', 'handover', 'lost')
          ORDER BY p.created_at
        `);
        const projectList = projectListResult.rows;

        if (projectNumber < 1 || projectNumber > projectList.length) {
          await this.bot.sendMessage(chatId, `Invalid project number. Select between 1 and ${projectList.length}.`);
          return;
        }

        const selectedProject = projectList[projectNumber - 1];

        // Store selected project for this user
        userProjects.set(userId, selectedProject.id);
        
        // Skip session update - just log the selection  
        console.log(`✅ User ${userId} selected project: ${selectedProject.code} (ID: ${selectedProject.id})`);

        const message = `✅ Project Selected: ${selectedProject.code} - ${selectedProject.name}
Client: ${selectedProject.client_name || 'Unknown'}

📁 Choose upload category:
• /recce - Site photos with measurements
• /design - Design files
• /drawings - Technical drawings
• /notes - Text notes

Send the command and start uploading!`;

        await this.bot.sendMessage(chatId, message);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error selecting project:', error);
      await this.bot.sendMessage(chatId, "Error selecting project. Please try again.");
    }
  }

  // Handle simple text messages for project selection and notes
  private async handleMessage(msg: TelegramBot.Message) {
    // Skip if it's a command or already handled by other handlers
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || msg.photo || msg.document) return;

    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    // Check if user is awaiting phone authentication
    const currentState = userStates.get(userId);
    if (currentState === 'awaiting_phone') {
      await this.handlePhoneAuthentication(msg, text);
      return;
    }

    // Check authentication before proceeding with normal operations
    const isAuthenticated = await this.checkUserAuthentication(userId);
    if (!isAuthenticated) {
      await this.bot.sendMessage(chatId, "🔐 Please authenticate first with /start command.");
      return;
    }



    // Check if it's a simple number for project selection
    const projectNumber = parseInt(text);
    if (!isNaN(projectNumber)) {
      try {
        // Use dedicated bot pool with exact same connection
        const client = await botPool.connect();
        
        try {
          // Skip session check - just handle number as project selection
          console.log(`📱 User ${userId} typed number: ${projectNumber}`);
          
          // Simulate /select command for any number input
          await this.handleSelectProject(msg, [text, projectNumber.toString()]);
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
      return;
    }

    // Handle text notes if user is in notes mode
    const currentMode = userModes.get(userId);
    if (currentMode === 'notes') {
      await this.handleTextNote(msg, text);
    }
  }

  private async handlePhoneAuthentication(msg: TelegramBot.Message, phoneText: string) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneText.replace(/\D/g, '');
    
    // Validate phone number format (10-15 digits)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      await this.bot.sendMessage(chatId, `❌ Invalid phone number format. Please enter 10-15 digits only:
Example: 9876543210`);
      return;
    }

    console.log(`🔐 Authenticating user ${userId} with phone ${cleanPhone}`);

    // Try to authenticate user by phone
    const isAuthenticated = await this.authenticateUserByPhone(userId, cleanPhone);
    
    if (isAuthenticated) {
      // Create session record after successful authentication
      await this.createOrUpdateSession(userId, msg.from?.username, msg.from?.first_name);
      
      const userInfo = await this.getSystemUserInfo(userId);
      userStates.delete(userId); // Clear authentication state
      
      await this.bot.sendMessage(chatId, `✅ Welcome ${userInfo?.name || 'User'}!

🏠 You are now authenticated and can access Furnili Assistant.

📋 Commands:
• /projects - View all active projects

Quick Start:
1. Type /projects
2. Select with /select [number]
3. Choose category and upload!`);
    } else {
      await this.bot.sendMessage(chatId, `❌ Phone number ${cleanPhone} not found in our system.

Please contact the admin (9823633833) to add your phone number to the system.

Once added, please try /start again.`);
    }
  }

  private async handleTextNote(msg: TelegramBot.Message, noteText: string) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    try {
      const projectId = userProjects.get(userId) || 1;
      const systemUser = await this.getSystemUserInfo(userId);
      console.log(`📝 User ${userId} (${systemUser?.name}) saving text note to project ${projectId} Notes tab`);

      // Generate a title from the first few words of the note
      const title = noteText.length > 50 
        ? noteText.substring(0, 50).trim() + "..." 
        : noteText.trim();

      // Save text note to project_logs table (Notes tab)
      const client = await botPool.connect();
      try {
        await client.query(
          'INSERT INTO project_logs (project_id, log_type, title, description, created_by, attachments, is_important) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            projectId,
            'note', // logType for notes
            title, // Generated title
            noteText, // Full note content in description
            systemUser?.id || 7, // Use actual system user ID
            [], // Empty attachments array
            false // Not important by default
          ]
        );
      } finally {
        client.release();
      }

      await this.bot.sendMessage(chatId, `✅ Note saved to Notes tab!\n"${title}"`);
    } catch (error) {
      console.error('Error handling text note:', error);
      await this.bot.sendMessage(chatId, "Error saving note. Please try again.");
    }
  }

  private async handleCategorySelection(msg: TelegramBot.Message, category: string) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    // Check authentication and session
    const isAuthenticated = await this.checkUserAuthentication(userId);
    if (!isAuthenticated) {
      await this.bot.sendMessage(chatId, "🔐 Please authenticate first with /start command.");
      return;
    }






    try {
      // Store user's current mode in memory
      userModes.set(userId, category);
      console.log(`📁 User ${userId} selected category: ${category}`);

      const messages: { [key: string]: string } = {
        recce: "📷 Recce Mode Active\n\nSend site photos with measurements.",
        design: "🎨 Design Mode Active\n\nSend design files and concepts.",
        drawings: "📐 Drawings Mode Active\n\nSend technical drawings and plans.",
        notes: "📝 Notes Mode Active\n\nSend text notes or attachments."
      };

      await this.bot.sendMessage(chatId, messages[category] || "Upload mode active. Send your files!");
      
    } catch (error) {
      console.error('Error handling category:', error);
      await this.bot.sendMessage(chatId, "Something went wrong. Please try again.");
    }
  }

  private async handlePhoto(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !msg.photo) return;

    // Check authentication and session
    const isAuthenticated = await this.checkUserAuthentication(userId);
    if (!isAuthenticated) {
      await this.bot.sendMessage(chatId, "🔐 Please authenticate first with /start command.");
      return;
    }






    try {
      const projectId = userProjects.get(userId) || 1;
      const photo = msg.photo[msg.photo.length - 1];
      const caption = msg.caption || '';
      const currentMode = userModes.get(userId) || 'recce';

      console.log(`📸 User ${userId} uploading photo to project ${projectId}`);

      // Download and save photo locally
      const savedFile = await this.downloadFile(photo.file_id, 'photo', '.jpg');
      
      const client = await botPool.connect();
      try {
        // If user is in notes mode, save photo to Notes tab (project_logs)
        if (currentMode === 'notes') {
          console.log(`📝 User ${userId} saving photo to project ${projectId} Notes tab`);
          
          // Get system user info for proper attribution
          const systemUser = await this.getSystemUserInfo(userId);
          
          // Create attachment object for the photo
          const attachment = {
            fileName: savedFile.fileName,
            originalName: `telegram_photo_${Date.now()}.jpg`,
            filePath: savedFile.filePath,
            fileSize: savedFile.fileSize,
            mimeType: 'image/jpeg',
            uploadedBy: systemUser?.id || 7,
            uploadedAt: new Date().toISOString()
          };

          const title = caption || `Photo attachment - ${new Date().toLocaleDateString()}`;
          const description = caption || 'Photo uploaded via Telegram';

          // Check if there's an existing note from the same user within the last 5 minutes
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const recentNote = await client.query(
            'SELECT id, attachments, title, description FROM project_logs WHERE project_id = $1 AND created_by = $2 AND log_type = $3 AND created_at > $4 ORDER BY created_at DESC LIMIT 1',
            [projectId, systemUser?.id || 7, 'note', fiveMinutesAgo]
          );

          if (recentNote.rows.length > 0) {
            // Append to existing note
            const existingNote = recentNote.rows[0];
            let existingAttachments = [];
            
            // Parse existing attachments if they exist
            if (existingNote.attachments && existingNote.attachments.length > 0) {
              try {
                // If it's a JSON string, parse it
                if (typeof existingNote.attachments === 'string') {
                  existingAttachments = JSON.parse(existingNote.attachments);
                } else if (Array.isArray(existingNote.attachments)) {
                  existingAttachments = existingNote.attachments;
                }
              } catch (e) {
                console.log('Error parsing existing attachments, creating new array');
                existingAttachments = [];
              }
            }
            
            const updatedAttachments = [...existingAttachments, attachment];

            // Update the existing note with the new attachment
            // Convert objects to JSON strings for PostgreSQL text array
            const attachmentStrings = updatedAttachments.map(att => 
              typeof att === 'object' ? JSON.stringify(att) : att
            );
            await client.query(
              'UPDATE project_logs SET attachments = $1 WHERE id = $2',
              [attachmentStrings, existingNote.id]
            );

            const attachmentCount = updatedAttachments.length;
            await this.bot.sendMessage(
              chatId, 
              `✅ Photo added to existing note! (${attachmentCount} images total)${caption ? `\nCaption: ${caption}` : ''}`
            );
          } else {
            // Create new note
            await client.query(
              'INSERT INTO project_logs (project_id, log_type, title, description, created_by, attachments, is_important) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [
                projectId,
                'note', // logType for notes
                title,
                description,
                systemUser?.id || 7, // Use actual system user ID
                [JSON.stringify(attachment)], // Photo attachment as PostgreSQL array
                false // Not important by default
              ]
            );

            await this.bot.sendMessage(chatId, `✅ Photo saved to Notes tab!${caption ? `\nCaption: ${caption}` : ''}`);
          }
        } else {
          // Save to Files tab (project_files) for other modes
          const category = this.mapCategory(currentMode);
          const systemUser = await this.getSystemUserInfo(userId);
          
          await client.query(
            'INSERT INTO project_files (project_id, client_id, file_name, original_name, file_path, file_size, mime_type, category, description, comment, uploaded_by, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [
              projectId,
              1, // default client
              savedFile.fileName,
              `telegram_photo_${Date.now()}.jpg`,
              savedFile.filePath,
              savedFile.fileSize,
              'image/jpeg',
              category, // Use correct category based on user mode
              'Uploaded via Telegram',
              caption,
              systemUser?.id || 7, // Use actual system user ID
              false
            ]
          );

          await this.bot.sendMessage(chatId, `✅ Photo saved to Files tab!${caption ? `\nComment: ${caption}` : ''}`);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error handling photo:', error);
      await this.bot.sendMessage(chatId, "Error saving photo. Please try again.");
    }
  }

  private async handleDocument(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !msg.document) return;

    try {
      const projectId = userProjects.get(userId) || 1;
      const document = msg.document;
      const caption = msg.caption || '';

      console.log(`📄 User ${userId} uploading document to project ${projectId}`);

      // Download and save document locally (LOCAL STORAGE per user requirements)  
      const ext = path.extname(document.file_name || '.file');
      const savedFile = await this.downloadFile(document.file_id, 'document', ext);

      // Get user's current mode to determine category
      const currentMode = userModes.get(userId) || 'notes';
      const category = this.mapCategory(currentMode);

      // Save document metadata to database using direct query
      const client = await botPool.connect();
      try {
        await client.query(
          'INSERT INTO project_files (project_id, client_id, file_name, original_name, file_path, file_size, mime_type, category, description, comment, uploaded_by, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [
            projectId,
            1, // default client
            savedFile.fileName,
            document.file_name || 'telegram_file',
            savedFile.filePath,
            document.file_size || 0,
            document.mime_type || 'application/octet-stream',
            category, // Use correct category based on user mode
            'Uploaded via Telegram',
            caption,
            7, // Use existing user ID
            false
          ]
        );
      } finally {
        client.release();
      }

      await this.bot.sendMessage(chatId, `✅ File "${document.file_name}" saved!${caption ? `\nComment: ${caption}` : ''}`);
    } catch (error) {
      console.error('Error handling document:', error);
      await this.bot.sendMessage(chatId, "Error saving document. Please try again.");
    }
  }

  private async downloadFile(fileId: string, type: string, extension: string) {
    const fileInfo = await this.bot.getFile(fileId);
    const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    const uniqueName = crypto.randomBytes(8).toString('hex');
    const fileName = `telegram_${type}_${uniqueName}${extension}`;
    const filePath = `uploads/projects/${fileName}`;

    // Ensure directory exists
    const uploadDir = path.dirname(filePath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Download file
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const stats = fs.statSync(filePath);
    
    return {
      fileName,
      filePath,
      fileSize: stats.size
    };
  }

  private async createOrUpdateSession(userId: string, username?: string, firstName?: string) {
    try {
      console.log(`🔍 Creating/updating session for user ${userId}`);
      
      // Use dedicated bot pool with exact same connection
      const client = await botPool.connect();
      
      try {
        // Check if session exists
        const existing = await client.query(
          'SELECT * FROM telegram_user_sessions WHERE telegram_user_id = $1 LIMIT 1',
          [userId]
        );

        if (existing.rows.length > 0) {
          console.log(`✅ Updating existing session for user ${userId}`);
          await client.query(
            'UPDATE telegram_user_sessions SET telegram_username = $2, telegram_first_name = $3, last_interaction = NOW(), updated_at = NOW() WHERE telegram_user_id = $1',
            [userId, username, firstName]
          );
        } else {
          console.log(`➕ Creating new session for user ${userId}`);
          await client.query(
            'INSERT INTO telegram_user_sessions (telegram_user_id, telegram_username, telegram_first_name, session_state, last_interaction) VALUES ($1, $2, $3, $4, NOW())',
            [userId, username, firstName, 'authenticated']
          );
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error managing session:', error);
    }
  }

  private mapCategory(category: string): string {
    const mapping: { [key: string]: string } = {
      'recce': 'photos',
      'design': 'design', 
      'drawings': 'drawings',
      'notes': 'notes'
    };
    return mapping[category] || 'general';
  }

  private getCategoryName(category: string): string {
    const names: { [key: string]: string } = {
      'recce': 'Recce Photos',
      'design': 'Design Files',
      'drawings': 'Drawings',
      'notes': 'Notes'
    };
    return names[category] || 'General';
  }


  public stop() {
    this.bot.stopPolling();
  }
}