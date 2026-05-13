import axios from 'axios';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkAndRecoverSubscription(activeMember) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[Push] Subscription exists, ensuring backend sync...');
      try {
        await axios.post('/api/notifications/subscribe', {
          member_name: activeMember,
          subscription
        });
      } catch (e) {
        console.error('[Push] Backend sync failed:', e);
      }
      return true;
    }

    if (Notification.permission === 'granted') {
      console.log('[Push] Permission granted but no subscription found. Recovering...');
      try {
        const { data } = await axios.get('/api/notifications/vapidPublicKey');
        const convertedVapidKey = urlBase64ToUint8Array(data.publicKey);
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        
        console.log('[Push] Recovery successful, syncing to backend...');
        await axios.post('/api/notifications/subscribe', {
          member_name: activeMember,
          subscription: newSubscription
        });
        return true;
      } catch (error) {
        console.error('[Push] Recovery failed:', error);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('[Push] Error checking subscription:', error);
    return false;
  }
}

export async function unsubscribePush(activeMember) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Unsubscribing from PushManager...');
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      
      console.log('[Push] Removing from backend...');
      await axios.post('/api/notifications/unsubscribe', {
        member_name: activeMember,
        endpoint
      });
      return true;
    }
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
  }
  return false;
}
