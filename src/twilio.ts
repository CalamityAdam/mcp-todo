import twilio from "twilio";
import type { Request, Response, NextFunction } from "express";

// Export Twilio webhook validation middleware
// In development (no real Twilio auth token), skip validation
export const twilioWebhook = process.env.TWILIO_AUTH_TOKEN?.startsWith('your-twilio-auth-token') 
  ? (req: Request, res: Response, next: NextFunction) => next()
  : twilio.webhook({ validate: true });

// Lazy-load Twilio client
let client: ReturnType<typeof twilio>;

function getTwilioClient() {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
    }
    
    client = twilio(accountSid, authToken);
  }
  return client;
}

// Send WhatsApp message function (renamed from sendSms)
export async function sendWhatsAppMessage(to: string, body: string) {
  // Check if Twilio is properly configured
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken || 
      accountSid.includes('your-twilio') || 
      authToken.includes('your-twilio')) {
    console.log(`[WhatsApp Mock] To: ${to}`);
    console.log(`[WhatsApp Mock] Body: ${body}`);
    return { sid: 'mock-message-sid' };
  }

  // Get WhatsApp-enabled number (sandbox or production)
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Default to sandbox
  
  // Ensure the 'to' number has whatsapp: prefix
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  
  const messageOptions = {
    from: whatsappNumber,
    to: toNumber,
    body,
  };

  try {
    const twilioClient = getTwilioClient();
    const message = await twilioClient.messages.create(messageOptions);
    console.log(`WhatsApp message sent to ${toNumber}: ${message.sid}`);
    return message;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
}

// Keep backward compatibility
export const sendSms = sendWhatsAppMessage;