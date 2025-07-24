
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

// Storage keys for different data types
const STORAGE_KEYS = {
  // Swiggy food delivery orders
  SWIGGY_FILE_INFO: 'swiggy_file_info',
  SWIGGY_RAW_DATA: 'swiggy_raw_data',
  SWIGGY_ORDERS_JSON_NAME: 'swiggy_orders.json',
  
  // Swiggy Instamart orders
  SWIGGY_INSTAMART_FILE_INFO: 'swiggy_instamart_file_info',
  SWIGGY_INSTAMART_RAW_DATA: 'swiggy_instamart_raw_data',
  SWIGGY_INSTAMART_ORDERS_JSON_NAME: 'swiggy_instamart_orders.json',
  
  // Swiggy Dineout orders
  SWIGGY_DINEOUT_FILE_INFO: 'swiggy_dineout_file_info',
  SWIGGY_DINEOUT_RAW_DATA: 'swiggy_dineout_raw_data',
  SWIGGY_DINEOUT_ORDERS_JSON_NAME: 'swiggy_dineout_orders.json',
} as const;

export default defineContentScript({
  matches: ['*://spenddy.fyi/*'],
  main() {
    const DB_NAME = 'spenddy_data';
    const DB_VERSION = 1;
    const STORE_NAME = 'orders';

    // Initialize IndexedDB
    let db: IDBDatabase | null = null;

    function initDB(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        if (db) {
          resolve(db);
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          db = request.result;
          resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
      });
    }

    // Store data in IndexedDB
    async function storeData(key: string, value: any): Promise<void> {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ key, value, timestamp: Date.now() });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Get data from IndexedDB
    async function getData(key: string): Promise<any> {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
        request.onerror = () => reject(request.error);
      });
    }

    // Override localStorage to use IndexedDB
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    const originalGetItem = window.localStorage.getItem.bind(window.localStorage);

    window.localStorage.setItem = function(key: string, value: string) {
      // Always store in IndexedDB
      storeData(key, value).catch(console.error);
      // Also store in localStorage for compatibility
      originalSetItem(key, value);
    };

    window.localStorage.getItem = function(key: string): string | null {
      // Try IndexedDB first, fallback to localStorage
      getData(key).then(value => {
        if (value !== null) {
          // Update localStorage with the value from IndexedDB
          originalSetItem(key, value);
        }
      }).catch(console.error);
      
      return originalGetItem(key);
    };

    requestAndStore();

    // Also listen for a custom event from the page to refresh (optional)
    window.addEventListener('spenddy-fetch-orders', () => {
      requestAndStore();
    });

    function requestAndStore() {
      chrome.runtime.sendMessage({ type: 'get_orders' }, async (resp: { orderData?: any[]; latestOrderTime?: string; instamartData?: any[]; latestInstamartTime?: string; dineoutData?: any[]; latestDineoutTime?: string }) => {
        if (!resp) return;

        // Store regular food orders
        if (Array.isArray(resp.orderData) && resp.orderData.length > 0) {
          const rawStr = JSON.stringify(resp.orderData);
          const sizeBytes = new TextEncoder().encode(rawStr).length;
          const info = {
            name: STORAGE_KEYS.SWIGGY_ORDERS_JSON_NAME,
            size: sizeBytes,
            uploadDate: resp.latestOrderTime ?? new Date().toISOString(),
            orderCount: resp.orderData.length,
          };
          await storeData(STORAGE_KEYS.SWIGGY_FILE_INFO, JSON.stringify(info));
          await storeData(STORAGE_KEYS.SWIGGY_RAW_DATA, rawStr);
        }

        // Store Instamart orders
        if (Array.isArray(resp.instamartData) && resp.instamartData.length > 0) {
          const rawStr = JSON.stringify(resp.instamartData);
          const sizeBytes = new TextEncoder().encode(rawStr).length;
          const info = {
            name: STORAGE_KEYS.SWIGGY_INSTAMART_ORDERS_JSON_NAME,
            size: sizeBytes,
            uploadDate: resp.latestInstamartTime ?? new Date().toISOString(),
            orderCount: resp.instamartData.length,
          };
          await storeData(STORAGE_KEYS.SWIGGY_INSTAMART_FILE_INFO, JSON.stringify(info));
          await storeData(STORAGE_KEYS.SWIGGY_INSTAMART_RAW_DATA, rawStr);
        }

        // Store Dineout orders
        if (Array.isArray(resp.dineoutData) && resp.dineoutData.length > 0) {
          const rawStr = JSON.stringify(resp.dineoutData);
          const sizeBytes = new TextEncoder().encode(rawStr).length;
          const info = {
            name: STORAGE_KEYS.SWIGGY_DINEOUT_ORDERS_JSON_NAME,
            size: sizeBytes,
            uploadDate: resp.latestDineoutTime ?? new Date().toISOString(),
            orderCount: resp.dineoutData.length,
          };
          await storeData(STORAGE_KEYS.SWIGGY_DINEOUT_FILE_INFO, JSON.stringify(info));
          await storeData(STORAGE_KEYS.SWIGGY_DINEOUT_RAW_DATA, rawStr);
        }
      });
    }
  },
}); 