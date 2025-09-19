import TelegramBot from 'node-telegram-bot-api';
import { db } from '../db.js';
import { telegramUserSessions, projects, clients, projectFiles, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ProjectWithClient {
  id: number;
  code: string;
  name: string;
  stage: string;
  clientId: number;
  clientName: string | null;
  clientMobile: string | null;
}

export interface TelegramBotSettings {
  enabled: boolean;
  token?: string;
}

export class FurniliTelegramBot {
  private bot: TelegramBot;
  private token: string;
  
  constructor(token: string) {
    this.token = token;
    this.bot = new TelegramBot(token, { polling: true });
    this.setupHandlers();
  }

  private setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    
    // Projects command
    this.bot.onText(/\/projects/, (msg) => this.handleProjects(msg));
    
    // Select project command
    this.bot.onText(/\/select (.+)/, (msg, match) => this.handleSelectProject(msg, match));
    
    // Category selection commands
    this.bot.onText(/\/recce/, (msg) => this.handleCategorySelection(msg, 'recce'));
    this.bot.onText(/\/design/, (msg) => this.handleCategorySelection(msg, 'design'));
    this.bot.onText(/\/drawings/, (msg) => this.handleCategorySelection(msg, 'drawings'));
    this.bot.onText(/\/notes/, (msg) => this.handleCategorySelection(msg, 'notes'));
    
    // Handle photo uploads
    this.bot.on('photo', (msg) => this.handlePhoto(msg));
    
    // Handle document uploads
    this.bot.on('document', (msg) => this.handleDocument(msg));
    
    // Handle text messages (for notes and comments)
    this.bot.on('message', (msg) => this.handleTextMessage(msg));
  }

  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    const username = msg.from?.username;
    const firstName = msg.from?.first_name;

    if (!userId) return;

    // Create or update user session
    await this.createOrUpdateSession(userId, username, firstName);

    const welcomeMessage = `🏠 Welcome to Furnili Assistant!

I'll help you organize your project files efficiently. Here's what I can do:

📋 *Commands:*
• /projects - View all active projects
• /select [number] - Select a project to work with

📁 *File Categories:*
• /recce - Upload site recce photos with measurements
• /design - Upload design files and concepts
• /drawings - Upload technical drawings and plans  
• /notes - Add text notes with attachments

🚀 *Quick Start:*
1. Type /projects to see available projects
2. Select your project with /select [number]
3. Choose a category and start uploading!

All your uploads will be automatically organized in the Furnili dashboard by project and category.`;

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  }

  private async handleProjects(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    try {
      // Get all active projects with client info
      const projectList = await db
        .select({
          id: projects.id,
          code: projects.code,
          name: projects.name,
          stage: projects.stage,
          clientId: projects.clientId,
          clientName: clients.name,
          clientMobile: clients.mobile
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(eq(projects.isActive, true))
        .orderBy(projects.createdAt);

      if (projectList.length === 0) {
        await this.bot.sendMessage(chatId, "No active projects found. Please contact admin to create projects.");
        return;
      }

      let projectMessage = "📋 *Active Projects:*\\n\\n";
      projectList.forEach((project, index: number) => {
        projectMessage += `${index + 1}. *${project.code}* - ${project.name}\\n`;
        projectMessage += `   Client: ${project.clientName || 'Unknown'}\\n`;
        projectMessage += `   Stage: ${project.stage}\\n\\n`;
      });

      projectMessage += "💡 Reply with `/select [number]` to choose a project\\n";
      projectMessage += "Example: `/select 1`";

      await this.bot.sendMessage(chatId, projectMessage, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error fetching projects:', error);
      await this.bot.sendMessage(chatId, "Sorry, I couldn't fetch the projects. Please try again later.");
    }
  }

  private async handleSelectProject(msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    
    if (!userId || !match) return;

    const projectNumber = parseInt(match[1]);

    try {
      // Get all active projects
      const projectList = await db
        .select({
          id: projects.id,
          code: projects.code,
          name: projects.name,
          clientId: projects.clientId,
          clientName: clients.name
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(eq(projects.isActive, true))
        .orderBy(projects.createdAt);

      if (projectNumber < 1 || projectNumber > projectList.length) {
        await this.bot.sendMessage(chatId, `Invalid project number. Please select between 1 and ${projectList.length}.`);
        return;
      }

      const selectedProject = projectList[projectNumber - 1];

      // Update user session with selected project
      await db
        .update(telegramUserSessions)
        .set({
          activeProjectId: selectedProject.id,
          activeClientId: selectedProject.clientId,
          sessionState: 'project_selected',
          lastInteraction: new Date(),
          updatedAt: new Date()
        })
        .where(eq(telegramUserSessions.telegramUserId, userId));

      const successMessage = `✅ Project Selected: *${selectedProject.code}* - ${selectedProject.name}\\nClient: ${selectedProject.clientName || 'Unknown'}\\n\\n📁 *Now choose what to upload:*\\n• /recce - Site recce photos with measurements\\n• /design - Design files and concepts\\n• /drawings - Technical drawings and plans\\n• /notes - Text notes with attachments\\n\\nJust send the command and start uploading files!`;

      await this.bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error selecting project:', error);
      await this.bot.sendMessage(chatId, "Sorry, I couldn't select the project. Please try again.");
    }
  }

  private async handleCategorySelection(msg: TelegramBot.Message, category: string) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    
    if (!userId) return;

    try {
      // Check if user has selected a project
      const session = await db
        .select()
        .from(telegramUserSessions)
        .where(eq(telegramUserSessions.telegramUserId, userId))
        .limit(1);

      if (session.length === 0 || !session[0].activeProjectId) {
        await this.bot.sendMessage(chatId, "⚠️ Please select a project first using /projects then /select [number]");
        return;
      }

      // Update session state
      await db
        .update(telegramUserSessions)
        .set({
          sessionState: 'uploading',
          currentStep: category,
          lastInteraction: new Date(),
          updatedAt: new Date()
        })
        .where(eq(telegramUserSessions.telegramUserId, userId));

      const categoryMessages: { [key: string]: string } = {
        recce: "📷 *Recce Mode Active*\\n\\nSend photos of the site with measurements and descriptions. Each photo will be saved under the Recce category.",
        design: "🎨 *Design Mode Active*\\n\\nSend design files, concepts, and inspiration images. All files will be organized under Design category.", 
        drawings: "📐 *Drawings Mode Active*\\n\\nSend technical drawings, plans, and architectural files. Files will be saved under Drawings category.",
        notes: "📝 *Notes Mode Active*\\n\\nSend text notes with any attachments. Everything will be saved under Notes category."
      };

      await this.bot.sendMessage(chatId, categoryMessages[category], { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Error handling category selection:', error);
      await this.bot.sendMessage(chatId, "Sorry, something went wrong. Please try again.");
    }
  }

  private async handlePhoto(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    
    if (!userId || !msg.photo) return;

    try {
      // Get user session
      const session = await db
        .select()
        .from(telegramUserSessions)
        .where(eq(telegramUserSessions.telegramUserId, userId))
        .limit(1);

      if (session.length === 0 || !session[0].activeProjectId || session[0].sessionState !== 'uploading') {
        await this.bot.sendMessage(chatId, "⚠️ Please select a project and category first.\n\nUse /projects → /select [number] → /recce|/design|/drawings|/notes");
        return;
      }

      const userSession = session[0];
      const photo = msg.photo[msg.photo.length - 1]; // Get highest resolution
      const caption = msg.caption || '';

      // Download photo from Telegram (using token from database settings, not env)
      const fileInfo = await this.bot.getFile(photo.file_id);
      const downloadUrl = `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`;
      
      // Generate unique filename
      const uniqueName = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(fileInfo.file_path || '.jpg');
      const fileName = `telegram_photo_${uniqueName}${ext}`;
      const filePath = `uploads/telegram/${fileName}`;

      // Ensure upload directory exists
      const uploadDir = path.dirname(filePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Download and save file
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

      // Get file stats
      const stats = fs.statSync(filePath);

      // Save to project files database
      await db.insert(projectFiles).values({
        projectId: userSession.activeProjectId!,
        clientId: userSession.activeClientId,
        fileName,
        originalName: `telegram_photo_${Date.now()}.jpg`,
        filePath,
        fileSize: stats.size,
        mimeType: 'image/jpeg',
        category: this.mapCategoryToFileCategory(userSession.currentStep || 'general'),
        description: `Uploaded via Telegram`,
        comment: caption,
        uploadedBy: 1, // Default to admin user - you might want to create a mapping
        isPublic: false
      });

      await this.bot.sendMessage(chatId, `✅ Photo saved to ${this.getCategoryDisplayName(userSession.currentStep || 'general')} category!\n\n${caption ? `Comment: ${caption}` : ''}\n\nSend more files or use /projects to switch projects.`);

    } catch (error) {
      console.error('Error handling photo:', error);
      await this.bot.sendMessage(chatId, "Sorry, I couldn't save the photo. Please try again.");
    }
  }

  private async handleDocument(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    
    if (!userId || !msg.document) return;

    try {
      // Get user session
      const session = await db
        .select()
        .from(telegramUserSessions)
        .where(eq(telegramUserSessions.telegramUserId, userId))
        .limit(1);

      if (session.length === 0 || !session[0].activeProjectId || session[0].sessionState !== 'uploading') {
        await this.bot.sendMessage(chatId, "⚠️ Please select a project and category first.\n\nUse /projects → /select [number] → /recce|/design|/drawings|/notes");
        return;
      }

      const userSession = session[0];
      const document = msg.document;
      const caption = msg.caption || '';

      // Download document from Telegram (using token from bot instance)
      const fileInfo = await this.bot.getFile(document.file_id);
      const downloadUrl = `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`;
      
      // Generate filename preserving original name
      const uniqueName = crypto.randomBytes(8).toString('hex');
      const originalName = document.file_name || 'telegram_file';
      const ext = path.extname(originalName);
      const baseName = path.parse(originalName).name;
      const fileName = `${baseName}_${uniqueName}${ext}`;
      const filePath = `uploads/telegram/${fileName}`;

      // Ensure upload directory exists
      const uploadDir = path.dirname(filePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Download and save file
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

      // Save to project files database
      await db.insert(projectFiles).values({
        projectId: userSession.activeProjectId!,
        clientId: userSession.activeClientId,
        fileName,
        originalName,
        filePath,
        fileSize: document.file_size || 0,
        mimeType: document.mime_type || 'application/octet-stream',
        category: this.mapCategoryToFileCategory(userSession.currentStep || 'general'),
        description: `Uploaded via Telegram`,
        comment: caption,
        uploadedBy: 1, // Default to admin user
        isPublic: false
      });

      await this.bot.sendMessage(chatId, `✅ File "${originalName}" saved to ${this.getCategoryDisplayName(userSession.currentStep || 'general')} category!\n\n${caption ? `Comment: ${caption}` : ''}\n\nSend more files or use /projects to switch projects.`);

    } catch (error) {
      console.error('Error handling document:', error);
      await this.bot.sendMessage(chatId, "Sorry, I couldn't save the document. Please try again.");
    }
  }

  private async handleTextMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    
    if (!userId || !msg.text || msg.text.startsWith('/')) return;

    try {
      // Get user session
      const session = await db
        .select()
        .from(telegramUserSessions)
        .where(eq(telegramUserSessions.telegramUserId, userId))
        .limit(1);

      if (session.length === 0 || !session[0].activeProjectId) {
        return; // Don't respond to random text if no project selected
      }

      const userSession = session[0];

      if (userSession.sessionState === 'uploading' && userSession.currentStep === 'notes') {
        // Save text as a note
        const fileName = `note_${crypto.randomBytes(4).toString('hex')}.txt`;
        const filePath = `uploads/telegram/${fileName}`;

        // Ensure upload directory exists
        const uploadDir = path.dirname(filePath);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Save text to file
        fs.writeFileSync(filePath, msg.text);
        const stats = fs.statSync(filePath);

        // Save to project files database
        await db.insert(projectFiles).values({
          projectId: userSession.activeProjectId!,
          clientId: userSession.activeClientId,
          fileName,
          originalName: `Note_${new Date().toISOString().slice(0, 10)}.txt`,
          filePath,
          fileSize: stats.size,
          mimeType: 'text/plain',
          category: 'notes',
          description: `Text note via Telegram`,
          comment: msg.text.substring(0, 100) + (msg.text.length > 100 ? '...' : ''),
          uploadedBy: 1,
          isPublic: false
        });

        await this.bot.sendMessage(chatId, `✅ Note saved!\n\n"${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}"\n\nSend more notes or use /projects to switch projects.`);
      }

    } catch (error) {
      console.error('Error handling text message:', error);
    }
  }

  private async createOrUpdateSession(userId: string, username?: string, firstName?: string) {
    try {
      // Check if session exists
      const existingSession = await db
        .select()
        .from(telegramUserSessions)
        .where(eq(telegramUserSessions.telegramUserId, userId))
        .limit(1);

      if (existingSession.length > 0) {
        // Update existing session
        await db
          .update(telegramUserSessions)
          .set({
            telegramUsername: username,
            telegramFirstName: firstName,
            lastInteraction: new Date(),
            updatedAt: new Date()
          })
          .where(eq(telegramUserSessions.telegramUserId, userId));
      } else {
        // Create new session
        await db.insert(telegramUserSessions).values({
          telegramUserId: userId,
          telegramUsername: username,
          telegramFirstName: firstName,
          sessionState: 'idle'
        });
      }
    } catch (error) {
      console.error('Error creating/updating session:', error);
    }
  }

  private mapCategoryToFileCategory(category: string): string {
    const mapping: { [key: string]: string } = {
      'recce': 'photos',
      'design': 'design', 
      'drawings': 'drawings',
      'notes': 'notes'
    };
    return mapping[category] || 'general';
  }

  private getCategoryDisplayName(category: string): string {
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

// Telegram Bot Manager - handles bot lifecycle
class TelegramBotManager {
  private bot: FurniliTelegramBot | null = null;
  private isRunning = false;
  private currentSettings: TelegramBotSettings = { enabled: false };

  /**
   * Start the Telegram bot with the provided token
   */
  async start(token: string): Promise<void> {
    if (this.isRunning) {
      console.log('🤖 Telegram bot is already running');
      return;
    }

    if (!token || token.trim() === '' || token === '•••') {
      console.warn('⚠️ Telegram bot start failed: No valid token provided');
      return;
    }

    try {
      console.log('🚀 Starting Telegram bot...');
      this.bot = new FurniliTelegramBot(token);
      this.isRunning = true;
      console.log('✅ Telegram bot started successfully (polling mode)');
      
    } catch (error) {
      console.error('❌ Telegram bot start failed:', error.message);
      this.stop();
    }
  }

  /**
   * Stop the Telegram bot
   */
  stop(): void {
    if (this.bot) {
      try {
        this.bot.stop();
        this.bot = null;
        this.isRunning = false;
        console.log('🛑 Telegram bot stopped');
      } catch (error) {
        console.error('❌ Error stopping Telegram bot:', error.message);
      }
    }
  }

  /**
   * Reload bot configuration
   */
  async reload(settings: TelegramBotSettings): Promise<void> {
    console.log(`🔄 Telegram bot reload - enabled: ${settings.enabled}, token: ${settings.token ? 'provided' : 'none'}`);
    
    this.currentSettings = settings;

    if (!settings.enabled) {
      if (this.isRunning) {
        console.log('🔄 Disabling Telegram bot...');
        this.stop();
      }
      return;
    }

    // Bot should be enabled
    if (!settings.token || settings.token === '•••') {
      console.warn('⚠️ Telegram bot enabled but no valid token provided');
      this.stop();
      return;
    }

    // Restart if token changed or bot not running
    if (this.isRunning) {
      console.log('🔄 Restarting Telegram bot with new settings...');
      this.stop();
    }
    
    await this.start(settings.token);
  }

  /**
   * Get bot status
   */
  getStatus(): { running: boolean; enabled: boolean } {
    return {
      running: this.isRunning,
      enabled: this.currentSettings.enabled
    };
  }
}

// Export singleton instance
export const telegramBotManager = new TelegramBotManager();
export default telegramBotManager;