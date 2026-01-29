import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if dismissed recently (don't show for 7 days)
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const now = new Date();
            const daysDiff = (now - dismissedDate) / (1000 * 60 * 60 * 24);
            if (daysDiff < 7) return;
        }

        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIOSDevice);

        if (isIOSDevice) {
            // Show iOS-specific prompt after 2 seconds
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // For Android/Chrome - listen for beforeinstallprompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show prompt after 2 seconds
            setTimeout(() => setShowPrompt(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('PWA installed');
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    };

    // Don't show if already installed
    if (isInstalled) return null;
    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-[slideUp_0.3s_ease-out]">
            <div className="bg-slate-800 border border-emerald-500/30 rounded-2xl p-4 max-w-md mx-auto shadow-2xl shadow-emerald-500/10">
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-slate-500 hover:text-white p-1"
                >
                    <X size={18} />
                </button>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-600 p-3 rounded-xl shrink-0">
                        <Smartphone size={24} className="text-white" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">Install ExpireGuard</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            {isIOS
                                ? "Tap the share button and select 'Add to Home Screen'"
                                : "Add to your home screen for quick access"
                            }
                        </p>

                        {!isIOS && deferredPrompt && (
                            <button
                                onClick={handleInstall}
                                className="mt-3 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                <Download size={18} />
                                Install App
                            </button>
                        )}

                        {isIOS && (
                            <div className="mt-3 flex items-center gap-2 text-slate-400 text-sm">
                                <Share size={16} />
                                <span>Tap Share → Add to Home Screen</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
};

// Export a hook for the install button in navbar
export const useInstallApp = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setCanInstall(false);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = async () => {
        if (!deferredPrompt) return false;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        setDeferredPrompt(null);
        setCanInstall(false);

        return outcome === 'accepted';
    };

    return { canInstall, isInstalled, install };
};

export default InstallPrompt;
