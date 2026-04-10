import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Download, Printer, Save, Search, X, User, MapPin, Phone, FileText, ShoppingBag, Package, ChevronRight, Tags, Share2, ImageIcon, Camera, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import productData from '../data/products.json';
import { exportToPDF } from '../utils/pdfGenerator';
import '../styles/mobile.css';
import confetti from 'canvas-confetti';
import logoSrc from '../assets/logo.png';

const MobileApp = () => {
    const defaultItem = { productId: '', customName: '' };
    const products = productData.products;

    const [items, setItems] = useState([{ ...defaultItem, id: 1 }]);
    const [today, setToday] = useState(format(new Date(), 'dd/MM/yyyy'));
    const [searchQuery, setSearchQuery] = useState({});

    // Dynamic scale based on item count
    const getScaleStyle = () => {
        if (items.length <= 2) return { title: '24px', name: '18px', price: '16px', size: '12px' };
        if (items.length <= 4) return { title: '20px', name: '16px', price: '14px', size: '10px' };
        return { title: '18px', name: '14px', price: '12px', size: '9px' };
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
        
        actionBtn.style.opacity = '0';
        footerInfo.style.display = 'flex';

        try {
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const clonedNoExports = clonedDoc.querySelectorAll('.no-export');
                    clonedNoExports.forEach(el => el.style.display = 'none');
                    
                    const container = clonedDoc.getElementById('mobile-container');
                    container.style.paddingTop = '20px';
                    container.style.paddingBottom = '20px';
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
        }
    };

    return (
        <div className="mobile-app">
            <header className="mobile-header">
                <img src={logoSrc} className="mobile-logo" alt="Lotus Paint" />
                <div className="mobile-title-container">
                    <div className="mobile-title">LOTUS PAINT</div>
                    <Link to="/" style={{ fontSize: '10px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>SANG BẢN MÁY TÍNH →</Link>
                </div>
            </header>

            <motion.div 
                id="mobile-container" 
                className="mobile-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="m-section-title" style={{ marginTop: '10px', fontSize: scale.title, color: '#1e293b', fontWeight: '900' }}>
                    <ShoppingBag size={parseInt(scale.title)} /> BÁO GIÁ SƠN LOTUS
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
                            exit={{ opacity: 0, scale: 0.9, x: -20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            style={{ padding: items.length > 4 ? '12px' : '16px' }}
                        >
                            <div className="m-item-header" style={{ marginBottom: '8px' }}>
                                <span className="m-item-index" style={{ width: '20px', height: '20px', fontSize: '11px', borderRadius: '5px' }}>{index + 1}</span>
                                {items.length > 1 && (
                                    <button className="m-item-delete no-export" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                                )}
                            </div>
                            
                            <div className="m-input-group" style={{ position: 'relative', marginBottom: '8px' }}>
                                <div className="no-export">
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
                                        onBlur={() => setTimeout(() => handleSearch(item.id, ''), 200)}
                                    />
                                </div>
                                
                                {filteredProducts.length > 0 && (
                                    <div className="m-search-results no-export">
                                        {filteredProducts.map(p => (
                                            <div key={p.id} className="m-search-item" onMouseDown={() => selectProduct(item.id, p)}>
                                                {p.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Static Product Name */}
                            {!query && productName && (
                                <div className="p-name-static" style={{ 
                                    fontWeight: '800', 
                                    fontSize: scale.name, 
                                    color: '#1A365D', 
                                    marginBottom: '10px',
                                    lineHeight: '1.3'
                                }}>
                                    {productName}
                                </div>
                            )}

                            {selectedProduct && (
                                <div className="m-price-grid" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(3, 1fr)', 
                                    gap: items.length > 4 ? '6px' : '10px' 
                                }}>
                                    {Object.entries(selectedProduct.p_prices).map(([size, price]) => (
                                        <div key={size} style={{ 
                                            background: '#f8fafc', 
                                            padding: items.length > 4 ? '6px 2px' : '10px 5px', 
                                            borderRadius: '8px', 
                                            textAlign: 'center',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <div style={{ fontSize: scale.size, color: '#64748b', fontWeight: 'bold', marginBottom: '2px' }}>{size}Kg</div>
                                            <div style={{ fontSize: scale.price, fontWeight: '900', color: '#2563eb' }}>{formatCurrency(price).replace('₫', '')}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
                </AnimatePresence>

                <button className="m-btn-add no-export" onClick={addItem} style={{ borderStyle: 'solid', background: '#eff6ff', padding: '10px', fontSize: '13px' }}>
                    <Plus size={16} /> Thêm loại sơn khác
                </button>

                {/* Footer only for Export Image */}
                <div id="export-only-footer" style={{ 
                    display: 'none', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-end',
                    padding: '15px', 
                    borderTop: '1px dashed #cbd5e0', 
                    marginTop: '10px' 
                }}>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: '900', color: '#2563eb', fontSize: '14px' }}>CÔNG TY TNHH BÍCH TRANG</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Trụ sở: 151 Võ Văn Bích, Củ Chi, TP. HCM</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Website: www.sonlotus.vn</div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ width: '60px', height: '60px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '5px' }}>
                           <QrCode size={40} color="#1e293b" />
                        </div>
                        <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '13px' }}>Hotline: 0943 966 662</div>
                    </div>
                </div>
            </motion.div>

            {/* Sticky Export Button */}
            <div id="export-btn-container" style={{ 
                position: 'fixed', 
                bottom: '20px', 
                left: '20px', 
                right: '20px', 
                zIndex: 1000,
                display: 'flex',
                gap: '10px'
            }}>
                <button 
                    onClick={handleExportImage}
                    style={{ 
                        flex: 1,
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '16px',
                        fontWeight: '800',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)'
                    }}
                >
                    <Camera size={20} /> XUẤT ẢNH BÁO GIÁ
                </button>
            </div>

            <div style={{ textAlign: 'center', padding: '20px 20px 100px 20px', color: '#94a3b8', fontSize: '11px' }}>
                © {new Date().getFullYear()} Lotus Paint - Phiên bản Mobile
            </div>
        </div>
    );
};

export default MobileApp;
