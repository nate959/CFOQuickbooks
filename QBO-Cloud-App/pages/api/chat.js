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
          let qboRes = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65`, {
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
          });

          // Unofficial intelligent Sandbox Fallback logic (Vercel hides URL bindings)
          if (!qboRes.ok) {
              const sandboxRes = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65`, {
                  headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
              });
              if (sandboxRes.ok || sandboxRes.status === 200) {
                 qboRes = sandboxRes;
                 isSandbox = true;
              }
          }
          
          if (qboRes.ok) {
              const qboData = await qboRes.json();
              qboContext = `LIVE QUICKBOOKS YTD DATA ${isSandbox ? "(SANDBOX MODE test-data)" : "(PRODUCTION LIVE DATA)"}:\n`;
              // Extract the top level summary rows (Gross Profit, Total Expenses, Net Income)
              if (qboData.Rows && qboData.Rows.Row) {
                  qboData.Rows.Row.forEach(row => {
                      if (row.Summary && row.Summary.ColData && row.Summary.ColData.length >= 2) {
                          qboContext += `- ${row.Summary.ColData[0].value}: $${row.Summary.ColData[1].value}\n`;
                      }
                  });
              }
          } else {
              const errBody = await qboRes.text();
              qboContext = `Error: Intuit API physically rejected the connection. HTTP Status: ${qboRes.status}. Exact Intuit JSON Response: ${errBody}`;
          }
      } catch (e) {
          console.error("QBO Fetch Error:", e);
      }
  }

  // Set up the system prompt to impersonate the Knockout CFO
  const systemPrompt = `You are a strict, top-tier AI Financial Analyst for 'Knockout'. Keep answers incredibly concise and professional. 

Below is the literal, live Profit & Loss data synced right now from the user's QuickBooks Online:
---
${qboContext}
---
When answering questions regarding their deposits, gross profit, expenses, or net income, you MUST use the exact numbers printed above. Do not invent numbers.`;

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
