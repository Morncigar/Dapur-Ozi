/* =========================================================
   DAPUR OZI
   CUSTOMER STOREFRONT FINAL

   - Dynamic WhatsApp from settings
   - Order number wrapper
   - Cart + checkout
   - Shipping compatibility
   - Direct WhatsApp / custom order
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
   STORE CONFIG
   ========================================================= */

const CART_STORAGE_KEY =
    'dapur_ozi_cart';

const SHIPPING_TYPES = [
    'LOCAL',
    'NATIONAL',
    'PICKUP'
];


/* =========================================================
   STATE
   ========================================================= */

const state = {

    products: [],

    categories: [],

    settings: null,

    cart: [],

    currentCategory:
        'all',

    currentOrder:
        null,

    initialized:
        false

};


/* =========================================================
   DOM HELPERS
   ========================================================= */

function el(id) {

    return document.getElementById(id);

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
   HTML ESCAPE
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


/* =========================================================
   ERROR HELPERS
   ========================================================= */

function normalizeError(error) {

    if (!error) {

        return {
            code:
                'UNKNOWN_ERROR',

            message:
                'Terjadi kesalahan.'
        };

    }


    return {

        code:
            error.code ||
            error.message ||
            'UNKNOWN_ERROR',

        message:
            error.message ||
            String(error)

    };

}


function getFriendlyErrorMessage(error) {

    const normalized =
        normalizeError(
            error
        );


    const raw =
        String(
            normalized.message ||
            normalized.code ||
            ''
        );


    const messages = {

        STORE_CLOSED:
            'Dapur Ozi sedang tutup.',

        STORE_WHATSAPP_NOT_CONFIGURED:
            'Nomor WhatsApp Dapur Ozi belum diatur.',

        CART_EMPTY:
            'Keranjang masih kosong.',

        PRODUCT_NOT_FOUND:
            'Produk tidak ditemukan.',

        PRODUCT_NOT_FOR_SALE:
            'Produk sedang tidak dijual.',

        INVALID_PRODUCT_ID:
            'Produk tidak valid.',

        INVALID_QUANTITY:
            'Jumlah produk tidak valid.',

        INSUFFICIENT_STOCK:
            'Stok produk tidak mencukupi.',

        CUSTOMER_NAME_REQUIRED:
            'Nama wajib diisi.',

        CUSTOMER_PHONE_REQUIRED:
            'Nomor WhatsApp wajib diisi.',

        INVALID_SHIPPING_TYPE:
            'Metode pengiriman tidak valid.',

        SHIPPING_NOT_AVAILABLE:
            'Metode pengiriman ini tidak tersedia untuk salah satu produk di keranjang.',

        ORDER_CREATION_FAILED:
            'Pesanan gagal dibuat.',

        INVALID_PREORDER_CONFIGURATION:
            'Konfigurasi pre-order sedang bermasalah.'

    };


    for (
        const [
            code,
            message
        ]
        of Object.entries(messages)
    ) {

        if (
            raw.includes(code)
        ) {

            const parts =
                raw.split(':');


            if (
                parts.length > 1 &&
                [
                    'INSUFFICIENT_STOCK',
                    'PRODUCT_NOT_FOR_SALE',
                    'SHIPPING_NOT_AVAILABLE'
                ].includes(code)
            ) {

                return `${message} ${parts.slice(1).join(':')}`;

            }


            return message;

        }

    }


    return (
        raw ||
        'Terjadi kesalahan. Silakan coba lagi.'
    );

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
        el('toast');

    const icon =
        el('toast-icon');

    const text =
        el('toast-message');


    if (
        !toast ||
        !text
    ) {

        return;

    }


    text.textContent =
        message;


    if (icon) {

        icon.textContent =
            type === 'error'
                ? '!'
                : '✓';

    }


    toast.classList.remove(
        'show',
        'success',
        'error'
    );


    toast.classList.add(
        'show',
        type
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    'show'
                );

            },
            3000
        );

}


/* =========================================================
   RPC
   ========================================================= */

async function callRPC(
    name,
    params = {}
) {

    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            name,
            params
        );


    if (error) {

        console.error(
            `[Dapur Ozi RPC] ${name}`,
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


    state.settings =
        Array.isArray(data)
            ? data[0] || null
            : data || null;


    return state.settings;

}


function isStoreOpen() {

    return Boolean(
        state.settings
            ?.store_open
    );

}


function getStoreMessage() {

    return (
        state.settings
            ?.store_message ||
        ''
    );

}


function getStoreWhatsApp() {

    return String(
        state.settings
            ?.whatsapp_number ||
        ''
    )
        .replace(
            /\D/g,
            ''
        );

}


/* =========================================================
   DIRECT WHATSAPP
   ========================================================= */

async function openDirectWhatsApp(
    event = null
) {

    if (event) {

        event.preventDefault();

    }


    try {

        /*
         * Kalau settings belum dimuat,
         * ambil dulu dari backend.
         */

        if (
            !state.settings
        ) {

            await loadStoreStatus();

        }


        const whatsappNumber =
            getStoreWhatsApp();


        if (
            !whatsappNumber
        ) {

            throw new Error(
                'STORE_WHATSAPP_NOT_CONFIGURED'
            );

        }


        const message =
            [
                'Halo Dapur Ozi, saya mau tanya atau pesan custom.',
                '',
                'Boleh minta informasi lebih lanjut?'
            ].join('\n');


        const url =
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;


        window.open(
            url,
            '_blank',
            'noopener,noreferrer'
        );


    } catch (error) {

        console.error(
            '[DIRECT WHATSAPP ERROR]',
            error
        );


        showToast(
            getFriendlyErrorMessage(
                error
            ),
            'error'
        );

    }

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
                    ascending:
                        true
                }
            );


    if (error) {

        console.error(
            '[PRODUCT LOAD ERROR]',
            error
        );

        throw error;

    }


    state.products =
        data || [];


    syncCartWithProducts();


    return state.products;

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

        console.error(
            '[CATEGORY LOAD ERROR]',
            error
        );

        throw error;

    }


    state.categories =
        data || [];


    return state.categories;

}


/* =========================================================
   PRODUCT HELPERS
   ========================================================= */

function getProduct(productId) {

    return (
        state.products.find(
            product =>
                product.id ===
                productId
        ) ||
        null
    );

}


function getCategory(categoryId) {

    return (
        state.categories.find(
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

    if (
        !categoryId ||
        categoryId ===
        'all'
    ) {

        return [
            ...state.products
        ];

    }


    return state.products.filter(
        product =>
            product.category_id ===
            categoryId
    );

}


function getFeaturedProducts() {

    return state.products.filter(
        product =>
            Boolean(
                product.is_featured
            )
    );

}


/* =========================================================
   PRODUCT STATUS
   ========================================================= */

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


    return true;

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
        ''
    );

}


function getDeliveryClassLabel(
    deliveryClass
) {

    const labels = {

        DRY:
            'Dry',

        FRESH:
            'Fresh'

    };


    return (
        labels[deliveryClass] ||
        deliveryClass ||
        ''
    );

}


/* =========================================================
   STOCK
   ========================================================= */

function getStockStatus(stock) {

    const value =
        Number(
            stock || 0
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


    if (
        status ===
        'OUT_OF_STOCK'
    ) {

        return 'Habis';

    }


    if (
        status ===
        'LOW'
    ) {

        return 'Stok terbatas';

    }


    return 'Tersedia';

}


/* =========================================================
   SHIPPING
   ========================================================= */

function getShippingLabel(type) {

    const labels = {

        LOCAL:
            'Local Delivery',

        NATIONAL:
            'National Delivery',

        PICKUP:
            'Pickup'

    };


    return (
        labels[type] ||
        type ||
        ''
    );

}


function isShippingCompatible(
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


function cartHasFreshProduct() {

    return state.cart.some(
        item => {

            const product =
                getProduct(
                    item.product_id
                );


            return (
                product
                    ?.delivery_class ===
                'FRESH'
            );

        }
    );

}


function getAvailableShippingTypes() {

    if (
        !state.cart.length
    ) {

        return [
            ...SHIPPING_TYPES
        ];

    }


    return SHIPPING_TYPES.filter(
        shippingType =>
            state.cart.every(
                item => {

                    const product =
                        getProduct(
                            item.product_id
                        );


                    if (!product) {

                        return false;

                    }


                    return isShippingCompatible(
                        product.delivery_class,
                        shippingType
                    );

                }
            )
    );

}


function validateShippingForCart(
    shippingType
) {

    if (
        !SHIPPING_TYPES.includes(
            shippingType
        )
    ) {

        throw new Error(
            'INVALID_SHIPPING_TYPE'
        );

    }


    const available =
        getAvailableShippingTypes();


    if (
        !available.includes(
            shippingType
        )
    ) {

        throw new Error(
            'SHIPPING_NOT_AVAILABLE'
        );

    }


    return true;

}


/* =========================================================
   SHIPPING UI
   ========================================================= */

function updateCheckoutShippingOptions() {

    const select =
        el('shipping-type');


    if (!select) {

        return;

    }


    const available =
        getAvailableShippingTypes();


    [
        ...select.options
    ].forEach(
        option => {

            if (!option.value) {

                return;

            }


            option.disabled =
                !available.includes(
                    option.value
                );

        }
    );


    if (
        select.value &&
        !available.includes(
            select.value
        )
    ) {

        select.value =
            '';

    }


    const helper =
        select
            .closest(
                '.form-group'
            )
            ?.querySelector(
                '.form-helper'
            );


    if (helper) {

        helper.textContent =
            cartHasFreshProduct()
                ? 'Ada produk Fresh di keranjang. National Delivery tidak tersedia.'
                : 'Local, National, dan Pickup tersedia untuk pesanan ini.';

    }


    handleShippingChange();

}


/* =========================================================
   CART STORAGE
   ========================================================= */

function saveCart() {

    try {

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(
                state.cart
            )
        );

    } catch (error) {

        console.error(
            '[CART SAVE ERROR]',
            error
        );

    }

}


function loadCart() {

    try {

        const raw =
            localStorage.getItem(
                CART_STORAGE_KEY
            );


        if (!raw) {

            state.cart =
                [];

            return state.cart;

        }


        const parsed =
            JSON.parse(raw);


        state.cart =
            Array.isArray(parsed)
                ? parsed
                : [];


    } catch (error) {

        console.error(
            '[CART LOAD ERROR]',
            error
        );


        state.cart =
            [];

    }


    return state.cart;

}


/* =========================================================
   CART SYNC
   ========================================================= */

function syncCartWithProducts() {

    if (
        !state.products.length
    ) {

        return state.cart;

    }


    const nextCart =
        [];


    for (
        const item
        of state.cart
    ) {

        const product =
            getProduct(
                item.product_id
            );


        if (
            !product ||
            product.status ===
                'NOT_FOR_SALE'
        ) {

            continue;

        }


        let quantity =
            Number(
                item.quantity ||
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


    state.cart =
        nextCart;


    saveCart();


    return state.cart;

}


/* =========================================================
   ADD TO CART
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
        !isProductAvailable(
            product
        )
    ) {

        throw new Error(
            `INSUFFICIENT_STOCK:${product.name}`
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
        state.cart.find(
            item =>
                item.product_id ===
                productId
        );


    const current =
        existing
            ? Number(
                existing.quantity
            )
            : 0;


    const next =
        current +
        qty;


    if (
        product.status ===
            'READY' &&
        next >
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
            next;

        existing.product_name =
            product.name;

        existing.price =
            Number(
                product.price
            );


    } else {

        state.cart.push({

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

    renderCart();

    updateCheckoutShippingOptions();

    dispatchCartUpdated();


    return state.cart;

}


/* =========================================================
   REMOVE CART ITEM
   ========================================================= */

function removeFromCart(
    productId
) {

    state.cart =
        state.cart.filter(
            item =>
                item.product_id !==
                productId
        );


    saveCart();

    renderCart();

    updateCheckoutShippingOptions();

    dispatchCartUpdated();


    return state.cart;

}


/* =========================================================
   UPDATE CART QUANTITY
   ========================================================= */

function updateCartQuantity(
    productId,
    quantity
) {

    const item =
        state.cart.find(
            cartItem =>
                cartItem.product_id ===
                productId
        );


    if (!item) {

        return state.cart;

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

    renderCart();

    updateCheckoutShippingOptions();

    dispatchCartUpdated();


    return state.cart;

}


/* =========================================================
   CLEAR CART
   ========================================================= */

function clearCart() {

    state.cart =
        [];


    saveCart();

    renderCart();

    updateCheckoutShippingOptions();

    dispatchCartUpdated();


    return state.cart;

}


/* =========================================================
   CART TOTALS
   ========================================================= */

function getCartItemCount() {

    return state.cart.reduce(
        (
            total,
            item
        ) =>
            total +
            Number(
                item.quantity ||
                0
            ),
        0
    );

}


function getCartSubtotal() {

    return state.cart.reduce(
        (
            total,
            item
        ) =>
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
            ),
        0
    );

}


function getCartItemsDetailed() {

    return state.cart.map(
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
        !state.cart.length
    ) {

        throw new Error(
            'CART_EMPTY'
        );

    }


    for (
        const item
        of state.cart
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
                'INVALID_QUANTITY'
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
   CREATE ORDER
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
     * Refresh kondisi toko dan produk
     * sebelum order dibuat.
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


    /*
     * Jangan buat order kalau WA toko
     * belum tersedia.
     */

    if (
        !getStoreWhatsApp()
    ) {

        throw new Error(
            'STORE_WHATSAPP_NOT_CONFIGURED'
        );

    }


    validateCart();

    validateShippingForCart(
        shippingType
    );


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


    const items =
        state.cart.map(
            item => ({

                product_id:
                    item.product_id,

                quantity:
                    Number(
                        item.quantity
                    )

            })
        );


    /*
     * Wrapper mengembalikan:
     *
     * {
     *   id,
     *   order_number
     * }
     */

    const order =
        await callRPC(
            'create_order_with_number',
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


    if (
        !order ||
        !order.id ||
        !order.order_number
    ) {

        console.error(
            '[INVALID ORDER RESPONSE]',
            order
        );


        throw new Error(
            'ORDER_CREATION_FAILED'
        );

    }


    state.currentOrder =
        order;


    return order;

}


/* =========================================================
   WHATSAPP ORDER MESSAGE
   ========================================================= */

function buildWhatsAppOrderMessage({

    orderNumber,

    customerName,

    customerPhone,

    customerAddress,

    customerArea,

    customerNote,

    shippingType,

    items,

    subtotal

}) {

    const itemLines =
        items
            .map(
                (
                    item,
                    index
                ) => {

                    return [
                        `${index + 1}. ${item.product_name}`,
                        `${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}`
                    ].join('\n');

                }
            )
            .join('\n\n');


    const lines = [

        'Halo Dapur Ozi, saya baru buat pesanan dari website.',
        '',
        `No. Pesanan: ${orderNumber}`,
        `Nama: ${customerName}`,
        `No. WhatsApp: ${customerPhone}`,
        `Pengiriman: ${getShippingLabel(shippingType)}`

    ];


    if (
        customerArea
    ) {

        lines.push(
            `Area: ${customerArea}`
        );

    }


    if (
        shippingType !==
            'PICKUP' &&
        customerAddress
    ) {

        lines.push(
            `Alamat: ${customerAddress}`
        );

    }


    lines.push(
        '',
        'Pesanan:',
        itemLines,
        '',
        `Subtotal: ${formatCurrency(subtotal)}`
    );


    if (
        customerNote
    ) {

        lines.push(
            '',
            `Catatan: ${customerNote}`
        );

    }


    lines.push(
        '',
        'Saya mau lanjut konfirmasi pesanan dan pembayaran ya.'
    );


    return lines.join('\n');

}


/* =========================================================
   WHATSAPP CHECKOUT REDIRECT
   ========================================================= */

function redirectToWhatsApp(
    message
) {

    const whatsappNumber =
        getStoreWhatsApp();


    if (
        !whatsappNumber
    ) {

        throw new Error(
            'STORE_WHATSAPP_NOT_CONFIGURED'
        );

    }


    const url =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;


    window.location.assign(
        url
    );

}


/* =========================================================
   CATEGORY RENDER
   ========================================================= */

function renderCategories() {

    const container =
        el(
            'category-filter'
        );


    if (!container) {

        return;

    }


    const allButton = `

        <button
            type="button"
            class="category-button ${
                state.currentCategory ===
                'all'
                    ? 'active'
                    : ''
            }"
            data-category="all"
        >
            Semua
        </button>

    `;


    const categories =
        state.categories
            .map(
                category => `

                    <button
                        type="button"
                        class="category-button ${
                            state.currentCategory ===
                            category.id
                                ? 'active'
                                : ''
                        }"
                        data-category="${escapeHTML(category.id)}"
                    >
                        ${escapeHTML(
                            category.name
                        )}
                    </button>

                `
            )
            .join('');


    container.innerHTML =
        allButton +
        categories;

}


/* =========================================================
   PRODUCT RENDER
   ========================================================= */

function renderProducts() {

    const grid =
        el(
            'product-grid'
        );


    if (!grid) {

        return;

    }


    hide(
        el(
            'products-loading'
        )
    );


    hide(
        el(
            'products-error'
        )
    );


    const products =
        getProductsByCategory(
            state.currentCategory
        );


    if (
        !products.length
    ) {

        grid.innerHTML =
            '';


        show(
            el(
                'products-empty'
            )
        );


        return;

    }


    hide(
        el(
            'products-empty'
        )
    );


    grid.innerHTML =
        products
            .map(
                product => {

                    const available =
                        isProductAvailable(
                            product
                        );


                    const category =
                        getCategory(
                            product.category_id
                        );


                    const stockLabel =
                        product.status ===
                        'PRE_ORDER'
                            ? 'Pre-order'
                            : getStockLabel(
                                product.stock
                            );


                    const buttonLabel =
                        product.status ===
                        'PRE_ORDER'
                            ? '+ Keranjang'
                            : available
                                ? '+ Keranjang'
                                : 'Habis';


                    return `

                        <article
                            class="product-card"
                            data-product-id="${escapeHTML(product.id)}"
                        >

                            <div
                                class="product-image-wrap"
                            >

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
                                                class="product-image"
                                                loading="lazy"
                                            >
                                        `
                                        : `
                                            <div
                                                class="product-image-placeholder"
                                            >

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


                                ${
                                    product.is_featured
                                        ? `
                                            <span
                                                class="product-featured-badge"
                                            >
                                                Pilihan
                                            </span>
                                        `
                                        : ''
                                }


                                <span
                                    class="product-status-badge status-${
                                        String(
                                            product.status
                                        )
                                            .toLowerCase()
                                            .replaceAll(
                                                '_',
                                                '-'
                                            )
                                    }"
                                >
                                    ${escapeHTML(
                                        getProductStatusLabel(
                                            product.status
                                        )
                                    )}
                                </span>

                            </div>


                            <div
                                class="product-card-body"
                            >

                                <div
                                    class="product-card-top"
                                >

                                    ${
                                        category
                                            ? `
                                                <span
                                                    class="product-category"
                                                >
                                                    ${escapeHTML(
                                                        category.name
                                                    )}
                                                </span>
                                            `
                                            : ''
                                    }


                                    <span
                                        class="product-stock-label"
                                    >
                                        ${escapeHTML(
                                            stockLabel
                                        )}
                                    </span>

                                </div>


                                <h3>
                                    ${escapeHTML(
                                        product.name
                                    )}
                                </h3>


                                ${
                                    product.description
                                        ? `
                                            <p
                                                class="product-description"
                                            >
                                                ${escapeHTML(
                                                    product.description
                                                )}
                                            </p>
                                        `
                                        : `
                                            <p
                                                class="product-description"
                                            ></p>
                                        `
                                }


                                <div
                                    class="product-meta"
                                >

                                    <span>
                                        ${escapeHTML(
                                            getDeliveryClassLabel(
                                                product.delivery_class
                                            )
                                        )}
                                    </span>


                                    ${
                                        product.delivery_class ===
                                        'FRESH'
                                            ? `
                                                <span>
                                                    Local / Pickup
                                                </span>
                                            `
                                            : `
                                                <span>
                                                    Bisa National
                                                </span>
                                            `
                                    }

                                </div>


                                <div
                                    class="product-card-footer"
                                >

                                    <strong
                                        class="product-price"
                                    >
                                        ${formatCurrency(
                                            product.price
                                        )}
                                    </strong>


                                    <button
                                        type="button"
                                        class="button button-primary product-add-btn"
                                        data-action="add-to-cart"
                                        data-product-id="${escapeHTML(product.id)}"
                                        ${
                                            available
                                                ? ''
                                                : 'disabled'
                                        }
                                    >
                                        ${buttonLabel}
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
   HERO IMAGE
   ========================================================= */

function renderHeroImage() {

    const image =
        el(
            'hero-image'
        );

    const placeholder =
        el(
            'hero-image-placeholder'
        );


    if (
        !image ||
        !placeholder
    ) {

        return;

    }


    const featured =
        getFeaturedProducts()
            .find(
                product =>
                    Boolean(
                        product.image_url
                    )
            );


    const fallback =
        state.products.find(
            product =>
                Boolean(
                    product.image_url
                )
        );


    const product =
        featured ||
        fallback;


    if (
        !product
            ?.image_url
    ) {

        image.removeAttribute(
            'src'
        );


        hide(image);

        show(placeholder);


        return;

    }


    image.src =
        product.image_url;

    image.alt =
        product.name;


    show(image);

    hide(placeholder);

}


/* =========================================================
   STORE STATUS RENDER
   ========================================================= */

function renderStoreStatus() {

    const notice =
        el(
            'store-notice'
        );

    const text =
        el(
            'store-notice-text'
        );


    if (
        !notice ||
        !text
    ) {

        return;

    }


    if (
        isStoreOpen()
    ) {

        hide(notice);

    } else {

        text.textContent =
            getStoreMessage() ||
            'Dapur Ozi sedang tutup.';


        show(notice);

    }


    const checkoutButton =
        el(
            'checkout-btn'
        );


    if (
        checkoutButton
    ) {

        checkoutButton.disabled =
            !isStoreOpen();

    }

}


/* =========================================================
   CART RENDER
   ========================================================= */

function renderCart() {

    const container =
        el(
            'cart-items'
        );

    const empty =
        el(
            'cart-empty'
        );

    const footer =
        el(
            'cart-footer'
        );


    if (
        !container ||
        !empty ||
        !footer
    ) {

        return;

    }


    const items =
        getCartItemsDetailed();


    setText(
        'cart-count',
        getCartItemCount()
    );


    setText(
        'cart-subtotal',
        formatCurrency(
            getCartSubtotal()
        )
    );


    if (
        !items.length
    ) {

        container.innerHTML =
            '';


        show(empty);

        hide(footer);


        return;

    }


    hide(empty);

    show(footer);


    container.innerHTML =
        items
            .map(
                item => {

                    const product =
                        item.product;


                    return `

                        <div
                            class="cart-item"
                            data-product-id="${escapeHTML(item.product_id)}"
                        >

                            <div
                                class="cart-item-image"
                            >

                                ${
                                    product
                                        ?.image_url
                                        ? `
                                            <img
                                                src="${escapeHTML(
                                                    product.image_url
                                                )}"
                                                alt="${escapeHTML(
                                                    item.product_name
                                                )}"
                                            >
                                        `
                                        : `
                                            <div
                                                class="cart-item-placeholder"
                                            >
                                                DO
                                            </div>
                                        `
                                }

                            </div>


                            <div
                                class="cart-item-content"
                            >

                                <div
                                    class="cart-item-header"
                                >

                                    <div>

                                        <strong>
                                            ${escapeHTML(
                                                item.product_name
                                            )}
                                        </strong>

                                        <span>
                                            ${formatCurrency(
                                                item.price
                                            )}
                                        </span>

                                    </div>


                                    <button
                                        type="button"
                                        class="cart-remove-btn"
                                        data-action="remove-cart-item"
                                        data-product-id="${escapeHTML(item.product_id)}"
                                        aria-label="Hapus produk"
                                    >
                                        ×
                                    </button>

                                </div>


                                <div
                                    class="cart-item-footer"
                                >

                                    <div
                                        class="quantity-control"
                                    >

                                        <button
                                            type="button"
                                            data-action="decrease-cart"
                                            data-product-id="${escapeHTML(item.product_id)}"
                                        >
                                            -
                                        </button>


                                        <span>
                                            ${item.quantity}
                                        </span>


                                        <button
                                            type="button"
                                            data-action="increase-cart"
                                            data-product-id="${escapeHTML(item.product_id)}"
                                        >
                                            +
                                        </button>

                                    </div>


                                    <strong>
                                        ${formatCurrency(
                                            item.subtotal
                                        )}
                                    </strong>

                                </div>

                            </div>

                        </div>

                    `;

                }
            )
            .join('');

}


/* =========================================================
   CART DRAWER
   ========================================================= */

function openCart() {

    const drawer =
        el(
            'cart-drawer'
        );


    if (!drawer) {

        return;

    }


    drawer.classList.add(
        'open'
    );


    drawer.setAttribute(
        'aria-hidden',
        'false'
    );


    document.body
        .classList
        .add(
            'cart-open'
        );

}


function closeCart() {

    const drawer =
        el(
            'cart-drawer'
        );


    if (!drawer) {

        return;

    }


    drawer.classList.remove(
        'open'
    );


    drawer.setAttribute(
        'aria-hidden',
        'true'
    );


    document.body
        .classList
        .remove(
            'cart-open'
        );

}


/* =========================================================
   CHECKOUT
   ========================================================= */

function openCheckout() {

    try {

        validateCart();


        if (
            !isStoreOpen()
        ) {

            throw new Error(
                'STORE_CLOSED'
            );

        }


        closeCart();


        updateCheckoutShippingOptions();

        renderCheckoutSummary();


        show(
            el(
                'checkout-modal'
            )
        );


        document.body
            .classList
            .add(
                'modal-open'
            );


    } catch (error) {

        showToast(
            getFriendlyErrorMessage(
                error
            ),
            'error'
        );

    }

}


function closeCheckout() {

    hide(
        el(
            'checkout-modal'
        )
    );


    document.body
        .classList
        .remove(
            'modal-open'
        );

}


/* =========================================================
   CHECKOUT SUMMARY
   ========================================================= */

function renderCheckoutSummary() {

    const container =
        el(
            'checkout-items'
        );


    if (!container) {

        return;

    }


    const items =
        getCartItemsDetailed();


    container.innerHTML =
        items
            .map(
                item => `

                    <div
                        class="checkout-item"
                    >

                        <div>

                            <strong>
                                ${escapeHTML(
                                    item.product_name
                                )}
                            </strong>

                            <span>
                                ${item.quantity}
                                x
                                ${formatCurrency(
                                    item.price
                                )}
                            </span>

                        </div>


                        <strong>
                            ${formatCurrency(
                                item.subtotal
                            )}
                        </strong>

                    </div>

                `
            )
            .join('');


    setText(
        'checkout-total',
        formatCurrency(
            getCartSubtotal()
        )
    );

}


/* =========================================================
   SHIPPING FIELD
   ========================================================= */

function handleShippingChange() {

    const select =
        el(
            'shipping-type'
        );

    const addressGroup =
        el(
            'address-group'
        );

    const address =
        el(
            'customer-address'
        );


    if (
        !select ||
        !addressGroup ||
        !address
    ) {

        return;

    }


    const pickup =
        select.value ===
        'PICKUP';


    addressGroup
        .classList
        .toggle(
            'hidden',
            pickup
        );


    address.required =
        !pickup;


    if (
        pickup
    ) {

        address.value =
            '';

    }

}


/* =========================================================
   CHECKOUT ERRORS
   ========================================================= */

function clearCheckoutErrors() {

    setText(
        'customer-name-error',
        ''
    );

    setText(
        'customer-phone-error',
        ''
    );

    setText(
        'shipping-type-error',
        ''
    );


    const general =
        el(
            'checkout-error'
        );


    if (
        general
    ) {

        general.textContent =
            '';

        hide(general);

    }

}


/* =========================================================
   FORM VALIDATION
   ========================================================= */

function validateCheckoutForm() {

    clearCheckoutErrors();


    const name =
        el(
            'customer-name'
        )
            ?.value
            .trim() ||
        '';


    const phone =
        el(
            'customer-phone'
        )
            ?.value
            .trim() ||
        '';


    const shipping =
        el(
            'shipping-type'
        )
            ?.value ||
        '';


    let valid =
        true;


    if (
        !name
    ) {

        setText(
            'customer-name-error',
            'Nama wajib diisi.'
        );


        valid =
            false;

    }


    if (
        !phone
    ) {

        setText(
            'customer-phone-error',
            'Nomor WhatsApp wajib diisi.'
        );


        valid =
            false;

    }


    try {

        validateShippingForCart(
            shipping
        );


    } catch (error) {

        setText(
            'shipping-type-error',
            getFriendlyErrorMessage(
                error
            )
        );


        valid =
            false;

    }


    return valid;

}


/* =========================================================
   CHECKOUT SUBMIT
   ========================================================= */

async function handleCheckoutSubmit(
    event
) {

    event.preventDefault();


    if (
        !validateCheckoutForm()
    ) {

        return;

    }


    const button =
        el(
            'submit-order-btn'
        );

    const normalText =
        el(
            'submit-order-text'
        );

    const loadingText =
        el(
            'submit-order-loading'
        );

    const errorBox =
        el(
            'checkout-error'
        );


    try {

        if (
            button
        ) {

            button.disabled =
                true;

        }


        hide(
            normalText
        );

        show(
            loadingText
        );


        /*
         * Snapshot sebelum createOrder
         * karena cart akan dibersihkan
         * setelah database berhasil.
         */

        const cartSnapshot =
            getCartItemsDetailed()
                .map(
                    item => ({

                        product_id:
                            item.product_id,

                        product_name:
                            item.product_name,

                        price:
                            Number(
                                item.price
                            ),

                        quantity:
                            Number(
                                item.quantity
                            ),

                        subtotal:
                            Number(
                                item.subtotal
                            )

                    })
                );


        const subtotalSnapshot =
            getCartSubtotal();


        const customerName =
            el(
                'customer-name'
            )
                .value
                .trim();


        const customerPhone =
            el(
                'customer-phone'
            )
                .value
                .trim();


        const customerArea =
            el(
                'customer-area'
            )
                .value
                .trim();


        const customerNote =
            el(
                'customer-note'
            )
                .value
                .trim();


        const shippingType =
            el(
                'shipping-type'
            )
                .value;


        const customerAddress =
            shippingType ===
            'PICKUP'
                ? ''
                : el(
                    'customer-address'
                )
                    .value
                    .trim();


        /*
         * 1. Simpan order di database.
         */

        const order =
            await createOrder({

                customerName,

                customerPhone,

                customerAddress,

                customerArea,

                customerNote,

                shippingType

            });


        /*
         * 2. Baru clear cart setelah
         * database benar-benar sukses.
         */

        clearCart();


        /*
         * 3. Bangun pesan WhatsApp.
         */

        const whatsappMessage =
            buildWhatsAppOrderMessage({

                orderNumber:
                    order.order_number,

                customerName,

                customerPhone,

                customerAddress,

                customerArea,

                customerNote,

                shippingType,

                items:
                    cartSnapshot,

                subtotal:
                    subtotalSnapshot

            });


        /*
         * 4. Reset form.
         */

        el(
            'checkout-form'
        )
            ?.reset();


        /*
         * 5. Redirect ke WhatsApp.
         */

        redirectToWhatsApp(
            whatsappMessage
        );


    } catch (error) {

        console.error(
            '[CHECKOUT ERROR]',
            error
        );


        if (
            errorBox
        ) {

            errorBox.textContent =
                getFriendlyErrorMessage(
                    error
                );


            show(
                errorBox
            );

        }


    } finally {

        if (
            button
        ) {

            button.disabled =
                false;

        }


        show(
            normalText
        );

        hide(
            loadingText
        );

    }

}


/* =========================================================
   MOBILE NAV
   ========================================================= */

function toggleMobileNav() {

    const nav =
        el(
            'mobile-nav'
        );

    const button =
        el(
            'mobile-menu-btn'
        );


    if (
        !nav ||
        !button
    ) {

        return;

    }


    const open =
        nav.classList.toggle(
            'open'
        );


    button.setAttribute(
        'aria-expanded',
        String(open)
    );

}


function closeMobileNav() {

    el(
        'mobile-nav'
    )
        ?.classList
        .remove(
            'open'
        );


    el(
        'mobile-menu-btn'
    )
        ?.setAttribute(
            'aria-expanded',
            'false'
        );

}


/* =========================================================
   GLOBAL CLICK
   ========================================================= */

function handleGlobalClick(
    event
) {

    const actionButton =
        event.target.closest(
            '[data-action]'
        );


    if (
        actionButton
    ) {

        const action =
            actionButton
                .dataset
                .action;


        const productId =
            actionButton
                .dataset
                .productId;


        try {

            if (
                action ===
                'add-to-cart'
            ) {

                addToCart(
                    productId,
                    1
                );


                showToast(
                    'Produk masuk ke keranjang.'
                );


                return;

            }


            if (
                action ===
                'remove-cart-item'
            ) {

                removeFromCart(
                    productId
                );


                return;

            }


            const item =
                state.cart.find(
                    cartItem =>
                        cartItem.product_id ===
                        productId
                );


            if (
                action ===
                    'increase-cart' &&
                item
            ) {

                updateCartQuantity(
                    productId,
                    Number(
                        item.quantity
                    ) + 1
                );


                return;

            }


            if (
                action ===
                    'decrease-cart' &&
                item
            ) {

                updateCartQuantity(
                    productId,
                    Number(
                        item.quantity
                    ) - 1
                );


                return;

            }


        } catch (error) {

            showToast(
                getFriendlyErrorMessage(
                    error
                ),
                'error'
            );

        }

    }


    const categoryButton =
        event.target.closest(
            '[data-category]'
        );


    if (
        categoryButton
    ) {

        state.currentCategory =
            categoryButton
                .dataset
                .category;


        renderCategories();

        renderProducts();

    }

}


/* =========================================================
   RETRY PRODUCTS
   ========================================================= */

async function retryProducts() {

    show(
        el(
            'products-loading'
        )
    );


    hide(
        el(
            'products-error'
        )
    );


    try {

        await Promise.all([

            loadProducts(),

            loadCategories()

        ]);


        renderCategories();

        renderProducts();

        renderCart();

        renderHeroImage();


    } catch (error) {

        showProductsError(
            error
        );

    }

}


/* =========================================================
   PRODUCT ERROR
   ========================================================= */

function showProductsError(
    error
) {

    hide(
        el(
            'products-loading'
        )
    );


    show(
        el(
            'products-error'
        )
    );


    setText(
        'products-error-message',
        getFriendlyErrorMessage(
            error
        )
    );

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
                        state.cart,

                    count:
                        getCartItemCount(),

                    subtotal:
                        getCartSubtotal()

                }
            }
        )
    );

}


/* =========================================================
   CURRENT YEAR
   ========================================================= */

function renderCurrentYear() {

    setText(
        'current-year',
        new Date()
            .getFullYear()
    );

}


/* =========================================================
   LOADER
   ========================================================= */

function hidePageLoader() {

    el(
        'page-loader'
    )
        ?.classList
        .add(
            'hidden'
        );

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {

    /*
     * Product + category actions.
     */

    document.addEventListener(
        'click',
        handleGlobalClick
    );


    /*
     * Cart.
     */

    el(
        'open-cart-btn'
    )
        ?.addEventListener(
            'click',
            openCart
        );

   el(
    'mobile-floating-cart'
)?.addEventListener(
    'click',
    openCart
);

   
    el(
        'footer-cart-btn'
    )
        ?.addEventListener(
            'click',
            openCart
        );


    el(
        'close-cart-btn'
    )
        ?.addEventListener(
            'click',
            closeCart
        );


    el(
        'cart-overlay'
    )
        ?.addEventListener(
            'click',
            closeCart
        );


    el(
        'start-shopping-btn'
    )
        ?.addEventListener(
            'click',
            () => {

                closeCart();


                el(
                    'menu'
                )
                    ?.scrollIntoView({
                        behavior:
                            'smooth'
                    });

            }
        );


    /*
     * Checkout.
     */

    el(
        'checkout-btn'
    )
        ?.addEventListener(
            'click',
            openCheckout
        );


    el(
        'close-checkout-btn'
    )
        ?.addEventListener(
            'click',
            closeCheckout
        );


    el(
        'checkout-modal-backdrop'
    )
        ?.addEventListener(
            'click',
            closeCheckout
        );


    el(
        'shipping-type'
    )
        ?.addEventListener(
            'change',
            handleShippingChange
        );


    el(
        'checkout-form'
    )
        ?.addEventListener(
            'submit',
            handleCheckoutSubmit
        );


    /*
     * Product retry.
     */

    el(
        'retry-products-btn'
    )
        ?.addEventListener(
            'click',
            retryProducts
        );


    /*
     * Mobile navigation.
     */

    el(
        'mobile-menu-btn'
    )
        ?.addEventListener(
            'click',
            toggleMobileNav
        );


    document
        .querySelectorAll(
            '#mobile-nav a'
        )
        .forEach(
            link => {

                link.addEventListener(
                    'click',
                    closeMobileNav
                );

            }
        );


    /*
     * Semua tombol/link yang punya:
     *
     * data-direct-whatsapp
     *
     * otomatis menggunakan nomor WA
     * dari settings Supabase.
     */

    document
        .querySelectorAll(
            '[data-direct-whatsapp]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    openDirectWhatsApp
                );

            }
        );


    /*
     * ESC close overlay.
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


            closeCart();

            closeCheckout();

            closeMobileNav();

        }
    );

}


/* =========================================================
   INIT
   ========================================================= */

async function initDapurOzi() {

    bindEvents();

    loadCart();

    renderCurrentYear();

    renderCart();

    updateCheckoutShippingOptions();


    try {

        await Promise.all([

            loadStoreStatus(),

            loadProducts(),

            loadCategories()

        ]);


        state.initialized =
            true;


        renderStoreStatus();

        renderCategories();

        renderProducts();

        renderCart();

        renderHeroImage();

        updateCheckoutShippingOptions();


        console.log(
            'Dapur Ozi Store initialized.'
        );


        console.log(
            'Store WhatsApp:',
            getStoreWhatsApp()
                ? 'configured'
                : 'not configured'
        );


        dispatchCartUpdated();


    } catch (error) {

        console.error(
            'Dapur Ozi initialization failed:',
            error
        );


        showProductsError(
            error
        );


    } finally {

        hidePageLoader();

    }

}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.DapurOzi = {

    state,

    supabase:
        supabaseClient,

    loadProducts,

    loadCategories,

    loadStoreStatus,

    isStoreOpen,

    getStoreMessage,

    getStoreWhatsApp,

    openDirectWhatsApp,

    addToCart,

    removeFromCart,

    updateCartQuantity,

    clearCart,

    getCartItemCount,

    getCartSubtotal,

    getCartItemsDetailed,

    getAvailableShippingTypes,

    validateShippingForCart,

    createOrder,

    buildWhatsAppOrderMessage,

    redirectToWhatsApp,

    openCart,

    closeCart,

    openCheckout,

    closeCheckout

};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initDapurOzi
);
