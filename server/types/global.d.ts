// Global type declarations for WhatsApp bot
import { Client } from 'whatsapp-web.js';

declare global {
  var whatsappClient: Client | undefined;
  var qrCodeData: string | null;
  var initializeWhatsAppBot: (() => Promise<void>) | undefined;
  var whatsappBot: any | undefined;
}