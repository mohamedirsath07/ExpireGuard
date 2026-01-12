import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import AddItemModal from './components/AddItemModal';
import NotificationPanel from './components/NotificationPanel';
import InstallPrompt, { useInstallApp } from './components/InstallPrompt';
import { Scan, Plus, Bell, Download } from 'lucide-react';
import { requestNotificationPermission, checkExpiringProducts, notifyExpiringProducts } from './notifications';

// Local Storage key
const STORAGE_KEY = 'expireguard_products';

// Helper functions for localStorage
const loadProducts = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to load products:', err);
    return [];
  }
};

const saveProducts = (products) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products:', err);
  }
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('dashboard');
  const [newItem, setNewItem] = useState({ name: '', date: '', category: 'Groceries' });
  const [scanConfidence, setScanConfidence] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { canInstall, isInstalled, install } = useInstallApp();

  // Load from localStorage on mount
  useEffect(() => {
    const savedProducts = loadProducts();
    // Sort by expiry date
    savedProducts.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    setProducts(savedProducts);
  }, []);

  // Save to localStorage whenever products change
  useEffect(() => {
    if (products.length > 0 || localStorage.getItem(STORAGE_KEY)) {
      saveProducts(products);
    }
  }, [products]);

  // Initialize notifications on mount
  useEffect(() => {
    const init = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        console.log('Push notifications enabled');
      }
    };
    init();
  }, []);

  // Check for expiring products and send push notifications
  useEffect(() => {
    if (products.length > 0) {
      const expiringNotifications = checkExpiringProducts(products);
      setNotifications(expiringNotifications);

      // Send push notifications for expiring items
      const highUrgency = expiringNotifications.filter(n => n.urgency === 'high');
      if (highUrgency.length > 0) {
        notifyExpiringProducts(products);
      }
    } else {
      setNotifications([]);
    }
  }, [products]);

  const handleDelete = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = () => {
    if (!newItem.name || !newItem.date) {
      alert("Please fill in all fields");
      return;
    }

    const newProduct = {
      id: Date.now().toString(),
      name: newItem.name,
      expiryDate: newItem.date,
      category: newItem.category,
      createdAt: new Date().toISOString()
    };

    // Add and sort by expiry date
    setProducts(prev => {
      const updated = [...prev, newProduct];
      return updated.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    });

    setNewItem({ name: '', date: '', category: 'Groceries' });
    setScanConfidence(null);
    setView('dashboard');
  };

  const handleScanComplete = (date, confidence) => {
    setNewItem(prev => ({ ...prev, date }));
    setScanConfidence(confidence);
    setView('add');
  };

  const handleCloseAddModal = () => {
    setView('dashboard');
    setScanConfidence(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans">
      <nav className="fixed top-0 w-full bg-[#020617]/80 backdrop-blur-md border-b border-white/5 z-40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded text-white"><Scan size={20} /></div>
          <h1 className="font-bold text-lg text-white">Expire<span className="text-emerald-500">Guard</span></h1>
        </div>
        <div className="flex items-center gap-2">
          {canInstall && !isInstalled && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-1.5 px-3 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Bell size={20} className="text-white" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onDismiss={() => setNotifications([])}
        />
      )}

      {view === 'dashboard' && <Dashboard products={products} onDelete={handleDelete} />}

      {view === 'scanner' && (
        <Scanner
          onClose={() => setView('dashboard')}
          onScanComplete={handleScanComplete}
        />
      )}

      {view === 'add' && (
        <AddItemModal
          newItem={newItem}
          setNewItem={setNewItem}
          onSave={handleSave}
          onClose={handleCloseAddModal}
          onScan={() => setView('scanner')}
          confidence={scanConfidence}
        />
      )}

      {view === 'dashboard' && (
        <button
          onClick={() => { setView('add'); setScanConfidence(null); }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 z-30 hover:bg-emerald-700"
        >
          <Plus size={28} />
        </button>
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
