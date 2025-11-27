import React from 'react';
import { X, Scan } from 'lucide-react';

const AddItemModal = ({ newItem, setNewItem, onSave, onClose, onScan }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
       <div className="bg-slate-900 w-full max-w-sm rounded-2xl p-6 border border-white/10 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
            <X />
          </button>
          <h2 className="text-xl font-bold text-white mb-4">Add Item</h2>
          
          <div className="space-y-4">
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={e => setNewItem({...newItem, name: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white mt-1" 
                  placeholder="Milk" 
                />
             </div>
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                <select 
                  value={newItem.category} 
                  onChange={e => setNewItem({...newItem, category: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white mt-1"
                >
                   {['Groceries', 'Food', 'Medicine', 'Cosmetics'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Expiry Date</label>
                <div className="flex gap-2 mt-1">
                   <input 
                     type="date" 
                     value={newItem.date} 
                     onChange={e => setNewItem({...newItem, date: e.target.value})} 
                     className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" 
                   />
                   <button 
                     onClick={onScan} 
                     className="bg-slate-800 px-4 rounded-lg border border-slate-700 text-emerald-500 hover:bg-slate-700"
                   >
                     <Scan />
                   </button>
                </div>
             </div>
             <button 
               onClick={onSave} 
               className="w-full bg-emerald-600 py-3 rounded-lg text-white font-bold mt-2 hover:bg-emerald-700"
             >
               Save Product
             </button>
          </div>
       </div>
    </div>
  );
};

export default AddItemModal;
