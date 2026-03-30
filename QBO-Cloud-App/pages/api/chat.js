// pages/api/chat.js
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const config = {
  runtime: 'edge',
};

// This handles incoming POST requests from the React chat frontend
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Explicitly pull the key at Request-Time to bypass Serverless Cold-Boot Caching
  const secretKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  
  const googleProvider = createGoogleGenerativeAI({
    apiKey: secretKey,
  });

  const { messages } = await req.json();

  // Set up the system prompt to impersonate the Knockout CFO based on the PDF logic
  const systemPrompt = `You are an AI Financial Analyst for 'Knockout'. Keep answers concise. Connect your answers to QuickBooks data logic (mocked for now, assume Gross Profit is 58.4%, Direct LER target is 3.0x). Answer questions regarding Marketing, Fuel, and Net Income goals professionally.`;

  try {
    const { text } = await generateText({
      model: googleProvider('gemini-2.5-flash'),
      system: systemPrompt,
      messages,
    });

    // Natively return the complete evaluated text string to completely bypass Vercel's corrupted stream module
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to generate AI response' }), { status: 500, headers: {'Content-Type':'application/json'} });
  }
}
