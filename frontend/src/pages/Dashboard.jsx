
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ChevronRight, ChevronLeft, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useMember } from '../context/MemberContext';
import { useMonth } from '../context/MonthContext';
import AnimatedNumber from '../components/AnimatedNumber';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { triggerHaptic } from '../utils/haptics';

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55'];

export default function Dashboard() {
  const { activeMember } = useMember();
  const { activeMonth, setActiveMonth, activeYear, setActiveYear } = useMonth();
  const navigate = useNavigate();

  const cacheKey = `homesplit_dashboard_${activeMember}_${activeMonth}_${activeYear}`;

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['dashboard', activeMember, activeMonth, activeYear],
    queryFn: async () => {
      const response = await axios.get(`/api/reports/dashboard/${activeMember}?month=${activeMonth}&year=${activeYear}`);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(response.data));
      } catch (e) {
        // Ignore quota/storage errors silently
      }
      return response.data;
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : undefined;
      } catch (e) {
        return undefined;
      }
    },
    enabled: !!activeMember && !!activeMonth && !!activeYear
  });

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  const isOwed = stats.memberBalance > 0.01;
  const owes = stats.memberBalance < -0.01;
  
  const maxAmount = stats ? Math.max(...stats.memberSpending.map(m => parseFloat(m.amount))) : 0;

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
              <AnimatedNumber value={Math.abs(stats.memberBalance)} />
            </h2>
          </div>
          
          <p className="text-white/90 font-bold text-sm mt-1">
            {owes ? 'You need to pay' : isOwed ? 'You will receive' : 'You are completely settled'}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/20">
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Total Contributed</p>
              <p className="font-bold mt-1 text-lg"><AnimatedNumber value={stats.memberTotalSpent} prefix="₹" /></p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Your Equal Share</p>
              <p className="font-bold mt-1 text-lg"><AnimatedNumber value={stats.perPersonShare} prefix="₹" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="apple-card !p-4 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-1">House Total</p>
          <p className="text-xl font-black text-apple-text"><AnimatedNumber value={stats.totalSharedExpense} prefix="₹" /></p>
        </div>
        <div className="apple-card !p-4 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-1">Your Contribution</p>
          <div className="flex items-end gap-1">
            <p className="text-xl font-black text-apple-text"><AnimatedNumber value={parseFloat(stats.contributionPercentage)} maxFractionDigits={1} /></p>
            <p className="text-sm font-bold text-apple-textMuted pb-[3px]">%</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div>
        <h3 className="text-xl font-bold text-apple-text tracking-tight mb-4">House Spending Split</h3>
        <div 
          className="apple-card flex flex-col p-4 relative cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => {
            triggerHaptic('medium');
            navigate('/analytics');
          }}
        >
          {stats.memberSpending.some(m => m.amount > 0) ? (
            <>
              <div className="h-40 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.memberSpending.filter(m => m.amount > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="amount"
                      stroke="none"
                      cornerRadius={6}
                      isAnimationActive={true}
                      animationBegin={100}
                      animationDuration={1000}
                    >
                      {stats.memberSpending.filter(m => m.amount > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-apple-textMuted uppercase tracking-widest">Total</span>
                  <span className="text-xl font-black text-apple-text"><AnimatedNumber value={stats.totalSharedExpense} prefix="₹" /></span>
                </div>
              </div>
              
              <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-apple-border/50">
                {stats.memberSpending.filter(m => m.amount > 0).map((member, index) => {
                  const isHighest = parseFloat(member.amount) === maxAmount && maxAmount > 0;
                  const amount = parseFloat(member.amount);
                  const percentage = stats.totalSharedExpense > 0 ? Math.round((amount / stats.totalSharedExpense) * 100) : 0;
                  
                  return (
                    <motion.div 
                      key={member.name} 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                      className={`flex flex-col p-2.5 rounded-2xl border transition-colors ${
                        isHighest 
                          ? 'bg-apple-blue/10 border-apple-blue/20' 
                          : 'bg-apple-bg/50 border-apple-border/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <div className={`shrink-0 rounded-full ${isHighest ? 'w-2.5 h-2.5' : 'w-2 h-2'}`} style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className={`text-apple-text text-[11px] truncate ${isHighest ? 'font-bold' : 'font-semibold opacity-90'}`}>
                            {member.name}
                          </span>
                        </div>
                        {isHighest && <span className="shrink-0 text-[8px] bg-apple-blue/20 text-apple-blue font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">Top</span>}
                      </div>
                      
                      <div className="flex items-end justify-between">
                        <span className={`text-apple-text tracking-tight ${isHighest ? 'font-black text-sm' : 'font-bold text-[13px] opacity-90'}`}>
                          <AnimatedNumber value={member.amount} prefix="₹" />
                        </span>
                        <span className="text-[10px] font-bold text-apple-textMuted bg-apple-card/60 border border-apple-border/50 px-1.5 py-0.5 rounded-md">
                          {percentage}%
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-apple-bg rounded-full flex items-center justify-center mx-auto mb-3">
                <ArrowUpRight size={24} className="text-apple-textMuted" />
              </div>
              <p className="text-apple-textMuted font-medium">No expenses yet</p>
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
