import React, { useState, useEffect } from 'react';
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

    const [customer, setCustomer] = useState({
        name: '',
        quoteId: '',
        address: '',
        phone: ''
    });

    const [shipping, setShipping] = useState({ value: 0, note: '', visible: true });
    const [discount, setDiscount] = useState({ value: 0, note: '', visible: true });
    const [items, setItems] = useState([{ ...defaultItem, id: 1 }]);
    const [today, setToday] = useState(format(new Date(), 'dd/MM/yyyy'));

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

    const handleDownload = async () => {
        const btn = document.getElementById('dl-btn');
        const text = btn.innerHTML;
        btn.innerHTML = 'Exporting...';
        await exportToPDF('quotation-container', `BaoGia_${customer.name || 'KhachHang'}.pdf`);
        btn.innerHTML = text;
        confetti();
    };

    return (
        <div className="container">
            <div id="quotation-container" className="app-container">
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

                <div className="quotation-title">BÁO GIÁ SƠN LOTUS</div>
                <div className="date-line">TP. HCM, ngày {today}</div>

                {/* Customer Section */}
                <div className="customer-section">
                    <div className="field-row">
                        <span className="label">TÊN KHÁCH HÀNG:</span>
                        <input type="text" value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} placeholder="........................................" />
                    </div>
                    <div className="field-row">
                        <span className="label">ĐỊA CHỈ GIAO HÀNG:</span>
                        <input type="text" value={customer.address} onChange={(e) => setCustomer({...customer, address: e.target.value})} placeholder="............................................................" />
                    </div>
                    <div className="split-row">
                        <div className="field-row">
                            <span className="label">SĐT:</span>
                            <input type="text" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} placeholder="................" />
                        </div>
                        <div className="field-row right">
                            <span className="label">SỐ BÁO GIÁ:</span>
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
                                <th className="col-price">ĐƠN GIÁ</th>
                                <th className="col-qty">SL</th>
                                <th className="col-amount">THÀNH TIỀN</th>
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
                                                {item.productId ? selectedProduct.p_prices[item.size] && item.size : (
                                                    <input className="clean-input center" type="text" value={item.size} onChange={(e) => updateItem(item.id, 'size', e.target.value)} />
                                                )}
                                            </div>
                                        </td>
                                        <td align="center">Thùng</td>
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
                                        <td align="center">
                                            <input className="clean-input center" type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                                        </td>
                                        <td align="right" className="amount">{formatCurrency(price * item.quantity)}</td>
                                        <td>
                                            <input type="text" className="note-input" value={item.note} onChange={(e) => updateItem(item.id, 'note', e.target.value)} placeholder="" />
                                        </td>
                                        <td className="no-print" align="center">
                                            <button className="del-btn" onClick={() => removeItem(item.id)}><Trash2 size={12} /></button>
                                        </td>
                                    </tr>
                                )
                            })}
                             {/* Costs */}
                             {shipping.visible && (
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
                                    <td colSpan="1" className="no-print"><button onClick={() => setShipping({...shipping, visible: false, value: 0})}>x</button></td>
                                </tr>
                            )}
                            {discount.visible && (
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
                                    <td colSpan="1" className="no-print"><button onClick={() => setDiscount({...discount, visible: false, value: 0})}>x</button></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div className="btn-group no-print">
                        <button className="btn-add" onClick={addItem}><Plus size={14} /> Thêm sản phẩm</button>
                    </div>
                </div>

                {/* Total */}
                <div className="total-section">
                    <span className="total-label">TỔNG THÀNH TIỀN:</span>
                    <span className="total-value">{formatCurrency(grandTotal)}</span>
                </div>

                <div className="footer-section">
                    <div className="notes-container">
                        <div className="notes-title">Ghi chú (Anh/Chị có thể bôi đen chữ để chỉnh Đậm/Nghiêng):</div>
                        <div className="editable-notes" 
                            style={{ border: '1px dashed #e2e8f0', padding: '10px', borderRadius: '4px', minHeight: '60px' }}
                            contentEditable 
                            dangerouslySetInnerHTML={{ __html: `
                            - Thời gian giao hàng: 2-3 ngày kể từ ngày xác nhận đơn hàng<br/>
                            - Thanh toán: Đặt cọc 50% đối với các đơn hàng từ 10 triệu đồng. Thanh toán 100% trước khi giao hàng<br/>
                            <b>STK: 211014851223910 - Ngân hàng Eximbank - CN TP.HCM - CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ BÍCH TRANG</b><br/>
                            <b>STK: 862 999 888 - ACB - Nguyễn Xuân Thanh</b>
                        `}} />
                    </div>
                    <div className="signature-area">
                        <div className="sig-title">Đại Diện Kinh Doanh</div>
                        <div className="sig-name">NGUYỄN XUÂN THANH</div>
                    </div>
                </div>
            </div>

            <div className="floating-actions no-print">
                <button id="dl-btn" className="fab fab-blue" onClick={handleDownload}><Download size={24} /> <span>PDF</span></button>
                <button className="fab fab-red" onClick={() => window.print()}><Printer size={24} /> <span>In</span></button>
                <button className="fab fab-green" onClick={() => confetti()}><Save size={24} /> <span>Lưu</span></button>
            </div>
        </div>
    );
};

export default DesktopApp;
