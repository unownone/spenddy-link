// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export default defineBackground(() => {
  console.log('Background initialized');

  // Initialise state on install/update
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ swiggyConnected: false, ordersFetched: false });
  });

  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener((message: { type?: string; latestOrderTime?: string; count?: number; total?: number; instamartTotal?: number; dineoutTotal?: number; swiggyTotal?: number }, _sender: any) => {
    if (message?.type === 'swiggy_cart_ok') {
      chrome.storage.local.set({ swiggyConnected: true });
    } else if (message?.type === 'fetch_start') {
      chrome.storage.local.set({ fetching: true, progressCount: 0, ordersFetched: false });
    } else if (message?.type === 'fetch_progress') {
      chrome.storage.local.set({ progressCount: message.count ?? 0, fetching: true });
    } else if (message?.type === 'orders_fetched') {
      chrome.storage.local.set({ ordersFetched: true, latestOrderTime: message.latestOrderTime ?? null, fetching: false, progressCount: message.total ?? 0, instamartTotal: message.instamartTotal ?? 0, dineoutTotal: message.dineoutTotal ?? 0, swiggyTotal: message.swiggyTotal ?? 0 });
    }
  });

  // Handle requests for order data from other content scripts (e.g., Spenddy site)
  chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender: any, sendResponse: (resp: any) => void) => {
    if (msg?.type === 'get_orders') {
      chrome.storage.local.get(['orderData', 'latestOrderTime', 'instamartData', 'latestInstamartTime', 'dineoutData', 'latestDineoutTime', 'swiggy_instamart_order_data', 'swiggy_dineout_order_data'], (data: { orderData?: any[]; latestOrderTime?: string; instamartData?: any[]; latestInstamartTime?: string; dineoutData?: any[]; latestDineoutTime?: string; swiggy_instamart_order_data?: any[]; swiggy_dineout_order_data?: any[] }) => {
        sendResponse({
          orderData: data.orderData ?? [],
          latestOrderTime: data.latestOrderTime ?? null,
          instamartData: data.instamartData ?? data.swiggy_instamart_order_data ?? [],
          latestInstamartTime: data.latestInstamartTime ?? null,
          dineoutData: data.dineoutData ?? data.swiggy_dineout_order_data ?? [],
          latestDineoutTime: data.latestDineoutTime ?? null,
        });
      });
      return true; // async response
    }
  });

  // Register DNR rule to spoof client hint headers for Swiggy
  const swiggyRule = {
    id: 1,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        { header: 'sec-ch-ua-mobile', operation: 'set', value: '?1' },
        { header: 'sec-ch-ua-platform', operation: 'set', value: '"Android"' },
        {header: 'user-agent', operation: 'set', value: '"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"' },
      ],
    },
    condition: {
      urlFilter: '*://*.swiggy.com/*',
      resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame'],
    },
  } as const;

  console.log('Registering Swiggy header spoof rule');
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [swiggyRule],
    removeRuleIds: [swiggyRule.id],
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to register DNR rule', chrome.runtime.lastError.message);
    } else {
      console.log('DNR rule registered successfully');
    }
  });

  // Log outgoing Swiggy requests to verify header injection
  chrome.webRequest.onSendHeaders.addListener(
    (details: any) => {
      type Header = { name?: string; value?: string };
      const headers: Header[] = details.requestHeaders ?? [];
      const mobileHdr = headers.find((h) => h.name?.toLowerCase() === 'sec-ch-ua-mobile');
      const platformHdr = headers.find((h) => h.name?.toLowerCase() === 'sec-ch-ua-platform');
      console.log('[Swiggy] Request', details.method, details.url, {
        'sec-ch-ua-mobile': mobileHdr?.value,
        'sec-ch-ua-platform': platformHdr?.value,
      });
    },
    { urls: ['https://*.swiggy.com/*'] },
    ['requestHeaders', 'extraHeaders'],
  );
});
