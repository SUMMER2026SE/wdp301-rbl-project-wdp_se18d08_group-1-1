import React, { useState, useEffect } from 'react';
import { Search, Filter, SortDesc, MoreVertical, X, Mail, Phone, Calendar, UserPlus, Users, UserCheck, Shield, UserX } from 'lucide-react';
import { apiFetch } from '../../services/api';

export default function AccountManagement() {
    const authHeader = {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    };
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, blocked
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/admin/users', { headers: authHeader });
            if (res.ok && res.data?.success) {
                setUsers(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBlockToggle = async (userId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            const res = await apiFetch(`/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: authHeader,
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok && res.data?.success) {
                const updatedUsers = users.map(u => u._id === userId ? { ...u, status: newStatus } : u);
                setUsers(updatedUsers);
                if (selectedUser?._id === userId) {
                    setSelectedUser({ ...selectedUser, status: newStatus });
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status).length;
    const staffCount = users.filter(u => u.role === 'staff' || u.role === 'admin').length;
    const blockedCount = users.filter(u => !u.status).length;

    let filteredUsers = users.filter(u => {
        const term = searchTerm.toLowerCase();
        const fullName = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.toLowerCase();
        const matchSearch = (u.username && u.username.toLowerCase().includes(term)) || 
               (u.email && u.email.toLowerCase().includes(term)) || 
               fullName.includes(term) ||
               (u.profile?.phone && u.profile.phone.includes(term));
               
        const matchFilter = filterStatus === 'all' ? true : 
                            filterStatus === 'active' ? u.status === true : 
                            u.status === false;
                            
        return matchSearch && matchFilter;
    });

    filteredUsers.sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        return 0;
    });

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="flex-1 h-[calc(100vh-70px)] flex flex-col md:flex-row relative bg-black text-[#e5e2e1]">
            <style>{`
                .glass-panel {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-top: 1px solid rgba(255, 255, 255, 0.15);
                }
                .glow-hover:hover {
                    box-shadow: 0 0 40px rgba(230, 184, 0, 0.1);
                }
                .text-gold { color: #E6B800; }
                .bg-gold { background-color: #E6B800; color: #000; }
                .border-gold { border-color: #E6B800; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
            `}</style>
            
            {/* Left Panel: Directory */}
            <section className={`w-full ${selectedUser ? 'md:w-[70%]' : 'flex-1'} h-full flex flex-col overflow-hidden p-4 md:p-6 lg:p-8 relative z-10`}>
                {/* Page Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl text-white font-bold tracking-tight">Account Management</h2>
                        <p className="text-sm text-[#d1c5ac] mt-1">Manage users, roles, and directory access.</p>
                    </div>
                    <button className="bg-gold px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-colors">
                        <UserPlus size={18} /> Add User
                    </button>
                </header>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-l-4 border-l-blue-500 glow-hover transition-all">
                        <div>
                            <p className="text-[11px] text-[#d1c5ac] uppercase tracking-wider font-semibold mb-1">Total Users</p>
                            <p className="text-2xl text-white font-bold">{loading ? '...' : totalUsers}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Users size={18} className="text-blue-400" />
                        </div>
                    </div>
                    <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-l-4 border-l-emerald-500 glow-hover transition-all">
                        <div>
                            <p className="text-[11px] text-[#d1c5ac] uppercase tracking-wider font-semibold mb-1">Active Users</p>
                            <p className="text-2xl text-white font-bold">{loading ? '...' : activeUsers}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <UserCheck size={18} className="text-emerald-400" />
                        </div>
                    </div>
                    <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-l-4 border-l-purple-500 glow-hover transition-all">
                        <div>
                            <p className="text-[11px] text-[#d1c5ac] uppercase tracking-wider font-semibold mb-1">Staff</p>
                            <p className="text-2xl text-white font-bold">{loading ? '...' : staffCount}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <Shield size={18} className="text-purple-400" />
                        </div>
                    </div>
                    <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-l-4 border-l-[#ffd555] glow-hover transition-all">
                        <div>
                            <p className="text-[11px] text-[#d1c5ac] uppercase tracking-wider font-semibold mb-1">Blocked</p>
                            <p className="text-2xl text-[#ffd555] font-bold">{loading ? '...' : blockedCount}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#ffd555]/10 flex items-center justify-center">
                            <UserX size={18} className="text-[#ffd555]" />
                        </div>
                    </div>
                </div>

                {/* Table Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d1c5ac]" />
                        <input 
                            className="w-full bg-[#050505] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-white focus:border-gold focus:ring-0 text-sm placeholder-[#d1c5ac] transition-colors" 
                            placeholder="Search users by name, email, or phone..." 
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => setFilterStatus(prev => prev === 'all' ? 'active' : prev === 'active' ? 'blocked' : 'all')}
                            className="glass-panel px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-white/5 transition-colors border border-[#2a2a2a] text-[#e5e2e1]"
                        >
                            <Filter size={16} className={filterStatus !== 'all' ? 'text-[#ffd555]' : ''} /> 
                            {filterStatus === 'all' ? 'Filter' : filterStatus === 'active' ? 'Active' : 'Blocked'}
                        </button>
                        <button 
                            onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
                            className="glass-panel px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-white/5 transition-colors border border-[#2a2a2a] text-[#e5e2e1]"
                        >
                            <SortDesc size={16} className={sortBy !== 'newest' ? 'text-[#ffd555] rotate-180' : 'transition-transform'} style={{ transition: 'transform 0.3s' }} /> 
                            {sortBy === 'newest' ? 'Newest' : 'Oldest'}
                        </button>
                    </div>
                </div>

                {/* User Directory Table */}
                <div className="glass-panel rounded-xl overflow-hidden flex-1 flex flex-col border border-[#2a2a2a]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead className="sticky top-0 z-20 bg-[#ffd555] shadow-[0_1px_0_0_#2a2a2a]">
                                <tr>
                                    <th className="px-4 py-3 text-xs text-[#353534] uppercase font-bold">User</th>
                                    <th className="px-4 py-3 text-xs text-[#353534] uppercase font-bold">Phone</th>
                                    <th className="px-4 py-3 text-xs text-[#353534] uppercase font-bold">Role</th>
                                    <th className="px-4 py-3 text-xs text-[#353534] uppercase font-bold">Status</th>
                                    <th className="px-4 py-3 text-xs text-[#353534] uppercase font-bold">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a2a2a]">
                                {filteredUsers.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-[#d1c5ac]">No users found</td>
                                    </tr>
                                )}
                                {loading && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-[#d1c5ac]">Loading users...</td>
                                    </tr>
                                )}
                                {filteredUsers.map(u => {
                                    const isStaff = u.role === 'staff' || u.role === 'admin';
                                    const fullName = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.username;
                                    
                                    return (
                                        <tr 
                                            key={u._id} 
                                            onClick={() => setSelectedUser(u)}
                                            className={`transition-colors cursor-pointer group ${selectedUser?._id === u._id ? 'bg-[#ffd555]/5 hover:bg-white/5' : 'hover:bg-white/5'}`}
                                        >
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    {u.profile?.avatar ? (
                                                        <img alt={fullName} className="w-8 h-8 rounded-full object-cover border border-[#353534]" src={u.profile.avatar} />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-[#1c1b1b] flex items-center justify-center border border-[#353534] font-bold uppercase text-xs">
                                                            {fullName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-[13px] text-white font-medium group-hover:text-[#ffd555] transition-colors truncate max-w-[150px]">{fullName}</p>
                                                        <p className="text-[11px] text-[#d1c5ac] truncate max-w-[150px]">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-[13px] text-[#e5e2e1]">{u.profile?.phone || '--'}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`px-2 py-0.5 border rounded text-[11px] font-medium capitalize ${isStaff ? 'bg-[#ffd555]/10 border-[#ffd555]/30 text-[#ffd555]' : 'bg-[#1c1b1b] border-[#353534] text-[#e5e2e1]'}`}>{u.role}</span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${u.status ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[#353534]'}`}></span>
                                                    <span className={`text-[12px] ${u.status ? 'text-[#e5e2e1]' : 'text-[#d1c5ac]'}`}>{u.status ? 'Active' : 'Blocked'}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-[12px] text-[#d1c5ac]">{formatDate(u.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="p-4 border-t border-[#2a2a2a] flex justify-between items-center mt-auto bg-black/50">
                        <p className="text-[13px] text-[#d1c5ac]">Showing {filteredUsers.length} of {totalUsers} users</p>
                    </div>
                </div>
            </section>

            {/* Right Panel: Persistent Detail */}
            <section className={`w-full md:w-[30%] h-full bg-[#1c1b1b] border-l border-[#2a2a2a] flex-col overflow-y-auto relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] ${selectedUser ? 'flex' : 'hidden'}`}>
                <div className="p-8 pb-4">
                    {/* Header Actions */}
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xs text-[#d1c5ac] uppercase tracking-widest font-semibold">User Details</h3>
                        <button className="text-[#d1c5ac] hover:text-white transition-colors" onClick={() => setSelectedUser(null)}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Profile Info */}
                    {selectedUser && (
                        <>
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="relative mb-4">
                                    {selectedUser.profile?.avatar ? (
                                        <img alt={selectedUser.username} className="w-24 h-24 rounded-full object-cover border-2 border-[#ffd555] shadow-[0_0_20px_rgba(230,184,0,0.2)]" src={selectedUser.profile.avatar} />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-[#353534] border-2 border-[#ffd555] shadow-[0_0_20px_rgba(230,184,0,0.2)] flex items-center justify-center text-3xl font-bold uppercase text-white">
                                            {selectedUser.username.charAt(0)}
                                        </div>
                                    )}
                                    <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#1c1b1b] ${selectedUser.status ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
                                </div>
                                <h2 className="text-2xl text-white font-bold mb-1">{`${selectedUser.profile?.firstName || ''} ${selectedUser.profile?.lastName || ''}`.trim() || selectedUser.username}</h2>
                                <div className="flex gap-2 mt-2">
                                    <button className="bg-[#ffd555]/10 border border-[#ffd555]/30 text-[#ffd555] px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#ffd555]/20 transition-colors capitalize">{selectedUser.role}</button>
                                </div>
                            </div>

                            {/* Contact & Meta */}
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <Mail size={18} className="text-[#d1c5ac]" />
                                    <span className="text-sm text-[#e5e2e1] truncate max-w-[200px]">{selectedUser.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone size={18} className="text-[#d1c5ac]" />
                                    <span className="text-sm text-[#e5e2e1]">{selectedUser.profile?.phone || 'Not provided'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-[#d1c5ac]" />
                                    <span className="text-sm text-[#e5e2e1]">Joined {formatDate(selectedUser.createdAt)}</span>
                                </div>
                            </div>

                            <hr className="border-[#2a2a2a] mb-8" />
                            
                            {/* Activity Timeline */}
                            <div className="mb-8">
                                <h4 className="text-xs text-[#d1c5ac] uppercase tracking-widest font-semibold mb-4">Recent Activity</h4>
                                <div className="relative border-l border-[#2a2a2a] ml-2 space-y-6 pb-4">
                                    <div className="relative pl-6">
                                        <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-[#353534] ring-4 ring-[#1c1b1b] border border-[#2a2a2a]"></div>
                                        <p className="text-[13px] text-white">Account Created</p>
                                        <p className="text-[12px] text-[#d1c5ac] mt-0.5">{formatDate(selectedUser.createdAt)}</p>
                                    </div>
                                    <div className="relative pl-6">
                                        <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-[#ffd555] ring-4 ring-[#1c1b1b]"></div>
                                        <p className="text-[13px] text-white">Profile Updated</p>
                                        <p className="text-[12px] text-[#d1c5ac] mt-0.5">{formatDate(selectedUser.updatedAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions Footer */}
                {selectedUser && (
                    <div className="mt-auto p-6 pt-4 bg-[#0e0e0e] border-t border-[#2a2a2a] sticky bottom-0">
                        <div className="flex gap-3">
                            <button className="flex-1 py-2 rounded-full border border-[#ffd555] text-[#ffd555] text-xs font-semibold hover:bg-[#ffd555] hover:text-black transition-colors">Edit User</button>
                            {selectedUser.status ? (
                                <button onClick={() => handleBlockToggle(selectedUser._id, selectedUser.status)} className="flex-1 py-2 rounded-full border border-[#ef4444]/50 text-[#ef4444] text-xs font-semibold hover:bg-[#ef4444]/10 transition-colors">Block Account</button>
                            ) : (
                                <button onClick={() => handleBlockToggle(selectedUser._id, selectedUser.status)} className="flex-1 py-2 rounded-full border border-emerald-500/50 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 transition-colors">Unblock</button>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
