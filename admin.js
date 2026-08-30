/* =========================================================
   DAPUR OZI — ADMIN
   ========================================================= */

const SUPABASE_URL =
    'https://jiilmvdpmxciootnjctt.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_cvVy0jRr6kxTr-tuWPsLqw_27GmIMej';


/* =========================================================
   SUPABASE
   ========================================================= */

const { createClient } = window.supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   STATE
   ========================================================= */

const AdminState = {

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

    settings: null,

    currentOrder: null,

    currentProduct: null

};


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(
    selector,
    parent = document
) {
    return parent.querySelector(selector);
}


function $$(
    selector,
    parent = document
) {
    return [
        ...parent.querySelectorAll(selector)
    ];
}


function getById(id) {

    return document.getElementById(id);

}


function setText(
    id,
    value
) {

    const element =
        getById(id);

    if (!element) return;

    element.textContent =
        value ?? '';

}


function showElement(
    element
) {

    if (!element) return;

    element.classList.remove('hidden');

}


function hideElement(
    element
) {

    if (!element) return;

    element.classList.add('hidden');

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ''
    )
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

}


/* =========================================================
   FORMATTERS
   ========================================================= */

function formatCurrency(value) {

    return new Intl.NumberFormat(
        'id-ID',
        {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }
    ).format(
        Number(value || 0)
    );

}


function formatNumber(value) {

    return new Intl.NumberFormat(
        'id-ID'
    ).format(
        Number(value || 0)
    );

}


function formatDate(value) {

    if (!value) return '—';

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            dateStyle: 'medium',
            timeStyle: 'short'
        }
    ).format(
        new Date(value)
    );

}


function formatShortDate(value) {

    if (!value) return '—';

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }
    ).format(
        new Date(value)
    );

}


/* =========================================================
   DATE HELPERS
   ========================================================= */

function isToday(value) {

    if (!value) return false;

    const date =
        new Date(value);

    const now =
        new Date();

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );

}


function startOfToday() {

    const date =
        new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;

}


/* =========================================================
   BADGE HELPERS
   ========================================================= */

function getOrderStatusLabel(status) {

    const labels = {

        PENDING_PAYMENT:
            'Menunggu Pembayaran',

        PAID:
            'Dibayar',

        PROCESSING:
            'Diproses',

        READY:
            'Siap',

        SHIPPED:
            'Dikirim',

        COMPLETED:
            'Selesai',

        CANCELLED:
            'Dibatalkan'

    };

    return labels[status] || status;

}


function getPaymentStatusLabel(status) {

    const labels = {

        UNPAID:
            'Belum Dibayar',

        PAID:
            'Dibayar',

        FAILED:
            'Gagal',

        REFUNDED:
            'Dikembalikan'

    };

    return labels[status] || status;

}


function getProductionStatusLabel(status) {

    const labels = {

        NOT_REQUIRED:
            'Tidak Diperlukan',

        PENDING:
            'Menunggu',

        IN_PRODUCTION:
            'Sedang Produksi',

        COMPLETED:
            'Selesai'

    };

    return labels[status] || status;

}


function getStockStatusLabel(stock) {

    if (Number(stock) <= 0) {
        return 'Habis';
    }

    if (Number(stock) <= 5) {
        return 'Menipis';
    }

    return 'Aman';

}


function getBadgeClass(status) {

    return String(
        status || ''
    )
        .toLowerCase()
        .replaceAll('_', '-');

}


function statusBadge(
    label,
    status
) {

    return `
        <span class="status-badge ${getBadgeClass(status)}">
            ${escapeHTML(label)}
        </span>
    `;

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
        getById('admin-toast');

    const messageElement =
        getById('admin-toast-message');

    if (!toast || !messageElement) return;

    messageElement.textContent =
        message;

    toast.classList.remove(
        'hidden',
        'success',
        'error',
        'warning'
    );

    toast.classList.add(type);

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(
            () => {

                toast.classList.add('hidden');

            },
            3500
        );

}


/* =========================================================
   ERROR FORMATTER
   ========================================================= */

function getErrorMessage(error) {

    const message =
        error?.message ||
        String(error);

    const map = {

        AUTHENTICATION_REQUIRED:
            'Silakan login terlebih dahulu.',

        ADMIN_ACCESS_REQUIRED:
            'Akun ini tidak memiliki akses admin.',

        INVALID_PAYMENT_METHOD:
            'Metode pembayaran tidak valid.',

        INVALID_QUANTITY:
            'Jumlah harus berupa angka lebih dari 0.',

        INVALID_STOCK:
            'Stok tidak valid.'

    };

    return map[message] || message;

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
            `[Dapur Ozi RPC ERROR] ${functionName}`,
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
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();

    AdminState.user =
        session?.user || null;

    return session;

}


async function checkAdmin() {

    if (!AdminState.user) {

        AdminState.isAdmin =
            false;

        return false;

    }

    try {

        const result =
            await adminRPC(
                'is_admin'
            );

        AdminState.isAdmin =
            Boolean(result);

        return AdminState.isAdmin;

    } catch (error) {

        AdminState.isAdmin =
            false;

        throw error;

    }

}


async function requireAdmin() {

    const session =
        await getSession();

    if (!session) {

        throw new Error(
            'AUTHENTICATION_REQUIRED'
        );

    }

    const isAdmin =
        await checkAdmin();

    if (!isAdmin) {

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

    AdminState.user =
        data.user;

    const isAdmin =
        await checkAdmin();

    if (!isAdmin) {

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

    AdminState.user =
        null;

    AdminState.isAdmin =
        false;

    showLoginScreen();

}


/* =========================================================
   AUTH LISTENER
   ========================================================= */

function listenToAuthChanges() {

    supabaseClient
        .auth
        .onAuthStateChange(
            (
                event,
                session
            ) => {

                AdminState.user =
                    session?.user || null;

                if (!session) {

                    AdminState.isAdmin =
                        false;

                }

            }
        );

}


/* =========================================================
   DATA LOADERS
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
                    ascending: false
                }
            );

    if (error) throw error;

    AdminState.orders =
        data || [];

    return AdminState.orders;

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
            .from('order_items')
            .select('*')
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

    if (error) throw error;

    return data || [];

}


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
                    ascending: true
                }
            );

    if (error) throw error;

    AdminState.products =
        data || [];

    return AdminState.products;

}


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
                    ascending: true
                }
            );

    if (error) throw error;

    AdminState.categories =
        data || [];

    return AdminState.categories;

}


async function loadPayments(
    orderId = null
) {

    await requireAdmin();

    let query =
        supabaseClient
            .from('payments')
            .select('*')
            .order(
                'created_at',
                {
                    ascending: false
                }
            );

    if (orderId) {

        query =
            query.eq(
                'order_id',
                orderId
            );

    }

    const {
        data,
        error
    } =
        await query;

    if (error) throw error;

    AdminState.payments =
        data || [];

    return AdminState.payments;

}


async function loadProduction(
    orderId = null
) {

    await requireAdmin();

    let query =
        supabaseClient
            .from('production')
            .select('*')
            .order(
                'created_at',
                {
                    ascending: false
                }
            );

    if (orderId) {

        query =
            query.eq(
                'order_id',
                orderId
            );

    }

    const {
        data,
        error
    } =
        await query;

    if (error) throw error;

    AdminState.production =
        data || [];

    return AdminState.production;

}


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
                    ascending: false
                }
            );

    if (error) throw error;

    AdminState.stockMovements =
        data || [];

    return AdminState.stockMovements;

}


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
                    ascending: false
                }
            );

    if (error) throw error;

    AdminState.auditLogs =
        data || [];

    return AdminState.auditLogs;

}


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

    if (error) throw error;

    AdminState.settings =
        data;

    return data;

}


/* =========================================================
   DASHBOARD LOADER
   ========================================================= */

async function loadDashboard() {

    await requireAdmin();

    const [
        orders,
        products,
        payments,
        production,
        settings
    ] =
        await Promise.all([
            loadOrders(),
            loadProducts(),
            loadPayments(),
            loadProduction(),
            loadSettings()
        ]);

    return {
        orders,
        products,
        payments,
        production,
        settings
    };

}


/* =========================================================
   STORE STATUS
   ========================================================= */

async function getStoreStatus() {

    await requireAdmin();

    try {

        const data =
            await adminRPC(
                'get_store_status'
            );

        return Array.isArray(data)
            ? data[0] || null
            : data;

    } catch (error) {

        return loadSettings();

    }

}


async function updateStoreStatus(
    storeOpen
) {

    await requireAdmin();

    const {
        data,
        error
    } =
        await supabaseClient
            .from('settings')
            .update({
                store_open:
                    Boolean(storeOpen),

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                'id',
                1
            )
            .select()
            .single();

    if (error) throw error;

    AdminState.settings =
        data;

    return data;

}


/* =========================================================
   PRODUCT CRUD
   ========================================================= */

async function createProduct(
    product
) {

    await requireAdmin();

    const {
        data,
        error
    } =
        await supabaseClient
            .from('products')
            .insert(product)
            .select()
            .single();

    if (error) throw error;

    return data;

}


async function updateProduct(
    productId,
    product
) {

    await requireAdmin();

    const {
        data,
        error
    } =
        await supabaseClient
            .from('products')
            .update({
                ...product,
                updated_at:
                    new Date().toISOString()
            })
            .eq(
                'id',
                productId
            )
            .select()
            .single();

    if (error) throw error;

    return data;

}


async function deleteProduct(
    productId
) {

    await requireAdmin();

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

    if (error) throw error;

}


/* =========================================================
   PAYMENT
   ========================================================= */

async function confirmPayment(
    orderId,
    amount,
    paymentMethod
) {

    await requireAdmin();

    const validMethods = [
        'CASH',
        'BANK_TRANSFER',
        'E_WALLET',
        'OTHER'
    ];

    if (
        !validMethods.includes(
            paymentMethod
        )
    ) {

        throw new Error(
            'INVALID_PAYMENT_METHOD'
        );

    }

    return adminRPC(
        'admin_confirm_payment',
        {

            p_order_id:
                orderId,

            p_amount:
                Number(amount),

            p_payment_method:
                paymentMethod

        }
    );

}


/* =========================================================
   PRODUCTION
   ========================================================= */

async function startProduction(
    orderId
) {

    await requireAdmin();

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

    await requireAdmin();

    return adminRPC(
        'admin_complete_production',
        {
            p_order_id:
                orderId
        }
    );

}


/* =========================================================
   ORDER STATUS
   ========================================================= */

async function markOrderReady(
    orderId
) {

    await requireAdmin();

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

    await requireAdmin();

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

    await requireAdmin();

    return adminRPC(
        'admin_complete_order',
        {
            p_order_id:
                orderId
        }
    );

}


async function cancelOrder(
    orderId,
    reason = null
) {

    await requireAdmin();

    return adminRPC(
        'admin_cancel_order',
        {

            p_order_id:
                orderId,

            p_reason:
                reason

        }
    );

}


/* =========================================================
   STOCK
   ========================================================= */

async function restockProduct(
    productId,
    quantity,
    note = null
) {

    await requireAdmin();

    const qty =
        Number(quantity);

    if (
        !Number.isInteger(qty) ||
        qty <= 0
    ) {

        throw new Error(
            'INVALID_QUANTITY'
        );

    }

    return adminRPC(
        'admin_restock_product',
        {

            p_product_id:
                productId,

            p_quantity:
                qty,

            p_note:
                note

        }
    );

}


async function adjustStock(
    productId,
    newStock,
    note = null
) {

    await requireAdmin();

    const stock =
        Number(newStock);

    if (
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        throw new Error(
            'INVALID_STOCK'
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
                note

        }
    );

}


/* =========================================================
   UI — AUTH
   ========================================================= */

function showLoginScreen() {

    hideElement(
        getById('admin-app')
    );

    showElement(
        getById('admin-login')
    );

}


function showAdminApp() {

    hideElement(
        getById('admin-login')
    );

    showElement(
        getById('admin-app')
    );

}


/* =========================================================
   UI — NAVIGATION
   ========================================================= */

async function switchSection(
    sectionName
) {

    AdminState.activeSection =
        sectionName;

    $$('.admin-nav-item')
        .forEach(
            button => {

                button.classList.toggle(
                    'active',
                    button.dataset.section === sectionName
                );

            }
        );

    $$('.admin-section')
        .forEach(
            section => {

                section.classList.toggle(
                    'active',
                    section.id ===
                        `section-${sectionName}`
                );

            }
        );

    closeSidebar();

    try {

        if (
            sectionName === 'dashboard'
        ) {

            await refreshDashboard();

        }

        if (
            sectionName === 'orders'
        ) {

            await refreshOrders();

        }

        if (
            sectionName === 'products'
        ) {

            await refreshProducts();

        }

        if (
            sectionName === 'production'
        ) {

            await refreshProduction();

        }

        if (
            sectionName === 'stock'
        ) {

            await refreshStock();

        }

        if (
            sectionName === 'payments'
        ) {

            await refreshPayments();

        }

        if (
            sectionName === 'audit'
        ) {

            await refreshAudit();

        }

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            'error'
        );

    }

}


/* =========================================================
   UI — DASHBOARD
   ========================================================= */

function renderDashboard(
    data
) {

    const {
        orders,
        products,
        production,
        settings
    } =
        data;

    const todayOrders =
        orders.filter(
            order =>
                isToday(
                    order.checkout_at ||
                    order.created_at
                )
        );

    const pendingPayment =
        orders.filter(
            order =>
                order.status ===
                'PENDING_PAYMENT'
        );

    const activeProduction =
        production.filter(
            item =>
                item.status ===
                'IN_PRODUCTION'
        );

    const lowStock =
        products.filter(
            product =>
                Number(product.stock) > 0 &&
                Number(product.stock) <= 5
        );

    setText(
        'stat-orders-today',
        formatNumber(
            todayOrders.length
        )
    );

    setText(
        'stat-pending-payment',
        formatNumber(
            pendingPayment.length
        )
    );

    setText(
        'stat-production',
        formatNumber(
            activeProduction.length
        )
    );

    setText(
        'stat-low-stock',
        formatNumber(
            lowStock.length
        )
    );

    renderStoreStatus(settings);

    renderDashboardOrders(
        orders.slice(0, 5)
    );

    renderDashboardLowStock(
        lowStock
    );

    renderOrderNavCount(
        pendingPayment.length
    );

}


function renderStoreStatus(
    settings
) {

    const dot =
        getById('store-status-dot');

    const text =
        getById('store-status-text');

    const detail =
        getById('store-status-detail');

    if (!settings) return;

    const isOpen =
        Boolean(
            settings.store_open
        );

    if (dot) {

        dot.classList.toggle(
            'closed',
            !isOpen
        );

    }

    if (text) {

        text.textContent =
            isOpen
                ? 'Toko Sedang Buka'
                : 'Toko Sedang Tutup';

    }

    if (detail) {

        detail.textContent =
            settings.store_message ||
            (
                isOpen
                    ? 'Dapur Ozi sedang menerima pesanan.'
                    : 'Dapur Ozi sedang tidak menerima pesanan.'
            );

    }

}


function renderDashboardOrders(
    orders
) {

    const container =
        getById(
            'dashboard-orders'
        );

    if (!container) return;

    if (!orders.length) {

        container.innerHTML = `
            <div class="empty-state">
                Belum ada pesanan.
            </div>
        `;

        return;

    }

    container.innerHTML =
        orders.map(
            order => `
                <div class="order-preview-item">
                    <div>
                        <strong>
                            ${escapeHTML(order.order_number)}
                        </strong>

                        <span>
                            ${escapeHTML(order.customer_name)}
                        </span>
                    </div>

                    <div>
                        <strong>
                            ${formatCurrency(order.total)}
                        </strong>

                        ${statusBadge(
                            getOrderStatusLabel(order.status),
                            order.status
                        )}
                    </div>
                </div>
            `
        ).join('');

}


function renderDashboardLowStock(
    products
) {

    const container =
        getById(
            'dashboard-low-stock'
        );

    if (!container) return;

    if (!products.length) {

        container.innerHTML = `
            <div class="empty-state">
                Semua stok dalam kondisi aman.
            </div>
        `;

        return;

    }

    container.innerHTML =
        products.map(
            product => `
                <div class="stock-preview-item">
                    <span>
                        ${escapeHTML(product.name)}
                    </span>

                    <strong>
                        ${formatNumber(product.stock)}
                    </strong>
                </div>
            `
        ).join('');

}


function renderOrderNavCount(
    count
) {

    const badge =
        getById(
            'nav-order-count'
        );

    if (!badge) return;

    badge.textContent =
        count;

    badge.classList.toggle(
        'hidden',
        count <= 0
    );

}


async function refreshDashboard() {

    const data =
        await loadDashboard();

    renderDashboard(data);

}


/* =========================================================
   UI — ORDERS
   ========================================================= */

function getFilteredOrders() {

    const search =
        (
            getById('order-search')
                ?.value ||
            ''
        )
            .trim()
            .toLowerCase();

    const status =
        getById(
            'order-status-filter'
        )?.value || 'ALL';

    return AdminState.orders.filter(
        order => {

            const matchesSearch =
                !search ||
                String(
                    order.order_number ||
                    ''
                )
                    .toLowerCase()
                    .includes(search) ||
                String(
                    order.customer_name ||
                    ''
                )
                    .toLowerCase()
                    .includes(search);

            const matchesStatus =
                status === 'ALL' ||
                order.status === status;

            return (
                matchesSearch &&
                matchesStatus
            );

        }
    );

}


function renderOrders() {

    const body =
        getById(
            'orders-table-body'
        );

    if (!body) return;

    const orders =
        getFilteredOrders();

    if (!orders.length) {

        body.innerHTML = `
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

    body.innerHTML =
        orders.map(
            order => `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(order.order_number)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(order.customer_name)}
                    </td>

                    <td>
                        ${formatCurrency(order.total)}
                    </td>

                    <td>
                        ${statusBadge(
                            getPaymentStatusLabel(
                                order.payment_status
                            ),
                            order.payment_status
                        )}
                    </td>

                    <td>
                        ${statusBadge(
                            getOrderStatusLabel(
                                order.status
                            ),
                            order.status
                        )}
                    </td>

                    <td>
                        ${formatShortDate(
                            order.checkout_at ||
                            order.created_at
                        )}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="btn btn-small"
                            data-order-id="${order.id}"
                            data-action="view-order"
                        >
                            Detail
                        </button>
                    </td>

                </tr>
            `
        ).join('');

}


async function refreshOrders() {

    await loadOrders();

    renderOrders();

    renderOrderNavCount(
        AdminState.orders.filter(
            order =>
                order.status ===
                'PENDING_PAYMENT'
        ).length
    );

}


/* =========================================================
   ORDER MODAL
   ========================================================= */

function openModal(
    id
) {

    const modal =
        getById(id);

    if (!modal) return;

    modal.classList.remove('hidden');

    modal.setAttribute(
        'aria-hidden',
        'false'
    );

}


function closeModal(
    id
) {

    const modal =
        getById(id);

    if (!modal) return;

    modal.classList.add('hidden');

    modal.setAttribute(
        'aria-hidden',
        'true'
    );

}


async function openOrderModal(
    orderId
) {

    const order =
        AdminState.orders.find(
            item =>
                item.id === orderId
        );

    if (!order) return;

    AdminState.currentOrder =
        order;

    const content =
        getById(
            'order-modal-content'
        );

    openModal(
        'order-modal'
    );

    content.innerHTML = `
        <div class="loading-state">
            Memuat detail pesanan...
        </div>
    `;

    try {

        const [
            items,
            payments,
            production
        ] =
            await Promise.all([
                loadOrderItems(orderId),
                loadPayments(orderId),
                loadProduction(orderId)
            ]);

        renderOrderModal(
            order,
            items,
            payments,
            production
        );

    } catch (error) {

        content.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(
                    getErrorMessage(error)
                )}
            </div>
        `;

    }

}


function renderOrderModal(
    order,
    items,
    payments,
    production
) {

    const content =
        getById(
            'order-modal-content'
        );

    if (!content) return;

    const payment =
        payments[0] || null;

    const productionData =
        production[0] || null;

    content.innerHTML = `

        <div class="modal-header">

            <span class="eyebrow">
                ORDER DETAIL
            </span>

            <h2>
                ${escapeHTML(order.order_number)}
            </h2>

            <div class="order-status-row">
                ${statusBadge(
                    getOrderStatusLabel(order.status),
                    order.status
                )}

                ${statusBadge(
                    getPaymentStatusLabel(
                        order.payment_status
                    ),
                    order.payment_status
                )}
            </div>

        </div>


        <div class="order-detail-grid">

            <div class="order-detail-card">

                <h3>
                    Pelanggan
                </h3>

                <p>
                    <strong>
                        ${escapeHTML(order.customer_name)}
                    </strong>
                </p>

                <p>
                    ${escapeHTML(order.customer_phone)}
                </p>

                <p>
                    ${escapeHTML(
                        order.customer_address ||
                        'Alamat tidak tersedia'
                    )}
                </p>

                ${
                    order.customer_note
                        ? `
                            <p>
                                <strong>Catatan:</strong>
                                ${escapeHTML(order.customer_note)}
                            </p>
                        `
                        : ''
                }

            </div>


            <div class="order-detail-card">

                <h3>
                    Ringkasan
                </h3>

                <p>
                    Subtotal:
                    <strong>
                        ${formatCurrency(order.subtotal)}
                    </strong>
                </p>

                <p>
                    Ongkir:
                    <strong>
                        ${formatCurrency(order.shipping_cost)}
                    </strong>
                </p>

                <p>
                    Diskon:
                    <strong>
                        ${formatCurrency(order.discount)}
                    </strong>
                </p>

                <p>
                    Total:
                    <strong>
                        ${formatCurrency(order.total)}
                    </strong>
                </p>

                <p>
                    Metode:
                    <strong>
                        ${escapeHTML(order.shipping_type)}
                    </strong>
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
                                            ${formatNumber(
                                                item.quantity
                                            )}
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


        <div class="order-detail-grid">

            <div class="order-detail-card">

                <h3>
                    Pembayaran
                </h3>

                ${
                    payment
                        ? `
                            <p>
                                Status:
                                <strong>
                                    ${escapeHTML(
                                        getPaymentStatusLabel(
                                            payment.status
                                        )
                                    )}
                                </strong>
                            </p>

                            <p>
                                Metode:
                                <strong>
                                    ${escapeHTML(
                                        payment.payment_method
                                    )}
                                </strong>
                            </p>

                            <p>
                                Nominal:
                                <strong>
                                    ${formatCurrency(
                                        payment.amount
                                    )}
                                </strong>
                            </p>
                        `
                        : `
                            <p>
                                Belum ada data pembayaran.
                            </p>
                        `
                }

            </div>


            <div class="order-detail-card">

                <h3>
                    Produksi
                </h3>

                ${
                    productionData
                        ? `
                            <p>
                                Status:
                                <strong>
                                    ${escapeHTML(
                                        getProductionStatusLabel(
                                            productionData.status
                                        )
                                    )}
                                </strong>
                            </p>

                            <p>
                                Deadline:
                                <strong>
                                    ${formatDate(
                                        productionData.deadline
                                    )}
                                </strong>
                            </p>
                        `
                        : `
                            <p>
                                Produksi tidak diperlukan.
                            </p>
                        `
                }

            </div>

        </div>


        <div class="modal-actions">

            ${getOrderActionButtons(
                order,
                productionData
            )}

        </div>

    `;

}


function getOrderActionButtons(
    order,
    production
) {

    const buttons = [];

    if (
        order.status ===
        'PENDING_PAYMENT'
    ) {

        buttons.push(`
            <button
                type="button"
                class="btn btn-primary"
                data-order-id="${order.id}"
                data-action="confirm-payment"
            >
                Konfirmasi Pembayaran
            </button>
        `);

    }

    if (
        production &&
        production.status === 'PENDING'
    ) {

        buttons.push(`
            <button
                type="button"
                class="btn btn-primary"
                data-order-id="${order.id}"
                data-action="start-production"
            >
                Mulai Produksi
            </button>
        `);

    }

    if (
        production &&
        production.status === 'IN_PRODUCTION'
    ) {

        buttons.push(`
            <button
                type="button"
                class="btn btn-primary"
                data-order-id="${order.id}"
                data-action="complete-production"
            >
                Selesaikan Produksi
            </button>
        `);

    }

    if (
        order.status ===
        'PROCESSING'
    ) {

        buttons.push(`
            <button
                type="button"
                class="btn btn-primary"
                data-order-id="${order.id}"
                data-action="mark-ready"
            >
                Tandai Siap
            </button>
        `);

    }

    if (
        order.status ===
        'READY'
    ) {

        buttons.push(`
            <button
                type="button"
                class="btn btn-primary"
                data-order-id="${order.id}"
                data-action="mark-shipped"
            >
                Tandai Dikirim
            </button>
        `);

    }

    if (
        order.status ===
        'SHIPPED'
    ) {

        buttons.push(`
            <button
                type="button"
                class="btn btn-primary"
                data-order-id="${order.id}"
                data-action="complete-order"
            >
                Selesaikan Pesanan
            </button>
        `);

    }

    if (
        ![
            'COMPLETED',
            'CANCELLED'
        ].includes(order.status)
    ) {

        buttons.push(`
            <button
                type="button"
                class="btn btn-danger"
                data-order-id="${order.id}"
                data-action="cancel-order"
            >
                Batalkan
            </button>
        `);

    }

    return buttons.join('');

}


/* =========================================================
   ORDER ACTION HANDLER
   ========================================================= */

async function handleOrderAction(
    action,
    orderId
) {

    const order =
        AdminState.orders.find(
            item =>
                item.id === orderId
        );

    if (!order) return;

    try {

        if (
            action ===
            'confirm-payment'
        ) {

            const method =
                window.prompt(
                    'Metode pembayaran: CASH, BANK_TRANSFER, E_WALLET, atau OTHER',
                    'BANK_TRANSFER'
                );

            if (!method) return;

            await confirmPayment(
                orderId,
                order.total,
                method
            );

            showToast(
                'Pembayaran berhasil dikonfirmasi.'
            );

        }


        if (
            action ===
            'start-production'
        ) {

            await startProduction(orderId);

            showToast(
                'Produksi berhasil dimulai.'
            );

        }


        if (
            action ===
            'complete-production'
        ) {

            await completeProduction(orderId);

            showToast(
                'Produksi berhasil diselesaikan.'
            );

        }


        if (
            action ===
            'mark-ready'
        ) {

            await markOrderReady(orderId);

            showToast(
                'Pesanan ditandai siap.'
            );

        }


        if (
            action ===
            'mark-shipped'
        ) {

            await markOrderShipped(orderId);

            showToast(
                'Pesanan ditandai dikirim.'
            );

        }


        if (
            action ===
            'complete-order'
        ) {

            await completeOrder(orderId);

            showToast(
                'Pesanan berhasil diselesaikan.'
            );

        }


        if (
            action ===
            'cancel-order'
        ) {

            const reason =
                window.prompt(
                    'Alasan pembatalan:',
                    ''
                );

            if (
                reason === null
            ) {
                return;
            }

            await cancelOrder(
                orderId,
                reason || null
            );

            showToast(
                'Pesanan berhasil dibatalkan.'
            );

        }

        await refreshOrders();

        await refreshProduction();

        await refreshPayments();

        await refreshDashboard();

        closeModal(
            'order-modal'
        );

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(error),
            'error'
        );

    }

}


/* =========================================================
   UI — PRODUCTS
   ========================================================= */

function getFilteredProducts() {

    const search =
        (
            getById('product-search')
                ?.value ||
            ''
        )
            .trim()
            .toLowerCase();

    const status =
        getById(
            'product-status-filter'
        )?.value || 'ALL';

    return AdminState.products.filter(
        product => {

            const matchesSearch =
                !search ||
                product.name
                    .toLowerCase()
                    .includes(search);

            const matchesStatus =
                status === 'ALL' ||
                product.status === status;

            return (
                matchesSearch &&
                matchesStatus
            );

        }
    );

}


function renderProducts() {

    const container =
        getById(
            'products-grid'
        );

    if (!container) return;

    const products =
        getFilteredProducts();

    if (!products.length) {

        container.innerHTML = `
            <div class="empty-state">
                Tidak ada produk.
            </div>
        `;

        return;

    }

    container.innerHTML =
        products.map(
            product => `

                <article class="admin-product-card">

                    <div class="admin-product-image">

                        ${
                            product.image_url
                                ? `
                                    <img
                                        src="${escapeHTML(product.image_url)}"
                                        alt="${escapeHTML(product.name)}"
                                    >
                                `
                                : `
                                    <div class="product-image-placeholder">
                                        🍽
                                    </div>
                                `
                        }

                    </div>


                    <div class="admin-product-content">

                        <div class="admin-product-header">

                            <div>

                                <h3>
                                    ${escapeHTML(product.name)}
                                </h3>

                                <span>
                                    ${escapeHTML(product.status)}
                                </span>

                            </div>

                            <button
                                type="button"
                                class="icon-button"
                                data-product-id="${product.id}"
                                data-action="edit-product"
                                aria-label="Edit produk"
                            >
                                ✎
                            </button>

                        </div>


                        <p class="admin-product-price">
                            ${formatCurrency(product.price)}
                        </p>


                        <div class="admin-product-meta">

                            <span>
                                Stok:
                                <strong>
                                    ${formatNumber(product.stock)}
                                </strong>
                            </span>

                            <span>
                                HPP:
                                ${formatCurrency(product.hpp)}
                            </span>

                        </div>


                        <div class="admin-product-actions">

                            <button
                                type="button"
                                class="btn btn-secondary btn-small"
                                data-product-id="${product.id}"
                                data-action="adjust-stock"
                            >
                                Adjust Stok
                            </button>

                            <button
                                type="button"
                                class="btn btn-danger btn-small"
                                data-product-id="${product.id}"
                                data-action="delete-product"
                            >
                                Hapus
                            </button>

                        </div>

                    </div>

                </article>

            `
        ).join('');

}


async function refreshProducts() {

    await loadProducts();

    renderProducts();

}


/* =========================================================
   PRODUCT MODAL
   ========================================================= */

function resetProductForm() {

    getById(
        'product-form'
    )?.reset();

    setText(
        'product-modal-title',
        'Tambah Produk'
    );

    getById(
        'product-id'
    ).value = '';

    AdminState.currentProduct =
        null;

    hideElement(
        getById(
            'product-form-error'
        )
    );

}


function openCreateProductModal() {

    resetProductForm();

    openModal(
        'product-modal'
    );

}


function openEditProductModal(
    productId
) {

    const product =
        AdminState.products.find(
            item =>
                item.id === productId
        );

    if (!product) return;

    AdminState.currentProduct =
        product;

    setText(
        'product-modal-title',
        'Edit Produk'
    );

    getById(
        'product-id'
    ).value =
        product.id;

    getById(
        'product-name'
    ).value =
        product.name || '';

    getById(
        'product-price'
    ).value =
        product.price ?? 0;

    getById(
        'product-hpp'
    ).value =
        product.hpp ?? 0;

    getById(
        'product-stock'
    ).value =
        product.stock ?? 0;

    getById(
        'product-status'
    ).value =
        product.status || 'READY';

    getById(
        'product-shipping'
    ).value =
        product.shipping_type || 'LOCAL';

    getById(
        'product-delivery-class'
    ).value =
        product.delivery_class || 'DRY';

    getById(
        'product-description'
    ).value =
        product.description || '';

    getById(
        'product-image'
    ).value =
        product.image_url || '';

    hideElement(
        getById(
            'product-form-error'
        )
    );

    openModal(
        'product-modal'
    );

}


async function saveProductForm(
    event
) {

    event.preventDefault();

    const errorElement =
        getById(
            'product-form-error'
        );

    hideElement(errorElement);

    const productId =
        getById(
            'product-id'
        ).value;

    const product = {

        name:
            getById(
                'product-name'
            ).value.trim(),

        price:
            Number(
                getById(
                    'product-price'
                ).value
            ),

        hpp:
            Number(
                getById(
                    'product-hpp'
                ).value
            ),

        stock:
            Number(
                getById(
                    'product-stock'
                ).value
            ),

        status:
            getById(
                'product-status'
            ).value,

        shipping_type:
            getById(
                'product-shipping'
            ).value,

        delivery_class:
            getById(
                'product-delivery-class'
            ).value,

        description:
            getById(
                'product-description'
            ).value.trim() || null,

        image_url:
            getById(
                'product-image'
            ).value.trim() || null

    };

    const button =
        getById(
            'product-save-button'
        );

    try {

        button.disabled = true;

        if (productId) {

            await updateProduct(
                productId,
                product
            );

            showToast(
                'Produk berhasil diperbarui.'
            );

        } else {

            await createProduct(
                product
            );

            showToast(
                'Produk berhasil ditambahkan.'
            );

        }

        closeModal(
            'product-modal'
        );

        await refreshProducts();

        await refreshStock();

        await refreshDashboard();

    } catch (error) {

        errorElement.textContent =
            getErrorMessage(error);

        showElement(errorElement);

    } finally {

        button.disabled = false;

    }

}


/* =========================================================
   UI — PRODUCTION
   ========================================================= */

function renderProduction() {

    const pending =
        AdminState.production.filter(
            item =>
                item.status ===
                'PENDING'
        );

    const active =
        AdminState.production.filter(
            item =>
                item.status ===
                'IN_PRODUCTION'
        );

    const completed =
        AdminState.production.filter(
            item =>
                item.status ===
                'COMPLETED'
        );

    renderProductionColumn(
        'production-pending',
        pending,
        'PENDING'
    );

    renderProductionColumn(
        'production-active',
        active,
        'IN_PRODUCTION'
    );

    renderProductionColumn(
        'production-completed',
        completed,
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

}


function renderProductionColumn(
    id,
    production,
    status
) {

    const container =
        getById(id);

    if (!container) return;

    if (!production.length) {

        container.innerHTML = `
            <div class="empty-state">
                Tidak ada data.
            </div>
        `;

        return;

    }

    container.innerHTML =
        production.map(
            item => {

                const order =
                    AdminState.orders.find(
                        order =>
                            order.id ===
                            item.order_id
                    );

                return `

                    <article class="production-card">

                        <strong>
                            ${
                                escapeHTML(
                                    order?.order_number ||
                                    'Order'
                                )
                            }
                        </strong>

                        <span>
                            ${
                                escapeHTML(
                                    order?.customer_name ||
                                    ''
                                )
                            }
                        </span>

                        <small>
                            Deadline:
                            ${
                                formatShortDate(
                                    item.deadline
                                )
                            }
                        </small>

                        ${
                            status === 'PENDING'
                                ? `
                                    <button
                                        type="button"
                                        class="btn btn-primary btn-small"
                                        data-order-id="${item.order_id}"
                                        data-action="start-production"
                                    >
                                        Mulai
                                    </button>
                                `
                                : ''
                        }

                        ${
                            status === 'IN_PRODUCTION'
                                ? `
                                    <button
                                        type="button"
                                        class="btn btn-primary btn-small"
                                        data-order-id="${item.order_id}"
                                        data-action="complete-production"
                                    >
                                        Selesai
                                    </button>
                                `
                                : ''
                        }

                    </article>

                `;

            }
        ).join('');

}


async function refreshProduction() {

    await Promise.all([
        loadOrders(),
        loadProduction()
    ]);

    renderProduction();

}


/* =========================================================
   UI — STOCK
   ========================================================= */

function renderStock() {

    const body =
        getById(
            'stock-table-body'
        );

    if (!body) return;

    const products =
        AdminState.products;

    const safe =
        products.filter(
            product =>
                Number(product.stock) > 5
        );

    const low =
        products.filter(
            product =>
                Number(product.stock) > 0 &&
                Number(product.stock) <= 5
        );

    const empty =
        products.filter(
            product =>
                Number(product.stock) <= 0
        );

    setText(
        'stock-total-products',
        products.length
    );

    setText(
        'stock-safe-products',
        safe.length
    );

    setText(
        'stock-low-products',
        low.length
    );

    setText(
        'stock-empty-products',
        empty.length
    );

    if (!products.length) {

        body.innerHTML = `
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

    body.innerHTML =
        products.map(
            product => {

                const stockStatus =
                    getStockStatusLabel(
                        product.stock
                    );

                return `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(product.name)}
                            </strong>
                        </td>

                        <td>
                            ${statusBadge(
                                stockStatus,
                                stockStatus
                            )}
                        </td>

                        <td>
                            ${formatNumber(product.stock)}
                        </td>

                        <td>
                            ${formatShortDate(
                                product.updated_at
                            )}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="btn btn-small"
                                data-product-id="${product.id}"
                                data-action="adjust-stock"
                            >
                                Adjust
                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join('');

}


async function refreshStock() {

    await Promise.all([
        loadProducts(),
        loadStockMovements()
    ]);

    renderStock();

}


/* =========================================================
   STOCK MODAL
   ========================================================= */

function openStockModal(
    productId
) {

    const product =
        AdminState.products.find(
            item =>
                item.id === productId
        );

    if (!product) return;

    getById(
        'stock-product-id'
    ).value =
        product.id;

    setText(
        'stock-product-name',
        product.name
    );

    getById(
        'new-stock'
    ).value =
        product.stock;

    getById(
        'stock-note'
    ).value = '';

    hideElement(
        getById(
            'stock-form-error'
        )
    );

    openModal(
        'stock-modal'
    );

}


async function saveStockForm(
    event
) {

    event.preventDefault();

    const errorElement =
        getById(
            'stock-form-error'
        );

    hideElement(errorElement);

    const productId =
        getById(
            'stock-product-id'
        ).value;

    const newStock =
        getById(
            'new-stock'
        ).value;

    const note =
        getById(
            'stock-note'
        ).value.trim() || null;

    const button =
        getById(
            'stock-save-button'
        );

    try {

        button.disabled = true;

        await adjustStock(
            productId,
            newStock,
            note
        );

        closeModal(
            'stock-modal'
        );

        showToast(
            'Stok berhasil diperbarui.'
        );

        await refreshStock();

        await refreshProducts();

        await refreshDashboard();

    } catch (error) {

        errorElement.textContent =
            getErrorMessage(error);

        showElement(errorElement);

    } finally {

        button.disabled = false;

    }

}


/* =========================================================
   UI — PAYMENTS
   ========================================================= */

function renderPayments() {

    const container =
        getById(
            'pending-payments-list'
        );

    if (!container) return;

    const pendingOrders =
        AdminState.orders.filter(
            order =>
                order.status ===
                'PENDING_PAYMENT' ||
                order.payment_status ===
                'UNPAID'
        );

    const paidToday =
        AdminState.payments.filter(
            payment =>
                payment.status === 'PAID' &&
                isToday(
                    payment.paid_at ||
                    payment.updated_at
                )
        );

    const revenueToday =
        paidToday.reduce(
            (
                total,
                payment
            ) =>
                total +
                Number(payment.amount || 0),
            0
        );

    setText(
        'payment-pending-count',
        pendingOrders.length
    );

    setText(
        'payment-confirmed-today',
        paidToday.length
    );

    setText(
        'payment-revenue-today',
        formatCurrency(
            revenueToday
        )
    );

    if (!pendingOrders.length) {

        container.innerHTML = `
            <div class="empty-state">
                Tidak ada pembayaran yang menunggu.
            </div>
        `;

        return;

    }

    container.innerHTML =
        pendingOrders.map(
            order => `

                <article class="payment-item">

                    <div>

                        <strong>
                            ${escapeHTML(order.order_number)}
                        </strong>

                        <span>
                            ${escapeHTML(order.customer_name)}
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${formatCurrency(order.total)}
                        </strong>

                        <button
                            type="button"
                            class="btn btn-primary btn-small"
                            data-order-id="${order.id}"
                            data-action="confirm-payment"
                        >
                            Konfirmasi
                        </button>

                    </div>

                </article>

            `
        ).join('');

}


async function refreshPayments() {

    await Promise.all([
        loadOrders(),
        loadPayments()
    ]);

    renderPayments();

}


/* =========================================================
   UI — AUDIT
   ========================================================= */

function renderAuditLogs() {

    const body =
        getById(
            'audit-table-body'
        );

    if (!body) return;

    const logs =
        AdminState.auditLogs;

    if (!logs.length) {

        body.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        Belum ada audit log.
                    </div>
                </td>
            </tr>
        `;

        return;

    }

    body.innerHTML =
        logs.map(
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
                            log.table_name ||
                            '—'
                        )}
                    </td>

                    <td>
                        ${
                            escapeHTML(
                                log.record_id ||
                                '—'
                            )
                        }
                    </td>

                    <td>
                        Admin
                    </td>

                </tr>

            `
        ).join('');

}


async function refreshAudit() {

    await loadAuditLogs();

    renderAuditLogs();

}


/* =========================================================
   STORE TOGGLE
   ========================================================= */

async function toggleStoreStatus() {

    try {

        const settings =
            AdminState.settings ||
            await loadSettings();

        await updateStoreStatus(
            !settings.store_open
        );

        showToast(
            settings.store_open
                ? 'Toko berhasil ditutup.'
                : 'Toko berhasil dibuka.'
        );

        await refreshDashboard();

    } catch (error) {

        showToast(
            getErrorMessage(error),
            'error'
        );

    }

}


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

function openSidebar() {

    document.body.classList.add(
        'sidebar-open'
    );

    showElement(
        getById(
            'sidebar-overlay'
        )
    );

}


function closeSidebar() {

    document.body.classList.remove(
        'sidebar-open'
    );

    hideElement(
        getById(
            'sidebar-overlay'
        )
    );

}


/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function bindEvents() {

    /* LOGIN */

    getById(
        'admin-login-form'
    )?.addEventListener(
        'submit',
        async event => {

            event.preventDefault();

            const errorElement =
                getById(
                    'admin-login-error'
                );

            const button =
                getById(
                    'admin-login-button'
                );

            hideElement(errorElement);

            try {

                button.disabled = true;

                await login(
                    getById(
                        'admin-email'
                    ).value.trim(),

                    getById(
                        'admin-password'
                    ).value
                );

                showAdminApp();

                await refreshDashboard();

                showToast(
                    'Login berhasil.'
                );

            } catch (error) {

                errorElement.textContent =
                    getErrorMessage(error);

                showElement(errorElement);

            } finally {

                button.disabled = false;

            }

        }
    );


    /* PASSWORD TOGGLE */

    getById(
        'toggle-password'
    )?.addEventListener(
        'click',
        () => {

            const input =
                getById(
                    'admin-password'
                );

            const button =
                getById(
                    'toggle-password'
                );

            const show =
                input.type ===
                'password';

            input.type =
                show
                    ? 'text'
                    : 'password';

            button.textContent =
                show
                    ? 'Hide'
                    : 'Show';

        }
    );


    /* NAVIGATION */

    $$('.admin-nav-item')
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () =>
                        switchSection(
                            button.dataset.section
                        )
                );

            }
        );


    $$('[data-section-target]')
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () =>
                        switchSection(
                            button.dataset.sectionTarget
                        )
                );

            }
        );


    /* REFRESH */

    getById(
        'refresh-dashboard'
    )?.addEventListener(
        'click',
        refreshDashboard
    );

    getById(
        'refresh-orders'
    )?.addEventListener(
        'click',
        refreshOrders
    );

    getById(
        'refresh-production'
    )?.addEventListener(
        'click',
        refreshProduction
    );

    getById(
        'refresh-stock'
    )?.addEventListener(
        'click',
        refreshStock
    );

    getById(
        'refresh-audit'
    )?.addEventListener(
        'click',
        refreshAudit
    );


    /* FILTERS */

    getById(
        'order-search'
    )?.addEventListener(
        'input',
        renderOrders
    );

    getById(
        'order-status-filter'
    )?.addEventListener(
        'change',
        renderOrders
    );

    getById(
        'product-search'
    )?.addEventListener(
        'input',
        renderProducts
    );

    getById(
        'product-status-filter'
    )?.addEventListener(
        'change',
        renderProducts
    );


    /* PRODUCT */

    getById(
        'add-product-button'
    )?.addEventListener(
        'click',
        openCreateProductModal
    );

    getById(
        'product-form'
    )?.addEventListener(
        'submit',
        saveProductForm
    );


    /* STOCK */

    getById(
        'stock-form'
    )?.addEventListener(
        'submit',
        saveStockForm
    );


    /* STORE */

    getById(
        'toggle-store-status'
    )?.addEventListener(
        'click',
        toggleStoreStatus
    );


    /* LOGOUT */

    getById(
        'admin-logout'
    )?.addEventListener(
        'click',
        async () => {

            try {

                await logout();

                showToast(
                    'Anda berhasil keluar.'
                );

            } catch (error) {

                showToast(
                    getErrorMessage(error),
                    'error'
                );

            }

        }
    );


    /* MOBILE */

    getById(
        'mobile-sidebar-open'
    )?.addEventListener(
        'click',
        openSidebar
    );

    getById(
        'mobile-sidebar-close'
    )?.addEventListener(
        'click',
        closeSidebar
    );

    getById(
        'sidebar-overlay'
    )?.addEventListener(
        'click',
        closeSidebar
    );


    /* MODAL CLOSE */

    $$('[data-close-modal]')
        .forEach(
            element => {

                element.addEventListener(
                    'click',
                    () => {

                        const modal =
                            element.closest(
                                '.modal'
                            );

                        if (modal) {

                            closeModal(
                                modal.id
                            );

                        }

                    }
                );

            }
        );


    /* GLOBAL DYNAMIC ACTIONS */

    document.addEventListener(
        'click',
        async event => {

            const button =
                event.target.closest(
                    '[data-action]'
                );

            if (!button) return;

            const action =
                button.dataset.action;

            const orderId =
                button.dataset.orderId;

            const productId =
                button.dataset.productId;


            if (
                action ===
                'view-order'
            ) {

                openOrderModal(orderId);

                return;

            }


            if (
                [
                    'confirm-payment',
                    'start-production',
                    'complete-production',
                    'mark-ready',
                    'mark-shipped',
                    'complete-order',
                    'cancel-order'
                ].includes(action)
            ) {

                await handleOrderAction(
                    action,
                    orderId
                );

                return;

            }


            if (
                action ===
                'edit-product'
            ) {

                openEditProductModal(
                    productId
                );

                return;

            }


            if (
                action ===
                'adjust-stock'
            ) {

                openStockModal(
                    productId
                );

                return;

            }


            if (
                action ===
                'delete-product'
            ) {

                const product =
                    AdminState.products.find(
                        item =>
                            item.id ===
                            productId
                    );

                const confirmed =
                    window.confirm(
                        `Hapus produk "${product?.name || ''}"?`
                    );

                if (!confirmed) return;

                try {

                    await deleteProduct(
                        productId
                    );

                    showToast(
                        'Produk berhasil dihapus.'
                    );

                    await refreshProducts();

                    await refreshStock();

                    await refreshDashboard();

                } catch (error) {

                    showToast(
                        getErrorMessage(error),
                        'error'
                    );

                }

            }

        }
    );

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initDapurOziAdmin() {

    listenToAuthChanges();

    bindEvents();

    setText(
        'dashboard-date',
        new Intl.DateTimeFormat(
            'id-ID',
            {
                dateStyle: 'full'
            }
        ).format(
            new Date()
        )
    );

    try {

        const session =
            await getSession();

        if (!session) {

            showLoginScreen();

            return;

        }

        const isAdmin =
            await checkAdmin();

        if (!isAdmin) {

            await supabaseClient
                .auth
                .signOut();

            showLoginScreen();

            showToast(
                'Akun ini tidak memiliki akses admin.',
                'error'
            );

            return;

        }

        showAdminApp();

        await refreshDashboard();

    } catch (error) {

        console.error(
            'Dapur Ozi Admin initialization failed:',
            error
        );

        showLoginScreen();

        showToast(
            getErrorMessage(error),
            'error'
        );

    }

}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.DapurOziAdmin = {

    state:
        AdminState,

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

    createProduct,

    updateProduct,

    deleteProduct,

    confirmPayment,

    startProduction,

    completeProduction,

    markOrderReady,

    markOrderShipped,

    completeOrder,

    cancelOrder,

    restockProduct,

    adjustStock,

    getStoreStatus,

    updateStoreStatus,

    refreshDashboard,

    refreshOrders,

    refreshProducts,

    refreshProduction,

    refreshStock,

    refreshPayments,

    refreshAudit

};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initDapurOziAdmin
);
