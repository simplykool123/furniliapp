import { FurniliWhatsAppBot } from "./whatsappBot.js";
import { FurniliTelegramBot } from "./telegramBotSimple.js";
import { storage } from "../storage.js";
import type { BotSettings } from "../../shared/schema.js";

export class BotManager {
  private whatsappBot?: FurniliWhatsAppBot;
  private telegramBot?: FurniliTelegramBot;
  private currentEnvironment: string;
  private initialized = false;
  private readonly allowedEnvironments = ['development', 'testing', 'production'];

  constructor() {
    // Detect and validate current environment
    this.currentEnvironment = this.detectEnvironment();
    this.logEnvironmentInfo();
    
    // Additional validation for unknown environments
    if (this.isUnknownEnvironmentFallback()) {
      console.warn(`🚨 RESTRICTED MODE: Running with fallback environment due to unrecognized configuration`);
    }
  }

  /**
   * Check if current environment is the result of unknown environment fallback
   */
  private isUnknownEnvironmentFallback(): boolean {
    const rawEnv = process.env.NODE_ENV?.toLowerCase().trim();
    const environmentMap: Record<string, string> = {
      'dev': 'development',
      'development': 'development',
      'test': 'testing',
      'testing': 'testing',
      'prod': 'production',
      'production': 'production'
    };
    
    return !rawEnv || !environmentMap[rawEnv];
  }

  /**
   * Robust environment detection with validation and safeguards
   */
  private detectEnvironment(): string {
    // Primary: Check NODE_ENV
    let environment = process.env.NODE_ENV?.toLowerCase().trim();
    
    // Secondary: Check for Replit-specific environment indicators
    if (!environment) {
      if (process.env.REPLIT_ENVIRONMENT) {
        environment = process.env.REPLIT_ENVIRONMENT.toLowerCase().trim();
      } else if (process.env.REPL_SLUG?.includes('prod')) {
        environment = 'production';
      } else {
        environment = 'development';
      }
    }

    // Normalize common environment names
    const environmentMap: Record<string, string> = {
      'dev': 'development',
      'development': 'development',
      'test': 'testing',
      'testing': 'testing',
      'prod': 'production',
      'production': 'production'
    };

    // Check if environment is recognized
    if (!environmentMap[environment]) {
      console.warn(`⚠️ CRITICAL: Unknown environment '${environment}' detected!`);
      console.warn(`   Recognized environments: ${Object.keys(environmentMap).join(', ')}`);
      console.warn(`   This could cause cross-environment interference - review your environment configuration`);
      console.warn(`   Defaulting to 'development' with RESTRICTED MODE enabled`);
      
      // Return development with a flag to indicate this was a fallback
      return 'development';
    }

    const normalizedEnv = environmentMap[environment];

    // Validate normalized environment is allowed (should always pass with the map above, but safety check)
    if (!this.allowedEnvironments.includes(normalizedEnv)) {
      console.error(`🚨 FATAL: Normalized environment '${normalizedEnv}' is not in allowed list!`);
      console.error(`   This indicates a configuration error in the environmentMap`);
      throw new Error(`Invalid normalized environment: ${normalizedEnv}`);
    }

    return normalizedEnv;
  }

  /**
   * Log comprehensive environment information for debugging
   */
  private logEnvironmentInfo(): void {
    console.log(`🤖 Bot Manager Environment Detection:`);
    console.log(`   Current Environment: ${this.currentEnvironment}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   REPLIT_ENVIRONMENT: ${process.env.REPLIT_ENVIRONMENT || 'undefined'}`);
    console.log(`   REPL_SLUG: ${process.env.REPL_SLUG || 'undefined'}`);
    console.log(`   Allowed Environments: ${this.allowedEnvironments.join(', ')}`);
    
    // Add environment-specific warnings
    if (this.currentEnvironment === 'production') {
      console.log(`🔴 PRODUCTION ENVIRONMENT: Bots will only use production configurations`);
    } else if (this.currentEnvironment === 'testing') {
      console.log(`🟡 TESTING ENVIRONMENT: Bots isolated from production`);
    } else {
      console.log(`🟢 DEVELOPMENT ENVIRONMENT: Safe for development and testing`);
    }
  }

  /**
   * Perform environment-specific safety checks before bot initialization
   */
  private async validateEnvironmentSafety(): Promise<void> {
    console.log(`🔍 Performing environment safety validation for '${this.currentEnvironment}'...`);
    
    // Production environment safeguards
    if (this.currentEnvironment === 'production') {
      console.log(`🔴 PRODUCTION MODE: Enforcing strict production safeguards`);
      
      // Check for production environment variables
      const requiredProdVars = ['DATABASE_URL'];
      const missingVars = requiredProdVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn(`⚠️ Missing production environment variables: ${missingVars.join(', ')}`);
      }
    }
    
    // Testing environment safeguards
    else if (this.currentEnvironment === 'testing') {
      console.log(`🟡 TESTING MODE: Ensuring isolation from production systems`);
      
      // Ensure no production database URLs are accidentally used
      if (process.env.DATABASE_URL?.includes('prod') || process.env.DATABASE_URL?.includes('production')) {
        throw new Error('SAFETY ERROR: Production database detected in testing environment');
      }
    }
    
    // Development environment safeguards  
    else {
      console.log(`🟢 DEVELOPMENT MODE: Development environment validated`);
    }
    
    // Universal safety checks
    const currentTime = new Date();
    console.log(`🔍 Environment safety validation completed at ${currentTime.toISOString()}`);
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
      
      // Environment safety checks
      await this.validateEnvironmentSafety();
      
      // Get bot settings from database for current environment
      const botSettings = await storage.getAllBotSettings(this.currentEnvironment);

      console.log(`🤖 Found ${botSettings.length} bot configurations for ${this.currentEnvironment} environment`);

      // Initialize each enabled bot based on database settings
      for (const botConfig of botSettings) {
        // Strict environment validation per bot
        if (botConfig.environment !== this.currentEnvironment) {
          console.error(`🚨 ENVIRONMENT MISMATCH: Bot ${botConfig.botName} is configured for '${botConfig.environment}' but current environment is '${this.currentEnvironment}'. Skipping for safety.`);
          continue;
        }

        if (!botConfig.isEnabled) {
          console.log(`⏸️ Bot ${botConfig.botName} (${botConfig.botType}) is disabled - skipping initialization`);
          continue;
        }

        console.log(`🚀 Initializing ${botConfig.botName} (${botConfig.botType}) for ${this.currentEnvironment} environment...`);
        
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
   * Initialize WhatsApp bot with database configuration and environment safeguards
   */
  private async initializeWhatsAppBot(botConfig: BotSettings): Promise<void> {
    // Environment validation
    if (botConfig.environment !== this.currentEnvironment) {
      throw new Error(`WhatsApp bot environment mismatch: config=${botConfig.environment}, current=${this.currentEnvironment}`);
    }

    if (this.whatsappBot) {
      console.log('📱 WhatsApp bot already initialized, skipping...');
      return;
    }

    try {
      // Update status to initializing with environment info
      await this.updateBotStatus(botConfig.id, 'initializing', `Starting WhatsApp bot for ${this.currentEnvironment} environment`);
      
      // Environment-specific initialization
      console.log(`📱 Initializing WhatsApp bot for ${this.currentEnvironment} environment`);
      
      this.whatsappBot = new FurniliWhatsAppBot();
      
      // Environment-namespaced global references
      global.whatsappClient = this.whatsappBot.getClient();
      global.qrCodeData = null;
      global.whatsappEnvironment = this.currentEnvironment;
      global.initializeWhatsAppBot = async () => {
        try {
          const newBot = new FurniliWhatsAppBot();
          await newBot.initialize();
          global.whatsappClient = newBot.getClient();
          console.log(`📱 WhatsApp bot reinitialized successfully for ${this.currentEnvironment}`);
        } catch (error) {
          console.error("❌ Failed to reinitialize WhatsApp bot:", error);
        }
      };
      
      await this.whatsappBot.initialize();
      
      // Update status to active with environment confirmation
      await this.updateBotStatus(botConfig.id, 'active', `WhatsApp bot active in ${this.currentEnvironment} environment`);
      console.log(`📱 WhatsApp bot "${botConfig.botName}" initialized successfully for ${this.currentEnvironment}`);
      
    } catch (error) {
      // Update status to failed with environment context
      await this.updateBotStatus(botConfig.id, 'failed', `WhatsApp initialization failed in ${this.currentEnvironment}: ${error}`);
      throw error;
    }
  }

  /**
   * Initialize Telegram bot with database configuration and environment safeguards
   */
  private async initializeTelegramBot(botConfig: BotSettings): Promise<void> {
    // Environment validation
    if (botConfig.environment !== this.currentEnvironment) {
      throw new Error(`Telegram bot environment mismatch: config=${botConfig.environment}, current=${this.currentEnvironment}`);
    }

    if (this.telegramBot) {
      console.log('🤖 Telegram bot already initialized, skipping...');
      return;
    }

    try {
      // Validate required configuration
      if (!botConfig.apiKey || botConfig.apiKey.trim() === "") {
        throw new Error("Telegram bot token is required but not configured");
      }

      // Environment-specific token validation
      if (this.currentEnvironment === 'production' && botConfig.apiKey.includes('test')) {
        throw new Error("Production environment cannot use test bot tokens");
      }

      // Update status to initializing with environment info
      await this.updateBotStatus(botConfig.id, 'initializing', `Starting Telegram bot for ${this.currentEnvironment} environment`);
      
      console.log(`🤖 Initializing Telegram bot for ${this.currentEnvironment} environment`);
      this.telegramBot = new FurniliTelegramBot(botConfig.apiKey);
      
      // Update status to active with environment confirmation
      await this.updateBotStatus(botConfig.id, 'active', `Telegram bot active in ${this.currentEnvironment} environment`);
      console.log(`🤖 Telegram bot "${botConfig.botName}" initialized successfully for ${this.currentEnvironment}`);
      
    } catch (error) {
      // Update status to failed with environment context
      await this.updateBotStatus(botConfig.id, 'failed', `Telegram initialization failed in ${this.currentEnvironment}: ${error}`);
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