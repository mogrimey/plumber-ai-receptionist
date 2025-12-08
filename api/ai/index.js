import OpenAI from "openai";

export async function POST(req) {
  try {
    const body = await req.json();

    const contactId = body.id; // matches your webhook body
    const fromNumber = "+19706496635"; // your plumbing number
    const locationId = "YmyNRWyTceG1JbtLzvs7"; // set manually

    if (!contactId) {
      return Response.json({ error: "Missing contactId" }, { status: 400 });
    }

    // --------------------------------------------
    // 1. FETCH LAST INBOUND SMS FROM THIS CONTACT
    // --------------------------------------------
    const msgResponse = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages/?contactId=${contactId}&limit=1`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.GHL_API_KEY}`,
          "Version": "2021-07-28",
          "Content-Type": "application/json"
        }
      }
    );

    const msgData = await msgResponse.json();

    const lastMessage = msgData?.messages?.[0]?.message || "";

    // Safety fallback
    const userMessage = lastMessage || "Hello";

    // --------------------------------------------
    // 2. GENERATE AI REPLY
    // --------------------------------------------
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const fullPrompt = `
You are the texting receptionist for a small local plumbing company called Aspen Plumbing.
You sound like a real human, not a bot. NEVER admit you're AI.

Tone: warm, friendly, short messages.
Reply naturally to the customer's text.

Customer message:
"${userMessage}"
    `;

    const aiResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: fullPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 120,
    });

    const replyText = aiResponse.choices[0].message.content.trim();

    // --------------------------------------------
    // 3. SEND SMS BACK THROUGH GHL
    // --------------------------------------------
    const ghlResponse = await fetch(
      "https://services.leadconnectorhq.com/conversations/messages",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GHL_API_KEY}`,
          "Version": "2021-07-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          locationId,
          contactId,
          type: "SMS",
          message: replyText,
          from: fromNumber
        })
      }
    );

    const ghlData = await ghlResponse.json();

    return Response.json({
      success: true,
      received: userMessage,
      reply: replyText,
      ghl: ghlData
    });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
