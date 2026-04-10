import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Download, Printer, Save, Search, X, User, MapPin, Phone, FileText, ShoppingBag, Package, ChevronRight, Tags, Share2, ImageIcon, Camera } from 'lucide-react';
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
        
        // Find elements to hide
        const noExports = document.querySelectorAll('.no-export');
        actionBtn.style.opacity = '0';

        try {
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const clonedNoExports = clonedDoc.querySelectorAll('.no-export');
                    clonedNoExports.forEach(el => el.style.display = 'none');
                    
                    // Style for image
                    const container = clonedDoc.getElementById('mobile-container');
                    container.style.paddingTop = '10px';
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
        }
    };

    return (
        <div className="mobile-app">
            <header className="mobile-header">
                <img src={logoSrc} className="mobile-logo" alt="Lotus Paint" />
                <div className="mobile-title-container">
                    <div className="mobile-title">BẢNG GIÁ LOTUS</div>
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
                <div className="m-section-title" style={{ marginTop: '10px' }}>
                    <Tags size={16} /> Tra cứu đơn giá nhanh
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
                        >
                            <div className="m-item-header">
                                <span className="m-item-index">{index + 1}</span>
                                {items.length > 1 && (
                                    <button className="m-item-delete no-export" onClick={() => removeItem(item.id)}><Trash2 size={18} /></button>
                                )}
                            </div>
                            
                            <div className="m-input-group" style={{ position: 'relative' }}>
                                <label className="no-export">CHỌN LOẠI SƠN</label>
                                <div className="no-export">
                                    <input 
                                        className="m-input" 
                                        type="text" 
                                        placeholder="Gõ tên sơn cần tra giá..." 
                                        value={query || productName}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            handleSearch(item.id, val);
                                            if (!val) clearSelection(item.id);
                                        }}
                                        onBlur={() => setTimeout(() => handleSearch(item.id, ''), 200)}
                                    />
                                </div>
                                {productName && (
                                    <div className="export-only" style={{ display: 'none' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>{productName}</div>
                                    </div>
                                )}
                                
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

                            {/* Show Product Name when exporting if it's selected */}
                            {!query && productName && (
                                <div className="p-name-static" style={{ fontWeight: '800', fontSize: '15px', color: '#1A365D', marginBottom: '10px' }}>
                                    {productName}
                                </div>
                            )}

                            {selectedProduct && (
                                <div className="m-price-grid" style={{ marginTop: '5px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {Object.entries(selectedProduct.p_prices).map(([size, price]) => (
                                        <div key={size} style={{ 
                                            background: '#f8fafc', 
                                            padding: '10px 5px', 
                                            borderRadius: '10px', 
                                            textAlign: 'center',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>SIZE: {size}Kg</div>
                                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#2563eb' }}>{formatCurrency(price).replace('₫', '')}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
                </AnimatePresence>

                <button className="m-btn-add no-export" onClick={addItem} style={{ borderStyle: 'solid', background: '#eff6ff' }}>
                    <Plus size={20} /> Tra thêm sơn khác
                </button>

                <div id="export-only-footer" style={{ display: 'none', textAlign: 'center', padding: '10px', borderTop: '1px dashed #cbd5e0', marginTop: '20px' }}>
                    <div style={{ fontWeight: 'bold', color: '#2563eb' }}>CÔNG TY TNHH BÍCH TRANG</div>
                    <div style={{ fontSize: '10px' }}>Hotline: 0943 966 662 - www.sonlotus.vn</div>
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
                        background: '#2563eb',
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
                    <Camera size={20} /> XUẤT ẢNH GỬI KHÁCH
                </button>
            </div>

            <div style={{ textAlign: 'center', padding: '20px 20px 100px 20px', color: '#94a3b8', fontSize: '11px' }}>
                © {new Date().getFullYear()} Lotus Paint - Tra cứu giá nhanh
            </div>
        </div>
    );
};

export default MobileApp;
