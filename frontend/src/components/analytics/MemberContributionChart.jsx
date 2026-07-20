import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function MemberContributionChart({ expenses, totalAmount }) {
  const memberStats = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      map[exp.member_name] = (map[exp.member_name] || 0) + parseFloat(exp.amount);
    });

    return Object.keys(map)
      .map(name => ({ name, amount: map[name] }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="mb-8"
    >
      <h3 className="text-xl font-bold text-apple-text tracking-tight mb-4">Top Contributors</h3>
      <div className="apple-card p-5 space-y-4">
        {memberStats.map((member, index) => {
          const percentage = totalAmount > 0 ? (member.amount / totalAmount) * 100 : 0;
          return (
            <div key={member.name} className="w-full">
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-apple-text">{member.name}</span>
                <span className="text-sm font-bold text-apple-textMuted">₹{member.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-3 w-full bg-apple-bg rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.6 + (index * 0.1), duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-apple-blue rounded-full"
                />
              </div>
            </div>
          );
        })}
        {memberStats.length === 0 && (
          <p className="text-center text-apple-textMuted font-medium text-sm py-4">No contributions yet.</p>
        )}
      </div>
    </motion.div>
  );
}
