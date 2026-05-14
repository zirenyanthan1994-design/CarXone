import { NextResponse } from 'next/server';

// This is your secure backend. No hackers can see this code!
export async function POST(request: Request) {
  try {
    // 1. Receive the whisper from the frontend
    const body = await request.json();
    const { type, vendorPhone, customerPhone, customerDetails, vendorDetails, vehicleName } = body;

    // 2. Draft the messages based on the "type" of event
    let targetPhone = "";
    let finalMessage = "";

    if (type === "NEW_BOOKING") {
      // Message to Vendor
      targetPhone = vendorPhone;
      finalMessage = `🚨 *New Booking Request!*\n\nYou have a new request for your ${vehicleName}.\n\n*Customer Details:*\n${customerDetails}\n\nPlease log in to your CarXone Partner Dashboard to verify the payment and confirm the booking!`;
    } 
    else if (type === "BOOKING_CONFIRMED") {
      // Message to Customer
      targetPhone = customerPhone;
      finalMessage = `✅ *Booking Confirmed!*\n\nGreat news! Your booking for the ${vehicleName} is confirmed.\n\n*Vendor Details:*\n${vendorDetails}\n\nPlease contact them directly to coordinate your pickup!`;
    }

    // 3. SEND TO WHATSAPP API (Example using standard fetch)
    // NOTE: You will replace the URL and Authorization Bearer with your actual provider (Twilio, Meta, etc.)
    /*
    await fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer YOUR_SECRET_WHATSAPP_API_TOKEN`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: targetPhone,
        type: "text",
        text: { body: finalMessage }
      })
    });
    */

    // 4. Tell the frontend it was a success!
    console.log(`SUCCESS: Simulated WhatsApp sent to ${targetPhone}`);
    return NextResponse.json({ success: true, message: "WhatsApp sent!" });

  } catch (error) {
    console.error("WhatsApp Engine Error:", error);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}