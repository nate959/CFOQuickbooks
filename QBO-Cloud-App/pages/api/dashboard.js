export const config = {
  runtime: 'edge', // Serverless edge function for blazing fast analytics
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
    // 2. Fetch the massive detailed matrix natively from Intuit (summarized by month for trend analysis)
    const qboRes = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65&summarize_column_by=Month`, {
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
    
    // 3. The CEO Omni-Extraction Engine
    let totalIncome = 0;
    let totalExpenses = 0;
    let grossProfit = 0;
    let netIncome = 0;

    let labels = [];
    let incomeTrend = [];
    let netTrend = [];
    let expensePie = {
        'Labor & Payroll': 0,
        'Marketing & Comm': 0,
        'Auto & Travel': 0,
        'Software & Tools': 0,
        'Other Expenses': 0
    };

    // Extract chronological month labels natively dynamically
    if (qboData.Columns && qboData.Columns.Column) {
        labels = qboData.Columns.Column.slice(1, -1).map(c => c.ColTitle);
    }

    // Advanced recursive ledger crawler to traverse Intuit's deeply nested sub-accounts
    function scrapeRows(rows, inExp) {
        if (!rows || !rows.Row) return;
        
        rows.Row.forEach(row => {
            let currentExp = inExp;
            
            // Check headers to detect if we've entered an Expense or COGS matrix group
            if (row.Header && row.Header.ColData && row.Header.ColData[0]) {
                const cat = row.Header.ColData[0].value.toLowerCase();
                if (cat.includes('expense') || cat.includes('cost of goods sold') || cat.includes('cogs')) currentExp = true;
                else if (cat.includes('income')) currentExp = false;
            }
            
            // Scrape Master Summary rows for High-Level UI visual KPIs
            if (row.Summary && row.Summary.ColData && row.Summary.ColData.length >= 2) {
                const label = row.Summary.ColData[0].value.toLowerCase();
                const ytdValue = parseFloat(row.Summary.ColData[row.Summary.ColData.length - 1].value) || 0;
                const monthlyValues = row.Summary.ColData.slice(1, -1).map(col => parseFloat(col.value) || 0);

                if (label.includes("total income")) { totalIncome = ytdValue; incomeTrend = monthlyValues; }
                if (label.includes("total expenses") || label.includes("total cost of goods sold")) totalExpenses += ytdValue;
                if (label.includes("gross profit")) grossProfit = ytdValue;
                if (label.includes("net income") || label.includes("net operating income")) { netIncome = ytdValue; netTrend = monthlyValues; }
            }
            
            // Scrape granular 'Itty Bitty Things' individually and safely categorize them for the Doughtnut Pie Chart
            if (row.type === 'Data' && row.ColData && currentExp) {
                const label = row.ColData[0].value.toLowerCase();
                const ytdValue = parseFloat(row.ColData[row.ColData.length - 1].value) || 0; // Use YTD value for pie
                
                if (label.includes("payroll") || label.includes("wage") || label.includes("salar") || label.includes("contract") || label.includes("1099") || label.includes("labor") || label.includes("officer") || label.includes("inspector") || label.includes("compensation")) {
                    expensePie['Labor & Payroll'] += ytdValue;
                } else if (label.includes("advertis") || label.includes("market") || label.includes("promot") || label.includes("seo") || label.includes("lead") || label.includes("google") || label.includes("yelp")) {
                    expensePie['Marketing & Comm'] += ytdValue;
                } else if (label.includes("gas") || label.includes("fuel") || label.includes("auto") || label.includes("vehic") || label.includes("travel") || label.includes("mileage") || label.includes("maintenance")) {
                    expensePie['Auto & Travel'] += ytdValue;
                } else if (label.includes("software") || label.includes("spectora") || label.includes("app") || label.includes("comput") || label.includes("internet") || label.includes("tech") || label.includes("subscription")) {
                    expensePie['Software & Tools'] += ytdValue;
                } else {
                    expensePie['Other Expenses'] += ytdValue;
                }
            }
            
            // Dig endlessly deeper into sub-contractor accounts unconditionally
            if (row.Rows) scrapeRows(row.Rows, currentExp);
        });
    }

    if (qboData.Rows) {
        scrapeRows(qboData.Rows, false);
    }

    // 4. Send the completely formatted Master Graph payload back to React
    return new Response(JSON.stringify({
      totalIncome,
      totalExpenses,
      grossProfit,
      netIncome,
      labels,
      incomeTrend,
      netTrend,
      expensePie
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Dashboard Server Error:", error);
    return new Response(JSON.stringify({ error: "Server encountered an error parsing Intuit Data." }), { status: 500 });
  }
}
