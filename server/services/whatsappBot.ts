import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Message, Client as ClientType } from 'whatsapp-web.js';
import { Pool } from 'pg';
import { telegramUserSessions, projects, clients, projectFiles, whatsappMessages, insertWhatsappMessageSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
// @ts-ignore
import qrcodeTerminal from 'qrcode-terminal';
// @ts-ignore
import QRCode from 'qrcode';

// Import database configuration
import { DATABASE_URL } from '../config.js';

const botPool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10
});

// In-memory user tracking (simple solution)
const userModes = new Map<string, string>();
const userProjects = new Map<string, number>();
const userStates = new Map<string, string>(); // Track user authentication state

// Global state for QR code and bot status
interface BotStatus {
  isConnected: boolean;
  qrCodeData?: string;
  qrCodeDataURL?: string;
  lastActivity: Date;
  totalSessions: number;
  activeChats: number;
  messagesProcessed: number;
  retryCount: number;
  lastRetryTime?: Date;
  connectionHealth: 'healthy' | 'degraded' | 'failed';
}

// Rate limiting for message handling
interface RateLimitTracker {
  lastMessageTime: number;
  messageCount: number;
  windowStart: number;
}

const userRateLimits = new Map<string, RateLimitTracker>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 10; // Max 10 messages per minute per user
const MIN_MESSAGE_DELAY = 2000; // 2 seconds between responses

let botStatus: BotStatus = {
  isConnected: false,
  lastActivity: new Date(),
  totalSessions: 0,
  activeChats: 0,
  messagesProcessed: 0,
  retryCount: 0,
  connectionHealth: 'failed'
};

export class FurniliWhatsAppBot {
  private client!: ClientType; // Using definite assignment assertion since it's initialized in createClient()
  private isInitializing: boolean = false;
  private maxRetries: number = 5;
  private retryDelay: number = 5000; // Start with 5 seconds
  private reconnectTimer?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private messageQueue: Array<{ msg: Message; handler: () => Promise<void> }> = [];
  private processingQueue: boolean = false;
  
  constructor() {
    this.createClient();
    this.setupHandlers();
    this.startHealthCheck();
    console.log('📱 Furnili WhatsApp Bot initializing with optimizations...');
  }

  private createClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'furnili-bot',
        dataPath: '/tmp/whatsapp-session'
      }),
      puppeteer: {
        headless: true,
        executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-extensions',
          `--user-data-dir=/tmp/chrome-whatsapp-bot-${process.pid}`,
          '--no-first-run',
          '--disable-default-apps',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-component-update',
          '--disable-ipc-flooding-protection',
          // Additional stability improvements
          '--disable-crash-reporter',
          '--disable-features=TranslateUI',
          '--disable-plugins-discovery',
          '--disable-print-preview',
          '--disable-smooth-scrolling',
          '--disable-threaded-scrolling',
          '--memory-pressure-off'
        ],
        timeout: 60000,
        // Slow down operations to prevent detection
        slowMo: 100
      },
      // Additional settings for stability
      takeoverOnConflict: false,
      webVersionCache: {
        type: 'local'
      }
    });
  }

  getClient() {
    return this.client;
  }

  private setupHandlers() {
    // QR Code for authentication
    this.client.on('qr', async (qr: string) => {
      try {
        // Store raw QR data
        botStatus.qrCodeData = qr;
        botStatus.isConnected = false;
        
        // Generate data URL for web interface
        botStatus.qrCodeDataURL = await QRCode.toDataURL(qr, {
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 256
        });
        
        // Display ASCII QR in console for debugging
        console.log('\n🔗 WhatsApp QR Code:');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('\n📱 Scan this QR code with your WhatsApp to connect the bot\n');
        
        // Update last activity
        botStatus.lastActivity = new Date();
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    });

    // Ready event
    this.client.on('ready', () => {
      console.log('✅ WhatsApp Bot is ready and connected!');
      botStatus.isConnected = true;
      botStatus.lastActivity = new Date();
      // Clear QR code data when connected
      botStatus.qrCodeData = undefined;
      botStatus.qrCodeDataURL = undefined;
    });

    // Authentication success
    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp Bot authenticated successfully');
      botStatus.lastActivity = new Date();
    });

    // Authentication failure
    this.client.on('auth_failure', (msg: any) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      botStatus.isConnected = false;
      botStatus.lastActivity = new Date();
    });

    // Disconnected
    this.client.on('disconnected', (reason: string) => {
      console.log('📴 WhatsApp Bot disconnected:', reason);
      botStatus.isConnected = false;
      botStatus.connectionHealth = 'failed';
      botStatus.lastActivity = new Date();
      // Clear QR code data when disconnected
      botStatus.qrCodeData = undefined;
      botStatus.qrCodeDataURL = undefined;
      
      // Schedule reconnection with exponential backoff
      this.scheduleReconnection();
    });

    // Handle incoming messages with rate limiting
    this.client.on('message', async (msg: Message) => {
      try {
        // Update message count and activity
        botStatus.messagesProcessed++;
        botStatus.lastActivity = new Date();
        
        // Check rate limiting
        if (!this.checkRateLimit(msg)) {
          console.log(`📱 Rate limited user: ${msg.from}`);
          return;
        }
        
        // Queue message for processing
        this.queueMessage(msg);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });

    // Add error handler for client
    this.client.on('error', (error: Error) => {
      console.error('WhatsApp Client Error:', error);
      botStatus.connectionHealth = 'degraded';
      this.handleClientError(error);
    });
  }

  async initialize() {
    if (this.isInitializing) {
      console.log('📱 WhatsApp bot already initializing, skipping...');
      return;
    }
    
    this.isInitializing = true;
    
    try {
      console.log('📱 Starting WhatsApp bot initialization...');
      await this.client.initialize();
      botStatus.retryCount = 0; // Reset retry count on successful init
      botStatus.connectionHealth = 'healthy';
      console.log('✅ WhatsApp bot initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp bot:', error);
      botStatus.connectionHealth = 'failed';
      this.scheduleReconnection();
    } finally {
      this.isInitializing = false;
    }
  }

  private checkRateLimit(msg: Message): boolean {
    const userId = msg.from;
    const now = Date.now();
    
    let tracker = userRateLimits.get(userId);
    if (!tracker) {
      tracker = {
        lastMessageTime: now,
        messageCount: 1,
        windowStart: now
      };
      userRateLimits.set(userId, tracker);
      return true;
    }
    
    // Reset window if expired
    if (now - tracker.windowStart > RATE_LIMIT_WINDOW) {
      tracker.windowStart = now;
      tracker.messageCount = 1;
      tracker.lastMessageTime = now;
      return true;
    }
    
    // Check if too many messages in window
    if (tracker.messageCount >= MAX_MESSAGES_PER_WINDOW) {
      return false;
    }
    
    // Check minimum delay between messages
    if (now - tracker.lastMessageTime < MIN_MESSAGE_DELAY) {
      return false;
    }
    
    tracker.messageCount++;
    tracker.lastMessageTime = now;
    return true;
  }

  private queueMessage(msg: Message) {
    const handler = async () => {
      try {
        // 🎯 STORE ALL INCOMING MESSAGES FOR REAL-TIME FEED
        await this.storeWhatsAppMessage(msg, 'inbound', false);
        
        // Handle media messages
        if (msg.hasMedia) {
          if (msg.type === 'image') {
            await this.handlePhoto(msg);
          } else if (msg.type === 'document' || msg.type === 'audio' || msg.type === 'video') {
            await this.handleDocument(msg);
          }
        } else {
          // Handle text messages
          await this.handleMessage(msg);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };
    
    this.messageQueue.push({ msg, handler });
    this.processMessageQueue();
  }

  private async processMessageQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    while (this.messageQueue.length > 0) {
      const { handler } = this.messageQueue.shift()!;
      
      try {
        await handler();
        // Add delay between processing messages to avoid spam detection
        await this.sleep(1000);
      } catch (error) {
        console.error('Error in message queue processing:', error);
      }
    }
    
    this.processingQueue = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private scheduleReconnection() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (botStatus.retryCount >= this.maxRetries) {
      console.error('📱 Max reconnection attempts reached. Manual intervention required.');
      return;
    }
    
    // Exponential backoff: 5s, 10s, 20s, 40s, 80s
    const delay = this.retryDelay * Math.pow(2, botStatus.retryCount);
    botStatus.retryCount++;
    botStatus.lastRetryTime = new Date();
    
    console.log(`📱 Scheduling reconnection attempt ${botStatus.retryCount} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        console.log('📱 Attempting to reconnect WhatsApp bot...');
        // Destroy existing client before creating new one
        try {
          await this.client.destroy();
        } catch (e) {
          console.log('Client already destroyed or not initialized');
        }
        this.createClient();
        this.setupHandlers();
        await this.initialize();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.scheduleReconnection();
      }
    }, delay);
  }

  private handleClientError(error: Error) {
    console.error('📱 Client error detected:', error.message);
    
    // Handle specific error types
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('WebSocket') ||
        error.message.includes('Protocol error')) {
      console.log('📱 Connection error detected, scheduling reconnection...');
      this.scheduleReconnection();
    }
  }

  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - botStatus.lastActivity.getTime();
      
      // If no activity for 5 minutes and supposedly connected, check health
      if (timeSinceLastActivity > 300000 && botStatus.isConnected) {
        console.log('📱 No activity detected, checking connection health...');
        this.checkConnectionHealth();
      }
    }, 60000); // Check every minute
  }

  private async checkConnectionHealth() {
    try {
      const state = await this.client.getState();
      console.log('📱 WhatsApp connection state:', state);
      
      if (state !== 'CONNECTED') {
        botStatus.isConnected = false;
        botStatus.connectionHealth = 'failed';
        this.scheduleReconnection();
      } else {
        botStatus.connectionHealth = 'healthy';
      }
    } catch (error) {
      console.error('📱 Health check failed:', error);
      botStatus.isConnected = false;
      botStatus.connectionHealth = 'failed';
      this.scheduleReconnection();
    }
  }

  public destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    try {
      this.client.destroy();
    } catch (error) {
      console.error('Error destroying client:', error);
    }
  }

  // Rate-limited message sending wrapper
  private async sendMessage(msg: Message, text: string): Promise<void> {
    try {
      // Add small delay to prevent rapid-fire responses
      await this.sleep(500);
      await msg.reply(text);
    } catch (error) {
      console.error('Error sending message:', error);
      // Don't throw error to prevent breaking the flow
    }
  }

  // Create or update user session tracking
  private async createOrUpdateSession(whatsappUserId: string, contactName?: string, pushName?: string): Promise<void> {
    try {
      const client = await botPool.connect();
      try {
        // Update or insert session tracking
        await client.query(`
          INSERT INTO telegram_user_sessions 
          (whatsapp_user_id, contact_name, push_name, last_activity, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW(), NOW())
          ON CONFLICT (whatsapp_user_id) 
          DO UPDATE SET 
            contact_name = EXCLUDED.contact_name,
            push_name = EXCLUDED.push_name,
            last_activity = NOW(),
            updated_at = NOW()
        `, [whatsappUserId, contactName || '', pushName || '']);
        
        console.log(`\ud83d\udcf1 Session updated for WhatsApp user ${whatsappUserId}`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating/updating session:', error);
    }
  }

  // Get system user information from database
  private async getSystemUserInfo(whatsappUserId: string): Promise<{ id: number; name: string; phone: string } | null> {
    try {
      const client = await botPool.connect();
      try {
        const result = await client.query(`
          SELECT u.id, u.name, u.phone 
          FROM telegram_user_sessions tus
          LEFT JOIN users u ON tus.phone_number = u.phone
          WHERE tus.whatsapp_user_id = $1 AND u.phone IS NOT NULL
        `, [whatsappUserId]);

        return result.rows.length > 0 ? result.rows[0] : null;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting system user info:', error);
      return null;
    }
  }

  // Store WhatsApp message in database for real-time feed
  private async storeWhatsAppMessage(msg: Message, direction: 'inbound' | 'outbound' = 'inbound', isFromBot: boolean = false): Promise<void> {
    try {
      const contact = await msg.getContact();
      const userId = contact.id.user;
      
      const messageData = {
        messageId: msg.id._serialized,
        fromUserId: userId,
        fromUserName: contact.name || contact.pushname || userId,
        chatId: msg.from,
        messageType: msg.type as any,
        messageBody: msg.body || '',
        mediaUrl: msg.hasMedia ? 'media_file' : null, // Will be updated with actual URL later
        timestamp: new Date(msg.timestamp * 1000),
        direction,
        isFromBot,
        isRead: false
      };

      const client = await botPool.connect();
      try {
        // Insert message into database
        await client.query(`
          INSERT INTO whatsapp_messages 
          (message_id, from_user_id, from_user_name, chat_id, message_type, message_body, media_url, timestamp, direction, is_from_bot, is_read)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (message_id) DO NOTHING
        `, [
          messageData.messageId,
          messageData.fromUserId,
          messageData.fromUserName,
          messageData.chatId,
          messageData.messageType,
          messageData.messageBody,
          messageData.mediaUrl,
          messageData.timestamp,
          messageData.direction,
          messageData.isFromBot,
          messageData.isRead
        ]);

        console.log(`📱 Message stored: ${messageData.messageType} from ${messageData.fromUserName}`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error storing WhatsApp message:', error);
    }
  }

  private async handleMessage(msg: Message) {
    // Ignore group messages and status updates
    if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') return;

    const contact = await msg.getContact();
    const userId = contact.id.user;
    const text = msg.body.trim().toLowerCase();

    console.log(`📱 WhatsApp message from ${contact.name || userId}: ${text}`);

    // Only respond to messages that explicitly mention "bot" or start with "#"
    // This prevents the bot from responding to normal conversations
    const isBotMention = text.includes('bot') || text.includes('furnili') || text.includes('assistant');
    const isCommand = text.startsWith('#');
    
    if (!isBotMention && !isCommand) {
      // Silently ignore normal messages
      return;
    }

    // Handle commands with # prefix (WhatsApp style)
    if (text.startsWith('#')) {
      await this.handleCommand(msg, text.slice(1)); // Remove # prefix
      return;
    }

    // If bot is mentioned but no command, show help
    if (isBotMention) {
      await this.handleStart(msg);
      return;
    }

    // Handle phone authentication if user is awaiting
    if (userStates.get(userId) === 'awaiting_phone') {
      await this.handlePhoneAuthentication(msg, text);
      return;
    }

    // Check if it's a simple number for project selection
    const projectNumber = parseInt(text);
    if (!isNaN(projectNumber)) {
      try {
        const client = await botPool.connect();
        try {
          console.log(`📱 User ${userId} typed number: ${projectNumber}`);
          await this.handleSelectProject(msg, projectNumber);
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
    } else {
      // First-time user - start authentication
      const isAuthenticated = await this.checkUserAuthentication(userId);
      if (!isAuthenticated) {
        await this.handleStart(msg);
      }
    }
  }

  private async handleCommand(msg: Message, command: string) {
    const contact = await msg.getContact();
    const userId = contact.id.user;
    
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
      case 'start':
      case 'help':
        await this.handleStart(msg);
        break;
      case 'projects':
        await this.handleProjects(msg);
        break;
      case 'select':
        if (args.length > 0) {
          const projectNum = parseInt(args[0]);
          if (!isNaN(projectNum)) {
            await this.handleSelectProject(msg, projectNum);
          }
        }
        break;
      case 'recce':
        await this.handleCategorySelection(msg, 'recce');
        break;
      case 'design':
        await this.handleCategorySelection(msg, 'design');
        break;
      case 'drawings':
        await this.handleCategorySelection(msg, 'drawings');
        break;
      case 'notes':
        await this.handleCategorySelection(msg, 'notes');
        break;
      default:
        await this.sendMessage(msg, `❓ Unknown command: #${cmd}\n\nAvailable commands:\n• #start - Get started\n• #projects - View projects\n• #select [number] - Select project\n• #recce, #design, #drawings, #notes - Set category`);
    }
  }

  private async handleStart(msg: Message) {
    const contact = await msg.getContact();
    const userId = contact.id.user;

    // Check if user is already authenticated
    const isAuthenticated = await this.checkUserAuthentication(userId);
    
    if (isAuthenticated) {
      await this.createOrUpdateSession(userId, contact.name, contact.pushname);
      
      const welcomeMessage = `🏠 Welcome back to Furnili Assistant!

I'll help you organize your project files efficiently.

📋 Commands:
• #projects - View all active projects

Quick Start:
1. Type #projects
2. Select with #select [number] or just type the number
3. Choose category (#recce, #design, #drawings, #notes)
4. Send your files!`;

      await this.sendMessage(msg, welcomeMessage);
    } else {
      // Request phone number for authentication
      userStates.set(userId, 'awaiting_phone');
      await this.sendMessage(msg, `🔐 Welcome to Furnili Assistant!\n\nFor security, I need to verify your phone number.\n\nPlease share your registered phone number (10 digits):\nExample: 9876543210`);
    }
  }

  private async checkUserAuthentication(whatsappUserId: string): Promise<boolean> {
    try {
      const client = await botPool.connect();
      try {
        // Check if WhatsApp user is linked to a system user via phone
        // We'll reuse the telegram_user_sessions table for WhatsApp too
        const result = await client.query(`
          SELECT tus.*, u.id as system_user_id, u.name, u.phone 
          FROM telegram_user_sessions tus
          LEFT JOIN users u ON tus.phone_number = u.phone
          WHERE tus.whatsapp_user_id = $1 AND tus.phone_number IS NOT NULL AND u.phone IS NOT NULL
        `, [whatsappUserId]);

        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error checking user authentication:', error);
      return false;
    }
  }

  private async authenticateUserByPhone(whatsappUserId: string, phoneNumber: string): Promise<boolean> {
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

        // Check if session exists
        const sessionResult = await client.query(`
          SELECT id FROM telegram_user_sessions WHERE whatsapp_user_id = $1
        `, [whatsappUserId]);

        if (sessionResult.rows.length > 0) {
          // Update existing session
          await client.query(`
            UPDATE telegram_user_sessions 
            SET phone_number = $1, system_user_id = $2, updated_at = NOW()
            WHERE whatsapp_user_id = $3
          `, [phoneNumber, user.id, whatsappUserId]);
        } else {
          // Insert new session
          await client.query(`
            INSERT INTO telegram_user_sessions 
            (whatsapp_user_id, phone_number, system_user_id, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
          `, [whatsappUserId, phoneNumber, user.id]);
        }

        console.log(`✅ WhatsApp User ${whatsappUserId} authenticated with phone ${phoneNumber}, linked to system user ${user.id} (${user.name})`);
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error authenticating user by phone:', error);
      return false;
    }
  }

  private async handlePhoneAuthentication(msg: Message, phoneText: string) {
    const contact = await msg.getContact();
    const userId = contact.id.user;

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneText.replace(/\D/g, '');
    
    // Validate phone number format (10-15 digits)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      await this.sendMessage(msg, `❌ Invalid phone number format. Please enter 10-15 digits only:
Example: 9876543210`);
      return;
    }

    console.log(`🔐 Authenticating WhatsApp user ${userId} with phone ${cleanPhone}`);

    // Try to authenticate user by phone
    const isAuthenticated = await this.authenticateUserByPhone(userId, cleanPhone);
    
    if (isAuthenticated) {
      // Create session record after successful authentication
      await this.createOrUpdateSession(userId, contact.name, contact.pushname);
      
      const userInfo = await this.getSystemUserInfo(userId);
      userStates.delete(userId); // Clear authentication state
      
      await msg.reply(`✅ Welcome ${userInfo?.name || 'User'}!

🏠 You are now authenticated and can access Furnili Assistant.

📋 Commands:
• #projects - View all active projects

Quick Start:
1. Type #projects
2. Select with #select [number] or just type the number
3. Choose category and upload!`);
    } else {
      await msg.reply(`❌ Phone number ${cleanPhone} not found in our system.

Please contact the admin (9823633833) to add your phone number to the system.

Once added, please try #start again.`);
    }
  }

  private async handleProjects(msg: Message) {
    const contact = await msg.getContact();
    const userId = contact.id.user;

    try {
      const client = await botPool.connect();
      try {
        const result = await client.query(`
          SELECT p.id, p.code, p.name, p.status, c.name as client_name 
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id
          WHERE p.status = 'active'
          ORDER BY p.created_at DESC
        `);

        if (result.rows.length === 0) {
          await this.sendMessage(msg, '📋 No active projects found.');
          return;
        }

        let projectsList = '📋 *Active Projects:*\n\n';
        result.rows.forEach((project, index) => {
          projectsList += `${index + 1}. *${project.name}*\n`;
          projectsList += `   📁 ${project.code}\n`;
          if (project.client_name) {
            projectsList += `   👤 ${project.client_name}\n`;
          }
          projectsList += '\n';
        });

        projectsList += `💡 To select a project, type:\n#select [number] or just the number\n\nExample: #select 1 or just 1`;

        await this.sendMessage(msg, projectsList);

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      await this.sendMessage(msg, '❌ Error fetching projects. Please try again.');
    }
  }

  private async handleSelectProject(msg: Message, projectNumber: number) {
    const contact = await msg.getContact();
    const userId = contact.id.user;

    try {
      const client = await botPool.connect();
      try {
        const result = await client.query(`
          SELECT p.id, p.code, p.name, c.name as client_name 
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id
          WHERE p.status = 'active'
          ORDER BY p.created_at DESC
          LIMIT 1 OFFSET $1
        `, [projectNumber - 1]);

        if (result.rows.length === 0) {
          await this.sendMessage(msg, `❌ Project ${projectNumber} not found. Use #projects to see available projects.`);
          return;
        }

        const project = result.rows[0];
        userProjects.set(userId, project.id);

        await this.sendMessage(msg, `✅ Selected: *${project.name}*\n📁 ${project.code}${project.client_name ? `\n👤 ${project.client_name}` : ''}\n\n📂 Choose upload category:\n• #recce - Site photos & measurements\n• #design - Design files & concepts\n• #drawings - Technical drawings & plans\n• #notes - Text notes & attachments\n\nThen send your files!`);

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error selecting project:', error);
      await this.sendMessage(msg, '❌ Error selecting project. Please try again.');
    }
  }

  private async handleCategorySelection(msg: Message, category: string) {
    const contact = await msg.getContact();
    const userId = contact.id.user;

    const projectId = userProjects.get(userId);
    if (!projectId) {
      await this.sendMessage(msg, '⚠️ Please select a project first using #projects → #select [number]');
      return;
    }

    userModes.set(userId, category);

    const categoryMessages: { [key: string]: string } = {
      recce: "📷 *Recce Mode Active*\n\nSend photos of the site with measurements and descriptions. Each photo will be saved under the Recce category.",
      design: "🎨 *Design Mode Active*\n\nSend design files, concepts, and inspiration images. All files will be organized under Design category.", 
      drawings: "📐 *Drawings Mode Active*\n\nSend technical drawings, plans, and architectural files. Files will be saved under Drawings category.",
      notes: "📝 *Notes Mode Active*\n\nSend text notes with any attachments. Everything will be saved under Notes category."
    };

    await this.sendMessage(msg, categoryMessages[category]);
  }

  private async handlePhoto(msg: Message) {
    if (!msg.hasMedia) return;

    const contact = await msg.getContact();
    const userId = contact.id.user;
    const projectId = userProjects.get(userId);
    const currentMode = userModes.get(userId) || 'delivery_chalan';

    if (!projectId) {
      await this.sendMessage(msg, '⚠️ Please select a project first using #projects → #select [number]');
      return;
    }

    try {
      const media = await msg.downloadMedia();
      if (!media) return;

      // Automatically categorize photos as delivery chalans
      const category = 'delivery_chalan';
      const uniqueName = crypto.randomBytes(8).toString('hex');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = media.mimetype?.includes('jpeg') ? '.jpg' : 
                  media.mimetype?.includes('png') ? '.png' : 
                  media.mimetype?.includes('webp') ? '.webp' : '.jpg';
      const fileName = `delivery_chalan_${timestamp}_${uniqueName}${ext}`;
      const filePath = `uploads/projects/${fileName}`;

      // Ensure upload directory exists
      const uploadDir = path.dirname(filePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Save file
      fs.writeFileSync(filePath, media.data, 'base64');
      const stats = fs.statSync(filePath);

      // Get system user info
      const systemUser = await this.getSystemUserInfo(userId);

      // Save to database using raw query
      const client = await botPool.connect();
      try {
        await client.query(`
          INSERT INTO project_files 
          (project_id, file_name, original_name, file_path, file_size, mime_type, category, description, comment, uploaded_by, is_public, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `, [
          projectId,
          fileName,
          `WhatsApp_Photo_${new Date().toISOString().slice(0, 10)}.jpg`,
          filePath,
          stats.size,
          media.mimetype || 'image/jpeg',
          this.mapCategoryToFileCategory(currentMode),
          'Uploaded via WhatsApp',
          msg.body || '',
          systemUser?.id || 1,
          false
        ]);
      } finally {
        client.release();
      }

      await this.sendMessage(msg, `✅ Photo saved to ${this.getCategoryDisplayName(currentMode)} category!${msg.body ? `\n\nCaption: ${msg.body}` : ''}\n\nSend more files or use #projects to switch projects.`);

    } catch (error) {
      console.error('Error handling photo:', error);
      await this.sendMessage(msg, "Sorry, I couldn't save the photo. Please try again.");
    }
  }

  private async handleDocument(msg: Message) {
    if (!msg.hasMedia) return;

    const contact = await msg.getContact();
    const userId = contact.id.user;
    const projectId = userProjects.get(userId);

    if (!projectId) {
      await this.sendMessage(msg, '⚠️ Please select a project first using #projects → #select [number]');
      return;
    }

    try {
      const media = await msg.downloadMedia();
      if (!media) return;

      // Auto-categorize based on file type
      const ext = media.filename ? path.extname(media.filename).toLowerCase() : '.pdf';
      const mimeType = media.mimetype || '';
      
      // Check if it's a manual quote (PDF or Excel)
      const isManualQuote = ext === '.pdf' || 
                           ext === '.xlsx' || 
                           ext === '.xls' || 
                           mimeType.includes('pdf') || 
                           mimeType.includes('excel') || 
                           mimeType.includes('spreadsheet');

      const category = isManualQuote ? 'manual_quote' : 'general';
      const uniqueName = crypto.randomBytes(8).toString('hex');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = isManualQuote ? 
        `manual_quote_${timestamp}_${uniqueName}${ext}` : 
        `whatsapp_doc_${timestamp}_${uniqueName}${ext}`;
      
      // Create category-specific directory
      const categoryFolder = isManualQuote ? 'manual_quotes' : 'projects';
      const filePath = `uploads/${categoryFolder}/project_${projectId}/${fileName}`;

      // Ensure upload directory exists
      const fullPath = path.join(process.cwd(), filePath);
      const uploadDir = path.dirname(fullPath);
      await fs.ensureDir(uploadDir);

      // Save file
      await fs.writeFile(fullPath, media.data, 'base64');
      const stats = await fs.stat(fullPath);

      // Get system user info
      const systemUser = await this.getSystemUserInfo(userId);

      // Save to database with proper categorization
      const client = await botPool.connect();
      try {
        await client.query(`
          INSERT INTO project_files 
          (project_id, file_name, original_name, file_path, file_size, mime_type, category, description, comment, uploaded_by, is_public, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `, [
          projectId,
          fileName,
          media.filename || `WhatsApp_${isManualQuote ? 'ManualQuote' : 'Document'}_${new Date().toISOString().slice(0, 10)}${ext}`,
          filePath,
          stats.size,
          media.mimetype || 'application/octet-stream',
          category,
          'Uploaded via WhatsApp',
          msg.body || '',
          systemUser?.id || 1,
          false
        ]);
      } finally {
        client.release();
      }

      const categoryDisplayName = isManualQuote ? 'Manual Quote' : 'General Document';
      await this.sendMessage(msg, `✅ ${categoryDisplayName} uploaded successfully!\n📁 Project: ${projectId}\n📄 Category: ${categoryDisplayName}\n📎 File: ${fileName}${msg.body ? `\n📝 Comment: ${msg.body}` : ''}\n\nYour ${isManualQuote ? 'manual quote' : 'document'} has been automatically categorized and saved!`);

    } catch (error) {
      console.error('Error handling document:', error);
      await this.sendMessage(msg, "Sorry, I couldn't save the document. Please try again.");
    }
  }

  private async handleTextNote(msg: Message, noteText: string) {
    const contact = await msg.getContact();
    const userId = contact.id.user;
    const projectId = userProjects.get(userId);

    if (!projectId) {
      await this.sendMessage(msg, '⚠️ Please select a project first using #projects → #select [number]');
      return;
    }

    try {
      // Save text as a note file
      const fileName = `note_${crypto.randomBytes(4).toString('hex')}.txt`;
      const filePath = `uploads/projects/${fileName}`;

      // Ensure upload directory exists
      const uploadDir = path.dirname(filePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Save text to file
      fs.writeFileSync(filePath, noteText);
      const stats = fs.statSync(filePath);

      // Get system user info
      const systemUser = await this.getSystemUserInfo(userId);

      // Save to database
      const client = await botPool.connect();
      try {
        await client.query(`
          INSERT INTO project_files 
          (project_id, file_name, original_name, file_path, file_size, mime_type, category, description, comment, uploaded_by, is_public, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `, [
          projectId,
          fileName,
          `Note_${new Date().toISOString().slice(0, 10)}.txt`,
          filePath,
          stats.size,
          'text/plain',
          'notes',
          'Text note via WhatsApp',
          noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
          systemUser?.id || 1,
          false
        ]);
      } finally {
        client.release();
      }

      await this.sendMessage(msg, `✅ Note saved!\n\n"${noteText.substring(0, 100)}${noteText.length > 100 ? '...' : ''}"\n\nSend more notes or use #projects to switch projects.`);

    } catch (error) {
      console.error('Error handling text note:', error);
      await this.sendMessage(msg, "Sorry, I couldn't save the note. Please try again.");
    }
  }

  // Removed duplicate implementations - using the earlier implementations

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
  
  // Public method to get bot status
  getBotStatus(): BotStatus {
    return { ...botStatus };
  }

  // Global method to get status (exported for API access)
  getGlobalBotStatus(): BotStatus {
    return { ...botStatus };
  }
}

// Export function for API access
export function getBotStatus(): BotStatus {
  return { ...botStatus };
}

export function updateBotStats(stats: Partial<BotStatus>) {
  Object.assign(botStatus, stats);
}