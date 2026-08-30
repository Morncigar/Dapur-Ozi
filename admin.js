/* =========================================================
   DAPUR OZI
   ADMIN FRONTEND
   ========================================================= */

const SUPABASE_URL =
    'https://jiilmvdpmxciootnjctt.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_cvVy0jRr6kxTr-tuWPsLqw_27GmIMej';

const { createClient } = window.supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   ADMIN STATE
   ========================================================= */

const DapurOziAdmin = {

    user: null,

    isAdmin: false,

    orders: [],

    products: [],

    payments: [],

    production: [],

    stockMovements: [],

    auditLogs: []
};


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


    DapurOziAdmin.user =
        session?.user || null;


    return session;
}


/* =========================================================
   ADMIN CHECK
   ========================================================= */

async function checkAdmin() {

    DapurOziAdmin.isAdmin =
        Boolean(
            await adminRPC(
                'is_admin'
            )
        );


    return DapurOziAdmin.isAdmin;
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
   AUTH LISTENER
   ========================================================= */

function listenToAuthChanges() {

    supabaseClient
        .auth
        .onAuthStateChange(
            async (
                event,
                session
            ) => {

                DapurOziAdmin.user =
                    session?.user || null;


                if (!session) {

                    DapurOziAdmin.isAdmin =
                        false;

                    return;
                }


                try {

                    await checkAdmin();

                } catch (error) {

                    console.error(
                        'Admin auth check failed:',
                        error
                    );
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


    DapurOziAdmin.orders =
        data || [];


    return DapurOziAdmin.orders;
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
            );


    if (error) {

        throw error;
    }


    return data || [];
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


    DapurOziAdmin.payments =
        data || [];


    return DapurOziAdmin.payments;
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


    DapurOziAdmin.production =
        data || [];


    return DapurOziAdmin.production;
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


    DapurOziAdmin.products =
        data || [];


    return DapurOziAdmin.products;
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
                'name',
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


    return data;
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
   ADMIN — ORDER STATUS
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


/* =========================================================
   ADMIN — CANCEL
   ========================================================= */

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
   STORE STATUS
   ========================================================= */

async function getStoreStatus() {

    await requireAdmin();


    const data =
        await adminRPC(
            'get_store_status'
        );


    return Array.isArray(data)
        ? data[0] || null
        : data;
}


/* =========================================================
   PRODUCTION STATUS
   ========================================================= */

async function getProductionStatus(
    orderId
) {

    await requireAdmin();


    return adminRPC(
        'get_production_status',
        {
            p_order_id:
                orderId
        }
    );
}


/* =========================================================
   STOCK STATUS
   ========================================================= */

async function getStockStatus(
    stock
) {

    return adminRPC(
        'get_stock_status',
        {
            stock_value:
                Number(stock)
        }
    );
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


    DapurOziAdmin.auditLogs =
        data || [];


    return DapurOziAdmin.auditLogs;
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


    DapurOziAdmin.stockMovements =
        data || [];


    return DapurOziAdmin.stockMovements;
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
        production
    ] =
        await Promise.all([

            loadOrders(),

            loadProducts(),

            loadPayments(),

            loadProduction()

        ]);


    return {

        orders,

        products,

        payments,

        production

    };
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


    DapurOziAdmin.user =
        null;

    DapurOziAdmin.isAdmin =
        false;
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initDapurOziAdmin() {

    listenToAuthChanges();


    try {

        await getSession();


        if (
            !DapurOziAdmin.user
        ) {

            console.log(
                'Dapur Ozi Admin: not logged in.'
            );

            return;
        }


        await checkAdmin();


        if (
            DapurOziAdmin.isAdmin
        ) {

            console.log(
                'Dapur Ozi Admin initialized.'
            );


            window.dispatchEvent(
                new CustomEvent(
                    'dapur-ozi-admin-ready',
                    {
                        detail:
                            DapurOziAdmin
                    }
                )
            );

        } else {

            console.warn(
                'Dapur Ozi Admin: user is not admin.'
            );
        }


    } catch (error) {

        console.error(
            'Dapur Ozi Admin initialization failed:',
            error
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
        DapurOziAdmin,

    supabase:
        supabaseClient,

    getSession,

    checkAdmin,

    requireAdmin,

    loadOrders,

    loadOrderItems,

    loadPayments,

    loadProduction,

    loadProducts,

    loadCategories,

    loadSettings,

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

    getProductionStatus,

    getStockStatus,

    loadAuditLogs,

    loadStockMovements,

    loadDashboard,

    logout
};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initDapurOziAdmin
);