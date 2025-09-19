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
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;
  
  constructor(token: string) {
    this.token = token;
    this.bot = new TelegramBot(token, { polling: true });
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    
    // Projects command
    this.bot.onText(/\/projects/, (msg) => this.handleProjects(msg));
    
    // Select project command (removed - now handled in text messages)
    
    // Category selection commands
    this.bot.onText(/\/recce/, (msg) => this.handleCategorySelection(msg, 'recce'));
    this.bot.onText(/\/design/, (msg) => this.handleCategorySelection(msg, 'design'));
    this.bot.onText(/\/drawings/, (msg) => this.handleCategorySelection(msg, 'drawings'));
    this.bot.onText(/\/6s/, (msg) => this.handleCategorySelection(msg, '6s'));
    
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

    let welcomeMessage = "🏠 Welcome back to Furnili Assistant!";
    welcomeMessage += "\n\nI'll help you organize your project files efficiently.";
    welcomeMessage += "\n\n📋 Commands:";
    welcomeMessage += "\n• /projects - View all active projects";
    welcomeMessage += "\n\nQuick Start:";
    welcomeMessage += "\n1. Type /projects";
    welcomeMessage += "\n2. Reply with number (e.g., 1)";
    welcomeMessage += "\n3. Choose category and upload!";

    await this.bot.sendMessage(chatId, welcomeMessage);
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

      let projectMessage = "📋 Active Projects (ongoing):";
      projectMessage += "\n\n";
      
      projectList.forEach((project, index: number) => {
        projectMessage += `${index + 1}. ${project.code} - ${project.name}`;
        projectMessage += `\nClient: ${project.clientName || 'Unknown'}`;
        projectMessage += `\nStage: ${project.stage}`;
        projectMessage += "\n\n";
      });

      projectMessage += "Reply with the Number to choose the project";
      projectMessage += "\nExample: 1";

      await this.bot.sendMessage(chatId, projectMessage);

      // Set session state to project selection mode
      const userId = msg.from?.id.toString();
      if (userId) {
        await this.createOrUpdateSession(userId, msg.from?.username, msg.from?.first_name);
        await db
          .update(telegramUserSessions)
          .set({
            sessionState: 'project_selection',
            lastInteraction: new Date(),
            updatedAt: new Date()
          })
          .where(eq(telegramUserSessions.telegramUserId, userId));
      }

    } catch (error) {
      console.error('Error fetching projects:', error);
      await this.bot.sendMessage(chatId, "Sorry, I couldn't fetch the projects. Please try again later.");
    }
  }

  private async selectProjectByNumber(msg: TelegramBot.Message, projectNumber: number) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    
    if (!userId) return;

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

      let successMessage = `✅ Project Selected: ${selectedProject.code}`;
      successMessage += `\nClient: ${selectedProject.clientName || 'Unknown'}`;
      successMessage += "\n\nChoose upload category:";
      successMessage += "\n• /recce - Site photos with measurements";
      successMessage += "\n• /design - Design files";
      successMessage += "\n• /drawings - Technical drawings";
      successMessage += "\n• /6s - Delivery challan photos";
      successMessage += "\n\nSend the command and start uploading!";

      await this.bot.sendMessage(chatId, successMessage);

    } catch (error) {
      console.error('Error selecting project:', error);
      await this.bot.sendMessage(chatId, "Sorry, I couldn't select the project. Please try again.");
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

      let successMessage = `✅ Project Selected: ${selectedProject.code}`;
      successMessage += `\nClient: ${selectedProject.clientName || 'Unknown'}`;
      successMessage += "\n\nChoose upload category:";
      successMessage += "\n• /recce - Site photos with measurements";
      successMessage += "\n• /design - Design files";
      successMessage += "\n• /drawings - Technical drawings";
      successMessage += "\n• /6s - Delivery challan photos";
      successMessage += "\n\nSend the command and start uploading!";

      await this.bot.sendMessage(chatId, successMessage);

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
        recce: "📷 → Recce Mode Active\n\nSend site photos with measurements.",
        design: "🎨 → Design Mode Active\n\nSend design files and concepts.", 
        drawings: "📐 → Drawings Mode Active\n\nSend technical drawings and plans.",
        '6s': "📋 → Delivery Mode Active\n\nSend delivery challan photos."
      };

      await this.bot.sendMessage(chatId, categoryMessages[category]);

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
        uploadedBy: 5, // Use actual admin user ID from database
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
        uploadedBy: 5, // Use actual admin user ID from database
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

      if (session.length === 0) {
        return; // Don't respond if no session
      }

      const userSession = session[0];

      // Handle project selection by number
      if (userSession.sessionState === 'project_selection') {
        const projectNumber = parseInt(msg.text);
        if (!isNaN(projectNumber)) {
          await this.selectProjectByNumber(msg, projectNumber);
          return;
        }
      }

      // Handle notes upload
      if (userSession.sessionState === 'uploading' && userSession.currentStep === 'notes' && userSession.activeProjectId) {
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
          uploadedBy: 5,
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
      '6s': 'delivery'
    };
    return mapping[category] || 'general';
  }

  private getCategoryDisplayName(category: string): string {
    const names: { [key: string]: string } = {
      'recce': 'Recce',
      'design': 'Design', 
      'drawings': 'Drawings',
      '6s': 'Files'
    };
    return names[category] || 'General';
  }

  private setupErrorHandling() {
    this.bot.on('polling_error', (error) => {
      console.error('🚨 Telegram polling error:', error.message);
      
      // Handle 401 Unauthorized errors (invalid token)
      if (error.message.includes('401 Unauthorized')) {
        this.consecutiveErrors++;
        console.error(`❌ Telegram bot authentication failed (${this.consecutiveErrors}/${this.maxConsecutiveErrors})`);
        
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          console.error('🛑 Too many authentication failures - stopping bot to prevent spam');
          console.error('💡 Please update your Telegram bot token in Bot Settings with a fresh token from @BotFather');
          this.stop();
          return;
        }
      } else {
        // Reset counter for non-auth errors
        this.consecutiveErrors = 0;
      }
    });

    // Reset error counter on successful operations
    this.bot.on('message', () => {
      if (this.consecutiveErrors > 0) {
        console.log('✅ Telegram bot communication restored');
        this.consecutiveErrors = 0;
      }
    });
  }

  public stop() {
    try {
      this.bot.stopPolling();
    } catch (error) {
      console.error('Error stopping bot polling:', error);
    }
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