// pages/api/chat.js
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai'; 

// This handles incoming POST requests from the React chat frontend
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { messages } = req.body;

  // Set up the system prompt to impersonate the Knockout CFO based on the PDF logic
  const systemPrompt = `You are an AI Financial Analyst for 'Knockout'. Keep answers concise. Connect your answers to QuickBooks data logic (mocked for now, assume Gross Profit is 58.4%, Direct LER target is 3.0x). Answer questions regarding Marketing, Fuel, and Net Income goals professionally.`;

  try {
    const result = await streamText({
      model: openai('gpt-4o'), // Or gemini-1.5-pro
      system: systemPrompt,
      messages,
    });

    // Stream the AI response back to the client
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    result.pipeDataStreamToResponse(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
}
