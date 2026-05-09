import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, User, Camera, Settings } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import productData from '../data/products.json';
import '../styles/mobile.css';
import confetti from 'canvas-confetti';
import logoSrc from '../assets/logo.png';

const StaffMobileApp = () => {
    const defaultItem = { productId: '', customName: '' };
    const products = productData.products;

    // Staff state
    const [staff, setStaff] = useState(() => {
        const saved = localStorage.getItem('staff_profile');
        return saved ? JSON.parse(saved) : { fullName: '', phone: '' };
    });
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(!staff.fullName);

    const [items, setItems] = useState([{ ...defaultItem, id: 1 }]);
    const [searchQuery, setSearchQuery] = useState({});

    // Auto-save profile
    useEffect(() => {
        localStorage.setItem('staff_profile', JSON.stringify(staff));
    }, [staff]);

    // Dynamic scale
    const getScaleStyle = () => {
        if (items.length <= 2) return { title: '24px', name: '18px', price: '16px' };
        if (items.length <= 4) return { title: '20px', name: '16px', price: '14px' };
        return { title: '18px', name: '14px', price: '12px' };
    };
    const scale = getScaleStyle();

    const addItem = () => setItems([...items, { ...defaultItem, id: Date.now() }]);
    const removeItem = (id) => items.length > 1 && setItems(items.filter(item => item.id !== id));
    
    const updateItem = (id, fieldOrFields, value) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                let updated = { ...item };
                if (typeof fieldOrFields === 'object') updated = { ...updated, ...fieldOrFields };
                else updated = { ...updated, [fieldOrFields]: value };
                return updated;
            }
            return item;
        }));
    };

    const formatCurrency = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

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

    const handleExportImage = async () => {
        const element = document.getElementById('mobile-container');
        const actionBtn = document.getElementById('export-btn-container');
        const footerInfo = document.getElementById('export-only-footer');
        const staffHeader = document.getElementById('staff-header-mobile');
        
        actionBtn.style.opacity = '0';
        footerInfo.style.display = 'flex';
        staffHeader.style.display = 'none';

        try {
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const clonedNoExports = clonedDoc.querySelectorAll('.no-export');
                    clonedNoExports.forEach(el => el.style.display = 'none');
                    
                    const container = clonedDoc.getElementById('mobile-container');
                    container.style.width = '420px';
                    container.style.padding = '25px';
                    container.style.backgroundColor = '#ffffff';
                }
            });

            const link = document.createElement('a');
            link.download = `BaoGia_Lotus_${format(new Date(), 'ddMMyy_HHmm')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            confetti();
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            actionBtn.style.opacity = '1';
            footerInfo.style.display = 'none';
            staffHeader.style.display = 'flex';
        }
    };

    return (
        <div className="mobile-app">
            {/* Staff Header */}
            <div id="staff-header-mobile" style={{
                background: '#1e293b',
                color: 'white',
                padding: '10px 15px',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} />
                    <span>Sales: {staff.fullName || 'Chưa cập nhật'}</span>
                </div>
                <button onClick={() => setIsProfileModalOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>
                    Cài đặt
                </button>
            </div>

            <header className="mobile-header">
                <img src={logoSrc} className="mobile-logo" alt="Lotus Paint" />
                <div className="mobile-title-container">
                    <div className="mobile-title">LOTUS PAINT</div>
                    <Link to="/team-quote" style={{ fontSize: '10px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>SANG BẢN MÁY TÍNH →</Link>
                </div>
            </header>

            <motion.div 
                id="mobile-container" 
                className="mobile-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="m-section-title" style={{ marginTop: '10px', fontSize: scale.title, color: '#1e293b', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    BÁO GIÁ SƠN LOTUS
                </div>

                <AnimatePresence>
                    {items.map((item, index) => {
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
                            style={{ padding: items.length > 4 ? '12px' : '16px' }}
                        >
                            <div className="m-item-header" style={{ marginBottom: '8px' }}>
                                <span className="m-item-index" style={{ width: '20px', height: '20px', fontSize: '11px' }}>{index + 1}</span>
                                {items.length > 1 && (
                                    <button className="m-item-delete no-export" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                                )}
                            </div>
                            
                            <div className="m-input-group no-export" style={{ position: 'relative', marginBottom: '8px' }}>
                                <label style={{ fontSize: '10px' }}>CHỌN LOẠI SƠN</label>
                                <input 
                                    className="m-input" 
                                    type="text" 
                                    placeholder="Tìm sơn..." 
                                    value={query || productName}
                                    style={{ padding: '8px 12px', fontSize: '13px' }}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        handleSearch(item.id, val);
                                        if (!val) clearSelection(item.id);
                                    }}
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

                            {!query && productName && (
                                <div className="p-name-static" style={{ fontWeight: '800', fontSize: scale.name, color: '#1A365D', marginBottom: '10px' }}>
                                    {productName}
                                </div>
                            )}

                            {selectedProduct && (
                                <div className="m-price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {Object.entries(selectedProduct.p_prices)
                                        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
                                        .map(([size, price]) => (
                                        <div key={size} style={{ background: '#f8fafc', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{size}Kg</div>
                                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#2563eb' }}>{formatCurrency(price).replace('₫', '').trim()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
                </AnimatePresence>

                <button className="m-btn-add no-export" onClick={addItem} style={{ background: '#eff6ff', padding: '10px', fontSize: '13px' }}>
                    <Plus size={16} /> Thêm loại sơn khác
                </button>

                <div id="export-only-footer" style={{ 
                    display: 'none', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '15px', 
                    borderTop: '1px dashed #cbd5e0', 
                    marginTop: '20px',
                    color: '#64748b',
                    fontSize: '11px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>ĐẠI DIỆN KINH DOANH: {staff.fullName.toUpperCase()}</div>
                    <div>Hotline: {staff.phone || '0943 966 662'} | www.sonlotus.vn</div>
                </div>
            </motion.div>

            {/* Profile Modal */}
            {isProfileModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '350px' }}>
                        <h3 style={{ marginTop: 0 }}>Thông tin nhân viên</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input 
                                type="text" 
                                placeholder="Họ và tên..." 
                                value={staff.fullName} 
                                onChange={(e) => setStaff({...staff, fullName: e.target.value})}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                            />
                            <input 
                                type="text" 
                                placeholder="Số điện thoại..." 
                                value={staff.phone} 
                                onChange={(e) => setStaff({...staff, phone: e.target.value})}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                            />
                            <button 
                                onClick={() => staff.fullName && setIsProfileModalOpen(false)}
                                style={{ background: '#2563eb', color: 'white', padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none' }}
                            >
                                Lưu và bắt đầu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div id="export-btn-container" style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', zIndex: 1000 }}>
                <button onClick={handleExportImage} style={{ width: '100%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '16px', padding: '16px', fontWeight: '800', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)' }}>
                    <Camera size={20} /> XUẤT ẢNH BÁO GIÁ
                </button>
            </div>
        </div>
    );
};

export default StaffMobileApp;
