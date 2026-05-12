import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { X } from 'lucide-react';

export default function AddExpense() {
  const navigate = useNavigate();
  const amountInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    item_name: '',
    amount: '',
    member_name: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });
  
  const [members, setMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (amountInputRef.current) {
      setTimeout(() => amountInputRef.current.focus(), 300);
    }
    
    const fetchMembers = async () => {
      try {
        const res = await axios.get('/api/members');
        setMembers(res.data);
        if (res.data.length > 0) {
          setFormData(prev => ({ ...prev, member_name: res.data[0] }));
        }
      } catch (error) {
        toast.error('Failed to load members');
      }
    };
    fetchMembers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name || !formData.amount || !formData.member_name) {
      toast.error('Please fill required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await axios.post('/api/expenses', formData);
      toast.success('Expense Added');
      navigate(-1);
    } catch (error) {
      toast.error('Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-apple-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pt-12 pb-4 bg-white/80 dark:bg-apple-bg/80 backdrop-blur-xl border-b border-apple-border">
        <button 
          type="button" 
          onClick={() => navigate(-1)}
          className="h-10 w-10 bg-apple-bg rounded-full flex items-center justify-center text-apple-text active:scale-95 transition-transform"
        >
          <X size={20} strokeWidth={3} />
        </button>
        <h1 className="text-xl font-black text-apple-text">Add Expense</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-24">
        <form id="add-expense-form" onSubmit={handleSubmit} className="space-y-6">
          
          <div className="apple-card !p-6 !rounded-[2rem] border-2 border-transparent focus-within:border-apple-blue/20">
            <label className="block text-sm font-bold text-apple-textMuted uppercase tracking-widest mb-3">Amount</label>
            <div className="flex items-center">
              <span className="text-4xl font-black text-apple-text mr-2">₹</span>
              <input
                ref={amountInputRef}
                type="number"
                name="amount"
                inputMode="decimal"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-transparent text-5xl font-black text-apple-text placeholder-apple-textMuted/30 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="apple-card !p-6 !rounded-[2rem] space-y-6">
            <div>
              <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-3">What was it?</label>
              <input
                type="text"
                name="item_name"
                value={formData.item_name}
                onChange={handleChange}
                placeholder="e.g. Milk, WiFi, Groceries"
                className="apple-input font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-3">Who Paid?</label>
                <div className="relative">
                  <select
                    name="member_name"
                    value={formData.member_name}
                    onChange={handleChange}
                    className="apple-input appearance-none font-semibold cursor-pointer bg-white dark:bg-apple-card dark:text-white dark:[color-scheme:dark]"
                    required
                  >
                    {members.map(m => <option key={m} value={m} className="dark:bg-apple-card dark:text-white">{m}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-apple-textMuted">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-3">Date</label>
                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  className="apple-input font-semibold bg-white dark:bg-apple-card dark:text-white dark:[color-scheme:dark]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-3">Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any extra details here..."
                className="apple-input min-h-[100px] resize-none font-medium"
              />
            </div>
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-apple-bg via-apple-bg to-transparent pb-8">
        <button
          form="add-expense-form"
          type="submit"
          disabled={isSubmitting}
          className="apple-btn-primary shadow-apple-xl w-full"
        >
          {isSubmitting ? 'Saving...' : 'Save Expense'}
        </button>
      </div>
    </div>
  );
}
