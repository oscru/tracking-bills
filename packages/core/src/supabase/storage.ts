import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Auth-session storage that is safe on native, web, and during web
 * static rendering (Node, where `window` is undefined).
 *
 * - native: AsyncStorage
 * - web (browser): localStorage
 * - web (SSR/SSG): in-memory, so `createClient` never touches `window`
 */
type SupabaseAuthStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const memory = new Map<string, string>();

const hasLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

const webStorage: SupabaseAuthStorage = {
  getItem: async (key) =>
    hasLocalStorage() ? window.localStorage.getItem(key) : (memory.get(key) ?? null),
  setItem: async (key, value) => {
    if (hasLocalStorage()) window.localStorage.setItem(key, value);
    else memory.set(key, value);
  },
  removeItem: async (key) => {
    if (hasLocalStorage()) window.localStorage.removeItem(key);
    else memory.delete(key);
  },
};

export const authStorage: SupabaseAuthStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;
