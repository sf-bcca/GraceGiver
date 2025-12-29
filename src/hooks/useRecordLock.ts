import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface LockState {
  isLocked: boolean;
  lockedBy: string | null;
  acquiredAt?: number;
}

export function useRecordLock(resourceType: string, resourceId: string | null) {
  const { socket, connected } = useSocket();
  const [lockState, setLockState] = useState<LockState>({
    isLocked: false,
    lockedBy: null
  });
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  // Check initial lock status
  useEffect(() => {
    if (!socket || !connected || !resourceId) return;

    socket.emit('lock:check', { resourceType, resourceId }, (response: LockState | null) => {
      if (response) {
        setLockState({
          isLocked: response.isLocked,
          lockedBy: response.lockedBy
        });
      }
    });
  }, [socket, connected, resourceType, resourceId]);

  // Listen for real-time lock updates
  useEffect(() => {
    if (!socket || !resourceId) return;

    const eventName = `lock:update:${resourceType}:${resourceId}`;

    const handleLockUpdate = (data: { isLocked: boolean; lockedBy: string | null }) => {
      setLockState({
        isLocked: data.isLocked,
        lockedBy: data.lockedBy
      });
    };

    socket.on(eventName, handleLockUpdate);

    return () => {
      socket.off(eventName, handleLockUpdate);
    };
  }, [socket, resourceType, resourceId]);

  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!socket || !connected || !resourceId) return false;

    return new Promise((resolve) => {
      socket.emit('lock:acquire', { resourceType, resourceId }, (response: { success: boolean; lockedBy: string | null }) => {
        if (response.success) {
           // We acquired it
           setLockState({ isLocked: true, lockedBy: currentUser.username }); // Optimistic local update?
           // Actually, the server broadcasts the event too, but callback confirms ownership
           resolve(true);
        } else {
           resolve(false);
        }
      });
    });
  }, [socket, connected, resourceType, resourceId, currentUser.username]);

  const releaseLock = useCallback(async () => {
    if (!socket || !connected || !resourceId) return;

    return new Promise<void>((resolve) => {
      socket.emit('lock:release', { resourceType, resourceId }, () => {
        setLockState({ isLocked: false, lockedBy: null });
        resolve();
      });
    });
  }, [socket, connected, resourceType, resourceId]);

  const isLockedByOther = lockState.isLocked && lockState.lockedBy !== currentUser.username;

  return {
    isLocked: lockState.isLocked,
    lockedBy: lockState.lockedBy,
    isLockedByOther,
    acquireLock,
    releaseLock
  };
}
