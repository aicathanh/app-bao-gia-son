import json
import csv

# Read products from JSON
with open('src/data/products.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])

# Create Excel-Smart CSV with "Key" column for easy lookup
with open('BaoGia_LotusPaint_Data.csv', 'w', newline='', encoding='utf-8-sig') as f:
    # delimiter=';' for Excel Vietnam
    writer = csv.writer(f, delimiter=';')
    writer.writerow(['Key (Name+Size)', 'San Pham', 'Size (Kg)', 'Don Gia (VND)'])
    
    for p in products:
        p_name = p.get('name')
        p_prices = p.get('p_prices', {})
        
        for size, price in p_prices.items():
            # Create a unique key for the VLOOKUP
            key = f"{p_name}{size}"
            writer.writerow([key, p_name, size, price])

print("CSV updated with Key column (A) for simple VLOOKUP in Excel.")
