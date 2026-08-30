/* =========================================================
   DAPUR OZI
   CUSTOMER STOREFRONT v3
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

const DapurOziState = {

    products: [],

    categories: [],

    settings: null,

    cart: [],

    currentOrder: null,

    currentCategory:
        'all',

    initialized:
        false

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

    element.classList.remove(
        'hidden'
    );

}


function hideElement(element) {

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
        getById(id);

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
        rawCode
            .split(':')[0];


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
            'Nama wajib diisi.',

        CUSTOMER_PHONE_REQUIRED:
            'Nomor WhatsApp wajib diisi.',

        INVALID_SHIPPING_TYPE:
            'Metode pengiriman tidak valid.',

        ORDER_CREATION_FAILED:
            'Pesanan gagal dibuat.'

    };


    if (
        messages[code]
    ) {

        return detail
            ? `${messages[code]} (${detail})`
            : messages[code];

    }


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
            .from(
                'products'
            )
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
                    ascending:
                        true
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
            .from(
                'categories'
            )
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
        DapurOziState
            .products
            .find(
                product =>
                    product.id ===
                    productId
            ) ||
        null
    );

}


function getCategory(categoryId) {

    return (
        DapurOziState
            .categories
            .find(
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
            ...DapurOziState.products
        ];

    }


    return DapurOziState
        .products
        .filter(
            product =>
                product.category_id ===
                categoryId
        );

}


function getFeaturedProducts() {

    return DapurOziState
        .products
        .filter(
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
            'Local Delivery',

        NATIONAL:
            'National Delivery',

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
   STOCK
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

            return (
                DapurOziState.cart
            );

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


    return (
        DapurOziState.cart
    );

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

        return (
            DapurOziState.cart
        );

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


    return (
        DapurOziState.cart
    );

}


/* =========================================================
   CART OPERATIONS
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
        DapurOziState
            .cart
            .find(
                item =>
                    item.product_id ===
                    productId
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

        DapurOziState
            .cart
            .push({

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

    dispatchCartUpdated();


    return (
        DapurOziState.cart
    );

}


function removeFromCart(
    productId
) {

    DapurOziState.cart =
        DapurOziState
            .cart
            .filter(
                item =>
                    item.product_id !==
                    productId
            );


    saveCart();

    renderCart();

    dispatchCartUpdated();


    return (
        DapurOziState.cart
    );

}


function updateCartQuantity(
    productId,
    quantity
) {

    const item =
        DapurOziState
            .cart
            .find(
                cartItem =>
                    cartItem.product_id ===
                    productId
            );


    if (!item) {

        return (
            DapurOziState.cart
        );

    }


    const qty =
        Number(
            quantity
        );


    if (
        !Number.isInteger(qty)
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

    dispatchCartUpdated();


    return (
        DapurOziState.cart
    );

}


function clearCart() {

    DapurOziState.cart =
        [];


    saveCart();

    renderCart();

    dispatchCartUpdated();


    return (
        DapurOziState.cart
    );

}


/* =========================================================
   CART TOTALS
   ========================================================= */

function getCartItemCount() {

    return DapurOziState
        .cart
        .reduce(
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

    return DapurOziState
        .cart
        .reduce(
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


function getCartTotal() {

    return getCartSubtotal();

}


function getCartItemsDetailed() {

    return DapurOziState
        .cart
        .map(
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
   VALIDATE CART
   ========================================================= */

function validateCart() {

    if (
        !DapurOziState
            .cart
            .length
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


        if (
            product.status ===
                'READY' &&
            Number(
                item.quantity
            ) >
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


    const items =
        DapurOziState
            .cart
            .map(
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


    return orderId;

}


/* =========================================================
   PRODUCT UI
   ========================================================= */

function renderCategories() {

    const container =
        getById(
            'category-filter'
        );


    if (!container) {
        return;
    }


    const allButton = `
        <button
            type="button"
            class="category-button ${
                DapurOziState.currentCategory ===
                'all'
                    ? 'active'
                    : ''
            }"
            data-category="all"
        >
            Semua
        </button>
    `;


    const categoryButtons =
        DapurOziState
            .categories
            .map(
                category => `

                    <button
                        type="button"
                        class="category-button ${
                            DapurOziState.currentCategory ===
                            category.id
                                ? 'active'
                                : ''
                        }"
                        data-category="${category.id}"
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
        categoryButtons;

}


/* =========================================================
   PRODUCT CARD
   ========================================================= */

function renderProducts() {

    const grid =
        getById(
            'product-grid'
        );


    const loading =
        getById(
            'products-loading'
        );


    const error =
        getById(
            'products-error'
        );


    const empty =
        getById(
            'products-empty'
        );


    if (!grid) {
        return;
    }


    hideElement(
        loading
    );


    hideElement(
        error
    );


    const products =
        getProductsByCategory(
            DapurOziState
                .currentCategory
        );


    if (
        !products.length
    ) {

        grid.innerHTML =
            '';

        showElement(
            empty
        );

        return;

    }


    hideElement(
        empty
    );


    grid.innerHTML =
        products
            .map(
                product => {

                    const available =
                        isProductAvailable(
                            product
                        );


                    const stockLabel =
                        product.status ===
                        'PRE_ORDER'
                            ? 'Pre-order'
                            : getStockLabel(
                                product.stock
                            );


                    const category =
                        getCategory(
                            product.category_id
                        );


                    return `

                        <article
                            class="product-card"
                            data-product-id="${product.id}"
                        >

                            <div class="product-image-wrap">

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
                                            <div class="product-image-placeholder">
                                                <span>DAPUR OZI</span>
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
                                            <span class="product-featured-badge">
                                                Pilihan
                                            </span>
                                        `

                                        : ''
                                }


                                <span
                                    class="product-status-badge status-${product.status.toLowerCase().replaceAll('_', '-')}"
                                >
                                    ${escapeHTML(
                                        getProductStatusLabel(
                                            product.status
                                        )
                                    )}
                                </span>

                            </div>


                            <div class="product-card-body">

                                <div class="product-card-top">

                                    ${
                                        category
                                            ? `
                                                <span class="product-category">
                                                    ${escapeHTML(
                                                        category.name
                                                    )}
                                                </span>
                                            `
                                            : ''
                                    }


                                    <span class="product-stock-label">
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
                                            <p class="product-description">
                                                ${escapeHTML(
                                                    product.description
                                                )}
                                            </p>
                                        `

                                        : ''
                                }


                                <div class="product-meta">

                                    <span>
                                        ${escapeHTML(
                                            getShippingLabel(
                                                product.shipping_type
                                            )
                                        )}
                                    </span>

                                    <span>
                                        ${escapeHTML(
                                            product.delivery_class ===
                                            'FRESH'
                                                ? 'Fresh'
                                                : 'Dry'
                                        )}
                                    </span>

                                </div>


                                <div class="product-card-footer">

                                    <strong class="product-price">
                                        ${formatCurrency(
                                            product.price
                                        )}
                                    </strong>


                                    <button
                                        type="button"
                                        class="button button-primary product-add-btn"
                                        data-action="add-to-cart"
                                        data-product-id="${product.id}"
                                        ${
                                            available
                                                ? ''
                                                : 'disabled'
                                        }
                                    >
                                        ${
                                            available
                                                ? '+ Keranjang'
                                                : 'Habis'
                                        }
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
        getById(
            'hero-image'
        );


    const placeholder =
        getById(
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
        DapurOziState
            .products
            .find(
                product =>
                    Boolean(
                        product.image_url
                    )
            );


    const product =
        featured ||
        fallback;


    if (
        !product?.image_url
    ) {

        image.removeAttribute(
            'src'
        );

        hideElement(
            image
        );

        showElement(
            placeholder
        );

        return;

    }


    image.src =
        product.image_url;


    image.alt =
        product.name;


    showElement(
        image
    );


    hideElement(
        placeholder
    );

}


/* =========================================================
   STORE NOTICE
   ========================================================= */

function renderStoreStatus() {

    const notice =
        getById(
            'store-notice'
        );


    const text =
        getById(
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

        hideElement(
            notice
        );

    } else {

        text.textContent =
            getStoreMessage() ||
            'Dapur Ozi sedang tutup.';


        showElement(
            notice
        );

    }


    const checkoutButton =
        getById(
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
   CART UI
   ========================================================= */

function renderCart() {

    const container =
        getById(
            'cart-items'
        );


    const empty =
        getById(
            'cart-empty'
        );


    const footer =
        getById(
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

        showElement(
            empty
        );

        hideElement(
            footer
        );

        return;

    }


    hideElement(
        empty
    );


    showElement(
        footer
    );


    container.innerHTML =
        items
            .map(
                item => {

                    const product =
                        item.product;


                    return `

                        <div
                            class="cart-item"
                            data-product-id="${item.product_id}"
                        >

                            <div class="cart-item-image">

                                ${
                                    product?.image_url

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
                                            <div class="cart-item-placeholder">
                                                DO
                                            </div>
                                        `
                                }

                            </div>


                            <div class="cart-item-content">

                                <div class="cart-item-header">

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
                                        data-product-id="${item.product_id}"
                                        aria-label="Hapus ${escapeHTML(
                                            item.product_name
                                        )}"
                                    >
                                        ×
                                    </button>

                                </div>


                                <div class="cart-item-footer">

                                    <div class="quantity-control">

                                        <button
                                            type="button"
                                            data-action="decrease-cart"
                                            data-product-id="${item.product_id}"
                                            aria-label="Kurangi jumlah"
                                        >
                                            −
                                        </button>


                                        <span>
                                            ${item.quantity}
                                        </span>


                                        <button
                                            type="button"
                                            data-action="increase-cart"
                                            data-product-id="${item.product_id}"
                                            aria-label="Tambah jumlah"
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
   OPEN / CLOSE CART
   ========================================================= */

function openCart() {

    const drawer =
        getById(
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


    document.body.classList.add(
        'cart-open'
    );

}


function closeCart() {

    const drawer =
        getById(
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


    document.body.classList.remove(
        'cart-open'
    );

}


/* =========================================================
   CHECKOUT UI
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


        renderCheckoutSummary();


        const modal =
            getById(
                'checkout-modal'
            );


        if (!modal) {
            return;
        }


        modal.classList.remove(
            'hidden'
        );


        document.body.classList.add(
            'modal-open'
        );


        setTimeout(
            () => {

                getById(
                    'customer-name'
                )?.focus();

            },
            100
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

    const modal =
        getById(
            'checkout-modal'
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        'hidden'
    );


    document.body.classList.remove(
        'modal-open'
    );

}


/* =========================================================
   CHECKOUT SUMMARY
   ========================================================= */

function renderCheckoutSummary() {

    const container =
        getById(
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

                    <div class="checkout-item">

                        <div>

                            <strong>
                                ${escapeHTML(
                                    item.product_name
                                )}
                            </strong>

                            <span>
                                ${item.quantity}
                                ×
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
            getCartTotal()
        )
    );

}


/* =========================================================
   SHIPPING FIELD
   ========================================================= */

function handleShippingChange() {

    const shipping =
        getById(
            'shipping-type'
        );


    const addressGroup =
        getById(
            'address-group'
        );


    const address =
        getById(
            'customer-address'
        );


    if (
        !shipping ||
        !addressGroup ||
        !address
    ) {

        return;

    }


    const pickup =
        shipping.value ===
        'PICKUP';


    addressGroup.classList.toggle(
        'hidden',
        pickup
    );


    address.required =
        !pickup;


    if (pickup) {

        address.value =
            '';

    }

}


/* =========================================================
   CHECKOUT VALIDATION
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
        getById(
            'checkout-error'
        );


    if (general) {

        general.textContent =
            '';

        hideElement(
            general
        );

    }

}


function validateCheckoutForm() {

    clearCheckoutErrors();


    const name =
        getById(
            'customer-name'
        )?.value
            .trim() ||
        '';


    const phone =
        getById(
            'customer-phone'
        )?.value
            .trim() ||
        '';


    const shipping =
        getById(
            'shipping-type'
        )?.value ||
        '';


    let valid =
        true;


    if (!name) {

        setText(
            'customer-name-error',
            'Nama wajib diisi.'
        );

        valid =
            false;

    }


    if (!phone) {

        setText(
            'customer-phone-error',
            'Nomor WhatsApp wajib diisi.'
        );

        valid =
            false;

    }


    if (
        !isValidShippingType(
            shipping
        )
    ) {

        setText(
            'shipping-type-error',
            'Pilih metode pengiriman.'
        );

        valid =
            false;

    }


    return valid;

}


/* =========================================================
   SUBMIT CHECKOUT
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


    const submitButton =
        getById(
            'submit-order-btn'
        );


    const submitText =
        getById(
            'submit-order-text'
        );


    const submitLoading =
        getById(
            'submit-order-loading'
        );


    const errorBox =
        getById(
            'checkout-error'
        );


    try {

        if (submitButton) {

            submitButton.disabled =
                true;

        }


        hideElement(
            submitText
        );


        showElement(
            submitLoading
        );


        const shippingType =
            getById(
                'shipping-type'
            ).value;


        const orderId =
            await createOrder({

                customerName:
                    getById(
                        'customer-name'
                    ).value,

                customerPhone:
                    getById(
                        'customer-phone'
                    ).value,

                customerArea:
                    getById(
                        'customer-area'
                    ).value,

                customerAddress:
                    shippingType ===
                    'PICKUP'
                        ? null
                        : getById(
                            'customer-address'
                        ).value,

                customerNote:
                    getById(
                        'customer-note'
                    ).value,

                shippingType

            });


        closeCheckout();


        showSuccessModal(
            orderId
        );


        getById(
            'checkout-form'
        )?.reset();


        handleShippingChange();


    } catch (error) {

        console.error(
            error
        );


        const message =
            getFriendlyErrorMessage(
                error
            );


        if (errorBox) {

            errorBox.textContent =
                message;


            showElement(
                errorBox
            );

        }


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

        }


        showElement(
            submitText
        );


        hideElement(
            submitLoading
        );

    }

}


/* =========================================================
   SUCCESS MODAL
   ========================================================= */

function showSuccessModal(
    orderId
) {

    setText(
        'success-order-number',
        orderId
    );


    const modal =
        getById(
            'success-modal'
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        'hidden'
    );


    document.body.classList.add(
        'modal-open'
    );

}


function closeSuccessModal() {

    const modal =
        getById(
            'success-modal'
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        'hidden'
    );


    document.body.classList.remove(
        'modal-open'
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
        getById(
            'toast'
        );


    const icon =
        getById(
            'toast-icon'
        );


    const text =
        getById(
            'toast-message'
        );


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
            type ===
            'error'
                ? '!'
                : '✓';

    }


    toast.classList.remove(
        'show',
        'error',
        'success'
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
   MOBILE NAV
   ========================================================= */

function toggleMobileNav() {

    const button =
        getById(
            'mobile-menu-btn'
        );


    const nav =
        getById(
            'mobile-nav'
        );


    if (
        !button ||
        !nav
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

    const button =
        getById(
            'mobile-menu-btn'
        );


    const nav =
        getById(
            'mobile-nav'
        );


    if (!nav) {
        return;
    }


    nav.classList.remove(
        'open'
    );


    button?.setAttribute(
        'aria-expanded',
        'false'
    );

}


/* =========================================================
   PAGE LOADER
   ========================================================= */

function hidePageLoader() {

    const loader =
        getById(
            'page-loader'
        );


    if (!loader) {
        return;
    }


    loader.classList.add(
        'hidden'
    );

}


/* =========================================================
   PRODUCTS ERROR
   ========================================================= */

function showProductsError(
    error
) {

    hideElement(
        getById(
            'products-loading'
        )
    );


    hideElement(
        getById(
            'products-empty'
        )
    );


    showElement(
        getById(
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
   RETRY PRODUCTS
   ========================================================= */

async function retryProducts() {

    showElement(
        getById(
            'products-loading'
        )
    );


    hideElement(
        getById(
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


    renderStoreStatus();

    renderCategories();

    renderProducts();

    renderCart();

    renderHeroImage();


    return {

        settings,

        products,

        categories

    };

}


/* =========================================================
   CLICK HANDLER
   ========================================================= */

async function handleGlobalClick(
    event
) {

    const actionButton =
        event.target.closest(
            '[data-action]'
        );


    if (actionButton) {

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
                    'Produk ditambahkan ke keranjang.'
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


            if (
                action ===
                'increase-cart'
            ) {

                const item =
                    DapurOziState
                        .cart
                        .find(
                            cartItem =>
                                cartItem.product_id ===
                                productId
                        );


                if (item) {

                    updateCartQuantity(
                        productId,
                        Number(
                            item.quantity
                        ) + 1
                    );

                }


                return;

            }


            if (
                action ===
                'decrease-cart'
            ) {

                const item =
                    DapurOziState
                        .cart
                        .find(
                            cartItem =>
                                cartItem.product_id ===
                                productId
                        );


                if (item) {

                    updateCartQuantity(
                        productId,
                        Number(
                            item.quantity
                        ) - 1
                    );

                }


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

        DapurOziState.currentCategory =
            categoryButton
                .dataset
                .category;


        renderCategories();

        renderProducts();

    }

}


/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function bindEvents() {

    /* GLOBAL */

    document.addEventListener(
        'click',
        handleGlobalClick
    );


    /* CART */

    getById(
        'open-cart-btn'
    )?.addEventListener(
        'click',
        openCart
    );


    getById(
        'footer-cart-btn'
    )?.addEventListener(
        'click',
        openCart
    );


    getById(
        'close-cart-btn'
    )?.addEventListener(
        'click',
        closeCart
    );


    getById(
        'cart-overlay'
    )?.addEventListener(
        'click',
        closeCart
    );


    getById(
        'start-shopping-btn'
    )?.addEventListener(
        'click',
        () => {

            closeCart();


            getById(
                'menu'
            )?.scrollIntoView({
                behavior:
                    'smooth'
            });

        }
    );


    /* CHECKOUT */

    getById(
        'checkout-btn'
    )?.addEventListener(
        'click',
        openCheckout
    );


    getById(
        'close-checkout-btn'
    )?.addEventListener(
        'click',
        closeCheckout
    );


    getById(
        'checkout-modal-backdrop'
    )?.addEventListener(
        'click',
        closeCheckout
    );


    getById(
        'shipping-type'
    )?.addEventListener(
        'change',
        handleShippingChange
    );


    getById(
        'checkout-form'
    )?.addEventListener(
        'submit',
        handleCheckoutSubmit
    );


    /* SUCCESS */

    getById(
        'close-success-btn'
    )?.addEventListener(
        'click',
        closeSuccessModal
    );


    /* RETRY */

    getById(
        'retry-products-btn'
    )?.addEventListener(
        'click',
        retryProducts
    );


    /* MOBILE */

    getById(
        'mobile-menu-btn'
    )?.addEventListener(
        'click',
        toggleMobileNav
    );


    queryAll(
        '#mobile-nav a'
    ).forEach(
        link => {

            link.addEventListener(
                'click',
                closeMobileNav
            );

        }
    );


    /* ESC */

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

            closeSuccessModal();

            closeMobileNav();

        }
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
   INITIALIZATION
   ========================================================= */

async function initDapurOzi() {

    bindEvents();

    loadCart();

    renderCurrentYear();

    renderCart();

    handleShippingChange();


    try {

        await Promise.all([

            loadStoreStatus(),

            loadProducts(),

            loadCategories()

        ]);


        DapurOziState.initialized =
            true;


        renderStoreStatus();

        renderCategories();

        renderProducts();

        renderCart();

        renderHeroImage();


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


        showProductsError(
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

    } finally {

        hidePageLoader();

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

    loadCategories,

    getProduct,

    getCategory,

    getProductsByCategory,

    getFeaturedProducts,

    isProductAvailable,

    isPreOrderProduct,

    getProductStatusLabel,


    /* STOCK */

    getStockStatus,

    getStockLabel,


    /* SHIPPING */

    SHIPPING_TYPES,

    isValidShippingType,

    getShippingLabel,


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


    /* CHECKOUT */

    createOrder,


    /* UI */

    renderCategories,

    renderProducts,

    renderCart,

    renderStoreStatus,

    openCart,

    closeCart,

    openCheckout,

    closeCheckout,


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
