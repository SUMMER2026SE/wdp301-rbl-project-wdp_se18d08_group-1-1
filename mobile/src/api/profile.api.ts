import axiosClient from './axiosClient';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type Profile = {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  avatar?: string;
  role: string;
  createdAt?: string;
  wallet?: {
    balance: number;
  };
};

// ─── Endpoints ─────────────────────────────────────────────────────────────────
export const fetchProfile = async (): Promise<Profile> => {
  const res = await axiosClient.get<{ data: any }>('/profile');
  const d = res.data.data;
  
  return {
    _id: d.id || d._id,
    username: d.username,
    email: d.email,
    role: d.role,
    createdAt: d.createdAt,
    fullName: d.profile?.lastName || d.profile?.firstName 
      ? `${d.profile.lastName || ''} ${d.profile.firstName || ''}`.trim() 
      : undefined,
    phone: d.profile?.phone,
    avatar: d.profile?.avatar,
    wallet: d.wallet,
  };
};
