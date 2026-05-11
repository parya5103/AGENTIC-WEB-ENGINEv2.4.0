/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

// Mock Auth system
export interface User {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerData: any[];
}

let currentUser: User | null = JSON.parse(localStorage.getItem('mock_user') || 'null');
const listeners: Array<(user: User | null) => void> = [];

export const auth = {
  get currentUser() { return currentUser; }
};

export const onAuthStateChanged = (cb: (user: User | null) => void) => {
  listeners.push(cb);
  cb(currentUser);
  return () => {
    const index = listeners.indexOf(cb);
    if (index > -1) listeners.splice(index, 1);
  };
};

export const signIntoApp = async () => {
  currentUser = {
    uid: 'local-user-admin',
    email: 'admin@nicheflow.empire',
    displayName: 'Empire Overlord',
    emailVerified: true,
    isAnonymous: false,
    providerData: []
  };
  localStorage.setItem('mock_user', JSON.stringify(currentUser));
  listeners.forEach(cb => cb(currentUser));
  return { user: currentUser };
};

export const logoutFromApp = async () => {
  currentUser = null;
  localStorage.removeItem('mock_user');
  listeners.forEach(cb => cb(null));
};

// Mock Firestore (not used but kept for compatibility)
export const db = {} as any;

export function handleFirestoreError(error: any, operation: string, path: string | null = null): never {
  console.error(`[Mock DS] Operation ${operation} on ${path} failed:`, error);
  throw error;
}
