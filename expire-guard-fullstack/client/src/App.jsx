import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import AddItemModal from './components/AddItemModal';
import NotificationPanel from './components/NotificationPanel';
import InstallPrompt from './components/InstallPrompt';
import { Scan, Plus, Bell } from 'lucide-react';
import { requestNotificationPermission, checkExpiringProducts, notifyExpiringProducts } from './notifications';

export default function App() {
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('dashboard');
  const [newItem, setNewItem] = useState({ name: '', date: '', category: 'Groceries' });
  const [scanConfidence, setScanConfidence] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load from Firebase
  useEffect(() => {
    try {
      const q = query(collection(db, "products"), orderBy("expiryDate"));
      const unsub = onSnapshot(q, (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        setLoading(false);
      }, (err) => {
        console.error("Firebase error:", err);
        setError("Failed to connect to database");
        setLoading(false);
      });
      return () => unsub();
    } catch (err) {
      console.error("Firebase init error:", err);
      setError("Failed to initialize database");
      setLoading(false);
    }
  }, []);

  // Initialize notifications on mount (request permission + register service worker)
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

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "products", id));
  };

  const handleSave = async () => {
    if (!newItem.name || !newItem.date) {
      alert("Please fill in all fields");
      return;
    }

    try {
      console.log("Saving product:", newItem);
      await addDoc(collection(db, "products"), {
        name: newItem.name,
        expiryDate: newItem.date,
        category: newItem.category,
        createdAt: new Date().toISOString()
      });
      console.log("Product saved successfully!");
      setNewItem({ name: '', date: '', category: 'Groceries' });
      setScanConfidence(null);
      setView('dashboard');
    } catch (error) {
      console.error("Firebase save error:", error);
      alert(`Failed to save: ${error.message}`);
    }
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading ExpireGuard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6">
            <h2 className="text-red-400 font-bold text-xl mb-2">Connection Error</h2>
            <p className="text-slate-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans">
      <nav className="fixed top-0 w-full bg-[#020617]/80 backdrop-blur-md border-b border-white/5 z-40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded text-white"><Scan size={20} /></div>
          <h1 className="font-bold text-lg text-white">Expire<span className="text-emerald-500">Guard</span></h1>
        </div>
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
