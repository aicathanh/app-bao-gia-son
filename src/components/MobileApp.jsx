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
    const [modalImage, setModalImage] = useState(null);

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
                    container.style.width = '420px';
                    container.style.padding = '25px';
                    container.style.paddingTop = '20px';
                    container.style.paddingBottom = '30px';
                    container.style.backgroundColor = '#ffffff';
                }
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    const dataUrl = canvas.toDataURL('image/png');
                    setModalImage(dataUrl);
                    return;
                }

                const fileName = `BaoGia_Lotus_${format(new Date(), 'ddMMyy_HHmm')}.png`;
                const file = new File([blob], fileName, { type: 'image/png' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Báo Giá Lotus Paint',
                            text: 'Bảng báo giá sơn Lotus Paint'
                        });
                        confetti();
                    } catch (shareError) {
                        console.error('Share error:', shareError);
                        // If it's not a user cancel (AbortError), show the fallback modal
                        if (shareError.name !== 'AbortError') {
                            const dataUrl = canvas.toDataURL('image/png');
                            setModalImage(dataUrl);
                        }
                    }
                } else {
                    const dataUrl = canvas.toDataURL('image/png');
                    setModalImage(dataUrl);
                }
            }, 'image/png');
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
                                    gap: '8px' 
                                }}>
                                    {Object.entries(selectedProduct.p_prices)
                                        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
                                        .map(([size, price]) => (
                                        <div key={size} style={{ 
                                            background: '#f8fafc', 
                                            padding: '8px 4px', 
                                            borderRadius: '8px', 
                                            textAlign: 'center',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                        }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '2px' }}>{size}Kg</div>
                                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#2563eb', whiteSpace: 'nowrap' }}>{formatCurrency(price).replace('₫', '').trim()}</div>
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
                    justifyContent: 'center', 
                    alignItems: 'center',
                    padding: '15px', 
                    borderTop: '1px dashed #cbd5e0', 
                    marginTop: '20px',
                    color: '#64748b',
                    fontSize: '11px',
                    fontWeight: 'bold'
                }}>
                    Hotline: 0943 966 662 | www.sonlotus.vn
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

            <AnimatePresence>
                {modalImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)'
                        }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '24px',
                                width: '100%',
                                maxWidth: '400px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '15px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#1e293b' }}>Ảnh Báo Giá Sẵn Sàng</span>
                                <button 
                                    onClick={() => setModalImage(null)}
                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    <X size={18} color="#64748b" />
                                </button>
                            </div>
                            
                            <p style={{ fontSize: '14px', color: '#475569', textAlign: 'center', margin: '0 0 15px 0', lineHeight: '1.5' }}>
                                Nhấn giữ vào ảnh bên dưới và chọn <strong>"Lưu vào ảnh"</strong> hoặc <strong>"Chia sẻ"</strong> để lưu báo giá.
                            </p>

                            <div 
                                style={{ 
                                    width: '100%', 
                                    maxHeight: '45vh', 
                                    overflowY: 'auto', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '20px',
                                    boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)'
                                }}
                            >
                                <img 
                                    src={modalImage} 
                                    alt="Báo giá Lotus Paint" 
                                    style={{ width: '100%', display: 'block', height: 'auto' }} 
                                />
                            </div>

                            <button 
                                onClick={() => setModalImage(null)}
                                style={{ 
                                    width: '100%', 
                                    background: '#2563eb', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    padding: '14px', 
                                    fontWeight: 'bold',
                                    fontSize: '15px',
                                    cursor: 'pointer'
                                }}
                            >
                                Hoàn thành
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobileApp;
