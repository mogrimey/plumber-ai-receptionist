import OpenAI from "openai";

export async function POST(req) {
  try {
    const body = await req.json();

    const userMessage = body.message || "";
    const contactId = body.contactId;   // FIXED
    const locationId = body.locationId || "YmyNRWyTceG1JbtLzvs7";  
    const fromNumber = "+19706496635";

    if (!contactId) {
      return Response.json({ error: "Missing contactId" }, { status: 400 });
    }

    // 1. Generate AI reply
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const fullPrompt = `
You are the texting receptionist for a small local plumbing company called Aspen Plumbing.
You sound like a real human, not a bot. You NEVER say you're AI.

Tone: friendly, conversational, warm, calm. Keep messages short.

Incoming customer message:
"${userMessage}"

Respond as the AI texting receptionist.
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

    // 2. Send SMS through GHL
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
          locationId: locationId,
          contactId: contactId,
          type: "SMS",
          message: replyText,
          from: fromNumber
        })
      }
    );

    const ghlData = await ghlResponse.json();

    return Response.json({
      success: true,
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
