/* =========================================================
   DAPUR OZI
   CUSTOMER STOREFRONT v2
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

   product_status:
   - READY
   - PRE_ORDER
   - NOT_FOR_SALE

   shipping_type:
   - LOCAL
   - NATIONAL
   - PICKUP

   product_delivery_class:
   - DRY
   - FRESH

   order_status:
   - PENDING_PAYMENT
   - CONFIRMED
   - PREPARING
   - READY_TO_SHIP
   - SHIPPED
   - COMPLETED
   - CANCELLED
   ========================================================= */


/* =========================================================
   APP STATE
   ========================================================= */

const DapurOziState = {

    products: [],

    categories: [],

    settings: null,

    cart: [],

    currentOrder: null,

    initialized: false

};


/* =========================================================
   CONSTANTS
   ========================================================= */

const CART_STORAGE_KEY =
    'dapur_ozi_cart';


const SHIPPING_TYPES = [
    'LOCAL',
    'NATIONAL',
    'PICKUP'
];


/* =========================================================
   ERROR HELPERS
   ========================================================= */

function normalizeError(error) {

    if (!error) {

        return {

            code:
                'UNKNOWN_ERROR',

            message:
                'Terjadi kesalahan.',

            details:
                null,

            hint:
                null

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
            error.details ||
            null,

        hint:
            error.hint ||
            null

    };

}


function getFriendlyErrorMessage(error) {

    const normalized =
        normalizeError(error);


    const rawCode =
        String(
            normalized.code ||
            ''
        );


    const rawMessage =
        String(
            normalized.message ||
            ''
        );


    const code =
        rawCode.split(':')[0];


    const detail =
        rawCode.includes(':')
            ? rawCode
                .split(':')
                .slice(1)
                .join(':')
            : '';


    const messages = {

        STORE_CLOSED:
            'Dapur Ozi sedang tutup.',

        CART_EMPTY:
            'Keranjang masih kosong.',

        PRODUCT_NOT_FOUND:
            'Produk tidak ditemukan.',

        PRODUCT_NOT_FOR_SALE:
            'Produk sedang tidak dijual.',

        INVALID_QUANTITY:
            'Jumlah produk tidak valid.',

        INSUFFICIENT_STOCK:
            'Stok produk tidak mencukupi.',

        CUSTOMER_NAME_REQUIRED:
            'Nama pelanggan wajib diisi.',

        CUSTOMER_PHONE_REQUIRED:
            'Nomor WhatsApp wajib diisi.',

        INVALID_SHIPPING_TYPE:
            'Metode pengiriman tidak valid.'

    };


    if (messages[code]) {

        return detail
            ? `${messages[code]} (${detail})`
            : messages[code];

    }


    /*
     * Beberapa error custom database mungkin
     * datang lewat message, bukan code.
     */

    for (
        const [
            errorCode,
            message
        ]
        of Object.entries(messages)
    ) {

        if (
            rawMessage.includes(
                errorCode
            )
        ) {

            return message;

        }

    }


    return (
        rawMessage ||
        'Terjadi kesalahan. Silakan coba lagi.'
    );

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
     * get_store_status dapat dikembalikan
     * sebagai object atau array.
     */

    if (
        Array.isArray(data)
    ) {

        DapurOziState.settings =
            data[0] ||
            null;

    } else {

        DapurOziState.settings =
            data ||
            null;

    }


    return DapurOziState.settings;

}


function isStoreOpen() {

    return Boolean(
        DapurOziState
            .settings
            ?.store_open
    );

}


function getStoreMessage() {

    return (
        DapurOziState
            .settings
            ?.store_message ||
        ''
    );

}


function getMaxPreorderDays() {

    return Number(
        DapurOziState
            .settings
            ?.max_preorder_days ||
        0
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
                stock,
                status,
                shipping_type,
                image_url,
                display_order,
                is_featured,
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


    DapurOziState.products =
        data ||
        [];


    /*
     * Cart dapat berisi data lama dari localStorage.
     * Sinkronkan setelah produk terbaru diterima.
     */

    syncCartWithProducts();


    return DapurOziState.products;

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
                description,
                display_order,
                is_active
            `)
            .eq(
                'is_active',
                true
            )
            .order(
                'display_order',
                {
                    ascending: true
                }
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


    DapurOziState.categories =
        data ||
        [];


    return DapurOziState.categories;

}


/* =========================================================
   PRODUCT HELPERS
   ========================================================= */

function getProduct(productId) {

    return (
        DapurOziState.products.find(
            product =>
                product.id ===
                productId
        ) ||
        null
    );

}


function getCategory(categoryId) {

    return (
        DapurOziState.categories.find(
            category =>
                category.id ===
                categoryId
        ) ||
        null
    );

}


function getProductsByCategory(
    categoryId
) {

    if (!categoryId) {

        return [
            ...DapurOziState.products
        ];

    }


    return DapurOziState.products.filter(
        product =>
            product.category_id ===
            categoryId
    );

}


function getFeaturedProducts() {

    return DapurOziState.products.filter(
        product =>
            Boolean(
                product.is_featured
            )
    );

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
            'READY' &&
        Number(
            product.stock
        ) <= 0
    ) {

        return false;

    }


    /*
     * PRE_ORDER tidak dibatasi stock fisik
     * oleh frontend.
     */

    return true;

}


function isPreOrderProduct(product) {

    return (
        product?.status ===
        'PRE_ORDER'
    );

}


/* =========================================================
   PRODUCT LABELS
   ========================================================= */

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


/* =========================================================
   STOCK STATUS
   ========================================================= */

function getStockStatus(stock) {

    const value =
        Number(
            stock ||
            0
        );


    if (
        value <= 0
    ) {

        return 'OUT_OF_STOCK';

    }


    if (
        value <= 3
    ) {

        return 'LOW';

    }


    return 'AVAILABLE';

}


function getStockLabel(stock) {

    const status =
        getStockStatus(
            stock
        );


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

function isValidShippingType(
    shippingType
) {

    return SHIPPING_TYPES.includes(
        shippingType
    );

}


/* =========================================================
   SHIPPING COMPATIBILITY
   ========================================================= */

function canProductUseShipping(
    product,
    shippingType
) {

    if (
        !product ||
        !isValidShippingType(
            shippingType
        )
    ) {

        return false;

    }


    /*
     * Basic validation berdasarkan product.shipping_type.
     *
     * Database tetap menjadi source of truth.
     */

    if (
        product.shipping_type ===
        shippingType
    ) {

        return true;

    }


    /*
     * PICKUP biasanya dapat dipakai
     * sebagai alternatif produk lokal.
     *
     * Kalau database RPC punya aturan lebih ketat,
     * create_order tetap akan menolak checkout.
     */

    if (
        shippingType ===
        'PICKUP'
    ) {

        return true;

    }


    return false;

}


/* =========================================================
   CART STORAGE
   ========================================================= */

function saveCart() {

    try {

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(
                DapurOziState.cart
            )
        );

    } catch (error) {

        console.error(
            '[Dapur Ozi CART SAVE ERROR]',
            error
        );

    }

}


function loadCart() {

    try {

        const saved =
            localStorage.getItem(
                CART_STORAGE_KEY
            );


        if (!saved) {

            DapurOziState.cart =
                [];

            return DapurOziState.cart;

        }


        const parsed =
            JSON.parse(
                saved
            );


        DapurOziState.cart =
            Array.isArray(parsed)
                ? parsed
                : [];


    } catch (error) {

        console.error(
            '[Dapur Ozi CART LOAD ERROR]',
            error
        );


        DapurOziState.cart =
            [];

    }


    return DapurOziState.cart;

}


/* =========================================================
   CART SYNC
   ========================================================= */

function syncCartWithProducts() {

    if (
        !DapurOziState
            .products
            .length
    ) {

        return DapurOziState.cart;

    }


    const nextCart = [];


    for (
        const cartItem
        of DapurOziState.cart
    ) {

        const product =
            getProduct(
                cartItem.product_id
            );


        /*
         * Produk hilang / tidak dijual:
         * keluarkan dari keranjang.
         */

        if (
            !product ||
            product.status ===
                'NOT_FOR_SALE'
        ) {

            continue;

        }


        let quantity =
            Number(
                cartItem.quantity ||
                0
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity <= 0
        ) {

            continue;

        }


        /*
         * READY tidak boleh melebihi stok terbaru.
         */

        if (
            product.status ===
            'READY'
        ) {

            const stock =
                Number(
                    product.stock ||
                    0
                );


            if (
                stock <= 0
            ) {

                continue;

            }


            quantity =
                Math.min(
                    quantity,
                    stock
                );

        }


        nextCart.push({

            product_id:
                product.id,

            product_name:
                product.name,

            price:
                Number(
                    product.price
                ),

            quantity

        });

    }


    DapurOziState.cart =
        nextCart;


    saveCart();


    return DapurOziState.cart;

}


/* =========================================================
   CART
   ========================================================= */

function addToCart(
    productId,
    quantity = 1
) {

    const product =
        getProduct(
            productId
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
            'PRODUCT_NOT_FOR_SALE'
        );

    }


    if (
        !isProductAvailable(
            product
        )
    ) {

        throw new Error(
            'INSUFFICIENT_STOCK'
        );

    }


    const qty =
        Number(
            quantity
        );


    if (
        !Number.isInteger(qty) ||
        qty <= 0
    ) {

        throw new Error(
            'INVALID_QUANTITY'
        );

    }


    const existing =
        DapurOziState.cart.find(
            item =>
                item.product_id ===
                product.id
        );


    const currentQuantity =
        existing
            ? Number(
                existing.quantity
            )
            : 0;


    const newQuantity =
        currentQuantity +
        qty;


    if (
        product.status ===
            'READY' &&
        newQuantity >
            Number(
                product.stock
            )
    ) {

        throw new Error(
            `INSUFFICIENT_STOCK:${product.name}`
        );

    }


    if (existing) {

        existing.quantity =
            newQuantity;

        existing.product_name =
            product.name;

        existing.price =
            Number(
                product.price
            );


    } else {

        DapurOziState.cart.push({

            product_id:
                product.id,

            product_name:
                product.name,

            price:
                Number(
                    product.price
                ),

            quantity:
                qty

        });

    }


    saveCart();


    dispatchCartUpdated();


    return DapurOziState.cart;

}


/* =========================================================
   REMOVE CART
   ========================================================= */

function removeFromCart(
    productId
) {

    DapurOziState.cart =
        DapurOziState.cart.filter(
            item =>
                item.product_id !==
                productId
        );


    saveCart();


    dispatchCartUpdated();


    return DapurOziState.cart;

}


/* =========================================================
   UPDATE CART QUANTITY
   ========================================================= */

function updateCartQuantity(
    productId,
    quantity
) {

    const item =
        DapurOziState.cart.find(
            item =>
                item.product_id ===
                productId
        );


    if (!item) {

        return DapurOziState.cart;

    }


    const qty =
        Number(
            quantity
        );


    if (
        !Number.isInteger(
            qty
        )
    ) {

        throw new Error(
            'INVALID_QUANTITY'
        );

    }


    if (
        qty <= 0
    ) {

        return removeFromCart(
            productId
        );

    }


    const product =
        getProduct(
            productId
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
            'PRODUCT_NOT_FOR_SALE'
        );

    }


    if (
        product.status ===
            'READY' &&
        qty >
            Number(
                product.stock
            )
    ) {

        throw new Error(
            `INSUFFICIENT_STOCK:${product.name}`
        );

    }


    item.quantity =
        qty;


    item.product_name =
        product.name;


    item.price =
        Number(
            product.price
        );


    saveCart();


    dispatchCartUpdated();


    return DapurOziState.cart;

}


/* =========================================================
   CLEAR CART
   ========================================================= */

function clearCart() {

    DapurOziState.cart =
        [];


    saveCart();


    dispatchCartUpdated();


    return DapurOziState.cart;

}


/* =========================================================
   CART TOTALS
   ========================================================= */

function getCartItemCount() {

    return DapurOziState.cart.reduce(
        (
            total,
            item
        ) => {

            return (
                total +
                Number(
                    item.quantity ||
                    0
                )
            );

        },
        0
    );

}


function getCartSubtotal() {

    return DapurOziState.cart.reduce(
        (
            total,
            item
        ) => {

            return (
                total +
                (
                    Number(
                        item.price ||
                        0
                    )
                    *
                    Number(
                        item.quantity ||
                        0
                    )
                )
            );

        },
        0
    );

}


/*
 * Frontend total hanya estimasi tampilan.
 *
 * Nilai final order harus dihitung
 * oleh function create_order di database.
 */

function getCartTotal() {

    return getCartSubtotal();

}


/* =========================================================
   CART DETAILS
   ========================================================= */

function getCartItemsDetailed() {

    return DapurOziState.cart.map(
        item => {

            const product =
                getProduct(
                    item.product_id
                );


            return {

                ...item,

                product,

                subtotal:
                    Number(
                        item.price ||
                        0
                    )
                    *
                    Number(
                        item.quantity ||
                        0
                    )

            };

        }
    );

}


/* =========================================================
   CART VALIDATION
   ========================================================= */

function validateCart() {

    if (
        !DapurOziState.cart.length
    ) {

        throw new Error(
            'CART_EMPTY'
        );

    }


    for (
        const item
        of DapurOziState.cart
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


        const quantity =
            Number(
                item.quantity
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity <= 0
        ) {

            throw new Error(
                `INVALID_QUANTITY:${product.name}`
            );

        }


        if (
            product.status ===
                'READY' &&
            quantity >
                Number(
                    product.stock
                )
        ) {

            throw new Error(
                `INSUFFICIENT_STOCK:${product.name}`
            );

        }

    }


    return true;

}


/* =========================================================
   SHIPPING VALIDATION
   ========================================================= */

function validateShippingForCart(
    shippingType
) {

    if (
        !isValidShippingType(
            shippingType
        )
    ) {

        throw new Error(
            'INVALID_SHIPPING_TYPE'
        );

    }


    /*
     * Compatibility sebenarnya juga divalidasi
     * oleh backend.
     *
     * Ini hanya early feedback.
     */

    for (
        const item
        of DapurOziState.cart
    ) {

        const product =
            getProduct(
                item.product_id
            );


        if (!product) {

            continue;

        }


        if (
            !canProductUseShipping(
                product,
                shippingType
            )
        ) {

            /*
             * Kita sengaja tidak throw di sini karena
             * aturan compatibility sebenarnya ada di DB
             * (validate_shipping_compatibility).
             *
             * Function tetap tersedia untuk UI jika
             * index.html mau menggunakannya.
             */

            return false;

        }

    }


    return true;

}


/* =========================================================
   PRE-ORDER HELPERS
   ========================================================= */

function cartHasPreOrder() {

    return DapurOziState.cart.some(
        item => {

            const product =
                getProduct(
                    item.product_id
                );


            return (
                product?.status ===
                'PRE_ORDER'
            );

        }
    );

}


function getPreOrderItems() {

    return getCartItemsDetailed()
        .filter(
            item =>
                item.product?.status ===
                'PRE_ORDER'
        );

}


/* =========================================================
   CHECKOUT
   ========================================================= */

async function createOrder({

    customerName,

    customerPhone,

    customerAddress = null,

    customerArea = null,

    customerNote = null,

    shippingType

}) {

    /*
     * Reload status + products agar checkout
     * memakai kondisi terbaru.
     */

    await Promise.all([

        loadStoreStatus(),

        loadProducts()

    ]);


    if (
        !isStoreOpen()
    ) {

        throw new Error(
            'STORE_CLOSED'
        );

    }


    validateCart();


    const name =
        String(
            customerName ||
            ''
        ).trim();


    const phone =
        String(
            customerPhone ||
            ''
        ).trim();


    if (!name) {

        throw new Error(
            'CUSTOMER_NAME_REQUIRED'
        );

    }


    if (!phone) {

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


    /*
     * Jangan kirim harga/HPP/subtotal dari frontend.
     *
     * Backend hanya menerima product_id + quantity.
     */

    const items =
        DapurOziState.cart.map(
            item => ({

                product_id:
                    item.product_id,

                quantity:
                    Number(
                        item.quantity
                    )

            })
        );


    const orderId =
        await callRPC(
            'create_order',
            {

                p_customer_name:
                    name,

                p_customer_phone:
                    phone,

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


    if (!orderId) {

        throw new Error(
            'ORDER_CREATION_FAILED'
        );

    }


    DapurOziState.currentOrder =
        orderId;


    clearCart();


    window.dispatchEvent(
        new CustomEvent(
            'dapur-ozi-order-created',
            {
                detail: {

                    order_id:
                        orderId

                }
            }
        )
    );


    return orderId;

}


/* =========================================================
   REFRESH STORE
   ========================================================= */

async function refreshStore() {

    const [
        settings,
        products,
        categories
    ] =
        await Promise.all([

            loadStoreStatus(),

            loadProducts(),

            loadCategories()

        ]);


    const result = {

        settings,

        products,

        categories

    };


    window.dispatchEvent(
        new CustomEvent(
            'dapur-ozi-store-updated',
            {
                detail:
                    result
            }
        )
    );


    return result;

}


/* =========================================================
   CART EVENT
   ========================================================= */

function dispatchCartUpdated() {

    window.dispatchEvent(
        new CustomEvent(
            'dapur-ozi-cart-updated',
            {
                detail: {

                    cart:
                        DapurOziState.cart,

                    count:
                        getCartItemCount(),

                    subtotal:
                        getCartSubtotal(),

                    total:
                        getCartTotal()

                }
            }
        )
    );

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


        DapurOziState.initialized =
            true;


        console.log(
            'Dapur Ozi Store initialized.'
        );


        window.dispatchEvent(
            new CustomEvent(
                'dapur-ozi-ready',
                {
                    detail:
                        DapurOziState
                }
            )
        );


        dispatchCartUpdated();


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
        DapurOziState,

    supabase:
        supabaseClient,


    /* STORE */

    loadStoreStatus,

    isStoreOpen,

    getStoreMessage,

    getMaxPreorderDays,

    refreshStore,


    /* PRODUCTS */

    loadProducts,

    getProduct,

    getProductsByCategory,

    getFeaturedProducts,

    isProductAvailable,

    isPreOrderProduct,

    getProductStatusLabel,


    /* CATEGORIES */

    loadCategories,

    getCategory,


    /* STOCK */

    getStockStatus,

    getStockLabel,


    /* SHIPPING */

    SHIPPING_TYPES,

    isValidShippingType,

    getShippingLabel,

    canProductUseShipping,

    validateShippingForCart,


    /* CART */

    loadCart,

    saveCart,

    syncCartWithProducts,

    addToCart,

    removeFromCart,

    updateCartQuantity,

    clearCart,

    getCartItemCount,

    getCartSubtotal,

    getCartTotal,

    getCartItemsDetailed,

    validateCart,


    /* PREORDER */

    cartHasPreOrder,

    getPreOrderItems,


    /* CHECKOUT */

    createOrder,


    /* ERROR */

    normalizeError,

    getFriendlyErrorMessage

};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initDapurOzi
);
