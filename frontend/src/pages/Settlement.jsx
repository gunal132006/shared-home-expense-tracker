import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useMember } from '../context/MemberContext';
import { useMonth } from '../context/MonthContext';

export default function Settlement() {
  const { activeMember } = useMember();
  const { activeMonth, activeYear } = useMonth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettlement = async () => {
      try {
        const res = await axios.get(`/api/reports/settlement?month=${activeMonth}&year=${activeYear}`);
        setReport(res.data);
      } catch (error) {
        toast.error('Failed to generate settlement report');
      } finally {
        setLoading(false);
      }
    };
    fetchSettlement();
  }, [activeMonth, activeYear]);

  if (loading || !report) {
    return (
      <div className="px-5 pt-12 space-y-8 animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-4 w-24 bg-apple-border rounded-md mb-2"></div>
            <div className="h-8 w-40 bg-apple-border rounded-lg"></div>
          </div>
          <div className="h-12 w-12 bg-apple-border rounded-full"></div>
        </div>
        <div className="h-32 w-full bg-apple-border rounded-[2rem]"></div>
        <div className="h-24 w-full bg-apple-border rounded-[1.5rem]"></div>
        <div className="h-24 w-full bg-apple-border rounded-[1.5rem]"></div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-sm font-semibold text-apple-textMuted uppercase tracking-widest">{format(new Date(activeYear, activeMonth - 1), 'MMMM yyyy')}</p>
          <h1 className="text-3xl font-black text-apple-text tracking-tight mt-1">Settlement</h1>
        </div>
      </div>

      <div className="wallet-card mb-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="grid grid-cols-2 gap-y-6 relative z-10">
          <div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Total House Expense</p>
            <p className="text-2xl font-black mt-1">₹{report.totalHouseExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Per Person</p>
            <p className="text-2xl font-black mt-1">₹{report.perPersonShare.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-apple-text tracking-tight mb-4">How to settle up</h2>
      <div className="space-y-4 mb-10">
        {report.suggestions.length === 0 ? (
          <div className="apple-card text-center py-10 flex flex-col items-center justify-center text-apple-green bg-apple-greenLight/50 border border-apple-green/20">
            <div className="h-16 w-16 bg-apple-green/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-apple-green" />
            </div>
            <p className="font-bold text-lg text-apple-text">All settled up!</p>
            <p className="text-sm text-apple-textMuted font-medium mt-1">No one owes anything this month.</p>
          </div>
        ) : (
          report.suggestions.map((s, i) => {
            const isMe = s.from === activeMember || s.to === activeMember;
            return (
              <div key={i} className={`apple-card !p-5 flex items-center justify-between border-l-4 ${isMe ? 'border-l-apple-blue shadow-apple-lg' : 'border-l-apple-border/50 opacity-70'}`}>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 text-right">
                    <span className={`font-black text-base ${s.from === activeMember ? 'text-apple-red' : 'text-apple-text'}`}>{s.from === activeMember ? 'You' : s.from}</span>
                  </div>
                  <div className="flex items-center text-apple-textMuted bg-apple-bg px-2 py-1 rounded-full mx-1">
                    <ArrowRight size={16} strokeWidth={3} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`font-black text-base ${s.to === activeMember ? 'text-apple-green' : 'text-apple-text'}`}>{s.to === activeMember ? 'You' : s.to}</span>
                  </div>
                </div>
                <div className={`font-black ml-4 px-3 py-1.5 rounded-xl tracking-tight whitespace-nowrap ${isMe ? 'bg-apple-blue text-white' : 'bg-apple-bg text-apple-textMuted'}`}>
                  ₹{s.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <h2 className="text-xl font-bold text-apple-text tracking-tight mb-4">Balances</h2>
      <div className="space-y-3 pb-8">
        {report.balances.map(b => {
          const isMe = b.member === activeMember;
          return (
            <div key={b.member} className={`apple-card !p-4 flex justify-between items-center group ${isMe ? 'ring-2 ring-apple-blue/20 bg-apple-blueLight/5' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg tracking-tight transition-colors duration-300 ${isMe ? 'bg-apple-blue text-white shadow-sm' : 'bg-apple-gray text-apple-text'}`}>
                  {b.member.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-apple-text text-base">{isMe ? 'You' : b.member}</p>
                  <p className="text-sm text-apple-textMuted font-medium mt-0.5">Spent: ₹{b.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                {b.balance > 0.01 ? (
                  <div className="text-apple-green font-black text-lg tracking-tight">
                    +₹{b.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                ) : b.balance < -0.01 ? (
                  <div className="text-apple-red font-black text-lg tracking-tight">
                    -₹{Math.abs(b.balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                ) : (
                  <div className="text-apple-textMuted font-black text-lg tracking-tight">
                    ₹0
                  </div>
                )}
                <div className={`text-[10px] uppercase font-bold tracking-widest mt-1 px-2 py-0.5 rounded-md ${
                  b.balance > 0.01 ? 'bg-apple-greenLight text-apple-green' : 
                  b.balance < -0.01 ? 'bg-apple-redLight text-apple-red' : 
                  'bg-apple-bg text-apple-textMuted'
                }`}>
                  {b.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
