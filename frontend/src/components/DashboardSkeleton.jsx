import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="px-5 pt-2 space-y-8 animate-pulse">
      {/* Month Selector Skeleton */}
      <div className="flex items-center justify-between bg-apple-card/80 rounded-full px-4 py-2 shadow-sm border border-apple-border/50 max-w-[200px] mx-auto h-9">
        <div className="h-4 w-4 bg-apple-border/60 rounded-full"></div>
        <div className="h-4 w-20 bg-apple-border/60 rounded"></div>
        <div className="h-4 w-4 bg-apple-border/60 rounded-full"></div>
      </div>

      {/* Wallet Card Skeleton */}
      <div className="wallet-card bg-apple-card/80 border border-apple-border/50 min-h-[220px] rounded-[2rem] p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="h-4 w-28 bg-apple-border/60 rounded"></div>
          <div className="h-8 w-8 bg-apple-border/60 rounded-full"></div>
        </div>
        <div className="space-y-2 my-4">
          <div className="h-10 w-40 bg-apple-border/60 rounded-lg"></div>
          <div className="h-4 w-32 bg-apple-border/60 rounded"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-apple-border/40">
          <div className="space-y-1">
            <div className="h-3 w-16 bg-apple-border/60 rounded"></div>
            <div className="h-5 w-20 bg-apple-border/60 rounded"></div>
          </div>
          <div className="space-y-1">
            <div className="h-3 w-16 bg-apple-border/60 rounded"></div>
            <div className="h-5 w-20 bg-apple-border/60 rounded"></div>
          </div>
        </div>
      </div>

      {/* Mini Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="apple-card !p-4 flex flex-col items-center justify-center space-y-2 h-20">
          <div className="h-3 w-20 bg-apple-border/60 rounded"></div>
          <div className="h-6 w-16 bg-apple-border/60 rounded"></div>
        </div>
        <div className="apple-card !p-4 flex flex-col items-center justify-center space-y-2 h-20">
          <div className="h-3 w-20 bg-apple-border/60 rounded"></div>
          <div className="h-6 w-16 bg-apple-border/60 rounded"></div>
        </div>
      </div>

      {/* Donut Chart Section Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-44 bg-apple-border/60 rounded"></div>
        <div className="apple-card p-6 flex flex-col items-center justify-center space-y-4 min-h-[220px]">
          <div className="w-36 h-36 rounded-full border-8 border-apple-border/50 flex items-center justify-center">
            <div className="h-4 w-16 bg-apple-border/60 rounded"></div>
          </div>
        </div>
      </div>

      {/* Recent Activity Skeleton */}
      <div className="pb-8 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-apple-border/60 rounded"></div>
          <div className="h-4 w-16 bg-apple-border/60 rounded"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="apple-card p-4 flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-apple-border/60 rounded-2xl shrink-0"></div>
                <div className="space-y-1">
                  <div className="h-4 w-28 bg-apple-border/60 rounded"></div>
                  <div className="h-3 w-20 bg-apple-border/60 rounded"></div>
                </div>
              </div>
              <div className="h-5 w-14 bg-apple-border/60 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
