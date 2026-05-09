const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co';
const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8';
const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let allOrders = [];
let allStaff = [];

const STATUS_MAP = { 'quote': 'Báo Giá', 'ordered': 'Chốt Đơn', 'paid': 'Thu Tiền', 'debt': 'Công Nợ', 'lost': 'Rớt Đơn' };

// Utility
const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

// Auth
async function login() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    try {
        const { data, error } = await client.from('staff_users').select('*').eq('username', user).eq('password', pass).single();
        
        if (error || !data) {
            // Fallback for first time if table not created
            if (user === 'admin' && pass === '6688') {
                currentUser = { username: 'admin', full_name: 'Manager', role: 'manager' };
            } else {
                document.getElementById('login-err').style.display = 'block';
                return;
            }
        } else {
            currentUser = data;
        }

        localStorage.setItem('team_crm_user', JSON.stringify(currentUser));
        initApp();
    } catch (e) {
        console.error(e);
    }
}

function checkAuth() {
    const saved = localStorage.getItem('team_crm_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        initApp();
    }
}

async function initApp() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('current-user-name').innerText = currentUser.full_name;
    document.getElementById('current-user-role').innerText = currentUser.role.toUpperCase();

    if (currentUser.role === 'manager') {
        document.getElementById('staff-filter').classList.remove('hidden');
        fetchStaff();
    }

    refreshData();
}

async function fetchStaff() {
    const { data } = await client.from('staff_users').select('full_name');
    if (data) {
        allStaff = data.map(s => s.full_name);
        const filter = document.getElementById('staff-filter');
        data.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.full_name;
            opt.innerText = s.full_name;
            filter.appendChild(opt);
        });
    }
}

async function refreshData() {
    let query = client.from('orders').select('*').order('created_at', { ascending: false });
    
    // If sales, only see own leads
    if (currentUser.role === 'sales') {
        query = query.eq('salesperson_name', currentUser.full_name);
    }

    const { data, error } = await query;
    if (error) return;
    allOrders = data;
    
    renderDashboard();
    renderBoard();
}

function renderDashboard() {
    const paidOrders = allOrders.filter(o => o.status === 'paid');
    const totalRevenue = paidOrders.reduce((s, o) => s + parseFloat(o.amount || 0), 0);
    const totalQuotes = allOrders.length;
    const convRate = totalQuotes > 0 ? ((paidOrders.length / totalQuotes) * 100).toFixed(1) : 0;

    document.getElementById('stat-total-revenue').innerText = formatVND(totalRevenue);
    document.getElementById('stat-total-quotes').innerText = totalQuotes;
    document.getElementById('stat-conv-rate').innerText = convRate + '%';

    // Revenue by Staff Chart
    if (currentUser.role === 'manager') {
        const staffMap = {};
        allOrders.forEach(o => {
            const name = o.salesperson_name || 'Không tên';
            if (o.status === 'paid') {
                staffMap[name] = (staffMap[name] || 0) + parseFloat(o.amount || 0);
            }
        });

        const chartContainer = document.getElementById('staff-revenue-chart');
        chartContainer.innerHTML = '';
        const maxRev = Math.max(...Object.values(staffMap), 1);
        
        Object.entries(staffMap).forEach(([name, rev]) => {
            const height = (rev / maxRev) * 100;
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = height + '%';
            bar.title = `${name}: ${formatVND(rev)}`;
            bar.innerHTML = `<span class="bar-label">${name.split(' ').pop()}</span>`;
            chartContainer.appendChild(bar);
        });
    }

    // Top Customers
    const custMap = {};
    allOrders.forEach(o => {
        const n = o.customer_name || 'Khách';
        custMap[n] = (custMap[n] || 0) + parseFloat(o.amount || 0);
    });
    const topCust = Object.entries(custMap).sort((a,b) => b[1]-a[1]).slice(0, 5);
    document.getElementById('top-customers-list').innerHTML = topCust.map(([n, v]) => `
        <div style="display:flex; justify-content:space-between; font-size:13px; padding:8px; background:#f8fafc; border-radius:8px;">
            <span>${n}</span>
            <span style="font-weight:700; color:var(--primary)">${formatVND(v)}</span>
        </div>
    `).join('') || 'Chưa có dữ liệu';
}

function renderBoard() {
    const filterStaff = document.getElementById('staff-filter').value;
    const search = document.getElementById('global-search').value.toLowerCase();

    document.querySelectorAll('.column .cards-container').forEach(c => c.innerHTML = '');
    
    allOrders.forEach(order => {
        // Apply filters
        if (filterStaff !== 'all' && order.salesperson_name !== filterStaff) return;
        if (search && !((order.customer_name || '').toLowerCase().includes(search) || (order.customer_phone || '').includes(search))) return;

        const col = document.querySelector(`.column[data-status="${order.status || 'quote'}"]`);
        if (col) col.querySelector('.cards-container').appendChild(createCard(order));
    });

    updateColumnStats();
    lucide.createIcons();
}

function createCard(order) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = order.id;
    
    card.innerHTML = `
        <div class="card-title">${order.customer_name || 'N/A'}</div>
        <div class="card-meta">
            <span><i data-lucide="phone" style="width:10px;"></i> ${order.customer_phone || 'N/A'}</span>
            <span style="font-weight:700; color:var(--primary); font-size:13px; margin-top:5px;">${formatVND(order.amount || 0)}</span>
        </div>
        ${currentUser.role === 'manager' ? `<div class="card-salesperson"><i data-lucide="user" style="width:10px;"></i> ${order.salesperson_name || 'Admin'}</div>` : ''}
    `;

    card.onclick = () => showDetails(order);
    return card;
}

function showDetails(order) {
    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-title').innerText = `Khách hàng: ${order.customer_name}`;
    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:14px;">
            <p><strong>Số BG:</strong> ${order.quote_no || 'N/A'}</p>
            <p><strong>SĐT:</strong> ${order.customer_phone || 'N/A'}</p>
            <p><strong>Địa chỉ:</strong> ${order.customer_address || 'N/A'}</p>
            <p><strong>Sản phẩm:</strong><br><small>${order.products || 'N/A'}</small></p>
            <p><strong>Người bán:</strong> ${order.salesperson_name || 'Admin'}</p>
            <p style="font-size:18px; font-weight:800; color:var(--primary)">Tổng: ${formatVND(order.amount || 0)}</p>
        </div>
    `;
    modal.classList.add('active');
}

function updateColumnStats() {
    document.querySelectorAll('.column').forEach(col => {
        const count = col.querySelectorAll('.card').length;
        col.querySelector('.count').innerText = count;
    });
}

// Drag & Drop
function initSortable() {
    document.querySelectorAll('.cards-container').forEach(container => {
        new Sortable(container, {
            group: 'orders',
            animation: 200,
            onEnd: async (evt) => {
                const id = evt.item.dataset.id;
                const newStatus = evt.to.closest('.column').dataset.status;
                const { error } = await client.from('orders').update({ status: newStatus }).eq('id', id);
                if (!error) refreshData();
            }
        });
    });
}

// UI Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    checkAuth();
    initSortable();

    document.getElementById('login-btn').onclick = login;
    document.getElementById('logout-btn').onclick = () => { localStorage.removeItem('team_crm_user'); location.reload(); };

    // Navigation
    document.querySelectorAll('.nav-item[data-target]').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.content-area').forEach(view => view.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(item.dataset.target).classList.add('active');
            document.getElementById('view-title').innerText = item.innerText.trim();
        };
    });

    document.getElementById('staff-filter').onchange = renderBoard;
    document.getElementById('global-search').oninput = renderBoard;
});
