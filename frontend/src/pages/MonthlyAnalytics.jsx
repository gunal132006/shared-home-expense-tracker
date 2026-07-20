
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useMonth } from '../context/MonthContext';
import AnalyticsHeader from '../components/analytics/AnalyticsHeader';
import MonthlySummary from '../components/analytics/MonthlySummary';
import SpendingTrendChart from '../components/analytics/SpendingTrendChart';
import MemberContributionChart from '../components/analytics/MemberContributionChart';
import TopExpenses from '../components/analytics/TopExpenses';
import Insights from '../components/analytics/Insights';

export default function MonthlyAnalytics() {
  const { activeMonth, activeYear } = useMonth();

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-analytics', activeMonth, activeYear],
    queryFn: async () => {
      const response = await axios.get(`/api/reports/monthly-analytics?month=${activeMonth}&year=${activeYear}`);
      return response.data;
    },
    enabled: !!activeMonth && !!activeYear
  });

  if (isLoading || !data) {
    return (
      <div className="px-5 pt-6 space-y-8 animate-pulse">
        <div className="h-10 w-full bg-apple-border rounded-lg"></div>
        <div className="h-24 w-full bg-apple-border rounded-[2rem]"></div>
        <div className="h-64 w-full bg-apple-border rounded-[2rem]"></div>
        <div className="h-48 w-full bg-apple-border rounded-3xl"></div>
      </div>
    );
  }

  const { expenses, totalAmount } = data;

  return (
    <div className="px-5 pt-6 pb-12">
      <AnalyticsHeader activeMonth={activeMonth} activeYear={activeYear} />
      <MonthlySummary expenses={expenses} totalAmount={totalAmount} />
      <SpendingTrendChart expenses={expenses} activeMonth={activeMonth} activeYear={activeYear} />
      <MemberContributionChart expenses={expenses} totalAmount={totalAmount} />
      <TopExpenses expenses={expenses} />
      <Insights expenses={expenses} totalAmount={totalAmount} activeMonth={activeMonth} activeYear={activeYear} />
    </div>
  );
}
