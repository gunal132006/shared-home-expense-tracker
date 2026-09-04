import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Home, Users, Moon, Info, ChevronRight, Check, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMember } from '../context/MemberContext';

import { unsubscribePush, urlBase64ToUint8Array } from '../utils/push';
import { triggerHaptic } from '../utils/haptics';

export default function SettingsPage() {
  const [rent, setRent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingRent, setIsEditingRent] = useState(false);
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { activeMember } = useMember();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axios.get('/api/settings');
      return res.data;
    }
  });

  useEffect(() => {
    if (settings && !rent) {
      setRent(settings.monthly_rent);
    }
  }, [settings]);

  useEffect(() => {
    const checkPushState = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setNotificationsEnabled(!!subscription);
        } catch (e) {
          console.error('[Push] Error checking initial state:', e);
        }
      }
    };
    checkPushState();
  }, []);

  const queryClient = useQueryClient();

  const handleSaveRent = async () => {
    setIsSaving(true);
    try {
      await axios.put('/api/settings', { monthly_rent: parseFloat(rent) });
      toast.success('Rent updated successfully');
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-analytics'] });

      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('homesplit_sync');
          bc.postMessage({ type: 'EXPENSE_MUTATED' });
          bc.close();
        }
      } catch (_e) {
        // Ignore BroadcastChannel errors
      }

      setIsEditingRent(false);
    } catch (error) {
      triggerHaptic('error');
      toast.error('Failed to update rent');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      if (notificationsEnabled) {
        // If ON, user wants to turn OFF -> Unsubscribe
        await unsubscribePush(activeMember);
        setNotificationsEnabled(false);
        triggerHaptic('light');
        toast.success('Notifications disabled');
      } else {
        // If OFF, user wants to turn ON -> Subscribe
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          
          if (!publicVapidKey) {
            triggerHaptic('error');
            throw new Error('VAPID public key not found in env');
          }

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          });

          await axios.post('/api/notifications/subscribe', {
            subscription,
            memberName: activeMember
          });

          setNotificationsEnabled(true);
          triggerHaptic('success');
          toast.success('Notifications enabled!');
        } else {
          triggerHaptic('error');
          toast.error('Notification permission denied.');
        }
      }
    } catch (error) {
      console.error('Push toggle error:', error);
      triggerHaptic('error');
      toast.error('Failed to toggle notifications.');
    }
  };

  return (
    <div className="px-5 pt-12 pb-24">
      <h1 className="text-3xl font-black text-apple-text tracking-tight mb-8">Settings</h1>

      <div className="space-y-8">
        <div>
          <h2 className="text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-3 ml-4">House Settings</h2>
          <div className="bg-apple-card rounded-[2rem] shadow-apple overflow-hidden transition-colors duration-300">
            <div className="p-4 pl-5 flex flex-col border-b border-apple-border/50">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-4">
                  <div className="bg-apple-blue rounded-xl p-2.5 shadow-sm">
                    <Home size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-apple-text text-lg tracking-tight">Monthly Rent</span>
                </div>
                {!isEditingRent ? (
                  <button 
                    onClick={() => setIsEditingRent(true)}
                    className="flex items-center gap-2"
                  >
                    <span className="font-semibold text-apple-textMuted text-lg">₹{Number(rent).toLocaleString('en-IN')}</span>
                    <ChevronRight size={20} className="text-apple-textMuted/50" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-apple-text text-lg">₹</span>
                    <input 
                      type="number" 
                      value={rent} 
                      onChange={(e) => setRent(e.target.value)}
                      className="w-24 text-right bg-apple-bg rounded-lg px-2 py-1 outline-none font-bold text-apple-text text-lg focus:ring-2 focus:ring-apple-blue/50 transition-shadow"
                      autoFocus
                    />
                    <button 
                      onClick={handleSaveRent}
                      disabled={isSaving}
                      className="ml-2 bg-apple-blue text-white rounded-full p-1.5 shadow-sm active:scale-95 transition-transform"
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-3 ml-4">App Preferences</h2>
          <div className="bg-apple-card rounded-[2rem] shadow-apple overflow-hidden transition-colors duration-300">
            
            <div 
              onClick={() => {
                triggerHaptic('light');
                setIsDarkMode(!isDarkMode);
              }}
              className="p-4 pl-5 flex justify-between items-center border-b border-apple-border/50 active:bg-apple-bg/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="bg-[#1D1D1F] dark:bg-white rounded-xl p-2.5 shadow-sm transition-colors">
                  <Moon size={20} className="text-white dark:text-[#1D1D1F] transition-colors" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-apple-text text-lg tracking-tight">Dark Mode</span>
              </div>
              <div className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 relative ${isDarkMode ? 'bg-apple-green' : 'bg-apple-border'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 absolute ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
            </div>

            <div 
              onClick={handleToggleNotifications}
              className={`p-4 pl-5 flex justify-between items-center border-b border-apple-border/50 transition-colors cursor-pointer active:bg-apple-bg/50`}
            >
              <div className="flex items-center gap-4">
                <div className="bg-[#FF9500] rounded-xl p-2.5 shadow-sm transition-colors">
                  <Bell size={20} className="text-white transition-colors" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-apple-text text-lg tracking-tight">Notifications</span>
              </div>
              <div className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 relative ${notificationsEnabled ? 'bg-apple-green' : 'bg-apple-border'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 absolute ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
            </div>
            
            <div className="p-4 pl-5 flex justify-between items-center border-b border-apple-border/50 active:bg-apple-bg/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-apple-green rounded-xl p-2.5 shadow-sm">
                  <Users size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-apple-text text-lg tracking-tight">Manage Members</span>
              </div>
              <ChevronRight size={20} className="text-apple-textMuted/50" />
            </div>

            <div className="p-4 pl-5 flex justify-between items-center active:bg-apple-bg/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-apple-textMuted rounded-xl p-2.5 shadow-sm">
                  <Info size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-apple-text text-lg tracking-tight">About</span>
              </div>
              <ChevronRight size={20} className="text-apple-textMuted/50" />
            </div>
          </div>
        </div>

        <div className="text-center pt-8">
          <p className="text-sm font-bold text-apple-textMuted tracking-tight">Shared Home Expense Tracker</p>
          <p className="text-xs font-semibold text-apple-textMuted/70 mt-1">Version 1.0.0 • SQLite Edition</p>
          <p className="text-xs font-semibold text-apple-textMuted/70 mt-1">Developer: Gunal S</p>
        </div>
      </div>
    </div>
  );
}
