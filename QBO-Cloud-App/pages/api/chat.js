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

  // Read Secure Cookies for QBO Keys
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').filter(Boolean).map(c => c.split('=')));
  const accessToken = cookies.qbo_access_token;
  const realmId = cookies.qbo_realm_id;

  // Dynamically fetch live QBO Data
  let qboContext = "No live QuickBooks data available.";
  if (accessToken && realmId) {
      try {
          // Attempt Intuit Production YTD Profit & Loss Report endpoint
          let isSandbox = false;
          let qboRes = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65&summarize_column_by=Month`, {
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
          });

          if (qboRes.ok) {
              const qboData = await qboRes.json();
              qboContext = `LIVE QUICKBOOKS MASTER LEDGER JSON (PRODUCTION ACTUALS):\n`;
              // Dump the ENTIRE RAW JSON MATRIX for God-Mode AI Analysis
              qboContext += JSON.stringify({
                  Header: qboData.Header,
                  Columns: qboData.Columns,
                  Rows: qboData.Rows
              });
          } else {
              const errBody = await qboRes.text();
              qboContext = `Error: Intuit API physically rejected the connection. HTTP Status: ${qboRes.status}. Exact Intuit JSON Response: ${errBody}`;
          }
      } catch (e) {
          console.error("QBO Fetch Error:", e);
      }
  }

  // Set up the omniscient system prompt
  const systemPrompt = `You are a brilliant, elite AI Chief Financial Officer for a home inspection company called 'Knockout'. Keep answers incredibly concise, professional, and directly actionable.

Critically analyze this raw, massive Intuit QuickBooks JSON dataset synced physically live from the user's actual 12-Month Profit & Loss ledger:
---
${qboContext}
---
INTRUCTIONS FOR READING THE JSON:
1. The 'Columns' array defines the column mapping. Column index 0 is the Account Name. Every subsequent column matches a specific historical Month ending in the final column which is the YTD Total.
2. The 'Rows' array contains deeply nested sub-accounts (e.g. Payroll, Advertising, Fuel, Subscriptions).
3. If the user asks about ANY historic specific expense (e.g. "What was our payroll in March?"), smoothly traverse the dense ColData arrays to extract that exact value string and formulate a perfect business-analysis response. Do not invent numbers. Answer dynamically and autonomously based exclusively on the JSON structure provided.`;

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
