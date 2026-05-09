const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co';
const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8';
const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let allOrders = [];
let allStaff = [];

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

// Auth
async function login() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    try {
        const { data, error } = await client.from('staff_users').select('*').eq('username', user).eq('password', pass).single();
        if (error || !data) {
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
    } catch (e) { console.error(e); }
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
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('current-user-name').innerText = currentUser.full_name;
    document.getElementById('current-user-role').innerText = currentUser.role.toUpperCase();

    if (currentUser.role === 'manager') {
        document.getElementById('staff-filter').classList.remove('hidden');
        document.getElementById('nav-staff-mgmt').classList.remove('hidden');
        fetchStaff();
        fetchStaffList();
    }

    refreshData();
    lucide.createIcons();
}

async function fetchStaff() {
    const { data } = await client.from('staff_users').select('full_name');
    if (data) {
        const filter = document.getElementById('staff-filter');
        filter.innerHTML = '<option value="all">Tất cả nhân viên</option>';
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
    if (currentUser.role === 'sales') {
        query = query.eq('salesperson_name', currentUser.full_name);
    }

    const { data, error } = await query;
    if (error) return;
    allOrders = data;
    renderBoard();
}

function renderBoard() {
    const filterStaff = document.getElementById('staff-filter').value;
    const search = document.getElementById('global-search').value.toLowerCase();

    document.querySelectorAll('.column .cards-container').forEach(c => c.innerHTML = '');
    
    allOrders.forEach(order => {
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
            <span><i data-lucide="phone" style="width:12px;"></i> ${order.customer_phone || 'N/A'}</span>
            <span class="tag-amount">${formatVND(order.amount || 0)}</span>
        </div>
        ${currentUser.role === 'manager' ? `<div class="card-salesperson">${order.salesperson_name || 'Admin'}</div>` : ''}
    `;

    card.onclick = () => showDetails(order);
    return card;
}

function showDetails(order) {
    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-title').innerText = `Khách hàng: ${order.customer_name}`;
    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:15px; font-size:14px;">
            <p><strong>Số BG:</strong> ${order.quote_no || 'N/A'}</p>
            <p><strong>SĐT:</strong> ${order.customer_phone || 'N/A'}</p>
            <p><strong>Địa chỉ:</strong> ${order.customer_address || 'N/A'}</p>
            <p><strong>Sản phẩm:</strong><br><div style="padding:10px; background:#f8fafc; border-radius:8px; white-space:pre-wrap;">${order.products || 'N/A'}</div></p>
            <p><strong>Người bán:</strong> ${order.salesperson_name || 'Admin'}</p>
            <p style="font-size:20px; font-weight:800; color:var(--primary); border-top:1px solid #eee; padding-top:15px;">Tổng: ${formatVND(order.amount || 0)}</p>
        </div>
    `;
    modal.classList.add('active');
}

function updateColumnStats() {
    document.querySelectorAll('.column').forEach(col => {
        const cards = Array.from(col.querySelectorAll('.card'));
        const count = cards.length;
        
        let total = 0;
        cards.forEach(card => {
            const order = allOrders.find(o => o.id == card.dataset.id);
            if (order) total += parseFloat(order.amount || 0);
        });

        col.querySelector('.count').innerText = count;
        col.querySelector('.total-amount').innerText = formatVND(total);
    });
}

function initSortable() {
    document.querySelectorAll('.cards-container').forEach(container => {
        new Sortable(container, {
            group: 'orders',
            animation: 200,
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                const id = evt.item.dataset.id;
                const newStatus = evt.to.closest('.column').dataset.status;
                const { error } = await client.from('orders').update({ status: newStatus }).eq('id', id);
                if (!error) refreshData();
            }
        });
    });
}

// Staff Management
async function fetchStaffList() {
    const { data, error } = await client.from('staff_users').select('*').order('created_at', { ascending: false });
    if (error) return;
    const tbody = document.getElementById('staff-table-body');
    tbody.innerHTML = data.map(s => `
        <tr>
            <td style="font-weight:600;">${s.full_name}</td>
            <td>${s.username}</td>
            <td>${s.password}</td>
            <td><span style="font-size:10px; padding:2px 6px; background:#f1f5f9; border-radius:4px;">${s.role.toUpperCase()}</span></td>
            <td>
                ${s.username !== 'admin' ? `<button onclick="deleteStaff('${s.id}')" style="color:#ef4444; border:none; background:none; cursor:pointer;"><i data-lucide="trash-2" style="width:14px;"></i></button>` : ''}
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

async function addNewStaff() {
    const name = document.getElementById('new-staff-name').value;
    const user = document.getElementById('new-staff-user').value;
    const pass = document.getElementById('new-staff-pass').value;
    const role = document.getElementById('new-staff-role').value;

    if (!name || !user || !pass) return alert('Điền đủ thông tin!');
    const { error } = await client.from('staff_users').insert([{ full_name: name, username: user, password: pass, role }]);
    if (error) alert(error.message);
    else {
        document.getElementById('add-staff-modal').classList.remove('active');
        fetchStaffList();
        fetchStaff();
    }
}

async function deleteStaff(id) {
    if (!confirm('Xóa nhân viên này?')) return;
    await client.from('staff_users').delete().eq('id', id);
    fetchStaffList();
    fetchStaff();
}

// Events
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initSortable();

    document.getElementById('login-btn').onclick = login;
    document.getElementById('logout-btn').onclick = () => { localStorage.removeItem('team_crm_user'); location.reload(); };
    document.getElementById('nav-staff-mgmt').onclick = () => document.getElementById('staff-mgmt-modal').classList.add('active');
    
    document.getElementById('staff-filter').onchange = renderBoard;
    document.getElementById('global-search').oninput = renderBoard;
});
