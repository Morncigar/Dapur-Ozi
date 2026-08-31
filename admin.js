import {
  createClient
} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';


/* =========================================================
   CONFIG
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
  activeSection: 'dashboard',

  orders: [],
  products: [],
  categories: [],
  payments: [],
  production: [],
  stockMovements: [],
  auditLogs: [],
  discounts: [],

  settings: null,

  currentOrder: null,
  currentProduct: null
};


/* =========================================================
   PRODUCT IMAGE STATE
   ========================================================= */

let productCropper = null;

let pendingProductImageBlob = null;

let removeCurrentProductImage = false;

let productPreviewObjectURL = null;

let cropObjectURL = null;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function el(id) {
  return document.getElementById(id);
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
  const element = el(id);

  if (!element) return;

  element.textContent =
    value ?? '';
}


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


function formatCurrency(value) {
  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date =
    new Date(value);

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
      dateStyle: 'medium',
      timeStyle: 'short'
    }
  );
}


/* =========================================================
   ERRORS
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
      'ORDER_PRICING_LOCKED'
    )
  ) {
    return (
      'Harga pesanan sudah dikunci karena pembayaran telah diproses.'
    );
  }

  if (
    message.includes(
      'ORDER_NOT_AWAITING_PAYMENT'
    )
  ) {
    return (
      'Pesanan ini sudah tidak berada pada tahap menunggu pembayaran.'
    );
  }

  if (
    message.includes(
      'DISCOUNT_NOT_AVAILABLE'
    )
  ) {
    return (
      'Diskon yang dipilih sudah tidak tersedia.'
    );
  }

  if (
    message.includes(
      'PICKUP_SHIPPING_MUST_BE_ZERO'
    )
  ) {
    return (
      'Pesanan pickup tidak boleh memiliki ongkir.'
    );
  }

  if (
    message.includes(
      'ORDER_ITEM_SNAPSHOT_IMMUTABLE'
    )
  ) {
    return (
      'Data riwayat pesanan tidak dapat diubah.'
    );
  }

  if (
    message.includes(
      'row-level security'
    )
  ) {
    return (
      'Aksi ditolak oleh keamanan database.'
    );
  }

  if (
    message.includes(
      'Bucket not found'
    )
  ) {
    return (
      'Storage product-images belum tersedia.'
    );
  }

  return message;
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;


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
   RPC
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
   AUTH
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
    Boolean(result);

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

  state.user = null;
  state.isAdmin = false;

  showLogin();
}


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
          ascending: false
        }
      );

  if (error) {
    throw error;
  }

  state.orders =
    data || [];

  return state.orders;
}


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
          ascending: true
        }
      );

  if (error) {
    throw error;
  }

  return data || [];
}


/* =========================================================
   PRODUCTS
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
        image_path,
        display_order,
        is_featured,
        delivery_class,
        created_at,
        updated_at
      `)
      .order(
        'display_order',
        {
          ascending: true
        }
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );

  if (error) {
    throw error;
  }

  state.products =
    data || [];

  return state.products;
}


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
          ascending: true
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
   PAYMENTS
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
          ascending: false
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
   PRODUCTION
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
          ascending: false
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
   STOCK
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
          ascending: false
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
   AUDIT
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
          ascending: false
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
   DISCOUNTS
   ========================================================= */

async function loadDiscounts() {
  await requireAdmin();

  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        'discounts'
      )
      .select(
        'id, name, percentage, is_active, created_at, updated_at'
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );

  if (error) {
    throw error;
  }

  state.discounts =
    data || [];

  return state.discounts;
}


function renderDiscounts() {
  const tbody =
    el(
      'discounts-table-body'
    );

  if (!tbody) return;

  if (!state.discounts.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            Belum ada diskon.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    state.discounts
      .map(
        discount => {
          const percentage =
            Number(
              discount.percentage ||
              0
            );

          const active =
            Boolean(
              discount.is_active
            );

          return `
            <tr>

              <td>
                <strong>
                  ${escapeHTML(
                    discount.name
                  )}
                </strong>
              </td>

              <td>
                ${percentage.toLocaleString(
                  'id-ID',
                  {
                    maximumFractionDigits:
                      2
                  }
                )}%
              </td>

              <td>
                <span class="status-badge">
                  ${
                    active
                      ? 'Aktif'
                      : 'Nonaktif'
                  }
                </span>
              </td>

              <td>
                ${formatDate(
                  discount.created_at
                )}
              </td>

              <td>

                <div class="table-actions">

                  <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    data-action="edit-discount"
                    data-discount-id="${discount.id}"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn ${
                      active
                        ? 'btn-secondary'
                        : 'btn-primary'
                    } btn-small"
                    data-action="toggle-discount"
                    data-discount-id="${discount.id}"
                    data-discount-active="${active}"
                  >
                    ${
                      active
                        ? 'Nonaktifkan'
                        : 'Aktifkan'
                    }
                  </button>

                </div>

              </td>

            </tr>
          `;
        }
      )
      .join('');
}


function openDiscountModal(
  discount = null
) {
  el(
    'discount-form'
  )?.reset();

  hide(
    el(
      'discount-form-error'
    )
  );

  setText(
    'discount-form-error',
    ''
  );

  if (
    el(
      'discount-id'
    )
  ) {
    el(
      'discount-id'
    ).value =
      discount?.id ||
      '';
  }

  if (
    el(
      'discount-name'
    )
  ) {
    el(
      'discount-name'
    ).value =
      discount?.name ||
      '';
  }

  if (
    el(
      'discount-percentage'
    )
  ) {
    el(
      'discount-percentage'
    ).value =
      discount?.percentage ??
      '';
  }

  setText(
    'discount-modal-title',
    discount
      ? 'Edit Diskon'
      : 'Tambah Diskon'
  );

  show(
    el(
      'discount-modal'
    )
  );
}


async function saveDiscount(
  event
) {
  event.preventDefault();

  await requireAdmin();

  const button =
    el(
      'discount-save-button'
    );

  const errorBox =
    el(
      'discount-form-error'
    );

  try {
    const id =
      el(
        'discount-id'
      )?.value ||
      '';

    const name =
      el(
        'discount-name'
      )
        ?.value
        .trim() ||
      '';

    const percentage =
      Number(
        el(
          'discount-percentage'
        )?.value
      );

    if (!name) {
      throw new Error(
        'Nama diskon wajib diisi.'
      );
    }

    if (
      !Number.isFinite(
        percentage
      ) ||
      percentage <= 0 ||
      percentage > 100
    ) {
      throw new Error(
        'Persentase harus lebih dari 0 dan maksimal 100.'
      );
    }

    if (button) {
      button.disabled =
        true;

      button.textContent =
        'Menyimpan...';
    }

    hide(
      errorBox
    );

    if (id) {
      await adminRPC(
        'admin_update_discount',
        {
          p_discount_id:
            id,

          p_name:
            name,

          p_percentage:
            percentage
        }
      );
    } else {
      await adminRPC(
        'admin_create_discount',
        {
          p_name:
            name,

          p_percentage:
            percentage
        }
      );
    }

    await loadDiscounts();

    renderDiscounts();

    closeModal(
      'discount-modal'
    );

    showToast(
      id
        ? 'Diskon berhasil diperbarui.'
        : 'Diskon berhasil ditambahkan.'
    );

  } catch (error) {
    const message =
      errorMessage(
        error
      );

    if (errorBox) {
      errorBox.textContent =
        message;

      show(
        errorBox
      );
    }

    showToast(
      message,
      'error'
    );

  } finally {
    if (button) {
      button.disabled =
        false;

      button.textContent =
        'Simpan Diskon';
    }
  }
}


async function setDiscountActive(
  discountId,
  active
) {
  await requireAdmin();

  await adminRPC(
    'admin_set_discount_active',
    {
      p_discount_id:
        discountId,

      p_is_active:
        active
    }
  );

  await loadDiscounts();

  renderDiscounts();

  showToast(
    active
      ? 'Diskon diaktifkan.'
      : 'Diskon dinonaktifkan.'
  );
}


/* =========================================================
   SETTINGS
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


function normalizeWhatsAppNumber(
  value
) {
  let number =
    String(
      value ?? ''
    )
      .trim()
      .replace(
        /\D/g,
        ''
      );

  if (
    number.startsWith(
      '0'
    )
  ) {
    number =
      `62${number.slice(1)}`;

  } else if (
    number.startsWith(
      '8'
    )
  ) {
    number =
      `62${number}`;
  }

  if (
    !/^628\d{8,12}$/.test(
      number
    )
  ) {
    return null;
  }

  return number;
}


function formatWhatsAppForInput(
  value
) {
  const number =
    String(
      value ?? ''
    )
      .replace(
        /\D/g,
        ''
      );

  if (
    number.startsWith(
      '62'
    )
  ) {
    return (
      `0${number.slice(2)}`
    );
  }

  return number;
}


function renderSettings() {
  if (!state.settings) {
    return;
  }

  const current =
    String(
      state.settings
        .whatsapp_number ||
      ''
    );

  const input =
    el(
      'settings-whatsapp-number'
    );

  if (input) {
    input.value =
      formatWhatsAppForInput(
        current
      );
  }

  setText(
    'settings-whatsapp-current',
    current
      ? formatWhatsAppForInput(
          current
        )
      : 'Belum diatur'
  );
}


async function saveStoreSettings(
  event
) {
  event.preventDefault();

  await requireAdmin();

  const input =
    el(
      'settings-whatsapp-number'
    );

  const button =
    el(
      'save-store-settings'
    );

  const errorBox =
    el(
      'settings-whatsapp-error'
    );

  const whatsappNumber =
    normalizeWhatsAppNumber(
      input?.value
    );

  if (!whatsappNumber) {
    if (errorBox) {
      errorBox.textContent =
        'Nomor WhatsApp tidak valid.';

      show(
        errorBox
      );
    }

    return;
  }

  try {
    if (button) {
      button.disabled =
        true;

      button.textContent =
        'Menyimpan...';
    }

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          'settings'
        )
        .update({
          whatsapp_number:
            whatsappNumber,

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          1
        )
        .select(
          '*'
        )
        .single();

    if (error) {
      throw error;
    }

    state.settings =
      data;

    renderSettings();

    showToast(
      'Nomor WhatsApp berhasil disimpan.'
    );

  } catch (error) {
    const message =
      errorMessage(
        error
      );

    if (errorBox) {
      errorBox.textContent =
        message;

      show(
        errorBox
      );
    }

  } finally {
    if (button) {
      button.disabled =
        false;

      button.textContent =
        'Simpan Nomor';
    }
  }
}


/* =========================================================
   LABELS
   ========================================================= */

function orderStatusLabel(
  status
) {
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


function paymentStatusLabel(
  status
) {
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


function productStatusLabel(
  status
) {
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
  value
) {
  const labels = {
    DRY:
      'Dry',

    FRESH:
      'Fresh'
  };

  return (
    labels[value] ||
    value ||
    '-'
  );
}


function productionStatusLabel(
  value
) {
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
    labels[value] ||
    value ||
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


function renderDashboard() {
  const today =
    new Date();

  setText(
    'dashboard-date',
    today.toLocaleDateString(
      'id-ID',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
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

  const pending =
    state.orders.filter(
      order =>
        order.status ===
        'PENDING_PAYMENT'
    );

  const activeProduction =
    state.production.filter(
      item =>
        item.status ===
          'PENDING' ||
        item.status ===
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
    pending.length
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
      pending.length;

    pending.length
      ? show(navCount)
      : hide(navCount);
  }

  renderStoreStatus();

  renderDashboardOrders();

  renderDashboardStock();
}


function renderStoreStatus() {
  if (!state.settings) {
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


async function toggleStoreStatus() {
  await requireAdmin();

  const next =
    !Boolean(
      state.settings
        ?.store_open
    );

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
          next
            ? 'Dapur Ozi sedang buka.'
            : 'Dapur Ozi sedang tutup.',

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
              )} tersisa
            </span>
          </div>
        `
      )
      .join('');
}


/* =========================================================
   ORDERS TABLE
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
              <span class="status-badge">
                ${escapeHTML(
                  paymentStatusLabel(
                    order.payment_status
                  )
                )}
              </span>
            </td>

            <td>
              <span class="status-badge">
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
   ORDER DETAIL + PRICING
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
    const [
      items
    ] =
      await Promise.all([
        loadOrderItems(
          order.id
        ),
        loadDiscounts()
      ]);

    const pricingEditable =
      order.payment_status ===
        'UNPAID' &&
      order.status ===
        'PENDING_PAYMENT';

    const availableDiscounts =
      state.discounts.filter(
        discount =>
          discount.is_active ||
          discount.id ===
            order.discount_id
      );

    const discountOptions =
      [
        `
          <option value="">
            Tanpa diskon
          </option>
        `,
        ...availableDiscounts.map(
          discount => `
            <option
              value="${discount.id}"
              data-percentage="${Number(
                discount.percentage ||
                0
              )}"
              ${
                discount.id ===
                  order.discount_id
                  ? 'selected'
                  : ''
              }
            >
              ${escapeHTML(
                discount.name
              )}
              (${Number(
                discount.percentage
              ).toLocaleString(
                'id-ID',
                {
                  maximumFractionDigits:
                    2
                }
              )}%)
            </option>
          `
        )
      ]
        .join('');

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


        <div class="order-detail-card">

          <h3>
            Tagihan
          </h3>


          ${
            pricingEditable
              ? `
                  <div class="form-row">

                    <div class="form-group">

                      <label for="order-shipping-cost">
                        Ongkir
                      </label>

                      <input
                        type="number"
                        id="order-shipping-cost"
                        min="0"
                        step="1"
                        value="${
                          order.shipping_type ===
                            'PICKUP'
                            ? 0
                            : Number(
                                order.shipping_cost ||
                                0
                              )
                        }"
                        ${
                          order.shipping_type ===
                            'PICKUP'
                            ? 'disabled'
                            : ''
                        }
                      >

                      ${
                        order.shipping_type ===
                          'PICKUP'
                          ? `
                              <small class="form-helper">
                                Pickup tidak menggunakan ongkir.
                              </small>
                            `
                          : ''
                      }

                    </div>


                    <div class="form-group">

                      <label for="order-discount-id">
                        Diskon
                      </label>

                      <select id="order-discount-id">
                        ${discountOptions}
                      </select>

                    </div>

                  </div>
                `
              : `
                  <p class="form-helper">
                    Harga sudah dikunci.
                  </p>
                `
          }


          <div class="order-total-card">

            <div>
              <span>
                Subtotal
              </span>

              <strong id="pricing-preview-subtotal">
                ${formatCurrency(
                  order.subtotal
                )}
              </strong>
            </div>


            <div>
              <span>
                Ongkir
              </span>

              <strong id="pricing-preview-shipping">
                ${formatCurrency(
                  order.shipping_cost
                )}
              </strong>
            </div>


            <div>
              <span>
                Diskon
              </span>

              <strong id="pricing-preview-discount">
                ${formatCurrency(
                  order.discount
                )}
              </strong>
            </div>


            <div class="order-total-final">

              <span>
                Total
              </span>

              <strong id="pricing-preview-total">
                ${formatCurrency(
                  order.total
                )}
              </strong>

            </div>

          </div>

        </div>


        <div class="modal-actions">

          ${
            pricingEditable
              ? `
                  <button
                    type="button"
                    class="btn btn-primary"
                    data-action="save-order-pricing"
                    data-order-id="${order.id}"
                  >
                    Simpan Tagihan
                  </button>


                  <button
                    type="button"
                    class="btn btn-secondary"
                    data-action="print-invoice"
                    data-order-id="${order.id}"
                  >
                    Cetak Invoice
                  </button>
                `
              : ''
          }


          ${
            order.payment_status ===
              'PAID'
              ? `
                  <button
                    type="button"
                    class="btn btn-secondary"
                    data-action="print-receipt"
                    data-order-id="${order.id}"
                  >
                    Cetak Struk
                  </button>
                `
              : ''
          }


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

    if (
      pricingEditable
    ) {
      bindOrderPricingPreview(
        order
      );
    }

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


function bindOrderPricingPreview(
  order
) {
  const shippingInput =
    el(
      'order-shipping-cost'
    );

  const discountSelect =
    el(
      'order-discount-id'
    );

  function update() {
    const subtotal =
      Number(
        order.subtotal ||
        0
      );

    const shipping =
      order.shipping_type ===
        'PICKUP'
        ? 0
        : Math.max(
            0,
            Number(
              shippingInput?.value ||
              0
            )
          );

    const option =
      discountSelect
        ?.selectedOptions
        ?.[0];

    const percentage =
      Number(
        option
          ?.dataset
          ?.percentage ||
        0
      );

    const discount =
      Math.round(
        (
          subtotal *
          percentage /
          100
        ) *
        100
      ) /
      100;

    const total =
      Math.max(
        0,
        subtotal +
        shipping -
        discount
      );

    setText(
      'pricing-preview-subtotal',
      formatCurrency(
        subtotal
      )
    );

    setText(
      'pricing-preview-shipping',
      formatCurrency(
        shipping
      )
    );

    setText(
      'pricing-preview-discount',
      formatCurrency(
        discount
      )
    );

    setText(
      'pricing-preview-total',
      formatCurrency(
        total
      )
    );
  }

  shippingInput
    ?.addEventListener(
      'input',
      update
    );

  discountSelect
    ?.addEventListener(
      'change',
      update
    );

  update();
}


async function saveOrderPricing(
  orderId
) {
  await requireAdmin();

  const order =
    state.orders.find(
      item =>
        item.id ===
        orderId
    );

  if (!order) {
    throw new Error(
      'Pesanan tidak ditemukan.'
    );
  }

  const shippingCost =
    order.shipping_type ===
      'PICKUP'
      ? 0
      : Number(
          el(
            'order-shipping-cost'
          )?.value ||
          0
        );

  if (
    !Number.isFinite(
      shippingCost
    ) ||
    shippingCost < 0
  ) {
    throw new Error(
      'Ongkir tidak valid.'
    );
  }

  const discountId =
    el(
      'order-discount-id'
    )?.value ||
    null;

  await adminRPC(
    'admin_update_order_pricing',
    {
      p_order_id:
        orderId,

      p_shipping_cost:
        shippingCost,

      p_discount_id:
        discountId
    }
  );

  await loadOrders();

  showToast(
    'Tagihan berhasil disimpan.'
  );

  await openOrderModal(
    orderId
  );
}


/* =========================================================
   PRINT INVOICE / RECEIPT
   ========================================================= */

function getPaymentForOrder(
  orderId
) {
  return (
    state.payments
      .filter(
        payment =>
          payment.order_id ===
            orderId &&
          payment.status ===
            'PAID'
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.paid_at ||
            b.created_at ||
            0
          ) -
          new Date(
            a.paid_at ||
            a.created_at ||
            0
          )
      )[0] ||
    null
  );
}


function paymentMethodLabel(
  value
) {
  const labels = {
    CASH:
      'Tunai',

    BANK_TRANSFER:
      'Transfer Bank',

    E_WALLET:
      'E-Wallet',

    OTHER:
      'Lainnya'
  };

  return (
    labels[value] ||
    value ||
    '-'
  );
}


async function printOrderDocument(
  orderId,
  type = 'invoice'
) {
  await requireAdmin();

  await Promise.all([
    loadOrders(),
    loadPayments()
  ]);

  const order =
    state.orders.find(
      item =>
        item.id ===
        orderId
    );

  if (!order) {
    throw new Error(
      'Pesanan tidak ditemukan.'
    );
  }

  if (
    type ===
      'receipt' &&
    order.payment_status !==
      'PAID'
  ) {
    throw new Error(
      'Struk hanya tersedia untuk pesanan yang sudah dibayar.'
    );
  }

  const items =
    await loadOrderItems(
      orderId
    );

  const payment =
    getPaymentForOrder(
      orderId
    );

  const title =
    type ===
      'receipt'
      ? 'STRUK PEMBAYARAN'
      : 'INVOICE';

  const status =
    type ===
      'receipt'
      ? 'LUNAS'
      : 'BELUM LUNAS';

  const popup =
    window.open(
      '',
      '_blank',
      'width=900,height=900'
    );

  if (!popup) {
    throw new Error(
      'Popup diblokir browser.'
    );
  }

  popup.document.write(`
<!DOCTYPE html>
<html lang="id">

<head>

<meta charset="UTF-8">

<title>
${escapeHTML(
  title
)}
${escapeHTML(
  order.order_number
)}
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 32px;
  font-family: Arial, sans-serif;
  color: #281a16;
}

.sheet {
  max-width: 760px;
  margin: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  border-bottom: 2px solid #281a16;
  padding-bottom: 20px;
}

h1,
h2,
h3 {
  margin-top: 0;
}

.muted {
  color: #666;
}

.status {
  display: inline-block;
  border: 1px solid #281a16;
  border-radius: 30px;
  padding: 6px 12px;
  font-weight: bold;
  font-size: 12px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 24px;
}

.box {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 16px;
}

.box p {
  margin: 6px 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 25px;
}

th,
td {
  padding: 10px;
  border-bottom: 1px solid #ddd;
}

th {
  text-align: left;
}

.right {
  text-align: right;
}

.totals {
  width: 360px;
  max-width: 100%;
  margin: 25px 0 0 auto;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
}

.grand-total {
  border-top: 2px solid #281a16;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 18px;
  font-weight: bold;
}

.footer {
  margin-top: 35px;
  padding-top: 15px;
  border-top: 1px solid #ddd;
  font-size: 12px;
  color: #666;
}

@media print {
  body {
    padding: 0;
  }
}

</style>

</head>

<body>

<div class="sheet">

<div class="header">

<div>

<h1>
Dapur Ozi
</h1>

<p class="muted">
Masakan rumahan & snack
</p>

</div>

<div>

<h2>
${escapeHTML(
  title
)}
</h2>

<p>
${escapeHTML(
  order.order_number
)}
</p>

<span class="status">
${status}
</span>

</div>

</div>


<div class="grid">

<div class="box">

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


<div class="box">

<h3>
Pesanan
</h3>

<p>
<strong>Tanggal:</strong>
${escapeHTML(
  formatDate(
    order.checkout_at ||
    order.created_at
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

${
  type ===
    'receipt'
    ? `

<p>
<strong>Dibayar:</strong>
${escapeHTML(
  formatDate(
    payment?.paid_at ||
    payment?.created_at
  )
)}
</p>

<p>
<strong>Metode:</strong>
${escapeHTML(
  paymentMethodLabel(
    payment?.payment_method ||
    payment?.method
  )
)}
</p>

`
    : ''
}

</div>

</div>


<table>

<thead>

<tr>
<th>Produk</th>
<th class="right">Qty</th>
<th class="right">Harga</th>
<th class="right">Subtotal</th>
</tr>

</thead>

<tbody>

${items
  .map(
    item => `

<tr>

<td>
${escapeHTML(
  item.product_name
)}
</td>

<td class="right">
${item.quantity}
</td>

<td class="right">
${formatCurrency(
  item.unit_price
)}
</td>

<td class="right">
${formatCurrency(
  item.subtotal
)}
</td>

</tr>

`
  )
  .join('')}

</tbody>

</table>


<div class="totals">

<div class="total-row">

<span>
Subtotal
</span>

<strong>
${formatCurrency(
  order.subtotal
)}
</strong>

</div>


<div class="total-row">

<span>
Ongkir
</span>

<strong>
${formatCurrency(
  order.shipping_cost
)}
</strong>

</div>


<div class="total-row">

<span>
${
  order.discount_name
    ? escapeHTML(
        order.discount_name
      )
    : 'Diskon'
}
</span>

<strong>
- ${formatCurrency(
  order.discount
)}
</strong>

</div>


<div class="total-row grand-total">

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


<div class="footer">

${
  type ===
    'receipt'
    ? 'Dokumen ini merupakan bukti pembayaran pesanan Dapur Ozi.'
    : 'Invoice ini merupakan rincian tagihan. Status pembayaran: BELUM LUNAS.'
}

</div>

</div>


<script>

window.addEventListener(
  'load',
  () => {
    window.print();
  }
);

<\/script>

</body>

</html>
  `);

  popup.document.close();
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
   IMAGE CROP
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

  if (!preview) return;

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


function openImageCropper(
  file
) {
  if (!file) return;

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

  if (
    !window.Cropper
  ) {
    showToast(
      'Editor foto belum siap.',
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
      productCropper =
        new window.Cropper(
          cropImage,
          {
            aspectRatio: 5 / 4,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            responsive: true,
            guides: false,
            background: false,
            movable: true,
            zoomable: true,
            cropBoxMovable: false,
            cropBoxResizable: false
          }
        );
    };
}


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
}


async function confirmImageCrop() {
  if (!productCropper) {
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
      productCropper
        .getCroppedCanvas({
          width: 1250,
          height: 1000,
          imageSmoothingEnabled:
            true,

          imageSmoothingQuality:
            'high',

          fillColor:
            '#ffffff'
        });

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


async function uploadProductImage() {
  if (
    !pendingProductImageBlob
  ) {
    return null;
  }

  await requireAdmin();

  const userId =
    state.user?.id;

  const fileName =
    `${crypto.randomUUID()}.webp`;

  const path =
    `products/${userId}/${fileName}`;

  const {
    error
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

  if (error) {
    throw error;
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

  return {
    path,

    publicUrl:
      data.publicUrl
  };
}


async function deleteStorageImage(
  path
) {
  if (!path) return;

  await supabaseClient
    .storage
    .from(
      PRODUCT_IMAGE_BUCKET
    )
    .remove([
      path
    ]);
}


function removeProductImage() {
  pendingProductImageBlob =
    null;

  removeCurrentProductImage =
    true;

  renderProductImagePreview(
    null
  );
}


/* =========================================================
   PRODUCT MODAL
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

  const values = {
    'product-id':
      product?.id ||
      '',

    'product-name':
      product?.name ||
      '',

    'product-price':
      product?.price ??
      '',

    'product-hpp':
      product?.hpp ??
      '',

    'product-stock':
      product?.stock ??
      0,

    'product-status':
      product?.status ||
      'READY',

    'product-delivery-class':
      product?.delivery_class ||
      'DRY',

    'product-description':
      product?.description ||
      ''
  };

  Object.entries(
    values
  ).forEach(
    ([
      id,
      value
    ]) => {
      if (
        el(id)
      ) {
        el(id).value =
          value;
      }
    }
  );

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


async function saveProduct(
  event
) {
  event.preventDefault();

  await requireAdmin();

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

  try {
    if (button) {
      button.disabled =
        true;

      button.textContent =
        'Menyimpan...';
    }

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
        .trim();

    const price =
      Number(
        el(
          'product-price'
        )?.value
      );

    const hpp =
      Number(
        el(
          'product-hpp'
        )?.value
      );

    const stock =
      Number(
        el(
          'product-stock'
        )?.value
      );

    const status =
      el(
        'product-status'
      )?.value;

    const deliveryClass =
      el(
        'product-delivery-class'
      )?.value;

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

    let imageURL =
      state.currentProduct
        ?.image_url ||
      null;

    let imagePath =
      state.currentProduct
        ?.image_path ||
      null;

    const oldImagePath =
      imagePath;

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
      imageURL = null;
      imagePath = null;
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

    if (
      oldImagePath &&
      oldImagePath !==
        imagePath
    ) {
      await deleteStorageImage(
        oldImagePath
      );
    }

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
    if (
      uploadedImage?.path
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


async function deleteProduct(
  productId
) {
  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );

  if (!product) return;

  if (
    !window.confirm(
      `Nonaktifkan produk "${product.name}"?`
    )
  ) {
    return;
  }

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

  showToast(
    'Produk dinonaktifkan.'
  );
}


async function activateProduct(
  productId
) {
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

  showToast(
    'Produk diaktifkan.'
  );
}


/* =========================================================
   STOCK
   ========================================================= */

function renderStock() {
  const tbody =
    el(
      'stock-table-body'
    );

  if (!tbody) return;

  const ready =
    state.products.filter(
      product =>
        product.status ===
        'READY'
    );

  setText(
    'stock-total-products',
    state.products.length
  );

  setText(
    'stock-safe-products',
    ready.filter(
      product =>
        Number(
          product.stock
        ) > 3
    ).length
  );

  setText(
    'stock-low-products',
    ready.filter(
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
    ).length
  );

  setText(
    'stock-empty-products',
    ready.filter(
      product =>
        Number(
          product.stock
        ) <= 0
    ).length
  );

  tbody.innerHTML =
    state.products
      .map(
        product => `
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
              ${escapeHTML(
                productStatusLabel(
                  product.status
                )
              )}
            </td>

            <td>
              ${Number(
                product.stock
              )}
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
        `
      )
      .join('');
}


function openStockModal(
  productId
) {
  const product =
    state.products.find(
      item =>
        item.id ===
        productId
    );

  if (!product) return;

  el(
    'stock-product-id'
  ).value =
    product.id;

  el(
    'new-stock'
  ).value =
    Number(
      product.stock
    );

  setText(
    'stock-product-name',
    product.name
  );

  show(
    el(
      'stock-modal'
    )
  );
}


async function adjustStock(
  productId,
  newStock,
  note = null
) {
  return adminRPC(
    'admin_adjust_stock',
    {
      p_product_id:
        productId,

      p_new_stock:
        Number(
          newStock
        ),

      p_note:
        note ||
        null
    }
  );
}


async function submitStockForm(
  event
) {
  event.preventDefault();

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

  await loadProducts();

  renderProducts();

  renderStock();

  renderDashboardStock();

  showToast(
    'Stok berhasil diperbarui.'
  );
}


/* =========================================================
   PRODUCTION
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
  id,
  rows
) {
  const container =
    el(id);

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

              <small>
                ${escapeHTML(
                  productionStatusLabel(
                    production.status
                  )
                )}
              </small>

              ${
                production.status ===
                  'PENDING'
                  ? `
                      <button
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
   PAYMENTS
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

  if (!container) return;

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
   AUDIT
   ========================================================= */

function renderAudit() {
  const tbody =
    el(
      'audit-table-body'
    );

  if (!tbody) return;

  if (!state.auditLogs.length) {
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
   ORDER / PRODUCTION RPC
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
   REFRESH
   ========================================================= */

async function refreshAdminData() {
  await Promise.all([
    loadOrders(),
    loadProducts(),
    loadPayments(),
    loadProduction(),
    loadSettings(),
    loadDiscounts()
  ]);

  renderDashboard();

  renderOrders();

  renderProducts();

  renderProduction();

  renderStock();

  renderPayments();

  renderDiscounts();

  renderSettings();
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
        button.dataset
          .section ===
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
          loadOrders(),
          loadProduction()
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


      case 'discounts':

        await loadDiscounts();

        renderDiscounts();

        break;


      case 'settings':

        await loadSettings();

        renderSettings();

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
   MODAL
   ========================================================= */

function closeModal(id) {
  hide(
    el(id)
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

  closeImageCropper();
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
   GLOBAL ACTIONS
   ========================================================= */

async function handleAction(
  event
) {
  const button =
    event.target.closest(
      '[data-action]'
    );

  if (!button) return;

  const action =
    button.dataset
      .action;

  const orderId =
    button.dataset
      .orderId;

  const productId =
    button.dataset
      .productId;

  const discountId =
    button.dataset
      .discountId;

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


      case 'edit-discount': {

        const discount =
          state.discounts.find(
            item =>
              item.id ===
              discountId
          );

        openDiscountModal(
          discount
        );

        break;
      }


      case 'toggle-discount':

        await setDiscountActive(
          discountId,
          button.dataset
            .discountActive !==
            'true'
        );

        break;


      case 'save-order-pricing':

        await saveOrderPricing(
          orderId
        );

        break;


      case 'print-invoice':

        await printOrderDocument(
          orderId,
          'invoice'
        );

        break;


      case 'print-receipt':

        await printOrderDocument(
          orderId,
          'receipt'
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

        if (confirmed) {
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

        if (cancelled) {
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
   EVENTS
   ========================================================= */

function bindEvents() {

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
          ).value.trim(),

          el(
            'admin-password'
          ).value
        );

        showApp();

        await loadDashboard();

      } catch (error) {
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


  el(
    'toggle-password'
  )?.addEventListener(
    'click',
    () => {
      const input =
        el(
          'admin-password'
        );

      if (!input) return;

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


  el(
    'admin-logout'
  )?.addEventListener(
    'click',
    logout
  );


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


  el(
    'add-discount-button'
  )?.addEventListener(
    'click',
    () => {
      openDiscountModal();
    }
  );


  el(
    'discount-form'
  )?.addEventListener(
    'submit',
    saveDiscount
  );


  el(
    'add-product-button'
  )?.addEventListener(
    'click',
    () => {
      openProductModal();
    }
  );


  el(
    'product-form'
  )?.addEventListener(
    'submit',
    saveProduct
  );


  el(
    'product-image-file'
  )?.addEventListener(
    'change',
    event => {
      const file =
        event.target
          .files?.[0];

      if (file) {
        openImageCropper(
          file
        );
      }
    }
  );


  el(
    'remove-product-image'
  )?.addEventListener(
    'click',
    removeProductImage
  );


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


  el(
    'crop-reset'
  )?.addEventListener(
    'click',
    () => {
      productCropper
        ?.reset();
    }
  );


  el(
    'crop-confirm'
  )?.addEventListener(
    'click',
    confirmImageCrop
  );


  el(
    'crop-cancel'
  )?.addEventListener(
    'click',
    closeImageCropper
  );


  el(
    'image-crop-backdrop'
  )?.addEventListener(
    'click',
    closeImageCropper
  );


  el(
    'stock-form'
  )?.addEventListener(
    'submit',
    submitStockForm
  );


  el(
    'order-search'
  )?.addEventListener(
    'input',
    renderOrders
  );


  el(
    'order-status-filter'
  )?.addEventListener(
    'change',
    renderOrders
  );


  el(
    'product-search'
  )?.addEventListener(
    'input',
    renderProducts
  );


  el(
    'product-status-filter'
  )?.addEventListener(
    'change',
    renderProducts
  );


  el(
    'refresh-dashboard'
  )?.addEventListener(
    'click',
    async () => {
      await loadDashboard();

      showToast(
        'Dashboard diperbarui.'
      );
    }
  );


  el(
    'refresh-orders'
  )?.addEventListener(
    'click',
    async () => {
      await loadOrders();

      renderOrders();
    }
  );


  el(
    'refresh-production'
  )?.addEventListener(
    'click',
    async () => {
      await Promise.all([
        loadOrders(),
        loadProduction()
      ]);

      renderProduction();
    }
  );


  el(
    'refresh-stock'
  )?.addEventListener(
    'click',
    async () => {
      await loadProducts();

      renderStock();
    }
  );


  el(
    'refresh-audit'
  )?.addEventListener(
    'click',
    async () => {
      await loadAuditLogs();

      renderAudit();
    }
  );


  el(
    'store-settings-form'
  )?.addEventListener(
    'submit',
    saveStoreSettings
  );


  el(
    'toggle-store-status'
  )?.addEventListener(
    'click',
    async () => {
      try {
        await toggleStoreStatus();

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


  document.addEventListener(
    'click',
    event => {
      const closeTrigger =
        event.target.closest(
          '[data-close-modal]'
        );

      if (!closeTrigger) {
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
      }
    }
  );


  document.addEventListener(
    'click',
    handleAction
  );


  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key ===
        'Escape'
      ) {
        closeAllModals();

        closeSidebar();
      }
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
   INIT
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

      return;
    }

    showApp();

    await loadDashboard();

    console.log(
      'Dapur Ozi Admin initialized.'
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
   DEBUG EXPORT
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
  loadDiscounts,

  renderDashboard,
  renderOrders,
  renderProducts,
  renderProduction,
  renderStock,
  renderPayments,
  renderAudit,
  renderSettings,
  renderDiscounts,

  openDiscountModal,
  saveDiscount,
  setDiscountActive,

  saveOrderPricing,
  printOrderDocument,

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
