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
    // 2. Fetch BOTH Profit & Loss AND Cash Flow Statements simultaneously
    const [pnlRes, cashFlowRes] = await Promise.all([
      fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss?minorversion=65&summarize_column_by=Month`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      }),
      fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/CashFlow?minorversion=65&summarize_column_by=Month`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      })
    ]);

    if (!pnlRes.ok) {
      const errBody = await pnlRes.text();
      console.error("Dashboard P&L Fetch Error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to read QBO P&L Data" }), { status: 500 });
    }

    const qboData = await pnlRes.json();
    let cashFlowData = null;
    if (cashFlowRes.ok) {
        cashFlowData = await cashFlowRes.json();
    }
    
    // 3. The CEO Omni-Extraction Engine
    let totalIncome = 0;
    let totalExpenses = 0;
    let grossProfit = 0;
    let netIncome = 0;

    let labels = [];
    let incomeTrend = [];
    let expenseTrend = [];
    let netTrend = [];
    let ytdAccumulatedProfit = [];
    let cashTrend = [];
    
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

    // Advanced recursive ledger crawler for Profit & Loss
    function scrapePnlRows(rows, inExp) {
        if (!rows || !rows.Row) return;
        
        rows.Row.forEach(row => {
            let currentExp = inExp;
            
            // Check headers to detect if we've entered an Expense or COGS matrix group
            if (row.Header && row.Header.ColData && row.Header.ColData[0]) {
                const cat = row.Header.ColData[0].value.toLowerCase();
                if (cat.includes('expense') || cat.includes('cost of goods sold') || cat.includes('cogs')) currentExp = true;
                else if (cat.includes('income')) currentExp = false;
            }
            
            // Scrape Master Summary rows for High-Level UI visual KPIs and Trends
            if (row.Summary && row.Summary.ColData && row.Summary.ColData.length >= 2) {
                const label = row.Summary.ColData[0].value.toLowerCase();
                const ytdValue = parseFloat(row.Summary.ColData[row.Summary.ColData.length - 1].value) || 0;
                const monthlyValues = row.Summary.ColData.slice(1, -1).map(col => parseFloat(col.value) || 0);

                if (label.includes("total income")) { totalIncome = ytdValue; incomeTrend = monthlyValues; }
                if (label.includes("total expenses") || label.includes("total cost of goods sold")) { totalExpenses += ytdValue; expenseTrend = monthlyValues; }
                if (label.includes("gross profit")) grossProfit = ytdValue;
                if (label.includes("net income") || label.includes("net operating income")) { 
                    netIncome = ytdValue; 
                    netTrend = monthlyValues; 
                    
                    // Build YTD Accumulating Line
                    let runningTotal = 0;
                    ytdAccumulatedProfit = monthlyValues.map(val => {
                        runningTotal += val;
                        return runningTotal;
                    });
                }
            }
            
            // Scrape granular 'Itty Bitty Things' individually and safely categorize them for the Pie Chart
            if (row.type === 'Data' && row.ColData && currentExp) {
                const label = row.ColData[0].value.toLowerCase();
                const ytdValue = parseFloat(row.ColData[row.ColData.length - 1].value) || 0; 
                
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
            
            if (row.Rows) scrapePnlRows(row.Rows, currentExp);
        });
    }

    // Crawler for Cash Flow Matrix
    function scrapeCashFlowRows(rows) {
        if (!rows || !rows.Row) return;
        
        rows.Row.forEach(row => {
            if (row.Summary && row.Summary.ColData && row.Summary.ColData.length >= 2) {
                const label = row.Summary.ColData[0].value.toLowerCase();
                
                // We want specifically the Operating Cash Flow or Net Cash Increase
                if (label.includes("operating activities") || label.includes("cash and cash equivalents") || label.includes("net cash")) {
                    // Overwrite cashTrend with the lowest level master total we find. "Net cash increase" usually sits at the very bottom.
                    cashTrend = row.Summary.ColData.slice(1, -1).map(col => parseFloat(col.value) || 0);
                }
            }
            if (row.Rows) scrapeCashFlowRows(row.Rows);
        });
    }

    if (qboData.Rows) scrapePnlRows(qboData.Rows, false);
    if (cashFlowData && cashFlowData.Rows) scrapeCashFlowRows(cashFlowData.Rows);

    // If CashFlow API completely failed or is empty, fallback to Net Income array to prevent graph crashing
    if (cashTrend.length === 0 && netTrend.length > 0) {
        cashTrend = [...netTrend];
    }

    // 4. Send the massively expanded 4-Quadrant Graph payload back to React
    return new Response(JSON.stringify({
      totalIncome,
      totalExpenses,
      grossProfit,
      netIncome,
      labels,
      incomeTrend,
      expenseTrend,
      netTrend,
      ytdAccumulatedProfit,
      cashTrend,
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
