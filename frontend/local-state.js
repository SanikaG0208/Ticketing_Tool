import { seedCredential } from './demo-auth.js';

export const STORAGE_KEY = 'desk-local-v2';
export const initialState = {
  departments: ['IT'],
  users: [{ id:'it', name:'Manik Joshi', email:'manik@b2bindemand.com', department:'IT', credential:seedCredential }],
  types: [],
  tickets: []
};

export function loadLocalState(storage = localStorage) {
  // User-requested reset: discard the previous demo dataset, once per browser.
  storage.removeItem('desk-demo-v1');
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.users) && Array.isArray(saved.departments) && Array.isArray(saved.types) && Array.isArray(saved.tickets)) return saved;
  } catch { /* Start clean if storage is malformed. */ }
  return structuredClone(initialState);
}
