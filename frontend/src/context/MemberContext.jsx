import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

const MemberContext = createContext();

export const DEFAULT_MEMBERS = ['Gunal', 'Gopi', 'Sathish', 'Sekar', 'Vishnu', 'Kumar', 'Hemu'];
export const MEMBERS = DEFAULT_MEMBERS;

export function MemberProvider({ children }) {
  const { data: activeMembersData = [], refetch: refetchMembers } = useQuery({
    queryKey: ['members', 'active'],
    queryFn: async () => {
      const res = await axios.get('/api/members/active');
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  // Extract active member names (supporting both string array and object array)
  const activeNames = activeMembersData.length > 0
    ? activeMembersData.map(m => (typeof m === 'string' ? m : m.name))
    : DEFAULT_MEMBERS;

  const [activeMember, setActiveMember] = useState(() => {
    const saved = localStorage.getItem('activeMember');
    return saved || DEFAULT_MEMBERS[0];
  });

  // If saved member is not in active members (e.g. member was archived), switch to first active member
  useEffect(() => {
    if (activeMembersData.length > 0) {
      if (!activeNames.includes(activeMember)) {
        const nextMember = activeNames[0];
        setActiveMember(nextMember);
        localStorage.setItem('activeMember', nextMember);
        toast(`Active profile switched to ${nextMember}. Former member is archived.`, {
          icon: 'ℹ️',
          duration: 4000
        });
      }
    }
  }, [activeMembersData, activeNames, activeMember]);

  useEffect(() => {
    if (activeMember) {
      localStorage.setItem('activeMember', activeMember);
    }
  }, [activeMember]);

  return (
    <MemberContext.Provider 
      value={{ 
        activeMember, 
        setActiveMember, 
        MEMBERS: activeNames, 
        activeMembers: activeMembersData,
        refetchMembers 
      }}
    >
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  return useContext(MemberContext);
}
