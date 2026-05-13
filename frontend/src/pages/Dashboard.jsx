import React from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpRight, TrendingUp, ChevronRight, ChevronLeft, Activity, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useMember } from '../context/MemberContext';
import { useMonth } from '../context/MonthContext';

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55'];

export default function Dashboard() {
  const { activeMember } = useMember();
  const { activeMonth, setActiveMonth, activeYear, setActiveYear } = useMonth();

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['dashboard', activeMember, activeMonth, activeYear],
    queryFn: async () => {
      const response = await axios.get(`/api/reports/dashboard/${activeMember}?month=${activeMonth}&year=${activeYear}`);
      return response.data;
    },
    enabled: !!activeMember && !!activeMonth && !!activeYear
  });

  if (loading || !stats) {
    return (
      <div className="px-5 pt-6 space-y-8 animate-pulse">
        <div className="h-6 w-32 bg-apple-border rounded-lg"></div>
        <div className="h-56 w-full bg-apple-border rounded-[2rem]"></div>
        <div className="h-48 w-full bg-apple-border rounded-3xl"></div>
      </div>
    );
  }

  const isOwed = stats.memberBalance > 0.01;
  const owes = stats.memberBalance < -0.01;

  const handlePrevMonth = () => {
    if (activeMonth === 1) {
      setActiveMonth(12);
      setActiveYear(activeYear - 1);
    } else {
      setActiveMonth(activeMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth === 12) {
      setActiveMonth(1);
      setActiveYear(activeYear + 1);
    } else {
      setActiveMonth(activeMonth + 1);
    }
  };

  return (
    <div className="px-5 pt-2 space-y-8">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-apple-card/80 backdrop-blur-md rounded-full px-4 py-2 shadow-sm border border-apple-border/50 max-w-[200px] mx-auto transition-colors duration-300">
        <button onClick={handlePrevMonth} className="text-apple-textMuted hover:text-apple-text p-1 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-sm tracking-wide text-apple-text">
          {format(new Date(activeYear, activeMonth - 1), 'MMM yyyy')}
        </span>
        <button onClick={handleNextMonth} className="text-apple-textMuted hover:text-apple-text p-1 active:scale-90 transition-all">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Wallet Card */}
      <div className={`wallet-card transition-all duration-500 ease-in-out ${owes ? 'bg-gradient-to-br from-[#FF3B30] to-[#E3261C]' : isOwed ? 'bg-gradient-to-br from-[#34C759] to-[#249B44]' : 'bg-gradient-to-br from-[#007AFF] to-[#0056B3]'}`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <p className="text-white/80 font-medium text-sm tracking-wide uppercase">{activeMember}'s Balance</p>
            <div className="bg-white/20 backdrop-blur-md rounded-full p-2">
              <Wallet size={16} className="text-white" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white/80">
              {owes ? '-' : isOwed ? '+' : ''}₹
            </span>
            <h2 className="text-5xl font-black tracking-tighter">
              {Math.abs(stats.memberBalance).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h2>
          </div>
          
          <p className="text-white/90 font-bold text-sm mt-1">
            {owes ? 'You need to pay' : isOwed ? 'You will receive' : 'You are completely settled'}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/20">
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Total Contributed</p>
              <p className="font-bold mt-1 text-lg">₹{stats.memberTotalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Your Equal Share</p>
              <p className="font-bold mt-1 text-lg">₹{stats.perPersonShare.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="apple-card !p-4 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-1">House Total</p>
          <p className="text-xl font-black text-apple-text">₹{stats.totalSharedExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="apple-card !p-4 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-1">Your Contribution</p>
          <div className="flex items-end gap-1">
            <p className="text-xl font-black text-apple-text">{stats.contributionPercentage}</p>
            <p className="text-sm font-bold text-apple-textMuted pb-[3px]">%</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div>
        <h3 className="text-xl font-bold text-apple-text tracking-tight mb-4">House Spending Split</h3>
        <div className="apple-card flex items-center justify-center h-56 relative">
          {stats.memberSpending.some(m => m.amount > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.memberSpending.filter(m => m.amount > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="amount"
                  stroke="none"
                  cornerRadius={8}
                >
                  {stats.memberSpending.filter(m => m.amount > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '12px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-apple-bg rounded-full flex items-center justify-center mx-auto mb-3">
                <ArrowUpRight size={24} className="text-apple-textMuted" />
              </div>
              <p className="text-apple-textMuted font-medium">No expenses yet</p>
            </div>
          )}
          
          {stats.memberSpending.some(m => m.amount > 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-apple-textMuted uppercase tracking-widest">Total</span>
              <span className="text-xl font-black text-apple-text">₹{stats.totalSharedExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="pb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-apple-text tracking-tight">Recent Activity</h3>
          <Link to="/history" className="text-apple-blue font-semibold text-sm flex items-center group">
            See All <ChevronRight size={16} className="ml-0.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="space-y-3">
          {stats.recentExpenses.length === 0 ? (
            <div className="apple-card text-center py-8 text-apple-textMuted font-medium">No recent activity.</div>
          ) : (
            stats.recentExpenses.slice(0, 4).map(expense => {
              const isMine = expense.member_name === activeMember;
              return (
                <div key={expense.id} className={`apple-card apple-card-hover p-4 flex justify-between items-center ${isMine ? 'border border-apple-blue/20' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black transition-colors duration-300 ${isMine ? 'bg-apple-blue text-white' : 'bg-apple-gray text-apple-text'}`}>
                      {expense.member_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-apple-text text-base">{expense.item_name}</p>
                      <p className="text-sm text-apple-textMuted font-medium mt-0.5">
                        {isMine ? 'You paid' : `${expense.member_name} paid`} • {format(new Date(expense.purchase_date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                  <div className={`font-black text-lg tracking-tight ${isMine ? 'text-apple-blue' : 'text-apple-text'}`}>
                    ₹{parseFloat(expense.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
