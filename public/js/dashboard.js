const container = document.getElementById("dashboard");
const userId = container.dataset.userId;

fetch(`/api/users/${userId}/orders`)
  .then(res => res.json())
  .then(orders => {
    renderStats(orders);
    renderOrders(orders);
  });

function renderStats(orders) {
  const total = orders.length;
  const pending = orders.filter(o =>
    o.status.toLowerCase().includes("pending")
  ).length;

  const shipped = orders.filter(o =>
    o.status.toLowerCase().includes("shipped")
  ).length;

  document.getElementById("stats").innerHTML = `
    <div class="grid">
      <div class="card">
        <h3>Total Orders</h3><p>${total}</p>
      </div>
      <div class="card">
        <h3>Pending</h3><p>${pending}</p>
      </div>
      <div class="card">
        <h3>Shipped</h3><p>${shipped}</p>
      </div>
    </div>
  `;
}


function renderOrders(orders) {
  const container = document.getElementById("orders");

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="card">
        <h2>Order List</h2>
        <p style="padding: 1rem; text-align:center; color:#666;">
          No orders found.
        </p>
      </div>
    `;
    return;
  }

  const rows = orders.map(o => `
    <tr>
      <td>${o.medication_name}</td>
      <td>${o.quantity}</td>
      <td>
        <span class="status-badge ${o.status.toLowerCase().replace(/\s/g, " ")}">
          ${o.status}
        </span>
      </td>
      <td>${o.batch_number}</td>
      <td>${new Date(o.requested_at).toLocaleDateString()}</td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="card">
      <h2>Order List</h2>
      <table>
        <tr>
          <th>Medication</th>
          <th>Quantity</th>
          <th>Status</th>
          <th>Batch</th>
          <th>Requested At</th>
        </tr>
        ${rows}
      </table>
    </div>
  `;
}

