// ======================================================
// WINBRO LIFESTYLE - COMPLETE FRONTEND SCRIPT
// BACKEND CONNECTED + ADMIN AUTH VERSION
// ======================================================


// ======================================================
// DEMO DATA
// ======================================================

const products = [
    {
        id: 1,
        name: "Premium Oversized T-Shirt",
        category: "T-Shirt",
        price: 850,
        stock: 35,
        size: "S, M, L, XL",
        emoji: "👕",
        image: "tshirt.png"
    },
    {
        id: 2,
        name: "Classic Oxford Shirt",
        category: "Shirt",
        price: 1250,
        stock: 18,
        size: "M, L, XL",
        emoji: "👔",
        image: "shirt.png"
    },
    {
        id: 3,
        name: "Relaxed Fit Jeans",
        category: "Jeans",
        price: 1850,
        stock: 8,
        size: "30, 32, 34, 36",
        emoji: "👖",
        image: "jeans.png"
    },
    {
        id: 4,
        name: "Essential Polo Shirt",
        category: "Polo",
        price: 950,
        stock: 25,
        size: "S, M, L, XL",
        emoji: "👕",
        image: "polo.png"
    },
    {
        id: 5,
        name: "Cotton Panjabi",
        category: "Panjabi",
        price: 1450,
        stock: 6,
        size: "M, L, XL",
        emoji: "🥻",
        image: "panjabi.png"
    },
    {
        id: 6,
        name: "Denim Jacket",
        category: "Jacket",
        price: 2200,
        stock: 12,
        size: "M, L, XL",
        emoji: "🧥",
        image: "jacket.png"
    },
    {
        id: 7,
        name: "Classic Black Hoodie",
        category: "Hoodie",
        price: 1650,
        stock: 20,
        size: "M, L, XL",
        emoji: "🧥",
        image: "hoodie.png"
    }
];


const orders = [
    {
        id: "WB-1001",
        customer: "Rahim Ahmed",
        date: "30 Sep 2026",
        amount: 1850,
        status: "Delivered"
    },
    {
        id: "WB-1002",
        customer: "Nusrat Jahan",
        date: "30 Sep 2026",
        amount: 2200,
        status: "Processing"
    },
    {
        id: "WB-1003",
        customer: "Tanvir Hasan",
        date: "30 Sep 2026",
        amount: 1450,
        status: "Pending"
    },
    {
        id: "WB-1004",
        customer: "Sadia Islam",
        date: "29 Sep 2026",
        amount: 1250,
        status: "Delivered"
    }
];


const customers = [
    {
        name: "Rahim Ahmed",
        phone: "01712345678",
        email: "rahim@example.com",
        orders: 3
    },
    {
        name: "Nusrat Jahan",
        phone: "01812345678",
        email: "nusrat@example.com",
        orders: 2
    },
    {
        name: "Tanvir Hasan",
        phone: "01912345678",
        email: "tanvir@example.com",
        orders: 1
    },
    {
        name: "Sadia Islam",
        phone: "01612345678",
        email: "sadia@example.com",
        orders: 4
    }
];


let cart = [];
let favorites = [];


// ======================================================
// ADMIN LOGIN STATE
// ======================================================

const adminToken =
    () => sessionStorage.getItem("winbroAdminToken");

const isAdmin =
    () =>
        sessionStorage.getItem(
            "winbroAdminLoggedIn"
        ) === "true";


// ======================================================
// BACKEND API
// ======================================================

const API_BASE = "/api";


// ======================================================
// NORMAL PUBLIC API REQUEST
// Used by customers
// ======================================================

async function apiRequest(path, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const response =
        await fetch(
            `${API_BASE}${path}`,
            {
                ...options,
                headers
            }
        );


    let data = null;

    try {
        data = await response.json();
    }

    catch (error) {
        data = null;
    }


    if (!response.ok) {

        throw new Error(
            data?.message ||
            data?.error ||
            `Request failed: ${response.status}`
        );

    }


    return data;
}


// ======================================================
// ADMIN API REQUEST
// Token automatically added
// ======================================================

async function adminFetch(path, options = {}) {

    const token =
        adminToken();


    if (!token) {

        sessionStorage.removeItem(
            "winbroAdminLoggedIn"
        );

        window.location.href =
            "admin.html";

        throw new Error(
            "Admin login required."
        );

    }


    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {}),

        "Authorization":
            `Bearer ${token}`

    };


    const response =
        await fetch(
            `${API_BASE}${path}`,
            {
                ...options,
                headers
            }
        );


    let data = null;

    try {

        data =
            await response.json();

    }

    catch (error) {

        data = null;

    }


    // ==============================================
    // TOKEN INVALID / EXPIRED
    // ==============================================

    if (response.status === 401) {

        sessionStorage.removeItem(
            "winbroAdminToken"
        );

        sessionStorage.removeItem(
            "winbroAdminLoggedIn"
        );


        showToast(
            "Admin session expired. Please login again."
        );


        setTimeout(
            () => {
                window.location.href =
                    "admin.html";
            },
            500
        );


        throw new Error(
            "Admin session expired."
        );

    }


    if (!response.ok) {

        throw new Error(
            data?.message ||
            data?.error ||
            `Request failed: ${response.status}`
        );

    }


    return data;
}


// ======================================================
// HANDLE DIFFERENT BACKEND RESPONSE FORMATS
// ======================================================

function getArrayResponse(data, key) {

    if (Array.isArray(data)) {

        return data;

    }


    if (Array.isArray(data?.[key])) {

        return data[key];

    }


    return [];
}


function getObjectResponse(data, key) {

    if (data?.[key]) {

        return data[key];

    }


    return data;
}


// ======================================================
// LOAD BACKEND DATA
// ======================================================

async function loadBackendData() {

    try {

        // ==========================================
        // PRODUCTS ARE PUBLIC
        // ==========================================

        const productsResponse =
            await apiRequest(
                "/products"
            );


        const backendProducts =
            getArrayResponse(
                productsResponse,
                "products"
            );


        if (backendProducts.length > 0) {

            products.splice(
                0,
                products.length,
                ...backendProducts
            );

        }


        // ==========================================
        // ADMIN DATA
        // Only load if admin is logged in
        // ==========================================

        if (isAdmin()) {

            try {

                const [
                    ordersResponse,
                    customersResponse
                ] =
                    await Promise.all([

                        adminFetch(
                            "/orders"
                        ),

                        adminFetch(
                            "/customers"
                        )

                    ]);


                const backendOrders =
                    getArrayResponse(
                        ordersResponse,
                        "orders"
                    );


                const backendCustomers =
                    getArrayResponse(
                        customersResponse,
                        "customers"
                    );


                if (
                    backendOrders.length > 0
                ) {

                    orders.splice(
                        0,
                        orders.length,
                        ...backendOrders
                    );

                }


                if (
                    backendCustomers.length > 0
                ) {

                    customers.splice(
                        0,
                        customers.length,
                        ...backendCustomers
                    );

                }

            }

            catch (adminError) {

                console.error(
                    "Admin data load error:",
                    adminError
                );

            }

        }


        // ==========================================
        // RENDER
        // ==========================================

        renderShopProducts();

        renderProductTable();

        renderOrders();

        renderRecentOrders();

        renderCustomers();

        renderStockAlerts();

        updateStats();

        updateCart();

    }

    catch (error) {

        console.error(
            "Backend load error:",
            error
        );


        showToast(
            "Backend data could not be loaded."
        );

    }

}


// ======================================================
// BASIC HELPERS
// ======================================================

function money(amount) {

    return "৳" +
        Number(
            amount || 0
        ).toLocaleString(
            "en-BD"
        );

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ======================================================
// NAVIGATION
// ======================================================

const navLinks =
    document.querySelectorAll(
        ".nav-link"
    );


const pages =
    document.querySelectorAll(
        ".page"
    );


const pageTitle =
    document.getElementById(
        "page-title"
    );


navLinks.forEach(
    link => {

        link.addEventListener(
            "click",
            () => {

                const pageName =
                    link.dataset.page;


                // ======================================
                // Prevent customer from opening
                // admin-only pages manually
                // ======================================

                const adminPages = [
                    "dashboard",
                    "products",
                    "orders",
                    "customers"
                ];


                if (
                    adminPages.includes(
                        pageName
                    ) &&
                    !isAdmin()
                ) {

                    showToast(
                        "Admin login required."
                    );

                    return;

                }


                navLinks.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                link.classList.add(
                    "active"
                );


                pages.forEach(
                    page => {

                        page.classList.add(
                            "hidden"
                        );

                    }
                );


                const selectedPage =
                    document.getElementById(
                        pageName
                    );


                if (selectedPage) {

                    selectedPage.classList.remove(
                        "hidden"
                    );

                }


                if (pageTitle) {

                    pageTitle.textContent =
                        pageName
                            .charAt(0)
                            .toUpperCase() +
                        pageName.slice(1);

                }


                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }
);


// ======================================================
// DATA-GO BUTTONS
// ======================================================

document
    .querySelectorAll(
        "[data-go]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const pageName =
                        button.dataset.go;


                    const navButton =
                        document.querySelector(
                            `.nav-link[data-page="${pageName}"]`
                        );


                    if (navButton) {

                        navButton.click();

                    }

                }
            );

        }
    );


// ======================================================
// DATE
// ======================================================

const todayElement =
    document.getElementById(
        "today"
    );


if (todayElement) {

    const today =
        new Date();


    todayElement.textContent =
        today.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}


// ======================================================
// SHOP PRODUCTS
// ======================================================

function renderShopProducts(
    list = products
) {

    const container =
        document.getElementById(
            "shop-products"
        );


    if (!container) return;


    if (!list.length) {

        container.innerHTML = `

            <div class="empty-shop">

                <h3>
                    No products found
                </h3>

                <p>
                    Try another search.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML =
        list.map(
            product => {

                const image =
                    product.image ||
                    "tshirt.png";


                return `

                    <article
                        class="product-card"
                        data-product-id="${product.id}"
                    >

                        <div class="product-image">

                            <img
                                src="${escapeHTML(image)}"
                                class="product-real-image"
                                alt="${escapeHTML(product.name)}"
                                onerror="this.src='tshirt.png'"
                            >

                        </div>


                        <div class="product-info">

                            <small
                                class="product-category"
                            >
                                ${escapeHTML(
                                    product.category
                                )}
                            </small>


                            <h3>
                                ${escapeHTML(
                                    product.name
                                )}
                            </h3>


                            <p class="product-size">
                                Size:
                                ${escapeHTML(
                                    product.size ||
                                    "N/A"
                                )}
                            </p>


                            <div
                                class="product-bottom"
                            >

                                <strong
                                    class="product-price"
                                >
                                    ${money(
                                        product.price
                                    )}
                                </strong>

                            </div>


                            <button
                                class="add-cart"
                                data-add-cart="${product.id}"
                            >
                                🛒 Add to Cart
                            </button>

                        </div>

                    </article>

                `;

            }
        ).join("");

}


// ======================================================
// ADD TO CART
// ======================================================

function addToCart(
    productId,
    selectedSize = null
) {

    const product =
        products.find(
            item =>
                Number(item.id) ===
                Number(productId)
        );


    if (!product) {

        showToast(
            "Product not found."
        );

        return;

    }


    if (
        Number(product.stock) <= 0
    ) {

        showToast(
            "Product is out of stock."
        );

        return;

    }


    const size =
        selectedSize ||
        product.size
            ?.split(",")[0]
            ?.trim() ||
        "";


    const existing =
        cart.find(
            item =>
                Number(item.id) ===
                Number(product.id) &&
                String(item.selectedSize) ===
                String(size)
        );


    if (existing) {

        if (
            existing.quantity <
            Number(product.stock)
        ) {

            existing.quantity++;

        }

        else {

            showToast(
                "No more stock available."
            );

            return;

        }

    }

    else {

        cart.push({

            ...product,

            selectedSize:
                size,

            quantity: 1

        });

    }


    updateCart();


    showToast(
        `${product.name} added to cart 🛒`
    );

}


// ======================================================
// REMOVE CART
// ======================================================

function removeFromCart(
    productId,
    selectedSize = null
) {

    cart =
        cart.filter(
            item => {

                const sameProduct =
                    Number(item.id) ===
                    Number(productId);


                const sameSize =
                    selectedSize === null ||
                    String(
                        item.selectedSize
                    ) ===
                    String(
                        selectedSize
                    );


                return !(
                    sameProduct &&
                    sameSize
                );

            }
        );


    updateCart();

}


// ======================================================
// CHANGE QUANTITY
// ======================================================

function changeQuantity(
    productId,
    change,
    selectedSize = null
) {

    const item =
        cart.find(
            product => {

                const sameProduct =
                    Number(product.id) ===
                    Number(productId);


                const sameSize =
                    selectedSize === null ||
                    String(
                        product.selectedSize
                    ) ===
                    String(
                        selectedSize
                    );


                return (
                    sameProduct &&
                    sameSize
                );

            }
        );


    if (!item) return;


    item.quantity += change;


    if (
        item.quantity <= 0
    ) {

        removeFromCart(
            productId,
            item.selectedSize
        );

        return;

    }


    if (
        item.quantity >
        Number(item.stock)
    ) {

        item.quantity =
            Number(item.stock);


        showToast(
            "Maximum stock reached."
        );

    }


    updateCart();

}


// ======================================================
// UPDATE CART
// ======================================================

function updateCart() {

    const cartItems =
        document.getElementById(
            "cart-items"
        );


    const cartTotal =
        document.getElementById(
            "cart-total"
        );


    const totalQuantity =
        cart.reduce(
            (
                sum,
                item
            ) =>
                sum +
                Number(
                    item.quantity
                ),
            0
        );


    const cartCount =
        document.getElementById(
            "cart-count"
        );


    if (cartCount) {

        cartCount.textContent =
            totalQuantity;

    }


    document
        .querySelectorAll(
            ".cart-count"
        )
        .forEach(
            element => {

                element.textContent =
                    totalQuantity;

            }
        );


    if (!cartItems) return;


    if (!cart.length) {

        cartItems.innerHTML = `

            <div class="empty-cart">

                <div>🛒</div>

                <h3>
                    Your cart is empty
                </h3>

                <p>
                    Add some WinBro products
                    to your cart.
                </p>

            </div>

        `;

    }

    else {

        cartItems.innerHTML =
            cart.map(
                item => `

                    <div class="cart-item">

                        <div
                            class="cart-item-image"
                        >
                            ${
                                item.emoji ||
                                "👕"
                            }
                        </div>


                        <div
                            class="cart-item-info"
                        >

                            <strong>
                                ${escapeHTML(
                                    item.name
                                )}
                            </strong>


                            <small>
                                ${money(
                                    item.price
                                )}
                            </small>


                            <small>
                                Size:
                                ${escapeHTML(
                                    item.selectedSize ||
                                    "N/A"
                                )}
                            </small>


                            <div
                                class="quantity-control"
                            >

                                <button
                                    data-minus="${item.id}"
                                    data-size="${escapeHTML(
                                        item.selectedSize || ""
                                    )}"
                                >
                                    −
                                </button>


                                <span>
                                    ${item.quantity}
                                </span>


                                <button
                                    data-plus="${item.id}"
                                    data-size="${escapeHTML(
                                        item.selectedSize || ""
                                    )}"
                                >
                                    +
                                </button>


                                <button
                                    class="remove-cart"
                                    data-remove="${item.id}"
                                    data-size="${escapeHTML(
                                        item.selectedSize || ""
                                    )}"
                                >
                                    Remove
                                </button>

                            </div>

                        </div>


                        <strong
                            class="cart-item-total"
                        >

                            ${money(
                                Number(
                                    item.price
                                ) *
                                Number(
                                    item.quantity
                                )
                            )}

                        </strong>

                    </div>

                `
            ).join("");

    }


    const total =
        cart.reduce(
            (
                sum,
                item
            ) =>
                sum +
                Number(item.price) *
                Number(item.quantity),
            0
        );


    if (cartTotal) {

        cartTotal.textContent =
            money(total);

    }

}


// ======================================================
// CART EVENTS
// ======================================================

document.addEventListener(
    "click",
    event => {

        const addButton =
            event.target.closest(
                "[data-add-cart]"
            );


        if (addButton) {

            addToCart(
                addButton.dataset.addCart
            );

            return;

        }


        const removeButton =
            event.target.closest(
                "[data-remove]"
            );


        if (removeButton) {

            removeFromCart(
                removeButton.dataset.remove,
                removeButton.dataset.size
            );

            return;

        }


        const minusButton =
            event.target.closest(
                "[data-minus]"
            );


        if (minusButton) {

            changeQuantity(
                minusButton.dataset.minus,
                -1,
                minusButton.dataset.size
            );

            return;

        }


        const plusButton =
            event.target.closest(
                "[data-plus]"
            );


        if (plusButton) {

            changeQuantity(
                plusButton.dataset.plus,
                1,
                plusButton.dataset.size
            );

            return;

        }

    }
);


// ======================================================
// CART OPEN / CLOSE
// ======================================================

function openCart() {

    const panel =
        document.getElementById(
            "cart-panel"
        );


    if (!panel) return;


    panel.classList.remove(
        "hidden"
    );


    updateCart();

}


function closeCart() {

    const panel =
        document.getElementById(
            "cart-panel"
        );


    if (!panel) return;


    panel.classList.add(
        "hidden"
    );

}


const cartButton =
    document.getElementById(
        "cart-button"
    );


if (cartButton) {

    cartButton.addEventListener(
        "click",
        openCart
    );

}


const closeCartButton =
    document.getElementById(
        "close-cart"
    );


if (closeCartButton) {

    closeCartButton.addEventListener(
        "click",
        closeCart
    );

}


// ======================================================
// CHECKOUT
// ======================================================

const checkoutButton =
    document.getElementById(
        "checkout-btn"
    );


const checkoutDialog =
    document.getElementById(
        "checkout-dialog"
    );


const checkoutForm =
    document.getElementById(
        "checkout-form"
    );


const checkoutSummary =
    document.getElementById(
        "checkout-summary"
    );


const closeCheckout =
    document.getElementById(
        "close-checkout"
    );


if (checkoutButton) {

    checkoutButton.addEventListener(
        "click",
        () => {

            if (!cart.length) {

                showToast(
                    "Your cart is empty."
                );

                return;

            }


            const total =
                cart.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        Number(
                            item.price
                        ) *
                        Number(
                            item.quantity
                        ),
                    0
                );


            if (checkoutSummary) {

                checkoutSummary.innerHTML = `

                    ${cart.map(
                        item => `

                            <div
                                class="checkout-item"
                            >

                                <span>

                                    ${escapeHTML(
                                        item.name
                                    )}

                                    ×
                                    ${item.quantity}

                                    · Size:
                                    ${escapeHTML(
                                        item.selectedSize ||
                                        ""
                                    )}

                                </span>


                                <strong>
                                    ${money(
                                        Number(
                                            item.price
                                        ) *
                                        Number(
                                            item.quantity
                                        )
                                    )}
                                </strong>

                            </div>

                        `
                    ).join("")}


                    <div
                        class="checkout-total"
                    >

                        <span>
                            Order Total
                        </span>


                        <strong>
                            ${money(total)}
                        </strong>

                    </div>

                `;

            }


            if (checkoutDialog) {

                checkoutDialog.showModal();

            }

        }
    );

}


if (closeCheckout) {

    closeCheckout.addEventListener(
        "click",
        () => {

            if (checkoutDialog) {

                checkoutDialog.close();

            }

        }
    );

}


// ======================================================
// PLACE ORDER
// ======================================================

if (checkoutForm) {

    checkoutForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const formData =
                new FormData(
                    checkoutForm
                );


            const customerName =
                formData.get(
                    "customerName"
                );


            const phone =
                formData.get(
                    "phone"
                );


            const address =
                formData.get(
                    "address"
                );


            const delivery =
                formData.get(
                    "delivery"
                );


            const payment =
                formData.get(
                    "payment"
                );


            if (
                !customerName ||
                !phone ||
                !address ||
                !delivery ||
                !payment
            ) {

                showToast(
                    "Please fill in all information."
                );

                return;

            }


            try {

                const response =
                    await apiRequest(
                        "/orders",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({

                                    customerName,

                                    phone,

                                    address,

                                    delivery,

                                    payment,

                                    items:
                                        cart.map(
                                            item => ({

                                                id:
                                                    item.id,

                                                quantity:
                                                    item.quantity,

                                                size:
                                                    item.selectedSize

                                            })
                                        )

                                })

                        }
                    );


                const order =
                    getObjectResponse(
                        response,
                        "order"
                    );


                if (checkoutDialog) {

                    checkoutDialog.close();

                }


                closeCart();


                cart = [];


                updateCart();


                checkoutForm.reset();


                // Refresh products from backend
                // This is public and works for customers.

                await loadBackendData();


                showToast(
                    `Order confirmed ${
                        order?.amount
                            ? "· " +
                              money(
                                  order.amount
                              )
                            : ""
                    } 🎉`
                );

            }

            catch (error) {

                console.error(
                    "Checkout error:",
                    error
                );


                showToast(
                    error.message ||
                    "Could not place order."
                );

            }

        }
    );

}


// ======================================================
// SEARCH
// ======================================================

const shopSearch =
    document.getElementById(
        "shop-search"
    );


if (shopSearch) {

    shopSearch.addEventListener(
        "input",
        () => {

            const keyword =
                shopSearch.value
                    .toLowerCase()
                    .trim();


            const filtered =
                products.filter(
                    product => {

                        return (

                            String(
                                product.name
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                            ||

                            String(
                                product.category
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                        );

                    }
                );


            renderShopProducts(
                filtered
            );

        }
    );

}


const productSearch =
    document.getElementById(
        "product-search"
    );


if (productSearch) {

    productSearch.addEventListener(
        "input",
        () => {

            const keyword =
                productSearch.value
                    .toLowerCase()
                    .trim();


            const filtered =
                products.filter(
                    product => {

                        return (

                            String(
                                product.name
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                            ||

                            String(
                                product.category
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                        );

                    }
                );


            renderProductTable(
                filtered
            );

        }
    );

}


// ======================================================
// CATEGORY FILTER
// ======================================================

document
    .querySelectorAll(
        ".category-card"
    )
    .forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    const category =
                        card.dataset.category;


                    if (
                        !category ||
                        category.toLowerCase() ===
                        "all"
                    ) {

                        renderShopProducts(
                            products
                        );

                        return;

                    }


                    const filtered =
                        products.filter(
                            product =>
                                String(
                                    product.category
                                )
                                    .toLowerCase() ===
                                category.toLowerCase()
                        );


                    renderShopProducts(
                        filtered
                    );


                    const productsTitle =
                        document.querySelector(
                            ".products-title"
                        );


                    if (productsTitle) {

                        productsTitle.scrollIntoView({
                            behavior: "smooth"
                        });

                    }

                }
            );

        }
    );


// ======================================================
// HERO BUTTON
// ======================================================

document
    .querySelectorAll(
        ".hero-btn, [data-category='all']"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    renderShopProducts(
                        products
                    );

                }
            );

        }
    );


// ======================================================
// ORDERS TABLE
// ======================================================

function renderOrders() {

    const table =
        document.getElementById(
            "orders-table"
        );


    if (!table) return;


    if (!orders.length) {

        table.innerHTML = `

            <tr>

                <td colspan="6">
                    No orders found.
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        orders.map(
            order => `

                <tr>

                    <td>

                        <strong>
                            ${escapeHTML(
                                order.id
                            )}
                        </strong>

                    </td>


                    <td>
                        ${escapeHTML(
                            order.customer
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            order.date
                        )}
                    </td>


                    <td>
                        ${money(
                            order.amount
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            order.status
                        )}
                    </td>


                    <td>

                        <button
                            class="view-order"
                            data-order="${escapeHTML(
                                order.id
                            )}"
                        >
                            View
                        </button>

                    </td>

                </tr>

            `
        ).join("");

}


// ======================================================
// RECENT ORDERS
// ======================================================

function renderRecentOrders() {

    const table =
        document.getElementById(
            "recent-orders"
        );


    if (!table) return;


    table.innerHTML =
        orders
            .slice(0, 3)
            .map(
                order => `

                    <tr>

                        <td>

                            <strong>
                                ${escapeHTML(
                                    order.id
                                )}
                            </strong>

                        </td>


                        <td>
                            ${escapeHTML(
                                order.customer
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                order.date
                            )}
                        </td>


                        <td>
                            ${money(
                                order.amount
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                order.status
                            )}
                        </td>

                    </tr>

                `
            ).join("");

}


// ======================================================
// CUSTOMERS TABLE
// ======================================================

function renderCustomers() {

    const table =
        document.getElementById(
            "customers-table"
        );


    if (!table) return;


    if (!customers.length) {

        table.innerHTML = `

            <tr>

                <td colspan="4">
                    No customers found.
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        customers.map(
            customer => `

                <tr>

                    <td>

                        <strong>
                            ${escapeHTML(
                                customer.name
                            )}
                        </strong>

                    </td>


                    <td>
                        ${escapeHTML(
                            customer.phone
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            customer.email
                        )}
                    </td>


                    <td>
                        ${customer.orders || 0}
                    </td>

                </tr>

            `
        ).join("");

}


// ======================================================
// PRODUCT TABLE
// ======================================================

function renderProductTable(
    list = products
) {

    const table =
        document.getElementById(
            "product-table"
        );


    const count =
        document.getElementById(
            "product-count"
        );


    if (!table) return;


    if (!list.length) {

        table.innerHTML = `

            <tr>

                <td colspan="6">
                    No products found.
                </td>

            </tr>

        `;

    }

    else {

        table.innerHTML =
            list.map(
                product => {

                    const stock =
                        Number(
                            product.stock ||
                            0
                        );


                    const status =
                        stock > 0
                            ? "In Stock"
                            : "Out of Stock";


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
                                ${escapeHTML(
                                    product.category
                                )}
                            </td>


                            <td>
                                ${money(
                                    product.price
                                )}
                            </td>


                            <td>
                                ${stock}
                            </td>


                            <td>
                                ${escapeHTML(
                                    product.size ||
                                    ""
                                )}
                            </td>


                            <td>
                                ${status}
                            </td>

                        </tr>

                    `;

                }
            ).join("");

    }


    if (count) {

        count.textContent =
            `${list.length} product${
                list.length === 1
                    ? ""
                    : "s"
            }`;

    }

}


// ======================================================
// STOCK ALERTS
// ======================================================

function renderStockAlerts() {

    const container =
        document.getElementById(
            "stock-alerts"
        );


    if (!container) return;


    const lowStock =
        products.filter(
            product =>
                Number(
                    product.stock
                ) <= 10
        );


    container.innerHTML =
        lowStock.map(
            product => `

                <div
                    class="stock-alert"
                >

                    <strong>
                        ${escapeHTML(
                            product.name
                        )}
                    </strong>


                    <span>
                        ${escapeHTML(
                            product.category
                        )}
                    </span>


                    <small>
                        ${Number(
                            product.stock
                        )}
                        left
                    </small>

                </div>

            `
        ).join("");

}


// ======================================================
// DASHBOARD STATS
// ======================================================

function updateStats() {

    const productStat =
        document.getElementById(
            "stat-products"
        );


    const orderStat =
        document.getElementById(
            "stat-orders"
        );


    const customerStat =
        document.getElementById(
            "stat-customers"
        );


    const lowStat =
        document.getElementById(
            "stat-low"
        );


    if (productStat) {

        productStat.textContent =
            products.length;

    }


    if (orderStat) {

        orderStat.textContent =
            orders.length;

    }


    if (customerStat) {

        customerStat.textContent =
            customers.length;

    }


    if (lowStat) {

        lowStat.textContent =
            products.filter(
                product =>
                    Number(
                        product.stock
                    ) <= 10
            ).length;

    }

}


// ======================================================
// ADD PRODUCT
// ======================================================

const productDialog =
    document.getElementById(
        "product-dialog"
    );


const productForm =
    document.getElementById(
        "product-form"
    );


function openProductDialog() {

    if (!isAdmin()) {

        showToast(
            "Admin login required."
        );

        return;

    }


    if (!productDialog) return;


    productDialog.showModal();

}


document
    .querySelectorAll(
        "#add-product, #add-top"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                openProductDialog
            );

        }
    );


// ======================================================
// SAVE PRODUCT TO BACKEND
// ADMIN ONLY
// ======================================================

if (productForm) {

    productForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!isAdmin()) {

                showToast(
                    "Admin login required."
                );

                return;

            }


            const formData =
                new FormData(
                    productForm
                );


            const name =
                String(
                    formData.get(
                        "name"
                    ) || ""
                ).trim();


            const category =
                String(
                    formData.get(
                        "category"
                    ) || ""
                ).trim();


            const price =
                Number(
                    formData.get(
                        "price"
                    )
                );


            const stock =
                Number(
                    formData.get(
                        "stock"
                    )
                );


            const size =
                String(
                    formData.get(
                        "size"
                    ) || ""
                ).trim();


            if (
                !name ||
                !category ||
                Number.isNaN(
                    price
                ) ||
                Number.isNaN(
                    stock
                ) ||
                !size
            ) {

                showToast(
                    "Please fill all product information."
                );

                return;

            }


            const payload = {

                name,

                category,

                price,

                stock,

                size,

                emoji: "👕",

                image: "tshirt.png"

            };


            try {

                const response =
                    await adminFetch(
                        "/products",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )

                        }
                    );


                const newProduct =
                    getObjectResponse(
                        response,
                        "product"
                    );


                if (
                    !newProduct ||
                    !newProduct.id
                ) {

                    throw new Error(
                        "Backend did not return the new product."
                    );

                }


                products.push(
                    newProduct
                );


                renderProductTable();

                renderShopProducts();

                renderStockAlerts();

                updateStats();


                productForm.reset();


                if (productDialog) {

                    productDialog.close();

                }


                showToast(
                    "Product added successfully! ✅"
                );

            }

            catch (error) {

                console.error(
                    "Add product error:",
                    error
                );


                showToast(
                    error.message ||
                    "Could not add product."
                );

            }

        }
    );

}


// ======================================================
// ADD CUSTOMER
// ADMIN ONLY
// ======================================================

const customerDialog =
    document.getElementById(
        "customer-dialog"
    );


const customerForm =
    document.getElementById(
        "customer-form"
    );


const addCustomerButton =
    document.getElementById(
        "add-customer"
    );


if (addCustomerButton) {

    addCustomerButton.addEventListener(
        "click",
        () => {

            if (!isAdmin()) {

                showToast(
                    "Admin login required."
                );

                return;

            }


            if (customerDialog) {

                customerDialog.showModal();

            }

        }
    );

}


if (customerForm) {

    customerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!isAdmin()) {

                showToast(
                    "Admin login required."
                );

                return;

            }


            const formData =
                new FormData(
                    customerForm
                );


            const payload = {

                name:
                    String(
                        formData.get(
                            "name"
                        ) || ""
                    ).trim(),

                phone:
                    String(
                        formData.get(
                            "phone"
                        ) || ""
                    ).trim(),

                email:
                    String(
                        formData.get(
                            "email"
                        ) || ""
                    ).trim()

            };


            if (
                !payload.name ||
                !payload.phone
            ) {

                showToast(
                    "Name and phone are required."
                );

                return;

            }


            try {

                const response =
                    await adminFetch(
                        "/customers",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )

                        }
                    );


                const customer =
                    getObjectResponse(
                        response,
                        "customer"
                    );


                if (!customer) {

                    throw new Error(
                        "Backend did not return customer."
                    );

                }


                customers.push(
                    customer
                );


                renderCustomers();

                updateStats();


                customerForm.reset();


                if (customerDialog) {

                    customerDialog.close();

                }


                showToast(
                    "Customer added successfully! ✅"
                );

            }

            catch (error) {

                console.error(
                    "Customer error:",
                    error
                );


                showToast(
                    error.message ||
                    "Could not add customer."
                );

            }

        }
    );

}


// ======================================================
// VIEW ORDER
// ======================================================

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                ".view-order"
            );


        if (!button) return;


        if (!isAdmin()) {

            showToast(
                "Admin login required."
            );

            return;

        }


        const id =
            button.dataset.order;


        try {

            const data =
                await adminFetch(
                    `/orders/${encodeURIComponent(
                        id
                    )}`
                );


            const order =
                getObjectResponse(
                    data,
                    "order"
                );


            if (!order) {

                throw new Error(
                    "Order details not found."
                );

            }


            const itemsText =
                Array.isArray(
                    order.items
                )
                    ? order.items
                        .map(
                            item =>
                                `${item.name} × ${item.quantity} · Size: ${item.size || "N/A"}`
                        )
                        .join("\n")
                    : "";


            alert(
                `Order: ${order.id}\n\n` +

                `Customer: ${order.customer}\n` +

                `Phone: ${order.phone}\n\n` +

                `Address: ${order.address}\n\n` +

                `Delivery: ${order.delivery}\n` +

                `Payment: ${order.payment}\n\n` +

                `Items:\n${itemsText}\n\n` +

                `Amount: ${money(
                    order.amount
                )}\n` +

                `Status: ${order.status}`
            );

        }

        catch (error) {

            console.error(
                "View order error:",
                error
            );


            showToast(
                error.message ||
                "Could not load order."
            );

        }

    }
);


// ======================================================
// CLOSE DIALOG BUTTONS
// ======================================================

document
    .querySelectorAll(
        "[data-close]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const dialog =
                        button.closest(
                            "dialog"
                        );


                    if (dialog) {

                        dialog.close();

                    }

                }
            );

        }
    );


// ======================================================
// TOAST
// ======================================================

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        console.log(
            message
        );

        return;

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        2500
    );

}


// ======================================================
// PRODUCT DETAILS
// ======================================================

let selectedProductDetails =
    null;


let selectedDetailsQuantity =
    1;


const productDetailsDialog =
    document.getElementById(
        "product-details-dialog"
    );


const detailsImage =
    document.getElementById(
        "details-image"
    );


const detailsCategory =
    document.getElementById(
        "details-category"
    );


const detailsName =
    document.getElementById(
        "details-name"
    );


const detailsPrice =
    document.getElementById(
        "details-price"
    );


const detailsSize =
    document.getElementById(
        "details-size"
    );


const detailsQuantity =
    document.getElementById(
        "details-quantity"
    );


const detailsMinus =
    document.getElementById(
        "details-minus"
    );


const detailsPlus =
    document.getElementById(
        "details-plus"
    );


const detailsAddCart =
    document.getElementById(
        "details-add-cart"
    );


const detailsBuyNow =
    document.getElementById(
        "details-buy-now"
    );


const closeDetails =
    document.getElementById(
        "close-details"
    );


// ======================================================
// SHOW PRODUCT DETAILS
// ======================================================

function showProductDetails(
    product
) {

    if (!productDetailsDialog) {

        showToast(
            "Product details popup is missing."
        );

        return;

    }


    selectedProductDetails =
        product;


    selectedDetailsQuantity =
        1;


    if (detailsImage) {

        detailsImage.src =
            product.image ||
            "tshirt.png";


        detailsImage.alt =
            product.name;

    }


    if (detailsCategory) {

        detailsCategory.textContent =
            product.category;

    }


    if (detailsName) {

        detailsName.textContent =
            product.name;

    }


    if (detailsPrice) {

        detailsPrice.textContent =
            money(
                product.price
            );

    }


    if (detailsQuantity) {

        detailsQuantity.textContent =
            "1";

    }


    if (detailsSize) {

        detailsSize.innerHTML =
            String(
                product.size || ""
            )
                .split(",")
                .map(
                    size => {

                        const cleanSize =
                            size.trim();


                        return `

                            <option
                                value="${escapeHTML(
                                    cleanSize
                                )}"
                            >
                                ${escapeHTML(
                                    cleanSize
                                )}
                            </option>

                        `;

                    }
                )
                .join("");

    }


    productDetailsDialog.showModal();

}


// ======================================================
// PRODUCT CARD CLICK
// ======================================================

document.addEventListener(
    "click",
    event => {

        const card =
            event.target.closest(
                ".product-card"
            );


        if (!card) return;


        if (
            event.target.closest(
                ".add-cart"
            )
        ) {

            return;

        }


        const productId =
            Number(
                card.dataset.productId
            );


        const product =
            products.find(
                item =>
                    Number(
                        item.id
                    ) ===
                    productId
            );


        if (!product) return;


        showProductDetails(
            product
        );

    }
);


// ======================================================
// PRODUCT DETAILS QUANTITY MINUS
// ======================================================

if (detailsMinus) {

    detailsMinus.addEventListener(
        "click",
        () => {

            if (
                selectedDetailsQuantity >
                1
            ) {

                selectedDetailsQuantity--;


                if (detailsQuantity) {

                    detailsQuantity.textContent =
                        selectedDetailsQuantity;

                }

            }

        }
    );

}


// ======================================================
// PRODUCT DETAILS QUANTITY PLUS
// ======================================================

if (detailsPlus) {

    detailsPlus.addEventListener(
        "click",
        () => {

            if (
                !selectedProductDetails
            ) {

                return;

            }


            if (
                selectedDetailsQuantity <
                Number(
                    selectedProductDetails.stock
                )
            ) {

                selectedDetailsQuantity++;


                if (detailsQuantity) {

                    detailsQuantity.textContent =
                        selectedDetailsQuantity;

                }

            }

            else {

                showToast(
                    "Maximum stock reached."
                );

            }

        }
    );

}


// ======================================================
// DETAILS ADD TO CART
// ======================================================

if (detailsAddCart) {

    detailsAddCart.addEventListener(
        "click",
        () => {

            if (
                !selectedProductDetails
            ) {

                return;

            }


            const selectedSize =
                detailsSize
                    ? detailsSize.value
                    : null;


            for (
                let i = 0;
                i < selectedDetailsQuantity;
                i++
            ) {

                addToCart(
                    selectedProductDetails.id,
                    selectedSize
                );

            }


            if (productDetailsDialog) {

                productDetailsDialog.close();

            }

        }
    );

}


// ======================================================
// DETAILS BUY NOW
// ======================================================

if (detailsBuyNow) {

    detailsBuyNow.addEventListener(
        "click",
        () => {

            if (
                !selectedProductDetails
            ) {

                return;

            }


            const selectedSize =
                detailsSize
                    ? detailsSize.value
                    : null;


            for (
                let i = 0;
                i < selectedDetailsQuantity;
                i++
            ) {

                addToCart(
                    selectedProductDetails.id,
                    selectedSize
                );

            }


            if (productDetailsDialog) {

                productDetailsDialog.close();

            }


            setTimeout(
                openCart,
                200
            );

        }
    );

}


// ======================================================
// CLOSE PRODUCT DETAILS
// ======================================================

if (closeDetails) {

    closeDetails.addEventListener(
        "click",
        () => {

            if (productDetailsDialog) {

                productDetailsDialog.close();

            }

        }
    );

}


// ======================================================
// INITIAL RENDER
// ======================================================

renderShopProducts();

renderProductTable();

renderOrders();

renderRecentOrders();

renderCustomers();

renderStockAlerts();

updateStats();

updateCart();


// ======================================================
// LOAD REAL BACKEND DATA
// ======================================================

loadBackendData();


// ======================================================
// END
// ======================================================