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
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


/* =========================================================
   FIREBASE
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

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
    prompt: "select_account"
});

const ordersReference =
    collection(db, "orders");


/* =========================================================
   AUTHORIZED ACCOUNTS
========================================================= */

const authorizedEmails = [
    "ligon.tristanniconavalta@gmail.com",
    "devierosel28@gmail.com"
];


/* =========================================================
   STATE
========================================================= */

let orders = [];
let editingDocumentId = null;
let stopOrdersListener = null;


/* =========================================================
   ELEMENTS
========================================================= */

const loginScreen =
    document.getElementById("loginScreen");

const appContainer =
    document.getElementById("appContainer");

const signInButton =
    document.getElementById("googleSignInButton");

const signOutButton =
    document.getElementById("signOutButton");

const loginMessage =
    document.getElementById("loginMessage");

const userEmailElement =
    document.getElementById("userEmail");

const orderForm =
    document.getElementById("orderForm");

const formTitle =
    document.getElementById("formTitle");

const submitButton =
    document.getElementById("submitButton");

const cancelEditButton =
    document.getElementById("cancelEditButton");

const orderTable =
    document.getElementById("orderTable");

const searchInput =
    document.getElementById("search");

const statusFilter =
    document.getElementById("statusFilter");

const dueDateFilter =
    document.getElementById("dueDateFilter");

const sortFilter =
    document.getElementById("sortFilter");

const clearFiltersButton =
    document.getElementById("clearFilters");

const quantityInput =
    document.getElementById("qty");

const unitPriceInput =
    document.getElementById("price");

const estimatedTotalElement =
    document.getElementById("estimatedTotal");

const calculationText =
    document.getElementById("calculationText");

const themeToggle =
    document.getElementById("themeToggle");


/* =========================================================
   GENERAL HELPERS
========================================================= */

function normalizeEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

function isAuthorized(email) {
    return authorizedEmails.includes(
        normalizeEmail(email)
    );
}

function getInputValue(id) {
    const element =
        document.getElementById(id);

    return element
        ? element.value
        : "";
}

function setInputValue(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.value = value ?? "";
    }
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
    return (Number(value) || 0)
        .toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
}

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function showLoginMessage(
    message,
    type = "error"
) {
    loginMessage.textContent = message;

    loginMessage.style.color =
        type === "success"
            ? "#16a34a"
            : "#dc2626";
}


/* =========================================================
   AUTHENTICATION
========================================================= */

async function prepareAuthentication() {
    try {
        await setPersistence(
            auth,
            browserLocalPersistence
        );

        await getRedirectResult(auth);
    } catch (error) {
        console.error(
            "Authentication initialization error:",
            error
        );

        showLoginMessage(
            `Authentication error: ${
                error.code || error.message
            }`
        );
    }
}

prepareAuthentication();


signInButton.addEventListener(
    "click",

    async function () {
        signInButton.disabled = true;
        signInButton.textContent =
            "Opening Google...";

        showLoginMessage("");

        try {
            const result =
                await signInWithPopup(
                    auth,
                    provider
                );

            if (
                !isAuthorized(
                    result.user.email
                )
            ) {
                await signOut(auth);

                showLoginMessage(
                    "This Google account is not authorized for DATPrints."
                );
            }
        } catch (error) {
            console.error(
                "Google sign-in error:",
                error
            );

            const errorCode =
                error.code || "unknown-error";

            if (
                errorCode ===
                "auth/popup-blocked"
            ) {
                showLoginMessage(
                    "The popup was blocked. Redirecting to Google sign-in..."
                );

                try {
                    await signInWithRedirect(
                        auth,
                        provider
                    );
                } catch (redirectError) {
                    console.error(
                        "Redirect sign-in error:",
                        redirectError
                    );

                    showLoginMessage(
                        `Sign-in failed: ${
                            redirectError.code ||
                            redirectError.message
                        }`
                    );
                }
            } else if (
                errorCode ===
                "auth/popup-closed-by-user"
            ) {
                showLoginMessage(
                    "The Google window was closed before sign-in finished."
                );
            } else if (
                errorCode ===
                "auth/cancelled-popup-request"
            ) {
                showLoginMessage(
                    "A Google sign-in request is already open."
                );
            } else if (
                errorCode ===
                "auth/unauthorized-domain"
            ) {
                showLoginMessage(
                    "This GitHub Pages domain is not authorized in Firebase."
                );
            } else if (
                errorCode ===
                "auth/operation-not-allowed"
            ) {
                showLoginMessage(
                    "Google Sign-In is not enabled in Firebase Authentication."
                );
            } else if (
                errorCode ===
                "auth/network-request-failed"
            ) {
                showLoginMessage(
                    "Network error. Check the internet connection and try again."
                );
            } else {
                showLoginMessage(
                    `Google sign-in failed: ${errorCode}`
                );
            }
        } finally {
            signInButton.disabled = false;

            signInButton.textContent =
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
        stopRealtimeOrders();

        if (!user) {
            displayLoginScreen();
            return;
        }

        if (!isAuthorized(user.email)) {
            await signOut(auth);

            displayLoginScreen();

            showLoginMessage(
                "This Google account is not authorized for DATPrints."
            );

            return;
        }

        displayDashboard(user);
        startRealtimeOrders();
    }
);


function displayLoginScreen() {
    loginScreen.classList.remove("hidden");
    appContainer.classList.add("hidden");

    orders = [];
    editingDocumentId = null;

    userEmailElement.textContent = "";

    updateDashboard();
}


function displayDashboard(user) {
    loginScreen.classList.add("hidden");
    appContainer.classList.remove("hidden");

    userEmailElement.textContent =
        user.email || "";
}


function stopRealtimeOrders() {
    if (
        typeof stopOrdersListener ===
        "function"
    ) {
        stopOrdersListener();
    }

    stopOrdersListener = null;
}


/* =========================================================
   REAL-TIME FIRESTORE
========================================================= */

function startRealtimeOrders() {
    stopRealtimeOrders();

    stopOrdersListener =
        onSnapshot(
            ordersReference,

            function (snapshot) {
                orders = [];

                snapshot.forEach(
                    function (documentSnapshot) {
                        const data =
                            documentSnapshot.data();

                        /*
                            Ignore the old temporary
                            test document.
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
                        "Firestore access was denied. Check the signed-in account and Firestore Rules."
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
   LIVE TOTAL CALCULATOR
========================================================= */

function updateEstimatedTotal() {
    const quantity =
        Number(quantityInput.value) || 0;

    const unitPrice =
        Number(unitPriceInput.value) || 0;

    const total =
        quantity * unitPrice;

    estimatedTotalElement.textContent =
        `₱${formatMoney(total)}`;

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

orderForm.addEventListener(
    "submit",

    async function (event) {
        event.preventDefault();

        const currentUser =
            auth.currentUser;

        if (
            !currentUser ||
            !isAuthorized(currentUser.email)
        ) {
            alert(
                "Sign in using an authorized DATPrints account."
            );

            return;
        }

        const customer =
            getInputValue("customer").trim();

        const item =
            getInputValue("item").trim();

        const quantity =
            Number(getInputValue("qty")) || 0;

        const unitPrice =
            Number(getInputValue("price")) || 0;

        const totalPrice =
            quantity * unitPrice;

        if (!customer) {
            alert(
                "Enter the customer name."
            );

            return;
        }

        if (!item) {
            alert(
                "Enter the item name."
            );

            return;
        }

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
            customer,

            contact:
                getInputValue("contact").trim(),

            item,

            qty:
                quantity,

            color:
                getInputValue("color").trim(),

            dueDate:
                getInputValue("dueDate"),

            unitPrice,
            totalPrice,

            /*
                Retained for compatibility with
                older dashboard versions.
            */

            price:
                totalPrice,

            status:
                getInputValue("status"),

            notes:
                getInputValue("notes").trim(),

            updatedAt:
                serverTimestamp(),

            updatedBy:
                normalizeEmail(
                    currentUser.email
                )
        };

        submitButton.disabled = true;

        submitButton.textContent =
            editingDocumentId
                ? "Updating..."
                : "Adding...";

        try {
            if (editingDocumentId) {
                await updateDoc(
                    doc(
                        db,
                        "orders",
                        editingDocumentId
                    ),
                    orderData
                );
            } else {
                await addDoc(
                    ordersReference,
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

            resetForm();
        } catch (error) {
            console.error(
                "Order save error:",
                error
            );

            alert(
                `Unable to save the order: ${
                    error.code ||
                    error.message
                }`
            );
        } finally {
            submitButton.disabled = false;

            submitButton.textContent =
                editingDocumentId
                    ? "Update Order"
                    : "Add Order";
        }
    }
);


/* =========================================================
   FORM RESET
========================================================= */

function resetForm() {
    editingDocumentId = null;

    orderForm.reset();

    setInputValue("qty", 1);
    setInputValue("status", "Pending");

    formTitle.textContent =
        "Add Order";

    submitButton.textContent =
        "Add Order";

    cancelEditButton.classList.add(
        "hidden"
    );

    updateEstimatedTotal();
}

cancelEditButton.addEventListener(
    "click",
    resetForm
);


/* =========================================================
   ORDER VALUE HELPERS
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

    return Number.isFinite(oldTimestamp)
        ? oldTimestamp
        : 0;
}


function getDueDateTime(order) {
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
    const priority = {
        Pending: 1,
        Printing: 2,
        Ready: 3,
        Delivered: 4
    };

    return priority[status] || 5;
}


function getStatusClass(status) {
    const classes = {
        Pending: "status-pending",
        Printing: "status-printing",
        Ready: "status-ready",
        Delivered: "status-delivered"
    };

    return classes[status] || "";
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


function getUnitPrice(order) {
    if (
        order.unitPrice !== undefined &&
        order.unitPrice !== null
    ) {
        return Number(order.unitPrice) || 0;
    }

    /*
        Older records stored the entered price
        in the price field.
    */

    return Number(order.price) || 0;
}


function getTotalPrice(order) {
    if (
        order.totalPrice !== undefined &&
        order.totalPrice !== null
    ) {
        return Number(order.totalPrice) || 0;
    }

    /*
        Older records:
        total = old price × quantity.
    */

    const quantity =
        Number(order.qty) || 1;

    const unitPrice =
        Number(order.price) || 0;

    return quantity * unitPrice;
}


/* =========================================================
   FILTERING AND SORTING
========================================================= */

function applyFiltersAndSort() {
    const searchTerm =
        searchInput.value
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

    const sevenDaysLater =
        new Date();

    sevenDaysLater.setDate(
        sevenDaysLater.getDate() + 7
    );

    const sevenDaysDate =
        getLocalDateString(
            sevenDaysLater
        );

    const filteredOrders =
        orders.filter(
            function (order) {
                const searchableText = [
                    order.id,
                    order.customer,
                    order.contact,
                    order.item,
                    order.color,
                    order.notes,
                    order.status,
                    order.dueDate
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
                        Boolean(order.dueDate) &&
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
                        Boolean(order.dueDate) &&
                        order.dueDate >= today &&
                        order.dueDate <=
                            sevenDaysDate;
                }

                if (
                    selectedDueDate ===
                    "Future"
                ) {
                    matchesDueDate =
                        Boolean(order.dueDate) &&
                        order.dueDate >
                            sevenDaysDate;
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
                Delivered orders stay at the bottom
                while All Statuses is selected.
            */

            if (selectedStatus === "All") {
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
                selectedSort === "DueSoon"
            ) {
                const difference =
                    getDueDateTime(orderA) -
                    getDueDateTime(orderB);

                if (difference !== 0) {
                    return difference;
                }

                return (
                    getCreatedTime(orderB) -
                    getCreatedTime(orderA)
                );
            }

            if (
                selectedSort === "DueLate"
            ) {
                const difference =
                    getDueDateTime(orderB) -
                    getDueDateTime(orderA);

                if (difference !== 0) {
                    return difference;
                }

                return (
                    getCreatedTime(orderB) -
                    getCreatedTime(orderA)
                );
            }

            const priorityDifference =
                getStatusPriority(
                    orderA.status
                ) -
                getStatusPriority(
                    orderB.status
                );

            if (
                priorityDifference !== 0
            ) {
                return priorityDifference;
            }

            /*
                Within the same status,
                newest orders appear first.
            */

            return (
                getCreatedTime(orderB) -
                getCreatedTime(orderA)
            );
        }
    );

    renderOrders(filteredOrders);
}


searchInput.addEventListener(
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
        searchInput.value = "";

        statusFilter.value = "All";
        dueDateFilter.value = "All";
        sortFilter.value = "Priority";

        applyFiltersAndSort();
    }
);


/* =========================================================
   TABLE RENDERING
========================================================= */

function renderOrders(
    displayedOrders = orders
) {
    if (displayedOrders.length === 0) {
        orderTable.innerHTML = `
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

    orderTable.innerHTML =
        displayedOrders
            .map(
                function (order) {
                    return `
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
                                ₱${formatMoney(
                                    getUnitPrice(order)
                                )}
                            </td>

                            <td>
                                ₱${formatMoney(
                                    getTotalPrice(order)
                                )}
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
                                    class="action-button edit-button"
                                    data-action="edit"
                                    data-id="${escapeHTML(
                                        order.firestoreId
                                    )}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="action-button delete-button"
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
            )
            .join("");
}


orderTable.addEventListener(
    "click",

    function (event) {
        const button =
            event.target.closest(
                "button[data-action]"
            );

        if (!button) {
            return;
        }

        const documentId =
            button.dataset.id;

        if (
            button.dataset.action ===
            "edit"
        ) {
            editOrder(documentId);
        }

        if (
            button.dataset.action ===
            "delete"
        ) {
            deleteOrder(documentId);
        }
    }
);


/* =========================================================
   EDIT ORDER
========================================================= */

function editOrder(documentId) {
    const order =
        orders.find(
            function (currentOrder) {
                return (
                    currentOrder.firestoreId ===
                    documentId
                );
            }
        );

    if (!order) {
        alert("Order not found.");
        return;
    }

    editingDocumentId =
        documentId;

    setInputValue(
        "customer",
        order.customer
    );

    setInputValue(
        "contact",
        order.contact
    );

    setInputValue(
        "item",
        order.item
    );

    setInputValue(
        "qty",
        order.qty
    );

    setInputValue(
        "color",
        order.color
    );

    setInputValue(
        "dueDate",
        order.dueDate
    );

    setInputValue(
        "price",
        getUnitPrice(order)
    );

    setInputValue(
        "status",
        order.status
    );

    setInputValue(
        "notes",
        order.notes
    );

    formTitle.textContent =
        "Edit Order";

    submitButton.textContent =
        "Update Order";

    cancelEditButton.classList.remove(
        "hidden"
    );

    updateEstimatedTotal();

    orderForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   DELETE ORDER
========================================================= */

async function deleteOrder(documentId) {
    const order =
        orders.find(
            function (currentOrder) {
                return (
                    currentOrder.firestoreId ===
                    documentId
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
                documentId
            )
        );

        if (
            editingDocumentId ===
            documentId
        ) {
            resetForm();
        }
    } catch (error) {
        console.error(
            "Delete order error:",
            error
        );

        alert(
            `Unable to delete the order: ${
                error.code ||
                error.message
            }`
        );
    }
}


/* =========================================================
   DASHBOARD TOTALS
========================================================= */

function updateDashboard() {
    document.getElementById(
        "totalOrders"
    ).textContent =
        orders.length;

    document.getElementById(
        "pendingOrders"
    ).textContent =
        orders.filter(
            function (order) {
                return (
                    order.status !==
                    "Delivered"
                );
            }
        ).length;

    document.getElementById(
        "completedOrders"
    ).textContent =
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
                    getTotalPrice(order)
                );
            },
            0
        );

    document.getElementById(
        "totalSales"
    ).textContent =
        formatMoney(totalSales);
}


/* =========================================================
   THEME
========================================================= */

function updateThemeButton() {
    const darkMode =
        document.body.classList.contains(
            "dark-mode"
        );

    themeToggle.textContent =
        darkMode
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";
}


if (
    localStorage.getItem("theme") ===
    "dark"
) {
    document.body.classList.add(
        "dark-mode"
    );
}

updateThemeButton();


themeToggle.addEventListener(
    "click",

    function () {
        document.body.classList.toggle(
            "dark-mode"
        );

        const darkMode =
            document.body.classList.contains(
                "dark-mode"
            );

        localStorage.setItem(
            "theme",
            darkMode
                ? "dark"
                : "light"
        );

        updateThemeButton();
    }
);
