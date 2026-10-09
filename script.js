let orders =
JSON.parse(localStorage.getItem("orders")) || [];

const form = document.getElementById("orderForm");
const table = document.getElementById("orderTable");
const search = document.getElementById("search");

form.addEventListener("submit", function(e){

    e.preventDefault();

    const order = {

        id: Date.now(),

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

    orders.push(order);

    saveData();
    renderOrders();

    form.reset();

});

function renderOrders(filtered = orders){

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

function updateDashboard(){

    document.getElementById("totalOrders").innerText =
    orders.length;

    document.getElementById("pendingOrders").innerText =
    orders.filter(
    o => o.status !== "Delivered").length;

    document.getElementById("completedOrders").innerText =
    orders.filter(
    o => o.status === "Delivered").length;

    document.getElementById("totalSales").innerText =
    orders.reduce(
    (sum,o)=>sum+o.price,0);
}

function deleteOrder(id){

    orders =
    orders.filter(order => order.id !== id);

    saveData();
    renderOrders();
}

function editOrder(id){

    const order =
    orders.find(o => o.id === id);

    document.getElementById("customer").value =
    order.customer;

    document.getElementById("contact").value =
    order.contact;

    document.getElementById("item").value =
    order.item;

    document.getElementById("qty").value =
    order.qty;

    document.getElementById("color").value =
    order.color;

    document.getElementById("dueDate").value =
    order.dueDate;

    document.getElementById("price").value =
    order.price;

    document.getElementById("status").value =
    order.status;

    document.getElementById("notes").value =
    order.notes;

    deleteOrder(id);
}

function saveData(){

    localStorage.setItem(
    "orders",
    JSON.stringify(orders)
    );
}

search.addEventListener("input", function(){

    const term =
    search.value.toLowerCase();

    const filtered =
    orders.filter(order =>
        order.customer.toLowerCase().includes(term)
        ||
        order.item.toLowerCase().includes(term)
    );

    renderOrders(filtered);
});

renderOrders();

/* ==========================
   DARK MODE
========================== */

const themeToggle =
document.getElementById("themeToggle");

const savedTheme =
localStorage.getItem("theme");

if(savedTheme === "dark"){
    document.body.classList.add("dark-mode");
    themeToggle.innerHTML =
    "☀️ Light Mode";
}

themeToggle.addEventListener(
"click",
function(){

    document.body.classList.toggle(
    "dark-mode"
    );

    if(
        document.body.classList.contains(
        "dark-mode"
        )
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