import twilio from "twilio";
import type { Request, Response, NextFunction } from "express";

// Export Twilio webhook validation middleware
// In development (no real Twilio auth token), skip validation
export const twilioWebhook = !process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN.includes('your-twilio-auth-token')
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

// Send SMS function
export async function sendSms(to: string, body: string) {
  // Check if Twilio is properly configured
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken || 
      accountSid.includes('your-twilio') || 
      authToken.includes('your-twilio')) {
    console.log(`[SMS Mock] To: ${to}`);
    console.log(`[SMS Mock] Body: ${body}`);
    return { sid: 'mock-message-sid' };
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!fromNumber && !messagingServiceSid) {
    throw new Error("Either TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID must be set");
  }

  const messageOptions: any = {
    to,
    body,
  };

  if (messagingServiceSid) {
    messageOptions.messagingServiceSid = messagingServiceSid;
  } else {
    messageOptions.from = fromNumber;
  }

  try {
    const twilioClient = getTwilioClient();
    const message = await twilioClient.messages.create(messageOptions);
    console.log(`SMS sent to ${to}: ${message.sid}`);
    return message;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
}
