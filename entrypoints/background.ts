// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export default defineBackground(() => {
  console.log('Background initialized');

  // Initialise state on install/update
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ swiggyConnected: false, ordersFetched: false });
  });

  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener((message: { type?: string; latestOrderTime?: string; count?: number; total?: number }) => {
    if (message?.type === 'swiggy_cart_ok') {
      chrome.storage.local.set({ swiggyConnected: true });
    } else if (message?.type === 'fetch_start') {
      chrome.storage.local.set({ fetching: true, progressCount: 0, ordersFetched: false });
    } else if (message?.type === 'fetch_progress') {
      chrome.storage.local.set({ progressCount: message.count ?? 0, fetching: true });
    } else if (message?.type === 'orders_fetched') {
      chrome.storage.local.set({ ordersFetched: true, latestOrderTime: message.latestOrderTime ?? null, fetching: false, progressCount: message.total ?? 0 });
    }
  });

  // Handle requests for order data from other content scripts (e.g., Spenddy site)
  chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender: any, sendResponse: (resp: any) => void) => {
    if (msg?.type === 'get_orders') {
      chrome.storage.local.get(['orderData', 'latestOrderTime'], (data: { orderData?: any[]; latestOrderTime?: string }) => {
        sendResponse({ orderData: data.orderData ?? [], latestOrderTime: data.latestOrderTime ?? null });
      });
      return true; // async response
    }
  });
});
