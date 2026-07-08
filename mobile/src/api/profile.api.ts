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
  const res = await axiosClient.get<{ data: Profile }>('/profile');
  return res.data.data;
};
