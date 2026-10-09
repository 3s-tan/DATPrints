import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/* ==========================
   FIREBASE CONFIG
========================== */

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
const ordersRef = collection(db, "orders");

/* ==========================
   VARIABLES
========================== */

let orders = [];
let editingId = null;

const form = document.getElementById("orderForm");
const table = document.getElementById("orderTable");
const search = document.getElementById("search");

/* ==========================
   REALTIME FIRESTORE
========================== */

onSnapshot(ordersRef, (snapshot) => {

    orders = [];

    snapshot.forEach((docSnap) => {

        orders.push({
            firestoreId: docSnap.id,
            ...docSnap.data()
        });

    });

    renderOrders();

});

/* ==========================
   ADD / UPDATE ORDER
========================== */

form.addEventListener("submit", async function(e){

    e.preventDefault();

    const order = {

        id: editingId || Date.now(),

        customer:
        document.getElementById("customer").value,

        contact:
        document.getElementById("contact").value,

        item:
        document.getElementById("item").value,

        qty:
        document.getElementById("qty").value,

        color:
        document.getElementById("color").value,

        dueDate:
        document.getElementById("dueDate").value,

        price:
        Number(
            document.getElementById("price").value
        ),

        status:
        document.getElementById("status").value,

        notes:
        document.getElementById("notes").value

    };

    try{

        if(editingId){

            const existing =
            orders.find(
                o => o.id === editingId
            );

            await updateDoc(
                doc(
                    db,
                    "orders",
                    existing.firestoreId
                ),
                order
            );

            editingId = null;

            document
            .getElementById(
                "submitButton"
            ).innerText =
            "Add Order";

        }
        else{

            await addDoc(
                ordersRef,
                order
            );

        }

        form.reset();

    }
    catch(error){

        console.error(error);

        alert(
            "Error saving order."
        );

    }

});

/* ==========================
   RENDER
========================== */

function renderOrders(
    filtered = orders
){

    table.innerHTML = "";

    filtered.forEach(order => {

        table.innerHTML += `
        <tr>
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.contact}</td>
            <td>${order.item}</td>
            <td>${order.qty}</td>
            <td>${order.color}</td>
            <td>${order.dueDate}</td>
            <td>₱${order.price}</td>
            <td>${order.status}</td>
            <td>${order.notes || ""}</td>

            <td>

                <button
                class="actionBtn edit"
                onclick="editOrder(${order.id})">
                Edit
                </button>

                <button
                class="actionBtn delete"
                onclick="deleteOrder(${order.id})">
                Delete
                </button>

            </td>

        </tr>
        `;

    });

    updateDashboard();

}

/* ==========================
   DASHBOARD
========================== */

function updateDashboard(){

    document.getElementById(
        "totalOrders"
    ).innerText =
    orders.length;

    document.getElementById(
        "pendingOrders"
    ).innerText =
    orders.filter(
        o =>
        o.status !== "Delivered"
    ).length;

    document.getElementById(
        "completedOrders"
    ).innerText =
    orders.filter(
        o =>
        o.status === "Delivered"
    ).length;

    document.getElementById(
        "totalSales"
    ).innerText =
    orders.reduce(
        (
            sum,
            o
        ) => sum + o.price,
        0
    ).toFixed(2);

}

/* ==========================
   DELETE
========================== */

window.deleteOrder =
async function(id){

    const order =
    orders.find(
        o => o.id === id
    );

    if(
        !confirm(
            "Delete this order?"
        )
    ){
        return;
    }

    await deleteDoc(
        doc(
            db,
            "orders",
            order.firestoreId
        )
    );

};

/* ==========================
   EDIT
========================== */

window.editOrder =
function(id){

    const order =
    orders.find(
        o => o.id === id
    );

    editingId = id;

    document.getElementById(
        "customer"
    ).value =
    order.customer;

    document.getElementById(
        "contact"
    ).value =
    order.contact;

    document.getElementById(
        "item"
    ).value =
    order.item;

    document.getElementById(
        "qty"
    ).value =
    order.qty;

    document.getElementById(
        "color"
    ).value =
    order.color;

    document.getElementById(
        "dueDate"
    ).value =
    order.dueDate;

    document.getElementById(
        "price"
    ).value =
    order.price;

    document.getElementById(
        "status"
    ).value =
    order.status;

    document.getElementById(
        "notes"
    ).value =
    order.notes;

    document.getElementById(
        "submitButton"
    ).innerText =
    "Update Order";

};

/* ==========================
   SEARCH
========================== */

search.addEventListener(
"input",
function(){

    const term =
    search.value
    .toLowerCase();

    const filtered =
    orders.filter(order =>

        order.customer
        .toLowerCase()
        .includes(term)

        ||

        order.item
        .toLowerCase()
        .includes(term)

    );

    renderOrders(filtered);

});

/* ==========================
   DARK MODE
========================== */

const themeToggle =
document.getElementById(
    "themeToggle"
);

const savedTheme =
localStorage.getItem(
    "theme"
);

if(
    savedTheme === "dark"
){
    document.body
    .classList
    .add("dark-mode");

    themeToggle.innerHTML =
    "☀️ Light Mode";
}

themeToggle.addEventListener(
"click",
function(){

    document.body
    .classList
    .toggle("dark-mode");

    if(
        document.body
        .classList
        .contains("dark-mode")
    ){

        localStorage.setItem(
            "theme",
            "dark"
        );

        themeToggle.innerHTML =
        "☀️ Light Mode";

    }
    else{

        localStorage.setItem(
            "theme",
            "light"
        );

        themeToggle.innerHTML =
        "🌙 Dark Mode";

    }

});
