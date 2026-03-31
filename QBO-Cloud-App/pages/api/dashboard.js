export const config = {
  runtime: 'edge', // Serverless edge function for instant dashboard loading
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 1. Intercept the secure QBO cookies
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').filter(Boolean).map(c => c.split('=')));
  const accessToken = cookies.qbo_access_token;
  const realmId = cookies.qbo_realm_id;

  if (!accessToken || !realmId) {
    return new Response(JSON.stringify({ error: "QuickBooks Not Connected" }), { status: 401 });
  }

  try {
    // 2. Fetch the actual YTD Profit & Loss statement natively from Intuit Production
    const qboRes = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!qboRes.ok) {
      const errBody = await qboRes.text();
      console.error("Dashboard Fetch Error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to read QBO Data" }), { status: 500 });
    }

    const qboData = await qboRes.json();
    
    // 3. Extract exact metrics for charting and KPIs
    let totalIncome = 0;
    let totalExpenses = 0;
    let grossProfit = 0;
    let netIncome = 0;

    if (qboData.Rows && qboData.Rows.Row) {
      qboData.Rows.Row.forEach(row => {
        if (row.Summary && row.Summary.ColData && row.Summary.ColData.length >= 2) {
          const label = row.Summary.ColData[0].value.toLowerCase();
          const value = parseFloat(row.Summary.ColData[1].value) || 0;
          
          if (label.includes("total income")) totalIncome = value;
          if (label.includes("total expenses")) totalExpenses = value;
          if (label.includes("gross profit")) grossProfit = value;
          if (label.includes("net income") || label.includes("net operating income")) netIncome = value;
        }
      });
    }

    // 4. Send structured JSON payload back to the React UI
    return new Response(JSON.stringify({
      totalIncome,
      totalExpenses,
      grossProfit,
      netIncome
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Dashboard Server Error:", error);
    return new Response(JSON.stringify({ error: "Server encountered an error parsing Intuit Data." }), { status: 500 });
  }
}
