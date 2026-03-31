import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Force Vercel Rebuild
export default function Home() {
  const [qboConnected, setQboConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  // CEO Metrics State
  const [kpis, setKpis] = useState({ 
      totalIncome: 0, totalExpenses: 0, grossProfit: 0, netIncome: 0,
      labels: [], incomeTrend: [], expenseTrend: [], netTrend: [], ytdAccumulatedProfit: [], cashTrend: [],
      expensePie: {'Labor & Payroll': 0, 'Marketing & Comm': 0, 'Auto & Travel': 0, 'Software & Tools': 0, 'Other Expenses': 0}
  });
  const [kpiLoading, setKpiLoading] = useState(true);
  
  // 6 Matrix System Refs
  const monthChartRef = useRef(null);
  const ytdChartRef = useRef(null);
  const cashFlowChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const monthProfitChartRef = useRef(null);
  const cashBurnChartRef = useRef(null);

  const monthChartInstance = useRef(null);
  const ytdChartInstance = useRef(null);
  const cashFlowChartInstance = useRef(null);
  const pieChartInstance = useRef(null);
  const monthProfitChartInstance = useRef(null);
  const cashBurnChartInstance = useRef(null);

  const handleInputChange = (e) => setInput(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { id: Date.now(), role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: newMessages })
      });
      
      const responseText = await res.text();
      setMessages([...newMessages, { id: Date.now() + 1, role: 'assistant', content: responseText }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { id: Date.now() + 1, role: 'assistant', content: "Error connecting to CFO Brain." }]);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('qboConnected') === 'true') {
      setQboConnected(true);
    }
  }, []);

  // Fetch Full Executive Data (Dual Endpoints API)
  useEffect(() => {
    if (qboConnected) {
      setKpiLoading(true);
      fetch('/api/dashboard', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (!data.error) setKpis(data);
            setKpiLoading(false);
        })
        .catch(err => {
            console.error(err);
            setKpiLoading(false);
        });
    }
  }, [qboConnected]);

  // Hook Master Graphics Logic for 4 QUADRANTS
  useEffect(() => {
      if (!kpiLoading && monthChartRef.current && qboConnected) {
          
          Object.values({monthChartInstance, ytdChartInstance, cashFlowChartInstance, pieChartInstance, monthProfitChartInstance, cashBurnChartInstance}).forEach(inst => {
              if (inst.current) inst.current.destroy();
          });

          const defaultLabels = kpis.labels && kpis.labels.length ? kpis.labels : ['No Data'];
          const zeroData = [0];

          // 1. Month-to-Month Operational Profit (Bar Chart)
          monthChartInstance.current = new Chart(monthChartRef.current, {
              type: 'bar',
              data: {
                  labels: defaultLabels,
                  datasets: [
                      {
                          label: 'Income',
                          data: kpis.incomeTrend && kpis.incomeTrend.length ? kpis.incomeTrend : zeroData,
                          backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
                      },
                      {
                          label: 'Expenses',
                          data: kpis.expenseTrend && kpis.expenseTrend.length ? kpis.expenseTrend : zeroData,
                          backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
                      }
                  ]
              },
              options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.7)' } } },
                  scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.5)', callback: function(val) { return '$' + val; } } },
                            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } } }
              }
          });

          // 2. YTD Profit Accumulation (Line Chart)
          ytdChartInstance.current = new Chart(ytdChartRef.current, {
              type: 'line',
              data: {
                  labels: defaultLabels,
                  datasets: [{
                      label: 'YTD Accumulated Profit',
                      data: kpis.ytdAccumulatedProfit && kpis.ytdAccumulatedProfit.length ? kpis.ytdAccumulatedProfit : zeroData,
                      borderColor: 'rgba(59, 130, 246, 1)', // Blue Flow
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      fill: true, tension: 0.4, borderWidth: 3, pointRadius: 2
                  }]
              },
              options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.7)' } } },
                  scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.5)', callback: function(val) { return '$' + val; } } },
                            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } } }
              }
          });

          // 3. Physical Cash Flow Realities (Bar/Line Chart comparing Profit vs Bank Cash)
          cashFlowChartInstance.current = new Chart(cashFlowChartRef.current, {
              type: 'bar', // Using bar base to overlay net profit points
              data: {
                  labels: defaultLabels,
                  datasets: [
                      {
                          type: 'bar',
                          label: 'Net Operating Cash (Bank)',
                          data: kpis.cashTrend && kpis.cashTrend.length ? kpis.cashTrend : zeroData,
                          backgroundColor: kpis.cashTrend.map(val => val < 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.6)'),
                          borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1
                      },
                      {
                          type: 'line',
                          label: 'Paper Net Profit',
                          data: kpis.netTrend && kpis.netTrend.length ? kpis.netTrend : zeroData,
                          borderColor: 'rgba(245, 158, 11, 1)', // Orange/Yellow
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          tension: 0.3, fill: false, borderWidth: 3
                      }
                  ]
              },
              options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.7)' } }, tooltip: { mode: 'index', intersect: false } },
                  scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } } }
              }
          });

          // 4. Granular Operating Bleed (Pie Chart)
          const pieData = Object.values(kpis.expensePie || {});
          const pieLabels = Object.keys(kpis.expensePie || {});
          
          pieChartInstance.current = new Chart(pieChartRef.current, {
              type: 'doughnut',
              data: {
                  labels: pieLabels,
                  datasets: [{
                      data: pieData.some(v => v > 0) ? pieData : [1],
                      backgroundColor: ['rgba(239,68,68,0.85)', 'rgba(59,130,246,0.85)', 'rgba(245,158,11,0.85)', 'rgba(168,85,247,0.85)', 'rgba(107,114,128,0.85)'],
                      borderColor: 'rgba(0,0,0,0.5)', borderWidth: 1
                  }]
              },
              options: {
                  responsive: true, maintainAspectRatio: false, cutout: '75%',
                  plugins: { legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.7)', padding: 10, font: {size: 10} } } }
              }
          });

          // 5. Month-to-Month Net Profit (Bar Graph)
          monthProfitChartInstance.current = new Chart(monthProfitChartRef.current, {
              type: 'bar',
              data: {
                  labels: defaultLabels,
                  datasets: [{
                      label: 'Pure Net Profit',
                      data: kpis.netTrend && kpis.netTrend.length ? kpis.netTrend : zeroData,
                      backgroundColor: (context) => {
                          const val = context.raw || 0;
                          return val < 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
                      },
                      borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1
                  }]
              },
              options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.7)' } } },
                  scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.5)', callback: function(val) { return '$' + val; } } },
                            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } } }
              }
          });

          // 6. Monthly Cash Burn / Flow (Bar Graph)
          cashBurnChartInstance.current = new Chart(cashBurnChartRef.current, {
              type: 'bar',
              data: {
                  labels: defaultLabels,
                  datasets: [{
                      label: 'Monthly Net Cash Position',
                      data: kpis.cashTrend && kpis.cashTrend.length ? kpis.cashTrend : zeroData,
                      backgroundColor: (context) => {
                          const val = context.raw || 0;
                          return val < 0 ? 'rgba(244, 114, 182, 0.8)' : 'rgba(14, 165, 233, 0.8)'; // Pink burn, Blue flow
                      },
                      borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1
                  }]
              },
              options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.7)' } } },
                  scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.5)', callback: function(val) { return '$' + val; } } },
                            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } } }
              }
          });
      }
      return () => { 
          Object.values({monthChartInstance, ytdChartInstance, cashFlowChartInstance, pieChartInstance, monthProfitChartInstance, cashBurnChartInstance}).forEach(inst => {
              if (inst.current) inst.current.destroy();
          });
      }
  }, [kpis, kpiLoading, qboConnected]);

  if (!qboConnected) {
    return (
      <div className="flex z-10 items-center justify-center min-h-screen flex-col slide-down">
         <i className="fa-solid fa-chart-pie text-greenaccent text-6xl mb-6"></i>
         <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-greenaccent">Knockout Executive Dashboard</h1>
         <p className="text-gray-400 mb-8 max-w-md text-center">To authorize the Advanced 4-Quadrant Matrix Suite, securely connect your QuickBooks Online Production module.</p>
         
         <a href="/api/auth" className="glass-panel px-8 py-4 rounded-full text-lg font-semibold hover:border-greenaccent transition-colors flex items-center gap-3 shadow-[0_0_15px_rgba(0,255,204,0.3)] hover:shadow-[0_0_25px_rgba(0,255,204,0.6)] cursor-pointer">
            <i className="fa-solid fa-link"></i> Sync Live Data Streams
         </a>
      </div>
    );
  }

  // Calculate dynamic CEO % metrics & Cash Flow Totals
  const netMargin = kpis.totalIncome ? ((kpis.netIncome / kpis.totalIncome) * 100).toFixed(1) : 0;
  const payrollCost = kpis.expensePie ? kpis.expensePie['Labor & Payroll'] : 0;
  const laborRatio = kpis.totalIncome ? ((payrollCost / kpis.totalIncome) * 100).toFixed(1) : 0;
  
  const ytdNetCashFlow = kpis.cashTrend && kpis.cashTrend.length ? kpis.cashTrend.reduce((a, b) => a + b, 0) : 0;
  const avgMonthlyCashFlow = kpis.cashTrend && kpis.cashTrend.length ? (ytdNetCashFlow / kpis.cashTrend.length) : 0;

  return (
    <div className="flex h-screen relative z-10 slide-left">
        {/* Left Sidebar: AI Server Chat */}
        <div className="w-1/3 bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-greenaccent">AI Executive CFO</h2>
                <div className="text-xs text-greenaccent animate-pulse"><i className="fa-solid fa-server mr-1"></i> Promise.All Online</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                <div className="ai-message glass-message p-4 rounded-2xl w-11/12 shadow-md mb-4 bg-blue-900/20 border border-blue-500/30">
                  <p className="text-sm font-semibold text-blue-300">Dual Matrix Synchronized.</p>
                  <p className="text-sm text-gray-300 mt-2">I am now fetching the Statement of Cash Flows directly alongside the Core P&L. I can literally cross-verify the speed of physical cash entering the account vs theoretical operations. Ask me anything.</p>
                </div>
                {messages.map(m => (
                    <div key={m.id} className={m.role === 'user' ? "user-message p-3 rounded-2xl rounded-tr-sm ml-auto max-w-[85%] text-sm" : "ai-message glass-message p-4 rounded-2xl rounded-tl-sm w-11/12 shadow-md mb-4"}>
                        {m.role === 'user' ? m.content : (
                           <div className="flex gap-2 text-sm"><i className="fa-solid fa-robot text-greenaccent mt-1"></i> <span>{m.content}</span></div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-6 border-t border-white/10 bg-black/20">
                <form onSubmit={handleSubmit} className="relative group">
                    <input value={input} onChange={handleInputChange} className="w-full bg-white/5 border border-gray-600 text-white text-sm rounded-full px-5 py-4 outline-none focus:border-greenaccent focus:bg-white/10 transition-all shadow-inner" placeholder="Ask about specific cash anomalies..." />
                    <button type="submit" className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-blue-600 to-green-600 px-4 rounded-full hover:shadow-[0_0_15px_#22c55e] transition-all flex justify-center items-center">
                        <i className="fa-solid fa-paper-plane text-white lg:text-sm"></i>
                    </button>
                </form>
            </div>
        </div>

        {/* Right Executive CEO Suite (4-QUADRANT) */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
             <header className="flex justify-between items-center mb-8 glass-panel p-4 rounded-xl shadow-lg border-b border-blue-400/30">
                <div className="flex items-center gap-3">
                    <i className="fa-solid fa-network-wired text-blue-400 text-2xl"></i>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">4-Quadrant Command Center</h1>
                </div>
            </header>
            
            <div className="grid grid-cols-3 gap-4 mb-6 relative z-10 w-full">
                {/* Total Income KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-[0_0_10px_rgba(0,0,0,0.5)] border-t-2 border-green-500">
                    <h3 className="text-gray-400 text-[10px] xl:text-xs uppercase tracking-wider font-semibold mb-1">YTD Gross Revenue</h3>
                    <div className="flex items-end mt-2"><span className="text-xl xl:text-2xl font-bold text-green-400">{kpiLoading ? '...' : `$${kpis.totalIncome.toLocaleString()}`}</span></div>
                </div>
                {/* LER KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-[0_0_10px_rgba(0,0,0,0.5)] border-t-2 border-blue-500">
                    <h3 className="text-gray-400 text-[10px] xl:text-xs uppercase tracking-wider font-semibold mb-1">Labor Efficiency (&lt;30% TGT)</h3>
                    <div className="flex items-end mt-2">
                        <span className={`text-xl xl:text-2xl font-bold ${parseFloat(laborRatio) > 30 ? 'text-red-400' : 'text-blue-400'}`}>{kpiLoading ? '...' : `${laborRatio}%`}</span>
                    </div>
                </div>
                {/* Expenses KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-[0_0_10px_rgba(0,0,0,0.5)] border-t-2 border-red-500">
                    <h3 className="text-gray-400 text-[10px] xl:text-xs uppercase tracking-wider font-semibold mb-1">YTD Operating Bleed</h3>
                    <div className="flex items-end mt-2"><span className="text-xl xl:text-2xl font-bold text-red-400">{kpiLoading ? '...' : `$${kpis.totalExpenses.toLocaleString()}`}</span></div>
                </div>
                {/* Margin KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-[0_0_10px_rgba(0,0,0,0.5)] border-t-2 border-purple-500">
                    <h3 className="text-gray-400 text-[10px] xl:text-xs uppercase tracking-wider font-semibold mb-1">Net Operating Margin</h3>
                    <div className="flex items-end mt-2"><span className="text-xl xl:text-2xl font-bold text-purple-400">{kpiLoading ? '...' : `${netMargin}%`}</span></div>
                </div>
                {/* YTD Cash Flow KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-[0_0_10px_rgba(0,0,0,0.5)] border-t-2 border-yellow-500">
                    <h3 className="text-gray-400 text-[10px] xl:text-xs uppercase tracking-wider font-semibold mb-1">YTD Net Physical Cash Flow</h3>
                    <div className="flex items-end mt-2"><span className={`text-xl xl:text-2xl font-bold ${ytdNetCashFlow < 0 ? 'text-pink-400' : 'text-yellow-400'}`}>{kpiLoading ? '...' : `$${ytdNetCashFlow.toLocaleString()}`}</span></div>
                </div>
                {/* Avg Cash Burn KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-[0_0_10px_rgba(0,0,0,0.5)] border-t-2 border-cyan-500">
                    <h3 className="text-gray-400 text-[10px] xl:text-xs uppercase tracking-wider font-semibold mb-1">Avg Monthly Cash Flow</h3>
                    <div className="flex items-end mt-2"><span className={`text-xl xl:text-2xl font-bold ${avgMonthlyCashFlow < 0 ? 'text-pink-500' : 'text-cyan-400'}`}>{kpiLoading ? '...' : `$${avgMonthlyCashFlow.toLocaleString(undefined, {maximumFractionDigits:0})}`}</span></div>
                </div>
            </div>
            
            {/* 6-PANEL UI LAYOUT MASTER GRID */}
            <div className="grid grid-cols-2 gap-6 relative z-10 pb-12">
                {/* QUADRANT 1: Month-to-Month Dynamics */}
                <div className="glass-panel p-5 rounded-xl col-span-1 h-[320px] flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.3)] border-t border-gray-600/30">
                    <h3 className="text-gray-300 font-bold mb-3 flex items-center gap-2 text-sm"><i className="fa-solid fa-align-left text-green-400"></i> Month-to-Month Performance</h3>
                    <div className="flex-1 relative">
                        {kpiLoading ? <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-xs">Extracting Monthly Vectors...</div> : <canvas ref={monthChartRef}></canvas>}
                    </div>
                </div>

                {/* QUADRANT 2: YTD Accumulating Mass */}
                <div className="glass-panel p-5 rounded-xl col-span-1 h-[320px] flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.3)] border-t border-blue-600/30">
                    <h3 className="text-gray-300 font-bold mb-3 flex items-center gap-2 text-sm"><i className="fa-solid fa-chart-area text-blue-500"></i> YTD Profit Trajectory</h3>
                    <div className="flex-1 relative">
                        {kpiLoading ? <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-xs">Charting Profit Velocity...</div> : <canvas ref={ytdChartRef}></canvas>}
                    </div>
                </div>

                {/* PANEL 3: Pure Month-to-Month Net Profit */}
                <div className="glass-panel p-5 rounded-xl col-span-1 h-[320px] flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.3)] border-t border-emerald-600/30">
                    <h3 className="text-gray-300 font-bold mb-3 flex items-center gap-2 text-sm"><i className="fa-solid fa-chart-simple text-emerald-400"></i> Pure Monthly Net Profit</h3>
                    <div className="flex-1 relative">
                        {kpiLoading ? <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-xs">Isolating Profit Matrices...</div> : <canvas ref={monthProfitChartRef}></canvas>}
                    </div>
                </div>

                {/* PANEL 4: Cash Flow vs Burn Isolated */}
                <div className="glass-panel p-5 rounded-xl col-span-1 h-[320px] flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.3)] border-t border-cyan-600/30">
                    <h3 className="text-gray-300 font-bold mb-3 flex items-center gap-2 text-sm"><i className="fa-solid fa-money-bill-transfer text-cyan-400"></i> Monthly Cash Flow vs Burn Sandbox</h3>
                    <div className="flex-1 relative">
                        {kpiLoading ? <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-xs">Liquidating Vectors...</div> : <canvas ref={cashBurnChartRef}></canvas>}
                    </div>
                </div>

                {/* QUADRANT 5: The True Cash Flow Statement */}
                <div className="glass-panel p-5 rounded-xl col-span-1 h-[320px] flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.3)] border-t border-yellow-600/30">
                    <h3 className="text-gray-300 font-bold mb-3 flex items-center gap-2 text-sm"><i className="fa-solid fa-coins text-yellow-500"></i> Physical Cash Flow Reality</h3>
                    <div className="flex-1 relative">
                        {kpiLoading ? <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-xs">Ripping Cash Ledgers...</div> : <canvas ref={cashFlowChartRef}></canvas>}
                    </div>
                </div>

                {/* QUADRANT 6: The Operating Bleed Heatmap */}
                <div className="glass-panel p-5 rounded-xl col-span-1 h-[320px] flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.3)] border-t border-red-600/30">
                    <h3 className="text-gray-300 font-bold mb-3 flex items-center gap-2 text-sm"><i className="fa-solid fa-fire text-red-500"></i> Visual Operating Expense Distribution</h3>
                    <div className="flex-1 relative">
                         {kpiLoading ? <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-xs">Sorting Accounts...</div> : <canvas ref={pieChartRef}></canvas>}
                    </div>
                </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-600 font-mono mb-6">
                Dual Promise API Active // True Physical Cash Tracking vs Ledger Profits Enabled
            </div>
        </div>
    </div>
  );
}
