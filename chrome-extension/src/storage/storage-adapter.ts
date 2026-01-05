/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for chrome.storage.local that mirrors
 * the localStorage API but with async/await support.
 *
 * This abstraction makes it easy to:
 * 1. Migrate from localStorage to chrome.storage
 * 2. Mock storage in tests
 * 3. Switch storage backends if needed
 */

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAll(): Promise<{ [key: string]: any }>;
}

class ChromeStorageAdapter implements StorageAdapter {
  /**
   * Get a value from storage by key
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : null;
    } catch (error) {
      console.error(`Storage get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`Storage set error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Remove a value from storage by key
   */
  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`Storage remove error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }

  /**
   * Get all items from storage
   */
  async getAll(): Promise<{ [key: string]: any }> {
    try {
      return await chrome.storage.local.get(null);
    } catch (error) {
      console.error('Storage getAll error:', error);
      return {};
    }
  }

  /**
   * Get multiple keys at once
   */
  async getMultiple(keys: string[]): Promise<{ [key: string]: any }> {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.error('Storage getMultiple error:', error);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs at once
   */
  async setMultiple(items: { [key: string]: any }): Promise<void> {
    try {
      await chrome.storage.local.set(items);
    } catch (error) {
      console.error('Storage setMultiple error:', error);
      throw error;
    }
  }

  /**
   * Remove multiple keys at once
   */
  async removeMultiple(keys: string[]): Promise<void> {
    try {
      await chrome.storage.local.remove(keys);
    } catch (error) {
      console.error('Storage removeMultiple error:', error);
      throw error;
    }
  }

  /**
   * Get storage usage info
   */
  async getBytesInUse(keys?: string | string[]): Promise<number> {
    try {
      return await chrome.storage.local.getBytesInUse(keys);
    } catch (error) {
      console.error('Storage getBytesInUse error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const storageAdapter: StorageAdapter = new ChromeStorageAdapter();

// Helper functions for common operations
export const storage = {
  /**
   * Get a value with a default fallback
   */
  async getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
    const value = await storageAdapter.get<T>(key);
    return value !== null ? value : defaultValue;
  },

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await storageAdapter.get(key);
    return value !== null;
  },

  /**
   * Update a value using a callback function
   */
  async update<T>(key: string, updater: (current: T | null) => T): Promise<void> {
    const current = await storageAdapter.get<T>(key);
    const updated = updater(current);
    await storageAdapter.set(key, updated);
  },
};
