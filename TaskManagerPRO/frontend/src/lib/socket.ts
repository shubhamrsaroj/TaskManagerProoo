'use client';

import { io } from 'socket.io-client';

// Create a socket instance that will be connected when needed
let socket: any;

// Only initialize the socket in the browser environment
if (typeof window !== 'undefined') {
  const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
  
  socket = io(socketUrl, {
    autoConnect: false,
    withCredentials: true,
  });
} else {
  // Create a mock implementation for server-side rendering
  socket = {
    on: () => {},
    off: () => {},
    emit: () => {},
    connect: () => {},
    disconnect: () => {},
  };
}

// Export functions to manage socket
export const connectSocket = (token: string) => {
  if (typeof window !== 'undefined' && socket) {
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (typeof window !== 'undefined' && socket) {
    socket.disconnect();
  }
};

export default socket; 