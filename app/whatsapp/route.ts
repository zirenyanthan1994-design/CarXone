import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // <-- Add this line

// ==========================================
// 1. GET ROUTE: FOR META WEBHOOK VERIFICATION
// ==========================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // This checks the password you set in your .env.local file
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ==========================================
// 2. POST ROUTE: FOR SENDING & RECEIVING
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ---------------------------------------------------------
    // A. Handle incoming Meta Webhook pings (Read receipts, etc.)
    // ---------------------------------------------------------
    // Meta will periodically send POST requests here. This catches them so your server doesn't crash.
    if (body.object === 'whatsapp_business_account') {
      console.log("Received incoming webhook event from Meta");
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ---------------------------------------------------------
    // B. Your existing logic for sending messages from frontend
    // ---------------------------------------------------------
    const { type, vendorPhone, customerPhone, customerDetails, vendorDetails, vehicleName } = body;

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    let targetPhone = "";
    let templateName = "";
    let parameters = [];

    if (type === "NEW_BOOKING") {
      targetPhone = vendorPhone;
      templateName = "new_booking_alert"; // Must exactly match your Meta template name
      parameters = [
        { type: "text", text: vehicleName },
        { type: "text", text: customerDetails }
      ];
    } else if (type === "BOOKING_CONFIRMED") {
      targetPhone = customerPhone;
      templateName = "booking_confirmed"; // Must exactly match your Meta template name
      parameters = [
        { type: "text", text: vehicleName },
        { type: "text", text: vendorDetails }
      ];
    } else {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Send the formatted template to Meta Graph API
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: targetPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' }, // Ensure this matches your template language code
          components: [
            {
              type: "body",
              parameters: parameters
            }
          ]
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
      return NextResponse.json({ success: false, error: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}