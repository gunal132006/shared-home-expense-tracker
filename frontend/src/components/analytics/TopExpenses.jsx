import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function TopExpenses({ expenses }) {
  const topExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 3);
  }, [expenses]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="mb-8"
    >
      <h3 className="text-xl font-bold text-apple-text tracking-tight mb-4">Largest Expenses</h3>
      <div className="space-y-3">
        {topExpenses.map((expense, index) => (
          <motion.div 
            key={expense.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + (index * 0.1), duration: 0.4 }}
            className="apple-card p-4 flex justify-between items-center"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-apple-gray flex items-center justify-center text-lg font-black text-apple-text">
                {index + 1}
              </div>
              <div>
                <p className="font-bold text-apple-text text-base">{expense.item_name}</p>
                <p className="text-xs text-apple-textMuted font-medium mt-0.5">
                  {expense.member_name} • {format(new Date(expense.purchase_date), 'MMM d')}
                </p>
              </div>
            </div>
            <div className="font-black text-lg text-apple-text tracking-tight">
              ₹{parseFloat(expense.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </motion.div>
        ))}
        {topExpenses.length === 0 && (
          <div className="apple-card text-center py-6 text-apple-textMuted font-medium text-sm">No expenses found.</div>
        )}
      </div>
    </motion.div>
  );
}
