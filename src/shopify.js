import 'dotenv/config';

const BASE_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}`;
const HEADERS = {
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
  'Content-Type': 'application/json',
};

async function shopifyFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...HEADERS, ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── PRODUCTOS ──────────────────────────────────────────────────────────────

export async function searchProducts({ query, limit = 10 }) {
  const params = new URLSearchParams({ limit });
  if (query) params.set('title', query);
  const data = await shopifyFetch(`/products.json?${params}`);
  return data.products.map(p => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    status: p.status,
    description: p.body_html?.replace(/<[^>]+>/g, '').slice(0, 300),
    price: p.variants?.[0]?.price,
    compare_at_price: p.variants?.[0]?.compare_at_price,
    tags: p.tags,
    product_type: p.product_type,
    vendor: p.vendor,
    images: p.images?.slice(0, 2).map(i => i.src),
    variants_count: p.variants?.length,
  }));
}

export async function getProduct({ product_id }) {
  const data = await shopifyFetch(`/products/${product_id}.json`);
  const p = data.product;
  return {
    id: p.id,
    title: p.title,
    description: p.body_html?.replace(/<[^>]+>/g, ''),
    variants: p.variants.map(v => ({
      id: v.id,
      title: v.title,
      price: v.price,
      sku: v.sku,
      inventory_quantity: v.inventory_quantity,
      available: v.available,
    })),
    images: p.images.map(i => i.src),
    tags: p.tags,
    product_type: p.product_type,
    vendor: p.vendor,
  };
}

// ── COLECCIONES ────────────────────────────────────────────────────────────

export async function getCollections({ limit = 20 }) {
  const data = await shopifyFetch(`/custom_collections.json?limit=${limit}`);
  return data.custom_collections.map(c => ({
    id: c.id,
    title: c.title,
    handle: c.handle,
    products_count: c.products_count,
  }));
}

export async function getProductsByCollection({ collection_id, limit = 10 }) {
  const data = await shopifyFetch(`/collections/${collection_id}/products.json?limit=${limit}`);
  return data.products.map(p => ({
    id: p.id,
    title: p.title,
    price: p.variants?.[0]?.price,
    tags: p.tags,
  }));
}

// ── INVENTARIO ─────────────────────────────────────────────────────────────

export async function checkInventory({ inventory_item_ids }) {
  const ids = Array.isArray(inventory_item_ids) ? inventory_item_ids.join(',') : inventory_item_ids;
  const data = await shopifyFetch(`/inventory_levels.json?inventory_item_ids=${ids}`);
  return data.inventory_levels.map(l => ({
    inventory_item_id: l.inventory_item_id,
    location_id: l.location_id,
    available: l.available,
  }));
}

// ── PEDIDOS ────────────────────────────────────────────────────────────────

export async function getOrdersByCustomer({ customer_id, limit = 5 }) {
  const data = await shopifyFetch(`/orders.json?customer_id=${customer_id}&limit=${limit}&status=any`);
  return data.orders.map(o => ({
    id: o.id,
    order_number: o.order_number,
    created_at: o.created_at,
    financial_status: o.financial_status,
    fulfillment_status: o.fulfillment_status,
    total_price: o.total_price,
    currency: o.currency,
    line_items: o.line_items.map(i => ({
      title: i.title,
      quantity: i.quantity,
      price: i.price,
    })),
    tracking_url: o.fulfillments?.[0]?.tracking_url,
    tracking_number: o.fulfillments?.[0]?.tracking_number,
  }));
}

export async function getOrder({ order_id }) {
  const data = await shopifyFetch(`/orders/${order_id}.json`);
  const o = data.order;
  return {
    id: o.id,
    order_number: o.order_number,
    created_at: o.created_at,
    financial_status: o.financial_status,
    fulfillment_status: o.fulfillment_status,
    total_price: o.total_price,
    currency: o.currency,
    shipping_address: o.shipping_address,
    line_items: o.line_items.map(i => ({
      title: i.title,
      quantity: i.quantity,
      price: i.price,
      sku: i.sku,
    })),
    fulfillments: o.fulfillments?.map(f => ({
      status: f.status,
      tracking_company: f.tracking_company,
      tracking_number: f.tracking_number,
      tracking_url: f.tracking_url,
    })),
  };
}

export async function createOrder({ customer_id, line_items, note }) {
  const body = {
    order: {
      customer: { id: customer_id },
      line_items: line_items.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
      })),
      note,
      send_receipt: true,
    },
  };
  const data = await shopifyFetch('/orders.json', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return {
    id: data.order.id,
    order_number: data.order.order_number,
    total_price: data.order.total_price,
    financial_status: data.order.financial_status,
  };
}

// ── CLIENTES ───────────────────────────────────────────────────────────────

export async function searchCustomers({ query, limit = 5 }) {
  const params = new URLSearchParams({ query, limit });
  const data = await shopifyFetch(`/customers/search.json?${params}`);
  return data.customers.map(c => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone,
    orders_count: c.orders_count,
    total_spent: c.total_spent,
    tags: c.tags,
  }));
}

// ── DESCUENTOS ─────────────────────────────────────────────────────────────

export async function getDiscounts({ limit = 10 }) {
  const data = await shopifyFetch(`/price_rules.json?limit=${limit}`);
  return data.price_rules.map(r => ({
    id: r.id,
    title: r.title,
    value_type: r.value_type,
    value: r.value,
    target_type: r.target_type,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    usage_limit: r.usage_limit,
    prerequisite_subtotal_range: r.prerequisite_subtotal_range,
  }));
}

export async function validateDiscountCode({ code }) {
  const data = await shopifyFetch(`/discount_codes/lookup.json?code=${encodeURIComponent(code)}`);
  return data.discount_code;
}

// ── CHECKOUTS ──────────────────────────────────────────────────────────────

export async function getCheckout({ token }) {
  const data = await shopifyFetch(`/checkouts/${token}.json`);
  return data.checkout;
}
