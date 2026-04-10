import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Download, Printer, Save, Search, X, User, MapPin, Phone, FileText, ShoppingBag, Package, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import productData from '../data/products.json';
import { exportToPDF } from '../utils/pdfGenerator';
import '../styles/mobile.css';
import confetti from 'canvas-confetti';
import logoSrc from '../assets/logo.png';

const MobileApp = () => {
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
    const [searchQuery, setSearchQuery] = useState({});

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
        await exportToPDF('mobile-container', `BaoGia_Mobile_${customer.name || 'KhachHang'}.pdf`);
        confetti();
    };

    const handleSearch = (itemId, query) => {
        setSearchQuery({ ...searchQuery, [itemId]: query });
    };

    const clearSelection = (itemId) => {
        updateItem(itemId, { productId: '', customName: '' });
        setSearchQuery({ ...searchQuery, [itemId]: '' });
    };

    const selectProduct = (itemId, product) => {
        updateItem(itemId, { productId: product.id, customName: product.name });
        setSearchQuery({ ...searchQuery, [itemId]: '' });
    };

    return (
        <div className="mobile-app">
            <header className="mobile-header">
                <img src={logoSrc} className="mobile-logo" alt="Lotus Paint" />
                <div className="mobile-title-container">
                    <div className="mobile-title">Báo Giá Mobile</div>
                    <Link to="/" style={{ fontSize: '10px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>SANG BẢN DESKTOP →</Link>
                </div>
            </header>

            <motion.div 
                id="mobile-container" 
                className="mobile-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Customer Info Card */}
                <motion.div 
                    className="m-card"
                    whileHover={{ scale: 1.01 }}
                >
                    <div className="m-section-title"><User size={16} /> Thông tin khách hàng</div>
                    <div className="m-input-group">
                        <label>TÊN KHÁCH HÀNG</label>
                        <input className="m-input" type="text" value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} placeholder="Nhập tên..." />
                    </div>
                    <div className="m-input-group">
                        <label>ĐỊA CHỈ</label>
                        <input className="m-input" type="text" value={customer.address} onChange={(e) => setCustomer({...customer, address: e.target.value})} placeholder="Nhập địa chỉ..." />
                    </div>
                    <div className="m-item-row">
                        <div className="m-input-group">
                            <label>SĐT</label>
                            <input className="m-input" type="text" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} placeholder="09..." />
                        </div>
                        <div className="m-input-group">
                            <label>SỐ BÁO GIÁ</label>
                            <input className="m-input" type="text" value={customer.quoteId} onChange={(e) => setCustomer({...customer, quoteId: e.target.value})} />
                        </div>
                    </div>
                </motion.div>

                {/* Items List */}
                <div className="m-section-title"><ShoppingBag size={16} /> Danh sách sản phẩm</div>
                <AnimatePresence>
                    {items.map((item, index) => {
                    const price = getPrice(item);
                    const selectedProduct = products.find(p => p.id === parseInt(item.productId));
                    const productName = selectedProduct ? selectedProduct.name : item.customName;
                    const query = searchQuery[item.id] || '';
                    const filteredProducts = query ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];

                    return (
                        <motion.div 
                            key={item.id} 
                            className="m-card m-item-card"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, x: -20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                            <div className="m-item-header">
                                <span className="m-item-index">{index + 1}</span>
                                <button className="m-item-delete" onClick={() => removeItem(item.id)}><Trash2 size={18} /></button>
                            </div>
                            
                            <div className="m-input-group" style={{ position: 'relative' }}>
                                <label>SẢN PHẨM</label>
                                <input 
                                    className="m-input" 
                                    type="text" 
                                    placeholder="Tìm hoặc nhập tên..." 
                                    value={query || productName}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        handleSearch(item.id, val);
                                        if (!val) clearSelection(item.id);
                                    }}
                                    onBlur={() => setTimeout(() => handleSearch(item.id, ''), 200)}
                                />
                                {filteredProducts.length > 0 && (
                                    <div className="m-search-results">
                                        {filteredProducts.map(p => (
                                            <div key={p.id} className="m-search-item" onMouseDown={() => selectProduct(item.id, p)}>
                                                {p.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="m-item-row">
                                <div className="m-input-group">
                                    <label>SIZE</label>
                                    {item.productId ? (
                                        <select className="m-input" value={item.size} onChange={(e) => updateItem(item.id, 'size', e.target.value)}>
                                            {Object.keys(selectedProduct.p_prices).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <input className="m-input" type="text" value={item.size} onChange={(e) => updateItem(item.id, 'size', e.target.value)} />
                                    )}
                                </div>
                                <div className="m-input-group">
                                    <label>SỐ LƯỢNG</label>
                                    <input className="m-input" type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>

                            <div className="m-input-group">
                                <label>GHI CHÚ</label>
                                <input className="m-input" type="text" value={item.note} onChange={(e) => updateItem(item.id, 'note', e.target.value)} placeholder="..." />
                            </div>

                            {!item.productId && (
                                <div className="m-input-group">
                                    <label>ĐƠN GIÁ TỰ NHẬP</label>
                                    <input className="m-input" type="number" value={item.customPrice || ''} onChange={(e) => updateItem(item.id, 'customPrice', parseInt(e.target.value) || 0)} />
                                </div>
                            )}

                            <div className="m-item-total">
                                <span className="m-item-total-label">Thành tiền:</span>
                                <span className="m-item-total-value">{formatCurrency(price * item.quantity)}</span>
                            </div>
                        </motion.div>
                    );
                })}
                </AnimatePresence>

                <button className="m-btn-add" onClick={addItem}>
                    <Plus size={20} /> Thêm sản phẩm
                </button>

                {/* Additional Costs */}
                <div className="m-card">
                    <div className="m-section-title"><Package size={16} /> Chi phí khác</div>
                    <div className="m-input-group">
                        <label>VẬN CHUYỂN</label>
                        <input className="m-input" type="number" value={shipping.value || ''} onChange={(e) => setShipping({...shipping, value: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="m-input-group">
                        <label>GIẢM GIÁ</label>
                        <input className="m-input" type="number" value={discount.value || ''} onChange={(e) => setDiscount({...discount, value: parseInt(e.target.value) || 0})} />
                    </div>
                </div>

                {/* Summary */}
                <div className="m-card m-summary">
                    <div className="m-summary-row">
                        <span>Tạm tính:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {shipping.value > 0 && (
                        <div className="m-summary-row">
                            <span>Vận chuyển:</span>
                            <span>+{formatCurrency(shipping.value)}</span>
                        </div>
                    )}
                    {discount.value > 0 && (
                        <div className="m-summary-row">
                            <span>Giảm giá:</span>
                            <span>-{formatCurrency(discount.value)}</span>
                        </div>
                    )}
                    <div className="m-summary-total">
                        <span className="m-summary-total-label">TỔNG CỘNG:</span>
                        <span className="m-summary-total-value">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </motion.div>

            {/* Bottom Actions */}
            <div className="m-actions">
                <button className="m-action-btn primary" onClick={handleDownload}>
                    <div className="icon-bg"><Download size={22} /></div>
                    XUẤT PDF
                </button>
                <button className="m-action-btn success" onClick={() => confetti()}>
                    <div className="icon-bg"><Save size={22} /></div>
                    LƯU
                </button>
                <button className="m-action-btn danger" onClick={() => window.print()}>
                    <div className="icon-bg"><Printer size={22} /></div>
                    IN
                </button>
            </div>
        </div>
    );
};

export default MobileApp;
