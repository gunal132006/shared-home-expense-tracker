import { useMemo } from 'react';
import { motion } from 'framer-motion';
import AnimatedNumber from '../AnimatedNumber';

export default function MonthlySummary({ expenses, totalAmount }) {
  const stats = useMemo(() => {
    if (!expenses.length) return { avgPerDay: 0, highestDay: 0, totalDays: 1 };
    
    // Group by day to find highest spending day
    const byDay = {};
    expenses.forEach(exp => {
      const day = new Date(exp.purchase_date).getDate();
      byDay[day] = (byDay[day] || 0) + parseFloat(exp.amount);
    });
    
    const highestDayAmount = Math.max(...Object.values(byDay), 0);
    const avgPerDay = totalAmount / new Date(expenses[0].year, expenses[0].month, 0).getDate(); // Days in month

    return { avgPerDay, highestDayAmount };
  }, [expenses, totalAmount]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="grid grid-cols-2 gap-4 mb-8"
    >
      <div className="apple-card !p-4 flex flex-col justify-center items-center text-center">
        <p className="text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-1">Avg Per Day</p>
        <p className="text-xl font-black text-apple-text"><AnimatedNumber value={stats.avgPerDay} prefix="₹" /></p>
      </div>
      <div className="apple-card !p-4 flex flex-col justify-center items-center text-center">
        <p className="text-xs font-bold text-apple-textMuted uppercase tracking-widest mb-1">Total Spent</p>
        <p className="text-xl font-black text-apple-text"><AnimatedNumber value={totalAmount} prefix="₹" /></p>
      </div>
    </motion.div>
  );
}
