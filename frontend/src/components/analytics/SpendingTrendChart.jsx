import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function SpendingTrendChart({ expenses, activeMonth, activeYear }) {
  const chartData = useMemo(() => {
    const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
    const dailyMap = {};
    
    // Initialize all days to 0
    for (let i = 1; i <= daysInMonth; i++) {
      dailyMap[i] = 0;
    }

    expenses.forEach(exp => {
      const day = new Date(exp.purchase_date).getDate();
      dailyMap[day] += parseFloat(exp.amount);
    });

    let cumulative = 0;
    return Object.keys(dailyMap).map(day => {
      cumulative += dailyMap[day];
      return {
        day: parseInt(day),
        date: format(new Date(activeYear, activeMonth - 1, parseInt(day)), 'MMM d'),
        daily: dailyMap[day],
        cumulative: cumulative
      };
    });
  }, [expenses, activeMonth, activeYear]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="mb-8"
    >
      <h3 className="text-xl font-bold text-apple-text tracking-tight mb-4">Cumulative Spending</h3>
      <div className="apple-card h-64 p-4 pr-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#8E8E93', fontSize: 10, fontWeight: 'bold' }} 
              tickCount={5}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#8E8E93', fontSize: 10, fontWeight: 'bold' }} 
              tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(28,28,30,0.8)', backdropFilter: 'blur(10px)', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
              itemStyle={{ color: '#007AFF', fontWeight: 'bold' }}
              labelStyle={{ color: '#8E8E93', fontWeight: 'bold', marginBottom: '4px' }}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
              formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Total']}
            />
            <Area 
              type="monotone" 
              dataKey="cumulative" 
              stroke="#007AFF" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCumulative)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
