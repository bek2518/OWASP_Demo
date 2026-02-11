const express = require("express");
const app = express();

app.use(express.json());

let inboxes = {}; // per-email inbox

// Receive OTP
app.post("/send-otp", (req, res) => {
  const { email, hospital_name, otp } = req.body;

  if (!inboxes[email]) inboxes[email] = [];
  inboxes[email].push({ hospital_name, otp, time: new Date() });

  console.log(`[OTP Service] OTP for ${email}: ${otp}`);
  res.json({ status: "delivered" });
});

// View inbox for specific email
app.get("/inbox", (req, res) => {
  const email = req.query.email;
  if (!email) return res.send("Provide ?email=your_email");

  const messages = inboxes[email] || [];
  let html = `<h1>Inbox for ${email}</h1>`;
  messages.forEach(msg => {
    html += `
      <div style="border:1px solid #ccc;padding:10px;margin:10px;border-radius:5px;">
        <strong>MedSupply OTP</strong><br>
        Hospital: ${msg.hospital_name}<br>
        OTP: <b>${msg.otp}</b><br>
        Time: ${msg.time}
      </div>
    `;
  });
  res.send(html);
});

app.listen(4444, () => console.log("Mail service running at http://localhost:4444"));
