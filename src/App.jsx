import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Printer, Save, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import productData from './data/products.json';
import { exportToPDF } from './utils/pdfGenerator';
import './styles/index.css';
import confetti from 'canvas-confetti';
import logoSrc from './assets/logo.png';

const App = () => {
    // ... rest of the App ...
    const defaultItem = { productId: '', size: '5', quantity: 1, note: '' };
    const getAbbreviation = (name) => {
        if (!name) return 'XYZ';
        // Remove Vietnamese accents to get clean abbreviations
        const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        return cleanName
            .trim()
            .split(/\s+/)
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ''); // Keep only alphanumeric
    };

    const generateQuoteId = (name) => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const xyz = getAbbreviation(name);
        return `${dd}${mm}/BBG/${xyz}-BT`;
    };

    const [customer, setCustomer] = useState({
        name: '',
        quoteId: generateQuoteId(''),
        address: '',
        phone: ''
    });

    const [shipping, setShipping] = useState({ value: 0, note: '', visible: true });
    const [discount, setDiscount] = useState({ value: 0, note: '', visible: true });


    const [items, setItems] = useState([
        { id: 1, productId: '', size: '1', quantity: 1, note: '' }
    ]);
    const [today, setToday] = useState(format(new Date(), 'dd/MM/yyyy'));

    const products = productData.products;

    const addItem = () => {
        setItems([...items, { ...defaultItem, id: Date.now() }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                
                // If product changes, set default size to the first available size in prices
                if (field === 'productId' && value) {
                    const product = products.find(p => p.id === parseInt(value));
                    if (product) {
                        const sizes = Object.keys(product.p_prices);
                        if (sizes.length > 0) {
                            updated.size = sizes[0];
                        }
                    }
                }
                return updated;
            }
            return item;
        }));
    };

    const getPrice = (productId, size) => {
        const product = products.find(p => p.id === parseInt(productId));
        return product ? product.p_prices[size] || 0 : 0;
    };

    // Helper to get sizes for a product
    const getAvailableSizes = (productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        return product ? Object.keys(product.p_prices) : ['1', '5', '20'];
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => {
            const price = getPrice(item.productId, item.size);
            return sum + (price * item.quantity);
        }, 0);
    };

    const subtotal = calculateSubtotal();
    // Since prices already include VAT per the footer note, we don't need to add it again
    const grandTotal = subtotal + (shipping.visible ? shipping.value : 0) - (discount.visible ? discount.value : 0);


    const formatCurrency = (num) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
    };

    const saveData = () => {
        const data = {
            customer,
            items,
            shipping,
            discount,
            date: today,
            grandTotal: grandTotal

        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `BaoGia_${customer.name || 'KhachHang'}_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        confetti();
    };

    const handleDownload = async () => {
        const btn = document.getElementById('dl-btn');
        btn.innerHTML = 'Exporting...';
        btn.style.opacity = '0.5';
        await exportToPDF('quotation-container', `BaoGia_${customer.name || 'KhachHang'}.pdf`);
        btn.innerHTML = '<Download /> Export PDF';
        btn.style.opacity = '1';
        confetti();
    };

    return (
        <div className="container">
            <div id="quotation-container" className="app-container">
                {/* Header Section - Logo & Company Info */}
                <div className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px'}}>
                    <div className="logo-container">
                        <img 
                            src={logoSrc} 
                            alt="Logo" 
                            style={{
                                height: '70px', 
                                width: 'auto',
                                objectFit: 'contain', 
                                mixBlendMode: 'multiply' // Makes white background transparent
                            }} 
                        />
                    </div>
                    <div className="company-info" style={{textAlign: 'right', fontSize: '10px'}}>
                        <div className="company-name" style={{fontWeight: 'bold', color: '#2F855A', fontSize: '11px'}}>CÔNG TY TNHH SX TM DV BÍCH TRANG</div>
                        <div>MST: 0313351528 | Hotline: 0943 966 662</div>
                        <div>Đ/c: 99/5 Đường XTT26-1, Hóc Môn, TP.HCM</div>
                        <div>https://jades.vn | Email: sales@sonlotus.vn</div>
                    </div>
                </div>

                <div className="quotation-title" style={{fontSize: '22px', fontWeight: '900', textAlign: 'center', margin: '15px 0', color: '#1A365D', letterSpacing: '1px'}}>
                    BÁO GIÁ SƠN LOTUS
                </div>

                <div style={{textAlign: 'right', fontStyle: 'italic', marginBottom: '10px', color: '#4a5568'}}>
                    TP. HCM, ngày {today}
                </div>

                {/* Customer Section - Sophisticated Layout */}
                <div className="customer-section" style={{marginBottom: '15px', borderBottom: '1px solid #cbd5e0', paddingBottom: '8px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'flex-baseline'}}>
                            <span style={{fontWeight: '700', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>Tên khách hàng:</span>
                            <input 
                                type="text" 
                                placeholder=".........................................................."
                                value={customer.name}
                                style={{border: 'none', background: 'transparent', width: '100%', fontWeight: '900', color: '#1A365D', padding: 0}}
                                onChange={(e) => setCustomer({...customer, name: e.target.value})}
                            />
                        </div>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'flex-baseline'}}>
                            <span style={{fontWeight: '700', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>Địa chỉ giao hàng:</span>
                            <input 
                                type="text" 
                                placeholder="...................................................................................................................."
                                value={customer.address}
                                style={{border: 'none', background: 'transparent', width: '100%', color: '#1A365D', padding: 0}}
                                onChange={(e) => setCustomer({...customer, address: e.target.value})}
                            />
                        </div>
                        <div style={{display: 'flex', gap: '20px'}}>
                            <div style={{display: 'flex', gap: '8px', alignItems: 'flex-baseline'}}>
                                <span style={{fontWeight: '700', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>SĐT:</span>
                                <input 
                                    type="text" 
                                    placeholder="................"
                                    value={customer.phone}
                                    style={{border: 'none', background: 'transparent', width: '150px', color: '#1A365D', padding: 0}}
                                    onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                                />
                            </div>
                            <div style={{display: 'flex', gap: '8px', alignItems: 'flex-baseline', marginLeft: 'auto'}}>
                                <span style={{fontWeight: '700', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>Số báo giá:</span>
                                <input 
                                    type="text"
                                    value={customer.quoteId}
                                    style={{border: 'none', background: 'transparent', fontWeight: 'bold', color: '#1A365D', width: '150px', padding: 0}}
                                    onChange={(e) => setCustomer({...customer, quoteId: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Section - Principal Area */}
                <div className="table-section" style={{marginBottom: '10px'}}>
                    <table>
                        <thead>
                            <tr>
                                <th width="35">STT</th>
                                <th style={{textAlign: 'left', paddingLeft: '15px'}}>Tên sản phẩm</th>
                                <th width="80">K.Lượng (Kg)</th>
                                <th width="60">ĐVT</th>
                                <th width="110">Đơn Giá</th>
                                <th width="50">SL</th>
                                <th width="125">Thành tiền</th>
                                <th width="100">Ghi chú</th>
                                <th className="no-print" width="30"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => {
                                const price = getPrice(item.productId, item.size);
                                const amount = price * item.quantity;
                                const selectedProduct = products.find(p => p.id === parseInt(item.productId));
                                const productName = selectedProduct?.name || '';
                                return (
                                    <tr key={item.id}>
                                        <td align="center">{index + 1}</td>
                                        <td style={{padding: '3px 15px', verticalAlign: 'top', borderRight: 'none'}}>
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '1px'}}>
                                                <input 
                                                    type="text"
                                                    className="product-search no-print"
                                                    placeholder="Gõ tìm sản phẩm..."
                                                    list={`list-${item.id}`}
                                                    value={productName}
                                                    onChange={(e) => {
                                                        const selected = products.find(p => p.name === e.target.value);
                                                        if (selected) updateItem(item.id, 'productId', selected.id);
                                                    }}
                                                    style={{width: '100%', border: 'none', borderBottom: '1px dashed #cbd5e0', padding: '0', height: '18px'}}
                                                />
                                                <div style={{fontWeight: '700', lineHeight: '1.2', color: '#1a365d', wordBreak: 'break-word', whiteSpace: 'normal', display: 'block'}}>
                                                    {productName || (<span className="no-print" style={{color: '#a0aec0', fontWeight: '400'}}>Chưa chọn...</span>)}
                                                </div>
                                            </div>
                                            <datalist id={`list-${item.id}`}>
                                                {products.map(p => (<option key={p.id} value={p.name} />))}
                                            </datalist>
                                        </td>
                                        <td style={{borderLeft: 'none'}}>
                                            <select 
                                                className="product-select"
                                                value={item.size}
                                                onChange={(e) => updateItem(item.id, 'size', e.target.value)}
                                                style={{border: 'none', background: 'transparent'}}
                                            >
                                                {getAvailableSizes(item.productId).map(s => (<option key={s} value={s}>{s}</option>))}
                                            </select>
                                        </td>
                                        <td align="center">Thùng</td>
                                        <td align="right" style={{color: '#2d3748'}}>{formatCurrency(price)}</td>
                                        <td align="center">
                                            <input type="number" className="number-input" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} style={{textAlign: 'center'}} />
                                        </td>
                                        <td align="right" style={{fontWeight: 'bold', color: '#1A365D'}}>{formatCurrency(amount)}</td>
                                        <td>
                                            <input type="text" className="number-input" placeholder="..." value={item.note} onChange={(e) => updateItem(item.id, 'note', e.target.value)} style={{textAlign: 'left'}} />
                                        </td>
                                        <td className="no-print" align="center">
                                            <button className="remove-btn" onClick={() => removeItem(item.id)}><Trash2 size={12} /></button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {/* Shipping Cost Row */}
                            {shipping.visible && (
                                <tr className="shipping-row">
                                    <td colSpan="2" align="right" style={{paddingRight: '15px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase'}}>CHI PHÍ VẬN CHUYỂN</td>
                                    <td colSpan="4"></td>
                                    <td align="right">
                                        <input 
                                            type="text" 
                                            className="number-input" 
                                            style={{textAlign: 'right', fontWeight: 'bold', border: 'none', background: 'transparent', width: '100%', color: '#1A365D'}} 
                                            value={shipping.value > 0 ? shipping.value.toLocaleString('vi-VN') : ''} 
                                            onChange={(e) => setShipping({...shipping, value: parseInt(e.target.value.replace(/\D/g, '')) || 0})} 
                                        />
                                    </td>
                                    <td>
                                        <input type="text" className="number-input" placeholder="..." value={shipping.note} onChange={(e) => setShipping({...shipping, note: e.target.value})} style={{textAlign: 'left'}} />
                                    </td>
                                    <td className="no-print" align="center">
                                        <button className="remove-btn" onClick={() => setShipping({...shipping, visible: false, value: 0})} title="Xoá vận chuyển"><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            )}

                            {/* Discount Row */}
                            {discount.visible && (
                                <tr className="discount-row">
                                    <td colSpan="2" align="right" style={{paddingRight: '15px', color: '#E53E3E', fontWeight: '700', textTransform: 'uppercase'}}>GIẢM GIÁ (Trừ vào tổng)</td>
                                    <td colSpan="4"></td>
                                    <td align="right">
                                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#E53E3E', fontWeight: 'bold'}}>
                                            <span>-</span>
                                            <input 
                                                type="text" 
                                                className="number-input" 
                                                style={{textAlign: 'right', fontWeight: 'bold', border: 'none', background: 'transparent', width: '90%', color: '#E53E3E'}} 
                                                value={discount.value > 0 ? discount.value.toLocaleString('vi-VN') : ''} 
                                                onChange={(e) => setDiscount({...discount, value: parseInt(e.target.value.replace(/\D/g, '')) || 0})} 
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <input type="text" className="number-input" placeholder="..." value={discount.note} onChange={(e) => setDiscount({...discount, note: e.target.value})} style={{textAlign: 'left'}} />
                                    </td>
                                    <td className="no-print" align="center">
                                        <button className="remove-btn" onClick={() => setDiscount({...discount, visible: false, value: 0})} title="Xoá giảm giá"><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            )}

                        </tbody>
                    </table>
                    <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
                        <button className="btn btn-success no-print" onClick={addItem} style={{padding: '5px 15px'}}>
                            <Plus size={14} /> Thêm sản phẩm
                        </button>
                        {!shipping.visible && (
                            <button className="btn no-print" onClick={() => setShipping({...shipping, visible: true})} style={{padding: '5px 15px', background: '#e2e8f0', color: '#475569', fontSize: '12px', fontWeight: '600'}}>
                                <Plus size={12} /> Thêm Vận Chuyển
                            </button>
                        )}
                        {!discount.visible && (
                            <button className="btn no-print" onClick={() => setDiscount({...discount, visible: true})} style={{padding: '5px 15px', background: '#fed7d7', color: '#c53030', fontSize: '12px', fontWeight: '600'}}>
                                <Plus size={12} /> Thêm Giảm Giá
                            </button>
                        )}
                    </div>

                </div>

                {/* Summary Section - Premium UI */}
                <div className="summary-section">
                    <div className="total-row">
                        <span className="total-label" style={{fontSize: '16px'}}>TỔNG THÀNH TIỀN:</span>
                        <span className="total-value" style={{fontSize: '20px', marginLeft: '10px'}}>{formatCurrency(grandTotal)}</span>
                    </div>

                </div>

                {/* Footer Notes - Formal Styling */}
                <div className="footer-section" style={{marginTop: '20px'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px'}}>
                        <div>
                            <p style={{fontWeight: 'bold', textDecoration: 'underline'}}>Ghi chú:</p>
                            <div 
                                contentEditable 
                                className="editable-notes"
                                style={{
                                    marginTop: '10px',
                                    outline: 'none',
                                    lineHeight: '1.6',
                                    color: '#475569'
                                }}
                                dangerouslySetInnerHTML={{ __html: `
                                    <div style="margin-bottom: 5px">- Giá trị đã bao gồm VAT. Miễn phí vận chuyển cho đơn hàng từ 10 triệu đồng</div>
                                    <div style="margin-bottom: 5px">- Thời gian giao hàng: 2-3 ngày kể từ ngày xác nhận đơn hàng</div>
                                    <div style="margin-bottom: 5px">- Thanh toán: Chuyển khoản 100% trước khi xuất hàng</div>
                                    <div style="font-weight: bold; margin-top: 5px">Số tài khoản: 211014851223910 - Ngân hàng Eximbank - CN TP.HCM</div>
                                `}}
                            />
                        </div>
                        <div style={{textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '5px'}}>
                            <div style={{fontStyle: 'italic', color: '#64748b', marginBottom: '60px'}}>Đại diện công ty Bích Trang</div>
                            <div style={{fontWeight: '900', textTransform: 'uppercase', color: '#1A365D'}}>Nguyễn Xuân Thanh</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Float Action Buttons */}
            <div className="action-buttons">
                <button id="dl-btn" className="btn btn-primary" onClick={handleDownload}>
                    <Download size={20} /> Export PDF
                </button>
                <button className="btn btn-danger" onClick={() => window.print()}>
                    <Printer size={20} /> In báo giá
                </button>
                <button className="btn btn-success" onClick={() => {
                    saveData();
                    alert('Dữ liệu đã được xuất thành file JSON và lưu vào máy tính của bạn!');
                }}>
                    <Save size={20} /> Lưu dữ liệu
                </button>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                    .app-container { box-shadow: none; border: none; padding: 0; margin: 0; width: 100% !important;}
                    .container { padding: 0; }
                    .action-buttons { display: none; }
                    select, input { border: none !important; appearance: none; -webkit-appearance: none; }
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                }
            `}</style>
        </div>
    );
};

export default App;
