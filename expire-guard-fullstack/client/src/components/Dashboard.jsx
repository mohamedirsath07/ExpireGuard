import React, { useRef, useMemo, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import gsap from 'gsap';

const getStatus = (dateStr) => {
  if (!dateStr) return { color: "bg-slate-700", label: "Unknown", days: "--" };
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(dateStr);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  if (diffDays < 0) return { color: "bg-red-500", text: "text-red-500", label: "Expired", days: `${Math.abs(diffDays)}d ago` };
  if (diffDays <= 7) return { color: "bg-orange-500", text: "text-orange-500", label: "Expiring", days: `${diffDays}d left` };
  return { color: "bg-emerald-500", text: "text-emerald-500", label: "Good", days: `${diffDays}d left` };
};

const Dashboard = ({ products, onDelete }) => {
  const [activeCat, setActiveCat] = React.useState('All');
  const categories = ['All', 'Groceries', 'Food', 'Medicine', 'Cosmetics'];
  const listRef = useRef(null);

  const filtered = useMemo(() => {
     let data = activeCat === 'All' ? products : products.filter(p => p.category === activeCat);
     return data.sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  }, [products, activeCat]);

  useEffect(() => {
    if(listRef.current && listRef.current.children.length > 0) {
        gsap.fromTo(listRef.current.children, {opacity: 0, y: 15}, {opacity: 1, y: 0, stagger: 0.05, duration: 0.3});
    }
  }, [activeCat, products]);

  return (
    <div className="pt-24 px-4 pb-32 max-w-xl mx-auto">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {categories.map(cat => (
           <button key={cat} onClick={() => setActiveCat(cat)} 
             className={`px-4 py-2 rounded-full text-sm font-bold border transition-all whitespace-nowrap ${activeCat === cat ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
             {cat}
           </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
         <div className="bg-slate-800/50 border border-white/10 p-4 rounded-2xl">
            <span className="text-2xl font-bold text-white block">{filtered.length}</span>
            <span className="text-[10px] uppercase text-slate-400">Total Items</span>
         </div>
         <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl">
            <span className="text-2xl font-bold text-orange-400 block">
                {filtered.filter(p => getStatus(p.expiryDate).label === "Expiring").length}
            </span>
            <span className="text-[10px] uppercase text-orange-400/70">Expiring Soon</span>
         </div>
      </div>

      {/* List */}
      <div ref={listRef} className="space-y-3">
         {filtered.map(p => {
            const s = getStatus(p.expiryDate);
            return (
              <div key={p.id} className="relative bg-slate-800/40 border border-white/5 p-4 rounded-xl flex justify-between items-center group">
                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.color}`}></div>
                 <div className="ml-3">
                    <h4 className="text-white font-bold">{p.name}</h4>
                    <span className="text-xs text-slate-400 bg-slate-800 px-1 rounded">{p.category}</span>
                    <div className="text-xs text-slate-500 mt-1">{p.expiryDate}</div>
                 </div>
                 <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${s.text} ${s.color.replace('bg-', 'border-')} bg-transparent`}>
                       {s.days}
                    </span>
                    <button onClick={() => onDelete(p.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={16} /></button>
                 </div>
              </div>
            )
         })}
      </div>
    </div>
  );
};

export default Dashboard;
