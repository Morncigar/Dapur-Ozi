/* =========================================================
   DAPUR OZI
   ADMIN FRONTEND
   PRODUCT IMAGE UPLOAD + CROPPER + STORAGE
   ========================================================= */

import {
  createClient
} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  'https://jiilmvdpmxciootnjctt.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_cvVy0jRr6kxTr-tuWPsLqw_27GmIMej';

const supabaseClient =
  createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================================================
   CONSTANTS
   ========================================================= */

const PRODUCT_IMAGE_BUCKET =
  'product-images';

const PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'E_WALLET',
  'OTHER'
];


/* =========================================================
   STATE
   ========================================================= */

const state = {

  user: null,

  isAdmin: false,

  activeSection:
    'dashboard',

  orders: [],

  products: [],

  categories: [],

  payments: [],

  production: [],

  stockMovements: [],

  auditLogs: [],

  settings: null,

  currentOrder: null,

  currentProduct: null

};


/* =========================================================
   IMAGE STATE
   ========================================================= */

let productCropper =
  null;

let pendingProductImageBlob =
  null;

let removeCurrentProductImage =
  false;

let productPreviewObjectURL =
  null;

let cropObjectURL =
  null;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function el(id) {

  return document.getElementById(
    id
  );

}


function all(selector) {

  return [
    ...document.querySelectorAll(
      selector
    )
  ];

}


function show(element) {

  if (!element) return;

  element.classList.remove(
    'hidden'
  );

}


function hide(element) {

  if (!element) return;

  element.classList.add(
    'hidden'
  );

}


function setText(
  id,
  value
) {

  const element =
    el(id);

  if (!element) return;

  element.textContent =
    value ?? '';

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

  return String(
    value ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );

}


/* =========================================================
   FORMATTERS
   ========================================================= */

function formatCurrency(value) {

  return new Intl.NumberFormat(
    'id-ID',
    {
      style:
        'currency',

      currency:
        'IDR',

      maximumFractionDigits:
        0
    }
  ).format(
    Number(
      value ||
      0
    )
  );

}


function formatDate(value) {

  if (!value) {

    return '-';

  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '-';

  }


  return date.toLocaleString(
    'id-ID',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short'
    }
  );

}


/* =========================================================
   ERROR HELPER
   ========================================================= */

function errorMessage(error) {

  if (!error) {

    return 'Terjadi kesalahan.';

  }


  const message =
    String(
      error.message ||
      error.code ||
      error
    );


  if (
    message.includes(
      'permission denied'
    )
  ) {

    return (
      'Admin belum memiliki permission untuk melakukan aksi ini.'
    );

  }


  if (
    message.includes(
      'ADMIN_ACCESS_REQUIRED'
    )
  ) {

    return (
      'Akun ini bukan admin aktif.'
    );

  }


  if (
    message.includes(
      'AUTHENTICATION_REQUIRED'
    )
  ) {

    return (
      'Silakan login terlebih dahulu.'
    );

  }


  if (
    message.includes(
      'ORDER_ITEM_SNAPSHOT_IMMUTABLE'
    )
  ) {

    return (
      'Data ini merupakan bagian dari riwayat pesanan dan tidak dapat dihapus.'
    );

  }


  if (
    message.includes(
      'INVALID_PRODUCT_SHIPPING_CONFIGURATION'
    )
  ) {

    return (
      'Konfigurasi pengiriman produk tidak valid.'
    );

  }


  if (
    message.includes(
      'violates foreign key constraint'
    )
  ) {

    return (
      'Data ini masih digunakan oleh data lain sehingga tidak dapat dihapus.'
    );

  }


  if (
    message.includes(
      'Bucket not found'
    )
  ) {

    return (
      'Storage bucket product-images belum dibuat.'
    );

  }


  if (
    message.includes(
      'row-level security'
    )
  ) {

    return (
      'Upload gambar ditolak oleh Storage Policy Supabase.'
    );

  }


  if (
    message.includes(
      'Payload too large'
    )
  ) {

    return (
      'Ukuran gambar terlalu besar.'
    );

  }


  return message;

}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer =
  null;


function showToast(
  message,
  type = 'success'
) {

  const toast =
    el(
      'admin-toast'
    );

  const text =
    el(
      'admin-toast-message'
    );


  if (
    !toast ||
    !text
  ) {

    return;

  }


  text.textContent =
    message;


  toast.classList.remove(
    'hidden',
    'success',
    'error',
    'warning'
  );


  toast.classList.add(
    type
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.add(
          'hidden'
        );

      },
      3000
    );

}


/* =========================================================
   RPC HELPER
   ========================================================= */

async function adminRPC(
  functionName,
  params = {}
) {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      functionName,
      params
    );


  if (error) {

    console.error(
      `[Dapur Ozi RPC] ${functionName}`,
      error
    );

    throw error;

  }


  return data;

}


/* =========================================================
   SESSION
   ========================================================= */

async function getSession() {

  const {
    data,
    error
  } =
    await supabaseClient
      .auth
      .getSession();


  if (error) {

    throw error;

  }


  state.user =
    data.session?.user ||
    null;


  return data.session;

}


/* =========================================================
   ADMIN CHECK
   ========================================================= */

async function checkAdmin() {

  if (!state.user) {

    state.isAdmin =
      false;

    return false;

  }


  const result =
    await adminRPC(
      'is_admin'
    );


  state.isAdmin =
    Boolean(
      result
    );


  return state.isAdmin;

}


async function requireAdmin() {

  const session =
    await getSession();


  if (!session) {

    throw new Error(
      'AUTHENTICATION_REQUIRED'
    );

  }


  const admin =
    await checkAdmin();


  if (!admin) {

    throw new Error(
      'ADMIN_ACCESS_REQUIRED'
    );

  }


  return true;

}


/* =========================================================
   LOGIN
   ========================================================= */

async function login(
  email,
  password
) {

  const {
    data,
    error
  } =
    await supabaseClient
      .auth
      .signInWithPassword({
        email,
        password
      });


  if (error) {

    throw error;

  }


  state.user =
    data.user;


  const admin =
    await checkAdmin();


  if (!admin) {

    await supabaseClient
      .auth
      .signOut();


    throw new Error(
      'ADMIN_ACCESS_REQUIRED'
    );

  }


  return data;

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  const {
    error
  } =
    await supabaseClient
      .auth
      .signOut();


  if (error) {

    throw error;

  }


  state.user =
    null;

  state.isAdmin =
    false;


  showLogin();

}


/* =========================================================
   AUTH UI
   ========================================================= */

function showLogin() {

  show(
    el(
      'admin-login'
    )
  );


  hide(
    el(
      'admin-app'
    )
  );

}


function showApp() {

  hide(
    el(
      'admin-login'
    )
  );


  show(
    el(
      'admin-app'
    )
  );

}


/* =========================================================
   LOAD ORDERS
   ========================================================= */

async function loadOrders() {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'orders'
      )
      .select(
        '*'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      );


  if (error) {

    throw error;

  }


  state.orders =
    data || [];


  return state.orders;

}


/* =========================================================
   LOAD ORDER ITEMS
   ========================================================= */

async function loadOrderItems(
  orderId
) {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'order_items'
      )
      .select(
        '*'
      )
      .eq(
        'order_id',
        orderId
      )
      .order(
        'created_at',
        {
          ascending:
            true
        }
      );


  if (error) {

    throw error;

  }


  return data || [];

}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'products'
      )
      .select(`
        id,
        name,
        description,
        category_id,
        price,
        hpp,
        stock,
        status,
        image_url,
        display_order,
        is_featured,
        created_at,
        updated_at,
        image_path,
        delivery_class
      `)
      .order(
        'display_order',
        {
          ascending:
            true
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      );


  if (error) {

    throw error;

  }


  state.products =
    data || [];


  return state.products;

}


/* =========================================================
   LOAD CATEGORIES
   ========================================================= */

async function loadCategories() {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'categories'
      )
      .select(
        '*'
      )
      .order(
        'display_order',
        {
          ascending:
            true
        }
      )
      .order(
        'name',
        {
          ascending:
            true
        }
      );


  if (error) {

    throw error;

  }


  state.categories =
    data || [];


  return state.categories;

}


/* =========================================================
   LOAD PAYMENTS
   ========================================================= */

async function loadPayments() {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'payments'
      )
      .select(
        '*'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      );


  if (error) {

    throw error;

  }


  state.payments =
    data || [];


  return state.payments;

}


/* =========================================================
   LOAD PRODUCTION
   ========================================================= */

async function loadProduction() {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'production'
      )
      .select(
        '*'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      );


  if (error) {

    throw error;

  }


  state.production =
    data || [];


  return state.production;

}


/* =========================================================
   LOAD STOCK MOVEMENTS
   ========================================================= */

async function loadStockMovements() {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'stock_movements'
      )
      .select(
        '*'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      )
      .limit(
        100
      );


  if (error) {

    throw error;

  }


  state.stockMovements =
    data || [];


  return state.stockMovements;

}


/* =========================================================
   LOAD AUDIT
   ========================================================= */

async function loadAuditLogs() {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'audit_logs'
      )
      .select(
        '*'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      )
      .limit(
        100
      );


  if (error) {

    throw error;

  }


  state.auditLogs =
    data || [];


  return state.auditLogs;

}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

async function loadSettings() {

  await requireAdmin();


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'settings'
      )
      .select(
        '*'
      )
      .eq(
        'id',
        1
      )
      .single();


  if (error) {

    throw error;

  }


  state.settings =
    data;


  return data;

}


/* =========================================================
   LABEL HELPERS
   ========================================================= */

function orderStatusLabel(status) {

  const labels = {

    PENDING_PAYMENT:
      'Menunggu Pembayaran',

    CONFIRMED:
      'Dikonfirmasi',

    PREPARING:
      'Diproses',

    READY_TO_SHIP:
      'Siap Dikirim',

    SHIPPED:
      'Dikirim',

    COMPLETED:
      'Selesai',

    CANCELLED:
      'Dibatalkan'

  };


  return (
    labels[status] ||
    status ||
    '-'
  );

}


function paymentStatusLabel(status) {

  const labels = {

    UNPAID:
      'Belum Dibayar',

    PAID:
      'Dibayar',

    REFUNDED:
      'Refund'

  };


  return (
    labels[status] ||
    status ||
    '-'
  );

}


function productionStatusLabel(status) {

  const labels = {

    NOT_REQUIRED:
      'Tidak Perlu',

    PENDING:
      'Pending',

    IN_PROGRESS:
      'Diproses',

    COMPLETED:
      'Selesai'

  };


  return (
    labels[status] ||
    status ||
    '-'
  );

}


function productStatusLabel(status) {

  const labels = {

    READY:
      'Ready',

    PRE_ORDER:
      'Pre-order',

    NOT_FOR_SALE:
      'Tidak Dijual'

  };


  return (
    labels[status] ||
    status ||
    '-'
  );

}


function deliveryClassLabel(
  deliveryClass
) {

  const labels = {

    DRY:
      'Dry',

    FRESH:
      'Fresh'

  };


  return (
    labels[
      deliveryClass
    ] ||
    deliveryClass ||
    '-'
  );

}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

  await Promise.all([

    loadOrders(),

    loadProducts(),

    loadCategories(),

    loadPayments(),

    loadProduction(),

    loadSettings()

  ]);


  renderDashboard();

}


/* =========================================================
   DASHBOARD RENDER
   ========================================================= */

function renderDashboard() {

  const today =
    new Date();


  setText(
    'dashboard-date',
    today.toLocaleDateString(
      'id-ID',
      {
        weekday:
          'long',

        day:
          'numeric',

        month:
          'long',

        year:
          'numeric'
      }
    )
  );


  const todayKey =
    today
      .toISOString()
      .slice(
        0,
        10
      );


  const todayOrders =
    state.orders.filter(
      order =>
        String(
          order.checkout_at ||
          order.created_at ||
          ''
        )
          .slice(
            0,
            10
          ) ===
        todayKey
    );


  const pendingPayment =
    state.orders.filter(
      order =>
        order.status ===
        'PENDING_PAYMENT'
    );


  const activeProduction =
    state.production.filter(
      production =>
        production.status ===
          'PENDING' ||
        production.status ===
          'IN_PROGRESS'
    );


  const lowStock =
    state.products.filter(
      product =>
        product.status ===
          'READY' &&
        Number(
          product.stock
        ) <= 3
    );


  setText(
    'stat-orders-today',
    todayOrders.length
  );


  setText(
    'stat-pending-payment',
    pendingPayment.length
  );


  setText(
    'stat-production',
    activeProduction.length
  );


  setText(
    'stat-low-stock',
    lowStock.length
  );


  const navCount =
    el(
      'nav-order-count'
    );


  if (navCount) {

    navCount.textContent =
      pendingPayment.length;


    if (
      pendingPayment.length
    ) {

      show(
        navCount
      );

    } else {

      hide(
        navCount
      );

    }

  }


  renderStoreStatus();

  renderDashboardOrders();

  renderDashboardStock();

}


/* =========================================================
   STORE STATUS
   ========================================================= */

function renderStoreStatus() {

  if (
    !state.settings
  ) {

    return;

  }


  const open =
    Boolean(
      state.settings
        .store_open
    );


  setText(
    'store-status-text',
    open
      ? 'Dapur Ozi sedang buka'
      : 'Dapur Ozi sedang tutup'
  );


  setText(
    'store-status-detail',
    state.settings
      .store_message ||
    ''
  );


  const dot =
    el(
      'store-status-dot'
    );


  if (dot) {

    dot.classList.toggle(
      'open',
      open
    );


    dot.classList.toggle(
      'closed',
      !open
    );

  }


  const button =
    el(
      'toggle-store-status'
    );


  if (button) {

    button.textContent =
      open
        ? 'Tutup Toko'
        : 'Buka Toko';

  }

}


/* =========================================================
   TOGGLE STORE STATUS
   ========================================================= */

async function toggleStoreStatus() {

  await requireAdmin();


  const current =
    Boolean(
      state.settings
        ?.store_open
    );


  const next =
    !current;


  const message =
    next
      ? 'Dapur Ozi sedang buka.'
      : 'Dapur Ozi sedang tutup.';


  const {
    error
  } =
    await supabaseClient
      .from(
        'settings'
      )
      .update({

        store_open:
          next,

        store_message:
          message,

        updated_at:
          new Date()
            .toISOString()

      })
      .eq(
        'id',
        1
      );


  if (error) {

    throw error;

  }


  await loadSettings();


  renderStoreStatus();


  showToast(
    next
      ? 'Toko dibuka.'
      : 'Toko ditutup.'
  );

}


/* =========================================================
   DASHBOARD ORDERS
   ========================================================= */

function renderDashboardOrders() {

  const container =
    el(
      'dashboard-orders'
    );


  if (!container) return;


  const rows =
    state.orders.slice(
      0,
      5
    );


  if (!rows.length) {

    container.innerHTML = `
      <div class="empty-state">
        Belum ada pesanan.
      </div>
    `;

    return;

  }


  container.innerHTML =
    rows
      .map(
        order => `

          <div class="order-preview-item">

            <div>

              <strong>
                ${escapeHTML(
                  order.order_number
                )}
              </strong>

              <span>
                ${escapeHTML(
                  order.customer_name
                )}
              </span>

            </div>


            <div>

              <strong>
                ${formatCurrency(
                  order.total
                )}
              </strong>

              <span>
                ${escapeHTML(
                  orderStatusLabel(
                    order.status
                  )
                )}
              </span>

            </div>

          </div>

        `
      )
      .join('');

}


/* =========================================================
   DASHBOARD STOCK
   ========================================================= */

function renderDashboardStock() {

  const container =
    el(
      'dashboard-low-stock'
    );


  if (!container) return;


  const rows =
    state.products
      .filter(
        product =>
          product.status ===
            'READY' &&
          Number(
            product.stock
          ) <= 3
      )
      .slice(
        0,
        5
      );


  if (!rows.length) {

    container.innerHTML = `
      <div class="empty-state">
        Semua stok aman.
      </div>
    `;

    return;

  }


  container.innerHTML =
    rows
      .map(
        product => `

          <div class="stock-preview-item">

            <strong>
              ${escapeHTML(
                product.name
              )}
            </strong>

            <span>
              ${Number(
                product.stock
              )}
              tersisa
            </span>

          </div>

        `
      )
      .join('');

}


/* =========================================================
   ORDERS RENDER
   ========================================================= */

function renderOrders() {

  const tbody =
    el(
      'orders-table-body'
    );


  if (!tbody) return;


  const search =
    String(
      el(
        'order-search'
      )?.value ||
      ''
    )
      .trim()
      .toLowerCase();


  const filter =
    el(
      'order-status-filter'
    )?.value ||
    'ALL';


  const rows =
    state.orders.filter(
      order => {

        const searchMatch =
          !search ||
          String(
            order.order_number ||
            ''
          )
            .toLowerCase()
            .includes(
              search
            ) ||
          String(
            order.customer_name ||
            ''
          )
            .toLowerCase()
            .includes(
              search
            );


        const statusMatch =
          filter ===
            'ALL' ||
          order.status ===
            filter;


        return (
          searchMatch &&
          statusMatch
        );

      }
    );


  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            Tidak ada pesanan.
          </div>
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    rows
      .map(
        order => `

          <tr>

            <td>

              <strong>
                ${escapeHTML(
                  order.order_number
                )}
              </strong>

            </td>


            <td>

              ${escapeHTML(
                order.customer_name
              )}

              <small>
                ${escapeHTML(
                  order.customer_phone
                )}
              </small>

            </td>


            <td>
              ${formatCurrency(
                order.total
              )}
            </td>


            <td>

              <span
                class="status-badge status-${
                  String(
                    order.payment_status ||
                    'UNPAID'
                  )
                    .toLowerCase()
                    .replaceAll(
                      '_',
                      '-'
                    )
                }"
              >

                ${escapeHTML(
                  paymentStatusLabel(
                    order.payment_status
                  )
                )}

              </span>

            </td>


            <td>

              <span
                class="status-badge status-${
                  String(
                    order.status ||
                    ''
                  )
                    .toLowerCase()
                    .replaceAll(
                      '_',
                      '-'
                    )
                }"
              >

                ${escapeHTML(
                  orderStatusLabel(
                    order.status
                  )
                )}

              </span>

            </td>


            <td>
              ${formatDate(
                order.checkout_at ||
                order.created_at
              )}
            </td>


            <td>

              <button
                type="button"
                class="btn btn-secondary btn-small"
                data-action="view-order"
                data-order-id="${order.id}"
              >
                Detail
              </button>

            </td>

          </tr>

        `
      )
      .join('');

}


/* =========================================================
   ORDER DETAIL
   ========================================================= */

async function openOrderModal(
  orderId
) {

  const order =
    state.orders.find(
      row =>
        row.id ===
        orderId
    );


  if (!order) return;


  state.currentOrder =
    order;


  const modal =
    el(
      'order-modal'
    );

  const content =
    el(
      'order-modal-content'
    );


  if (
    !modal ||
    !content
  ) {

    return;

  }


  show(
    modal
  );


  content.innerHTML = `
    <div class="loading-state">
      Memuat detail pesanan...
    </div>
  `;


  try {

    const items =
      await loadOrderItems(
        order.id
      );


    content.innerHTML = `

      <div>

        <span class="eyebrow">
          ORDER DETAIL
        </span>


        <h2>
          ${escapeHTML(
            order.order_number
          )}
        </h2>


        <div class="order-detail-grid">


          <div class="order-detail-card">

            <h3>
              Pelanggan
            </h3>

            <p>
              <strong>Nama:</strong>
              ${escapeHTML(
                order.customer_name
              )}
            </p>

            <p>
              <strong>WhatsApp:</strong>
              ${escapeHTML(
                order.customer_phone
              )}
            </p>

            <p>
              <strong>Area:</strong>
              ${escapeHTML(
                order.customer_area ||
                '-'
              )}
            </p>

            <p>
              <strong>Alamat:</strong>
              ${escapeHTML(
                order.customer_address ||
                '-'
              )}
            </p>

          </div>



          <div class="order-detail-card">

            <h3>
              Order
            </h3>

            <p>
              <strong>Status:</strong>
              ${escapeHTML(
                orderStatusLabel(
                  order.status
                )
              )}
            </p>

            <p>
              <strong>Pembayaran:</strong>
              ${escapeHTML(
                paymentStatusLabel(
                  order.payment_status
                )
              )}
            </p>

            <p>
              <strong>Pengiriman:</strong>
              ${escapeHTML(
                order.shipping_type ||
                '-'
              )}
            </p>

            <p>
              <strong>Pre-order:</strong>
              ${
                order.has_pre_order
                  ? 'Ya'
                  : 'Tidak'
              }
            </p>

          </div>


        </div>



        <div class="order-items-section">

          <h3>
            Item Pesanan
          </h3>


          <div class="table-wrapper">

            <table class="admin-table">

              <thead>

                <tr>
                  <th>Produk</th>
                  <th>Class</th>
                  <th>Qty</th>
                  <th>Harga</th>
                  <th>Subtotal</th>
                </tr>

              </thead>


              <tbody>

                ${
                  items
                    .map(
                      item => `

                        <tr>

                          <td>
                            ${escapeHTML(
                              item.product_name
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              deliveryClassLabel(
                                item.delivery_class
                              )
                            )}
                          </td>

                          <td>
                            ${item.quantity}
                          </td>

                          <td>
                            ${formatCurrency(
                              item.unit_price
                            )}
                          </td>

                          <td>
                            ${formatCurrency(
                              item.subtotal
                            )}
                          </td>

                        </tr>

                      `
                    )
                    .join('')
                }

              </tbody>

            </table>

          </div>

        </div>



        <div class="order-total-card">

          <div>

            <span>
              Subtotal
            </span>

            <strong>
              ${formatCurrency(
                order.subtotal
              )}
            </strong>

          </div>


          <div>

            <span>
              Ongkir
            </span>

            <strong>
              ${formatCurrency(
                order.shipping_cost
              )}
            </strong>

          </div>


          <div>

            <span>
              Diskon
            </span>

            <strong>
              ${formatCurrency(
                order.discount
              )}
            </strong>

          </div>


          <div class="order-total-final">

            <span>
              Total
            </span>

            <strong>
              ${formatCurrency(
                order.total
              )}
            </strong>

          </div>

        </div>



        <div class="modal-actions">

          ${
            order.payment_status !==
              'PAID' &&
            ![
              'CANCELLED',
              'COMPLETED'
            ].includes(
              order.status
            )
              ? `
                  <button
                    type="button"
                    class="btn btn-primary"
                    data-action="confirm-payment"
                    data-order-id="${order.id}"
                  >
                    Konfirmasi Bayar
                  </button>
                `
              : ''
          }


          ${
            order.status ===
              'CONFIRMED'
              ? `
                  <button
                    type="button"
                    class="btn btn-secondary"
                    data-action="start-production"
                    data-order-id="${order.id}"
                  >
                    Mulai Produksi
                  </button>
                `
              : ''
          }


          ${
            order.status ===
              'PREPARING'
              ? `
                  <button
                    type="button"
                    class="btn btn-secondary"
                    data-action="mark-ready"
                    data-order-id="${order.id}"
                  >
                    Siap Dikirim
                  </button>
                `
              : ''
          }


          ${
            order.status ===
              'READY_TO_SHIP'
              ? `
                  <button
                    type="button"
                    class="btn btn-secondary"
                    data-action="mark-shipped"
                    data-order-id="${order.id}"
                  >
                    Tandai Dikirim
                  </button>
                `
              : ''
          }


          ${
            order.status ===
              'SHIPPED'
              ? `
                  <button
                    type="button"
                    class="btn btn-primary"
                    data-action="complete-order"
                    data-order-id="${order.id}"
                  >
                    Selesaikan
                  </button>
                `
              : ''
          }


          ${
            ![
              'COMPLETED',
              'CANCELLED'
            ].includes(
              order.status
            )
              ? `
                  <button
                    type="button"
                    class="btn btn-danger"
                    data-action="cancel-order"
                    data-order-id="${order.id}"
                  >
                    Batalkan
                  </button>
                `
              : ''
          }

        </div>

      </div>

    `;


  } catch (error) {

    content.innerHTML = `

      <div class="checkout-error">
        ${escapeHTML(
          errorMessage(
            error
          )
        )}
      </div>

    `;

  }

}


/* =========================================================
   PRODUCT RENDER
   ========================================================= */

function renderProducts() {

  const container =
    el(
      'products-grid'
    );


  if (!container) return;


  const search =
    String(
      el(
        'product-search'
      )?.value ||
      ''
    )
      .trim()
      .toLowerCase();


  const filter =
    el(
      'product-status-filter'
    )?.value ||
    'ALL';


  const products =
    state.products.filter(
      product => {

        const searchMatch =
          !search ||
          String(
            product.name ||
            ''
          )
            .toLowerCase()
            .includes(
              search
            );


        const statusMatch =
          filter ===
            'ALL' ||
          product.status ===
            filter;


        return (
          searchMatch &&
          statusMatch
        );

      }
    );


  if (!products.length) {

    container.innerHTML = `

      <div class="empty-state">
        Tidak ada produk.
      </div>

    `;

    return;

  }


  container.innerHTML =
    products
      .map(
        product => `

          <article class="admin-product-card">


            <div class="admin-product-image">

              ${
                product.image_url
                  ? `
                      <img
                        src="${escapeHTML(
                          product.image_url
                        )}"
                        alt="${escapeHTML(
                          product.name
                        )}"
                        loading="lazy"
                      >
                    `
                  : `
                      <div class="product-image-placeholder">

                        <span>
                          DAPUR OZI
                        </span>

                        <strong>
                          ${escapeHTML(
                            product.name
                          )}
                        </strong>

                      </div>
                    `
              }

            </div>



            <div class="admin-product-content">


              <div class="admin-product-header">

                <div>

                  <h3>
                    ${escapeHTML(
                      product.name
                    )}
                  </h3>

                  <span class="status-badge">
                    ${escapeHTML(
                      productStatusLabel(
                        product.status
                      )
                    )}
                  </span>

                </div>

              </div>


              <div class="admin-product-price">
                ${formatCurrency(
                  product.price
                )}
              </div>


              <div class="admin-product-meta">

                <span>

                  Stok

                  <strong>
                    ${Number(
                      product.stock ||
                      0
                    )}
                  </strong>

                </span>


                <span>

                  HPP

                  <strong>
                    ${formatCurrency(
                      product.hpp
                    )}
                  </strong>

                </span>


                <span>

                  Delivery

                  <strong>
                    ${escapeHTML(
                      deliveryClassLabel(
                        product.delivery_class
                      )
                    )}
                  </strong>

                </span>

              </div>


              <div class="admin-product-actions">

                <button
                  type="button"
                  class="btn btn-secondary btn-small"
                  data-action="edit-product"
                  data-product-id="${product.id}"
                >
                  Edit
                </button>


                <button
                  type="button"
                  class="btn btn-secondary btn-small"
                  data-action="adjust-stock"
                  data-product-id="${product.id}"
                >
                  Stok
                </button>


                ${
                  product.status !==
                    'NOT_FOR_SALE'
                    ? `
                        <button
                          type="button"
                          class="btn btn-danger btn-small"
                          data-action="delete-product"
                          data-product-id="${product.id}"
                        >
                          Nonaktifkan
                        </button>
                      `
                    : `
                        <button
                          type="button"
                          class="btn btn-secondary btn-small"
                          data-action="activate-product"
                          data-product-id="${product.id}"
                        >
                          Aktifkan
                        </button>
                      `
                }

              </div>


            </div>

          </article>

        `
      )
      .join('');

}


/* =========================================================
   IMAGE PREVIEW CLEANUP
   ========================================================= */

function revokePreviewObjectURL() {

  if (
    productPreviewObjectURL
  ) {

    URL.revokeObjectURL(
      productPreviewObjectURL
    );


    productPreviewObjectURL =
      null;

  }

}


function revokeCropObjectURL() {

  if (
    cropObjectURL
  ) {

    URL.revokeObjectURL(
      cropObjectURL
    );


    cropObjectURL =
      null;

  }

}


/* =========================================================
   PRODUCT IMAGE PREVIEW
   ========================================================= */

function renderProductImagePreview(
  source = null
) {

  const preview =
    el(
      'product-image-preview'
    );

  const removeButton =
    el(
      'remove-product-image'
    );


  if (!preview) {

    return;

  }


  if (!source) {

    preview.innerHTML = `

      <span>
        Belum ada foto
      </span>

    `;


    hide(
      removeButton
    );


    return;

  }


  preview.innerHTML = `

    <img
      src="${escapeHTML(
        source
      )}"
      alt="Preview foto produk"
    >

  `;


  show(
    removeButton
  );

}


/* =========================================================
   RESET PRODUCT IMAGE STATE
   ========================================================= */

function resetProductImageState() {

  if (
    productCropper
  ) {

    productCropper.destroy();


    productCropper =
      null;

  }


  revokePreviewObjectURL();

  revokeCropObjectURL();


  pendingProductImageBlob =
    null;


  removeCurrentProductImage =
    false;


  const input =
    el(
      'product-image-file'
    );


  if (input) {

    input.value =
      '';

  }

}


/* =========================================================
   OPEN IMAGE CROPPER
   ========================================================= */

function openImageCropper(file) {

  if (!file) {

    return;

  }


  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];


  if (
    !allowedTypes.includes(
      file.type
    )
  ) {

    showToast(
      'Gunakan file JPG, PNG, atau WebP.',
      'error'
    );


    return;

  }


  const maxOriginalSize =
    20 *
    1024 *
    1024;


  if (
    file.size >
    maxOriginalSize
  ) {

    showToast(
      'Ukuran foto maksimal 20 MB.',
      'error'
    );


    return;

  }


  if (
    !window.Cropper
  ) {

    showToast(
      'Editor foto belum siap. Muat ulang halaman.',
      'error'
    );


    return;

  }


  const cropImage =
    el(
      'crop-image'
    );


  const modal =
    el(
      'image-crop-modal'
    );


  if (
    !cropImage ||
    !modal
  ) {

    return;

  }


  if (
    productCropper
  ) {

    productCropper.destroy();


    productCropper =
      null;

  }


  revokeCropObjectURL();


  cropObjectURL =
    URL.createObjectURL(
      file
    );


  cropImage.src =
    cropObjectURL;


  show(
    modal
  );


  cropImage.onload =
    () => {

      if (
        productCropper
      ) {

        productCropper.destroy();

      }


      productCropper =
        new window.Cropper(
          cropImage,
          {

            aspectRatio:
              5 / 4,

            viewMode:
              1,

            dragMode:
              'move',

            autoCropArea:
              1,

            responsive:
              true,

            restore:
              false,

            guides:
              false,

            center:
              true,

            highlight:
              false,

            background:
              false,

            movable:
              true,

            zoomable:
              true,

            zoomOnWheel:
              true,

            zoomOnTouch:
              true,

            rotatable:
              false,

            scalable:
              false,

            cropBoxMovable:
              false,

            cropBoxResizable:
              false,

            toggleDragModeOnDblclick:
              false

          }
        );

    };

}


/* =========================================================
   CLOSE IMAGE CROPPER
   ========================================================= */

function closeImageCropper() {

  hide(
    el(
      'image-crop-modal'
    )
  );


  if (
    productCropper
  ) {

    productCropper.destroy();


    productCropper =
      null;

  }


  revokeCropObjectURL();


  const input =
    el(
      'product-image-file'
    );


  if (input) {

    input.value =
      '';

  }

}


/* =========================================================
   CONFIRM IMAGE CROP
   ========================================================= */

async function confirmImageCrop() {

  if (
    !productCropper
  ) {

    return;

  }


  const button =
    el(
      'crop-confirm'
    );


  try {

    if (button) {

      button.disabled =
        true;


      button.textContent =
        'Memproses...';

    }


    const canvas =
      productCropper.getCroppedCanvas(
        {

          width:
            1250,

          height:
            1000,

          imageSmoothingEnabled:
            true,

          imageSmoothingQuality:
            'high',

          fillColor:
            '#ffffff'

        }
      );


    if (!canvas) {

      throw new Error(
        'Foto gagal diproses.'
      );

    }


    const blob =
      await new Promise(
        (
          resolve,
          reject
        ) => {

          canvas.toBlob(
            result => {

              if (!result) {

                reject(
                  new Error(
                    'Foto gagal diproses.'
                  )
                );


                return;

              }


              resolve(
                result
              );

            },
            'image/webp',
            0.86
          );

        }
      );


    pendingProductImageBlob =
      blob;


    removeCurrentProductImage =
      false;


    revokePreviewObjectURL();


    productPreviewObjectURL =
      URL.createObjectURL(
        blob
      );


    renderProductImagePreview(
      productPreviewObjectURL
    );


    closeImageCropper();


  } catch (error) {

    console.error(
      '[IMAGE CROP ERROR]',
      error
    );


    showToast(
      errorMessage(
        error
      ),
      'error'
    );


  } finally {

    if (button) {

      button.disabled =
        false;


      button.textContent =
        'Gunakan Foto';

    }

  }

}


/* =========================================================
   UPLOAD PRODUCT IMAGE
   ========================================================= */

async function uploadProductImage() {

  if (
    !pendingProductImageBlob
  ) {

    return null;

  }


  await requireAdmin();


  const userId =
    state.user?.id;


  if (!userId) {

    throw new Error(
      'AUTHENTICATION_REQUIRED'
    );

  }


  const fileName =
    `${crypto.randomUUID()}.webp`;


  const path =
    `products/${userId}/${fileName}`;


  const {
    error: uploadError
  } =
    await supabaseClient
      .storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .upload(
        path,
        pendingProductImageBlob,
        {

          contentType:
            'image/webp',

          cacheControl:
            '31536000',

          upsert:
            false

        }
      );


  if (
    uploadError
  ) {

    throw uploadError;

  }


  const {
    data
  } =
    supabaseClient
      .storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .getPublicUrl(
        path
      );


  if (
    !data?.publicUrl
  ) {

    await deleteStorageImage(
      path
    );


    throw new Error(
      'URL gambar gagal dibuat.'
    );

  }


  return {

    path,

    publicUrl:
      data.publicUrl

  };

}


/* =========================================================
   DELETE STORAGE IMAGE
   ========================================================= */

async function deleteStorageImage(
  path
) {

  if (!path) {

    return;

  }


  const {
    error
  } =
    await supabaseClient
      .storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .remove([
        path
      ]);


  if (error) {

    console.warn(
      '[IMAGE DELETE WARNING]',
      error
    );

  }

}


/* =========================================================
   OPEN PRODUCT MODAL
   ========================================================= */

function openProductModal(
  product = null
) {

  resetProductImageState();


  state.currentProduct =
    product;


  el(
    'product-form'
  )?.reset();


  hide(
    el(
      'product-form-error'
    )
  );


  setText(
    'product-form-error',
    ''
  );


  if (
    el(
      'product-id'
    )
  ) {

    el(
      'product-id'
    ).value =
      product?.id ||
      '';

  }


  if (
    el(
      'product-name'
    )
  ) {

    el(
      'product-name'
    ).value =
      product?.name ||
      '';

  }


  if (
    el(
      'product-price'
    )
  ) {

    el(
      'product-price'
    ).value =
      product?.price ??
      '';

  }


  if (
    el(
      'product-hpp'
    )
  ) {

    el(
      'product-hpp'
    ).value =
      product?.hpp ??
      '';

  }


  if (
    el(
      'product-stock'
    )
  ) {

    el(
      'product-stock'
    ).value =
      product?.stock ??
      0;

  }


  if (
    el(
      'product-status'
    )
  ) {

    el(
      'product-status'
    ).value =
      product?.status ||
      'READY';

  }


  if (
    el(
      'product-delivery-class'
    )
  ) {

    el(
      'product-delivery-class'
    ).value =
      product?.delivery_class ||
      'DRY';

  }


  if (
    el(
      'product-description'
    )
  ) {

    el(
      'product-description'
    ).value =
      product?.description ||
      '';

  }


  renderProductImagePreview(
    product?.image_url ||
    null
  );


  setText(
    'product-modal-title',
    product
      ? 'Edit Produk'
      : 'Tambah Produk'
  );


  show(
    el(
      'product-modal'
    )
  );

}


/* =========================================================
   SAVE PRODUCT
   ========================================================= */

async function saveProduct(
  event
) {

  event.preventDefault();


  const button =
    el(
      'product-save-button'
    );


  const errorBox =
    el(
      'product-form-error'
    );


  let uploadedImage =
    null;


  let databaseSaved =
    false;


  try {

    if (button) {

      button.disabled =
        true;


      button.textContent =
        pendingProductImageBlob
          ? 'Mengupload...'
          : 'Menyimpan...';

    }


    hide(
      errorBox
    );


    const id =
      el(
        'product-id'
      )?.value ||
      '';


    const name =
      el(
        'product-name'
      )
        ?.value
        .trim() ||
      '';


    const price =
      Number(
        el(
          'product-price'
        )?.value ||
        0
      );


    const hpp =
      Number(
        el(
          'product-hpp'
        )?.value ||
        0
      );


    const stock =
      Number(
        el(
          'product-stock'
        )?.value ||
        0
      );


    const status =
      el(
        'product-status'
      )?.value ||
      'READY';


    const deliveryClass =
      el(
        'product-delivery-class'
      )?.value ||
      'DRY';


    const description =
      el(
        'product-description'
      )
        ?.value
        .trim() ||
      null;


    if (!name) {

      throw new Error(
        'Nama produk wajib diisi.'
      );

    }


    if (
      !Number.isFinite(
        price
      ) ||
      price < 0
    ) {

      throw new Error(
        'Harga produk tidak valid.'
      );

    }


    if (
      !Number.isFinite(
        hpp
      ) ||
      hpp < 0
    ) {

      throw new Error(
        'HPP tidak valid.'
      );

    }


    if (
      !Number.isInteger(
        stock
      ) ||
      stock < 0
    ) {

      throw new Error(
        'Stok harus berupa angka bulat 0 atau lebih.'
      );

    }


    if (
      ![
        'READY',
        'PRE_ORDER',
        'NOT_FOR_SALE'
      ].includes(
        status
      )
    ) {

      throw new Error(
        'Status produk tidak valid.'
      );

    }


    if (
      ![
        'DRY',
        'FRESH'
      ].includes(
        deliveryClass
      )
    ) {

      throw new Error(
        'Delivery Class tidak valid.'
      );

    }


    const oldImageURL =
      state.currentProduct
        ?.image_url ||
      null;


    const oldImagePath =
      state.currentProduct
        ?.image_path ||
      null;


    let imageURL =
      oldImageURL;


    let imagePath =
      oldImagePath;


    if (
      pendingProductImageBlob
    ) {

      uploadedImage =
        await uploadProductImage();


      imageURL =
        uploadedImage.publicUrl;


      imagePath =
        uploadedImage.path;

    }


    if (
      removeCurrentProductImage &&
      !pendingProductImageBlob
    ) {

      imageURL =
        null;


      imagePath =
        null;

    }


    const payload = {

      name,

      price,

      hpp,

      stock,

      status,

      delivery_class:
        deliveryClass,

      description,

      image_url:
        imageURL,

      image_path:
        imagePath

    };


    let result;


    if (id) {

      result =
        await supabaseClient
          .from(
            'products'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          );


    } else {

      result =
        await supabaseClient
          .from(
            'products'
          )
          .insert(
            payload
          );

    }


    if (
      result.error
    ) {

      throw result.error;

    }


    databaseSaved =
      true;


    if (
      oldImagePath &&
      (
        uploadedImage ||
        (
          removeCurrentProductImage &&
          !pendingProductImageBlob
        )
      )
    ) {

      await deleteStorageImage(
        oldImagePath
      );

    }


    pendingProductImageBlob =
      null;


    removeCurrentProductImage =
      false;


    state.currentProduct =
      null;


    revokePreviewObjectURL();


    closeModal(
      'product-modal'
    );


    await loadProducts();


    renderProducts();

    renderStock();

    renderDashboardStock();


    showToast(
      id
        ? 'Produk berhasil diperbarui.'
        : 'Produk berhasil ditambahkan.'
    );


  } catch (error) {

    console.error(
      '[PRODUCT SAVE ERROR]',
      error
    );


    /*
      Kalau gambar sudah berhasil upload,
      tapi database gagal disimpan,
      hapus file baru supaya tidak jadi file yatim.
    */

    if (
      uploadedImage?.path &&
      !databaseSaved
    ) {

      await deleteStorageImage(
        uploadedImage.path
      );

    }


    if (errorBox) {

      errorBox.textContent =
        errorMessage(
          error
        );


      show(
        errorBox
      );

    }


  } finally {

    if (button) {

      button.disabled =
        false;


      button.textContent =
        'Simpan Produk';

    }

  }

}


/* =========================================================
   REMOVE PRODUCT IMAGE
   ========================================================= */

function removeProductImage() {

  revokePreviewObjectURL();


  pendingProductImageBlob =
    null;


  removeCurrentProductImage =
    true;


  renderProductImagePreview(
    null
  );


  const input =
    el(
      'product-image-file'
    );


  if (input) {

    input.value =
      '';

  }

}


/* =========================================================
   DISABLE PRODUCT
   ========================================================= */

async function deleteProduct(
  productId
) {

  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );


  if (!product) {

    return;

  }


  const confirmed =
    window.confirm(
      `Nonaktifkan produk "${product.name}"?\n\nProduk tidak akan tampil lagi di toko, tetapi riwayat pesanan tetap tersimpan.`
    );


  if (!confirmed) {

    return;

  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from(
          'products'
        )
        .update({

          status:
            'NOT_FOR_SALE'

        })
        .eq(
          'id',
          productId
        );


    if (error) {

      throw error;

    }


    await loadProducts();


    renderProducts();

    renderStock();

    renderDashboardStock();


    showToast(
      'Produk berhasil dinonaktifkan.'
    );


  } catch (error) {

    console.error(
      '[PRODUCT DISABLE ERROR]',
      error
    );


    showToast(
      errorMessage(
        error
      ),
      'error'
    );

  }

}


/* =========================================================
   ACTIVATE PRODUCT
   ========================================================= */

async function activateProduct(
  productId
) {

  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );


  if (!product) {

    return;

  }


  const confirmed =
    window.confirm(
      `Aktifkan kembali produk "${product.name}"?`
    );


  if (!confirmed) {

    return;

  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from(
          'products'
        )
        .update({

          status:
            'READY'

        })
        .eq(
          'id',
          productId
        );


    if (error) {

      throw error;

    }


    await loadProducts();


    renderProducts();

    renderStock();

    renderDashboardStock();


    showToast(
      'Produk berhasil diaktifkan.'
    );


  } catch (error) {

    console.error(
      '[PRODUCT ACTIVATE ERROR]',
      error
    );


    showToast(
      errorMessage(
        error
      ),
      'error'
    );

  }

}


/* =========================================================
   STOCK RENDER
   ========================================================= */

function renderStock() {

  const tbody =
    el(
      'stock-table-body'
    );


  if (!tbody) return;


  const total =
    state.products.length;


  const safe =
    state.products.filter(
      product =>
        Number(
          product.stock
        ) > 3
    ).length;


  const low =
    state.products.filter(
      product => {

        const stock =
          Number(
            product.stock
          );


        return (
          stock > 0 &&
          stock <= 3
        );

      }
    ).length;


  const empty =
    state.products.filter(
      product =>
        Number(
          product.stock
        ) <= 0
    ).length;


  setText(
    'stock-total-products',
    total
  );


  setText(
    'stock-safe-products',
    safe
  );


  setText(
    'stock-low-products',
    low
  );


  setText(
    'stock-empty-products',
    empty
  );


  if (
    !state.products.length
  ) {

    tbody.innerHTML = `

      <tr>

        <td colspan="5">

          <div class="empty-state">
            Belum ada produk.
          </div>

        </td>

      </tr>

    `;

    return;

  }


  tbody.innerHTML =
    state.products
      .map(
        product => {

          const stock =
            Number(
              product.stock
            );


          let statusClass =
            'safe';


          let statusLabel =
            'Aman';


          if (
            stock <= 0
          ) {

            statusClass =
              'empty';


            statusLabel =
              'Habis';


          } else if (
            stock <= 3
          ) {

            statusClass =
              'low';


            statusLabel =
              'Menipis';

          }


          return `

            <tr>

              <td>

                <strong>
                  ${escapeHTML(
                    product.name
                  )}
                </strong>

                <small>
                  ${escapeHTML(
                    deliveryClassLabel(
                      product.delivery_class
                    )
                  )}
                </small>

              </td>


              <td>

                <span
                  class="status-badge status-${statusClass}"
                >
                  ${statusLabel}
                </span>

              </td>


              <td>
                ${stock}
              </td>


              <td>
                ${formatDate(
                  product.updated_at
                )}
              </td>


              <td>

                <button
                  type="button"
                  class="btn btn-secondary btn-small"
                  data-action="adjust-stock"
                  data-product-id="${product.id}"
                >
                  Adjust
                </button>

              </td>

            </tr>

          `;

        }
      )
      .join('');

}


/* =========================================================
   STOCK MODAL
   ========================================================= */

function openStockModal(
  productId
) {

  const product =
    state.products.find(
      row =>
        row.id ===
        productId
    );


  if (!product) {

    return;

  }


  if (
    el(
      'stock-product-id'
    )
  ) {

    el(
      'stock-product-id'
    ).value =
      product.id;

  }


  if (
    el(
      'new-stock'
    )
  ) {

    el(
      'new-stock'
    ).value =
      Number(
        product.stock
      );

  }


  if (
    el(
      'stock-note'
    )
  ) {

    el(
      'stock-note'
    ).value =
      '';

  }


  setText(
    'stock-product-name',
    product.name
  );


  hide(
    el(
      'stock-form-error'
    )
  );


  show(
    el(
      'stock-modal'
    )
  );

}


/* =========================================================
   ADJUST STOCK
   ========================================================= */

async function adjustStock(
  productId,
  newStock,
  note = null
) {

  await requireAdmin();


  const stock =
    Number(
      newStock
    );


  if (
    !Number.isInteger(
      stock
    ) ||
    stock < 0
  ) {

    throw new Error(
      'Stok tidak valid.'
    );

  }


  return adminRPC(
    'admin_adjust_stock',
    {

      p_product_id:
        productId,

      p_new_stock:
        stock,

      p_note:
        note ||
        null

    }
  );

}


/* =========================================================
   STOCK FORM
   ========================================================= */

async function submitStockForm(
  event
) {

  event.preventDefault();


  const button =
    el(
      'stock-save-button'
    );


  const errorBox =
    el(
      'stock-form-error'
    );


  try {

    if (button) {

      button.disabled =
        true;

    }


    hide(
      errorBox
    );


    const productId =
      el(
        'stock-product-id'
      )?.value;


    const stock =
      Number(
        el(
          'new-stock'
        )?.value
      );


    const note =
      el(
        'stock-note'
      )
        ?.value
        .trim() ||
      null;


    await adjustStock(
      productId,
      stock,
      note
    );


    closeModal(
      'stock-modal'
    );


    await Promise.all([

      loadProducts(),

      loadStockMovements()

    ]);


    renderProducts();

    renderStock();

    renderDashboardStock();


    showToast(
      'Stok berhasil diperbarui.'
    );


  } catch (error) {

    console.error(
      '[STOCK ERROR]',
      error
    );


    if (errorBox) {

      errorBox.textContent =
        errorMessage(
          error
        );


      show(
        errorBox
      );

    }


  } finally {

    if (button) {

      button.disabled =
        false;

    }

  }

}


/* =========================================================
   PRODUCTION RENDER
   ========================================================= */

function renderProduction() {

  const pending =
    state.production.filter(
      item =>
        item.status ===
        'PENDING'
    );


  const active =
    state.production.filter(
      item =>
        item.status ===
        'IN_PROGRESS'
    );


  const completed =
    state.production.filter(
      item =>
        item.status ===
        'COMPLETED'
    );


  setText(
    'production-pending-count',
    pending.length
  );


  setText(
    'production-active-count',
    active.length
  );


  setText(
    'production-completed-count',
    completed.length
  );


  renderProductionColumn(
    'production-pending',
    pending
  );


  renderProductionColumn(
    'production-active',
    active
  );


  renderProductionColumn(
    'production-completed',
    completed
  );

}


function renderProductionColumn(
  containerId,
  rows
) {

  const container =
    el(
      containerId
    );


  if (!container) return;


  if (!rows.length) {

    container.innerHTML = `

      <div class="empty-state">
        Kosong
      </div>

    `;

    return;

  }


  container.innerHTML =
    rows
      .map(
        production => {

          const order =
            state.orders.find(
              item =>
                item.id ===
                production.order_id
            );


          return `

            <article class="production-card">

              <div>

                <strong>
                  ${escapeHTML(
                    order?.order_number ||
                    production.order_id
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    order?.customer_name ||
                    ''
                  )}
                </span>

              </div>


              <small>
                ${escapeHTML(
                  productionStatusLabel(
                    production.status
                  )
                )}
              </small>


              ${
                production.deadline
                  ? `
                      <small>
                        Deadline:
                        ${formatDate(
                          production.deadline
                        )}
                      </small>
                    `
                  : ''
              }


              ${
                production.status ===
                  'PENDING'
                  ? `
                      <button
                        type="button"
                        class="btn btn-primary btn-small"
                        data-action="start-production"
                        data-order-id="${production.order_id}"
                      >
                        Mulai
                      </button>
                    `
                  : ''
              }


              ${
                production.status ===
                  'IN_PROGRESS'
                  ? `
                      <button
                        type="button"
                        class="btn btn-primary btn-small"
                        data-action="complete-production"
                        data-order-id="${production.order_id}"
                      >
                        Selesai Produksi
                      </button>
                    `
                  : ''
              }

            </article>

          `;

        }
      )
      .join('');

}


/* =========================================================
   PAYMENTS RENDER
   ========================================================= */

function renderPayments() {

  const container =
    el(
      'pending-payments-list'
    );


  const unpaid =
    state.orders.filter(
      order =>
        order.payment_status ===
          'UNPAID' &&
        order.status !==
          'CANCELLED'
    );


  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  const paidToday =
    state.payments.filter(
      payment =>
        payment.status ===
          'PAID' &&
        String(
          payment.paid_at ||
          ''
        )
          .slice(
            0,
            10
          ) ===
        today
    );


  const revenue =
    paidToday.reduce(
      (
        total,
        payment
      ) =>
        total +
        Number(
          payment.amount ||
          0
        ),
      0
    );


  setText(
    'payment-pending-count',
    unpaid.length
  );


  setText(
    'payment-confirmed-today',
    paidToday.length
  );


  setText(
    'payment-revenue-today',
    formatCurrency(
      revenue
    )
  );


  if (!container) {

    return;

  }


  if (!unpaid.length) {

    container.innerHTML = `

      <div class="empty-state">
        Tidak ada pembayaran menunggu.
      </div>

    `;

    return;

  }


  container.innerHTML =
    unpaid
      .map(
        order => `

          <div class="payment-item">

            <div>

              <strong>
                ${escapeHTML(
                  order.order_number
                )}
              </strong>

              <span>
                ${escapeHTML(
                  order.customer_name
                )}
              </span>

            </div>


            <div>

              <strong>
                ${formatCurrency(
                  order.total
                )}
              </strong>

              <button
                type="button"
                class="btn btn-primary btn-small"
                data-action="confirm-payment"
                data-order-id="${order.id}"
              >
                Konfirmasi
              </button>

            </div>

          </div>

        `
      )
      .join('');

}


/* =========================================================
   AUDIT RENDER
   ========================================================= */

function renderAudit() {

  const tbody =
    el(
      'audit-table-body'
    );


  if (!tbody) return;


  if (
    !state.auditLogs.length
  ) {

    tbody.innerHTML = `

      <tr>

        <td colspan="5">

          <div class="empty-state">
            Belum ada log.
          </div>

        </td>

      </tr>

    `;

    return;

  }


  tbody.innerHTML =
    state.auditLogs
      .map(
        log => `

          <tr>

            <td>
              ${formatDate(
                log.created_at
              )}
            </td>

            <td>
              ${escapeHTML(
                log.action
              )}
            </td>

            <td>
              ${escapeHTML(
                log.table_name
              )}
            </td>

            <td>

              <code>
                ${escapeHTML(
                  log.record_id ||
                  '-'
                )}
              </code>

            </td>

            <td>
              -
            </td>

          </tr>

        `
      )
      .join('');

}


/* =========================================================
   PAYMENT RPC
   ========================================================= */

async function confirmPayment(
  orderId
) {

  const order =
    state.orders.find(
      item =>
        item.id ===
        orderId
    );


  if (!order) {

    return false;

  }


  const amountInput =
    window.prompt(
      'Jumlah pembayaran:',
      Number(
        order.total ||
        0
      )
    );


  if (
    amountInput ===
    null
  ) {

    return false;

  }


  const amount =
    Number(
      amountInput
    );


  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {

    throw new Error(
      'Jumlah pembayaran tidak valid.'
    );

  }


  const methodInput =
    window.prompt(
      'Metode pembayaran:\nCASH / BANK_TRANSFER / E_WALLET / OTHER',
      'BANK_TRANSFER'
    );


  if (
    methodInput ===
    null
  ) {

    return false;

  }


  const paymentMethod =
    String(
      methodInput
    )
      .trim()
      .toUpperCase();


  if (
    !PAYMENT_METHODS.includes(
      paymentMethod
    )
  ) {

    throw new Error(
      'Metode pembayaran tidak valid.'
    );

  }


  await adminRPC(
    'admin_confirm_payment',
    {

      p_order_id:
        orderId,

      p_amount:
        amount,

      p_payment_method:
        paymentMethod

    }
  );


  return true;

}


/* =========================================================
   PRODUCTION RPC
   ========================================================= */

async function startProduction(
  orderId
) {

  return adminRPC(
    'admin_start_production',
    {

      p_order_id:
        orderId

    }
  );

}


async function completeProduction(
  orderId
) {

  return adminRPC(
    'admin_complete_production',
    {

      p_order_id:
        orderId

    }
  );

}


/* =========================================================
   ORDER RPC
   ========================================================= */

async function markOrderReady(
  orderId
) {

  return adminRPC(
    'admin_mark_order_ready',
    {

      p_order_id:
        orderId

    }
  );

}


async function markOrderShipped(
  orderId
) {

  return adminRPC(
    'admin_mark_order_shipped',
    {

      p_order_id:
        orderId

    }
  );

}


async function completeOrder(
  orderId
) {

  return adminRPC(
    'admin_complete_order',
    {

      p_order_id:
        orderId

    }
  );

}


async function cancelOrder(
  orderId
) {

  const reason =
    window.prompt(
      'Alasan pembatalan:',
      ''
    );


  if (
    reason ===
    null
  ) {

    return false;

  }


  await adminRPC(
    'admin_cancel_order',
    {

      p_order_id:
        orderId,

      p_reason:
        reason.trim() ||
        null

    }
  );


  return true;

}


/* =========================================================
   REFRESH ADMIN DATA
   ========================================================= */

async function refreshAdminData() {

  await Promise.all([

    loadOrders(),

    loadProducts(),

    loadPayments(),

    loadProduction(),

    loadSettings()

  ]);


  renderDashboard();

  renderOrders();

  renderProducts();

  renderProduction();

  renderStock();

  renderPayments();

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function switchSection(
  name
) {

  state.activeSection =
    name;


  all(
    '.admin-section'
  ).forEach(
    section => {

      section.classList.remove(
        'active'
      );

    }
  );


  all(
    '.admin-nav-item'
  ).forEach(
    button => {

      button.classList.toggle(
        'active',
        button.dataset.section ===
          name
      );

    }
  );


  el(
    `section-${name}`
  )?.classList.add(
    'active'
  );


  closeSidebar();


  loadSection(
    name
  );

}


/* =========================================================
   LOAD SECTION
   ========================================================= */

async function loadSection(
  name
) {

  try {

    switch (
      name
    ) {

      case 'dashboard':

        await loadDashboard();

        break;


      case 'orders':

        await loadOrders();

        renderOrders();

        break;


      case 'products':

        await Promise.all([

          loadProducts(),

          loadCategories()

        ]);


        renderProducts();

        break;


      case 'production':

        await Promise.all([

          loadProduction(),

          loadOrders()

        ]);


        renderProduction();

        break;


      case 'stock':

        await loadProducts();

        renderStock();

        break;


      case 'payments':

        await Promise.all([

          loadOrders(),

          loadPayments()

        ]);


        renderPayments();

        break;


      case 'audit':

        await loadAuditLogs();

        renderAudit();

        break;

    }


  } catch (error) {

    console.error(
      `[SECTION ${name}]`,
      error
    );


    showToast(
      errorMessage(
        error
      ),
      'error'
    );

  }

}


/* =========================================================
   MODALS
   ========================================================= */

function closeModal(id) {

  hide(
    el(
      id
    )
  );


  if (
    id ===
    'product-modal'
  ) {

    closeImageCropper();


    resetProductImageState();


    state.currentProduct =
      null;

  }

}


function closeAllModals() {

  all(
    '.modal'
  ).forEach(
    modal => {

      modal.classList.add(
        'hidden'
      );

    }
  );


  if (
    productCropper
  ) {

    productCropper.destroy();


    productCropper =
      null;

  }


  revokeCropObjectURL();

}


/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {

  document.body
    .classList
    .add(
      'sidebar-open'
    );


  show(
    el(
      'sidebar-overlay'
    )
  );

}


function closeSidebar() {

  document.body
    .classList
    .remove(
      'sidebar-open'
    );


  hide(
    el(
      'sidebar-overlay'
    )
  );

}


/* =========================================================
   GLOBAL ACTION HANDLER
   ========================================================= */

async function handleAction(
  event
) {

  const button =
    event.target.closest(
      '[data-action]'
    );


  if (!button) {

    return;

  }


  const action =
    button.dataset
      .action;


  const orderId =
    button.dataset
      .orderId;


  const productId =
    button.dataset
      .productId;


  try {

    button.disabled =
      true;


    switch (
      action
    ) {

      case 'view-order':

        await openOrderModal(
          orderId
        );

        break;


      case 'edit-product': {

        const product =
          state.products.find(
            item =>
              item.id ===
              productId
          );


        openProductModal(
          product
        );


        break;

      }


      case 'delete-product':

        await deleteProduct(
          productId
        );

        break;


      case 'activate-product':

        await activateProduct(
          productId
        );

        break;


      case 'adjust-stock':

        openStockModal(
          productId
        );

        break;


      case 'confirm-payment': {

        const confirmed =
          await confirmPayment(
            orderId
          );


        if (
          confirmed
        ) {

          await refreshAdminData();


          closeModal(
            'order-modal'
          );


          showToast(
            'Pembayaran berhasil dikonfirmasi.'
          );

        }


        break;

      }


      case 'start-production':

        await startProduction(
          orderId
        );


        await refreshAdminData();


        closeModal(
          'order-modal'
        );


        showToast(
          'Produksi dimulai.'
        );


        break;


      case 'complete-production':

        await completeProduction(
          orderId
        );


        await refreshAdminData();


        showToast(
          'Produksi selesai.'
        );


        break;


      case 'mark-ready':

        await markOrderReady(
          orderId
        );


        await refreshAdminData();


        closeModal(
          'order-modal'
        );


        showToast(
          'Pesanan siap dikirim.'
        );


        break;


      case 'mark-shipped':

        await markOrderShipped(
          orderId
        );


        await refreshAdminData();


        closeModal(
          'order-modal'
        );


        showToast(
          'Pesanan ditandai dikirim.'
        );


        break;


      case 'complete-order':

        await completeOrder(
          orderId
        );


        await refreshAdminData();


        closeModal(
          'order-modal'
        );


        showToast(
          'Pesanan selesai.'
        );


        break;


      case 'cancel-order': {

        const cancelled =
          await cancelOrder(
            orderId
          );


        if (
          cancelled
        ) {

          await refreshAdminData();


          closeModal(
            'order-modal'
          );


          showToast(
            'Pesanan dibatalkan.',
            'warning'
          );

        }


        break;

      }

    }


  } catch (error) {

    console.error(
      `[ACTION ${action}]`,
      error
    );


    showToast(
      errorMessage(
        error
      ),
      'error'
    );


  } finally {

    button.disabled =
      false;

  }

}


/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function bindEvents() {


  /* LOGIN */

  el(
    'admin-login-form'
  )?.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      const button =
        el(
          'admin-login-button'
        );


      const errorBox =
        el(
          'admin-login-error'
        );


      try {

        button.disabled =
          true;


        hide(
          errorBox
        );


        await login(

          el(
            'admin-email'
          )
            .value
            .trim(),

          el(
            'admin-password'
          )
            .value

        );


        showApp();


        await loadDashboard();


      } catch (error) {

        console.error(
          '[LOGIN ERROR]',
          error
        );


        errorBox.textContent =
          errorMessage(
            error
          );


        show(
          errorBox
        );


      } finally {

        button.disabled =
          false;

      }

    }
  );


  /* PASSWORD */

  el(
    'toggle-password'
  )?.addEventListener(
    'click',
    () => {

      const input =
        el(
          'admin-password'
        );


      if (!input) {

        return;

      }


      const hidden =
        input.type ===
        'password';


      input.type =
        hidden
          ? 'text'
          : 'password';


      setText(
        'toggle-password',
        hidden
          ? 'Hide'
          : 'Show'
      );

    }
  );


  /* LOGOUT */

  el(
    'admin-logout'
  )?.addEventListener(
    'click',
    async () => {

      try {

        await logout();


      } catch (error) {

        showToast(
          errorMessage(
            error
          ),
          'error'
        );

      }

    }
  );


  /* NAVIGATION */

  all(
    '.admin-nav-item'
  ).forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          switchSection(
            button.dataset
              .section
          );

        }
      );

    }
  );


  all(
    '[data-section-target]'
  ).forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          switchSection(
            button.dataset
              .sectionTarget
          );

        }
      );

    }
  );


  /* ADD PRODUCT */

  el(
    'add-product-button'
  )?.addEventListener(
    'click',
    () => {

      openProductModal();

    }
  );


  /* PRODUCT SAVE */

  el(
    'product-form'
  )?.addEventListener(
    'submit',
    saveProduct
  );


  /* PRODUCT IMAGE PICKER */

  el(
    'product-image-file'
  )?.addEventListener(
    'change',
    event => {

      const file =
        event.target
          .files?.[0];


      if (!file) {

        return;

      }


      openImageCropper(
        file
      );

    }
  );


  /* REMOVE PRODUCT IMAGE */

  el(
    'remove-product-image'
  )?.addEventListener(
    'click',
    removeProductImage
  );


  /* CROP ZOOM IN */

  el(
    'crop-zoom-in'
  )?.addEventListener(
    'click',
    () => {

      productCropper
        ?.zoom(
          0.1
        );

    }
  );


  /* CROP ZOOM OUT */

  el(
    'crop-zoom-out'
  )?.addEventListener(
    'click',
    () => {

      productCropper
        ?.zoom(
          -0.1
        );

    }
  );


  /* CROP RESET */

  el(
    'crop-reset'
  )?.addEventListener(
    'click',
    () => {

      productCropper
        ?.reset();

    }
  );


  /* CROP CONFIRM */

  el(
    'crop-confirm'
  )?.addEventListener(
    'click',
    confirmImageCrop
  );


  /* CROP CANCEL */

  el(
    'crop-cancel'
  )?.addEventListener(
    'click',
    closeImageCropper
  );


  /* CROP BACKDROP */

  el(
    'image-crop-backdrop'
  )?.addEventListener(
    'click',
    closeImageCropper
  );


  /* STOCK */

  el(
    'stock-form'
  )?.addEventListener(
    'submit',
    submitStockForm
  );


  /* ORDER SEARCH */

  el(
    'order-search'
  )?.addEventListener(
    'input',
    renderOrders
  );


  /* ORDER FILTER */

  el(
    'order-status-filter'
  )?.addEventListener(
    'change',
    renderOrders
  );


  /* PRODUCT SEARCH */

  el(
    'product-search'
  )?.addEventListener(
    'input',
    renderProducts
  );


  /* PRODUCT FILTER */

  el(
    'product-status-filter'
  )?.addEventListener(
    'change',
    renderProducts
  );


  /* REFRESH DASHBOARD */

  el(
    'refresh-dashboard'
  )?.addEventListener(
    'click',
    async () => {

      try {

        await loadDashboard();


        showToast(
          'Dashboard diperbarui.'
        );


      } catch (error) {

        showToast(
          errorMessage(
            error
          ),
          'error'
        );

      }

    }
  );


  /* REFRESH ORDERS */

  el(
    'refresh-orders'
  )?.addEventListener(
    'click',
    async () => {

      try {

        await loadOrders();


        renderOrders();


      } catch (error) {

        showToast(
          errorMessage(
            error
          ),
          'error'
        );

      }

    }
  );


  /* REFRESH PRODUCTION */

  el(
    'refresh-production'
  )?.addEventListener(
    'click',
    async () => {

      try {

        await Promise.all([

          loadOrders(),

          loadProduction()

        ]);


        renderProduction();


      } catch (error) {

        showToast(
          errorMessage(
            error
          ),
          'error'
        );

      }

    }
  );


  /* REFRESH STOCK */

  el(
    'refresh-stock'
  )?.addEventListener(
    'click',
    async () => {

      try {

        await loadProducts();


        renderStock();


      } catch (error) {

        showToast(
          errorMessage(
            error
          ),
          'error'
        );

      }

    }
  );


  /* REFRESH AUDIT */

  el(
    'refresh-audit'
  )?.addEventListener(
    'click',
    async () => {

      try {

        await loadAuditLogs();


        renderAudit();


      } catch (error) {

        showToast(
          errorMessage(
            error
          ),
          'error'
        );

      }

    }
  );


  /* STORE STATUS */

  el(
    'toggle-store-status'
  )?.addEventListener(
    'click',
    async () => {

      try {

        await toggleStoreStatus();


      } catch (error) {

        console.error(
          '[STORE STATUS ERROR]',
          error
        );


        showToast(
          errorMessage(
            error
          ),
          'error'
        );

      }

    }
  );


  /* MOBILE SIDEBAR */

  el(
    'mobile-sidebar-open'
  )?.addEventListener(
    'click',
    openSidebar
  );


  el(
    'mobile-sidebar-close'
  )?.addEventListener(
    'click',
    closeSidebar
  );


  el(
    'sidebar-overlay'
  )?.addEventListener(
    'click',
    closeSidebar
  );


  /* MODAL CLOSE */

  document.addEventListener(
    'click',
    event => {

      const closeTrigger =
        event.target.closest(
          '[data-close-modal]'
        );


      if (
        !closeTrigger
      ) {

        return;

      }


      const modal =
        closeTrigger.closest(
          '.modal'
        );


      if (modal) {

        closeModal(
          modal.id
        );

      } else {

        closeAllModals();

      }

    }
  );


  /* GLOBAL ACTION */

  document.addEventListener(
    'click',
    handleAction
  );


  /* ESCAPE */

  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key !==
        'Escape'
      ) {

        return;

      }


      if (
        !el(
          'image-crop-modal'
        )?.classList.contains(
          'hidden'
        )
      ) {

        closeImageCropper();


        return;

      }


      closeAllModals();

      closeSidebar();

    }
  );

}


/* =========================================================
   AUTH LISTENER
   ========================================================= */

function listenAuth() {

  supabaseClient
    .auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {

        state.user =
          session?.user ||
          null;


        if (
          event ===
          'SIGNED_OUT'
        ) {

          state.isAdmin =
            false;


          showLogin();

        }

      }
    );

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initAdmin() {

  bindEvents();


  listenAuth();


  try {

    const session =
      await getSession();


    if (!session) {

      showLogin();


      return;

    }


    const admin =
      await checkAdmin();


    if (!admin) {

      showLogin();


      const errorBox =
        el(
          'admin-login-error'
        );


      if (errorBox) {

        errorBox.textContent =
          'Akun ini bukan admin aktif.';


        show(
          errorBox
        );

      }


      return;

    }


    showApp();


    await loadDashboard();


    console.log(
      'Dapur Ozi Admin initialized.'
    );


    console.log(
      'Product image upload ready.'
    );


  } catch (error) {

    console.error(
      'Dapur Ozi Admin initialization failed:',
      error
    );


    showToast(
      errorMessage(
        error
      ),
      'error'
    );

  }

}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.DapurOziAdmin = {

  state,

  supabase:
    supabaseClient,


  getSession,

  checkAdmin,

  requireAdmin,

  login,

  logout,


  loadOrders,

  loadOrderItems,

  loadProducts,

  loadCategories,

  loadPayments,

  loadProduction,

  loadStockMovements,

  loadAuditLogs,

  loadSettings,

  loadDashboard,


  renderDashboard,

  renderOrders,

  renderProducts,

  renderProduction,

  renderStock,

  renderPayments,

  renderAudit,


  openProductModal,

  saveProduct,

  deleteProduct,

  activateProduct,


  openImageCropper,

  closeImageCropper,

  confirmImageCrop,

  uploadProductImage,

  deleteStorageImage,

  removeProductImage,


  adjustStock,

  confirmPayment,


  startProduction,

  completeProduction,


  markOrderReady,

  markOrderShipped,

  completeOrder,

  cancelOrder,


  toggleStoreStatus

};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  initAdmin
);
