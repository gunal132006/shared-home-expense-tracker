import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  ChevronLeft, 
  UserPlus, 
  Users, 
  UserCheck, 
  UserMinus, 
  Edit3, 
  RotateCcw, 
  Calendar, 
  X, 
  Check, 
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMember } from '../context/MemberContext';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

const DEFAULT_FALLBACK_MEMBERS = ['Gunal', 'Gopi', 'Sathish', 'Sekar', 'Vishnu', 'Kumar', 'Hemu'];

const AVATAR_COLORS = [
  'from-[#007AFF] to-[#0056B3]',
  'from-[#34C759] to-[#249B44]',
  'from-[#FF9500] to-[#E07A00]',
  'from-[#AF52DE] to-[#8E3DB5]',
  'from-[#5856D6] to-[#403FA6]',
  'from-[#FF2D55] to-[#D91B40]',
  'from-[#00C7BE] to-[#009E96]'
];

export default function ManageMembers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeMember, setActiveMember } = useMember();
  const { isDarkMode } = useTheme();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [archivingMember, setArchivingMember] = useState(null);
  const [restoringMember, setRestoringMember] = useState(null);

  // Form states
  const [addName, setAddName] = useState('');
  const [addMoveInDate, setAddMoveInDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [editName, setEditName] = useState('');
  const [editMoveInDate, setEditMoveInDate] = useState('');

  const [archiveMoveOutDate, setArchiveMoveOutDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all members (both active and archived)
  const { data: rawMembers = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await axios.get('/api/members');
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  // Normalize members supporting both object array and legacy string array
  const members = useMemo(() => {
    let list = Array.isArray(rawMembers) ? rawMembers : [];

    // If backend returned string array (e.g., ['Gunal', 'Gopi', ...])
    if (list.length > 0 && typeof list[0] === 'string') {
      return list.map((name, idx) => ({
        id: idx + 1,
        name,
        status: 'active',
        move_in_date: '2024-01-01',
        move_out_date: null
      }));
    }

    // If array of objects, ensure each has proper status and fallback id
    if (list.length > 0 && typeof list[0] === 'object') {
      return list.map((m, idx) => ({
        id: m.id || idx + 1,
        name: m.name || String(m),
        status: m.status || 'active',
        move_in_date: m.move_in_date || null,
        move_out_date: m.move_out_date || null
      }));
    }

    // Fallback to default 7 household members if empty and not loading
    if (list.length === 0 && !isLoading) {
      return DEFAULT_FALLBACK_MEMBERS.map((name, idx) => ({
        id: idx + 1,
        name,
        status: 'active',
        move_in_date: '2024-01-01',
        move_out_date: null
      }));
    }

    return list;
  }, [rawMembers, isLoading]);

  const activeMembers = members.filter(m => m.status === 'active' || !m.status);
  const archivedMembers = members.filter(m => m.status === 'archived');

  const broadcastMemberChange = () => {
    queryClient.invalidateQueries({ queryKey: ['members'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['settlement'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['monthly-analytics'] });

    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('homesplit_sync');
        bc.postMessage({ type: 'MEMBERS_MUTATED' });
        bc.close();
      }
    } catch (_e) {
      // Ignore broadcast errors
    }
  };

  // Add Member Handler
  const handleAddMember = async (e) => {
    e.preventDefault();
    const trimmed = addName.trim();
    if (!trimmed) {
      triggerHaptic('error');
      toast.error('Please enter a member name');
      return;
    }

    // Check duplicate locally for instant feedback
    if (activeMembers.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
      triggerHaptic('error');
      toast.error(`An active member named "${trimmed}" already exists`);
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/api/members', {
        name: trimmed,
        move_in_date: addMoveInDate
      });
      triggerHaptic('success');
      toast.success(`${trimmed} added to household!`);
      broadcastMemberChange();
      setAddName('');
      setAddMoveInDate(format(new Date(), 'yyyy-MM-dd'));
      setIsAddModalOpen(false);
    } catch (error) {
      triggerHaptic('error');
      toast.error(error.response?.data?.error || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Member Handler
  const handleEditMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      triggerHaptic('error');
      toast.error('Please enter a member name');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`/api/members/${editingMember.id}`, {
        name: trimmed,
        move_in_date: editMoveInDate || null
      });

      // If the edited member was currently active, update activeMember
      if (activeMember === editingMember.name && trimmed !== editingMember.name) {
        setActiveMember(trimmed);
      }

      triggerHaptic('success');
      toast.success('Member updated successfully');
      broadcastMemberChange();
      setEditingMember(null);
    } catch (error) {
      triggerHaptic('error');
      toast.error(error.response?.data?.error || 'Failed to update member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive Member Handler
  const handleArchiveMember = async () => {
    if (!archivingMember) return;

    if (activeMembers.length <= 1) {
      triggerHaptic('error');
      toast.error('Cannot archive the only remaining active member');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send archive request via PATCH with POST fallback if CORS/network preflight fails
      try {
        await axios.patch(`/api/members/${archivingMember.id}/archive`, {
          move_out_date: archiveMoveOutDate
        });
      } catch (patchErr) {
        if (!patchErr.response) {
          await axios.post(`/api/members/${archivingMember.id}/archive`, {
            move_out_date: archiveMoveOutDate
          });
        } else {
          throw patchErr;
        }
      }

      // If archived member was current active profile, switch to next available active member
      if (activeMember === archivingMember.name) {
        const nextActive = activeMembers.find(m => m.id !== archivingMember.id);
        if (nextActive) {
          setActiveMember(nextActive.name);
          toast(`Switched active profile to ${nextActive.name}`);
        }
      }

      triggerHaptic('success');
      toast.success(`${archivingMember.name} moved to Former Members`);
      broadcastMemberChange();
      setArchivingMember(null);
    } catch (error) {
      triggerHaptic('error');
      const errorMsg = error.response?.data?.error || error.message || 'Failed to archive member';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore Member Handler
  const handleRestoreMember = async () => {
    if (!restoringMember) return;

    setIsSubmitting(true);
    try {
      // Send restore request via PATCH with POST fallback if CORS/network preflight fails
      try {
        await axios.patch(`/api/members/${restoringMember.id}/restore`);
      } catch (patchErr) {
        if (!patchErr.response) {
          await axios.post(`/api/members/${restoringMember.id}/restore`);
        } else {
          throw patchErr;
        }
      }

      triggerHaptic('success');
      toast.success(`${restoringMember.name} restored to active household!`);
      broadcastMemberChange();
      setRestoringMember(null);
    } catch (error) {
      triggerHaptic('error');
      const errorMsg = error.response?.data?.error || error.message || 'Failed to restore member';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (member) => {
    triggerHaptic('light');
    setEditingMember(member);
    setEditName(member.name);
    setEditMoveInDate(member.move_in_date ? format(new Date(member.move_in_date), 'yyyy-MM-dd') : '');
  };

  const openArchiveModal = (member) => {
    triggerHaptic('medium');
    setArchivingMember(member);
    setArchiveMoveOutDate(format(new Date(), 'yyyy-MM-dd'));
  };

  return (
    <div className="px-5 pt-12 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate('/settings');
            }}
            className="p-2 -ml-2 rounded-full bg-apple-card text-apple-text active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-apple-text tracking-tight">Manage Members</h1>
            <p className="text-xs font-semibold text-apple-textMuted mt-0.5">Household Roster & Roommates</p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            setIsAddModalOpen(true);
          }}
          className="bg-apple-blue text-white font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-apple active:scale-95 transition-all"
        >
          <UserPlus size={16} strokeWidth={2.5} />
          <span>Add Member</span>
        </button>
      </div>

      {/* Network / API Warning Banner */}
      {isError && (
        <div className="apple-card !p-3.5 mb-6 bg-apple-red/10 border border-apple-red/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-apple-red shrink-0" />
            <span className="text-xs font-semibold text-apple-red">Could not reach server. Showing cached roster.</span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs font-bold text-apple-red hover:underline shrink-0 ml-2"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="apple-card !p-4 flex items-center gap-3.5">
          <div className="bg-apple-green/15 text-apple-green rounded-2xl p-3 shrink-0">
            <UserCheck size={22} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-apple-textMuted uppercase tracking-widest">Active</p>
            <p className="text-2xl font-black text-apple-text mt-0.5">{activeMembers.length}</p>
          </div>
        </div>

        <div className="apple-card !p-4 flex items-center gap-3.5">
          <div className="bg-apple-textMuted/15 text-apple-textMuted rounded-2xl p-3 shrink-0">
            <Clock size={22} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-apple-textMuted uppercase tracking-widest">Former</p>
            <p className="text-2xl font-black text-apple-text mt-0.5">{archivedMembers.length}</p>
          </div>
        </div>
      </div>

      {/* Active Members Section */}
      <div className="space-y-4 mb-10">
        <div className="flex justify-between items-center ml-2 mr-1">
          <h2 className="text-xs font-bold text-apple-textMuted uppercase tracking-widest">
            Active Roommates ({activeMembers.length})
          </h2>
          <span className="text-[11px] font-medium text-apple-textMuted/70">
            Splits Rent & Current Expenses
          </span>
        </div>

        {isLoading ? (
          <div className="apple-card p-8 text-center text-apple-textMuted font-medium animate-pulse">
            Loading household members...
          </div>
        ) : (
          <div className="space-y-3">
            {activeMembers.map((member, index) => {
              const isCurrentSelected = activeMember === member.name;
              const colorGradient = AVATAR_COLORS[index % AVATAR_COLORS.length];
              const moveInFormatted = member.move_in_date 
                ? format(new Date(member.move_in_date), 'MMM d, yyyy')
                : 'Initial Member';

              return (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`apple-card !p-4 flex items-center justify-between transition-all ${
                    isCurrentSelected ? 'ring-2 ring-apple-blue/50 shadow-apple' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorGradient} text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-apple-text text-base truncate">{member.name}</span>
                        {isCurrentSelected && (
                          <span className="bg-apple-blue/15 text-apple-blue text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                            You
                          </span>
                        )}
                        <span className="w-2 h-2 rounded-full bg-apple-green shrink-0"></span>
                      </div>
                      <p className="text-xs font-medium text-apple-textMuted truncate mt-0.5">
                        Moved in: {moveInFormatted}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => openEditModal(member)}
                      className="p-2 rounded-xl bg-apple-bg text-apple-textMuted hover:text-apple-text active:scale-95 transition-all"
                      title="Edit Member"
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      onClick={() => openArchiveModal(member)}
                      className="p-2 rounded-xl bg-apple-bg text-apple-red/80 hover:text-apple-red active:scale-95 transition-all"
                      title="Move Out / Archive"
                    >
                      <UserMinus size={17} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Former Members Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center ml-2 mr-1">
          <h2 className="text-xs font-bold text-apple-textMuted uppercase tracking-widest">
            Former Roommates ({archivedMembers.length})
          </h2>
          <span className="text-[11px] font-medium text-apple-textMuted/70">
            Historical Records Intact
          </span>
        </div>

        {archivedMembers.length === 0 ? (
          <div className="apple-card p-6 text-center text-apple-textMuted font-medium text-sm">
            No former members. All roommates are currently active.
          </div>
        ) : (
          <div className="space-y-3">
            {archivedMembers.map((member) => {
              const moveOutFormatted = member.move_out_date
                ? format(new Date(member.move_out_date), 'MMM d, yyyy')
                : 'Archived';
              const moveInFormatted = member.move_in_date
                ? format(new Date(member.move_in_date), 'MMM yyyy')
                : null;

              return (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="apple-card !p-4 flex items-center justify-between opacity-85 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-apple-gray text-apple-textMuted font-black text-lg flex items-center justify-center shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-apple-text text-base line-through opacity-70 truncate">
                          {member.name}
                        </span>
                        <span className="bg-apple-gray text-apple-textMuted text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                          Former
                        </span>
                      </div>
                      <p className="text-xs font-medium text-apple-textMuted truncate mt-0.5">
                        {moveInFormatted ? `${moveInFormatted} → ` : ''}Left: {moveOutFormatted}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setRestoringMember(member);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-apple-blue/15 text-apple-blue text-xs font-bold active:scale-95 transition-all shrink-0 ml-2"
                  >
                    <RotateCcw size={14} strokeWidth={2.5} />
                    <span>Restore</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="apple-card !p-5 mt-10 bg-apple-card/60 border border-apple-border/50">
        <div className="flex gap-3">
          <div className="text-apple-blue p-1 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h4 className="font-bold text-apple-text text-sm">Historical Accounting Preservation</h4>
            <p className="text-xs text-apple-textMuted leading-relaxed mt-1">
              Archiving a member excludes them from future rent splits while permanently preserving 100% of their historical expenses, contributions, and settlements.
            </p>
          </div>
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-apple-card rounded-[2rem] p-6 w-full max-w-sm shadow-apple-xl border border-apple-border/50"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-apple-text">Add Roommate</h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-full text-apple-textMuted hover:text-apple-text"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-wider mb-2">
                    Roommate Name
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Alex"
                    autoFocus
                    required
                    className="apple-input font-bold !text-black dark:!text-white placeholder:!text-gray-500 opacity-100"
                    style={{
                      WebkitTextFillColor: isDarkMode ? '#ffffff' : '#000000',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-wider mb-2">
                    Move-in Date
                  </label>
                  <input
                    type="date"
                    value={addMoveInDate}
                    onChange={(e) => setAddMoveInDate(e.target.value)}
                    required
                    className="apple-input font-semibold !text-black dark:!text-white opacity-100 [color-scheme:light] dark:[color-scheme:dark]"
                    style={{
                      WebkitTextFillColor: isDarkMode ? '#ffffff' : '#000000',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 rounded-full font-bold text-sm bg-apple-bg text-apple-text active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 apple-btn-primary shadow-apple !py-3 !text-sm"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MEMBER MODAL */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-apple-card rounded-[2rem] p-6 w-full max-w-sm shadow-apple-xl border border-apple-border/50"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-apple-text">Edit Roommate</h3>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="p-1 rounded-full text-apple-textMuted hover:text-apple-text"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditMember} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-wider mb-2">
                    Roommate Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="apple-input font-bold !text-black dark:!text-white opacity-100"
                    style={{
                      WebkitTextFillColor: isDarkMode ? '#ffffff' : '#000000',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-wider mb-2">
                    Move-in Date
                  </label>
                  <input
                    type="date"
                    value={editMoveInDate}
                    onChange={(e) => setEditMoveInDate(e.target.value)}
                    className="apple-input font-semibold !text-black dark:!text-white opacity-100 [color-scheme:light] dark:[color-scheme:dark]"
                    style={{
                      WebkitTextFillColor: isDarkMode ? '#ffffff' : '#000000',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="flex-1 py-3 rounded-full font-bold text-sm bg-apple-bg text-apple-text active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 apple-btn-primary shadow-apple !py-3 !text-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ARCHIVE / MOVE-OUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {archivingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-apple-card rounded-[2rem] p-6 w-full max-w-sm shadow-apple-xl border border-apple-border/50"
            >
              <div className="flex items-center gap-3 text-apple-red mb-4">
                <div className="p-2.5 rounded-2xl bg-apple-red/15">
                  <AlertTriangle size={24} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-apple-text">Move Out Roommate</h3>
              </div>

              <p className="text-sm text-apple-text leading-relaxed mb-4">
                Are you sure you want to archive <strong className="text-apple-text">{archivingMember.name}</strong>?
              </p>

              <div className="bg-apple-bg p-3.5 rounded-2xl mb-5 text-xs text-apple-textMuted leading-relaxed">
                ✓ Historical expenses & settlements are permanently preserved.<br />
                ✓ They will be removed from future household rent splits.<br />
                ✓ You can restore them anytime if they move back.
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-apple-textMuted uppercase tracking-wider mb-2">
                  Move-out Date
                </label>
                <input
                  type="date"
                  value={archiveMoveOutDate}
                  onChange={(e) => setArchiveMoveOutDate(e.target.value)}
                  required
                  className="apple-input font-semibold !text-black dark:!text-white opacity-100 [color-scheme:light] dark:[color-scheme:dark]"
                  style={{
                    WebkitTextFillColor: isDarkMode ? '#ffffff' : '#000000',
                    color: isDarkMode ? '#ffffff' : '#000000'
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setArchivingMember(null)}
                  className="flex-1 py-3 rounded-full font-bold text-sm bg-apple-bg text-apple-text active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchiveMember}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-full font-bold text-sm bg-apple-red text-white shadow-apple active:scale-95 transition-all"
                >
                  {isSubmitting ? 'Archiving...' : 'Move Out'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESTORE CONFIRMATION MODAL */}
      <AnimatePresence>
        {restoringMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-apple-card rounded-[2rem] p-6 w-full max-w-sm shadow-apple-xl border border-apple-border/50 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-apple-blue/15 text-apple-blue flex items-center justify-center mx-auto mb-4">
                <RotateCcw size={28} strokeWidth={2.5} />
              </div>

              <h3 className="text-xl font-black text-apple-text mb-2">Restore Roommate</h3>
              <p className="text-sm text-apple-textMuted leading-relaxed mb-6">
                Restore <strong className="text-apple-text">{restoringMember.name}</strong> to the active household roster? They will be included in the active rent split.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRestoringMember(null)}
                  className="flex-1 py-3 rounded-full font-bold text-sm bg-apple-bg text-apple-text active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreMember}
                  disabled={isSubmitting}
                  className="flex-1 apple-btn-primary shadow-apple !py-3 !text-sm"
                >
                  {isSubmitting ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
