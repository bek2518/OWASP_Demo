const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const axios = require("axios");
const Database = require("better-sqlite3");
const app = express();
const db = new Database("medsupply.db");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "medsupply_secret_v3",
    resave: false,
    saveUninitialized: true,
  }),
);

/* =================================================
   DATABASE
================================================= */

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  hospital_name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'hospital'
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  medication_name TEXT,
  quantity INTEGER,
  status TEXT,
  requested_at TEXT,
  batch_number TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subject TEXT,
  message TEXT,
  status TEXT
);
`);

/* =================================================
   SEED DATA
================================================= */
function seedDemoData() {
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (count > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (id,hospital_name,email,password_hash,role)
    VALUES (?, ?, ?, ?, ?)
  `);

  const hospitals = [
    [
      "Addis General Hospital",
      "addis.general@medsupply.local",
      "Password123",
      "hospital",
    ],
    [
      "Bahir Dar Clinic",
      "bahirdar.clinic@medsupply.local",
      "StrongPass123",
      "hospital",
    ],
    [
      "Hawassa Medical Center",
      "hawassa.center@medsupply.local",
      "Meds12345",
      "hospital",
    ],
    ["MedSupply Support", "support@medsupply.local", "Support123", "support"],
    ["System Administrator", "admin@medsupply.local", "Admin123", "admin"],
  ];

  hospitals.forEach(([name, email, pwd, role]) => {
    const hash = bcrypt.hashSync(pwd, 8);
    insertUser.run(crypto.randomUUID(), name, email, hash, role);
  });

  const insertOrder = db.prepare(`
    INSERT INTO orders (id,user_id,medication_name,quantity,status,requested_at,batch_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const users = db.prepare("SELECT * FROM users WHERE role='hospital'").all();

  const meds = [
    ["Amoxicillin 500mg", 200, "Shipped"],
    ["Paracetamol 500mg", 500, "Pending Approval"],
    ["Insulin 100IU", 100, "Delivered"],
    ["Omeprazole 20mg", 300, "Pending Approval"],
    ["Vitamin D 1000IU", 150, "Shipped"],
  ];

  users.forEach((u) => {
    meds.forEach((m) => {
      insertOrder.run(
        crypto.randomUUID(),
        u.id,
        m[0],
        m[1],
        m[2],
        new Date().toISOString(),
        crypto.randomBytes(4).toString("hex"),
      );
    });
  });

  console.log("Seeded demo users and orders.");
}
seedDemoData();

/* =================================================
   HELPERS
================================================= */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function currentUser(req) {
  return req.session.user;
}

function isValidPassword(pwd) {
  // Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd);
}


/* =================================================
   ROUTES
================================================= */

app.get("/", (req, res) => {
  res.send(renderPage("Home", `
    <!-- Hero Section -->
    <div class="card" style="text-align:center;background:#1f3c88;color:white;">
      <h1>Welcome to MedSupply Portal</h1>
      <p>Your centralized medication procurement system for hospitals.</p>
      <img src="https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&dl=myriam-zilles-KltoLK6Mk-g-unsplash.jpg" 
           style="width:100%;max-width:600px;border-radius:12px;margin-top:15px;" />
    </div>

    <!-- Features Section -->
    <div class="grid">
      <div class="card" style="background:#e3f2fd">
        <img width="50" height="50" src="https://img.icons8.com/ios/50/pharma.png" alt="pharma"/>
        <h3>Manage Orders</h3>
        <p>Create, track, and manage your medication orders easily.</p>
      </div>
      <div class="card" style="background:#fff3e0">
        <img src="https://img.icons8.com/ios-filled/50/ff9900/hospital.png"/>
        <h3>Hospital Dashboard</h3>
        <p>Monitor inventory, pending requests, and shipments.</p>
      </div>
      <div class="card" style="background:#e8f5e9">
        <img width="100" height="100" src="https://img.icons8.com/comic/100/package.png" alt="package"/>
        <h3>Procurement Feed</h3>
        <p>See recent procurement activity across all hospitals.</p>
      </div>
    </div>

    <!-- Testimonials / Dummy Data -->
    <div class="grid">
      <div class="card">
        <h3>Addis General Hospital</h3>
        <p>“MedSupply makes tracking our medication orders seamless and easy.”</p>
      </div>
      <div class="card">
        <h3>Bahir Dar Clinic</h3>
        <p>“The real-time procurement feed is a lifesaver for inventory management.”</p>
      </div>
      <div class="card">
        <h3>Hawassa Medical Center</h3>
        <p>“Tracking pending orders and shipments has never been easier.”</p>
      </div>
    </div>
  `, currentUser(req)));
});


/* ---------- REGISTER ---------- */
app.get("/register", (req, res) => {
  res.send(renderPage("Register", `
    <div class="card" style="max-width:400px;margin:auto;">
      <h2>Hospital Registration</h2>
      <form id="registerForm" method="POST">
        <label>Hospital Name:</label>
        <input name="hospital_name" required/><br>

        <label>Email:</label>
        <input name="email" type="email" required/><br>

        <label>Password:</label>
        <input type="password" name="password" id="password" required/>
        <small id="pwdHint" style="color:#555; display:block; margin-bottom:10px;">
          Password must be at least 8 characters, include uppercase, lowercase, and a number.
        </small>

        <button>Register</button>
      </form>

      <p id="errorMsg" style="color:red; font-weight:bold;"></p>
    </div>

    <script>
      const form = document.getElementById("registerForm");
      const passwordInput = document.getElementById("password");
      const errorMsg = document.getElementById("errorMsg");

      function isValidPassword(pwd) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/.test(pwd);
      }

      form.addEventListener("submit", function(e) {
        if(!isValidPassword(passwordInput.value)) {
          e.preventDefault();
          errorMsg.textContent = "Password must be at least 8 characters, include uppercase, lowercase, and a number.";
          passwordInput.focus();
        }
      });
    </script>
  `, currentUser(req)));
});

app.get("/profile", requireAuth, (req, res) => {
  const user = req.session.user;
  res.send(renderPage("Account Profile", `
    <div class="card" style="max-width:500px;margin:auto;">
      <h2>Account Profile</h2>
      <p><strong>Hospital Name:</strong> ${user.hospital_name}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p><em>Manage your account details here.</em></p>
    </div>
  `, user));
});



app.post("/register", async (req, res) => {
  const { hospital_name, email, password } = req.body;

  if (!isValidEmail(email)) return res.send("Invalid email format");
  if (!isValidPassword(password)) return res.send("Password must be at least 8 characters, include uppercase, lowercase and a number");

  const hash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  try {
    db.prepare("INSERT INTO users (id,hospital_name,email,password_hash) VALUES (?,?,?,?)")
      .run(id, hospital_name, email, hash);
  } catch (e) {
    return res.send("Email already exists");
  }

  res.redirect("/login");
});


/* ---------- LOGIN ---------- */
app.get("/login", (req, res) => {
  res.send(
    renderPage(
      "Login",
      `
    <div class="card">
      <h2>Login</h2>
      <form method="POST">
        Email:<input name="email"/><br>
        Password:<input type="password" name="password"/><br>
        <button>Login</button>
      </form>
    </div>
  `,
      currentUser(req),
    ),
  );
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!user) return res.send("Invalid credentials");
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.send("Invalid credentials");
  req.session.user = user;
  req.session.mfa_verified = false;

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  req.session.otp = otp;
  req.session.otp_expires = Date.now() + 5 * 60 * 1000;

  // Send to external OTP service
  await axios.post("http://localhost:4444/send-otp", {
    email: user.email,
    hospital_name: user.hospital_name,
    otp,
  });

  res.redirect("/verify-otp");
});

/* ---------- OTP ---------- */
app.get("/verify-otp", requireAuth, (req, res) => {
  res.send(
    renderPage(
      "OTP Verification",
      `
    <div class="card">
      <h2>Enter OTP</h2>
      <form method="POST">
        OTP Code:<input name="otp"/><br>
        <button>Verify</button>
      </form>
    </div>
  `,
      currentUser(req),
    ),
  );
});

app.post("/verify-otp", requireAuth, (req, res) => {
  const { otp } = req.body;
  if (otp === req.session.otp && Date.now() < req.session.otp_expires) {
    req.session.mfa_verified = true;
    return res.redirect("/dashboard");
  }
  res.send("Invalid or expired OTP");
});

/* ---------- DASHBOARD ---------- */
app.get("/dashboard", requireAuth, (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id=?")
    .all(req.session.user.id);
  let totalOrders = orders.length;
  let pending = orders.filter((o) =>
    o.status.toLowerCase().includes("pending"),
  ).length;
  let shipped = orders.filter((o) =>
    o.status.toLowerCase().includes("shipped"),
  ).length;

  let orderRows = orders
    .map(
      (o) => `
<tr>
  <td>${o.medication_name}</td>
  <td>${o.quantity}</td>
  <td><span class="status-badge ${o.status.toLowerCase().replace(/\s/g, "")}">${o.status}</span></td>
  <td>${o.batch_number}</td>
  <td>${new Date(o.requested_at).toLocaleDateString()}</td>
</tr>
`,
    )
    .join("");

  res.send(
    renderPage(
      "Dashboard",
      `
 <div class="grid">
  <div class="card" style="background:#e3f2fd">
    <h3>Total Orders</h3><p>${totalOrders}</p>
  </div>
  <div class="card" style="background:#fff3e0">
    <h3>Pending Orders</h3><p>${pending}</p>
  </div>
  <div class="card" style="background:#e8f5e9">
    <h3>Shipped Orders</h3><p>${shipped}</p>
  </div>
</div>

    <div class="card">
      <h2>Order List</h2>
      <table>
        <tr><th>Medication</th><th>Quantity</th><th>Status</th><th>Batch</th><th>Requested At</th><th>Image</th></tr>
        ${orderRows}
      </table>
    </div>
  `,
      currentUser(req),
    ),
  );
});

/* ---------- PROFILE ---------- */
app.get("/profile", requireAuth, (req, res) => res.json(req.session.user));

/* ---------- INTERNAL ACCOUNT SERVICE ---------- */

app.get("/internal", (req, res) => {
  res.redirect("/internal/api/");
});

app.get("/internal/api/", (req, res) => {
  res.status(403).send("Forbidden");
});

app.get("/internal/api/account", (req, res) => {
  res.status(403).send("Forbidden");
});

app.get("/internal/api/account/details", requireAuth, (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({
      status: "error",
      message: "Missing required parameter: user_id",
    });
  }

  const user = db
    .prepare(
      `
    SELECT id, hospital_name, email, password_hash
    FROM users
    WHERE id = ?
  `,
    )
    .get(user_id);

  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }

  res.json({
    status: "success",
    data: user,
  });
});

/* ---------- PUBLIC PROCUREMENT FEED PAGE ---------- */

app.get("/public-feed", requireAuth, (req, res) => {
  res.send(
    renderPage(
      "Public Procurement Feed",
      `
    <div class="card">
      <h2>Public Procurement Activity</h2>
      <p>Recent procurement activity across registered hospitals.</p>
      <div id="feed"></div>
    </div>

    <script>
fetch("/api/public-orders")
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("feed");
    let html = "<table><tr><th>Medication</th><th>Quantity</th><th>Hospital</th><th>Status</th></tr>";
    data.forEach(order => {
      html += "<tr>" +
        "<td>"+order.medication_name+"</td>" +
        "<td>"+order.quantity+"</td>" +
        "<td>"+order.hospital_name+"</td>" +
        "<td><span class='status-badge "+order.status.toLowerCase().replace(/\s/g,'')+"'>"+order.status+"</span></td>" +
        "</tr>";
    });
    html += "</table>";
    container.innerHTML = html;
  });

    </script>
  `,
      currentUser(req),
    ),
  );
});

/* ---------- PUBLIC ORDERS API (Subtle UUID Leak) ---------- */

app.get("/api/public-orders", requireAuth, (req, res) => {
  const orders = db
    .prepare(
      `
    SELECT 
      o.id,
      o.medication_name,
      o.quantity,
      o.status,
      u.hospital_name,
      u.id as requesting_hospital_id
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LIMIT 20
  `,
    )
    .all();

  res.json(orders);
});

/* ---------- LOGOUT ---------- */
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* ---------- PAGE RENDER HELPER ---------- */
function renderPage(title, content, user) {
  return `
  <html>
  <head>
    <title>${title} - MedSupply</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Inter', Arial, sans-serif;
        background: #f4f6f9;
        margin: 0;
        padding: 0;
        color: #333;
      }
      header {
        background: #1f3c88;
        color: white;
        padding: 15px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      header a {
        color: white;
        margin-left: 15px;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
      }
      header a:hover { color: #ffdd57; }
      .container { padding: 20px; max-width: 1200px; margin: auto; }
      .card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        margin-bottom: 20px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border-radius: 8px;
        overflow: hidden;
      }
      th, td {
        padding: 12px;
        text-align: left;
      }
      th {
        background: #1f3c88;
        color: white;
        font-weight: 600;
      }
      tr:nth-child(even) { background: #f9f9f9; }
      tr:hover { background: #e3f2fd; }
      .status-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.85em;
        color: white;
        font-weight: 600;
      }
      .pending { background: #fb8c00; }
      .shipped { background: #43a047; }
      .delivered { background: #1e88e5; }
      input, button {
        padding: 8px 12px;
        margin: 5px 0;
        border-radius: 6px;
        border: 1px solid #ccc;
        font-size: 1em;
      }
      button {
        background: #1f3c88;
        color: white;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      button:hover { background: #ffdd57; color: #333; }
      h2, h3 { margin-top: 0; }
      img.med-icon { width: 40px; height: 40px; border-radius: 8px; }
      footer {
        text-align: center;
        padding: 20px;
        color: #777;
        font-size: 0.9em;
      }
    </style>
  </head>
  <body>
 <header>
  <div><strong>MedSupply Procurement Portal</strong></div>
  <div style="position:relative;">
    ${
      user ? `
      <div id="publicOrders" style="display:inline-block; cursor:pointer; font-weight:500;">
        <a href="/public-feed">Public Orders</a>
      </div>
      <div id="profileMenu" style="display:inline-block; cursor:pointer; font-weight:500;">
        ${user.hospital_name} ▼
      </div>
      <div id="profileDropdown" style="
        display:none;
        position:absolute;
        right:0;
        background:white;
        border:1px solid #ccc;
        border-radius:8px;
        box-shadow:0 4px 12px rgba(0,0,0,0.15);
        min-width:150px;
        z-index:1000;
      ">
        <a href="/profile" style="display:block;padding:10px;text-decoration:none;color:#333;">Account</a>
        <a href="/logout" style="display:block;padding:10px;text-decoration:none;color:#333;">Logout</a>
      </div>
      ` : `
      <a href="/login">Login</a>
      <a href="/register">Register</a>
      `
    }
  </div>
</header>

<script>
  // Profile dropdown toggle
  const profileMenu = document.getElementById("profileMenu");
  const profileDropdown = document.getElementById("profileDropdown");

  if(profileMenu){
    profileMenu.addEventListener("click", () => {
      if(profileDropdown.style.display === "none"){
        profileDropdown.style.display = "block";
      } else {
        profileDropdown.style.display = "none";
      }
    });

    // Close dropdown if clicked outside
    document.addEventListener("click", (e) => {
      if(!profileMenu.contains(e.target) && !profileDropdown.contains(e.target)){
        profileDropdown.style.display = "none";
      }
    });
  }
</script>


    <div class="container">${content}</div>
    <footer>Created by 7h3D0c &copy; 2026</footer>
  </body>
  </html>
  `;
}

app.listen(3000, () =>
  console.log("MedSupply running at http://localhost:3000"),
);
