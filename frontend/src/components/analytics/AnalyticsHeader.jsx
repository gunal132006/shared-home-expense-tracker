
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function AnalyticsHeader({ activeMonth, activeYear }) {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="flex items-center justify-between mb-6 px-1"
    >
      <button 
        onClick={() => navigate(-1)} 
        className="p-2 -ml-2 rounded-full hover:bg-apple-card active:scale-90 transition-all text-apple-text"
      >
        <ChevronLeft size={24} />
      </button>
      <h2 className="text-xl font-bold text-apple-text tracking-tight">
        {format(new Date(activeYear, activeMonth - 1), 'MMMM yyyy')} Analytics
      </h2>
      <div className="w-10"></div> {/* Spacer for centering */}
    </motion.div>
  );
}
