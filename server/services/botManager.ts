import { FurniliWhatsAppBot } from "./whatsappBot.js";
import { FurniliTelegramBot } from "./telegramBotSimple.js";
import { storage } from "../storage.js";
import type { BotSettings } from "../../shared/schema.js";

export class BotManager {
  private whatsappBot?: FurniliWhatsAppBot;
  private telegramBot?: FurniliTelegramBot;
  private currentEnvironment: string;
  private initialized = false;

  constructor() {
    // Detect current environment
    this.currentEnvironment = process.env.NODE_ENV || 'development';
    console.log(`🤖 Bot Manager initialized for environment: ${this.currentEnvironment}`);
  }

  /**
   * Initialize all enabled bots based on database settings
   */
  async initializeBots(): Promise<void> {
    if (this.initialized) {
      console.log('🤖 Bot Manager already initialized, skipping...');
      return;
    }

    try {
      console.log('🤖 Checking database for bot settings...');
      
      // Get bot settings from database for current environment
      const botSettings = await storage.getAllBotSettings(this.currentEnvironment);

      console.log(`🤖 Found ${botSettings.length} bot configurations for ${this.currentEnvironment} environment`);

      // Initialize each enabled bot based on database settings
      for (const botConfig of botSettings) {
        if (!botConfig.isEnabled) {
          console.log(`⏸️ Bot ${botConfig.botName} (${botConfig.botType}) is disabled - skipping initialization`);
          continue;
        }

        console.log(`🚀 Initializing ${botConfig.botName} (${botConfig.botType})...`);
        
        try {
          await this.initializeBot(botConfig);
          console.log(`✅ Successfully initialized ${botConfig.botName}`);
        } catch (error) {
          console.error(`❌ Failed to initialize ${botConfig.botName}:`, error);
          
          // Update bot status in database to reflect failure
          await this.updateBotStatus(botConfig.id, 'failed', `Initialization failed: ${error}`);
        }
      }

      this.initialized = true;
      console.log('🤖 Bot Manager initialization complete');
      
    } catch (error) {
      console.error('❌ Failed to initialize Bot Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize a specific bot based on its configuration
   */
  private async initializeBot(botConfig: BotSettings): Promise<void> {
    switch (botConfig.botType) {
      case 'whatsapp':
        await this.initializeWhatsAppBot(botConfig);
        break;
        
      case 'telegram':
        await this.initializeTelegramBot(botConfig);
        break;
        
      default:
        console.warn(`⚠️ Unknown bot type: ${botConfig.botType}`);
        break;
    }
  }

  /**
   * Initialize WhatsApp bot with database configuration
   */
  private async initializeWhatsAppBot(botConfig: BotSettings): Promise<void> {
    if (this.whatsappBot) {
      console.log('📱 WhatsApp bot already initialized, skipping...');
      return;
    }

    try {
      // Update status to initializing
      await this.updateBotStatus(botConfig.id, 'initializing', 'Starting WhatsApp bot...');
      
      this.whatsappBot = new FurniliWhatsAppBot();
      
      // Store global references for API access
      global.whatsappClient = this.whatsappBot.getClient();
      global.qrCodeData = null;
      global.initializeWhatsAppBot = async () => {
        try {
          const newBot = new FurniliWhatsAppBot();
          await newBot.initialize();
          global.whatsappClient = newBot.getClient();
          console.log("📱 WhatsApp bot reinitialized successfully");
        } catch (error) {
          console.error("❌ Failed to reinitialize WhatsApp bot:", error);
        }
      };
      
      await this.whatsappBot.initialize();
      
      // Update status to active
      await this.updateBotStatus(botConfig.id, 'active', 'WhatsApp bot is running');
      console.log(`📱 WhatsApp bot "${botConfig.botName}" initialized successfully`);
      
    } catch (error) {
      // Update status to failed
      await this.updateBotStatus(botConfig.id, 'failed', `WhatsApp initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Initialize Telegram bot with database configuration  
   */
  private async initializeTelegramBot(botConfig: BotSettings): Promise<void> {
    if (this.telegramBot) {
      console.log('🤖 Telegram bot already initialized, skipping...');
      return;
    }

    try {
      // Validate required configuration
      if (!botConfig.apiKey || botConfig.apiKey.trim() === "") {
        throw new Error("Telegram bot token is required but not configured");
      }

      // Update status to initializing
      await this.updateBotStatus(botConfig.id, 'initializing', 'Starting Telegram bot...');
      
      this.telegramBot = new FurniliTelegramBot(botConfig.apiKey);
      
      // Update status to active
      await this.updateBotStatus(botConfig.id, 'active', 'Telegram bot is running');
      console.log(`🤖 Telegram bot "${botConfig.botName}" initialized successfully`);
      
    } catch (error) {
      // Update status to failed
      await this.updateBotStatus(botConfig.id, 'failed', `Telegram initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Update bot status in database
   */
  private async updateBotStatus(botId: number, status: string, statusMessage: string): Promise<void> {
    try {
      await storage.updateBotSettings(botId, {
        status,
        statusMessage,
      });
    } catch (error) {
      console.error(`Failed to update bot status for bot ${botId}:`, error);
    }
  }

  /**
   * Stop all running bots
   */
  async stopBots(): Promise<void> {
    console.log('🛑 Stopping all bots...');
    
    if (this.whatsappBot) {
      try {
        // WhatsApp bot doesn't have a direct stop method, so we just clear references
        global.whatsappClient = undefined;
        global.qrCodeData = null;
        global.initializeWhatsAppBot = undefined;
        this.whatsappBot = undefined;
        console.log('📱 WhatsApp bot stopped');
      } catch (error) {
        console.error('❌ Error stopping WhatsApp bot:', error);
      }
    }

    if (this.telegramBot) {
      try {
        // Telegram bot would need a stop method to be implemented
        this.telegramBot = undefined;
        console.log('🤖 Telegram bot stopped');
      } catch (error) {
        console.error('❌ Error stopping Telegram bot:', error);
      }
    }

    this.initialized = false;
    console.log('🛑 All bots stopped');
  }

  /**
   * Restart bots (useful when configuration changes)
   */
  async restartBots(): Promise<void> {
    console.log('🔄 Restarting bots...');
    await this.stopBots();
    await this.initializeBots();
  }

  /**
   * Get status of all running bots
   */
  getBotStatus() {
    return {
      environment: this.currentEnvironment,
      initialized: this.initialized,
      whatsappBot: !!this.whatsappBot,
      telegramBot: !!this.telegramBot,
    };
  }
}

// Export singleton instance
export const botManager = new BotManager();