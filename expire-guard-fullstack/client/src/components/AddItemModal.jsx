import React from 'react';
import { X, Scan, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const ConfidenceBadge = ({ confidence }) => {
  if (confidence === null || confidence === undefined) return null;

  const percent = Math.round(confidence * 100);

  let color, Icon, label;
  if (confidence >= 0.8) {
    color = 'bg-emerald-500/20 border-emerald-500 text-emerald-400';
    Icon = CheckCircle;
    label = 'High confidence';
  } else if (confidence >= 0.5) {
    color = 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
    Icon = AlertTriangle;
    label = 'Medium confidence';
  } else {
    color = 'bg-red-500/20 border-red-500 text-red-400';
    Icon = XCircle;
    label = 'Low confidence';
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color} mt-2`}>
      <Icon size={14} />
      <span className="text-xs font-bold">{percent}% {label}</span>
    </div>
  );
};

const AddItemModal = ({ newItem, setNewItem, onSave, onClose, onScan, confidence }) => {
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
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white mt-1 focus:border-emerald-500 outline-none transition-colors"
              placeholder="Enter product name"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
            <select
              value={newItem.category}
              onChange={e => setNewItem({ ...newItem, category: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white mt-1 focus:border-emerald-500 outline-none"
            >
              {['Groceries', 'Food', 'Medicine', 'Cosmetics', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Expiry Date</label>
            <div className="flex gap-2 mt-1">
              <input
                type="date"
                value={newItem.date}
                onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
              />
              <button
                onClick={onScan}
                className="bg-slate-800 px-4 rounded-lg border border-slate-700 text-emerald-500 hover:bg-slate-700 flex items-center gap-2 transition-colors"
              >
                <Scan size={20} />
              </button>
            </div>
            {/* Show confidence badge if date was scanned */}
            {newItem.date && confidence !== null && confidence !== undefined && (
              <ConfidenceBadge confidence={confidence} />
            )}
            {confidence !== null && confidence < 0.5 && (
              <p className="text-orange-400/70 text-xs mt-2">
                ⚠️ Low confidence - please verify the date manually
              </p>
            )}
          </div>
          <button
            onClick={onSave}
            disabled={!newItem.name || !newItem.date}
            className="w-full bg-emerald-600 py-3 rounded-lg text-white font-bold mt-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Save Product
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
