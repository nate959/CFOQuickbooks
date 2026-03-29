import { useState, useEffect } from 'react';
import { useChat } from 'ai/react';

// Force Vercel Rebuild
export default function Home() {
  const [qboConnected, setQboConnected] = useState(false);
  const { messages, input, handleInputChange, handleSubmit } = useChat({ api: '/api/chat' });

  // Check URL if QBO is connected after OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('qboConnected') === 'true') {
      setQboConnected(true);
    }
  }, []);

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
            
            <div className="grid grid-cols-4 gap-4 mb-6 relative z-10">
                {/* LER KPI Box */}
                <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform">
                    <h3 className="text-gray-400 text-sm font-semibold mb-1">Direct LER Target</h3>
                    <div className="flex items-end justify-between"><span className="text-2xl font-bold">3.2x</span></div>
                    <div className="w-full bg-gray-700 h-1 mt-3 rounded"><div className="bg-greenaccent h-1 rounded" style={{width: '80%'}}></div></div>
                </div>
                 <div className="glass-panel p-5 rounded-xl hover:translate-y-[-3px] transition-transform">
                    <h3 className="text-gray-400 text-sm font-semibold mb-1">Gross Profit %</h3>
                    <div className="flex items-end justify-between"><span className="text-2xl font-bold">58.4%</span></div>
                    <div className="w-full bg-gray-700 h-1 mt-3 rounded"><div className="bg-greenaccent h-1 rounded" style={{width: '60%'}}></div></div>
                </div>
            </div>
            
            <div className="glass-panel p-8 text-center mt-10 rounded-xl">
                 <h2 className="text-xl text-gray-300">QuickBooks Data is Synced and Ready</h2>
                 <p className="text-sm mt-2 text-gray-500">Ask the AI questions on the left to see dynamic reporting based on live actuals.</p>
            </div>
        </div>
    </div>
  );
}
