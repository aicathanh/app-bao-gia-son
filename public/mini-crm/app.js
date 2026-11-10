window.onerror = function(message, source, lineno, colno, error) {
    const errDiv = document.getElementById('login-err');
    if (errDiv) {
        errDiv.innerText = `Lỗi JS: ${message} (Dòng ${lineno})`;
        errDiv.style.display = 'block';
    }
};

const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co';
const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8';
const client = supabase.createClient(supabaseUrl, supabaseKey);

const STATUS_MAP = { 'quote': 'Báo Giá', 'ordered': 'Chốt Đơn', 'paid': 'Thu Tiền', 'debt': 'Công Nợ', 'archived': 'Lưu Trữ', 'lost': 'Rớt Đơn' };
const NEXT_STATUS = { 'quote': 'ordered', 'ordered': 'paid', 'paid': 'archived', 'debt': 'archived', 'archived': 'quote', 'lost': 'quote' };

let currentMoveData = null;
let selectedLostReason = "";
const THE_PASSWORD = "6688";

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

async function fetchOrders() {
    const { data, error } = await client.from('orders')
        .select('*')
        .or('salesperson_name.eq.Nguyễn Xuân Thanh,salesperson_name.is.null')
        .order('created_at', { ascending: false });
    return error ? [] : data;
}

async function updateOrderStatus(id, newStatus, silent = false, extraData = {}) {
    const { error } = await client.from('orders').update({ status: newStatus, ...extraData }).eq('id', id);
    if (!error && !silent) renderBoard();
}

async function updateNotes(id, notes) {
    const { error } = await client.from('orders').update({ notes }).eq('id', id);
    if (!error) {
        const btn = document.querySelector('.save-notes-btn');
        if (btn) btn.innerText = 'Đã lưu!';
        setTimeout(() => { if (btn) btn.innerText = 'Lưu ghi chú'; renderBoard(); }, 1500);
    }
}

async function deleteOrder(id) {
    if (confirm('Xóa báo giá này?')) { await client.from('orders').delete().eq('id', id); renderBoard(); }
}

function handleStatusMove(id, newStatus, currentStatus = '') {
    if (newStatus === 'paid' || (currentStatus === 'debt' && newStatus === 'archived')) {
        currentMoveData = { id, status: newStatus };
        document.getElementById('payment-modal').classList.add('active');
    } else if (newStatus === 'lost') {
        currentMoveData = { id, status: newStatus };
        document.getElementById('lost-reason-modal').classList.add('active');
    } else updateOrderStatus(id, newStatus);
}

function createCard(order) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = order.id;
    card.dataset.status = order.status;
    card.dataset.amount = order.amount || 0;
    card.dataset.name = (order.customer_name || '').toLowerCase();
    card.dataset.phone = (order.customer_phone || '').toLowerCase();

    card.innerHTML = `
        <div class="card-title">${order.customer_name || 'N/A'}</div>
        <div class="card-meta">
            <span><i data-lucide="phone" style="width:12px;"></i> ${order.customer_phone || 'N/A'}</span>
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i data-lucide="map-pin" style="width:12px;"></i> ${order.customer_address || 'N/A'}</span>
            ${order.status === 'lost' && order.notes && order.notes.includes('LÝ DO RỚT:') ? `<span style="color:#ef4444; font-weight:700;"><i data-lucide="info" style="width:12px;"></i> ${order.notes.split('LÝ DO RỚT:')[1]}</span>` : ''}
            ${order.payment_account ? `<span style="color:#059669; font-weight:700;"><i data-lucide="building-2" style="width:12px;"></i> ${order.payment_account}</span>` : ''}
        </div>
        <div class="card-tag tag-amount" style="${order.status === 'lost' ? 'background:#fee2e2; color:#991b1b; border-color:#fecaca;' : ''}">${formatVND(order.amount || 0)}</div>
        <div class="card-actions">
            <button class="action-btn move-btn" title="Chuyển tiếp"><i data-lucide="arrow-right-circle"></i></button>
            <button class="action-btn delete-btn" style="color:#ef4444;" title="Xóa"><i data-lucide="trash-2"></i></button>
        </div>
    `;

    let lastTap = 0;
    card.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) { e.preventDefault(); showDetails(order); }
        lastTap = currentTime;
    });
    card.ondblclick = () => showDetails(order);

    card.querySelector('.move-btn').onclick = (e) => { e.stopPropagation(); handleStatusMove(order.id, NEXT_STATUS[order.status] || 'archived', order.status); };
    card.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteOrder(order.id); };

    return card;
}

function showDetails(order) {
    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-title').innerText = `Chi tiết: ${order.customer_name}`;
    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#64748b; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                <span>Số BG: <strong>${order.quote_no || 'N/A'}</strong></span>
                <span>Ngày: <strong>${new Date(order.created_at).toLocaleDateString('vi-VN')}</strong></span>
            </div>
            <p><strong>Khách hàng:</strong> ${order.customer_name}
                <a href="#" class="view-history-link" data-name="${order.customer_name}" data-phone="${order.customer_phone || ''}" style="color:#2563eb; font-weight:700; margin-left:12px; text-decoration:underline; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="history" style="width:12px; height:12px;"></i> Xem lịch sử mua hàng
                </a>
            </p>
            <p><strong>SĐT:</strong> 
                <a href="tel:${order.customer_phone}" style="color:#2563eb; font-weight:700;">${order.customer_phone || 'N/A'}</a>
                <a href="https://zalo.me/${order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, '') : ''}" target="_blank" style="margin-left:8px; padding:3px 10px; background:#0068ff; color:white; border-radius:8px; font-size:0.7rem; text-decoration:none; font-weight:800; display:inline-flex; align-items:center;">Zalo</a>
            </p>
            <p><strong>Địa chỉ:</strong> ${order.customer_address || 'N/A'}</p>
            
            <div style="background:#f1f5f9; padding:12px; border-radius:12px;">
                <p style="font-size:0.75rem; font-weight:800; color:#475569; margin-bottom:8px; text-transform:uppercase;">Tài khoản nhận tiền:</p>
                <div style="display:flex; gap:8px;">
                    <button class="acc-toggle ${order.payment_account === 'Công ty' ? 'active' : ''}" onclick="updatePaymentAccount('${order.id}', 'Công ty')">Công ty</button>
                    <button class="acc-toggle ${order.payment_account === 'Thanh' ? 'active' : ''}" onclick="updatePaymentAccount('${order.id}', 'Thanh')">Thanh</button>
                </div>
            </div>

            <hr>
            <textarea id="order-notes" style="width:100%; height:80px; padding:12px; border-radius:10px; border:1px solid #ddd; font-family:inherit;" placeholder="Ghi chú thêm...">${order.notes || ''}</textarea>
            <button class="save-notes-btn" style="padding:12px; background:#2563eb; color:white; border:none; border-radius:10px; font-weight:700; cursor:pointer;">Lưu ghi chú</button>
            <hr>
            <p><strong>Sản phẩm:</strong><br><small style="color:#64748b; line-height:1.4;">${order.products || 'N/A'}</small></p>
            <p style="font-size:1.2rem; font-weight:800; color:#166534; display:flex; justify-content:space-between;"><span>TỔNG:</span> <span>${formatVND(order.amount || 0)}</span></p>
        </div>
    `;
    document.querySelector('.save-notes-btn').onclick = () => updateNotes(order.id, document.getElementById('order-notes').value);
    
    const viewHistoryLink = modal.querySelector('.view-history-link');
    if (viewHistoryLink) {
        viewHistoryLink.onclick = (e) => {
            e.preventDefault();
            closeModal(modal);
            showCustomerHistory(viewHistoryLink.dataset.name, viewHistoryLink.dataset.phone);
        };
    }

    modal.classList.add('active');
    lucide.createIcons();
}

async function updatePaymentAccount(id, account) {
    const { error } = await client.from('orders').update({ payment_account: account }).eq('id', id);
    if (!error) {
        // Cập nhật UI ngay lập tức trong modal
        document.querySelectorAll('.acc-toggle').forEach(btn => {
            btn.classList.toggle('active', btn.innerText === account);
        });
        renderBoard();
    }
}

async function renderBoard() {
    const orders = await fetchOrders();
    document.querySelectorAll('.column .cards-container').forEach(c => c.innerHTML = '');
    orders.forEach(o => {
        const col = document.querySelector(`.column[data-status="${o.status || 'quote'}"]`);
        if (col) col.querySelector('.cards-container').appendChild(createCard(o));
    });
    updateColumnStats();
    applySearch();
    lucide.createIcons();
}

function applySearch() {
    const q = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.card').forEach(c => {
        if (c.dataset.name.includes(q) || c.dataset.phone.includes(q)) c.classList.remove('hidden'); else c.classList.add('hidden');
    });
    updateColumnStats();
}

function updateColumnStats() {
    document.querySelectorAll('.column').forEach(col => {
        const visible = col.querySelectorAll('.card:not(.hidden)');
        col.querySelector('.count').innerText = visible.length;
        let total = 0; visible.forEach(c => total += parseFloat(c.dataset.amount || 0));
        col.querySelector('.total-amount').innerText = formatVND(total);
    });
}

async function openCustomerList() {
    const orders = await fetchOrders();
    const customers = {};
    orders.forEach(o => {
        const key = o.customer_phone || o.customer_name;
        if (!customers[key]) customers[key] = { name: o.customer_name, phone: o.customer_phone, address: o.customer_address, total: 0, count: 0 };
        if (o.status !== 'lost' && o.status !== 'quote') customers[key].total += parseFloat(o.amount || 0);
        customers[key].count += 1;
    });

    const searchInput = document.getElementById('customer-modal-search');
    if (searchInput) searchInput.value = '';

    window.allCustomers = Object.values(customers).sort((a,b) => b.total - a.total);
    renderFilteredCustomerList(window.allCustomers);

    document.getElementById('customer-modal').classList.add('active');
    document.getElementById('export-btn').onclick = exportToExcel;
}

function renderFilteredCustomerList(customerArray) {
    const tbody = document.getElementById('customer-table-body');
    tbody.innerHTML = customerArray.map(c => `
        <tr class="customer-row" data-name="${c.name}" data-phone="${c.phone || ''}" style="cursor:pointer;">
            <td style="font-weight:700; color:#2563eb; text-decoration:underline;">${c.name}</td>
            <td>${c.phone || 'N/A'}</td>
            <td style="font-size:0.75rem;">${c.address || 'N/A'}</td>
            <td style="font-weight:800; color:#166534;">${formatVND(c.total)}</td>
            <td style="text-align:center;">
                <span style="background:#eff6ff; padding:2px 8px; border-radius:12px; font-weight:700; color:#2563eb; font-size:0.8rem;">
                    ${c.count} đơn
                </span>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.customer-row').forEach(row => {
        row.onclick = () => {
            showCustomerHistory(row.dataset.name, row.dataset.phone);
        };
    });

    const countEl = document.getElementById('customer-modal-count');
    if (countEl) {
        countEl.innerText = `Tìm thấy: ${customerArray.length} khách hàng`;
    }
}

async function showCustomerHistory(name, phone) {
    const orders = await fetchOrders();
    const filtered = orders.filter(o => {
        const matchName = (o.customer_name || '').toLowerCase() === name.toLowerCase();
        const matchPhone = phone && o.customer_phone && o.customer_phone.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, '');
        return matchName || matchPhone;
    });

    if (filtered.length === 0) {
        alert('Không tìm thấy dữ liệu đơn hàng cho khách hàng này.');
        return;
    }

    const customerName = filtered[0].customer_name;
    const customerPhone = filtered[0].customer_phone || 'N/A';
    const customerAddress = filtered[0].customer_address || 'N/A';

    const totalOrders = filtered.length;
    const debtOrders = filtered.filter(o => o.status === 'debt');
    const totalSpent = filtered.filter(o => o.status !== 'lost' && o.status !== 'quote').reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
    const totalDebt = debtOrders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);

    const modal = document.getElementById('customer-history-modal');
    document.getElementById('history-modal-title').innerHTML = `<i data-lucide="history" style="display:inline-block; vertical-align:middle; margin-right:8px;"></i>Lịch sử mua hàng: ${customerName}`;

    let historyHtml = `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:20px; font-size:0.9rem;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                <p style="margin:0;"><strong>Số điện thoại:</strong> ${customerPhone}</p>
                <p style="margin:0;"><strong>Địa chỉ:</strong> ${customerAddress}</p>
            </div>
            <div style="display:flex; justify-content:space-between; gap:10px; background:white; padding:12px; border-radius:8px; border:1px solid #f1f5f9; flex-wrap:wrap; text-align:center;">
                <div style="flex:1; min-width:80px;">
                    <div style="font-size:0.75rem; color:#64748b; font-weight:700;">TỔNG SỐ ĐƠN</div>
                    <strong style="font-size:1.1rem; color:#1e293b;">${totalOrders}</strong>
                </div>
                <div style="flex:1; min-width:100px; border-left:1px solid #f1f5f9;">
                    <div style="font-size:0.75rem; color:#64748b; font-weight:700;">ĐÃ THANH TOÁN</div>
                    <strong style="font-size:1.1rem; color:#166534;">${formatVND(totalSpent - totalDebt)}</strong>
                </div>
                <div style="flex:1; min-width:100px; border-left:1px solid #f1f5f9;">
                    <div style="font-size:0.75rem; color:#64748b; font-weight:700;">ĐANG NỢ TÀI CHÍNH</div>
                    <strong style="font-size:1.1rem; color:#dc2626;">${formatVND(totalDebt)}</strong>
                </div>
                <div style="flex:1; min-width:100px; border-left:1px solid #f1f5f9;">
                    <div style="font-size:0.75rem; color:#64748b; font-weight:700;">TỔNG MUA (CHỐT)</div>
                    <strong style="font-size:1.1rem; color:#2563eb;">${formatVND(totalSpent)}</strong>
                </div>
            </div>
        </div>

        <table class="data-table" style="width:100%; font-size:0.85rem;">
            <thead>
                <tr>
                    <th style="padding:10px 8px; font-size:0.75rem;">Ngày đặt</th>
                    <th style="padding:10px 8px; font-size:0.75rem;">Mã đơn</th>
                    <th style="padding:10px 8px; font-size:0.75rem;">Sản phẩm</th>
                    <th style="padding:10px 8px; font-size:0.75rem;">Số tiền</th>
                    <th style="padding:10px 8px; font-size:0.75rem;">Trạng thái</th>
                    <th style="padding:10px 8px; font-size:0.75rem; text-align:center;">Hành động</th>
                </tr>
            </thead>
            <tbody>
    `;

    historyHtml += filtered.map(o => {
        const dateStr = new Date(o.created_at).toLocaleDateString('vi-VN');
        const statusLabel = STATUS_MAP[o.status] || o.status;
        
        let statusBadgeColor = '#f1f5f9';
        let statusTextColor = '#475569';
        if (o.status === 'debt') { statusBadgeColor = '#fee2e2'; statusTextColor = '#b91c1c'; }
        else if (o.status === 'paid') { statusBadgeColor = '#dcfce7'; statusTextColor = '#15803d'; }
        else if (o.status === 'ordered') { statusBadgeColor = '#eff6ff'; statusTextColor = '#1d4ed8'; }
        else if (o.status === 'lost') { statusBadgeColor = '#fef2f2'; statusTextColor = '#991b1b'; }
        else if (o.status === 'quote') { statusBadgeColor = '#fef3c7'; statusTextColor = '#d97706'; }

        return `
            <tr>
                <td style="white-space:nowrap; padding:10px 8px;">${dateStr}</td>
                <td style="font-weight:600; padding:10px 8px;">${o.quote_no || 'N/A'}</td>
                <td style="line-height:1.4; color:#475569; max-width:250px; font-size:0.75rem; padding:10px 8px;">
                    ${o.products ? o.products.split(', ').join('<br>') : 'N/A'}
                </td>
                <td style="font-weight:700; color:${o.status === 'debt' ? 'red' : '#1e293b'}; padding:10px 8px;">${formatVND(o.amount || 0)}</td>
                <td style="white-space:nowrap; padding:10px 8px;">
                    <span style="padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:700; background:${statusBadgeColor}; color:${statusTextColor};">
                        ${statusLabel}
                    </span>
                </td>
                <td style="text-align:center; padding:10px 8px;">
                    <button class="view-single-order-btn action-btn" data-id="${o.id}" style="padding:4px 8px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer; width:auto; height:auto;">Chi tiết</button>
                </td>
            </tr>
        `;
    }).join('');

    historyHtml += `
            </tbody>
        </table>
    `;

    document.getElementById('history-modal-body').innerHTML = historyHtml;

    modal.querySelectorAll('.view-single-order-btn').forEach(btn => {
        btn.onclick = () => {
            const orderId = btn.dataset.id;
            const order = filtered.find(o => o.id == orderId);
            if (order) {
                showDetails(order);
            }
        };
    });

    modal.classList.add('active');
    lucide.createIcons();
}

function exportToExcel() {
    const table = document.querySelector('.data-table');
    let csv = [];
    const rows = table.querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].querySelectorAll('td, th');
        let row = [];
        for (let j = 0; j < cols.length; j++) {
            let text = cols[j].innerText.replace(/₫/g, '').replace(/\./g, '').trim();
            if (i === 0) text = cols[j].innerText;
            row.push('"' + text.replace(/"/g, '""') + '"');
        }
        csv.push(row.join(','));
    }
    const csvContent = "\uFEFF" + csv.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DanhSachKhachHang_${new Date().toLocaleDateString('vi-VN')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function openDashboard() {
    const orders = await fetchOrders();
    const yFilter = document.getElementById('year-filter');
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear]); orders.forEach(o => years.add(new Date(o.created_at).getFullYear()));
    yFilter.innerHTML = Array.from(years).sort((a,b) => b-a).map(y => `<option value="${y}">Năm ${y}</option>`).join('');

    const month = document.getElementById('month-filter').value;
    const year = yFilter.value;
    const active = orders.filter(o => o.status === 'paid' || o.status === 'debt');
    const activeData = calculateStats(active);
    const activeDebt = active.filter(o => o.status === 'debt').reduce((s, o) => s + parseFloat(o.amount || 0), 0);
    
    document.getElementById('active-account-stats').innerHTML = `
        <div style="display:flex; justify-content:space-around; gap:10px; margin-bottom:20px; background:#eff6ff; padding:15px; border-radius:12px; flex-wrap:wrap;">
            <div style="text-align:center; min-width:120px;"><div>TỔNG DOANH SỐ</div><strong>${formatVND(activeData.totalRevenue)}</strong></div>
            <div style="text-align:center;">CÔNG TY<br><span style="color:#2563eb; font-weight:700;">${formatVND(activeData.accountMap['Công ty'])}</span></div>
            <div style="text-align:center;">THANH<br><span style="color:#059669; font-weight:700;">${formatVND(activeData.accountMap['Thanh'])}</span></div>
            <div style="text-align:center; color:red;">ĐANG NỢ<br><strong>${formatVND(activeDebt)}</strong></div>
        </div>
    `;

    const archived = orders.filter(o => { const d = new Date(o.created_at); return o.status === 'archived' && d.getFullYear().toString() === year && (month === 'all' ? true : d.getMonth().toString() === month); });
    const archData = calculateStats(archived);
    document.getElementById('archived-account-stats').innerHTML = `
        <div style="display:flex; justify-content:space-around; gap:10px; margin-bottom:20px; background:#f5f3ff; padding:15px; border-radius:12px; flex-wrap:wrap;">
            <div style="text-align:center; min-width:120px;"><div>TỔNG LỊCH SỬ</div><strong>${formatVND(archData.totalRevenue)}</strong></div>
            <div style="text-align:center;">CÔNG TY<br><strong>${formatVND(archData.accountMap['Công ty'])}</strong></div>
            <div style="text-align:center;">THANH<br><strong>${formatVND(archData.accountMap['Thanh'])}</strong></div>
        </div>
    `;

    renderStatList('active-top-customers', activeData.topCustomers);
    renderStatList('active-top-products', activeData.topProducts);
    renderStatList('archived-top-customers', archData.topCustomers);
    renderStatList('archived-top-products', archData.topProducts);
    document.getElementById('dashboard-modal').classList.add('active');
}

function calculateStats(orders) {
    const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.amount || 0), 0);
    const accountMap = { 'Công ty': 0, 'Thanh': 0 };
    orders.forEach(o => { if (o.payment_account) accountMap[o.payment_account] += parseFloat(o.amount || 0); });
    const cMap = {}; orders.forEach(o => { const n = o.customer_name || 'Khách'; cMap[n] = (cMap[n] || 0) + parseFloat(o.amount || 0); });
    const pMap = {}; orders.forEach(o => { if (o.products) o.products.split(', ').forEach(p => { const m = p.match(/(.+)\((.+)kg-(\d+)-(\d+)\)/); if (m) pMap[m[1]] = (pMap[m[1]] || 0) + parseFloat(m[4]); }); });
    return { totalRevenue, accountMap, topCustomers: Object.entries(cMap).sort((a,b)=>b[1]-a[1]).slice(0,5), topProducts: Object.entries(pMap).sort((a,b)=>b[1]-a[1]).slice(0,5) };
}

function renderStatList(id, data) {
    document.getElementById(id).innerHTML = data.map(([n, v]) => `<div class="stat-item"><span>${n}</span><span class="stat-val">${formatVND(v)}</span></div>`).join('') || 'Trống';
}

const ALLOWED_EMAILS = [
    "nguyenxuanthanh2009@gmail.com"
];

async function checkAuth() {
    const { data: { session }, error } = await client.auth.getSession();
    if (session && session.user) {
        const user = session.user;
        if (ALLOWED_EMAILS.includes(user.email)) {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            renderBoard();
        } else {
            document.getElementById('login-err').innerText = `Email ${user.email} không có quyền truy cập hệ thống!`;
            document.getElementById('login-err').style.display = 'block';
            await client.auth.signOut();
        }
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
}

async function handleGoogleLogin() {
    const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) {
        document.getElementById('login-err').innerText = 'Lỗi đăng nhập: ' + error.message;
        document.getElementById('login-err').style.display = 'block';
    }
}

// Lắng nghe sự thay đổi trạng thái auth từ Supabase
client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        checkAuth();
    } else if (event === 'SIGNED_OUT') {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});

function initDragAndDrop() {
    const board = document.querySelector('.board-container');
    document.querySelectorAll('.cards-container').forEach(container => {
        new Sortable(container, {
            group: 'shared', animation: 250,
            delay: 150, delayOnTouchOnly: true,
            touchStartThreshold: 5,
            forceFallback: true,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            scroll: true,
            scrollSensitivity: 60,
            scrollSpeed: 10,
            onStart: () => board.classList.add('dragging'),
            onEnd: async (evt) => {
                board.classList.remove('dragging');
                const id = evt.item.dataset.id;
                const newStatus = evt.to.closest('.column').dataset.status;
                const oldStatus = evt.from.closest('.column').dataset.status;
                if (newStatus !== oldStatus) {
                    if (newStatus === 'paid' || (oldStatus === 'debt' && newStatus === 'archived')) {
                        currentMoveData = { id, status: newStatus };
                        document.getElementById('payment-modal').classList.add('active');
                    }
                    else if (newStatus === 'lost') {
                        currentMoveData = { id, status: newStatus };
                        document.getElementById('lost-reason-modal').classList.add('active');
                    }
                    else { await updateOrderStatus(id, newStatus, true); }
                    updateColumnStats();
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    checkAuth();
    initDragAndDrop();
    initOcrScanner();

    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) googleBtn.onclick = handleGoogleLogin;
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await client.auth.signOut();
            location.reload();
        };
    }
    document.getElementById('dashboard-btn').onclick = openDashboard;
    document.getElementById('customer-btn').onclick = openCustomerList;
    document.getElementById('search-input').oninput = applySearch;
    document.getElementById('month-filter').onchange = openDashboard;
    document.getElementById('year-filter').onchange = openDashboard;
    
    document.getElementById('customer-modal-search').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = (window.allCustomers || []).filter(c => 
            c.name.toLowerCase().includes(query) || (c.phone && c.phone.toLowerCase().includes(query))
        );
        renderFilteredCustomerList(filtered);
    };
    
    document.querySelectorAll('.btn-account').forEach(btn => {
        btn.onclick = () => {
            if (currentMoveData) {
                updateOrderStatus(currentMoveData.id, currentMoveData.status, false, { payment_account: btn.innerText });
                document.getElementById('payment-modal').classList.remove('active');
                currentMoveData = null;
            }
        };
    });

    document.querySelectorAll('.btn-lost-reason').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.btn-lost-reason').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLostReason = btn.dataset.reason;
        };
    });

    document.getElementById('submit-lost-reason').onclick = async () => {
        const reason = document.getElementById('custom-lost-reason').value || selectedLostReason;
        if (!reason) { alert('Vui lòng chọn hoặc nhập lý do!'); return; }
        if (currentMoveData) {
            const orders = await fetchOrders();
            const order = orders.find(o => o.id == currentMoveData.id);
            const newNotes = (order.notes ? order.notes + "\n" : "") + "LÝ DO RỚT: " + reason;
            await updateOrderStatus(currentMoveData.id, 'lost', false, { notes: newNotes });
            document.getElementById('lost-reason-modal').classList.remove('active');
            currentMoveData = null;
            selectedLostReason = "";
            document.getElementById('custom-lost-reason').value = "";
        }
    };

    document.querySelectorAll('.modal-close-trigger').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
            if (currentMoveData && (currentMoveData.status === 'lost' || currentMoveData.status === 'archived')) renderBoard();
        };
    });

    window.onclick = (e) => { if (e.target.classList.contains('modal')) e.target.classList.remove('active'); };

});

// ==========================================
// --- OCR / AI QUOTATION SCANNER MODULE ---
// ==========================================
let currentOcrImageBase64 = null;
let currentOcrMimeType = 'image/png';

function openOcrModal() {
    const modal = document.getElementById('ocr-modal');
    if (!modal) return;
    resetOcrModal();
    modal.classList.add('active');
    lucide.createIcons();
}

function resetOcrModal() {
    const dropzone = document.getElementById('ocr-dropzone');
    const loading = document.getElementById('ocr-loading');
    const resultContainer = document.getElementById('ocr-result-container');
    const fileInput = document.getElementById('ocr-file-input');
    const cameraInput = document.getElementById('ocr-camera-input');

    if (dropzone) dropzone.style.display = 'block';
    if (loading) loading.style.display = 'none';
    if (resultContainer) resultContainer.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    currentOcrImageBase64 = null;
}

function initOcrScanner() {
    const ocrBtn = document.getElementById('ocr-btn');
    const quickOcrBtn = document.getElementById('quick-ocr-btn');
    const ocrModal = document.getElementById('ocr-modal');
    const ocrDropzone = document.getElementById('ocr-dropzone');
    const ocrFileInput = document.getElementById('ocr-file-input');
    const ocrCameraInput = document.getElementById('ocr-camera-input');
    const ocrReuploadBtn = document.getElementById('ocr-reupload-btn');
    const ocrSaveBtn = document.getElementById('ocr-save-btn');
    const ocrCancelBtn = document.getElementById('ocr-cancel-btn');
    const amountInput = document.getElementById('ocr-amount');

    if (ocrBtn) ocrBtn.onclick = openOcrModal;
    if (quickOcrBtn) quickOcrBtn.onclick = openOcrModal;

    if (ocrDropzone && ocrFileInput) {
        // Click vào vùng dropzone → mở file picker
        // Trên mobile, click vào label tự mở gallery
        ocrDropzone.onclick = (e) => {
            if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
            ocrFileInput.click();
        };

        ocrFileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                processOcrFile(e.target.files[0]);
            }
        };

        // Drag and drop support (desktop)
        ocrDropzone.ondragover = (e) => {
            e.preventDefault();
            ocrDropzone.style.borderColor = '#2563eb';
            ocrDropzone.style.background = '#eff6ff';
        };
        ocrDropzone.ondragleave = (e) => {
            e.preventDefault();
            ocrDropzone.style.borderColor = '#93c5fd';
            ocrDropzone.style.background = '#f8fafc';
        };
        ocrDropzone.ondrop = (e) => {
            e.preventDefault();
            ocrDropzone.style.borderColor = '#93c5fd';
            ocrDropzone.style.background = '#f8fafc';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processOcrFile(e.dataTransfer.files[0]);
            }
        };
    }

    if (ocrReuploadBtn) {
        ocrReuploadBtn.onclick = resetOcrModal;
    }

    if (ocrCancelBtn && ocrModal) {
        ocrCancelBtn.onclick = () => {
            ocrModal.classList.remove('active');
            resetOcrModal();
        };
    }

    if (amountInput) {
        amountInput.oninput = () => {
            const val = parseInt(amountInput.value, 10) || 0;
            const preview = document.getElementById('ocr-amount-preview');
            if (preview) preview.innerText = formatVND(val);
        };
    }

    if (ocrSaveBtn) {
        ocrSaveBtn.onclick = saveOcrOrderToCRM;
    }

    // Global Paste Support (Ctrl+V / Cmd+V)
    window.addEventListener('paste', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (['INPUT', 'TEXTAREA'].includes(activeTag)) return;

        const clipboardItems = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))?.items;
        if (!clipboardItems) return;

        for (let item of clipboardItems) {
            if (item.type && item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    openOcrModal();
                    processOcrFile(file);
                    break;
                }
            }
        }
    });

    // Gemini API Key config
    const geminiKeyBtn = document.getElementById('gemini-key-toggle-btn');
    if (geminiKeyBtn) {
        geminiKeyBtn.onclick = () => {
            const box = document.getElementById('gemini-key-box');
            if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
        };
    }

    const saveGeminiKeyBtn = document.getElementById('save-gemini-key-btn');
    const keyInput = document.getElementById('gemini-key-input');
    if (keyInput) keyInput.value = localStorage.getItem('lotus_gemini_api_key') || '';
    if (saveGeminiKeyBtn) {
        saveGeminiKeyBtn.onclick = () => {
            const key = document.getElementById('gemini-key-input').value.trim();
            if (key) {
                localStorage.setItem('lotus_gemini_api_key', key);
                alert('Đã lưu Gemini API Key! Từ giờ hệ thống sẽ ưu tiên dùng Gemini Vision AI.');
            } else {
                localStorage.removeItem('lotus_gemini_api_key');
                alert('Đã xóa Gemini API Key (sẽ dùng OCR Tesseract cục bộ).');
            }
        };
    }
}

function cleanAndSeparateNameAndAddress(name, address) {
    let cleanName = (name || '').trim();
    let cleanAddr = (address || '').trim();

    // 1. Tách nếu trong Tên có chứa các từ khóa của nhãn "ĐỊA CHỈ"
    const addrKeywordRegex = /(?:Đ[ỊIÍÌ]A\s*CH[ỈIÍĨ]\s*GIAO\s*H[ÀA]NG|D[IỊ]A\s*CH[IỈ]\s*GIAO\s*H[AÀ]NG|Đ[ỊIÍÌ]A\s*CH[ỈIÍĨ]|D[IỊ]A\s*CH[IỈ]|Đ\/C\s*GIAO\s*H[ÀA]NG|Đ\/C|DC\s*GIAO\s*H[AÀ]NG)[:\s-]*/i;
    const splitMatch = cleanName.match(addrKeywordRegex);
    if (splitMatch) {
        const parts = cleanName.split(splitMatch[0]);
        cleanName = parts[0].trim();
        const extractedAddr = parts.slice(1).join(' ').trim();
        if (extractedAddr && (!cleanAddr || cleanAddr.length < 5)) {
            cleanAddr = extractedAddr;
        }
    }

    // 2. Tách nếu tên chứa dấu xuống dòng \n
    if (cleanName.includes('\n')) {
        const lines = cleanName.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) {
            cleanName = lines[0];
            const rest = lines.slice(1).join(', ');
            if (rest && (!cleanAddr || cleanAddr.length < 5)) {
                cleanAddr = rest;
            }
        }
    }

    // 3. Tách nếu trong tên có các mẫu địa chỉ thường gặp (Số nhà, Đường, Phường, Quận, Ấp, Xã, KDC, v.v...)
    const addressPattern = /(?:\b(?:Số\s+\d+|Đường|Đ\.|Phường|P\.|Quận|Q\.|Huyện|H\.|Xã|Ấp|Thị trấn|TP\.|Tỉnh|KDC|Chung cư|Tòa nhà|Toà nhà)\b|\d+[\/-]\d+|\b\d+\s+[A-Za-zÀ-ỹ])/i;
    const matchAddr = cleanName.match(addressPattern);
    if (matchAddr && matchAddr.index > 2) {
        const candidateName = cleanName.slice(0, matchAddr.index).replace(/[-–,:\s]+$/, '').trim();
        const candidateAddr = cleanName.slice(matchAddr.index).trim();
        if (candidateName.length >= 2) {
            cleanName = candidateName;
            if (!cleanAddr || cleanAddr.length < 5) {
                cleanAddr = candidateAddr;
            }
        }
    }

    // Xóa các ký tự thừa ở đầu và cuối chuỗi
    cleanName = cleanName.replace(/^[.\s_:\-–—,]+|[.\s_:\-–—,]+$/g, '').trim();
    cleanAddr = cleanAddr.replace(/^[.\s_:\-–—,]+|[.\s_:\-–—,]+$/g, '').trim();

    return { name: cleanName, address: cleanAddr };
}

async function processOcrFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('Vui lòng chọn hoặc dán file hình ảnh hợp lệ (PNG, JPG, WebP)!');
        return;
    }

    currentOcrMimeType = file.type;
    const dropzone = document.getElementById('ocr-dropzone');
    const loading = document.getElementById('ocr-loading');
    const resultContainer = document.getElementById('ocr-result-container');
    const statusText = document.getElementById('ocr-status-text');
    const previewImg = document.getElementById('ocr-preview-img');

    if (dropzone) dropzone.style.display = 'none';
    if (loading) loading.style.display = 'block';
    if (resultContainer) resultContainer.style.display = 'none';
    if (statusText) statusText.innerText = 'Đang tải ảnh và chuẩn bị nhận diện...';

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target.result;
        if (previewImg) previewImg.src = dataUrl;
        currentOcrImageBase64 = dataUrl.split(',')[1];

        const geminiApiKey = localStorage.getItem('lotus_gemini_api_key');
        let parsedData = null;
        let engineUsed = 'tesseract';
        let geminiErrorMsg = null;

        if (geminiApiKey) {
            try {
                if (statusText) statusText.innerText = 'Đang dùng Google Gemini Vision AI để trích xuất dữ liệu...';
                parsedData = await extractWithGemini(currentOcrImageBase64, currentOcrMimeType, geminiApiKey);
                engineUsed = 'gemini';
            } catch (err) {
                console.error('Gemini extraction failed:', err);
                geminiErrorMsg = err.message || 'Lỗi kết nối Gemini API';
                if (statusText) statusText.innerText = `Gemini gặp lỗi, đang tự động chuyển sang Tesseract OCR...`;
                // Auto-set parsedData = null để fallback về Tesseract
                parsedData = null;
            }
        }

        if (!parsedData) {
            try {
                if (statusText && !geminiApiKey) statusText.innerText = 'Đang quét ký tự quang học OCR (Tesseract.js)...';
                parsedData = await extractWithTesseract(dataUrl, (progress) => {
                    if (progress && progress.status === 'recognizing text' && statusText) {
                        statusText.innerText = `Đang đọc chữ từ ảnh: ${Math.round(progress.progress * 100)}%`;
                    }
                });
                engineUsed = 'tesseract';
            } catch (err) {
                console.error('Tesseract error:', err);
                alert('Không thể nhận diện ảnh: ' + (err.message || 'Lỗi xử lý OCR'));
                resetOcrModal();
                return;
            }
        }

        // --- BƯỚC QUAN TRỌNG: TÁCH RIÊNG TÊN VÀ ĐỊA CHỈ NẾU BỊ DÍNH NHAU ---
        const separated = cleanAndSeparateNameAndAddress(parsedData.customer_name, parsedData.customer_address);
        parsedData.customer_name = separated.name;
        parsedData.customer_address = separated.address;

        // Tra cứu bổ sung: Nếu chưa đọc được tên nhưng có số điện thoại, tìm tên trong các đơn cũ
        if ((!parsedData.customer_name || parsedData.customer_name.length < 2) && parsedData.customer_phone) {
            try {
                const { data: matchedOrders } = await client.from('orders')
                    .select('customer_name, customer_address')
                    .eq('customer_phone', parsedData.customer_phone)
                    .limit(1);
                if (matchedOrders && matchedOrders.length > 0 && matchedOrders[0].customer_name) {
                    parsedData.customer_name = matchedOrders[0].customer_name;
                    if (!parsedData.customer_address && matchedOrders[0].customer_address) {
                        parsedData.customer_address = matchedOrders[0].customer_address;
                    }
                }
            } catch (e) {
                console.warn('Customer phone lookup error:', e);
            }
        }

        if (loading) loading.style.display = 'none';
        if (resultContainer) resultContainer.style.display = 'block';

        // Cập nhật huy hiệu công nghệ nhận diện
        const badgeDiv = document.getElementById('ocr-badge-status') || document.querySelector('#ocr-result-container .ocr-field')?.parentElement?.firstElementChild;
        if (badgeDiv) {
            if (engineUsed === 'gemini') {
                badgeDiv.innerHTML = '<i data-lucide="sparkles" style="width: 16px; height: 16px;"></i> Nhận diện bằng Google Gemini AI (Chính xác cao)';
                badgeDiv.style.background = '#eff6ff';
                badgeDiv.style.color = '#1d4ed8';
                badgeDiv.style.borderColor = '#bfdbfe';
            } else if (geminiErrorMsg) {
                badgeDiv.innerHTML = `<i data-lucide="alert-triangle" style="width: 16px; height: 16px;"></i> Gemini lỗi (${geminiErrorMsg}) - Đã tự động dùng OCR Tesseract`;
                badgeDiv.style.background = '#fef3c7';
                badgeDiv.style.color = '#92400e';
                badgeDiv.style.borderColor = '#fde68a';
            } else {
                badgeDiv.innerHTML = '<i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> Nhận diện bằng OCR Tesseract. Vui lòng kiểm tra lại:';
                badgeDiv.style.background = '#f0fdf4';
                badgeDiv.style.color = '#166534';
                badgeDiv.style.borderColor = '#bbf7d0';
            }
        }

        lucide.createIcons();

        document.getElementById('ocr-customer-name').value = parsedData.customer_name || '';
        document.getElementById('ocr-customer-phone').value = parsedData.customer_phone || '';
        document.getElementById('ocr-customer-address').value = parsedData.customer_address || '';
        document.getElementById('ocr-quote-no').value = parsedData.quote_no || '';
        document.getElementById('ocr-amount').value = parsedData.amount || 0;
        const previewAmt = document.getElementById('ocr-amount-preview');
        if (previewAmt) previewAmt.innerText = formatVND(parsedData.amount || 0);
        document.getElementById('ocr-products').value = parsedData.products || '';
    };
    reader.readAsDataURL(file);
}

async function extractWithGemini(base64Image, mimeType, apiKey) {
    const prompt = `Bạn là trợ lý AI chuyên bóc tách dữ liệu từ ảnh chụp bảng báo giá sơn Lotus Paint. Hãy trích xuất chính xác các thông tin thành đúng 1 JSON hợp lệ (không markdown, không giải thích):\n` +
    `{\n` +
    `  "customer_name": "Tên khách hàng",\n` +
    `  "customer_phone": "Số điện thoại",\n` +
    `  "customer_address": "Địa chỉ giao hàng",\n` +
    `  "quote_no": "Số báo giá (ví dụ: 0711/BBG/ABC-BT)",\n` +
    `  "amount": 15000000,\n` +
    `  "products": "Tên các sản phẩm trong bảng kèm quy cách và số lượng"\n` +
    `}\n` +
    `QUY TẮC BẮT BUỘC ĐỂ KHÔNG NHẦM LẪN:\n` +
    `1. "customer_name": CHỈ LẤY TÊN CỦA KHÁCH HÀNG (ở dòng TÊN KHÁCH HÀNG: ...). Bỏ qua các dấu chấm "....". TUYỆT ĐỐI KHÔNG GHÉP ĐỊA CHỈ VÀO TRƯỜNG TÊN NÀY!\n` +
    `2. "customer_address": LẤY ĐỊA CHỈ GIAO HÀNG (ở dòng ĐỊA CHỈ GIAO HÀNG: ...). Không lấy địa chỉ công ty Bích Trang ở phần logo đầu trang.\n` +
    `3. "customer_phone": Số điện thoại của khách hàng (ở mục SĐT).\n` +
    `4. "amount": Là tổng số tiền thanh toán cuối cùng (dạng số nguyên integer không dấu chấm, ví dụ 15000000).\n`;

    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
    let lastError = null;

    for (let model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [
                            {
                                inlineData: {
                                    mimeType: mimeType || 'image/png',
                                    data: base64Image
                                }
                            },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error?.message || `HTTP ${res.status}`;
                console.error(`Gemini ${model} error:`, errData);
                throw new Error(errMsg);
            }

            const data = await res.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
                const cleanJsonStr = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
                const obj = JSON.parse(cleanJsonStr);
                return {
                    customer_name: obj.customer_name || '',
                    customer_phone: obj.customer_phone || '',
                    customer_address: obj.customer_address || '',
                    quote_no: obj.quote_no || '',
                    amount: parseInt(String(obj.amount || 0).replace(/[^0-9]/g, ''), 10) || 0,
                    products: obj.products || ''
                };
            }
        } catch (e) {
            lastError = e;
            console.warn(`Model ${model} error:`, e.message);
        }
    }
    // Fallback tự động về Tesseract nếu Gemini lỗi
    console.warn('Gemini failed, falling back to Tesseract OCR');
    throw lastError || new Error('Không thể kết nối Gemini API');
}

async function extractWithTesseract(imageSource, onProgress) {
    if (typeof Tesseract === 'undefined') {
        throw new Error('Thư viện Tesseract OCR chưa tải xong, vui lòng kiểm tra kết nối mạng!');
    }

    // Preprocess image để cải thiện OCR cho font tiếng Việt
    const preprocessedImage = await preprocessImage(imageSource);

    const worker = await Tesseract.createWorker('vie+eng');
    if (onProgress) {
        worker.setParameters({
            logger: onProgress
        });
    }

    // Điều chỉnh tham số để đọc tiếng Việt tốt hơn
    await worker.setParameters({
        // Không dùng whitelist để Tesseract tự học pattern tiếng Việt
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1',
        textord_heavy_nr: '1',
        textord_noise_removal: '1',
    });

    const ret = await worker.recognize(preprocessedImage);
    await worker.terminate();

    const rawText = ret.data?.text || '';
    return parseQuotationText(rawText);
}

// Preprocess ảnh để cải thiện OCR
async function preprocessImage(imageSource) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Tăng kích thước ảnh 3x để OCR đọc được font nhỏ
            const scale = 3;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            // Vẽ ảnh đã scale
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Chuyển sang grayscale
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;     // R
                data[i + 1] = avg; // G
                data[i + 2] = avg; // B
            }

            ctx.putImageData(imageData, 0, 0);

            // Tăng contrast mạnh hơn với adaptive threshold
            const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pData = processedData.data;

            // Adaptive thresholding
            for (let i = 0; i < pData.length; i += 4) {
                const gray = pData[i];
                // Threshold cao hơn để text trắng nền đen rõ hơn
                const value = gray > 160 ? 255 : (gray < 80 ? 0 : gray);
                pData[i] = value;
                pData[i + 1] = value;
                pData[i + 2] = value;
            }

            ctx.putImageData(processedData, 0, 0);

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(imageSource); // Nếu lỗi thì dùng ảnh gốc
        img.src = imageSource;
    });
}

function parseQuotationText(text) {
    let customer_name = '';
    let customer_phone = '';
    let customer_address = '';
    let quote_no = '';
    let amount = 0;
    let products = '';

    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 1. TÊN KHÁCH HÀNG: Chỉ lấy trên dòng TÊN KHÁCH HÀNG hoặc trước nhãn ĐỊA CHỈ
    const nameLabelRegex = /(?:TÊN\s*KHÁCH\s*HÀNG|TEN\s*KHACH\s*HANG|TÊN\s*KHÁCH|TEN\s*KHACH|KHÁCH\s*HÀNG|KHACH\s*HANG|TÊN\s*KH|TEN\s*KH)/i;
    const nameEndRegex = /(?:Đ[ỊIÍÌ]A\s*CH[ỈIÍĨ]|D[IỊ]A\s*CH[IỈ]|Đ\/C|SĐT|SDT|ĐIỆN\s*THOẠI|PHONE|TEL|SỐ\s*BÁO\s*GIÁ|SO\s*BAO\s*GIA|SỐ\s*BIÊN\s*BẢN|STT|TỔNG|\n|$)/i;

    // Ưu tiên 1: Quét trên dòng có TÊN KHÁCH HÀNG
    for (let line of rawLines) {
        if (nameLabelRegex.test(line)) {
            let afterColon = line.replace(new RegExp('^.*?' + nameLabelRegex.source + '[:\\s-]*', 'i'), '')
                .replace(/[.:_\-–—]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            // Nếu trên cùng dòng có nhãn địa chỉ hoặc sđt thì cắt ra
            const cutAddr = afterColon.search(nameEndRegex);
            if (cutAddr !== -1) {
                afterColon = afterColon.slice(0, cutAddr).trim();
            }
            if (afterColon.length >= 2) {
                customer_name = afterColon;
                break;
            }
        }
    }

    // Ưu tiên 2: Dòng kế tiếp nếu dòng trước chỉ có nhãn
    if (!customer_name) {
        for (let i = 0; i < rawLines.length; i++) {
            if (nameLabelRegex.test(rawLines[i]) && i + 1 < rawLines.length) {
                const nextLine = rawLines[i + 1].replace(/[.:_\-–—]+/g, ' ').trim();
                if (!nameEndRegex.test(nextLine) && nextLine.length >= 2) {
                    customer_name = nextLine;
                    break;
                }
            }
        }
    }

    // 2. SĐT
    const phoneMatch = text.match(/(?:SĐT|ĐIỆN THOẠI|PHONE|TEL)[:\s]+([0-9\s.]{9,15})/i) || text.match(/\b(0[3|5|7|8|9][0-9]{8})\b/);
    if (phoneMatch) {
        customer_phone = phoneMatch[1].replace(/[^0-9]/g, '');
    }

    // 3. ĐỊA CHỈ GIAO HÀNG (Chỉ quét phần sau tiêu đề báo giá để tránh nhầm địa chỉ công ty)
    const afterTitleIdx = text.search(/BÁO GIÁ|TÊN KHÁCH HÀNG|TEN KHACH HANG/i);
    const textToSearchAddr = afterTitleIdx !== -1 ? text.slice(afterTitleIdx) : text;
    const addrLabelRegex = /(?:Đ[ỊIÍÌ]A\s*CH[ỈIÍĨ]\s*GIAO\s*H[ÀA]NG|D[IỊ]A\s*CH[IỈ]\s*GIAO\s*H[AÀ]NG|Đ[ỊIÍÌ]A\s*CH[ỈIÍĨ]|D[IỊ]A\s*CH[IỈ])/i;
    const addrEndRegex = /(?:SĐT|SDT|ĐIỆN\s*THOẠI|PHONE|TEL|SỐ\s*BÁO\s*GIÁ|SO\s*BAO\s*GIA|SỐ\s*BIÊN\s*BẢN|STT|TỔNG|\n\s*\n|$)/i;

    const addrBlockMatch = textToSearchAddr.match(new RegExp(addrLabelRegex.source + '[:\\s]*([\\s\\S]*?)(?=' + addrEndRegex.source + ')', 'i'));
    if (addrBlockMatch && addrBlockMatch[1]) {
        customer_address = addrBlockMatch[1]
            .replace(/[._\-–—]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    if (!customer_address) {
        const addrMatch = textToSearchAddr.match(new RegExp(addrLabelRegex.source + '[:\\s]+([^\\n\\r]+)', 'i'));
        if (addrMatch) {
            customer_address = addrMatch[1].replace(/^[.\s_:-]+|[.\s_:-]+$/g, '').trim();
        }
    }

    // Tách riêng tên và địa chỉ nếu có sự chồng lấn
    const separated = cleanAndSeparateNameAndAddress(customer_name, customer_address);
    customer_name = separated.name;
    customer_address = separated.address;

    // 4. SỐ BÁO GIÁ
    const quoteMatch = text.match(/(?:SỐ BÁO GIÁ|SỐ BIÊN BẢN|SỐ BG)[:\s]+([0-9A-Z\/\-_]+)/i) || text.match(/([0-9]{2,4}\/BBG\/[0-9A-Z\-_]+)/i);
    if (quoteMatch) {
        quote_no = quoteMatch[1].trim();
    }

    // 5. TỔNG THANH TOÁN (Không bắt nhầm "THÀNH TIỀN" của bảng sản phẩm)
    const amountMatch = text.match(/(?:TỔNG\s*THANH\s*TOÁN|TỔNG\s*CỘNG\s*TIỀN\s*HÀNG|TỔNG\s*TIỀN|TỔNG\s*CỘNG)[:\s]*([0-9.,\s]+)/i);
    if (amountMatch) {
        amount = parseInt(amountMatch[1].replace(/[^0-9]/g, ''), 10) || 0;
    }
    if (amount < 1000) {
        const candidates = [...text.matchAll(/([0-9]{1,3}(?:[.,][0-9]{3}){1,3})/g)]
            .map(m => parseInt(m[1].replace(/[^0-9]/g, ''), 10))
            .filter(n => n >= 50000);
        if (candidates.length > 0) {
            amount = Math.max(...candidates);
        }
    }

    // 6. Sản phẩm
    const productLines = [];
    let insideTable = false;
    for (let line of rawLines) {
        if (/STT|TÊN SẢN PHẨM|QUY CÁCH|ĐƠN GIÁ/i.test(line)) {
            insideTable = true;
            continue;
        }
        if (/TỔNG|Ghi chú|Thanh toán|STK|ACB|Eximbank/i.test(line)) {
            insideTable = false;
        }
        if (insideTable && line.length > 5) {
            productLines.push(line);
        }
    }
    products = productLines.slice(0, 10).join('; ') || 'Báo giá từ ảnh chụp';

    return {
        customer_name,
        customer_phone,
        customer_address,
        quote_no,
        amount,
        products
    };
}

async function saveOcrOrderToCRM() {
    const name = document.getElementById('ocr-customer-name').value.trim() || 'Khách Mới (Từ Ảnh)';
    const phone = document.getElementById('ocr-customer-phone').value.trim();
    const address = document.getElementById('ocr-customer-address').value.trim();
    let quoteNo = document.getElementById('ocr-quote-no').value.trim();
    const amountVal = document.getElementById('ocr-amount').value.trim();
    const products = document.getElementById('ocr-products').value.trim() || 'Báo giá từ ảnh chụp';

    if (!quoteNo) {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        const abbr = cleanName.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'XYZ';
        quoteNo = `${dd}${mm}/BBG/${abbr}-BT`;
    }

    const orderData = {
        id: `ORD-${Date.now()}`,
        quote_no: quoteNo,
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        amount: String(amountVal || 0),
        products: products,
        status: 'quote', // ĐƯA VÀO CỘT BÁO GIÁ
        salesperson_name: 'Nguyễn Xuân Thanh',
        created_at: new Date().toISOString()
    };

    const saveBtn = document.getElementById('ocr-save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerText = 'Đang lưu vào CRM...';

    const { error } = await client.from('orders').upsert(orderData);
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;

    if (error) {
        alert('Lỗi lưu vào CRM: ' + error.message);
        return;
    }

    document.getElementById('ocr-modal').classList.remove('active');
    resetOcrModal();
    if (typeof confetti === 'function') confetti();
    await renderBoard();
    alert(`Đã thêm thành công khách hàng "${name}" vào cột Báo Giá!`);
}



