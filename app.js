/* =========================================================
   DAPUR OZI
   CUSTOMER STORE FRONTEND
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
   APP STATE
   ========================================================= */

const DapurOzi = {

    products: [],
    categories: [],
    settings: null,

    cart: [],

    currentOrder: null,

    initialized: false
};


/* =========================================================
   ERROR HELPER
   ========================================================= */

function normalizeError(error) {

    if (!error) {
        return {
            code: 'UNKNOWN_ERROR',
            message: 'Terjadi kesalahan.'
        };
    }

    return {
        code:
            error.code ||
            error.message ||
            'UNKNOWN_ERROR',

        message:
            error.message ||
            'Terjadi kesalahan.',

        details:
            error.details || null,

        hint:
            error.hint || null
    };
}


/* =========================================================
   RPC HELPER
   ========================================================= */

async function callRPC(
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
   STORE STATUS
   ========================================================= */

async function loadStoreStatus() {

    const data =
        await callRPC(
            'get_store_status'
        );

    /*
     * Supabase dapat mengembalikan object
     * atau array tergantung hasil RPC.
     */

    if (Array.isArray(data)) {

        DapurOzi.settings =
            data[0] || null;

    } else {

        DapurOzi.settings =
            data || null;
    }

    return DapurOzi.settings;
}


function isStoreOpen() {

    return Boolean(
        DapurOzi.settings?.store_open
    );
}


function getStoreMessage() {

    return (
        DapurOzi.settings?.store_message ||
        ''
    );
}


function getMaxPreorderDays() {

    return Number(
        DapurOzi.settings?.max_preorder_days || 0
    );
}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function loadProducts() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from('products')
            .select(`
                id,
                name,
                description,
                category_id,
                price,
                hpp,
                stock,
                status,
                shipping_type,
                image_url,
                display_order,
                is_featured,
                created_at,
                updated_at,
                image_path,
                delivery_class
            `)
            .neq(
                'status',
                'NOT_FOR_SALE'
            )
            .order(
                'display_order',
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            '[Dapur Ozi PRODUCTS ERROR]',
            error
        );

        throw error;
    }

    DapurOzi.products =
        data || [];

    return DapurOzi.products;
}


/* =========================================================
   CATEGORIES
   ========================================================= */

async function loadCategories() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from('categories')
            .select(`
                id,
                name,
                is_active
            `)
            .eq(
                'is_active',
                true
            )
            .order(
                'name',
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            '[Dapur Ozi CATEGORIES ERROR]',
            error
        );

        throw error;
    }

    DapurOzi.categories =
        data || [];

    return DapurOzi.categories;
}


/* =========================================================
   PRODUCT HELPERS
   ========================================================= */

function getProduct(productId) {

    return DapurOzi.products.find(
        product =>
            product.id === productId
    ) || null;
}


function isProductAvailable(product) {

    if (!product) {
        return false;
    }

    if (
        product.status ===
        'NOT_FOR_SALE'
    ) {
        return false;
    }

    if (
        product.status ===
        'READY'
        &&
        Number(product.stock) <= 0
    ) {
        return false;
    }

    return true;
}


/* =========================================================
   STOCK STATUS
   ========================================================= */

function getStockStatus(stock) {

    const value =
        Number(stock || 0);

    if (value <= 0) {
        return 'OUT_OF_STOCK';
    }

    if (value <= 3) {
        return 'LOW';
    }

    return 'AVAILABLE';
}


function getStockLabel(stock) {

    const status =
        getStockStatus(stock);

    switch (status) {

        case 'OUT_OF_STOCK':
            return 'Habis';

        case 'LOW':
            return 'Stok terbatas';

        default:
            return 'Tersedia';
    }
}


/* =========================================================
   SHIPPING HELPERS
   ========================================================= */

const SHIPPING_TYPES = [
    'LOCAL',
    'NATIONAL',
    'PICKUP'
];


function isValidShippingType(
    shippingType
) {

    return SHIPPING_TYPES.includes(
        shippingType
    );
}


/* =========================================================
   CART STORAGE
   ========================================================= */

const CART_STORAGE_KEY =
    'dapur_ozi_cart';


function saveCart() {

    localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(
            DapurOzi.cart
        )
    );
}


function loadCart() {

    try {

        const saved =
            localStorage.getItem(
                CART_STORAGE_KEY
            );

        if (!saved) {

            DapurOzi.cart = [];

            return DapurOzi.cart;
        }

        const parsed =
            JSON.parse(saved);

        DapurOzi.cart =
            Array.isArray(parsed)
                ? parsed
                : [];

    } catch (error) {

        console.error(
            '[Dapur Ozi CART LOAD ERROR]',
            error
        );

        DapurOzi.cart = [];
    }

    return DapurOzi.cart;
}


/* =========================================================
   CART
   ========================================================= */

function addToCart(
    productId,
    quantity = 1
) {

    const product =
        getProduct(productId);

    if (!product) {
        throw new Error(
            'PRODUCT_NOT_FOUND'
        );
    }

    if (
        product.status ===
        'NOT_FOR_SALE'
    ) {
        throw new Error(
            'PRODUCT_NOT_FOR_SALE'
        );
    }

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


    const existing =
        DapurOzi.cart.find(
            item =>
                item.product_id ===
                productId
        );


    const currentQuantity =
        existing
            ? Number(existing.quantity)
            : 0;


    const newQuantity =
        currentQuantity + qty;


    if (
        product.status ===
        'READY'
        &&
        newQuantity >
        Number(product.stock)
    ) {

        throw new Error(
            'INSUFFICIENT_STOCK'
        );
    }


    if (existing) {

        existing.quantity =
            newQuantity;

    } else {

        DapurOzi.cart.push({

            product_id:
                product.id,

            product_name:
                product.name,

            price:
                Number(product.price),

            quantity:
                qty
        });
    }


    saveCart();

    return DapurOzi.cart;
}


function removeFromCart(
    productId
) {

    DapurOzi.cart =
        DapurOzi.cart.filter(
            item =>
                item.product_id !==
                productId
        );

    saveCart();

    return DapurOzi.cart;
}


function updateCartQuantity(
    productId,
    quantity
) {

    const item =
        DapurOzi.cart.find(
            item =>
                item.product_id ===
                productId
        );

    if (!item) {
        return DapurOzi.cart;
    }


    const qty =
        Number(quantity);


    if (
        !Number.isInteger(qty)
    ) {

        throw new Error(
            'INVALID_QUANTITY'
        );
    }


    if (qty <= 0) {

        return removeFromCart(
            productId
        );
    }


    const product =
        getProduct(productId);


    if (!product) {

        throw new Error(
            'PRODUCT_NOT_FOUND'
        );
    }


    if (
        product.status ===
        'READY'
        &&
        qty >
        Number(product.stock)
    ) {

        throw new Error(
            'INSUFFICIENT_STOCK'
        );
    }


    item.quantity =
        qty;


    saveCart();

    return DapurOzi.cart;
}


function clearCart() {

    DapurOzi.cart = [];

    saveCart();

    return DapurOzi.cart;
}


/* =========================================================
   CART TOTALS
   ========================================================= */

function getCartItemCount() {

    return DapurOzi.cart.reduce(
        (
            total,
            item
        ) =>
            total +
            Number(item.quantity || 0),
        0
    );
}


function getCartSubtotal() {

    return DapurOzi.cart.reduce(
        (
            total,
            item
        ) =>
            total +
            (
                Number(item.price || 0) *
                Number(item.quantity || 0)
            ),
        0
    );
}


function getCartTotal() {

    return getCartSubtotal();
}


/* =========================================================
   CART VALIDATION
   ========================================================= */

function validateCart() {

    if (
        !DapurOzi.cart.length
    ) {

        throw new Error(
            'CART_EMPTY'
        );
    }


    for (
        const item
        of DapurOzi.cart
    ) {

        const product =
            getProduct(
                item.product_id
            );


        if (!product) {

            throw new Error(
                'PRODUCT_NOT_FOUND'
            );
        }


        if (
            product.status ===
            'NOT_FOR_SALE'
        ) {

            throw new Error(
                `PRODUCT_NOT_FOR_SALE:${product.name}`
            );
        }


        if (
            product.status ===
            'READY'
            &&
            Number(item.quantity) >
            Number(product.stock)
        ) {

            throw new Error(
                `INSUFFICIENT_STOCK:${product.name}`
            );
        }
    }


    return true;
}


/* =========================================================
   CHECKOUT
   ========================================================= */

async function createOrder({

    customerName,

    customerPhone,

    customerAddress,

    customerArea,

    customerNote,

    shippingType

}) {

    if (!isStoreOpen()) {

        throw new Error(
            'STORE_CLOSED'
        );
    }


    validateCart();


    if (
        !customerName ||
        !String(customerName).trim()
    ) {

        throw new Error(
            'CUSTOMER_NAME_REQUIRED'
        );
    }


    if (
        !customerPhone ||
        !String(customerPhone).trim()
    ) {

        throw new Error(
            'CUSTOMER_PHONE_REQUIRED'
        );
    }


    if (
        !isValidShippingType(
            shippingType
        )
    ) {

        throw new Error(
            'INVALID_SHIPPING_TYPE'
        );
    }


    const items =
        DapurOzi.cart.map(
            item => ({

                product_id:
                    item.product_id,

                quantity:
                    Number(item.quantity)

            })
        );


    const orderId =
        await callRPC(
            'create_order',
            {

                p_customer_name:
                    String(
                        customerName
                    ).trim(),

                p_customer_phone:
                    String(
                        customerPhone
                    ).trim(),

                p_customer_address:
                    customerAddress
                        ? String(
                            customerAddress
                        ).trim()
                        : null,

                p_customer_area:
                    customerArea
                        ? String(
                            customerArea
                        ).trim()
                        : null,

                p_customer_note:
                    customerNote
                        ? String(
                            customerNote
                        ).trim()
                        : null,

                p_shipping_type:
                    shippingType,

                p_items:
                    items

            }
        );


    DapurOzi.currentOrder =
        orderId;


    clearCart();


    return orderId;
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initDapurOzi() {

    loadCart();


    try {

        await Promise.all([
            loadStoreStatus(),
            loadProducts(),
            loadCategories()
        ]);


        DapurOzi.initialized =
            true;


        console.log(
            'Dapur Ozi Store initialized.'
        );


        /*
         * Event untuk frontend nanti.
         */

        window.dispatchEvent(
            new CustomEvent(
                'dapur-ozi-ready',
                {
                    detail:
                        DapurOzi
                }
            )
        );


    } catch (error) {

        console.error(
            'Dapur Ozi initialization failed:',
            error
        );


        window.dispatchEvent(
            new CustomEvent(
                'dapur-ozi-error',
                {
                    detail:
                        normalizeError(
                            error
                        )
                }
            )
        );
    }
}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.DapurOzi = {

    state:
        DapurOzi,

    supabase:
        supabaseClient,

    loadStoreStatus,
    loadProducts,
    loadCategories,

    getProduct,

    isStoreOpen,
    getStoreMessage,
    getMaxPreorderDays,

    isProductAvailable,

    getStockStatus,
    getStockLabel,

    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,

    getCartItemCount,
    getCartSubtotal,
    getCartTotal,

    validateCart,

    createOrder
};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initDapurOzi
);