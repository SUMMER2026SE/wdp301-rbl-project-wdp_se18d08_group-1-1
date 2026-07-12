import { useContext } from 'react';
import SocketContext from '../contexts/SocketProvider';

export function useSocket() {
  return useContext(SocketContext);
}
