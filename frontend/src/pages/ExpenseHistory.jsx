import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Search, Filter, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMember } from '../context/MemberContext';

export default function ExpenseHistory() {
  const { activeMember } = useMember();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMember, setFilterMember] = useState('All');
  const [members, setMembers] = useState([]);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get('/api/expenses');
      setExpenses(res.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get('/api/members');
      setMembers(res.data);
    } catch (error) {}
  };

  useEffect(() => {
    fetchExpenses();
    fetchMembers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await axios.delete(`/api/expenses/${id}`);
        toast.success('Expense deleted');
        fetchExpenses();
      } catch (error) {
        toast.error('Failed to delete expense');
      }
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.item_name.toLowerCase().includes(search.toLowerCase());
    const matchesMember = filterMember === 'All' || exp.member_name === filterMember;
    return matchesSearch && matchesMember;
  });

  return (
    <div className="px-5 pt-4 pb-12">
      <h1 className="text-3xl font-black text-apple-text tracking-tight mb-6">History</h1>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-textMuted" size={20} />
          <input 
            type="text" 
            placeholder="Search expenses" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="apple-input pl-12 py-3 bg-white shadow-sm font-medium"
          />
        </div>
        <div className="relative w-36">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-textMuted z-10" size={18} />
          <select 
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="apple-input pl-11 py-3 appearance-none bg-white shadow-sm font-semibold relative z-0"
          >
            <option value="All">All</option>
            {members.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-apple-blue"></div>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-16 text-apple-textMuted apple-card shadow-sm border border-transparent border-dashed border-apple-border">
          <p className="font-semibold text-lg">No expenses found.</p>
          <p className="text-sm mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExpenses.map(expense => {
            const isMine = expense.member_name === activeMember;
            return (
              <div key={expense.id} className={`apple-card apple-card-hover !p-4 flex justify-between items-center group relative overflow-hidden ${isMine ? 'border border-apple-blue/20 bg-apple-blueLight/10' : ''}`}>
                <div className="flex items-center gap-4 z-10">
                  <div className={`h-12 w-12 rounded-[1rem] flex items-center justify-center text-xl font-black ${isMine ? 'bg-apple-blue text-white' : 'bg-apple-border/50 text-apple-textMuted'}`}>
                    {expense.member_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-apple-text text-base">{expense.item_name}</p>
                    <p className="text-sm text-apple-textMuted font-medium mt-0.5">
                      {isMine ? 'You paid' : `${expense.member_name} paid`} • {format(new Date(expense.purchase_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end z-10">
                  <span className={`font-black text-lg tracking-tight ${isMine ? 'text-apple-blue' : 'text-apple-text'}`}>
                    ₹{parseFloat(expense.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <button 
                    onClick={() => handleDelete(expense.id)}
                    className="mt-2 text-apple-red opacity-80 active:opacity-100 p-1.5 rounded-full hover:bg-apple-redLight transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
