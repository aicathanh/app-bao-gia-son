const ExcelJS = require('exceljs');
const fs = require('fs');

async function generate() {
    const workbook = new ExcelJS.Workbook();
    const dataSheet = workbook.addWorksheet('Data');
    const baoGiaSheet = workbook.addWorksheet('Báo Giá Lotus Paint');

    // Load data from JSON
    const data = JSON.parse(fs.readFileSync('src/data/products.json', 'utf8'));
    const products = data.products;

    // --- Prepare DATA SHEET ---
    dataSheet.columns = [
        { header: 'Key', key: 'key', width: 40 },
        { header: 'Tên sản phẩm', key: 'name', width: 40 },
        { header: 'Size (Kg)', key: 'size', width: 10 },
        { header: 'DVT', key: 'unit', width: 10 },
        { header: 'Đơn Giá', key: 'price', width: 15 }
    ];

    const uniqueNames = [];
    products.forEach(p => {
        if (!uniqueNames.includes(p.name)) uniqueNames.push(p.name);
        Object.keys(p.p_prices).forEach(size => {
            dataSheet.addRow({
                key: p.name + size,
                name: p.name,
                size: size,
                unit: 'Thùng',
                price: p.p_prices[size]
            });
        });
    });

    // --- Prepare BAO GIA SHEET ---
    // Header
    baoGiaSheet.mergeCells('A1:J1');
    baoGiaSheet.getCell('A1').value = 'BÁO GIÁ SƠN LOTUS';
    baoGiaSheet.getCell('A1').font = { size: 20, bold: true, color: { argb: 'FF1A365D' } };
    baoGiaSheet.getCell('A1').alignment = { horizontal: 'center' };

    // Table Headers
    const tableHeaderRow = 10;
    const columns = ['STT', 'Mã SP', 'Tên sản phẩm', 'Khối lượng (Kg)', 'Đơn giá', 'DVT', 'Số lượng', 'Thành tiền', 'Ghi chú'];
    columns.forEach((col, idx) => {
        const cell = baoGiaSheet.getCell(tableHeaderRow, idx + 1);
        cell.value = col;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.alignment = { horizontal: 'center' };
    });

    // Add 20 rows of automation
    for (let i = 1; i <= 20; i++) {
        const row = tableHeaderRow + i;
        baoGiaSheet.getCell(`A${row}`).value = i;
        
        // Product Dropdown - Broad range for futureproofing (B2:B1000)
        baoGiaSheet.getCell(`C${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`'Data'!$B$2:$B$1000`] // Dynamically handles up to 1,000 products
        };

        // Size Dropdown
        baoGiaSheet.getCell(`D${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"1, 5, 20"']
        };

        // Formulas
        // Don gia: VLOOKUP Key (C & D) in Data Sheet
        baoGiaSheet.getCell(`E${row}`).value = { formula: `IF(OR(C${row}="", D${row}=""), "", VLOOKUP(C${row}&D${row}, Data!$A:$E, 5, 0))` };
        baoGiaSheet.getCell(`F${row}`).value = "Thùng";
        baoGiaSheet.getCell(`H${row}`).value = { formula: `E${row}*G${row}` };

        // Formatting
        ['A','B','C','D','E','F','G','H','I'].forEach(col => {
            baoGiaSheet.getCell(`${col}${row}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        baoGiaSheet.getCell(`E${row}`).numFmt = '#,##0';
        baoGiaSheet.getCell(`H${row}`).numFmt = '#,##0';
    }

    // Total Row
    const lastRow = tableHeaderRow + 21;
    baoGiaSheet.getCell(`G${lastRow}`).value = 'TỔNG THÀNH TIỀN:';
    baoGiaSheet.getCell(`G${lastRow}`).font = { bold: true, color: { argb: 'FFC53030' } };
    baoGiaSheet.getCell(`H${lastRow}`).value = { formula: `SUM(H11:H${tableHeaderRow + 20})` };
    baoGiaSheet.getCell(`H${lastRow}`).numFmt = '#,##0 "₫"';
    baoGiaSheet.getCell(`H${lastRow}`).font = { bold: true, size: 14, color: { argb: 'FFC53030' } };

    // Final Save
    const destPath = "/Users/macbook/Library/CloudStorage/GoogleDrive-thanhnguyen@sonlotus.com/Other computers/My iMac/Lotus/Báo Giá Khách Hàng/File Gửi Khách/2026/Mẫu/BaoGia_LotusPaint_TuDong.xlsx";
    await workbook.xlsx.writeFile(destPath);
    console.log(`Successfully generated: ${destPath}`);
}

generate().catch(console.error);
