import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Force Vercel Rebuild
export default function Home() {
  const [qboConnected, setQboConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  // Dashboard Metrics State
  const [kpis, setKpis] = useState({ totalIncome: 0, totalExpenses: 0, grossProfit: 0, netIncome: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

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

  // Fetch Dashboard metrics continuously when connected
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

  // Hook Chart.js into HTML Canvas dynamically
  useEffect(() => {
      if (!kpiLoading && chartRef.current && qboConnected) {
          if (chartInstance.current) chartInstance.current.destroy();

          chartInstance.current = new Chart(chartRef.current, {
              type: 'bar',
              data: {
                  labels: ['Total Income', 'Gross Profit', 'Total Expenses', 'Net Income'],
                  datasets: [{
                      label: 'YTD (USD)',
                      data: [kpis.totalIncome, kpis.grossProfit, kpis.totalExpenses, kpis.netIncome],
                      backgroundColor: ['rgba(34,197,94,0.6)', 'rgba(59,130,246,0.6)', 'rgba(239,68,68,0.6)', 'rgba(168,85,247,0.6)'],
                      borderColor: ['rgba(34,197,94,1)', 'rgba(59,130,246,1)', 'rgba(239,68,68,1)', 'rgba(168,85,247,1)'],
                      borderWidth: 1,
                      borderRadius: 6
                  }]
              },
              options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', callback: function(val) { return '$' + val.toLocaleString(); } } },
                      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }
                  }
              }
          });
      }
      return () => { if (chartInstance.current) chartInstance.current.destroy(); }
  }, [kpis, kpiLoading, qboConnected]);

  if (!qboConnected) {
    return (
      <div className="flex z-10 items-center justify-center min-h-screen flex-col slide-down">
         <i className="fa-solid fa-chart-pie text-greenaccent text-6xl mb-6"></i>
         <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-greenaccent">Knockout CFO AI Dashboard</h1>
         <p className="text-gray-400 mb-8 max-w-md text-center">To get started, securely connect your live QuickBooks Online account to process your 'Budget vs Actual' KPIs.</p>
         
         <a href="/api/auth" className="glass-panel px-8 py-4 rounded-full text-lg font-semibold hover:border-greenaccent transition-colors flex items-center gap-3 shadow-[0_0_15px_rgba(0,255,204,0.3)] hover:shadow-[0_0_25px_rgba(0,255,204,0.6)] cursor-pointer">
            <i className="fa-solid fa-link"></i> Connect to QuickBooks
         </a>
      </div>
    );
  }

  // QBO Connected Main Dashboard State
  return (
    <div className="flex h-screen relative z-10 slide-left">
        {/* Left Sidebar: AI Server Chat */}
        <div className="w-1/3 bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-greenaccent">AI Financial Analyst</h2>
                <div className="text-xs text-greenaccent"><i className="fa-solid fa-lock mr-1"></i> Connected</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                <div className="ai-message glass-message p-4 rounded-2xl rounded-tl-sm w-11/12 shadow-md mb-4">
                  <p className="text-sm">QuickBooks Connection **Active**.</p>
                  <p className="text-sm text-gray-300 mt-2">I have access to your Direct LER, Contribution Margin, and Gas overheads. How can I help?</p>
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
                    <input value={input} onChange={handleInputChange} className="w-full bg-white/5 border border-gray-600 text-white text-sm rounded-full px-5 py-4 outline-none focus:border-greenaccent focus:bg-white/10 transition-all shadow-inner" placeholder="Ask about profit, expenses..." />
                    <button type="submit" className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-blue-600 to-purple-600 px-4 rounded-full hover:shadow-[0_0_15px_#8b5cf6] transition-all flex items-center justify-center">
                        <i className="fa-solid fa-paper-plane text-white text-sm"></i>
                    </button>
                </form>
            </div>
        </div>

        {/* Right Dashboard metrics... (similar to previous prototype) */}
        <div className="flex-1 p-8 overflow-y-auto">
             <header className="flex justify-between items-center mb-8 glass-panel p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                    <i className="fa-solid fa-chart-pie text-greenaccent text-2xl"></i>
                    <h1 className="text-2xl font-bold">Knockout CFO AI Dashboard</h1>
                </div>
            </header>
            
            <div className="grid grid-cols-4 gap-4 mb-6 relative z-10 w-full">
                {/* Total Income KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1">
                    <h3 className="text-gray-400 text-sm font-semibold mb-1">YTD Total Income</h3>
                    <div className="flex items-end justify-between"><span className="text-2xl font-bold text-green-400">{kpiLoading ? '...' : `$${kpis.totalIncome.toLocaleString()}`}</span></div>
                </div>
                {/* Gross Profit KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1">
                    <h3 className="text-gray-400 text-sm font-semibold mb-1">Gross Profit</h3>
                    <div className="flex items-end justify-between"><span className="text-2xl font-bold text-blue-400">{kpiLoading ? '...' : `$${kpis.grossProfit.toLocaleString()}`}</span></div>
                </div>
                {/* Expenses KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1">
                    <h3 className="text-gray-400 text-sm font-semibold mb-1">Total Expenses</h3>
                    <div className="flex items-end justify-between"><span className="text-2xl font-bold text-red-400">{kpiLoading ? '...' : `$${kpis.totalExpenses.toLocaleString()}`}</span></div>
                </div>
                {/* Net Income KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform col-span-1">
                    <h3 className="text-gray-400 text-sm font-semibold mb-1">Net Income</h3>
                    <div className="flex items-end justify-between"><span className="text-2xl font-bold text-purple-400">{kpiLoading ? '...' : `$${kpis.netIncome.toLocaleString()}`}</span></div>
                </div>
            </div>
            
            {/* Massive Chart Engine Render Canvas */}
            <div className="glass-panel p-6 rounded-xl w-full h-[400px] relative z-10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                {kpiLoading ? (
                   <div className="flex h-full w-full items-center justify-center text-gray-500 animate-pulse">Syncing Visual Financials from Intuit Data Pipeline...</div>
                ) : (
                   <canvas ref={chartRef}></canvas>
                )}
            </div>
        </div>
    </div>
  );
}
