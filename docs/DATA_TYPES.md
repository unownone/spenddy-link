# Spenddy Link – Data Type Reference

> The extension works with three distinct Swiggy order payloads.  While the live
> API responses contain dozens of nested properties, only a subset is required
> by Spenddy today.  The interfaces below capture every field we currently
> persist or display, and organise optional extras that may be useful for future
> analytics.

## TypeScript Interfaces

```ts
/**
 * Regular Swiggy food delivery order as returned by
 * https://www.swiggy.com/dapi/order/all
 */
export interface SwiggyOrder {
  /** Unique alphanumeric order identifier */
  order_id: string;
  /** ISO-8601 timestamp e.g. "2024-05-13T18:32:45+05:30" */
  order_time: string;
  /** Human-readable restaurant name */
  restaurant_name: string;
  /** Grand total (in paise) */
  total_amount: number;
  /** Delivery address label */
  delivery_address?: string;
  /** Current order status string e.g. "DELIVERED" */
  order_status?: string;
  /** List of items + quantity */
  item_list?: Array<{
    name: string;
    quantity: number;
    price: number; // paise
  }>;
  /** Optional promo / discount data */
  coupon_code?: string;
  discount_amount?: number;
  /** Any extra fields are retained verbatim */
  [k: string]: unknown;
}

/**
 * Swiggy Instamart (grocery) order from
 * https://www.swiggy.com/mapi/order/dash?order_type=DASH
 */
export interface SwiggyInstamartOrder {
  /** Same shape as Swiggy “dash” payloads */
  order_id: string;
  /** Epoch milliseconds e.g. 1715592331457 */
  created_at: number;
  store_name: string;
  total_amount: number;
  item_count?: number;
  delivery_address?: string;
  order_status?: string;
  [k: string]: unknown;
}

/**
 * Swiggy Dineout reservation/consumption record from
 * https://www.swiggy.com/mapi/order/dineout?order_type=DINEOUT
 */
export interface SwiggyDineoutOrder {
  booking_id: string;
  /** Epoch milliseconds */
  created_at: number;
  restaurant_name: string;
  outlet_city?: string;
  /** Final bill amount after discounts */
  net_amount?: number;
  /** Number of diners covered */
  pax?: number;
  reservation_status?: string;
  [k: string]: unknown;
}
```

## Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `orderData` / `swiggy_orders.json` | `SwiggyOrder[]` | All regular delivery orders |
| `instamartData`, `swiggy_instamart_order_data` / `swiggy_instamart_orders.json` | `SwiggyInstamartOrder[]` | Instamart grocery orders |
| `dineoutData`, `swiggy_dineout_order_data` / `swiggy_dineout_orders.json` | `SwiggyDineoutOrder[]` | Dine-in / table-booking orders |

### File Info Objects in localStorage

Each dataset is accompanied by a *file-info* JSON object used by Spenddy for
upload metadata:

```ts
interface FileInfo {
  name: string;         // eg. "swiggy_orders.json"
  size: number;         // byte length of the raw JSON string
  uploadDate: string;   // ISO date taken from latest order timestamp
  orderCount: number;   // length of associated order array
}
```

---

## Extensibility Notes

* Unknown properties from Swiggy are preserved (`[k: string]: unknown`) so that
  future Spenddy features can use richer data without modifying the extension.
* If new endpoints are added (e.g. Genie, Food Pickup) define a parallel
  interface and store under `swiggy_<service>_order_data`. 