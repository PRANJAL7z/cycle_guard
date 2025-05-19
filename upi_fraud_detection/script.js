// script.js

// --- Data Structures ---
let users = [
  { id: '1', name: 'Pranjal' },
  { id: '2', name: 'Shubham' },
  { id: '3', name: 'Rohit' }
];
let transactions = [];
let darkMode = false;
let activeTab = 'visualization';
let lastFraudCycleCount = 0; // For fraud alert

// --- Utility Functions ---  
function uuid() { return Date.now().toString() + Math.random().toString(36).slice(2); }

function detectFraudCycles(users, transactions) {
  const adjacency = {};
  users.forEach(u => adjacency[u.id] = []);
  transactions.forEach(t => adjacency[t.fromUserId].push(t.toUserId));

  const cycles = [];
  function dfs(path, visited, start, current) {
    if (visited[current]) {
      if (current === start && path.length > 1) {
        const cycleTx = [];
        for (let i = 0; i < path.length - 1; i++) {
          const from = path[i], to = path[i+1];
          const tx = transactions.find(t => t.fromUserId === from && t.toUserId === to);
          if (tx) cycleTx.push(tx);
        }
        const userIds = Array.from(new Set(path));
        const totalAmount = cycleTx.reduce((sum, t) => sum + t.amount, 0);
        const riskScore = Math.min(100, 50 + cycleTx.length * 10);
        cycles.push({ transactions: cycleTx, users: userIds, totalAmount, riskScore });
      }
      return;
    }
    visited[current] = true;
    adjacency[current].forEach(next => dfs([...path, next], {...visited}, start, next));
  }
  users.forEach(u => dfs([u.id], {}, u.id, u.id));
  const unique = [];
  const seen = new Set();
  for (const c of cycles) {
    const key = c.users.sort().join('-');
    if (!seen.has(key)) { unique.push(c); seen.add(key); }
  }
  return unique;
}

// --- Fraud Alert Notification ---
function showFraudAlert(message) {
  const alertDiv = document.getElementById('fraud-alert');
  alertDiv.innerHTML = `
    <span>${message}</span>
    <button class="fraud-btn" onclick="viewFraudReport()">Show Report</button>
    <button class="fraud-btn" onclick="showPreviousCycles()">Check Previous Cycles</button>
  `;
  alertDiv.classList.remove('hidden');
  clearTimeout(window.fraudAlertTimeout);
  window.fraudAlertTimeout = setTimeout(() => {
    alertDiv.classList.add('hidden');
  }, 5000);
}

// This function will switch to the Fraud Report tab and hide the alert
window.viewFraudReport = function() {
  alertDiv = document.getElementById('fraud-alert');
  alertDiv.classList.add('hidden');
  setTab('fraud');
}

// --- Rendering Functions ---
function render() {
  // Sidebar: Users and Transaction Form
  document.getElementById('sidebar').innerHTML = `
    <section class="card">
      <div class="card-title">Users</div>
      <form onsubmit="addUser(event)" class="user-form">
        <input id="newUserName" type="text" placeholder="Enter user name" required>
        <button type="submit">Add</button>
      </form>
      <ul class="user-list">
        ${users.map(u => `<li>${u.name} <button onclick="removeUser('${u.id}')" title="Remove user" style="color:#f59e42;background:none;border:none;cursor:pointer;">&times;</button></li>`).join('')}
      </ul>
    </section>
    <section class="card">
      <div class="card-title">$ Record Transaction</div>
      <form onsubmit="addTransaction(event)" class="txn-form-vertical">
        <label for="fromUser" class="form-label">From User</label>
        <select id="fromUser" required>
          <option value="">Select sender</option>
          ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
        </select>
        <label for="toUser" class="form-label">To User</label>
        <select id="toUser" required>
          <option value="">Select recipient</option>
          ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
        </select>
        <label for="amount" class="form-label">Amount ($)</label>
        <input id="amount" type="number" min="1" placeholder="Enter amount" required>
        <button type="submit" style="margin-top:1rem;">Add</button>
      </form>
    </section>
  `;

  // Main panel: Tabs and content
  document.getElementById('main-panel').innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <span style="font-size:1.5rem;color:#60a5fa;">ⓘ</span>
        <span style="font-size:1.5rem;font-weight:bold;">CycleGuard</span>
        <span style="background:#3b82f6;color:#fff;border-radius:999px;font-size:0.85rem;padding:0.2rem 0.7rem;margin-left:0.5rem;">Fraud Detection</span>
      </div>
    </header>
    <nav class="tabs">
      <button class="tab${activeTab === 'visualization' ? ' active' : ''}" onclick="setTab('visualization')">Network Visualization</button>
      <button class="tab${activeTab === 'history' ? ' active' : ''}" onclick="setTab('history')">Transaction History</button>
      <button class="tab${activeTab === 'fraud' ? ' active' : ''}" onclick="setTab('fraud')">Fraud Report <span class="tab-badge">${detectFraudCycles(users, transactions).length}</span></button>
    </nav>
    <div class="tab-content">
      ${activeTab === 'visualization' ? `
        <div>
          <div class="stat-row">
            <div class="stat-box"><b>${users.length}</b> Users</div>
            <div class="stat-box"><b>${transactions.length}</b> Transactions</div>
            <div class="stat-box"><b>${transactions.length ? ('₹' + (transactions.reduce((a, t) => a + t.amount, 0) / transactions.length).toLocaleString(undefined, {maximumFractionDigits:2})) : '₹0'}</b> Avg Amount</div>
            <div class="stat-box stat-fraud"><b>${detectFraudCycles(users, transactions).length}</b> Potential Fraud Cycles</div>
          </div>
          <canvas id="graphCanvas" width="700" height="400"></canvas>
          <div style="margin-top:1rem;font-size:0.95rem;color:#c7d2fe;">
            <span style="display:inline-block;width:1rem;height:1rem;background:#2563eb;border-radius:50%;margin-right:0.5rem;"></span>Normal User
            <span style="display:inline-block;width:1rem;height:1rem;background:#f59e42;border-radius:50%;margin:0 0.5rem 0 1.5rem;"></span>User in Suspicious Cycle
          </div>
        </div>
      ` : ''}
      ${activeTab === 'history' ? `
        <div>
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${getUserName(t.fromUserId)}</td>
                  <td>${getUserName(t.toUserId)}</td>
                  <td>₹${t.amount.toLocaleString()}</td>
                  <td>${new Date(t.timestamp).toLocaleString()}</td>
                  <td><button onclick="removeTransaction('${t.id}')" style="color:#f59e42;background:none;border:none;cursor:pointer;">🗑️</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      ${activeTab === 'fraud' ? `
        <div>
          <div style="background:#22325a;color:#c7d2fe;border-radius:0.5rem;padding:1rem;margin-bottom:1.5rem;">
            <b>Fraud Detection Report</b><br>
            ${detectFraudCycles(users, transactions).length} potential fraud cycles have been detected in the transaction network. Review each cycle carefully.
          </div>
          <div>
            ${detectFraudCycles(users, transactions).length === 0
              ? `<div style="color:#16a34a;">No fraud cycles detected.</div>`
              : detectFraudCycles(users, transactions).map((cycle, idx) => `
                <div class="fraud-cycle">
                  <span class="cycle-title">Cycle #${idx + 1}</span>
                  <span class="cycle-risk">Risk Score: ${cycle.riskScore}/100</span>
                  <span class="cycle-amount">₹${cycle.totalAmount.toLocaleString()}</span>
                </div>
              `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // --- Improved Graph Drawing ---
  if (activeTab === 'visualization') {
    const canvas = document.getElementById('graphCanvas');
    if (canvas && users.length > 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Layout: Place nodes in a circle, radius increases with user count
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const minRadius = 120;
      const maxRadius = Math.min(centerX, centerY) - 40;
      const radius = Math.max(minRadius, Math.min(maxRadius, users.length * 28));
      const angleStep = (2 * Math.PI) / users.length;

      // Find users in suspicious cycles
      const fraudUserIds = new Set();
      detectFraudCycles(users, transactions).forEach(cycle => cycle.users.forEach(uid => fraudUserIds.add(uid)));

      // Calculate node positions
      const positions = {};
      users.forEach((u, i) => {
        const angle = i * angleStep - Math.PI / 2;
        positions[u.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });

      // Draw edges (transactions)
      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      ctx.globalAlpha = 0.7;
      transactions.forEach(t => {
        const from = positions[t.fromUserId];
        const to = positions[t.toUserId];
        if (from && to) {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      });
      ctx.restore();

      // Draw nodes (users)
      users.forEach((u, i) => {
        const { x, y } = positions[u.id];
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, 2 * Math.PI);
        ctx.fillStyle = fraudUserIds.has(u.id) ? "#f59e42" : "#2563eb";
        ctx.shadowColor = "#0008";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw user name
        ctx.font = "bold 1rem Segoe UI, Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(u.name, x, y - 28);
      });
    }
  }
}

function getUserName(id) {
  const user = users.find(u => u.id === id);
  return user ? user.name : 'Unknown';
}

// --- Event Handlers ---
window.addUser = async function(event) {
  event.preventDefault();
  const name = document.getElementById('newUserName').value.trim();
  if (name && !users.some(u => u.name === name)) {
    users.push({ id: uuid(), name });
    await saveData();
    render();
  }
  event.target.reset();
};

window.removeUser = async function(id) {
  users = users.filter(u => u.id !== id);
  transactions = transactions.filter(t => t.fromUserId !== id && t.toUserId !== id);
  await saveData();
  render();
};

window.addTransaction = async function(event) {
  event.preventDefault();
  const fromUserId = document.getElementById('fromUser').value;
  const toUserId = document.getElementById('toUser').value;
  const amount = parseFloat(document.getElementById('amount').value);
  if (fromUserId && toUserId && fromUserId !== toUserId && amount > 0) {
    transactions.push({
      id: uuid(),
      fromUserId,
      toUserId,
      amount,
      timestamp: new Date().toISOString()
    });
    const fraudCycles = detectFraudCycles(users, transactions);
    if (fraudCycles.length > lastFraudCycleCount) {
      showFraudAlert("⚠️ Potential Fraud Detected<br>The new transaction may be part of a suspicious cycle.");
    }
    lastFraudCycleCount = fraudCycles.length;
    await saveData();
    render();
  }
  event.target.reset();
};

window.removeTransaction = async function(id) {
  transactions = transactions.filter(t => t.id !== id);
  await saveData();
  render();
};

window.setTab = function(tab) {
  activeTab = tab;
  render();
};

// Save data to Flask backend
async function saveData() {
  await fetch('/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users, transactions })
  });
}

// Load data from Flask backend
async function loadData() {
  const res = await fetch('/data');
  const data = await res.json();
  users = data.users || [];
  transactions = data.transactions || [];
  render();
}

// --- Simple Graph Visualization ---
function drawGraph() {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Layout users in a circle
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 40;
  const angleStep = (2 * Math.PI) / users.length;
  const positions = {};
  users.forEach((u, i) => {
    const angle = i * angleStep;
    positions[u.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  // Draw edges (transactions) with amount as label
  ctx.save();
  ctx.strokeStyle = "#94a3b8";
  ctx.globalAlpha = 0.7;
  transactions.forEach(t => {
    const from = positions[t.fromUserId];
    const to = positions[t.toUserId];
    if (from && to) {
      // Draw edge
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // Draw amount label at midpoint
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      ctx.save();
      ctx.font = "bold 13px Segoe UI, Arial";
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#232d41";
      ctx.lineWidth = 4;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Draw background for text for readability
      ctx.strokeText(`₹${t.amount}`, midX, midY - 8);
      ctx.fillText(`₹${t.amount}`, midX, midY - 8);
      ctx.restore();
    }
  });
  ctx.restore();

  // Draw nodes (users)
  users.forEach(u => {
    const pos = positions[u.id];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#2563eb";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.name[0], pos.x, pos.y); // Show initial
  });
}

// --- Initial Render ---
render();
loadData();

function showPreviousCycles() {
  const cycles = detectFraudCycles(users, transactions);
  let html = `<div style="background:#232d41;padding:2rem 2.5rem;border-radius:1rem;max-width:600px;margin:5vh auto;color:#fff;box-shadow:0 4px 24px #0008;">
    <h2 style="margin-bottom:1rem;">Previous Fraud Cycles</h2>
    ${
      cycles.length === 0
        ? '<div>No fraud cycles detected.</div>'
        : `<table style="width:100%;border-collapse:collapse;background:#1a2235;">
            <thead>
              <tr>
                <th style="padding:8px;border-bottom:1px solid #334155;">#</th>
                <th style="padding:8px;border-bottom:1px solid #334155;">Users in Cycle</th>
                <th style="padding:8px;border-bottom:1px solid #334155;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${cycles
                .map(
                  (cycle, idx) => `
                  <tr>
                    <td style="padding:8px;text-align:center;">${idx + 1}</td>
                    <td style="padding:8px;">${cycle.users.map(getUserName).join(', ')}</td>
                    <td style="padding:8px;">₹${cycle.totalAmount.toLocaleString()}</td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>`
    }
    <button onclick="closeModal()" style="margin-top:1rem;background:#3b82f6;color:#fff;padding:0.5rem 1.2rem;border:none;border-radius:0.4rem;cursor:pointer;">Close</button>
  </div>`;
  let modal = document.createElement('div');
  modal.id = 'fraud-modal';
  modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000a;z-index:2000;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = html;
  document.body.appendChild(modal);
  window.closeModal = function() {
    document.body.removeChild(modal);
  };
}

// --- Data Export/Import ---
function exportData() {
  const data = {
    users,
    transactions
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'upi_fraud_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.users) && Array.isArray(data.transactions)) {
        users = data.users;
        transactions = data.transactions;
        render();
        alert('Data imported successfully!');
      } else {
        alert('Invalid file format.');
      }
    } catch (err) {
      alert('Failed to import data: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// --- PIN Security Overlay ---
const CORRECT_PIN = "123456"; // Change as needed
let pinAttempts = 0;
const MAX_ATTEMPTS = 3;

window.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('pin-overlay');
  const form = document.getElementById('pin-form');
  const input = document.getElementById('pin-input');
  const error = document.getElementById('pin-error');
  form.onsubmit = function(e) {
    e.preventDefault();
    if (input.value === CORRECT_PIN) {
      overlay.style.display = 'none';
      loadData(); // <-- Only load data after PIN is correct
    } else {
      pinAttempts++;
      error.style.display = 'block';
      input.value = '';
      input.focus();
      if (pinAttempts >= MAX_ATTEMPTS) {
        overlay.innerHTML = `
          <div style="background:#fff;padding:2rem 2.5rem;border-radius:1rem;box-shadow:0 4px 24px #0008;display:flex;flex-direction:column;align-items:center;min-width:320px;">
            <h2 style="color:#e11d48;margin-bottom:1rem;">Access Denied</h2>
            <p style="color:#334155;text-align:center;margin-bottom:1.5rem;">
              Too many incorrect PIN attempts.<br>
              This session has been locked for security reasons.
            </p>
          </div>
        `;
        document.body.innerHTML = overlay.outerHTML;
      }
    }
  };
  input.oninput = () => { error.style.display = 'none'; };
});