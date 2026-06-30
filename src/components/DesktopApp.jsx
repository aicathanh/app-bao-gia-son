import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Download, Printer, Save, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import productData from '../data/products.json';
import { exportToPDF } from '../utils/pdfGenerator';
import '../styles/index.css';
import confetti from 'canvas-confetti';
import logoSrc from '../assets/logo.png';
import { Link } from 'react-router-dom';

const DesktopApp = () => {
    const defaultItem = { productId: '', size: '5', quantity: 1, note: '', customName: '', customPrice: 0 };
    const products = productData.products;
    const [docType, setDocType] = useState('quote');

    const [customer, setCustomer] = useState({
        name: '',
        quoteId: '',
        address: '',
        phone: ''
    });

    const [shipping, setShipping] = useState({ value: 0, note: '', visible: false });
    const [discount, setDiscount] = useState({ value: 0, note: '', visible: false });
    const [items, setItems] = useState([{ ...defaultItem, id: 1 }]);
    const [today, setToday] = useState(format(new Date(), 'dd/MM/yyyy'));
    const [notes, setNotes] = useState(() => {
        const saved = localStorage.getItem('desktop_quotation_notes');
        if (saved) return saved;
        return `- Thời gian giao hàng: 2-3 ngày kể từ ngày xác nhận đơn hàng\n- Thanh toán: Đặt cọc 50% đối với các đơn hàng từ 10 triệu đồng. Thanh toán 100% trước khi giao hàng\nSTK: 211014851223910 - Ngân hàng Eximbank - CN TP.HCM - CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ BÍCH TRANG\nSTK: 862 999 888 - ACB - Nguyễn Xuân Thanh`;
    });
    const [paymentMethod, setPaymentMethod] = useState('company');
    const [customerList, setCustomerList] = useState([]);
    const notesRef = useRef(null);

    // Auto-save notes to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('desktop_quotation_notes', notes);
    }, [notes]);

    // Fetch past customer list from Supabase for autocomplete
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
                const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co';
                const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8';
                const supabase = createClient(supabaseUrl, supabaseKey);
                
                const { data, error } = await supabase
                    .from('orders')
                    .select('customer_name, customer_phone, customer_address')
                    .order('created_at', { ascending: false });
                    
                if (!error && data) {
                    const uniqueMap = new Map();
                    data.forEach(o => {
                        const name = o.customer_name ? o.customer_name.trim() : '';
                        if (name && name !== 'Khách Vãng Lai') {
                            const key = `${name.toLowerCase()}_${(o.customer_phone || '').trim().toLowerCase()}`;
                            if (!uniqueMap.has(key)) {
                                uniqueMap.set(key, {
                                    name: name,
                                    phone: (o.customer_phone || '').trim(),
                                    address: (o.customer_address || '').trim()
                                });
                            }
                        }
                    });
                    setCustomerList(Array.from(uniqueMap.values()));
                }
            } catch (err) {
                console.error('Error fetching customer database:', err);
            }
        };
        fetchCustomers();
    }, []);

    const generateQuoteId = (name) => {
        const getAbbreviation = (n) => {
            if (!n) return 'XYZ';
            const cleanName = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
            return cleanName.trim().split(/\s+/).map(word => word[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '');
        };
        const now = new Date();
        return `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}/BBG/${getAbbreviation(name)}-BT`;
    };

    useEffect(() => {
        if (!customer.quoteId) {
            setCustomer(prev => ({ ...prev, quoteId: generateQuoteId(prev.name) }));
        }
    }, [customer.name]);

    const handleNameChange = (val) => {
        setCustomer(prev => {
            const next = { ...prev, name: val };
            const match = customerList.find(c => c.name.toLowerCase() === val.trim().toLowerCase());
            if (match) {
                next.phone = match.phone;
                next.address = match.address;
                next.quoteId = generateQuoteId(val);
            }
            return next;
        });
    };

    const handlePhoneChange = (val) => {
        setCustomer(prev => {
            const next = { ...prev, phone: val };
            const match = customerList.find(c => c.phone.trim() === val.trim());
            if (match) {
                next.name = match.name;
                next.address = match.address;
                next.quoteId = generateQuoteId(match.name);
            }
            return next;
        });
    };

    const handleAddressChange = (val) => {
        setCustomer(prev => {
            const next = { ...prev, address: val };
            const match = customerList.find(c => c.address.toLowerCase() === val.trim().toLowerCase());
            if (match) {
                next.name = match.name;
                next.phone = match.phone;
                next.quoteId = generateQuoteId(match.name);
            }
            return next;
        });
    };

    const addItem = () => setItems([...items, { ...defaultItem, id: Date.now() }]);
    const removeItem = (id) => items.length > 1 && setItems(items.filter(item => item.id !== id));
    
    const updateItem = (id, fieldOrFields, value) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                let updated = { ...item };
                if (typeof fieldOrFields === 'object') updated = { ...updated, ...fieldOrFields };
                else updated = { ...updated, [fieldOrFields]: value };
                
                if ((fieldOrFields === 'productId' || fieldOrFields.productId) && updated.productId) {
                    const product = products.find(p => p.id === parseInt(updated.productId));
                    if (product) {
                        const sizes = Object.keys(product.p_prices);
                        if (sizes.length > 0 && !sizes.includes(updated.size)) updated.size = sizes[0];
                    }
                }
                return updated;
            }
            return item;
        }));
    };

    const getPrice = (item) => {
        if (item.productId) {
            const product = products.find(p => p.id === parseInt(item.productId));
            return product ? product.p_prices[item.size] || 0 : 0;
        }
        return item.customPrice || 0;
    };

    const subtotal = items.reduce((sum, item) => sum + (getPrice(item) * item.quantity), 0);
    const grandTotal = subtotal + (shipping.visible ? shipping.value : 0) - (discount.visible ? discount.value : 0);
    const formatCurrency = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
    const hidePrices = docType === 'delivery' && paymentMethod === 'hidden';

    const getQRUrl = () => {
        const desc = `Thanh toan bao gia ${customer.quoteId || ''}`;
        if (paymentMethod === 'company') {
            return `https://img.vietqr.io/image/eximbank-211014851223910-compact2.png?amount=${grandTotal}&addInfo=${encodeURIComponent(desc)}&accountName=${encodeURIComponent('CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ BÍCH TRANG')}`;
        } else if (paymentMethod === 'personal') {
            return `https://img.vietqr.io/image/acb-862999888-compact2.png?amount=${grandTotal}&addInfo=${encodeURIComponent(desc)}&accountName=${encodeURIComponent('Nguyễn Xuân Thanh')}`;
        }
        return '';
    };

    const handleDownload = async () => {
        const btn = document.getElementById('dl-btn');
        const text = btn.innerHTML;
        btn.innerHTML = 'Exporting...';
        const filename = docType === 'quote' 
            ? `BaoGia_${customer.name || 'KhachHang'}.pdf` 
            : `BienBanGiaoHang_${customer.name || 'KhachHang'}.pdf`;
        await exportToPDF('quotation-container', filename);
        btn.innerHTML = text;
        confetti();
    };

    const handleSave = async () => {
        localStorage.setItem('desktop_quotation_notes', notes);
        
        // --- SYNC TO CRM LOGIC ---
        try {
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
            const supabaseUrl = 'https://zbnnctvggpupdnjmydcu.supabase.co';
            const supabaseKey = 'sb_publishable__Uc7k0lfdHFzBjWT-3o36w_ydCDXOT8';
            const supabase = createClient(supabaseUrl, supabaseKey);

            // Prepare product string: Name(Size-Qty)
            const productList = items.map(item => {
                const p = products.find(x => x.id === parseInt(item.productId));
                let name = p ? p.name : (item.customName || 'SP Khác');
                // Thêm ghi chú (màu sắc/bóng) vào sau tên sản phẩm
                if (item.note) {
                    name += ` (${item.note})`;
                }
                const price = getPrice(item);
                const total = price * (item.quantity || 1);
                return `${name}(${item.size}kg-${item.quantity}-${total})`;
            }).join(', ');

            const orderData = {
                id: `ORD-${Date.now()}`,
                quote_no: customer.quoteId,
                customer_name: customer.name || 'Khách Vãng Lai',
                customer_phone: customer.phone, // Mới
                customer_address: customer.address, // Mới
                amount: String(grandTotal),
                products: productList,
                status: 'quote',
                created_at: new Date().toISOString()
            };

            console.log('Sending data to CRM:', orderData);
            const { error } = await supabase.from('orders').upsert(orderData);
            
            if (error) {
                console.error('CRM Sync Error Detail:', error);
                alert('Lỗi Database: ' + error.message);
                return;
            }
            
            console.log('Synced to CRM successfully!');
        } catch (err) {
            console.error('CRM Sync Error:', err);
            alert('Lỗi kết nối: ' + err.message);
            return;
        }
        // -------------------------

        confetti();
        alert('Đã lưu và đồng bộ sang CRM thành công!');
    };

    return (
        <div className="container">
            <div id="quotation-container" className="app-container">
                {/* Document Type Selector (no-print) */}
                <div className="doc-type-selector no-print" style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '20px',
                    background: '#f8fafc',
                    padding: '6px',
                    borderRadius: '8px',
                    width: 'fit-content',
                    border: '1px solid #e2e8f0'
                }}>
                    <button 
                        type="button" 
                        onClick={() => setDocType('quote')}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: docType === 'quote' ? 'var(--primary)' : 'transparent',
                            color: docType === 'quote' ? 'white' : '#475569',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Báo Giá
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setDocType('delivery')}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: docType === 'delivery' ? 'var(--primary)' : 'transparent',
                            color: docType === 'delivery' ? 'white' : '#475569',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Biên Bản Giao Hàng
                    </button>
                </div>

                {/* Header Section */}
                <div className="header">
                    <div className="logo-container">
                        <img src={logoSrc} alt="Logo" style={{ height: '60px', mixBlendMode: 'multiply' }} />
                    </div>
                    <div className="company-info">
                        <div className="company-name">CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ BÍCH TRANG</div>
                        <div className="info-line">MST: 0313351528</div>
                        <div className="info-line">Đ/c: 99/5 Đường XTT26-1, Ấp 2, Xã Bà Điểm, TP.HCM</div>
                        <div className="info-line">Email: sales@sonlotus.vn | Hotline: 0943 966 662</div>
                        <div className="info-line">www.sonlotus.vn</div>
                    </div>
                </div>

                <div className="quotation-title">
                    {docType === 'quote' ? 'BÁO GIÁ SƠN LOTUS' : 'BIÊN BẢN GIAO HÀNG'}
                </div>
                <div className="date-line">
                    TP. HCM, ngày{' '}
                    <input 
                        type="text" 
                        value={today} 
                        onChange={(e) => setToday(e.target.value)} 
                        style={{
                            border: 'none',
                            borderBottom: '1px dashed #cbd5e0',
                            background: 'transparent',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            fontStyle: 'inherit',
                            color: 'inherit',
                            width: '90px',
                            textAlign: 'center',
                            outline: 'none',
                            padding: 0
                        }}
                    />
                </div>

                {/* Customer Section */}
                <div className="customer-section">
                    <div className="field-row">
                        <span className="label">TÊN KHÁCH HÀNG:</span>
                        <input 
                            type="text" 
                            value={customer.name} 
                            onChange={(e) => handleNameChange(e.target.value)} 
                            placeholder="........................................" 
                            list="customer-names-list"
                        />
                        <datalist id="customer-names-list">
                            {customerList.map((c, i) => <option key={i} value={c.name} />)}
                        </datalist>
                    </div>
                    <div className="field-row">
                        <span className="label">ĐỊA CHỈ GIAO HÀNG:</span>
                        <input 
                            type="text" 
                            value={customer.address} 
                            onChange={(e) => handleAddressChange(e.target.value)} 
                            placeholder="............................................................" 
                            list="customer-addresses-list"
                        />
                        <datalist id="customer-addresses-list">
                            {customerList.map((c, i) => <option key={i} value={c.address} />)}
                        </datalist>
                    </div>
                    <div className="split-row">
                        <div className="field-row">
                            <span className="label">SĐT:</span>
                            <input 
                                type="text" 
                                value={customer.phone} 
                                onChange={(e) => handlePhoneChange(e.target.value)} 
                                placeholder="................" 
                                list="customer-phones-list"
                            />
                            <datalist id="customer-phones-list">
                                {customerList.map((c, i) => <option key={i} value={c.phone} />)}
                            </datalist>
                        </div>
                        <div className="field-row right">
                            <span className="label">{docType === 'quote' ? 'SỐ BÁO GIÁ:' : 'SỐ BIÊN BẢN:'}</span>
                            <input type="text" value={customer.quoteId} onChange={(e) => setCustomer({...customer, quoteId: e.target.value})} placeholder="................" />
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="table-responsive">
                    <table className="quotation-table">
                        <thead>
                            <tr>
                                <th className="col-stt">STT</th>
                                <th className="col-name">TÊN SẢN PHẨM</th>
                                <th className="col-size">K.L/THÙNG (KG)</th>
                                <th className="col-unit">ĐVT</th>
                                {!hidePrices && <th className="col-price">ĐƠN GIÁ</th>}
                                <th className="col-qty">SL</th>
                                {!hidePrices && <th className="col-amount">THÀNH TIỀN</th>}
                                <th className="col-note">GHI CHÚ</th>
                                <th className="col-action no-print"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => {
                                const price = getPrice(item);
                                const selectedProduct = products.find(p => p.id === parseInt(item.productId));
                                const productName = selectedProduct ? selectedProduct.name : item.customName;
                                return (
                                    <tr key={item.id}>
                                        <td align="center">{index + 1}</td>
                                        <td className="product-cell">
                                            <input 
                                                type="text" 
                                                className="search-input no-print" 
                                                placeholder="Tìm sản phẩm..." 
                                                list={`p-${item.id}`} 
                                                value={productName}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const p = products.find(x => x.name === val);
                                                    if (p) updateItem(item.id, { productId: p.id, customName: '' });
                                                    else updateItem(item.id, { productId: '', customName: val });
                                                }}
                                            />
                                            <datalist id={`p-${item.id}`}>
                                                {products.map(p => <option key={p.id} value={p.name} />)}
                                            </datalist>
                                            <div className="display-name">{productName || "Chọn..."}</div>
                                        </td>
                                        <td align="center">
                                            <div className="clean-input center">
                                                {item.productId ? (
                                                    <select className="clean-input center" value={item.size} onChange={(e) => updateItem(item.id, 'size', e.target.value)} style={{ textAlignLast: 'center' }}>
                                                        {Object.keys(selectedProduct.p_prices).sort((a, b) => parseFloat(a) - parseFloat(b)).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                ) : (
                                                    <input className="clean-input center" type="text" value={item.size} onChange={(e) => updateItem(item.id, 'size', e.target.value)} />
                                                )}
                                            </div>
                                        </td>
                                        <td align="center">Thùng</td>
                                        {!hidePrices && (
                                            <td align="right">
                                                <div className="clean-input right">
                                                    {item.productId ? formatCurrency(price) : (
                                                        <input 
                                                            className="clean-input right" 
                                                            type="text" 
                                                            value={item.customPrice ? formatCurrency(item.customPrice).trim() : ''} 
                                                            onChange={(e) => updateItem(item.id, 'customPrice', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} 
                                                            style={{ padding: 0 }}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td align="center">
                                            <input className="clean-input center" type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                                        </td>
                                        {!hidePrices && <td align="right" className="amount">{formatCurrency(price * item.quantity)}</td>}
                                        <td>
                                            <input type="text" className="note-input" value={item.note} onChange={(e) => updateItem(item.id, 'note', e.target.value)} placeholder="" />
                                        </td>
                                        <td className="no-print" align="center">
                                            <button type="button" className="del-btn" onClick={() => removeItem(item.id)}><Trash2 size={12} /></button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {!hidePrices && shipping.visible && (
                                <tr className="cost-row">
                                    <td colSpan="2" className="label-cell">CHI PHÍ VẬN CHUYỂN</td>
                                    <td colSpan="4"></td>
                                    <td align="right" style={{ position: 'relative' }}>
                                        <div className="clean-input right">
                                            <input 
                                                className="clean-input right" 
                                                type="text" 
                                                value={shipping.value ? formatCurrency(shipping.value).trim() : ''} 
                                                onChange={(e) => setShipping({...shipping, value: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0})} 
                                                style={{ paddingRight: '0' }}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ borderRight: '1px solid #e2e8f0' }}>
                                        <input type="text" className="note-input clean-input" value={shipping.note} onChange={(e) => setShipping({...shipping, note: e.target.value})} placeholder="" style={{ fontWeight: 'normal', color: '#4a5568' }} />
                                    </td>
                                    <td colSpan="1" className="no-print"><button type="button" onClick={() => setShipping({...shipping, visible: false, value: 0})}>x</button></td>
                                </tr>
                            )}
                            {!hidePrices && discount.visible && (
                                <tr className="cost-row discount">
                                    <td colSpan="2" className="label-cell">GIẢM GIÁ</td>
                                    <td colSpan="4"></td>
                                    <td align="right">
                                        <div className="clean-input right">
                                            <input 
                                                className="clean-input right" 
                                                type="text" 
                                                value={discount.value ? '-' + formatCurrency(discount.value).trim() : ''} 
                                                onChange={(e) => setDiscount({...discount, value: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0})} 
                                                style={{ paddingRight: '0' }}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ borderRight: '1px solid #e2e8f0' }}>
                                        <input type="text" className="note-input clean-input" value={discount.note} onChange={(e) => setDiscount({...discount, note: e.target.value})} placeholder="" style={{ fontWeight: 'normal', color: '#4a5568' }} />
                                    </td>
                                    <td colSpan="1" className="no-print"><button type="button" onClick={() => setDiscount({...discount, visible: false, value: 0})}>x</button></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div className="btn-group no-print">
                        <button type="button" className="btn-add" onClick={addItem}><Plus size={14} /> Thêm sản phẩm</button>
                        {!hidePrices && !shipping.visible && (
                            <button type="button" className="btn-add btn-shipping" onClick={() => setShipping({...shipping, visible: true})}><Plus size={14} /> Thêm Vận Chuyển</button>
                        )}
                        {!hidePrices && !discount.visible && (
                            <button type="button" className="btn-add btn-discount" onClick={() => setDiscount({...discount, visible: true})}><Plus size={14} /> Thêm Giảm Giá</button>
                        )}
                    </div>
                </div>

                {/* Total */}
                {!hidePrices && (
                    <div className="total-section">
                        <span className="total-label">TỔNG THÀNH TIỀN:</span>
                        <span className="total-value">{formatCurrency(grandTotal)}</span>
                    </div>
                )}

                <div className="qr-selector-container no-print" style={{ 
                    marginTop: '25px',
                    marginBottom: '15px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px',
                    background: '#f8fafc',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#475569' }}>TÀI KHOẢN THANH TOÁN (QR CODE):</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            type="button" 
                            onClick={() => setPaymentMethod('company')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid #2563eb',
                                background: paymentMethod === 'company' ? '#2563eb' : 'white',
                                color: paymentMethod === 'company' ? 'white' : '#2563eb',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: paymentMethod === 'company' ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none'
                            }}
                        >
                            Công Ty (Eximbank)
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setPaymentMethod('personal')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid #059669',
                                background: paymentMethod === 'personal' ? '#059669' : 'white',
                                color: paymentMethod === 'personal' ? 'white' : '#059669',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: paymentMethod === 'personal' ? '0 2px 4px rgba(5, 150, 105, 0.2)' : 'none'
                            }}
                        >
                            Cá Nhân (ACB)
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setPaymentMethod('hidden')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid #64748b',
                                background: paymentMethod === 'hidden' ? '#64748b' : 'white',
                                color: paymentMethod === 'hidden' ? 'white' : '#64748b',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Ẩn QR Code
                        </button>
                    </div>
                </div>

                <div className="footer-section" style={{
                    display: 'grid',
                    gridTemplateColumns: paymentMethod !== 'hidden' ? '1.8fr 1.2fr 1fr' : '1.8fr 1fr',
                    gap: '40px',
                    marginTop: '10px'
                }}>
                    {docType === 'delivery' ? (
                        <div className="signature-area" style={{ textAlign: 'center' }}>
                            <div className="sig-title" style={{ fontWeight: 'bold', fontStyle: 'normal', color: '#4a5568', marginBottom: '80px' }}>Bên Nhận Hàng</div>
                            <div className="sig-name" style={{ borderTop: '1px dashed #cbd5e0', width: '150px', display: 'inline-block', paddingTop: '10px' }}></div>
                        </div>
                    ) : (
                        <div className="notes-container">
                            <div className="notes-title">Ghi chú:</div>
                            <textarea 
                                className="editable-notes-textarea no-print" 
                                style={{ 
                                    width: '100%', 
                                    border: '1px dashed #e2e8f0', 
                                    padding: '10px', 
                                    borderRadius: '4px', 
                                    minHeight: '80px', 
                                    outline: 'none',
                                    resize: 'none',
                                    fontSize: '13px',
                                    fontFamily: 'inherit',
                                    background: 'transparent'
                                }}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Nhập ghi chú tại đây..."
                            />
                            <div className="notes-display only-print" style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: '1.4' }}>
                                {notes}
                            </div>
                        </div>
                    )}

                    {paymentMethod !== 'hidden' && (
                        <div className="qr-code-section" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px',
                            background: '#f8fafc',
                            textAlign: 'center',
                            alignSelf: 'start'
                        }}>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                QUÉT MÃ QR THANH TOÁN
                            </div>
                            <img 
                                src={getQRUrl()} 
                                alt="QR Code" 
                                style={{ 
                                    width: '115px', 
                                    height: '115px', 
                                    objectFit: 'contain',
                                    mixBlendMode: 'multiply'
                                }} 
                            />
                            <div style={{ fontSize: '9px', color: '#475569', marginTop: '6px', lineHeight: '1.3', fontWeight: '500' }}>
                                <strong style={{ color: paymentMethod === 'company' ? '#2563eb' : '#059669' }}>
                                    {paymentMethod === 'company' ? 'EXIMBANK' : 'ACB'}
                                </strong><br />
                                STK: {paymentMethod === 'company' ? '211014851223910' : '862999888'}<br />
                                <span style={{ fontSize: '8px', color: '#64748b' }}>
                                    {paymentMethod === 'company' ? 'CÔNG TY TNHH SX TM DV BÍCH TRANG' : 'NGUYỄN XUÂN THANH'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="signature-area">
                        <div className="sig-title">
                            {docType === 'delivery' ? 'Bên Giao Hàng' : 'Đại Diện Kinh Doanh'}
                        </div>
                        <div className="sig-name" style={{ borderTop: '1px solid #cbd5e0', width: '180px', display: 'inline-block', paddingTop: '10px', whiteSpace: 'nowrap' }}>
                            {docType === 'delivery' ? '' : 'NGUYỄN XUÂN THANH'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="floating-actions no-print">
                <button type="button" id="dl-btn" className="fab fab-blue" onClick={handleDownload}><Download size={24} /> <span>PDF</span></button>
                <button type="button" className="fab fab-red" onClick={() => window.print()}><Printer size={24} /> <span>In</span></button>
                <button type="button" className="fab fab-green" onClick={handleSave}><Save size={24} /> <span>Lưu</span></button>
            </div>
        </div>
    );
};

export default DesktopApp;
