/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


/* =========================================================
   FIREBASE CONFIGURATION
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyBKt99sHYfxAXsBmyy5N8gAVVJWqayhIxs",
    authDomain: "datprints-bdf1d.firebaseapp.com",
    projectId: "datprints-bdf1d",
    storageBucket: "datprints-bdf1d.firebasestorage.app",
    messagingSenderId: "753594113387",
    appId: "1:753594113387:web:1d382da9219807416fc02e"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

const googleProvider =
    new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});

const ordersRef =
    collection(db, "orders");


/* =========================================================
   AUTHORIZED DATPRINTS ACCOUNTS
========================================================= */

const AUTHORIZED_EMAILS = [
    "ligon.tristanniconavalta@gmail.com",
    "devierosel28@gmail.com"
];


/* =========================================================
   VARIABLES
========================================================= */

let orders = [];

let editingFirestoreId = null;

let ordersUnsubscribe = null;


/* =========================================================
   HTML ELEMENTS
========================================================= */

const loginScreen =
    document.getElementById("loginScreen");

const appContainer =
    document.getElementById("appContainer");

const googleSignInButton =
    document.getElementById("googleSignInButton");

const signOutButton =
    document.getElementById("signOutButton");

const loginMessage =
    document.getElementById("loginMessage");

const userEmail =
    document.getElementById("userEmail");

const form =
    document.getElementById("orderForm");

const table =
    document.getElementById("orderTable");

const search =
    document.getElementById("search");

const statusFilter =
    document.getElementById("statusFilter");

const dueDateFilter =
    document.getElementById("dueDateFilter");

const sortFilter =
    document.getElementById("sortFilter");

const clearFiltersButton =
    document.getElementById("clearFilters");

const submitButton =
    document.getElementById("submitButton");

const cancelEditButton =
    document.getElementById("cancelEditButton");

const quantityInput =
    document.getElementById("qty");

const unitPriceInput =
    document.getElementById("price");

const estimatedTotal =
    document.getElementById("estimatedTotal");

const calculationText =
    document.getElementById("calculationText");

const themeToggle =
    document.getElementById("themeToggle");


/* =========================================================
   GENERAL HELPERS
========================================================= */

function getValue(id) {
    const element =
        document.getElementById(id);

    return element
        ? element.value
        : "";
}


function setValue(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.value =
            value ?? "";
    }
}


function normalizeEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}


function isAuthorizedEmail(email) {
    return AUTHORIZED_EMAILS.includes(
        normalizeEmail(email)
    );
}


function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatMoney(value) {
    const amount =
        Number(value) || 0;

    return amount.toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


function getLocalDateString(
    date = new Date()
) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =========================================================
   AUTHENTICATION
========================================================= */

googleSignInButton.addEventListener(
    "click",

    async function () {
        googleSignInButton.disabled = true;

        googleSignInButton.textContent =
            "Signing in...";

        loginMessage.textContent = "";

        try {
            const result =
                await signInWithPopup(
                    auth,
                    googleProvider
                );

            const signedInEmail =
                normalizeEmail(
                    result.user.email
                );

            if (
                !isAuthorizedEmail(
                    signedInEmail
                )
            ) {
                await signOut(auth);

                loginMessage.textContent =
                    "This Google account is not authorized to access DATPrints.";

                return;
            }
        } catch (error) {
            console.error(
                "Google sign-in error:",
                error
            );

            if (
                error.code ===
                "auth/popup-closed-by-user"
            ) {
                loginMessage.textContent =
                    "Google sign-in was cancelled.";
            } else if (
                error.code ===
                "auth/popup-blocked"
            ) {
                loginMessage.textContent =
                    "The browser blocked the Google login window. Allow pop-ups and try again.";
            } else if (
                error.code ===
                "auth/unauthorized-domain"
            ) {
                loginMessage.textContent =
                    "This website domain is not authorized in Firebase Authentication.";
            } else {
                loginMessage.textContent =
                    "Google sign-in failed. Please try again.";
            }
        } finally {
            googleSignInButton.disabled = false;

            googleSignInButton.textContent =
                "Sign in with Google";
        }
    }
);


signOutButton.addEventListener(
    "click",

    async function () {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(
                "Sign-out error:",
                error
            );

            alert(
                "Unable to sign out. Please try again."
            );
        }
    }
);


onAuthStateChanged(
    auth,

    async function (user) {
        stopOrdersListener();

        if (!user) {
            showLoginScreen();
            return;
        }

        const signedInEmail =
            normalizeEmail(user.email);

        if (
            !isAuthorizedEmail(
                signedInEmail
            )
        ) {
            await signOut(auth);

            loginMessage.textContent =
                "This Google account is not authorized to access DATPrints.";

            return;
        }

        showDashboard(user);
        startOrdersListener();
    }
);


function showLoginScreen() {
    loginScreen.classList.remove(
        "hidden"
    );

    appContainer.classList.add(
        "hidden"
    );

    userEmail.textContent = "";

    orders = [];

    editingFirestoreId = null;

    updateDashboard();

    table.innerHTML = `
        <tr>
            <td colspan="12" class="empty-table">
                Sign in to load orders.
            </td>
        </tr>
    `;
}


function showDashboard(user) {
    loginScreen.classList.add(
        "hidden"
    );

    appContainer.classList.remove(
        "hidden"
    );

    userEmail.textContent =
        user.email || "";
}


function stopOrdersListener() {
    if (
        typeof ordersUnsubscribe ===
        "function"
    ) {
        ordersUnsubscribe();
    }

    ordersUnsubscribe = null;
}


/* =========================================================
   FIRESTORE LISTENER
========================================================= */

function startOrdersListener() {
    stopOrdersListener();

    ordersUnsubscribe =
        onSnapshot(
            ordersRef,

            function (snapshot) {
                orders = [];

                snapshot.forEach(
                    function (documentSnapshot) {
                        const data =
                            documentSnapshot.data();

                        /*
                            Ignore the temporary Firebase
                            document containing test: "hello".
                        */

                        if (
                            !data.customer &&
                            !data.item
                        ) {
                            return;
                        }

                        orders.push({
                            firestoreId:
                                documentSnapshot.id,

                            ...data
                        });
                    }
                );

                applyFiltersAndSort();
                updateDashboard();
            },

            function (error) {
                console.error(
                    "Firestore listener error:",
                    error
                );

                if (
                    error.code ===
                    "permission-denied"
                ) {
                    alert(
                        "Access denied. Verify your Google account and Firestore Security Rules."
                    );
                } else {
                    alert(
                        "Unable to load orders. Check the internet connection."
                    );
                }
            }
        );
}


/* =========================================================
   LIVE PRICE CALCULATOR
========================================================= */

function updateEstimatedTotal() {
    const quantity =
        Number(quantityInput.value) || 0;

    const unitPrice =
        Number(unitPriceInput.value) || 0;

    const totalPrice =
        quantity * unitPrice;

    estimatedTotal.textContent =
        `₱${formatMoney(totalPrice)}`;

    calculationText.textContent =
        `${quantity} × ₱${formatMoney(unitPrice)}`;
}


quantityInput.addEventListener(
    "input",
    updateEstimatedTotal
);


unitPriceInput.addEventListener(
    "input",
    updateEstimatedTotal
);


updateEstimatedTotal();


/* =========================================================
   ADD OR UPDATE ORDER
========================================================= */

form.addEventListener(
    "submit",

    async function (event) {
        event.preventDefault();

        const currentUser =
            auth.currentUser;

        if (
            !currentUser ||
            !isAuthorizedEmail(
                currentUser.email
            )
        ) {
            alert(
                "Please sign in with an authorized DATPrints account."
            );

            return;
        }

        const quantity =
            Number(getValue("qty")) || 0;

        const unitPrice =
            Number(getValue("price")) || 0;

        /*
            Correct calculation:

            Total price =
            quantity × unit price
        */

        const totalPrice =
            quantity * unitPrice;

        if (quantity < 1) {
            alert(
                "Quantity must be at least 1."
            );

            return;
        }

        if (unitPrice < 0) {
            alert(
                "Unit price cannot be negative."
            );

            return;
        }

        const orderData = {
            customer:
                getValue("customer").trim(),

            contact:
                getValue("contact").trim(),

            item:
                getValue("item").trim(),

            qty:
                quantity,

            color:
                getValue("color").trim(),

            dueDate:
                getValue("dueDate"),

            unitPrice:
                unitPrice,

            totalPrice:
                totalPrice,

            /*
                Keep price equal to totalPrice for
                compatibility with older dashboard records.
            */

            price:
                totalPrice,

            status:
                getValue("status"),

            notes:
                getValue("notes").trim(),

            updatedAt:
                serverTimestamp(),

            updatedBy:
                normalizeEmail(
                    currentUser.email
                )
        };

        submitButton.disabled = true;

        submitButton.textContent =
            editingFirestoreId
                ? "Updating..."
                : "Adding...";

        try {
            if (editingFirestoreId) {
                await updateDoc(
                    doc(
                        db,
                        "orders",
                        editingFirestoreId
                    ),
                    orderData
                );
            } else {
                await addDoc(
                    ordersRef,
                    {
                        ...orderData,

                        id:
                            Date.now(),

                        createdAt:
                            serverTimestamp(),

                        createdBy:
                            normalizeEmail(
                                currentUser.email
                            )
                    }
                );
            }

            resetOrderForm();
        } catch (error) {
            console.error(
                "Order save error:",
                error
            );

            alert(
                "The order could not be saved. Check the internet connection and Firestore permissions."
            );
        } finally {
            submitButton.disabled = false;

            submitButton.textContent =
                editingFirestoreId
                    ? "Update Order"
                    : "Add Order";
        }
    }
);


/* =========================================================
   RESET FORM
========================================================= */

function resetOrderForm() {
    editingFirestoreId = null;

    form.reset();

    quantityInput.value = 1;

    document.getElementById(
        "status"
    ).value = "Pending";

    submitButton.textContent =
        "Add Order";

    cancelEditButton.classList.add(
        "hidden"
    );

    updateEstimatedTotal();
}


cancelEditButton.addEventListener(
    "click",
    resetOrderForm
);


/* =========================================================
   ORDER HELPERS
========================================================= */

function getCreatedTime(order) {
    if (
        order.createdAt &&
        typeof order.createdAt.toMillis ===
        "function"
    ) {
        return order.createdAt.toMillis();
    }

    const oldTimestamp =
        Number(order.id);

    return Number.isFinite(
        oldTimestamp
    )
        ? oldTimestamp
        : 0;
}


function getDueDateValue(order) {
    if (!order.dueDate) {
        return Number.MAX_SAFE_INTEGER;
    }

    const value =
        new Date(
            `${order.dueDate}T00:00:00`
        ).getTime();

    return Number.isNaN(value)
        ? Number.MAX_SAFE_INTEGER
        : value;
}


function getStatusPriority(status) {
    const priorities = {
        Pending: 1,
        Printing: 2,
        Ready: 3,
        Delivered: 4
    };

    return priorities[status] || 5;
}


function getStatusClass(status) {
    const normalizedStatus =
        String(status || "")
            .toLowerCase();

    const classes = {
        pending: "status-pending",
        printing: "status-printing",
        ready: "status-ready",
        delivered: "status-delivered"
    };

    return classes[normalizedStatus] || "";
}


function getDueDateClass(order) {
    if (
        !order.dueDate ||
        order.status === "Delivered"
    ) {
        return "";
    }

    const today =
        getLocalDateString();

    if (order.dueDate < today) {
        return "overdue-date";
    }

    if (order.dueDate === today) {
        return "today-date";
    }

    return "";
}


function getOrderUnitPrice(order) {
    if (
        order.unitPrice !== undefined &&
        order.unitPrice !== null
    ) {
        return Number(
            order.unitPrice
        ) || 0;
    }

    /*
        Older orders may only have price.
        Treat the old price as the unit price
        until the order is edited and saved.
    */

    return Number(order.price) || 0;
}


function getOrderTotalPrice(order) {
    if (
        order.totalPrice !== undefined &&
        order.totalPrice !== null
    ) {
        return Number(
            order.totalPrice
        ) || 0;
    }

    /*
        Correct older records dynamically:

        total = old price × quantity
    */

    const quantity =
        Number(order.qty) || 1;

    const oldUnitPrice =
        Number(order.price) || 0;

    return quantity * oldUnitPrice;
}


/* =========================================================
   FILTERING AND SORTING
========================================================= */

function applyFiltersAndSort() {
    const searchTerm =
        search.value
            .trim()
            .toLowerCase();

    const selectedStatus =
        statusFilter.value;

    const selectedDueDate =
        dueDateFilter.value;

    const selectedSort =
        sortFilter.value;

    const today =
        getLocalDateString();

    const sevenDaysFromNow =
        new Date();

    sevenDaysFromNow.setDate(
        sevenDaysFromNow.getDate() + 7
    );

    const nextSevenDays =
        getLocalDateString(
            sevenDaysFromNow
        );

    let filteredOrders =
        orders.filter(
            function (order) {
                const searchableText = [
                    order.id,
                    order.customer,
                    order.contact,
                    order.item,
                    order.color,
                    order.notes
                ]
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    searchableText.includes(
                        searchTerm
                    );

                const matchesStatus =
                    selectedStatus === "All" ||
                    order.status ===
                        selectedStatus;

                let matchesDueDate = true;

                if (
                    selectedDueDate ===
                    "Overdue"
                ) {
                    matchesDueDate =
                        Boolean(
                            order.dueDate
                        ) &&
                        order.dueDate < today &&
                        order.status !==
                            "Delivered";
                }

                if (
                    selectedDueDate ===
                    "Today"
                ) {
                    matchesDueDate =
                        order.dueDate === today;
                }

                if (
                    selectedDueDate ===
                    "Next7Days"
                ) {
                    matchesDueDate =
                        Boolean(
                            order.dueDate
                        ) &&
                        order.dueDate >= today &&
                        order.dueDate <=
                            nextSevenDays;
                }

                if (
                    selectedDueDate ===
                    "Future"
                ) {
                    matchesDueDate =
                        Boolean(
                            order.dueDate
                        ) &&
                        order.dueDate >
                            nextSevenDays;
                }

                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesDueDate
                );
            }
        );


    filteredOrders.sort(
        function (orderA, orderB) {
            /*
                Delivered remains at the bottom
                while viewing All Statuses.
            */

            if (
                selectedStatus === "All"
            ) {
                const aDelivered =
                    orderA.status ===
                    "Delivered";

                const bDelivered =
                    orderB.status ===
                    "Delivered";

                if (
                    aDelivered &&
                    !bDelivered
                ) {
                    return 1;
                }

                if (
                    !aDelivered &&
                    bDelivered
                ) {
                    return -1;
                }
            }

            if (
                selectedSort === "Newest"
            ) {
                return (
                    getCreatedTime(orderB) -
                    getCreatedTime(orderA)
                );
            }

            if (
                selectedSort ===
                "DueSoon"
            ) {
                const difference =
                    getDueDateValue(orderA) -
                    getDueDateValue(orderB);

                if (difference !== 0) {
                    return difference;
                }

                return (
                    getCreatedTime(orderB) -
                    getCreatedTime(orderA)
                );
            }

            if (
                selectedSort ===
                "DueLate"
            ) {
                const difference =
                    getDueDateValue(orderB) -
                    getDueDateValue(orderA);

                if (difference !== 0) {
                    return difference;
                }

                return (
                    getCreatedTime(orderB) -
                    getCreatedTime(orderA)
                );
            }

            const statusDifference =
                getStatusPriority(
                    orderA.status
                ) -
                getStatusPriority(
                    orderB.status
                );

            if (
                statusDifference !== 0
            ) {
                return statusDifference;
            }

            /*
                Same status:
                newest order appears first.
            */

            return (
                getCreatedTime(orderB) -
                getCreatedTime(orderA)
            );
        }
    );

    renderOrders(
        filteredOrders
    );
}


/* =========================================================
   FILTER EVENTS
========================================================= */

search.addEventListener(
    "input",
    applyFiltersAndSort
);

statusFilter.addEventListener(
    "change",
    applyFiltersAndSort
);

dueDateFilter.addEventListener(
    "change",
    applyFiltersAndSort
);

sortFilter.addEventListener(
    "change",
    applyFiltersAndSort
);

clearFiltersButton.addEventListener(
    "click",

    function () {
        search.value = "";

        statusFilter.value = "All";

        dueDateFilter.value = "All";

        sortFilter.value = "Priority";

        applyFiltersAndSort();
    }
);


/* =========================================================
   RENDER ORDERS
========================================================= */

function renderOrders(
    filteredOrders = orders
) {
    table.innerHTML = "";

    if (
        filteredOrders.length === 0
    ) {
        table.innerHTML = `
            <tr>
                <td
                    colspan="12"
                    class="empty-table"
                >
                    No orders found.
                </td>
            </tr>
        `;

        return;
    }

    filteredOrders.forEach(
        function (order) {
            const unitPrice =
                getOrderUnitPrice(order);

            const totalPrice =
                getOrderTotalPrice(order);

            table.innerHTML += `
                <tr>

                    <td>
                        ${escapeHTML(order.id)}
                    </td>

                    <td>
                        ${escapeHTML(order.customer)}
                    </td>

                    <td>
                        ${escapeHTML(order.contact)}
                    </td>

                    <td>
                        ${escapeHTML(order.item)}
                    </td>

                    <td>
                        ${escapeHTML(order.qty)}
                    </td>

                    <td>
                        ${escapeHTML(order.color)}
                    </td>

                    <td class="${getDueDateClass(order)}">
                        ${escapeHTML(
                            order.dueDate ||
                            "No due date"
                        )}
                    </td>

                    <td>
                        ₱${formatMoney(unitPrice)}
                    </td>

                    <td>
                        ₱${formatMoney(totalPrice)}
                    </td>

                    <td>
                        <span
                            class="status-badge ${getStatusClass(order.status)}"
                        >
                            ${escapeHTML(
                                order.status ||
                                "Pending"
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(order.notes)}
                    </td>

                    <td class="action-cell">

                        <button
                            type="button"
                            class="actionBtn edit"
                            data-action="edit"
                            data-id="${escapeHTML(
                                order.firestoreId
                            )}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="actionBtn delete"
                            data-action="delete"
                            data-id="${escapeHTML(
                                order.firestoreId
                            )}"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;
        }
    );
}


/* =========================================================
   TABLE BUTTON EVENTS
========================================================= */

table.addEventListener(
    "click",

    function (event) {
        const button =
            event.target.closest(
                "button[data-action]"
            );

        if (!button) {
            return;
        }

        if (
            button.dataset.action ===
            "edit"
        ) {
            editOrder(
                button.dataset.id
            );
        }

        if (
            button.dataset.action ===
            "delete"
        ) {
            deleteOrder(
                button.dataset.id
            );
        }
    }
);


/* =========================================================
   EDIT ORDER
========================================================= */

function editOrder(firestoreId) {
    const order =
        orders.find(
            function (currentOrder) {
                return (
                    currentOrder.firestoreId ===
                    firestoreId
                );
            }
        );

    if (!order) {
        alert("Order not found.");
        return;
    }

    editingFirestoreId =
        firestoreId;

    setValue(
        "customer",
        order.customer
    );

    setValue(
        "contact",
        order.contact
    );

    setValue(
        "item",
        order.item
    );

    setValue(
        "qty",
        order.qty
    );

    setValue(
        "color",
        order.color
    );

    setValue(
        "dueDate",
        order.dueDate
    );

    setValue(
        "price",
        getOrderUnitPrice(order)
    );

    setValue(
        "status",
        order.status
    );

    setValue(
        "notes",
        order.notes
    );

    submitButton.textContent =
        "Update Order";

    cancelEditButton.classList.remove(
        "hidden"
    );

    updateEstimatedTotal();

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   DELETE ORDER
========================================================= */

async function deleteOrder(
    firestoreId
) {
    const order =
        orders.find(
            function (currentOrder) {
                return (
                    currentOrder.firestoreId ===
                    firestoreId
                );
            }
        );

    if (!order) {
        alert("Order not found.");
        return;
    }

    const confirmed =
        confirm(
            `Delete the order for ${
                order.customer ||
                "this customer"
            }?`
        );

    if (!confirmed) {
        return;
    }

    try {
        await deleteDoc(
            doc(
                db,
                "orders",
                firestoreId
            )
        );

        if (
            editingFirestoreId ===
            firestoreId
        ) {
            resetOrderForm();
        }
    } catch (error) {
        console.error(
            "Delete order error:",
            error
        );

        alert(
            "The order could not be deleted."
        );
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {
    const totalOrdersElement =
        document.getElementById(
            "totalOrders"
        );

    const activeOrdersElement =
        document.getElementById(
            "pendingOrders"
        );

    const completedOrdersElement =
        document.getElementById(
            "completedOrders"
        );

    const totalSalesElement =
        document.getElementById(
            "totalSales"
        );

    totalOrdersElement.textContent =
        orders.length;

    activeOrdersElement.textContent =
        orders.filter(
            function (order) {
                return (
                    order.status !==
                    "Delivered"
                );
            }
        ).length;

    completedOrdersElement.textContent =
        orders.filter(
            function (order) {
                return (
                    order.status ===
                    "Delivered"
                );
            }
        ).length;

    const totalSales =
        orders.reduce(
            function (sum, order) {
                return (
                    sum +
                    getOrderTotalPrice(order)
                );
            },
            0
        );

    totalSalesElement.textContent =
        formatMoney(totalSales);
}


/* =========================================================
   LIGHT AND DARK MODE
========================================================= */

const savedTheme =
    localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.body.classList.add(
        "dark-mode"
    );

    themeToggle.textContent =
        "☀️ Light Mode";
} else {
    themeToggle.textContent =
        "🌙 Dark Mode";
}


themeToggle.addEventListener(
    "click",

    function () {
        document.body.classList.toggle(
            "dark-mode"
        );

        const darkModeIsActive =
            document.body.classList.contains(
                "dark-mode"
            );

        if (darkModeIsActive) {
            localStorage.setItem(
                "theme",
                "dark"
            );

            themeToggle.textContent =
                "☀️ Light Mode";
        } else {
            localStorage.setItem(
                "theme",
                "light"
            );

            themeToggle.textContent =
                "🌙 Dark Mode";
        }
    }
);
