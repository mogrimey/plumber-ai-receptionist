import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure JSON body parsing
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("INCOMING BODY:", req.body);

    // Normalize message to ALWAYS be a string
    let rawMessage = req.body?.message;

    // Convert arrays or objects into a readable string
    let message =
      typeof rawMessage === "string"
        ? rawMessage
        : JSON.stringify(rawMessage);

    if (!message) message = "Hello";

    // Call OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: message, // ALWAYS a string now
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
