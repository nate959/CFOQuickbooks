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
      labels: [], incomeTrend: [], netTrend: [],
      expensePie: {'Labor & Payroll': 0, 'Marketing & Comm': 0, 'Auto & Travel': 0, 'Software & Tools': 0, 'Other Expenses': 0}
  });
  const [kpiLoading, setKpiLoading] = useState(true);
  
  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const lineChartInstance = useRef(null);
  const pieChartInstance = useRef(null);

  const handleInputChange = (e) => setInput(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { id: Date.now(), role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    try {
      // Send the entire conversation history to the backend
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

  // Check URL if QBO is connected after OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('qboConnected') === 'true') {
      setQboConnected(true);
    }
  }, []);

  // Fetch Full Executive Dashboard metrics
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

  // Hook Master Graphics Logic into Canvas
  useEffect(() => {
      if (!kpiLoading && lineChartRef.current && pieChartRef.current && qboConnected) {
          if (lineChartInstance.current) lineChartInstance.current.destroy();
          if (pieChartInstance.current) pieChartInstance.current.destroy();

          // 1. Line Chart (Month over Month Trend)
          lineChartInstance.current = new Chart(lineChartRef.current, {
              type: 'line',
              data: {
                  labels: kpis.labels && kpis.labels.length ? kpis.labels : ['Empty Ledger'],
                  datasets: [
                      {
                          label: 'Monthly Income',
                          data: kpis.incomeTrend && kpis.incomeTrend.length ? kpis.incomeTrend : [0],
                          borderColor: 'rgba(34, 197, 94, 1)',
                          backgroundColor: 'rgba(34, 197, 94, 0.2)',
                          fill: true, tension: 0.4, borderWidth: 2, pointRadius: 1
                      },
                      {
                          label: 'Operating Net',
                          data: kpis.netTrend && kpis.netTrend.length ? kpis.netTrend : [0],
                          borderColor: 'rgba(168, 85, 247, 1)',
                          backgroundColor: 'rgba(168, 85, 247, 0.2)',
                          fill: true, tension: 0.4, borderWidth: 2, pointRadius: 1
                      }
                  ]
              },
              options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.7)' } } },
                  scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: 'rgba(255,255,255,0.5)', callback: function(val) { return '$' + val; } } },
                      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } }
                  }
              }
          });

          // 2. Pie Chart (Granular Operating Bleed)
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
                  plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)', padding: 10, font: {size: 10} } } }
              }
          });
      }
      return () => { 
          if (lineChartInstance.current) lineChartInstance.current.destroy(); 
          if (pieChartInstance.current) pieChartInstance.current.destroy(); 
      }
  }, [kpis, kpiLoading, qboConnected]);

  if (!qboConnected) {
    return (
      <div className="flex z-10 items-center justify-center min-h-screen flex-col slide-down">
         <i className="fa-solid fa-chart-pie text-greenaccent text-6xl mb-6"></i>
         <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-greenaccent">Knockout CEO Dashboard</h1>
         <p className="text-gray-400 mb-8 max-w-md text-center">To get started, securely connect your live QuickBooks Online account to process your 'Budget vs Actual' KPIs.</p>
         
         <a href="/api/auth" className="glass-panel px-8 py-4 rounded-full text-lg font-semibold hover:border-greenaccent transition-colors flex items-center gap-3 shadow-[0_0_15px_rgba(0,255,204,0.3)] hover:shadow-[0_0_25px_rgba(0,255,204,0.6)] cursor-pointer">
            <i className="fa-solid fa-link"></i> Connect to QuickBooks
         </a>
      </div>
    );
  }

  // Calculate dynamic CEO % metrics
  const netMargin = kpis.totalIncome ? ((kpis.netIncome / kpis.totalIncome) * 100).toFixed(1) : 0;
  const payrollCost = kpis.expensePie ? kpis.expensePie['Labor & Payroll'] : 0;
  const laborRatio = kpis.totalIncome ? ((payrollCost / kpis.totalIncome) * 100).toFixed(1) : 0;

  return (
    <div className="flex h-screen relative z-10 slide-left">
        {/* Left Sidebar: AI Server Chat */}
        <div className="w-1/3 bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-greenaccent">AI Executive CFO</h2>
                <div className="text-xs text-greenaccent animate-pulse"><i className="fa-solid fa-lock mr-1"></i> Sync Active</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                <div className="ai-message glass-message p-4 rounded-2xl rounded-tl-sm w-11/12 shadow-md mb-4 bg-blue-900/20 border border-blue-500/30">
                  <p className="text-sm font-semibold text-blue-300">Live Executive Access Verified.</p>
                  <p className="text-sm text-gray-300 mt-2">I have successfully penetrated the Intuit Master Ledger. I can see explicit payroll footprints, marketing spend, and trailing twelve-month flows. Ask me anything.</p>
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
                    <input value={input} onChange={handleInputChange} className="w-full bg-white/5 border border-gray-600 text-white text-sm rounded-full px-5 py-4 outline-none focus:border-greenaccent focus:bg-white/10 transition-all shadow-inner" placeholder="Ask about specific expense vectors..." />
                    <button type="submit" className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-blue-600 to-green-600 px-4 rounded-full hover:shadow-[0_0_15px_#22c55e] transition-all flex items-center justify-center">
                        <i className="fa-solid fa-paper-plane text-white text-sm"></i>
                    </button>
                </form>
            </div>
        </div>

        {/* Right Executive CEO Suite */}
        <div className="flex-1 p-8 overflow-y-auto">
             <header className="flex justify-between items-center mb-8 glass-panel p-4 rounded-xl shadow-lg border-b border-greenaccent/30">
                <div className="flex items-center gap-3">
                    <i className="fa-solid fa-chart-pie text-greenaccent text-2xl"></i>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Fortune 500 Command Center</h1>
                </div>
            </header>
            
            <div className="grid grid-cols-4 gap-4 mb-6 relative z-10 w-full">
                {/* Total Income KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-lg">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">YTD Gross Revenue</h3>
                    <div className="flex items-end justify-between mt-2"><span className="text-2xl font-bold text-green-400">{kpiLoading ? '...' : `$${kpis.totalIncome.toLocaleString()}`}</span></div>
                </div>
                {/* Labor Efficiency Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-lg">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Labor Efficiency (Target &lt;30%)</h3>
                    <div className="flex items-end justify-between mt-2">
                        <span className={`text-2xl font-bold ${parseFloat(laborRatio) > 30 ? 'text-red-400' : 'text-blue-400'}`}>{kpiLoading ? '...' : `${laborRatio}%`}</span>
                    </div>
                </div>
                {/* Expenses KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-lg">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">YTD Operating Bleed</h3>
                    <div className="flex items-end justify-between mt-2"><span className="text-2xl font-bold text-red-400">{kpiLoading ? '...' : `$${kpis.totalExpenses.toLocaleString()}`}</span></div>
                </div>
                {/* Net Margin KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1 shadow-lg border-t-2 border-purple-500">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Net Operating Margin</h3>
                    <div className="flex items-end justify-between mt-2"><span className="text-2xl font-bold text-purple-400">{kpiLoading ? '...' : `${netMargin}%`}</span></div>
                </div>
            </div>
            
            {/* CEO Chart Layout Suite */}
            <div className="grid grid-cols-3 gap-6 relative z-10">
                {/* Master Trend Graph: Takes 2 columns */}
                <div className="glass-panel p-6 rounded-xl col-span-2 h-[350px] flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <h3 className="text-gray-300 font-bold mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-line text-green-400"></i> Trailing Revenue & Income Flow</h3>
                    <div className="flex-1 relative">
                        {kpiLoading ? <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-sm">Mapping Multi-Month Fluctuations...</div> : <canvas ref={lineChartRef}></canvas>}
                    </div>
                </div>

                {/* Granular Expense Heatmap */}
                <div className="glass-panel p-6 rounded-xl col-span-1 h-[350px] flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.4)]">
                    <h3 className="text-gray-300 font-bold mb-4 flex items-center gap-2 text-sm"><i className="fa-solid fa-fire text-red-500"></i> Operating Burn Breakdown</h3>
                    <div className="flex-1 relative">
                         {kpiLoading ? <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-sm">Categorizing Sub-Ledgers...</div> : <canvas ref={pieChartRef}></canvas>}
                    </div>
                </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-600 font-mono">
                Knockout Advanced Executive Command // Secured by Intuit OAuth 2.0 & Google Deepmind Core
            </div>
        </div>
    </div>
  );
}
