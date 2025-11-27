import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import AddItemModal from './components/AddItemModal';
import NotificationPanel from './components/NotificationPanel';
import { Scan, Plus, Bell } from 'lucide-react';
import { requestNotificationPermission, checkExpiringProducts, notifyExpiringProducts } from './notifications';

export default function App() {
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('dashboard');
  const [newItem, setNewItem] = useState({ name: '', date: '', category: 'Groceries' });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Load from Firebase
  useEffect(() => {
     const q = query(collection(db, "products"), orderBy("expiryDate"));
     const unsub = onSnapshot(q, (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
     });
     return () => unsub();
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Check for expiring products and send notifications
  useEffect(() => {
    if (products.length > 0) {
      const expiringNotifications = checkExpiringProducts(products);
      setNotifications(expiringNotifications);
      
      // Send browser notifications for high urgency items
      const highUrgency = expiringNotifications.filter(n => n.urgency === 'high');
      if (highUrgency.length > 0) {
        notifyExpiringProducts(products);
      }
    }
  }, [products]);

  const handleDelete = async (id) => {
     await deleteDoc(doc(db, "products", id));
  };

  const handleSave = async () => {
     if(!newItem.name || !newItem.date) {
       alert("Please fill in all fields");
       return;
     }
     await addDoc(collection(db, "products"), {
        name: newItem.name,
        expiryDate: newItem.date,
        category: newItem.category,
        createdAt: new Date().toISOString()
     });
     setNewItem({ name: '', date: '', category: 'Groceries' });
     setView('dashboard');
  };

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
          onScanComplete={(date) => {
            setNewItem(prev => ({...prev, date}));
            setView('add');
          }} 
        />
      )}

      {view === 'add' && (
        <AddItemModal 
          newItem={newItem}
          setNewItem={setNewItem}
          onSave={handleSave}
          onClose={() => setView('dashboard')}
          onScan={() => setView('scanner')}
        />
      )}

      {view === 'dashboard' && (
         <button 
           onClick={() => setView('add')} 
           className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 z-30 hover:bg-emerald-700"
         >
            <Plus size={28} />
         </button>
      )}
    </div>
  );
}
