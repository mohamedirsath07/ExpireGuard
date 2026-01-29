import React from 'react';
import { X, Bell, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';

const NotificationPanel = ({ notifications, onClose, onDismiss }) => {
  const getIcon = (type) => {
    switch(type) {
      case 'expired': return <XCircle className="text-red-500" size={20} />;
      case 'today': return <AlertCircle className="text-orange-500" size={20} />;
      case 'urgent': return <AlertTriangle className="text-orange-400" size={20} />;
      case 'warning': return <Bell className="text-yellow-500" size={20} />;
      default: return <Bell className="text-blue-500" size={20} />;
    }
  };

  const getColor = (type) => {
    switch(type) {
      case 'expired': return 'border-red-500 bg-red-500/10';
      case 'today': return 'border-orange-500 bg-orange-500/10';
      case 'urgent': return 'border-orange-400 bg-orange-400/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      default: return 'border-blue-500 bg-blue-500/10';
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="fixed top-20 right-4 z-50 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl w-80">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Bell size={20} className="text-emerald-500" />
            Notifications
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="text-center py-8">
          <Bell size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">No expiring products!</p>
          <p className="text-slate-600 text-sm mt-1">All items are fresh 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-4 z-50 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl w-80 max-h-[500px] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Bell size={20} className="text-emerald-500" />
          Notifications ({notifications.length})
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((notification, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg border ${getColor(notification.type)} transition-all`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">{notification.product.name}</h4>
                <p className="text-slate-400 text-xs mt-1">{notification.body}</p>
                <p className="text-slate-500 text-xs mt-1">
                  Category: {notification.product.category}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length > 0 && (
        <button 
          onClick={() => onDismiss && onDismiss()}
          className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg"
        >
          Dismiss All
        </button>
      )}
    </div>
  );
};

export default NotificationPanel;
