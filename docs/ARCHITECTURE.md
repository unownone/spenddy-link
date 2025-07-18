# Spenddy Link – Extension Architecture

## High-level Diagram

```mermaid
flowchart TD
    subgraph Browser
      direction TB
      Popup["Popup UI\n(entrypoints/popup)"]
      Background["Service Worker\n(entrypoints/background)"]
      CS_Swiggy["Content Script – Swiggy\n(entrypoints/swiggy.content)"]
      CS_Spenddy["Content Script – Spenddy\n(entrypoints/spenddy.content)"]
    end

    %% messaging paths
    Popup -- chrome.runtime.sendMessage --> Background
    Background -- sendResponse --> Popup

    Popup --\"chrome.tabs.sendMessage\"--> CS_Swiggy
    CS_Swiggy -- Orders fetched msg --> Background
    Background -- storage.get --> CS_Spenddy
    CS_Spenddy -- request orders --> Background

    %% storage paths
    subgraph Storage
      direction TB
      local["chrome.storage.local"]
      ls["window.localStorage (Spenddy page)"]
    end

    CS_Swiggy -- set() --> local
    Background -- get()/set() --> local
    CS_Spenddy -- setItem() --> ls

    %% network
    CS_Swiggy -- Fetch Swiggy APIs --> SwiggyAPI[(Swiggy REST)]
    Background -- DNR header spoof --> SwiggyAPI

    style Popup fill:#ffd,stroke:#333
    style Background fill:#bbf,stroke:#333
    style CS_Swiggy fill:#dfd,stroke:#333
    style CS_Spenddy fill:#dfd,stroke:#333
    style local fill:#fff5e6,stroke:#333
    style ls fill:#fff5e6,stroke:#333
    style SwiggyAPI fill:#fdd,stroke:#333
```

> Diagram key: yellow – UI, blue – service-worker, green – content scripts, beige – storage, red – external service.

---

## Components

1. **Popup (MV3 action popup)** – Renders status, fetch buttons and shows counts.
2. **Background Service Worker**
   * Holds global state (connected, counts, progress).
   * Registers Declarative Net Request (DNR) rule to spoof client-hint headers (`sec-ch-ua-*`, `User-Agent`).
   * Relays messages between popup, content scripts and external pages.
3. **Content Script – Swiggy (`swiggy.content.ts`)**
   * Runs on `*.swiggy.com/*`.
   * On *cart* check, signals connection.
   * On `fetch_orders` message, paginates three Swiggy endpoints to collect:
     - Regular food orders
     - Instamart orders
     - Dineout orders
   * Persists arrays plus counts into `chrome.storage.local` with keys:
     - `orderData`, `swiggyTotal`
     - `instamartData`, `swiggy_instamart_order_data`, `instamartTotal`
     - `dineoutData`, `swiggy_dineout_order_data`, `dineoutTotal`
4. **Content Script – Spenddy (`spenddy.content.ts`)**
   * Runs on the Spenddy webapp.
   * Requests order payload via `get_orders` message.
   * Serialises responses into `window.localStorage` so Spenddy can read without extension APIs.

---

## Key Workflows

### A. Connection Detection
1. Swiggy page loads → content script fetches `/dapi/cart`.
2. On 200 response it emits `swiggy_cart_ok` → background sets `swiggyConnected=true`.
3. Popup listens to storage change and flips status to *Connected*.

### B. Order Fetching (triggered from Popup)
1. User presses *Fetch Order Data*.
2. Popup sends `fetch_orders` to active Swiggy tab.
3. Swiggy content script:
   1. Emits `fetch_start` (progress resets).
   2. Calls `fetchAllOrders`, `fetchAllInstamartOrders`, `fetchAllDineoutOrders` with progress updates.
   3. Stores combined results & emits `orders_fetched` with totals.
4. Background saves counts (`swiggyTotal`, `instamartTotal`, `dineoutTotal`) & marks `ordersFetched=true`.
5. Popup re-renders with captured counts.

### C. Data Sync to Spenddy Site
1. When user opens Spenddy site, that content script sends `get_orders`.
2. Background responds with arrays from `chrome.storage.local`.
3. Spenddy script converts each dataset into JSON strings and writes both file-info & raw-data into `window.localStorage`.
4. The Spenddy webapp can now ingest the data client-side without extension APIs.

### D. Header Spoofing
1. Background registers DNR rule at service-worker boot.
2. For every request matching `*://*.swiggy.com/*`, Chrome rewrites request headers in the network stack.
3. Swiggy servers treat requests as mobile (Android) ensuring pagination endpoints are available.
4. Background adds a `webRequest.onSendHeaders` listener (read-only) to log the modified headers for debugging.

---

## Triggers & Message Matrix

| From | To | Message | Purpose |
|------|----|---------|---------|
| Popup | Swiggy CS | `fetch_orders` | Start full history fetch |
| Swiggy CS | BG | `fetch_start` / `fetch_progress` / `orders_fetched` | Streaming progress & final data |
| Swiggy CS | BG | `swiggy_cart_ok` | Notify initial connection |
| Spenddy CS | BG | `get_orders` | Request stored data for upload |
| BG | Popup | storage change events | Real-time UI updates |

---

## Build & Run
```
pnpm install
wxt build           # production bundle
wxt dev             # live-reload during development
```

Reload the extension in Chrome after building to ensure the DNR rule and latest code are active. 