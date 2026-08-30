/* =========================================================
   DAPUR OZI
   ADMIN FRONTEND
   v3
   ========================================================= */

import {
    createClient
} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';


/* =========================================================
   SUPABASE
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
   ENUMS
   ========================================================= */

const PRODUCT_STATUS = [
    'READY',
    'PRE_ORDER',
    'NOT_FOR_SALE'
];

const SHIPPING_TYPES = [
    'LOCAL',
    'NATIONAL',
    'PICKUP'
];

const DELIVERY_CLASSES = [
    'DRY',
    'FRESH'
];

const ORDER_STATUS = [
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PREPARING',
    'READY_TO_SHIP',
    'SHIPPED',
    'COMPLETED',
    'CANCELLED'
];

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

    const element =
        el(id);

    if (!element) return;

    element.textContent =
        value ?? '';

}


/* =========================================================
   ESCAPE
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
   FORMAT
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
            value || 0
        )
    );

}


function formatDate(value) {

    if (!value) {

        return '—';

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return '—';

    }


    return date
        .toLocaleString(
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
   ERROR
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
            'INVALID_PRODUCT_SHIPPING_CONFIGURATION'
        )
    ) {

        return (
            'Kombinasi Delivery Class dan Shipping Type tidak valid. ' +
            'Produk Fresh hanya boleh Local atau Pickup.'
        );

    }


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
        el('admin-toast');

    const text =
        el('admin-toast-message');


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
            `[ADMIN RPC] ${functionName}`,
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
        el('admin-login')
    );

    hide(
        el('admin-app')
    );

}


function showApp() {

    hide(
        el('admin-login')
    );

    show(
        el('admin-app')
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
            .from('orders')
            .select('*')
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
   ORDER ITEMS
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
            .from('order_items')
            .select('*')
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
   PRODUCTS
   ========================================================= */

async function loadProducts() {

    await requireAdmin();


    const {
        data,
        error
    } =
        await supabaseClient
            .from('products')
            .select('*')
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
   CATEGORIES
   ========================================================= */

async function loadCategories() {

    await requireAdmin();


    const {
        data,
        error
    } =
        await supabaseClient
            .from('categories')
            .select('*')
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
   PAYMENTS
   ========================================================= */

async function loadPayments() {

    await requireAdmin();


    const {
        data,
        error
    } =
        await supabaseClient
            .from('payments')
            .select('*')
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
   PRODUCTION
   ========================================================= */

async function loadProduction() {

    await requireAdmin();


    const {
        data,
        error
    } =
        await supabaseClient
            .from('production')
            .select('*')
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
   STOCK MOVEMENTS
   ========================================================= */

async function loadStockMovements() {

    await requireAdmin();


    const {
        data,
        error
    } =
        await supabaseClient
            .from('stock_movements')
            .select('*')
            .order(
                'created_at',
                {
                    ascending:
                        false
                }
            )
            .limit(100);


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
            .from('audit_logs')
            .select('*')
            .order(
                'created_at',
                {
                    ascending:
                        false
                }
            )
            .limit(100);


    if (error) {

        throw error;

    }


    state.auditLogs =
        data || [];


    return state.auditLogs;

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
            .from('settings')
            .select('*')
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


    return state.settings;

}


/* =========================================================
   DASHBOARD LOAD
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
   STATUS HELPERS
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
        '—'
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
        '—'
    );

}


function productionStatusLabel(
    status
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
        labels[status] ||
        status ||
        '—'
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
        '—'
    );

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
        today.toISOString()
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
            row =>
                row.status ===
                    'PENDING' ||
                row.status ===
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
        el('nav-order-count');


    if (navCount) {

        navCount.textContent =
            pendingPayment.length;


        if (
            pendingPayment.length
        ) {

            show(navCount);

        } else {

            hide(navCount);

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

    const settings =
        state.settings;


    if (!settings) {

        return;

    }


    const open =
        Boolean(
            settings.store_open
        );


    setText(
        'store-status-text',
        open
            ? 'Dapur Ozi sedang buka'
            : 'Dapur Ozi sedang tutup'
    );


    setText(
        'store-status-detail',
        settings.store_message ||
        ''
    );


    const dot =
        el('store-status-dot');


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
        el('toggle-store-status');


    if (button) {

        button.textContent =
            open
                ? 'Tutup Toko'
                : 'Buka Toko';

    }

}


/* =========================================================
   STORE STATUS UPDATE
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


    const {
        error
    } =
        await supabaseClient
            .from('settings')
            .update({

                store_open:
                    next,

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
   DASHBOARD RECENT ORDERS
   ========================================================= */

function renderDashboardOrders() {

    const container =
        el('dashboard-orders');


    if (!container) return;


    const orders =
        state.orders
            .slice(
                0,
                5
            );


    if (!orders.length) {

        container.innerHTML =
            '<div class="empty-state">Belum ada pesanan.</div>';

        return;

    }


    container.innerHTML =
        orders
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
   DASHBOARD LOW STOCK
   ========================================================= */

function renderDashboardStock() {

    const container =
        el('dashboard-low-stock');


    if (!container) return;


    const products =
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


    if (!products.length) {

        container.innerHTML =
            '<div class="empty-state">Semua stok aman.</div>';

        return;

    }


    container.innerHTML =
        products
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
   ORDERS RENDER
   ========================================================= */

function renderOrders() {

    const tbody =
        el('orders-table-body');


    if (!tbody) return;


    const search =
        (
            el('order-search')
                ?.value ||
            ''
        )
            .trim()
            .toLowerCase();


    const status =
        el(
            'order-status-filter'
        )?.value ||
        'ALL';


    const rows =
        state.orders.filter(
            order => {

                const matchesSearch =
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


                const matchesStatus =
                    status ===
                        'ALL' ||
                    order.status ===
                        status;


                return (
                    matchesSearch &&
                    matchesStatus
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
                            <span class="status-badge status-${
                                String(
                                    order.payment_status ||
                                    'unpaid'
                                )
                                    .toLowerCase()
                                    .replaceAll(
                                        '_',
                                        '-'
                                    )
                            }">
                                ${escapeHTML(
                                    paymentStatusLabel(
                                        order.payment_status
                                    )
                                )}
                            </span>
                        </td>

                        <td>
                            <span class="status-badge status-${
                                String(
                                    order.status ||
                                    ''
                                )
                                    .toLowerCase()
                                    .replaceAll(
                                        '_',
                                        '-'
                                    )
                            }">
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
   ORDER MODAL
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


    if (!order) {

        return;

    }


    state.currentOrder =
        order;


    const modal =
        el('order-modal');

    const content =
        el('order-modal-content');


    show(modal);


    content.innerHTML =
        '<div class="loading-state">Memuat detail...</div>';


    try {

        const items =
            await loadOrderItems(
                orderId
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

                        <h3>Pelanggan</h3>

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
                                '—'
                            )}
                        </p>

                        <p>
                            <strong>Alamat:</strong>
                            ${escapeHTML(
                                order.customer_address ||
                                '—'
                            )}
                        </p>

                    </div>


                    <div class="order-detail-card">

                        <h3>Status</h3>

                        <p>
                            ${escapeHTML(
                                orderStatusLabel(
                                    order.status
                                )
                            )}
                        </p>

                        <p>
                            Pembayaran:
                            ${escapeHTML(
                                paymentStatusLabel(
                                    order.payment_status
                                )
                            )}
                        </p>

                        <p>
                            Pengiriman:
                            ${escapeHTML(
                                order.shipping_type
                            )}
                        </p>

                    </div>

                </div>


                <div class="order-items-section">

                    <h3>Item</h3>

                    <div class="table-wrapper">

                        <table class="admin-table">

                            <thead>
                                <tr>
                                    <th>Produk</th>
                                    <th>Qty</th>
                                    <th>Harga</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>

                            <tbody>

                                ${
                                    items.map(
                                        item => `

                                            <tr>

                                                <td>
                                                    ${escapeHTML(
                                                        item.product_name
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
                                    ).join('')
                                }

                            </tbody>

                        </table>

                    </div>

                </div>


                <div class="order-total-card">

                    <div>
                        <span>Subtotal</span>
                        <strong>
                            ${formatCurrency(
                                order.subtotal
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Ongkir</span>
                        <strong>
                            ${formatCurrency(
                                order.shipping_cost
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Diskon</span>
                        <strong>
                            ${formatCurrency(
                                order.discount
                            )}
                        </strong>
                    </div>

                    <div class="order-total-final">
                        <span>Total</span>
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
                        order.status !==
                            'CANCELLED'
                            ? `
                                <button
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
   PRODUCT SHIPPING VALIDATION
   ========================================================= */

/*
 * RULE DATABASE:
 *
 * FRESH:
 * - LOCAL
 * - PICKUP
 *
 * DRY:
 * - LOCAL
 * - NATIONAL
 * - PICKUP
 */

function updateProductShippingOptions() {

    const delivery =
        el(
            'product-delivery-class'
        );

    const shipping =
        el(
            'product-shipping'
        );


    if (
        !delivery ||
        !shipping
    ) {

        return;

    }


    const national =
        shipping.querySelector(
            'option[value="NATIONAL"]'
        );


    if (!national) {

        return;

    }


    const fresh =
        delivery.value ===
        'FRESH';


    national.disabled =
        fresh;


    if (
        fresh &&
        shipping.value ===
            'NATIONAL'
    ) {

        shipping.value =
            'LOCAL';

    }

}


/* =========================================================
   VALIDATE PRODUCT SHIPPING
   ========================================================= */

function isValidProductShipping(
    deliveryClass,
    shippingType
) {

    if (
        deliveryClass ===
        'FRESH'
    ) {

        return [
            'LOCAL',
            'PICKUP'
        ].includes(
            shippingType
        );

    }


    if (
        deliveryClass ===
        'DRY'
    ) {

        return [
            'LOCAL',
            'NATIONAL',
            'PICKUP'
        ].includes(
            shippingType
        );

    }


    return false;

}


/* =========================================================
   PRODUCTS RENDER
   ========================================================= */

function renderProducts() {

    const container =
        el('products-grid');


    if (!container) return;


    const search =
        (
            el('product-search')
                ?.value ||
            ''
        )
            .trim()
            .toLowerCase();


    const status =
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
                    status ===
                        'ALL' ||
                    product.status ===
                        status;


                return (
                    searchMatch &&
                    statusMatch
                );

            }
        );


    if (!products.length) {

        container.innerHTML =
            '<div class="empty-state">Tidak ada produk.</div>';

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
                                    : ''
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

                                    <span
                                        class="status-badge"
                                    >
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
                                            product.stock
                                        )}
                                    </strong>
                                </span>

                                <span>
                                    Shipping
                                    <strong>
                                        ${escapeHTML(
                                            product.shipping_type
                                        )}
                                    </strong>
                                </span>

                                <span>
                                    Class
                                    <strong>
                                        ${escapeHTML(
                                            product.delivery_class
                                        )}
                                    </strong>
                                </span>

                            </div>


                            <div class="admin-product-actions">

                                <button
                                    class="btn btn-secondary btn-small"
                                    data-action="edit-product"
                                    data-product-id="${product.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    class="btn btn-secondary btn-small"
                                    data-action="adjust-stock"
                                    data-product-id="${product.id}"
                                >
                                    Stok
                                </button>

                                <button
                                    class="btn btn-danger btn-small"
                                    data-action="delete-product"
                                    data-product-id="${product.id}"
                                >
                                    Hapus
                                </button>

                            </div>

                        </div>

                    </article>

                `
            )
            .join('');

}


/* =========================================================
   PRODUCT MODAL
   ========================================================= */

function openProductModal(
    product = null
) {

    state.currentProduct =
        product;


    const form =
        el('product-form');


    form?.reset();


    setText(
        'product-form-error',
        ''
    );

    hide(
        el(
            'product-form-error'
        )
    );


    el('product-id').value =
        product?.id ||
        '';


    el('product-name').value =
        product?.name ||
        '';


    el('product-price').value =
        product?.price ??
        '';


    el('product-hpp').value =
        product?.hpp ??
        '';


    el('product-stock').value =
        product?.stock ??
        0;


    el('product-status').value =
        product?.status ||
        'READY';


    el('product-shipping').value =
        product?.shipping_type ||
        'LOCAL';


    el(
        'product-delivery-class'
    ).value =
        product?.delivery_class ||
        'DRY';


    el(
        'product-description'
    ).value =
        product?.description ||
        '';


    el('product-image').value =
        product?.image_url ||
        '';


    setText(
        'product-modal-title',
        product
            ? 'Edit Produk'
            : 'Tambah Produk'
    );


    /*
     * Penting:
     * sesudah value delivery + shipping di-set,
     * refresh compatibility UI.
     */

    updateProductShippingOptions();


    show(
        el('product-modal')
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
        el('product-save-button');


    const errorBox =
        el('product-form-error');


    try {

        button.disabled =
            true;


        hide(
            errorBox
        );


        const id =
            el('product-id')
                .value;


        const deliveryClass =
            el(
                'product-delivery-class'
            ).value;


        const shippingType =
            el(
                'product-shipping'
            ).value;


        /*
         * FRONTEND VALIDATION
         * sama dengan database.
         */

        if (
            !isValidProductShipping(
                deliveryClass,
                shippingType
            )
        ) {

            throw new Error(
                'INVALID_PRODUCT_SHIPPING_CONFIGURATION'
            );

        }


        const payload = {

            name:
                el('product-name')
                    .value
                    .trim(),

            price:
                Number(
                    el('product-price')
                        .value
                ),

            hpp:
                Number(
                    el('product-hpp')
                        .value ||
                    0
                ),

            stock:
                Number(
                    el('product-stock')
                        .value ||
                    0
                ),

            status:
                el('product-status')
                    .value,

            shipping_type:
                shippingType,

            delivery_class:
                deliveryClass,

            description:
                el(
                    'product-description'
                )
                    .value
                    .trim() ||
                null,

            image_url:
                el('product-image')
                    .value
                    .trim() ||
                null

        };


        if (!payload.name) {

            throw new Error(
                'Nama produk wajib diisi.'
            );

        }


        if (
            payload.price < 0 ||
            payload.hpp < 0 ||
            payload.stock < 0
        ) {

            throw new Error(
                'Harga, HPP, dan stok tidak boleh negatif.'
            );

        }


        let response;


        if (id) {

            response =
                await supabaseClient
                    .from('products')
                    .update({

                        ...payload,

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        'id',
                        id
                    );


        } else {

            response =
                await supabaseClient
                    .from('products')
                    .insert(
                        payload
                    );

        }


        if (
            response.error
        ) {

            throw response.error;

        }


        closeModal(
            'product-modal'
        );


        await loadProducts();

        renderProducts();

        renderStock();


        showToast(
            id
                ? 'Produk berhasil diperbarui.'
                : 'Produk berhasil ditambahkan.'
        );


    } catch (error) {

        console.error(
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


/* =========================================================
   DELETE PRODUCT
   ========================================================= */

async function deleteProduct(
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


    const confirmed =
        window.confirm(
            `Hapus produk "${product.name}"?`
        );


    if (!confirmed) {

        return;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from('products')
                .delete()
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
            'Produk berhasil dihapus.'
        );


    } catch (error) {

        /*
         * Kalau produk sudah dipakai order,
         * FK mungkin menolak hard delete.
         */

        console.error(
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
        el('stock-table-body');


    if (!tbody) return;


    const total =
        state.products.length;


    const safe =
        state.products.filter(
            p =>
                Number(
                    p.stock
                ) > 3
        ).length;


    const low =
        state.products.filter(
            p => {

                const stock =
                    Number(
                        p.stock
                    );


                return (
                    stock > 0 &&
                    stock <= 3
                );

            }
        ).length;


    const empty =
        state.products.filter(
            p =>
                Number(
                    p.stock
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


    if (!state.products.length) {

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


                    let status =
                        'safe';


                    let label =
                        'Aman';


                    if (
                        stock <= 0
                    ) {

                        status =
                            'empty';

                        label =
                            'Habis';

                    } else if (
                        stock <= 3
                    ) {

                        status =
                            'low';

                        label =
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
                            </td>

                            <td>
                                <span
                                    class="status-badge status-${status}"
                                >
                                    ${label}
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


    el(
        'stock-note'
    ).value =
        '';


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
        el('stock-modal')
    );

}


/* =========================================================
   ADJUST STOCK RPC
   ========================================================= */

async function adjustStock(
    productId,
    newStock,
    note = null
) {

    await requireAdmin();


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


/* =========================================================
   STOCK FORM
   ========================================================= */

async function submitStockForm(
    event
) {

    event.preventDefault();


    const button =
        el('stock-save-button');

    const errorBox =
        el('stock-form-error');


    try {

        button.disabled =
            true;


        const productId =
            el(
                'stock-product-id'
            ).value;


        const stock =
            Number(
                el('new-stock')
                    .value
            );


        const note =
            el('stock-note')
                .value
                .trim() ||
            null;


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


        showToast(
            'Stok berhasil diperbarui.'
        );


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


/* =========================================================
   PRODUCTION RENDER
   ========================================================= */

function renderProduction() {

    const pending =
        state.production.filter(
            row =>
                row.status ===
                'PENDING'
        );


    const active =
        state.production.filter(
            row =>
                row.status ===
                'IN_PROGRESS'
        );


    const completed =
        state.production.filter(
            row =>
                row.status ===
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

        container.innerHTML =
            '<div class="empty-state">Kosong</div>';

        return;

    }


    container.innerHTML =
        rows
            .map(
                row => {

                    const order =
                        state.orders.find(
                            item =>
                                item.id ===
                                row.order_id
                        );


                    return `

                        <article class="production-card">

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        order?.order_number ||
                                        row.order_id
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
                                        row.status
                                    )
                                )}
                            </small>

                            ${
                                row.status ===
                                'PENDING'
                                    ? `
                                        <button
                                            class="btn btn-primary btn-small"
                                            data-action="start-production"
                                            data-order-id="${row.order_id}"
                                        >
                                            Mulai
                                        </button>
                                    `
                                    : ''
                            }

                            ${
                                row.status ===
                                'IN_PROGRESS'
                                    ? `
                                        <button
                                            class="btn btn-primary btn-small"
                                            data-action="complete-production"
                                            data-order-id="${row.order_id}"
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
   PAYMENT RENDER
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
                'UNPAID'
        );


    const now =
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
                now
        );


    const revenue =
        paidToday.reduce(
            (
                sum,
                payment
            ) =>
                sum +
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

        container.innerHTML =
            '<div class="empty-state">Tidak ada pembayaran menunggu.</div>';

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
        el('audit-table-body');


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
                                    '—'
                                )}
                            </code>
                        </td>

                        <td>
                            —
                        </td>

                    </tr>

                `
            )
            .join('');

}


/* =========================================================
   RPC — PAYMENT
   ========================================================= */

async function confirmPayment(
    orderId
) {

    const order =
        state.orders.find(
            row =>
                row.id ===
                orderId
        );


    if (!order) return;


    const amountRaw =
        window.prompt(
            'Jumlah pembayaran:',
            Number(
                order.total ||
                0
            )
        );


    if (
        amountRaw ===
        null
    ) {

        return;

    }


    const amount =
        Number(
            amountRaw
        );


    const paymentMethod =
        window.prompt(
            'Metode: CASH / BANK_TRANSFER / E_WALLET / OTHER',
            'BANK_TRANSFER'
        );


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

}


/* =========================================================
   RPC — PRODUCTION
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
   RPC — ORDER
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
                reason ||
                null

        }
    );


    return true;

}


/* =========================================================
   REFRESH AFTER ACTION
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
        item => {

            item.classList.toggle(
                'active',
                item.dataset.section ===
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
   SECTION LOAD
   ========================================================= */

async function loadSection(
    name
) {

    try {

        switch (name) {

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
        el(id)
    );

}


function closeAllModals() {

    all(
        '.modal'
    ).forEach(
        modal =>
            modal.classList.add(
                'hidden'
            )
    );

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
        el('sidebar-overlay')
    );

}


function closeSidebar() {

    document.body
        .classList
        .remove(
            'sidebar-open'
        );


    hide(
        el('sidebar-overlay')
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
        button.dataset.action;


    const orderId =
        button.dataset.orderId;


    const productId =
        button.dataset.productId;


    try {

        button.disabled =
            true;


        switch (action) {

            case 'view-order':

                await openOrderModal(
                    orderId
                );

                break;


            case 'edit-product': {

                const product =
                    state.products.find(
                        row =>
                            row.id ===
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


            case 'adjust-stock':

                openStockModal(
                    productId
                );

                break;


            case 'confirm-payment':

                await confirmPayment(
                    orderId
                );

                await refreshAdminData();

                closeModal(
                    'order-modal'
                );

                showToast(
                    'Pembayaran dikonfirmasi.'
                );

                break;


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

    /*
     * LOGIN
     */

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


    /*
     * PASSWORD
     */

    el(
        'toggle-password'
    )?.addEventListener(
        'click',
        () => {

            const input =
                el(
                    'admin-password'
                );


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


    /*
     * LOGOUT
     */

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


    /*
     * NAVIGATION
     */

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


    /*
     * PRODUCT
     */

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


    /*
     * SHIPPING VALIDATION
     *
     * INI PATCH UTAMANYA.
     */

    el(
        'product-delivery-class'
    )?.addEventListener(
        'change',
        updateProductShippingOptions
    );


    el(
        'product-shipping'
    )?.addEventListener(
        'change',
        updateProductShippingOptions
    );


    /*
     * STOCK
     */

    el(
        'stock-form'
    )?.addEventListener(
        'submit',
        submitStockForm
    );


    /*
     * SEARCH / FILTER
     */

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


    /*
     * REFRESH
     */

    el(
        'refresh-dashboard'
    )?.addEventListener(
        'click',
        loadDashboard
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


    /*
     * STORE
     */

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


    /*
     * SIDEBAR
     */

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


    /*
     * MODAL CLOSE
     */

    document.addEventListener(
        'click',
        event => {

            if (
                event.target.closest(
                    '[data-close-modal]'
                )
            ) {

                closeAllModals();

            }

        }
    );


    /*
     * ACTION BUTTONS
     */

    document.addEventListener(
        'click',
        handleAction
    );


    /*
     * ESC
     */

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key !==
                'Escape'
            ) {

                return;

            }


            closeAllModals();

            closeSidebar();

        }
    );

}


/* =========================================================
   AUTH CHANGE
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
   INITIALIZE
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


            errorBox.textContent =
                'Akun ini bukan admin aktif.';


            show(
                errorBox
            );


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
   PUBLIC API
   ========================================================= */

window.DapurOziAdmin = {

    state,

    supabase:
        supabaseClient,

    getSession,

    checkAdmin,

    requireAdmin,

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

    updateProductShippingOptions,

    isValidProductShipping,

    confirmPayment,

    startProduction,

    completeProduction,

    markOrderReady,

    markOrderShipped,

    completeOrder,

    cancelOrder,

    adjustStock,

    toggleStoreStatus,

    logout

};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initAdmin
);
