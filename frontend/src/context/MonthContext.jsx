import React, { createContext, useContext, useState, useEffect } from 'react';

const MonthContext = createContext();

export function MonthProvider({ children }) {
  const [activeMonth, setActiveMonth] = useState(() => {
    const saved = localStorage.getItem('activeMonth');
    return saved ? parseInt(saved) : (new Date().getMonth() + 1);
  });

  const [activeYear, setActiveYear] = useState(() => {
    const saved = localStorage.getItem('activeYear');
    return saved ? parseInt(saved) : new Date().getFullYear();
  });

  useEffect(() => {
    localStorage.setItem('activeMonth', activeMonth.toString());
    localStorage.setItem('activeYear', activeYear.toString());
  }, [activeMonth, activeYear]);

  return (
    <MonthContext.Provider value={{ activeMonth, setActiveMonth, activeYear, setActiveYear }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
