import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { format } from 'date-fns';

export default function Insights({ expenses, totalAmount, activeYear, activeMonth }) {
  const insights = useMemo(() => {
    if (!expenses.length) return [];
    
    const lines = [];
    
    // 1. Highest Spender
    const map = {};
    expenses.forEach(exp => {
      map[exp.member_name] = (map[exp.member_name] || 0) + parseFloat(exp.amount);
    });
    const highestSpender = Object.keys(map).sort((a, b) => map[b] - map[a])[0];
    if (highestSpender) {
      lines.push(`${highestSpender} contributed the highest amount this month (₹${map[highestSpender].toLocaleString('en-IN')}).`);
    }

    // 2. Average Daily Spending
    const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
    const avgDaily = Math.round(totalAmount / daysInMonth);
    lines.push(`Average daily spending is roughly ₹${avgDaily.toLocaleString('en-IN')}.`);

    // 3. Highest spending day
    const byDay = {};
    expenses.forEach(exp => {
      const day = new Date(exp.purchase_date).getDate();
      byDay[day] = (byDay[day] || 0) + parseFloat(exp.amount);
    });
    const highestDay = Object.keys(byDay).sort((a, b) => byDay[b] - byDay[a])[0];
    if (highestDay) {
      const dateStr = format(new Date(activeYear, activeMonth - 1, parseInt(highestDay)), 'MMMM do');
      lines.push(`The highest spending day was ${dateStr} with ₹${byDay[highestDay].toLocaleString('en-IN')}.`);
    }

    return lines;
  }, [expenses, totalAmount, activeYear, activeMonth]);

  if (insights.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={20} className="text-apple-blue" />
        <h3 className="text-xl font-bold text-apple-text tracking-tight">Key Insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div key={idx} className="apple-card p-4 border border-apple-blue/10 bg-apple-blue/5">
            <p className="font-medium text-sm text-apple-text leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
