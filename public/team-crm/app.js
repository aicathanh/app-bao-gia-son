const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co';
const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8';
const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let allOrders = [];
let allStaff = [];
let currentMoveData = null;
let selectedLostReason = "";

const STATUS_MAP = { 'quote': 'Báo Giá', 'ordered': 'Chốt Đơn', 'paid': 'Thu Tiền', 'debt': 'Công Nợ', 'archived': 'Lưu Trữ', 'lost': 'Rớt Đơn' };
const NEXT_STATUS = { 'quote': 'ordered', 'ordered': 'paid', 'paid': 'debt', 'debt': 'archived', 'archived': 'quote', 'lost': 'quote' };

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

    // Update payment account button text for this user
    const personalAccountName = currentUser.full_name.split(' ').pop(); // Just the last name for brevity
    document.querySelectorAll('.btn-account-move')[1].innerText = personalAccountName;

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
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i data-lucide="map-pin" style="width:12px;"></i> ${order.customer_address || 'N/A'}</span>
            ${order.payment_account ? `<span style="color:#059669; font-weight:700;"><i data-lucide="building-2" style="width:12px;"></i> ${order.payment_account}</span>` : ''}
            ${order.status === 'lost' && order.notes && order.notes.includes('LÝ DO RỚT:') ? `<span style="color:#ef4444; font-weight:700;"><i data-lucide="info" style="width:12px;"></i> ${order.notes.split('LÝ DO RỚT:')[1]}</span>` : ''}
        </div>
        <div class="tag-amount">${formatVND(order.amount || 0)}</div>
        <div class="card-actions">
            <button class="action-btn move-btn" title="Chuyển tiếp"><i data-lucide="arrow-right-circle"></i></button>
            <button class="action-btn delete-btn" style="color:#ef4444;" title="Xóa"><i data-lucide="trash-2"></i></button>
        </div>
        ${currentUser.role === 'manager' ? `<div class="card-salesperson" style="margin-top:10px;">${order.salesperson_name || 'Admin'}</div>` : ''}
    `;

    card.onclick = () => showDetails(order);
    card.querySelector('.move-btn').onclick = (e) => { e.stopPropagation(); handleMove(order.id, NEXT_STATUS[order.status], order.status); };
    card.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteOrder(order.id); };
    
    return card;
}

async function handleMove(id, newStatus, currentStatus) {
    if (newStatus === 'paid' || (currentStatus === 'debt' && newStatus === 'archived')) {
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

async function deleteOrder(id) {
    if (!confirm('Xóa báo giá này?')) return;
    await client.from('orders').delete().eq('id', id);
    refreshData();
}

function showDetails(order) {
    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-title').innerText = `Chi tiết: ${order.customer_name}`;
    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#64748b; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                <span>Số BG: <strong>${order.quote_no || 'N/A'}</strong></span>
                <span>Ngày: <strong>${new Date(order.created_at).toLocaleDateString('vi-VN')}</strong></span>
            </div>
            <p><strong>Khách hàng:</strong> ${order.customer_name}</p>
            <p><strong>SĐT:</strong> 
                <a href="tel:${order.customer_phone}" style="color:#2563eb; font-weight:700;">${order.customer_phone || 'N/A'}</a>
                <a href="https://zalo.me/${order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, '') : ''}" target="_blank" style="margin-left:8px; padding:3px 10px; background:#0068ff; color:white; border-radius:8px; font-size:0.7rem; text-decoration:none; font-weight:800; display:inline-flex; align-items:center;">Zalo</a>
            </p>
            <p><strong>Địa chỉ:</strong> ${order.customer_address || 'N/A'}</p>
            
            <div style="background:#f1f5f9; padding:12px; border-radius:12px;">
                <p style="font-size:0.75rem; font-weight:800; color:#475569; margin-bottom:8px; text-transform:uppercase;">Tài khoản nhận tiền:</p>
                <div style="display:flex; gap:8px;">
                    <button class="acc-toggle ${order.payment_account === 'Công ty' ? 'active' : ''}" onclick="updatePaymentAccount('${order.id}', 'Công ty')">Công ty</button>
                    <button class="acc-toggle ${order.payment_account !== 'Công ty' && order.payment_account ? 'active' : ''}" onclick="updatePaymentAccount('${order.id}', '${currentUser.full_name.split(' ').pop()}')">${currentUser.full_name.split(' ').pop()}</button>
                </div>
            </div>

            <hr style="border:none; border-top:1px solid #eee; margin:5px 0;">
            <textarea id="order-notes" style="width:100%; height:80px; padding:12px; border-radius:12px; border:1px solid #ddd; font-family:inherit; outline:none;" placeholder="Ghi chú thêm...">${order.notes || ''}</textarea>
            <button id="save-notes-btn" class="btn-blue">Lưu ghi chú</button>
            
            <hr style="border:none; border-top:1px solid #eee; margin:5px 0;">
            <p><strong>Sản phẩm:</strong><br><small style="color:#64748b; line-height:1.4;">${order.products || 'N/A'}</small></p>
            <p style="font-size:1.3rem; font-weight:800; color:#166534; display:flex; justify-content:space-between; margin-top:10px;"><span>TỔNG:</span> <span>${formatVND(order.amount || 0)}</span></p>
        </div>
    `;
    document.getElementById('save-notes-btn').onclick = () => updateNotes(order.id, document.getElementById('order-notes').value);
    modal.classList.add('active');
    lucide.createIcons();
}

async function updateNotes(id, notes) {
    const btn = document.getElementById('save-notes-btn');
    btn.innerText = 'Đang lưu...';
    const { error } = await client.from('orders').update({ notes }).eq('id', id);
    if (!error) {
        btn.innerText = 'Đã lưu!';
        setTimeout(() => { btn.innerText = 'Lưu ghi chú'; refreshData(); }, 1000);
    }
}

async function updatePaymentAccount(id, account) {
    const { error } = await client.from('orders').update({ payment_account: account }).eq('id', id);
    if (!error) {
        document.querySelectorAll('.acc-toggle').forEach(btn => btn.classList.toggle('active', btn.innerText === account));
        refreshData();
    }
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
            group: 'orders', animation: 250, ghostClass: 'sortable-ghost',
            onStart: () => board.classList.add('dragging'),
            onEnd: async (evt) => {
                board.classList.remove('dragging');
                const id = evt.item.dataset.id;
                const newStatus = evt.to.closest('.column').dataset.status;
                const oldStatus = evt.from.closest('.column').dataset.status;
                if (newStatus !== oldStatus) handleMove(id, newStatus, oldStatus);
            }
        });
    });
}

// Khách hàng & Thống kê
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
    csv.push(["Họ tên", "SĐT", "Địa chỉ", "Tổng mua", "Số đơn"].join(','));
    document.querySelectorAll('#customer-table-body tr').forEach(tr => {
        let row = [];
        tr.querySelectorAll('td').forEach(td => row.push('"' + td.innerText.replace(/₫/g, '').replace(/\./g, '').trim().replace(/"/g, '""') + '"'));
        csv.push(row.join(','));
    });
    const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DanhSachKhachHang_${new Date().toLocaleDateString('vi-VN')}.csv`;
    link.click();
}

function openDashboard() {
    const filterStaff = document.getElementById('staff-filter').value;
    let filteredOrders = allOrders;
    if (filterStaff !== 'all') {
        filteredOrders = allOrders.filter(o => o.salesperson_name === filterStaff);
    }

    const paid = filteredOrders.filter(o => o.status === 'paid' || o.status === 'debt' || o.status === 'archived');
    const totalRevenue = paid.reduce((s, o) => s + parseFloat(o.amount || 0), 0);
    const accMap = { 'Công ty': 0 };
    paid.forEach(o => { 
        if (o.payment_account) accMap[o.payment_account] = (accMap[o.payment_account] || 0) + parseFloat(o.amount || 0); 
    });
    
    const title = filterStaff === 'all' ? 'Toàn bộ hệ thống' : `Nhân viên: ${filterStaff}`;
    
    let staffBreakdownHTML = '';
    if (currentUser.role === 'manager' && filterStaff === 'all') {
        const staffRevenue = {};
        allOrders.forEach(o => {
            if (o.status === 'paid' || o.status === 'debt' || o.status === 'archived') {
                const name = o.salesperson_name || 'Admin';
                staffRevenue[name] = (staffRevenue[name] || 0) + parseFloat(o.amount || 0);
            }
        });
        
        staffBreakdownHTML = `
            <div style="margin-top:20px; padding:15px; background:#fff7ed; border-radius:12px; border:1px solid #ffedd5;">
                <h4 style="font-size:0.75rem; margin-bottom:10px; color:#9a3412; text-transform:uppercase;">DOANH SỐ THEO NHÂN VIÊN</h4>
                ${Object.entries(staffRevenue).sort((a,b)=>b[1]-a[1]).map(([n, v]) => `
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:8px 0; border-bottom:1px dashed #fed7aa;">
                        <span style="font-weight:600;">${n}</span>
                        <span style="font-weight:800; color:#c2410c;">${formatVND(v)}</span>
                    </div>
                `).join('') || 'Chưa có dữ liệu'}
            </div>
        `;
    }

    document.getElementById('active-account-stats').innerHTML = `
        <div style="margin-bottom:15px; font-weight:800; color:#2563eb; font-size:0.9rem;">${title}</div>
        <div style="display:flex; justify-content:space-around; gap:10px; background:#eff6ff; padding:15px; border-radius:16px; flex-wrap:wrap;">
            <div style="text-align:center; min-width:140px;"><div>TỔNG DOANH THU</div><strong style="font-size:1.2rem;">${formatVND(totalRevenue)}</strong></div>
            ${Object.entries(accMap).map(([acc, val]) => `
                <div style="text-align:center;">${acc.toUpperCase()}<br><span style="color:#2563eb; font-weight:700;">${formatVND(val)}</span></div>
            `).join('')}
        </div>
        ${staffBreakdownHTML}
    `;

    const cMap = {}; paid.forEach(o => { const n = o.customer_name || 'Khách'; cMap[n] = (cMap[n] || 0) + parseFloat(o.amount || 0); });
    const pMap = {}; paid.forEach(o => { if (o.products) o.products.split(', ').forEach(p => { const m = p.match(/(.+)\((.+)kg-(\d+)-(\d+)\)/); if (m) pMap[m[1]] = (pMap[m[1]] || 0) + parseFloat(m[4]); }); });
    
    const renderList = (id, data) => {
        document.getElementById(id).innerHTML = Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n, v]) => `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:8px 0; border-bottom:1px dashed #eee;">
                <span>${n}</span><span style="font-weight:700; color:#2563eb;">${formatVND(v)}</span>
            </div>
        `).join('') || 'Trống';
    };
    renderList('active-top-customers', cMap);
    renderList('active-top-products', pMap);
    document.getElementById('dashboard-modal').classList.add('active');
}

// Staff Mgmt
async function fetchStaffList() {
    const { data } = await client.from('staff_users').select('*').order('created_at', { ascending: false });
    if (data) {
        document.getElementById('staff-table-body').innerHTML = data.map(s => `
            <tr><td><b>${s.full_name}</b></td><td>${s.username}</td><td>${s.password}</td><td>${s.role}</td><td>
                ${s.username !== 'admin' ? `<button onclick="deleteStaff('${s.id}')" style="color:red; border:none; background:none; cursor:pointer;"><i data-lucide="trash-2" style="width:14px;"></i></button>` : ''}
            </td></tr>
        `).join('');
        lucide.createIcons();
    }
}

async function addNewStaff() {
    const payload = { 
        full_name: document.getElementById('new-staff-name').value,
        username: document.getElementById('new-staff-user').value,
        password: document.getElementById('new-staff-pass').value,
        role: document.getElementById('new-staff-role').value
    };
    if (!payload.full_name || !payload.username) return alert('Điền đủ thông tin!');
    await client.from('staff_users').insert([payload]);
    document.getElementById('add-staff-modal').classList.remove('active');
    fetchStaffList(); fetchStaff();
}

async function deleteStaff(id) {
    if (confirm('Xóa nhân viên?')) { await client.from('staff_users').delete().eq('id', id); fetchStaffList(); fetchStaff(); }
}

// Events
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initSortable();

    document.getElementById('login-btn').onclick = login;
    document.getElementById('logout-btn').onclick = () => { localStorage.removeItem('team_crm_user'); location.reload(); };
    document.getElementById('nav-staff-mgmt').onclick = () => document.getElementById('staff-mgmt-modal').classList.add('active');
    document.getElementById('customer-btn').onclick = openCustomerList;
    document.getElementById('dashboard-btn').onclick = openDashboard;
    document.getElementById('export-btn').onclick = exportToExcel;
    document.getElementById('staff-filter').onchange = renderBoard;
    document.getElementById('global-search').oninput = renderBoard;

    document.querySelectorAll('.btn-account-move').forEach(btn => {
        btn.onclick = async () => {
            if (currentMoveData) {
                await client.from('orders').update({ status: currentMoveData.status, payment_account: btn.innerText }).eq('id', currentMoveData.id);
                document.getElementById('payment-modal').classList.remove('active');
                currentMoveData = null; refreshData();
            }
        };
    });

    document.getElementById('submit-lost-reason').onclick = async () => {
        const reason = document.getElementById('custom-lost-reason').value || selectedLostReason;
        if (!reason) return alert('Chọn lý do!');
        const order = allOrders.find(o => o.id == currentMoveData.id);
        const notes = (order.notes ? order.notes + "\n" : "") + "LÝ DO RỚT: " + reason;
        await client.from('orders').update({ status: 'lost', notes }).eq('id', currentMoveData.id);
        document.getElementById('lost-reason-modal').classList.remove('active');
        currentMoveData = null; refreshData();
    };

    document.querySelectorAll('.modal-close-trigger').forEach(b => b.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        if (currentMoveData) refreshData();
    });
});
