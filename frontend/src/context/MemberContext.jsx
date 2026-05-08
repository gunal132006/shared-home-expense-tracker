import React, { createContext, useContext, useState, useEffect } from 'react';

const MemberContext = createContext();

export const MEMBERS = ['Gunal', 'Gopi', 'Sathish', 'Sekar', 'Vishnu', 'Kumar', 'Hemu'];

export function MemberProvider({ children }) {
  const [activeMember, setActiveMember] = useState(() => {
    const saved = localStorage.getItem('activeMember');
    return saved && MEMBERS.includes(saved) ? saved : MEMBERS[0];
  });

  useEffect(() => {
    localStorage.setItem('activeMember', activeMember);
  }, [activeMember]);

  return (
    <MemberContext.Provider value={{ activeMember, setActiveMember, MEMBERS }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  return useContext(MemberContext);
}
