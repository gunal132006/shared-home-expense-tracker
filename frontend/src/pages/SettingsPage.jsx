import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Home, Users, Moon, Info, ChevronRight, Check, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMember } from '../context/MemberContext';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  const [rent, setRent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingRent, setIsEditingRent] = useState(false);
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { activeMember } = useMember();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        setRent(res.data.monthly_rent);
      } catch (error) {
        toast.error('Failed to load settings');
      }
    };
    fetchSettings();

    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const handleSaveRent = async () => {
    setIsSaving(true);
    try {
      await axios.put('/api/settings', { monthly_rent: parseFloat(rent) });
      toast.success('Rent updated successfully');
      setIsEditingRent(false);
    } catch (error) {
      toast.error('Failed to update rent');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported by your browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permission for notifications was denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const { data } = await axios.get('/api/notifications/vapidPublicKey');
      const convertedVapidKey = urlBase64ToUint8Array(data.publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      await axios.post('/api/notifications/subscribe', {
        member_name: activeMember,
        subscription
      });

      setNotificationsEnabled(true);
      toast.success('Notifications enabled successfully!');
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('Failed to enable notifications');
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
              onClick={() => setIsDarkMode(!isDarkMode)}
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
              onClick={notificationsEnabled ? null : handleEnableNotifications}
              className={`p-4 pl-5 flex justify-between items-center border-b border-apple-border/50 transition-colors ${notificationsEnabled ? '' : 'active:bg-apple-bg/50 cursor-pointer'}`}
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
