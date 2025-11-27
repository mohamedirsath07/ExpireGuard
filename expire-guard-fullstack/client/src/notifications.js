// Notification Service for ExpireGuard

// Request notification permission
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

// Send browser notification
export const sendNotification = (title, options = {}) => {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [200, 100, 200],
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
};

// Check products and send notifications
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
        body: `${product.name} expires in ${daysLeft} days`,
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

// Send all expiring notifications
export const notifyExpiringProducts = (products) => {
  const notifications = checkExpiringProducts(products);
  
  if (notifications.length === 0) return [];

  // Group by urgency
  const highUrgency = notifications.filter(n => n.urgency === 'high');
  
  if (highUrgency.length > 0) {
    // Send notification for high urgency items
    const message = highUrgency.length === 1 
      ? highUrgency[0].body
      : `${highUrgency.length} products need attention!`;
    
    sendNotification('ExpireGuard Alert', {
      body: message,
      tag: 'expiring-products',
      requireInteraction: true
    });
  }

  return notifications;
};

// Schedule daily notification check
export const scheduleDailyCheck = (products, callback) => {
  // Check immediately
  const notifications = notifyExpiringProducts(products);
  if (callback) callback(notifications);

  // Check every hour
  const interval = setInterval(() => {
    const notifications = notifyExpiringProducts(products);
    if (callback) callback(notifications);
  }, 60 * 60 * 1000); // 1 hour

  return interval;
};
