// Enhanced Notification Service for ExpireGuard
// Supports push notifications on mobile devices

// Request notification permission with mobile-optimized prompting
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

// Register service worker for push notifications
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered for notifications');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Send notification via Service Worker (works on mobile in background)
export const sendPushNotification = async (title, options = {}) => {
  if (Notification.permission !== "granted") {
    console.log("Notification permission not granted");
    return null;
  }

  // Try to use service worker notification (better for mobile)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: options.tag || 'expireguard-notification',
        renotify: true,
        ...options
      });
      return true;
    } catch (error) {
      console.log('Service worker notification failed, falling back:', error);
    }
  }

  // Fallback to regular notification
  try {
    const notification = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('Notification failed:', error);
    return null;
  }
};

// Check products and create notification data
export const checkExpiringProducts = (products) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const notifications = [];

  products.forEach(product => {
    if (!product.expiryDate) return;

    const expiryDate = new Date(product.expiryDate);
    const diffTime = expiryDate - today;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Already expired
    if (daysLeft < 0) {
      notifications.push({
        type: 'expired',
        product,
        daysLeft,
        title: '❌ Product Expired!',
        body: `${product.name} expired ${Math.abs(daysLeft)} days ago`,
        urgency: 'high'
      });
    }
    // Expiring today
    else if (daysLeft === 0) {
      notifications.push({
        type: 'today',
        product,
        daysLeft,
        title: '⚠️ Expires Today!',
        body: `${product.name} expires today`,
        urgency: 'high'
      });
    }
    // Expiring within 3 days
    else if (daysLeft <= 3) {
      notifications.push({
        type: 'urgent',
        product,
        daysLeft,
        title: '🚨 Expiring Soon!',
        body: `${product.name} expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
        urgency: 'high'
      });
    }
    // Expiring within 7 days
    else if (daysLeft <= 7) {
      notifications.push({
        type: 'warning',
        product,
        daysLeft,
        title: '⚡ Expiring This Week',
        body: `${product.name} expires in ${daysLeft} days`,
        urgency: 'medium'
      });
    }
  });

  return notifications;
};

// Get last notification time from localStorage
const getLastNotificationTime = () => {
  const time = localStorage.getItem('expireguard-last-notification');
  return time ? new Date(time) : null;
};

// Set last notification time
const setLastNotificationTime = () => {
  localStorage.setItem('expireguard-last-notification', new Date().toISOString());
};

// Check if we should send notifications (rate limit to avoid spam)
const shouldSendNotification = () => {
  const lastTime = getLastNotificationTime();
  if (!lastTime) return true;

  const now = new Date();
  const hoursSinceLastNotification = (now - lastTime) / (1000 * 60 * 60);

  // Only send notifications every 4 hours minimum
  return hoursSinceLastNotification >= 4;
};

// Send push notifications for expiring products
export const notifyExpiringProducts = async (products, forceNotify = false) => {
  const notifications = checkExpiringProducts(products);

  if (notifications.length === 0) return [];

  // Check if we should send (rate limiting)
  if (!forceNotify && !shouldSendNotification()) {
    console.log('Skipping notification - rate limited');
    return notifications;
  }

  // Only notify for high urgency items
  const highUrgency = notifications.filter(n => n.urgency === 'high');

  if (highUrgency.length > 0) {
    // Create notification content
    let title, body;

    if (highUrgency.length === 1) {
      title = highUrgency[0].title;
      body = highUrgency[0].body;
    } else {
      const expired = highUrgency.filter(n => n.type === 'expired').length;
      const expiring = highUrgency.filter(n => n.type !== 'expired').length;

      title = '🚨 ExpireGuard Alert';

      if (expired > 0 && expiring > 0) {
        body = `${expired} expired, ${expiring} expiring soon!`;
      } else if (expired > 0) {
        body = `${expired} product${expired > 1 ? 's' : ''} expired!`;
      } else {
        body = `${expiring} product${expiring > 1 ? 's' : ''} expiring soon!`;
      }
    }

    // Send the push notification
    await sendPushNotification(title, {
      body,
      tag: 'expiring-products',
      data: {
        url: '/',
        count: highUrgency.length
      },
      actions: [
        { action: 'view', title: 'View Products' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });

    setLastNotificationTime();
  }

  return notifications;
};

// Schedule periodic notification checks (call this on app load)
export const scheduleNotificationChecks = (getProducts) => {
  // Check every hour
  const checkInterval = setInterval(async () => {
    const products = await getProducts();
    if (products && products.length > 0) {
      await notifyExpiringProducts(products);
    }
  }, 60 * 60 * 1000); // 1 hour

  return checkInterval;
};

// Initialize notifications - call this when app loads
export const initializeNotifications = async () => {
  // Request permission
  const granted = await requestNotificationPermission();

  if (granted) {
    // Register service worker
    await registerServiceWorker();
    console.log('Notifications initialized successfully');
  }

  return granted;
};
