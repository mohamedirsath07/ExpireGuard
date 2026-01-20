import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

const UpdatePrompt = () => {
    const [showUpdate, setShowUpdate] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState(null);

    useEffect(() => {
        // Listen for service worker update messages
        const handleSWMessage = (event) => {
            if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
                setShowUpdate(true);
            }
        };

        navigator.serviceWorker?.addEventListener('message', handleSWMessage);

        // Check for waiting service worker on mount
        const checkForUpdates = async () => {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration?.waiting) {
                    setWaitingWorker(registration.waiting);
                    setShowUpdate(true);
                }

                // Listen for new waiting workers
                registration?.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker?.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            setWaitingWorker(newWorker);
                            setShowUpdate(true);
                        }
                    });
                });
            }
        };

        checkForUpdates();

        return () => {
            navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
        };
    }, []);

    const handleUpdate = () => {
        if (waitingWorker) {
            // Tell the waiting service worker to take control
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
        // Reload the page to activate the new service worker
        window.location.reload();
    };

    const handleDismiss = () => {
        setShowUpdate(false);
    };

    if (!showUpdate) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 shadow-2xl shadow-emerald-500/30 border border-emerald-400/20">
                <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-full p-2 shrink-0">
                        <RefreshCw size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-base">Update Available!</h3>
                        <p className="text-emerald-100/80 text-sm mt-1">
                            A new version of ExpireGuard is ready. Update now for the latest features and improvements.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleUpdate}
                                className="flex-1 bg-white text-emerald-700 font-bold py-2 px-4 rounded-lg text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Update Now
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="bg-emerald-700/50 text-white py-2 px-3 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatePrompt;
