/* =========================================================
   DAPUR OZI
   ADMIN FRONTEND v2
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
   ENUM REFERENCE

   order_status:
   - PENDING_PAYMENT
   - CONFIRMED
   - PREPARING
   - READY_TO_SHIP
   - SHIPPED
   - COMPLETED
   - CANCELLED

   payment_status:
   - UNPAID
   - PAID
   - REFUNDED

   product_status:
   - READY
   - PRE_ORDER
   - NOT_FOR_SALE

   production_status:
   - NOT_REQUIRED
   - PENDING
   - IN_PROGRESS
   - COMPLETED

   shipping_type:
   - LOCAL
   - NATIONAL
   - PICKUP

   product_delivery_class:
   - DRY
   - FRESH

   payment_method:
   - CASH
   - BANK_TRANSFER
   - E_WALLET
   - OTHER
   ========================================================= */


/* =========================================================
   STATE
   ========================================================= */

const AdminState = {

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

function getById(id) {

    return document.getElementById(id);

}


function queryAll(selector) {

    return [
        ...document.querySelectorAll(selector)
    ];

}


function showElement(element) {

    if (!element) return;

    element.classList.remove('hidden');

}


function hideElement(element) {

    if (!element) return;

    element.classList.add('hidden');

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


/* =========================================================
   HTML ESCAPE
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

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            dateStyle: 'medium',
            timeStyle: 'short'
        }
    ).format(date);

}


function formatShortDate(value) {

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

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }
    ).format(date);

}


function isToday(value) {

    if (!value) {
        return false;
    }

    const date =
        new Date(value);

    const now =
        new Date();

    return (
        date.getFullYear() ===
            now.getFullYear() &&
        date.getMonth() ===
            now.getMonth() &&
        date.getDate() ===
            now.getDate()
    );

}


/* =========================================================
   LABEL HELPERS
   ========================================================= */

function getOrderStatusLabel(status) {

    const labels = {

        PENDING_PAYMENT:
            'Menunggu Pembayaran',

        CONFIRMED:
            'Dikonfirmasi',

        PREPARING:
            'Sedang Diproses',

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


function getPaymentStatusLabel(status) {

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


function getProductionStatusLabel(status) {

    const labels = {

        NOT_REQUIRED:
            'Tidak Diperlukan',

        PENDING:
            'Menunggu Produksi',

        IN_PROGRESS:
            'Sedang Produksi',

        COMPLETED:
            'Selesai'

    };

    return (
        labels[status] ||
        status ||
        '—'
    );

}


function getProductStatusLabel(status) {

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


function getShippingLabel(type) {

    const labels = {

        LOCAL:
            'Local',

        NATIONAL:
            'National',

        PICKUP:
            'Pickup'

    };

    return (
        labels[type] ||
        type ||
        '—'
    );

}


function getStockStatus(stock) {

    const value =
        Number(stock || 0);

    if (value <= 0) {

        return {
            label: 'Habis',
            code: 'EMPTY'
        };

    }

    if (value <= 5) {

        return {
            label: 'Menipis',
            code: 'LOW'
        };

    }

    return {
        label: 'Aman',
        code: 'SAFE'
    };

}


/* =========================================================
   BADGES
   ========================================================= */

function normalizeClass(value) {

    return String(
        value || ''
    )
        .toLowerCase()
        .replaceAll(
            '_',
            '-'
        );

}


function statusBadge(
    label,
    status
) {

    return `
        <span
            class="status-badge status-${normalizeClass(status)}"
        >
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
        getById(
            'admin-toast'
        );

    const messageElement =
        getById(
            'admin-toast-message'
        );

    if (
        !toast ||
        !messageElement
    ) {
        return;
    }

    messageElement.textContent =
        message;

    toast.classList.remove(
        'hidden',
        'success',
        'error',
        'warning'
    );

    toast.classList.add(type);

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
            3500
        );

}


/* =========================================================
   ERROR HELPERS
   ========================================================= */

function getErrorMessage(error) {

    const message =
        error?.message ||
        String(error || '');

    const knownErrors = {

        AUTHENTICATION_REQUIRED:
            'Silakan login terlebih dahulu.',

        ADMIN_ACCESS_REQUIRED:
            'Akun ini tidak memiliki akses admin.',

        INVALID_PAYMENT_METHOD:
            'Metode pembayaran tidak valid.',

        INVALID_QUANTITY:
            'Jumlah stok tidak valid.',

        INVALID_STOCK:
            'Nilai stok tidak valid.'

    };

    return (
        knownErrors[message] ||
        message ||
        'Terjadi kesalahan.'
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
            `[Dapur Ozi ADMIN RPC ERROR] ${functionName}`,
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


/* =========================================================
   ADMIN CHECK
   ========================================================= */

async function checkAdmin() {

    if (!AdminState.user) {

        AdminState.isAdmin =
            false;

        return false;

    }

    const result =
        await adminRPC(
            'is_admin'
        );

    AdminState.isAdmin =
        Boolean(result);

    return AdminState.isAdmin;

}


/* =========================================================
   REQUIRE ADMIN
   ========================================================= */

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

    AdminState.user =
        null;

    AdminState.isAdmin =
        false;

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
                    session?.user ||
                    null;

                if (!session) {

                    AdminState.isAdmin =
                        false;

                    showLoginScreen();

                }

            }
        );

}


/* =========================================================
   ORDERS
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

    if (error) {
        throw error;
    }

    AdminState.orders =
        data || [];

    return AdminState.orders;

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
            .from('products')
            .select('*')
            .order(
                'display_order',
                {
                    ascending: true
                }
            );

    if (error) {
        throw error;
    }

    AdminState.products =
        data || [];

    return AdminState.products;

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
                    ascending: true
                }
            );

    if (error) {
        throw error;
    }

    AdminState.categories =
        data || [];

    return AdminState.categories;

}


/* =========================================================
   PAYMENTS
   ========================================================= */

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

    if (error) {
        throw error;
    }

    if (!orderId) {

        AdminState.payments =
            data || [];

    }

    return data || [];

}


/* =========================================================
   PRODUCTION
   ========================================================= */

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

    if (error) {
        throw error;
    }

    if (!orderId) {

        AdminState.production =
            data || [];

    }

    return data || [];

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

    AdminState.settings =
        data;

    return data;

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
                    ascending: false
                }
            );

    if (error) {
        throw error;
    }

    AdminState.stockMovements =
        data || [];

    return AdminState.stockMovements;

}


/* =========================================================
   AUDIT LOGS
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
                    ascending: false
                }
            );

    if (error) {
        throw error;
    }

    AdminState.auditLogs =
        data || [];

    return AdminState.auditLogs;

}


/* =========================================================
   DASHBOARD DATA
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
   ADMIN — PAYMENT
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
   ADMIN — PRODUCTION
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
   ADMIN — ORDER
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
   ADMIN — STOCK
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
   PRODUCT CRUD
   ========================================================= */

async function createProduct(product) {

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

    if (error) {
        throw error;
    }

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
                    new Date()
                        .toISOString()
            })
            .eq(
                'id',
                productId
            )
            .select()
            .single();

    if (error) {
        throw error;
    }

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

    if (error) {
        throw error;
    }

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

        console.warn(
            'get_store_status RPC gagal, fallback ke settings.',
            error
        );

        return loadSettings();

    }

}


async function updateStoreStatus(
    open
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
                    Boolean(open),

                updated_at:
                    new Date()
                        .toISOString()

            })
            .eq(
                'id',
                1
            )
            .select()
            .single();

    if (error) {
        throw error;
    }

    AdminState.settings =
        data;

    return data;

}


/* =========================================================
   UI AUTH
   ========================================================= */

function showLoginScreen() {

    showElement(
        getById(
            'admin-login'
        )
    );

    hideElement(
        getById(
            'admin-app'
        )
    );

}


function showAdminApp() {

    hideElement(
        getById(
            'admin-login'
        )
    );

    showElement(
        getById(
            'admin-app'
        )
    );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

async function switchSection(
    sectionName
) {

    AdminState.activeSection =
        sectionName;

    queryAll(
        '.admin-nav-item'
    ).forEach(
        button => {

            button.classList.toggle(
                'active',
                button.dataset.section ===
                    sectionName
            );

        }
    );


    queryAll(
        '.admin-section'
    ).forEach(
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

        switch (sectionName) {

            case 'dashboard':

                await refreshDashboard();

                break;


            case 'orders':

                await refreshOrders();

                break;


            case 'products':

                await refreshProducts();

                break;


            case 'production':

                await refreshProduction();

                break;


            case 'stock':

                await refreshStock();

                break;


            case 'payments':

                await refreshPayments();

                break;


            case 'audit':

                await refreshAudit();

                break;

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
   DASHBOARD RENDER
   ========================================================= */

function renderDashboard(data) {

    const {

        orders,

        products,

        production,

        settings

    } = data;


    const ordersToday =
        orders.filter(
            order =>
                isToday(
                    order.checkout_at ||
                    order.created_at
                )
        );


    const pendingPayments =
        orders.filter(
            order =>
                order.payment_status ===
                'UNPAID'
        );


    const activeProduction =
        production.filter(
            productionItem =>
                productionItem.status ===
                'IN_PROGRESS'
        );


    const lowStockProducts =
        products.filter(
            product => {

                const stock =
                    Number(
                        product.stock || 0
                    );

                return (
                    stock > 0 &&
                    stock <= 5
                );

            }
        );


    setText(
        'stat-orders-today',
        formatNumber(
            ordersToday.length
        )
    );


    setText(
        'stat-pending-payment',
        formatNumber(
            pendingPayments.length
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
            lowStockProducts.length
        )
    );


    renderStoreStatus(
        settings
    );


    renderDashboardOrders(
        orders.slice(
            0,
            5
        )
    );


    renderDashboardLowStock(
        lowStockProducts
    );


    renderOrderNavCount(
        pendingPayments.length
    );

}


/* =========================================================
   STORE STATUS RENDER
   ========================================================= */

function renderStoreStatus(
    settings
) {

    if (!settings) {
        return;
    }

    const isOpen =
        Boolean(
            settings.store_open
        );

    const dot =
        getById(
            'store-status-dot'
        );


    if (dot) {

        dot.classList.toggle(
            'open',
            isOpen
        );

        dot.classList.toggle(
            'closed',
            !isOpen
        );

    }


    setText(
        'store-status-text',

        isOpen
            ? 'Toko Sedang Buka'
            : 'Toko Sedang Tutup'
    );


    setText(
        'store-status-detail',

        settings.store_message ||

        (
            isOpen
                ? 'Dapur Ozi sedang menerima pesanan.'
                : 'Dapur Ozi sedang tidak menerima pesanan.'
        )
    );


    const button =
        getById(
            'toggle-store-status'
        );

    if (button) {

        button.textContent =
            isOpen
                ? 'Tutup Toko'
                : 'Buka Toko';

    }

}


/* =========================================================
   DASHBOARD ORDER PREVIEW
   ========================================================= */

function renderDashboardOrders(
    orders
) {

    const container =
        getById(
            'dashboard-orders'
        );

    if (!container) {
        return;
    }


    if (!orders.length) {

        container.innerHTML = `
            <div class="empty-state">
                Belum ada pesanan.
            </div>
        `;

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

                            ${statusBadge(
                                getOrderStatusLabel(
                                    order.status
                                ),
                                order.status
                            )}

                        </div>

                    </div>

                `
            )
            .join('');

}


/* =========================================================
   DASHBOARD STOCK PREVIEW
   ========================================================= */

function renderDashboardLowStock(
    products
) {

    const container =
        getById(
            'dashboard-low-stock'
        );

    if (!container) {
        return;
    }


    if (!products.length) {

        container.innerHTML = `
            <div class="empty-state">
                Semua stok aman.
            </div>
        `;

        return;

    }


    container.innerHTML =
        products
            .map(
                product => `

                    <div class="stock-preview-item">

                        <span>
                            ${escapeHTML(
                                product.name
                            )}
                        </span>

                        <strong>
                            ${formatNumber(
                                product.stock
                            )}
                        </strong>

                    </div>

                `
            )
            .join('');

}


/* =========================================================
   NAV ORDER COUNT
   ========================================================= */

function renderOrderNavCount(
    count
) {

    const badge =
        getById(
            'nav-order-count'
        );

    if (!badge) {
        return;
    }

    badge.textContent =
        count;

    badge.classList.toggle(
        'hidden',
        Number(count) <= 0
    );

}


/* =========================================================
   REFRESH DASHBOARD
   ========================================================= */

async function refreshDashboard() {

    const data =
        await loadDashboard();

    renderDashboard(data);

}


/* =========================================================
   ORDER FILTER
   ========================================================= */

function getFilteredOrders() {

    const search =
        (
            getById(
                'order-search'
            )?.value ||
            ''
        )
            .trim()
            .toLowerCase();


    const status =
        getById(
            'order-status-filter'
        )?.value ||
        'ALL';


    return AdminState.orders.filter(
        order => {

            const orderNumber =
                String(
                    order.order_number ||
                    ''
                ).toLowerCase();


            const customerName =
                String(
                    order.customer_name ||
                    ''
                ).toLowerCase();


            const customerPhone =
                String(
                    order.customer_phone ||
                    ''
                ).toLowerCase();


            const matchesSearch =
                !search ||
                orderNumber.includes(
                    search
                ) ||
                customerName.includes(
                    search
                ) ||
                customerPhone.includes(
                    search
                );


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


/* =========================================================
   ORDERS RENDER
   ========================================================= */

function renderOrders() {

    const body =
        getById(
            'orders-table-body'
        );

    if (!body) {
        return;
    }


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
        orders
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

                            <strong>
                                ${escapeHTML(
                                    order.customer_name
                                )}
                            </strong>

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
   REFRESH ORDERS
   ========================================================= */

async function refreshOrders() {

    await loadOrders();

    renderOrders();

    renderOrderNavCount(
        AdminState.orders.filter(
            order =>
                order.payment_status ===
                'UNPAID'
        ).length
    );

}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {

    const modal =
        getById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove(
        'hidden'
    );

    modal.setAttribute(
        'aria-hidden',
        'false'
    );

    document.body.classList.add(
        'modal-open'
    );

}


function closeModal(id) {

    const modal =
        getById(id);

    if (!modal) {
        return;
    }

    modal.classList.add(
        'hidden'
    );

    modal.setAttribute(
        'aria-hidden',
        'true'
    );

    document.body.classList.remove(
        'modal-open'
    );

}


/* =========================================================
   OPEN ORDER DETAIL
   ========================================================= */

async function openOrderModal(
    orderId
) {

    let order =
        AdminState.orders.find(
            item =>
                item.id === orderId
        );


    if (!order) {

        await loadOrders();

        order =
            AdminState.orders.find(
                item =>
                    item.id === orderId
            );

    }


    if (!order) {

        showToast(
            'Pesanan tidak ditemukan.',
            'error'
        );

        return;

    }


    AdminState.currentOrder =
        order;


    const content =
        getById(
            'order-modal-content'
        );


    if (!content) {
        return;
    }


    content.innerHTML = `
        <div class="loading-state">
            Memuat detail pesanan...
        </div>
    `;


    openModal(
        'order-modal'
    );


    try {

        const [
            items,
            payments,
            production
        ] =
            await Promise.all([

                loadOrderItems(
                    orderId
                ),

                loadPayments(
                    orderId
                ),

                loadProduction(
                    orderId
                )

            ]);


        renderOrderModal(
            order,
            items,
            payments,
            production
        );

    } catch (error) {

        console.error(error);

        content.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(
                    getErrorMessage(
                        error
                    )
                )}
            </div>
        `;

    }

}


/* =========================================================
   ORDER DETAIL RENDER
   ========================================================= */

function renderOrderModal(
    order,
    items,
    payments,
    productionRows
) {

    const content =
        getById(
            'order-modal-content'
        );

    if (!content) {
        return;
    }


    const payment =
        payments.find(
            item =>
                item.status ===
                'PAID'
        ) ||
        payments[0] ||
        null;


    const production =
        productionRows[0] ||
        null;


    content.innerHTML = `

        <div class="modal-header">

            <span class="eyebrow">
                ORDER DETAIL
            </span>

            <h2>
                ${escapeHTML(
                    order.order_number
                )}
            </h2>

            <div class="order-status-row">

                ${statusBadge(
                    getOrderStatusLabel(
                        order.status
                    ),
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

                <span class="eyebrow">
                    CUSTOMER
                </span>

                <h3>
                    ${escapeHTML(
                        order.customer_name
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        order.customer_phone
                    )}
                </p>

                ${
                    order.customer_area
                        ? `
                            <p>
                                ${escapeHTML(
                                    order.customer_area
                                )}
                            </p>
                        `
                        : ''
                }

                ${
                    order.customer_address
                        ? `
                            <p>
                                ${escapeHTML(
                                    order.customer_address
                                )}
                            </p>
                        `
                        : ''
                }

                ${
                    order.customer_note
                        ? `
                            <p>
                                <strong>
                                    Catatan:
                                </strong>

                                ${escapeHTML(
                                    order.customer_note
                                )}
                            </p>
                        `
                        : ''
                }

            </div>


            <div class="order-detail-card">

                <span class="eyebrow">
                    ORDER
                </span>

                <p>
                    Pengiriman:
                    <strong>
                        ${escapeHTML(
                            getShippingLabel(
                                order.shipping_type
                            )
                        )}
                    </strong>
                </p>

                <p>
                    Checkout:
                    <strong>
                        ${formatDate(
                            order.checkout_at
                        )}
                    </strong>
                </p>

                <p>
                    Pre-order:
                    <strong>
                        ${
                            order.has_pre_order
                                ? 'Ya'
                                : 'Tidak'
                        }
                    </strong>
                </p>

                ${
                    order.production_deadline
                        ? `
                            <p>
                                Deadline:
                                <strong>
                                    ${formatDate(
                                        order.production_deadline
                                    )}
                                </strong>
                            </p>
                        `
                        : ''
                }

            </div>

        </div>


        <div class="order-items-section">

            <div class="card-header">

                <div>

                    <span class="eyebrow">
                        ITEMS
                    </span>

                    <h3>
                        Item Pesanan
                    </h3>

                </div>

            </div>


            <div class="table-wrapper">

                <table class="admin-table">

                    <thead>

                        <tr>

                            <th>
                                Produk
                            </th>

                            <th>
                                Status
                            </th>

                            <th>
                                Qty
                            </th>

                            <th>
                                Harga
                            </th>

                            <th>
                                Subtotal
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            items.length

                                ? items
                                    .map(
                                        item => `

                                            <tr>

                                                <td>

                                                    <strong>
                                                        ${escapeHTML(
                                                            item.product_name
                                                        )}
                                                    </strong>

                                                </td>

                                                <td>

                                                    ${statusBadge(
                                                        getProductStatusLabel(
                                                            item.product_status
                                                        ),
                                                        item.product_status
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
                                    )
                                    .join('')

                                : `

                                    <tr>

                                        <td colspan="5">

                                            <div class="empty-state">
                                                Item pesanan kosong.
                                            </div>

                                        </td>

                                    </tr>

                                `
                        }

                    </tbody>

                </table>

            </div>

        </div>


        <div class="order-detail-grid">

            <div class="order-detail-card">

                <span class="eyebrow">
                    PAYMENT
                </span>

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
                                        payment.payment_method ||
                                        '—'
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


                            ${
                                payment.paid_at
                                    ? `
                                        <p>
                                            Dibayar:
                                            <strong>
                                                ${formatDate(
                                                    payment.paid_at
                                                )}
                                            </strong>
                                        </p>
                                    `
                                    : ''
                            }

                        `

                        : `

                            <p>
                                Belum ada pembayaran.
                            </p>

                        `
                }

            </div>


            <div class="order-detail-card">

                <span class="eyebrow">
                    PRODUCTION
                </span>

                ${
                    production

                        ? `

                            <p>

                                Status:

                                <strong>
                                    ${escapeHTML(
                                        getProductionStatusLabel(
                                            production.status
                                        )
                                    )}
                                </strong>

                            </p>


                            ${
                                production.deadline
                                    ? `
                                        <p>

                                            Deadline:

                                            <strong>
                                                ${formatDate(
                                                    production.deadline
                                                )}
                                            </strong>

                                        </p>
                                    `
                                    : ''
                            }


                            ${
                                production.started_at
                                    ? `
                                        <p>

                                            Mulai:

                                            <strong>
                                                ${formatDate(
                                                    production.started_at
                                                )}
                                            </strong>

                                        </p>
                                    `
                                    : ''
                            }


                            ${
                                production.completed_at
                                    ? `
                                        <p>

                                            Selesai:

                                            <strong>
                                                ${formatDate(
                                                    production.completed_at
                                                )}
                                            </strong>

                                        </p>
                                    `
                                    : ''
                            }

                        `

                        : `

                            <p>
                                Produksi tidak diperlukan.
                            </p>

                        `
                }

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
                    - ${formatCurrency(
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

            ${getOrderActionButtons(
                order,
                production
            )}

        </div>

    `;

}


/* =========================================================
   ORDER ACTION BUTTONS
   ========================================================= */

function getOrderActionButtons(
    order,
    production
) {

    const buttons = [];


    /* PAYMENT */

    if (
        order.payment_status ===
        'UNPAID' &&
        order.status !==
        'CANCELLED'
    ) {

        buttons.push(`

            <button
                type="button"
                class="btn btn-primary"
                data-action="confirm-payment"
                data-order-id="${order.id}"
            >
                Konfirmasi Pembayaran
            </button>

        `);

    }


    /* PRODUCTION PENDING */

    if (
        production?.status ===
        'PENDING'
    ) {

        buttons.push(`

            <button
                type="button"
                class="btn btn-primary"
                data-action="start-production"
                data-order-id="${order.id}"
            >
                Mulai Produksi
            </button>

        `);

    }


    /* PRODUCTION ACTIVE */

    if (
        production?.status ===
        'IN_PROGRESS'
    ) {

        buttons.push(`

            <button
                type="button"
                class="btn btn-primary"
                data-action="complete-production"
                data-order-id="${order.id}"
            >
                Selesaikan Produksi
            </button>

        `);

    }


    /* ORDER PREPARING */

    if (
        order.status ===
        'PREPARING'
    ) {

        buttons.push(`

            <button
                type="button"
                class="btn btn-primary"
                data-action="mark-ready"
                data-order-id="${order.id}"
            >
                Tandai Siap Dikirim
            </button>

        `);

    }


    /* READY */

    if (
        order.status ===
        'READY_TO_SHIP'
    ) {

        buttons.push(`

            <button
                type="button"
                class="btn btn-primary"
                data-action="mark-shipped"
                data-order-id="${order.id}"
            >
                Tandai Dikirim
            </button>

        `);

    }


    /* SHIPPED */

    if (
        order.status ===
        'SHIPPED'
    ) {

        buttons.push(`

            <button
                type="button"
                class="btn btn-primary"
                data-action="complete-order"
                data-order-id="${order.id}"
            >
                Selesaikan Pesanan
            </button>

        `);

    }


    /* CANCEL */

    if (
        ![
            'COMPLETED',
            'CANCELLED'
        ].includes(
            order.status
        )
    ) {

        buttons.push(`

            <button
                type="button"
                class="btn btn-danger"
                data-action="cancel-order"
                data-order-id="${order.id}"
            >
                Batalkan Pesanan
            </button>

        `);

    }


    return buttons.join('');

}


/* =========================================================
   ORDER ACTION
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

    if (!order) {

        showToast(
            'Pesanan tidak ditemukan.',
            'error'
        );

        return;

    }


    try {

        switch (action) {


            /* -----------------------------------------
               CONFIRM PAYMENT
               ----------------------------------------- */

            case 'confirm-payment': {

                const paymentMethod =
                    window.prompt(
                        'Metode pembayaran: CASH, BANK_TRANSFER, E_WALLET, OTHER',
                        'BANK_TRANSFER'
                    );

                if (!paymentMethod) {
                    return;
                }


                const normalized =
                    paymentMethod
                        .trim()
                        .toUpperCase();


                await confirmPayment(
                    order.id,
                    order.total,
                    normalized
                );


                showToast(
                    'Pembayaran berhasil dikonfirmasi.'
                );

                break;

            }


            /* -----------------------------------------
               START PRODUCTION
               ----------------------------------------- */

            case 'start-production':

                await startProduction(
                    order.id
                );

                showToast(
                    'Produksi dimulai.'
                );

                break;


            /* -----------------------------------------
               COMPLETE PRODUCTION
               ----------------------------------------- */

            case 'complete-production':

                await completeProduction(
                    order.id
                );

                showToast(
                    'Produksi selesai.'
                );

                break;


            /* -----------------------------------------
               READY TO SHIP
               ----------------------------------------- */

            case 'mark-ready':

                await markOrderReady(
                    order.id
                );

                showToast(
                    'Pesanan siap dikirim.'
                );

                break;


            /* -----------------------------------------
               SHIPPED
               ----------------------------------------- */

            case 'mark-shipped':

                await markOrderShipped(
                    order.id
                );

                showToast(
                    'Pesanan ditandai dikirim.'
                );

                break;


            /* -----------------------------------------
               COMPLETED
               ----------------------------------------- */

            case 'complete-order':

                await completeOrder(
                    order.id
                );

                showToast(
                    'Pesanan selesai.'
                );

                break;


            /* -----------------------------------------
               CANCEL
               ----------------------------------------- */

            case 'cancel-order': {

                const reason =
                    window.prompt(
                        'Alasan pembatalan:',
                        ''
                    );

                if (reason === null) {
                    return;
                }


                await cancelOrder(
                    order.id,
                    reason.trim() ||
                    null
                );


                showToast(
                    'Pesanan dibatalkan.',
                    'warning'
                );

                break;

            }

        }


        closeModal(
            'order-modal'
        );


        await Promise.all([

            refreshOrders(),

            refreshDashboard(),

            refreshProduction(),

            refreshPayments()

        ]);

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(
                error
            ),
            'error'
        );

    }

}


/* =========================================================
   PRODUCT FILTER
   ========================================================= */

function getFilteredProducts() {

    const search =
        (
            getById(
                'product-search'
            )?.value ||
            ''
        )
            .trim()
            .toLowerCase();


    const status =
        getById(
            'product-status-filter'
        )?.value ||
        'ALL';


    return AdminState.products.filter(
        product => {

            const matchesSearch =
                !search ||
                String(
                    product.name ||
                    ''
                )
                    .toLowerCase()
                    .includes(
                        search
                    );


            const matchesStatus =
                status ===
                    'ALL' ||
                product.status ===
                    status;


            return (
                matchesSearch &&
                matchesStatus
            );

        }
    );

}


/* =========================================================
   PRODUCTS RENDER
   ========================================================= */

function renderProducts() {

    const container =
        getById(
            'products-grid'
        );

    if (!container) {
        return;
    }


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
        products
            .map(
                product => {

                    const stockStatus =
                        getStockStatus(
                            product.stock
                        );


                    return `

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
                                                DO
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

                                        ${statusBadge(
                                            getProductStatusLabel(
                                                product.status
                                            ),
                                            product.status
                                        )}

                                    </div>


                                    <button
                                        type="button"
                                        class="btn btn-secondary btn-small"
                                        data-action="edit-product"
                                        data-product-id="${product.id}"
                                    >
                                        Edit
                                    </button>

                                </div>


                                <p class="admin-product-price">

                                    ${formatCurrency(
                                        product.price
                                    )}

                                </p>


                                <div class="admin-product-meta">

                                    <span>

                                        HPP

                                        <strong>
                                            ${formatCurrency(
                                                product.hpp
                                            )}
                                        </strong>

                                    </span>


                                    <span>

                                        Stok

                                        <strong>
                                            ${formatNumber(
                                                product.stock
                                            )}
                                        </strong>

                                    </span>


                                    <span>

                                        ${statusBadge(
                                            stockStatus.label,
                                            stockStatus.code
                                        )}

                                    </span>

                                </div>


                                <div class="admin-product-actions">

                                    <button
                                        type="button"
                                        class="btn btn-secondary btn-small"
                                        data-action="adjust-stock"
                                        data-product-id="${product.id}"
                                    >
                                        Adjust Stok
                                    </button>


                                    <button
                                        type="button"
                                        class="btn btn-danger btn-small"
                                        data-action="delete-product"
                                        data-product-id="${product.id}"
                                    >
                                        Hapus
                                    </button>

                                </div>

                            </div>

                        </article>

                    `;

                }
            )
            .join('');

}


/* =========================================================
   REFRESH PRODUCTS
   ========================================================= */

async function refreshProducts() {

    await loadProducts();

    renderProducts();

}


/* =========================================================
   PRODUCT FORM RESET
   ========================================================= */

function resetProductForm() {

    const form =
        getById(
            'product-form'
        );

    if (form) {

        form.reset();

    }


    AdminState.currentProduct =
        null;


    setText(
        'product-modal-title',
        'Tambah Produk'
    );


    const productId =
        getById(
            'product-id'
        );

    if (productId) {

        productId.value =
            '';

    }


    const stock =
        getById(
            'product-stock'
        );

    if (stock) {

        stock.value =
            0;

    }


    hideElement(
        getById(
            'product-form-error'
        )
    );

}


/* =========================================================
   OPEN CREATE PRODUCT
   ========================================================= */

function openCreateProductModal() {

    resetProductForm();

    openModal(
        'product-modal'
    );

}


/* =========================================================
   OPEN EDIT PRODUCT
   ========================================================= */

function openEditProductModal(
    productId
) {

    const product =
        AdminState.products.find(
            item =>
                item.id ===
                productId
        );


    if (!product) {

        showToast(
            'Produk tidak ditemukan.',
            'error'
        );

        return;

    }


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
        product.name ||
        '';


    getById(
        'product-price'
    ).value =
        Number(
            product.price ||
            0
        );


    getById(
        'product-hpp'
    ).value =
        Number(
            product.hpp ||
            0
        );


    getById(
        'product-stock'
    ).value =
        Number(
            product.stock ||
            0
        );


    getById(
        'product-status'
    ).value =
        product.status ||
        'READY';


    getById(
        'product-shipping'
    ).value =
        product.shipping_type ||
        'LOCAL';


    getById(
        'product-delivery-class'
    ).value =
        product.delivery_class ||
        'DRY';


    getById(
        'product-description'
    ).value =
        product.description ||
        '';


    getById(
        'product-image'
    ).value =
        product.image_url ||
        '';


    hideElement(
        getById(
            'product-form-error'
        )
    );


    openModal(
        'product-modal'
    );

}


/* =========================================================
   SAVE PRODUCT FORM
   ========================================================= */

async function saveProductForm(
    event
) {

    event.preventDefault();


    const errorElement =
        getById(
            'product-form-error'
        );


    hideElement(
        errorElement
    );


    const productId =
        getById(
            'product-id'
        ).value;


    const name =
        getById(
            'product-name'
        ).value
            .trim();


    const price =
        Number(
            getById(
                'product-price'
            ).value
        );


    const hpp =
        Number(
            getById(
                'product-hpp'
            ).value
        );


    const stock =
        Number(
            getById(
                'product-stock'
            ).value
        );


    const status =
        getById(
            'product-status'
        ).value;


    const shippingType =
        getById(
            'product-shipping'
        ).value;


    const deliveryClass =
        getById(
            'product-delivery-class'
        ).value;


    const description =
        getById(
            'product-description'
        ).value
            .trim() ||
        null;


    const imageUrl =
        getById(
            'product-image'
        ).value
            .trim() ||
        null;


    if (!name) {

        errorElement.textContent =
            'Nama produk wajib diisi.';

        showElement(
            errorElement
        );

        return;

    }


    if (
        price < 0 ||
        hpp < 0 ||
        stock < 0
    ) {

        errorElement.textContent =
            'Harga, HPP, dan stok tidak boleh negatif.';

        showElement(
            errorElement
        );

        return;

    }


    const productData = {

        name,

        description,

        price,

        hpp,

        stock,

        status,

        shipping_type:
            shippingType,

        delivery_class:
            deliveryClass,

        image_url:
            imageUrl

    };


    const button =
        getById(
            'product-save-button'
        );


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                'Menyimpan...';

        }


        if (productId) {

            await updateProduct(
                productId,
                productData
            );


            showToast(
                'Produk berhasil diperbarui.'
            );

        } else {

            await createProduct(
                productData
            );


            showToast(
                'Produk berhasil ditambahkan.'
            );

        }


        closeModal(
            'product-modal'
        );


        await Promise.all([

            refreshProducts(),

            refreshStock(),

            refreshDashboard()

        ]);

    } catch (error) {

        console.error(error);


        errorElement.textContent =
            getErrorMessage(
                error
            );


        showElement(
            errorElement
        );

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
   PRODUCTION
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
                'IN_PROGRESS'
        );


    const completed =
        AdminState.production.filter(
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


/* =========================================================
   PRODUCTION COLUMN
   ========================================================= */

function renderProductionColumn(
    containerId,
    rows
) {

    const container =
        getById(
            containerId
        );

    if (!container) {
        return;
    }


    if (!rows.length) {

        container.innerHTML = `
            <div class="empty-state">
                Tidak ada data.
            </div>
        `;

        return;

    }


    container.innerHTML =
        rows
            .map(
                production => {

                    const order =
                        AdminState.orders.find(
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
                                        'Order'
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        order?.customer_name ||
                                        ''
                                    )}
                                </span>

                            </div>


                            ${statusBadge(
                                getProductionStatusLabel(
                                    production.status
                                ),
                                production.status
                            )}


                            ${
                                production.deadline

                                    ? `
                                        <small>
                                            Deadline:
                                            ${formatShortDate(
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
                                            Mulai Produksi
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
                                            Selesai
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
   REFRESH PRODUCTION
   ========================================================= */

async function refreshProduction() {

    await Promise.all([

        loadOrders(),

        loadProduction()

    ]);


    renderProduction();

}


/* =========================================================
   STOCK
   ========================================================= */

function renderStock() {

    const body =
        getById(
            'stock-table-body'
        );

    if (!body) {
        return;
    }


    const products =
        AdminState.products;


    const safe =
        products.filter(
            product =>
                Number(
                    product.stock
                ) > 5
        );


    const low =
        products.filter(
            product => {

                const stock =
                    Number(
                        product.stock
                    );

                return (
                    stock > 0 &&
                    stock <= 5
                );

            }
        );


    const empty =
        products.filter(
            product =>
                Number(
                    product.stock
                ) <= 0
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
        products
            .map(
                product => {

                    const stockStatus =
                        getStockStatus(
                            product.stock
                        );


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

                                ${statusBadge(
                                    stockStatus.label,
                                    stockStatus.code
                                )}

                            </td>


                            <td>

                                ${formatNumber(
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

                    `;

                }
            )
            .join('');

}


/* =========================================================
   REFRESH STOCK
   ========================================================= */

async function refreshStock() {

    await Promise.all([

        loadProducts(),

        loadStockMovements()

    ]);


    renderStock();

}


/* =========================================================
   OPEN STOCK MODAL
   ========================================================= */

function openStockModal(
    productId
) {

    const product =
        AdminState.products.find(
            item =>
                item.id ===
                productId
        );


    if (!product) {

        showToast(
            'Produk tidak ditemukan.',
            'error'
        );

        return;

    }


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
        Number(
            product.stock ||
            0
        );


    getById(
        'stock-note'
    ).value =
        '';


    hideElement(
        getById(
            'stock-form-error'
        )
    );


    openModal(
        'stock-modal'
    );

}


/* =========================================================
   SAVE STOCK
   ========================================================= */

async function saveStockForm(
    event
) {

    event.preventDefault();


    const errorElement =
        getById(
            'stock-form-error'
        );


    hideElement(
        errorElement
    );


    const productId =
        getById(
            'stock-product-id'
        ).value;


    const newStock =
        Number(
            getById(
                'new-stock'
            ).value
        );


    const note =
        getById(
            'stock-note'
        ).value
            .trim() ||
        null;


    const button =
        getById(
            'stock-save-button'
        );


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                'Menyimpan...';

        }


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


        await Promise.all([

            refreshStock(),

            refreshProducts(),

            refreshDashboard()

        ]);

    } catch (error) {

        console.error(error);


        errorElement.textContent =
            getErrorMessage(
                error
            );


        showElement(
            errorElement
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                'Update Stok';

        }

    }

}


/* =========================================================
   PAYMENTS
   ========================================================= */

function renderPayments() {

    const container =
        getById(
            'pending-payments-list'
        );

    if (!container) {
        return;
    }


    const pendingOrders =
        AdminState.orders.filter(
            order =>
                order.payment_status ===
                'UNPAID' &&
                order.status !==
                'CANCELLED'
        );


    const paymentsToday =
        AdminState.payments.filter(
            payment =>
                payment.status ===
                'PAID' &&
                isToday(
                    payment.paid_at ||
                    payment.updated_at ||
                    payment.created_at
                )
        );


    const revenueToday =
        paymentsToday.reduce(
            (
                total,
                payment
            ) => {

                return (
                    total +
                    Number(
                        payment.amount ||
                        0
                    )
                );

            },
            0
        );


    setText(
        'payment-pending-count',
        pendingOrders.length
    );


    setText(
        'payment-confirmed-today',
        paymentsToday.length
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
        pendingOrders
            .map(
                order => `

                    <article class="payment-item">

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

                    </article>

                `
            )
            .join('');

}


/* =========================================================
   REFRESH PAYMENTS
   ========================================================= */

async function refreshPayments() {

    await Promise.all([

        loadOrders(),

        loadPayments()

    ]);


    renderPayments();

}


/* =========================================================
   AUDIT
   ========================================================= */

function renderAuditLogs() {

    const body =
        getById(
            'audit-table-body'
        );

    if (!body) {
        return;
    }


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
        logs
            .map(
                log => `

                    <tr>

                        <td>

                            ${formatDate(
                                log.created_at
                            )}

                        </td>


                        <td>

                            <strong>
                                ${escapeHTML(
                                    log.action
                                )}
                            </strong>

                        </td>


                        <td>

                            ${escapeHTML(
                                log.table_name ||
                                '—'
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
                            Admin
                        </td>

                    </tr>

                `
            )
            .join('');

}


/* =========================================================
   REFRESH AUDIT
   ========================================================= */

async function refreshAudit() {

    await loadAuditLogs();

    renderAuditLogs();

}


/* =========================================================
   TOGGLE STORE
   ========================================================= */

async function toggleStoreStatus() {

    try {

        const settings =
            AdminState.settings ||
            await loadSettings();


        const currentlyOpen =
            Boolean(
                settings.store_open
            );


        await updateStoreStatus(
            !currentlyOpen
        );


        showToast(

            currentlyOpen
                ? 'Toko berhasil ditutup.'
                : 'Toko berhasil dibuka.'

        );


        await refreshDashboard();

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(
                error
            ),
            'error'
        );

    }

}


/* =========================================================
   DELETE PRODUCT
   ========================================================= */

async function handleDeleteProduct(
    productId
) {

    const product =
        AdminState.products.find(
            item =>
                item.id ===
                productId
        );


    if (!product) {

        showToast(
            'Produk tidak ditemukan.',
            'error'
        );

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

        await deleteProduct(
            product.id
        );


        showToast(
            'Produk berhasil dihapus.'
        );


        await Promise.all([

            refreshProducts(),

            refreshStock(),

            refreshDashboard()

        ]);

    } catch (error) {

        console.error(error);

        showToast(
            getErrorMessage(
                error
            ),
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
   LOGIN FORM
   ========================================================= */

async function handleLoginForm(
    event
) {

    event.preventDefault();


    const email =
        getById(
            'admin-email'
        ).value
            .trim();


    const password =
        getById(
            'admin-password'
        ).value;


    const button =
        getById(
            'admin-login-button'
        );


    const errorElement =
        getById(
            'admin-login-error'
        );


    hideElement(
        errorElement
    );


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                'Masuk...';

        }


        await login(
            email,
            password
        );


        showAdminApp();


        await refreshDashboard();


        showToast(
            'Login berhasil.'
        );

    } catch (error) {

        console.error(error);


        errorElement.textContent =
            getErrorMessage(
                error
            );


        showElement(
            errorElement
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                'Masuk ke Dashboard';

        }

    }

}


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

function togglePassword() {

    const input =
        getById(
            'admin-password'
        );


    const button =
        getById(
            'toggle-password'
        );


    if (
        !input ||
        !button
    ) {
        return;
    }


    const hidden =
        input.type ===
        'password';


    input.type =
        hidden
            ? 'text'
            : 'password';


    button.textContent =
        hidden
            ? 'Hide'
            : 'Show';


    button.setAttribute(
        'aria-label',

        hidden
            ? 'Sembunyikan password'
            : 'Tampilkan password'
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
        handleLoginForm
    );


    getById(
        'toggle-password'
    )?.addEventListener(
        'click',
        togglePassword
    );


    /* LOGOUT */

    getById(
        'admin-logout'
    )?.addEventListener(
        'click',
        async () => {

            try {

                await logout();

                showLoginScreen();

                showToast(
                    'Berhasil keluar.'
                );

            } catch (error) {

                showToast(
                    getErrorMessage(
                        error
                    ),
                    'error'
                );

            }

        }
    );


    /* SIDEBAR NAV */

    queryAll(
        '.admin-nav-item'
    ).forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    switchSection(
                        button.dataset.section
                    );

                }
            );

        }
    );


    /* SECTION TARGET */

    queryAll(
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


    /* STORE */

    getById(
        'toggle-store-status'
    )?.addEventListener(
        'click',
        toggleStoreStatus
    );


    /* ORDER FILTER */

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


    /* PRODUCT FILTER */

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


    /* PRODUCT FORM */

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


    /* STOCK FORM */

    getById(
        'stock-form'
    )?.addEventListener(
        'submit',
        saveStockForm
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

    queryAll(
        '[data-close-modal]'
    ).forEach(
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


    /* ESC CLOSE */

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key !==
                'Escape'
            ) {
                return;
            }


            queryAll(
                '.modal:not(.hidden)'
            ).forEach(
                modal => {

                    closeModal(
                        modal.id
                    );

                }
            );


            closeSidebar();

        }
    );


    /* DYNAMIC ACTIONS */

    document.addEventListener(
        'click',
        async event => {

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


            /* ORDER DETAIL */

            if (
                action ===
                'view-order'
            ) {

                await openOrderModal(
                    orderId
                );

                return;

            }


            /* ORDER ACTIONS */

            if (
                [
                    'confirm-payment',
                    'start-production',
                    'complete-production',
                    'mark-ready',
                    'mark-shipped',
                    'complete-order',
                    'cancel-order'
                ].includes(
                    action
                )
            ) {

                await handleOrderAction(
                    action,
                    orderId
                );

                return;

            }


            /* PRODUCT EDIT */

            if (
                action ===
                'edit-product'
            ) {

                openEditProductModal(
                    productId
                );

                return;

            }


            /* STOCK */

            if (
                action ===
                'adjust-stock'
            ) {

                openStockModal(
                    productId
                );

                return;

            }


            /* PRODUCT DELETE */

            if (
                action ===
                'delete-product'
            ) {

                await handleDeleteProduct(
                    productId
                );

            }

        }
    );

}


/* =========================================================
   DASHBOARD DATE
   ========================================================= */

function renderDashboardDate() {

    const element =
        getById(
            'dashboard-date'
        );

    if (!element) {
        return;
    }


    element.textContent =
        new Intl.DateTimeFormat(
            'id-ID',
            {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }
        ).format(
            new Date()
        );

}


/* =========================================================
   GREETING
   ========================================================= */

function renderGreeting() {

    const title =
        document.querySelector(
            '#section-dashboard .section-header h1'
        );


    if (!title) {
        return;
    }


    const hour =
        new Date()
            .getHours();


    let greeting =
        'Good evening.';


    if (hour < 11) {

        greeting =
            'Good morning.';

    } else if (
        hour < 15
    ) {

        greeting =
            'Good afternoon.';

    }


    title.textContent =
        greeting;

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initDapurOziAdmin() {

    listenToAuthChanges();

    bindEvents();

    renderDashboardDate();

    renderGreeting();


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


        console.log(
            'Dapur Ozi Admin initialized.'
        );


        window.dispatchEvent(
            new CustomEvent(
                'dapur-ozi-admin-ready',
                {
                    detail:
                        AdminState
                }
            )
        );

    } catch (error) {

        console.error(
            'Dapur Ozi Admin initialization failed:',
            error
        );


        showLoginScreen();


        showToast(
            getErrorMessage(
                error
            ),
            'error'
        );


        window.dispatchEvent(
            new CustomEvent(
                'dapur-ozi-admin-error',
                {
                    detail:
                        error
                }
            )
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

    /* AUTH */

    getSession,

    checkAdmin,

    requireAdmin,

    login,

    logout,


    /* LOADERS */

    loadOrders,

    loadOrderItems,

    loadProducts,

    loadCategories,

    loadPayments,

    loadProduction,

    loadSettings,

    loadAuditLogs,

    loadStockMovements,

    loadDashboard,


    /* PRODUCTS */

    createProduct,

    updateProduct,

    deleteProduct,


    /* PAYMENT */

    confirmPayment,


    /* PRODUCTION */

    startProduction,

    completeProduction,


    /* ORDERS */

    markOrderReady,

    markOrderShipped,

    completeOrder,

    cancelOrder,


    /* STOCK */

    restockProduct,

    adjustStock,


    /* STORE */

    getStoreStatus,

    updateStoreStatus,


    /* UI */

    refreshDashboard,

    refreshOrders,

    refreshProducts,

    refreshProduction,

    refreshStock,

    refreshPayments,

    refreshAudit,

    switchSection

};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initDapurOziAdmin
);
