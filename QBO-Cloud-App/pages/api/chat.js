// Completely bypass Vercel SDK via raw fetch

export const config = {
  runtime: 'edge',
};

// This handles incoming POST requests from the React chat frontend
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Check for the Secret Key
  const secretKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!secretKey) return new Response("Error: API Key is completely missing from Vercel process.env", { status: 500 });

  const { messages } = await req.json();

  // Set up the system prompt to impersonate the Knockout CFO
  const systemPrompt = `You are an AI Financial Analyst for 'Knockout'. Keep answers concise. Connect your answers to QuickBooks data logic (mocked for now, assume Gross Profit is 58.4%, Direct LER target is 3.0x). Answer questions regarding Marketing, Fuel, and Net Income goals professionally.`;

  // Map messages into strict Gemini native format
  const geminiContents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  try {
    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: geminiContents
    };

    // Fire bare-metal HTTP Request directly to Google AI
    const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${secretKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await googleRes.json();

    if (!googleRes.ok) {
        throw new Error(data.error?.message || "Unknown Google API error");
    }

    const aiTextOutput = data.candidates[0].content.parts[0].text;

    // Natively return the complete evaluated text string to completely bypass Vercel's corrupted stream module
    return new Response(aiTextOutput, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate AI response' }), { status: 500, headers: {'Content-Type':'application/json'} });
  }
}
