const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co';
const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8';
const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let allOrders = [];
let allStaff = [];
let currentMoveData = null;
let selectedLostReason = "";

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
            ${order.payment_account ? `<span style="color:#059669; font-weight:700;"><i data-lucide="building-2" style="width:12px;"></i> ${order.payment_account}</span>` : ''}
            ${order.status === 'lost' && order.notes && order.notes.includes('LÝ DO RỚT:') ? `<span style="color:#ef4444; font-weight:700;"><i data-lucide="info" style="width:12px;"></i> ${order.notes.split('LÝ DO RỚT:')[1]}</span>` : ''}
            <span class="tag-amount">${formatVND(order.amount || 0)}</span>
        </div>
        ${currentUser.role === 'manager' ? `<div class="card-salesperson">${order.salesperson_name || 'Admin'}</div>` : ''}
    `;

    card.onclick = () => showDetails(order);
    return card;
}

function showDetails(order) {
    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-title').innerText = `Chi tiết: ${order.customer_name}`;
    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:15px; font-size:14px;">
            <p><strong>Số BG:</strong> ${order.quote_no || 'N/A'}</p>
            <p><strong>SĐT:</strong> 
                <a href="tel:${order.customer_phone}" style="color:#2563eb; font-weight:700;">${order.customer_phone || 'N/A'}</a>
                <a href="https://zalo.me/${order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, '') : ''}" target="_blank" style="margin-left:8px; padding:3px 10px; background:#0068ff; color:white; border-radius:8px; font-size:0.7rem; text-decoration:none; font-weight:800; display:inline-flex; align-items:center;">Zalo</a>
            </p>
            <p><strong>Địa chỉ:</strong> ${order.customer_address || 'N/A'}</p>
            <p><strong>Sản phẩm:</strong><br><div style="padding:10px; background:#f8fafc; border-radius:8px; white-space:pre-wrap;">${order.products || 'N/A'}</div></p>
            <p><strong>Người bán:</strong> ${order.salesperson_name || 'Admin'}</p>
            <p style="font-size:20px; font-weight:800; color:var(--primary); border-top:1px solid #eee; padding-top:15px;">Tổng: ${formatVND(order.amount || 0)}</p>
        </div>
    `;
    modal.classList.add('active');
    lucide.createIcons();
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
    const board = document.querySelector('.board-container');
    document.querySelectorAll('.cards-container').forEach(container => {
        new Sortable(container, {
            group: 'orders',
            animation: 200,
            ghostClass: 'sortable-ghost',
            onStart: () => board.classList.add('dragging'),
            onEnd: async (evt) => {
                board.classList.remove('dragging');
                const id = evt.item.dataset.id;
                const newStatus = evt.to.closest('.column').dataset.status;
                const oldStatus = evt.from.closest('.column').dataset.status;
                
                if (newStatus !== oldStatus) {
                    if (newStatus === 'paid') {
                        currentMoveData = { id, status: newStatus };
                        document.getElementById('payment-modal').classList.add('active');
                    } else if (newStatus === 'lost') {
                        currentMoveData = { id, status: newStatus };
                        document.getElementById('lost-reason-modal').classList.add('active');
                    } else {
                        await client.from('orders').update({ status: newStatus }).eq('id', id);
                        refreshData();
                    }
                }
            }
        });
    });
}

// Khách hàng
function openCustomerList() {
    const customers = {};
    allOrders.forEach(o => {
        const key = o.customer_phone || o.customer_name;
        if (!customers[key]) customers[key] = { name: o.customer_name, phone: o.customer_phone, address: o.customer_address, total: 0, count: 0 };
        if (o.status !== 'lost' && o.status !== 'quote') customers[key].total += parseFloat(o.amount || 0);
        customers[key].count += 1;
    });
    const tbody = document.getElementById('customer-table-body');
    tbody.innerHTML = Object.values(customers).sort((a,b) => b.total - a.total).map(c => `
        <tr><td style="font-weight:700;">${c.name}</td><td>${c.phone || 'N/A'}</td><td style="font-size:0.75rem;">${c.address || 'N/A'}</td><td style="font-weight:800; color:#166534;">${formatVND(c.total)}</td><td style="text-align:center;">${c.count}</td></tr>
    `).join('');
    document.getElementById('customer-modal').classList.add('active');
}

function exportToExcel() {
    let csv = [];
    const headers = ["Họ tên", "SĐT", "Địa chỉ", "Tổng mua", "Số đơn"];
    csv.push(headers.join(','));
    
    const rows = document.querySelectorAll('#customer-table-body tr');
    rows.forEach(tr => {
        let row = [];
        tr.querySelectorAll('td').forEach(td => {
            let text = td.innerText.replace(/₫/g, '').replace(/\./g, '').trim();
            row.push('"' + text.replace(/"/g, '""') + '"');
        });
        csv.push(row.join(','));
    });
    
    const csvContent = "\uFEFF" + csv.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DanhSachKhachHang_${new Date().toLocaleDateString('vi-VN')}.csv`;
    link.click();
}

// Thống kê
function openDashboard() {
    const stats = calculateStats(allOrders);
    document.getElementById('active-account-stats').innerHTML = `
        <div style="display:flex; justify-content:space-around; gap:10px; background:#eff6ff; padding:15px; border-radius:12px; flex-wrap:wrap;">
            <div style="text-align:center;"><div>DOANH THU</div><strong>${formatVND(stats.totalRevenue)}</strong></div>
            <div style="text-align:center;">CÔNG TY<br><span style="color:#2563eb; font-weight:700;">${formatVND(stats.accountMap['Công ty'] || 0)}</span></div>
            <div style="text-align:center;">THANH<br><span style="color:#059669; font-weight:700;">${formatVND(stats.accountMap['Thanh'] || 0)}</span></div>
        </div>
    `;
    renderStatList('active-top-customers', stats.topCustomers);
    renderStatList('active-top-products', stats.topProducts);
    document.getElementById('dashboard-modal').classList.add('active');
}

function calculateStats(orders) {
    const paid = orders.filter(o => o.status === 'paid' || o.status === 'debt' || o.status === 'archived');
    const totalRevenue = paid.reduce((s, o) => s + parseFloat(o.amount || 0), 0);
    const accountMap = {};
    paid.forEach(o => { if (o.payment_account) accountMap[o.payment_account] = (accountMap[o.payment_account] || 0) + parseFloat(o.amount || 0); });
    const cMap = {}; paid.forEach(o => { const n = o.customer_name || 'Khách'; cMap[n] = (cMap[n] || 0) + parseFloat(o.amount || 0); });
    const pMap = {}; paid.forEach(o => { if (o.products) o.products.split(', ').forEach(p => { const m = p.match(/(.+)\((.+)kg-(\d+)-(\d+)\)/); if (m) pMap[m[1]] = (pMap[m[1]] || 0) + parseFloat(m[4]); }); });
    return { totalRevenue, accountMap, topCustomers: Object.entries(cMap).sort((a,b)=>b[1]-a[1]).slice(0,5), topProducts: Object.entries(pMap).sort((a,b)=>b[1]-a[1]).slice(0,5) };
}

function renderStatList(id, data) {
    document.getElementById(id).innerHTML = data.map(([n, v]) => `<div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:5px 0; border-bottom:1px dashed #eee;"><span>${n}</span><span style="font-weight:700; color:#2563eb;">${formatVND(v)}</span></div>`).join('') || 'Trống';
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
        fetchStaffList(); fetchStaff();
    }
}

async function deleteStaff(id) {
    if (!confirm('Xóa nhân viên này?')) return;
    await client.from('staff_users').delete().eq('id', id);
    fetchStaffList(); fetchStaff();
}

// Events
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initSortable();

    document.getElementById('login-btn').onclick = login;
    document.getElementById('logout-btn').onclick = () => { localStorage.removeItem('team_crm_user'); location.reload(); };
    document.getElementById('nav-staff-mgmt').onclick = () => document.getElementById('staff-mgmt-modal').classList.add('active');
    document.getElementById('customer-btn').onclick = openCustomerList;
    document.getElementById('export-btn').onclick = exportToExcel;
    document.getElementById('dashboard-btn').onclick = openDashboard;
    
    document.getElementById('staff-filter').onchange = renderBoard;
    document.getElementById('global-search').oninput = renderBoard;

    document.querySelectorAll('.btn-account-move').forEach(btn => {
        btn.onclick = async () => {
            if (currentMoveData) {
                await client.from('orders').update({ status: currentMoveData.status, payment_account: btn.innerText }).eq('id', currentMoveData.id);
                document.getElementById('payment-modal').classList.remove('active');
                currentMoveData = null;
                refreshData();
            }
        };
    });

    document.querySelectorAll('.btn-lost-reason-move').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.btn-lost-reason-move').forEach(b => b.style.background = 'white');
            btn.style.background = '#fee2e2';
            selectedLostReason = btn.dataset.reason;
        };
    });

    document.getElementById('submit-lost-reason').onclick = async () => {
        const reason = document.getElementById('custom-lost-reason').value || selectedLostReason;
        if (!reason) return alert('Chọn lý do!');
        if (currentMoveData) {
            const order = allOrders.find(o => o.id == currentMoveData.id);
            const newNotes = (order.notes ? order.notes + "\n" : "") + "LÝ DO RỚT: " + reason;
            await client.from('orders').update({ status: 'lost', notes: newNotes }).eq('id', currentMoveData.id);
            document.getElementById('lost-reason-modal').classList.remove('active');
            currentMoveData = null;
            refreshData();
        }
    };

    document.querySelectorAll('.modal-close-trigger').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
            if (currentMoveData) refreshData();
        };
    });
});
