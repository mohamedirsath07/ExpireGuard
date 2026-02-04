import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import AddItemModal from './components/AddItemModal';
import NotificationPanel from './components/NotificationPanel';
import InstallPrompt, { useInstallApp } from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import AuthScreen from './components/AuthScreen';
import { Scan, Plus, Bell, Download, LogOut } from 'lucide-react';
import { requestNotificationPermission, checkExpiringProducts, notifyExpiringProducts } from './notifications';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Get auth token
const getToken = () => localStorage.getItem('token');

// API helper functions for MongoDB (with auth)
const fetchProducts = async () => {
  try {
    const token = getToken();
    if (!token) return [];
    const res = await fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
      return [];
    }
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch (err) {
    console.error('Failed to load products:', err);
    return [];
  }
};

const createProduct = async (product) => {
  try {
    const token = getToken();
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error('Failed to create');
    return await res.json();
  } catch (err) {
    console.error('Failed to create product:', err);
    return null;
  }
};

const deleteProduct = async (id) => {
  try {
    const token = getToken();
    const res = await fetch(`${API_URL}/products/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to delete product:', err);
    return false;
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [newItem, setNewItem] = useState({ name: '', date: '', category: 'Groceries' });
  const [scanConfidence, setScanConfidence] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { canInstall, isInstalled, install } = useInstallApp();

  // Check for existing auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Load products when user logs in
  useEffect(() => {
    if (user && token) {
      const load = async () => {
        const data = await fetchProducts();
        setProducts(data);
      };
      load();
    }
  }, [user, token]);

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

  const handleLogin = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setProducts([]);
  };

  const handleDelete = async (id) => {
    const success = await deleteProduct(id);
    if (success) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSave = async () => {
    if (!newItem.name || !newItem.date) {
      alert("Please fill in all fields");
      return;
    }

    const productData = {
      name: newItem.name,
      expiryDate: newItem.date,
      category: newItem.category
    };

    const saved = await createProduct(productData);
    if (saved) {
      // Add and sort by expiry date
      setProducts(prev => {
        const updated = [...prev, saved];
        return updated.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      });
    }

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

  // Show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

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
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-red-400"
            title={`Logout (${user.username})`}
          >
            <LogOut size={20} />
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

      {/* PWA Update Prompt */}
      <UpdatePrompt />
    </div>
  );
}
