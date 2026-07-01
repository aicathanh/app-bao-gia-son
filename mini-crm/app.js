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

let cachedDashboardOrders = [];
let currentActiveDetailType = null;
let currentArchivedDetailType = null;

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
    cachedDashboardOrders = orders;

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
            <div style="text-align:center; min-width:120px; padding: 5px 10px;">
                <div>TỔNG DOANH SỐ</div>
                <strong>${formatVND(activeData.totalRevenue)}</strong>
            </div>
            <div id="stat-active-company" style="text-align:center; cursor:pointer; padding: 5px 10px; border-radius:8px; transition: background 0.2s;" class="dashboard-stat-btn">
                CÔNG TY<br>
                <span style="color:#2563eb; font-weight:700;">${formatVND(activeData.accountMap['Công ty'])}</span>
            </div>
            <div id="stat-active-thanh" style="text-align:center; cursor:pointer; padding: 5px 10px; border-radius:8px; transition: background 0.2s;" class="dashboard-stat-btn">
                THANH<br>
                <span style="color:#059669; font-weight:700;">${formatVND(activeData.accountMap['Thanh'])}</span>
            </div>
            <div id="stat-active-debt" style="text-align:center; color:red; cursor:pointer; padding: 5px 10px; border-radius:8px; transition: background 0.2s;" class="dashboard-stat-btn">
                ĐANG NỢ<br>
                <strong>${formatVND(activeDebt)}</strong>
            </div>
        </div>
    `;

    const archived = orders.filter(o => { const d = new Date(o.created_at); return o.status === 'archived' && d.getFullYear().toString() === year && (month === 'all' ? true : d.getMonth().toString() === month); });
    const archData = calculateStats(archived);
    document.getElementById('archived-account-stats').innerHTML = `
        <div style="display:flex; justify-content:space-around; gap:10px; margin-bottom:20px; background:#f5f3ff; padding:15px; border-radius:12px; flex-wrap:wrap;">
            <div style="text-align:center; min-width:120px; padding: 5px 10px;">
                <div>TỔNG LỊCH SỬ</div>
                <strong>${formatVND(archData.totalRevenue)}</strong>
            </div>
            <div id="stat-archived-company" style="text-align:center; cursor:pointer; padding: 5px 10px; border-radius:8px; transition: background 0.2s;" class="dashboard-stat-btn">
                CÔNG TY<br>
                <strong style="color:#2563eb;">${formatVND(archData.accountMap['Công ty'])}</strong>
            </div>
            <div id="stat-archived-thanh" style="text-align:center; cursor:pointer; padding: 5px 10px; border-radius:8px; transition: background 0.2s;" class="dashboard-stat-btn">
                THANH<br>
                <strong style="color:#059669;">${formatVND(archData.accountMap['Thanh'])}</strong>
            </div>
        </div>
    `;

    // Bind click events
    const cActive = document.getElementById('stat-active-company');
    if (cActive) cActive.onclick = () => showActiveDetails('company');
    const tActive = document.getElementById('stat-active-thanh');
    if (tActive) tActive.onclick = () => showActiveDetails('thanh');
    const dActive = document.getElementById('stat-active-debt');
    if (dActive) dActive.onclick = () => showActiveDetails('debt');

    const cArchived = document.getElementById('stat-archived-company');
    if (cArchived) cArchived.onclick = () => showArchivedDetails('company');
    const tArchived = document.getElementById('stat-archived-thanh');
    if (tArchived) tArchived.onclick = () => showArchivedDetails('thanh');

    // Refresh details if already open
    if (currentActiveDetailType) {
        const type = currentActiveDetailType;
        currentActiveDetailType = null;
        showActiveDetails(type);
    } else {
        const activeContainer = document.getElementById('active-details-container');
        if (activeContainer) activeContainer.style.display = 'none';
    }

    if (currentArchivedDetailType) {
        const type = currentArchivedDetailType;
        currentArchivedDetailType = null;
        showArchivedDetails(type);
    } else {
        const archivedContainer = document.getElementById('archived-details-container');
        if (archivedContainer) archivedContainer.style.display = 'none';
    }

    renderStatList('active-top-customers', activeData.topCustomers);
    renderStatList('active-top-products', activeData.topProducts);
    renderStatList('archived-top-customers', archData.topCustomers);
    renderStatList('archived-top-products', archData.topProducts);
    document.getElementById('dashboard-modal').classList.add('active');
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    if (modal.id === 'dashboard-modal') {
        currentActiveDetailType = null;
        currentArchivedDetailType = null;
        const activeContainer = document.getElementById('active-details-container');
        if (activeContainer) activeContainer.style.display = 'none';
        const archivedContainer = document.getElementById('archived-details-container');
        if (archivedContainer) archivedContainer.style.display = 'none';
    }
}

function showActiveDetails(type) {
    const container = document.getElementById('active-details-container');
    if (!container) return;
    
    if (currentActiveDetailType === type) {
        container.style.display = 'none';
        currentActiveDetailType = null;
        updateActiveStatHighlights();
        return;
    }
    
    currentActiveDetailType = type;
    updateActiveStatHighlights();
    
    const active = cachedDashboardOrders.filter(o => o.status === 'paid' || o.status === 'debt');
    let filtered = [];
    let title = '';
    let accentColor = '#2563eb';
    
    if (type === 'company') {
        filtered = active.filter(o => o.payment_account === 'Công ty');
        title = 'Chi tiết Doanh số Công ty (Đang chạy)';
        accentColor = '#2563eb';
    } else if (type === 'thanh') {
        filtered = active.filter(o => o.payment_account === 'Thanh');
        title = 'Chi tiết Doanh số Thanh (Đang chạy)';
        accentColor = '#059669';
    } else if (type === 'debt') {
        filtered = active.filter(o => o.status === 'debt');
        title = 'Chi tiết Khách hàng Đang Nợ';
        accentColor = '#dc2626';
    }
    
    renderDetailsTable(container, title, filtered, accentColor);
}

function showArchivedDetails(type) {
    const container = document.getElementById('archived-details-container');
    if (!container) return;
    
    if (currentArchivedDetailType === type) {
        container.style.display = 'none';
        currentArchivedDetailType = null;
        updateArchivedStatHighlights();
        return;
    }
    
    currentArchivedDetailType = type;
    updateArchivedStatHighlights();
    
    const yFilter = document.getElementById('year-filter');
    const month = document.getElementById('month-filter').value;
    const year = yFilter ? yFilter.value : new Date().getFullYear().toString();
    
    const archived = cachedDashboardOrders.filter(o => { 
        const d = new Date(o.created_at); 
        return o.status === 'archived' && d.getFullYear().toString() === year && (month === 'all' ? true : d.getMonth().toString() === month); 
    });
    
    let filtered = [];
    let title = '';
    let accentColor = '#2563eb';
    
    if (type === 'company') {
        filtered = archived.filter(o => o.payment_account === 'Công ty');
        title = `Chi tiết Doanh số Công ty - Lịch sử (Năm ${year} - ${month === 'all' ? 'Tất cả tháng' : 'Tháng ' + (parseInt(month)+1)})`;
        accentColor = '#2563eb';
    } else if (type === 'thanh') {
        filtered = archived.filter(o => o.payment_account === 'Thanh');
        title = `Chi tiết Doanh số Thanh - Lịch sử (Năm ${year} - ${month === 'all' ? 'Tất cả tháng' : 'Tháng ' + (parseInt(month)+1)})`;
        accentColor = '#059669';
    }
    
    renderDetailsTable(container, title, filtered, accentColor);
}

function renderDetailsTable(container, title, orders, accentColor) {
    if (!container) return;
    container.style.display = 'block';
    
    const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
    
    let tableRows = '';
    if (orders.length === 0) {
        tableRows = `<tr><td colspan="5" style="text-align:center; color:#64748b; padding: 20px;">Không có dữ liệu</td></tr>`;
    } else {
        tableRows = orders.map(o => {
            const dateStr = new Date(o.created_at).toLocaleDateString('vi-VN');
            const statusLabel = STATUS_MAP[o.status] || o.status;
            
            let contactHtml = 'N/A';
            if (o.customer_phone) {
                const cleanPhone = o.customer_phone.replace(/[^0-9]/g, '');
                contactHtml = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <a href="tel:${o.customer_phone}" style="color:#2563eb; font-weight:600; text-decoration:none; white-space:nowrap;">${o.customer_phone}</a>
                        <a href="https://zalo.me/${cleanPhone}" target="_blank" style="padding:2px 8px; background:#0068ff; color:white; border-radius:6px; font-size:0.65rem; text-decoration:none; font-weight:700; display:inline-block; white-space:nowrap;">Zalo</a>
                    </div>
                `;
            }
            
            return `
                <tr>
                    <td style="white-space:nowrap;">${dateStr}</td>
                    <td>
                        <a href="#" class="detail-link" data-id="${o.id}" style="color:#1e293b; font-weight:700; text-decoration:underline;">${o.customer_name || 'N/A'}</a>
                    </td>
                    <td>${contactHtml}</td>
                    <td style="font-weight:700; color:${o.status === 'debt' ? 'red' : 'inherit'};">${formatVND(o.amount || 0)}</td>
                    <td style="white-space:nowrap;">
                        <span class="status-badge" style="padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700; background:${o.status === 'debt' ? '#fee2e2' : o.status === 'archived' ? '#f1f5f9' : '#dcfce7'}; color:${o.status === 'debt' ? '#b91c1c' : o.status === 'archived' ? '#475569' : '#15803d'};">
                            ${statusLabel}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid ${accentColor}; flex-wrap:wrap; gap:10px;">
            <h4 style="color:${accentColor}; margin:0; font-size:0.95rem; font-weight:800;">${title}</h4>
            <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                <span style="font-size:0.85rem; font-weight:700; background:#f1f5f9; padding:4px 10px; border-radius:6px;">
                    Tổng cộng: <span style="color:${accentColor}; font-weight:800;">${formatVND(totalAmount)}</span> (${orders.length} đơn)
                </span>
                <button class="close-details-btn" style="background:none; border:none; color:#64748b; cursor:pointer; font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:4px; padding:4px;">
                    <i data-lucide="x" style="width:14px; height:14px;"></i> Đóng
                </button>
            </div>
        </div>
        <div style="max-height: 250px; overflow-y: auto; border:1px solid #f1f5f9; border-radius:8px;">
            <table class="data-table" style="font-size:0.85rem; width:100%; margin-top:0;">
                <thead>
                    <tr>
                        <th style="font-size:0.7rem; padding:8px 12px;">Ngày</th>
                        <th style="font-size:0.7rem; padding:8px 12px;">Họ tên</th>
                        <th style="font-size:0.7rem; padding:8px 12px;">Liên hệ</th>
                        <th style="font-size:0.7rem; padding:8px 12px;">Số tiền</th>
                        <th style="font-size:0.7rem; padding:8px 12px;">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
    
    container.querySelector('.close-details-btn').onclick = () => {
        container.style.display = 'none';
        if (container.id === 'active-details-container') {
            currentActiveDetailType = null;
            updateActiveStatHighlights();
        } else {
            currentArchivedDetailType = null;
            updateArchivedStatHighlights();
        }
    };
    
    container.querySelectorAll('.detail-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const orderId = link.dataset.id;
            const order = cachedDashboardOrders.find(o => o.id == orderId);
            if (order) {
                showDetails(order);
            }
        };
    });
    
    lucide.createIcons();
}

function updateActiveStatHighlights() {
    const ids = {
        'company': 'stat-active-company',
        'thanh': 'stat-active-thanh',
        'debt': 'stat-active-debt'
    };
    
    Object.entries(ids).forEach(([type, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (currentActiveDetailType === type) {
            el.style.background = 'rgba(0, 0, 0, 0.08)';
            el.style.boxShadow = 'inset 0 0 0 2px rgba(37, 99, 235, 0.2)';
        } else {
            el.style.background = 'transparent';
            el.style.boxShadow = 'none';
        }
    });
}

function updateArchivedStatHighlights() {
    const ids = {
        'company': 'stat-archived-company',
        'thanh': 'stat-archived-thanh'
    };
    
    Object.entries(ids).forEach(([type, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (currentArchivedDetailType === type) {
            el.style.background = 'rgba(0, 0, 0, 0.08)';
            el.style.boxShadow = 'inset 0 0 0 2px rgba(37, 99, 235, 0.2)';
        } else {
            el.style.background = 'transparent';
            el.style.boxShadow = 'none';
        }
    });
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
            const modal = b.closest('.modal');
            closeModal(modal);
            if (currentMoveData && (currentMoveData.status === 'lost' || currentMoveData.status === 'archived')) renderBoard();
        };
    });

    window.onclick = (e) => { 
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    };

});



