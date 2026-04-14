import json
import re
import os

# Paths
CHATBOT_DATA_PATH = "/Users/macbook/Desktop/Học AI Demo/WEB Mẫu V1/chatbot_data.txt"
PRODUCTS_JSON_PATH = "/Users/macbook/Desktop/App Báo Giá/src/data/products.json"

def clean_price(price_str):
    if not price_str or price_str.strip() == "-":
        return 0
    clean = re.sub(r'\(.*?\)', '', price_str)
    clean = clean.replace('.', '').replace(',', '').strip()
    try:
        return int(clean)
    except ValueError:
        return 0

def extract_product_code(name):
    """Try to extract codes like LWF, LMCF, 2K71 etc."""
    # Match text inside parentheses that isn't just "1K" or "2K"
    codes = re.findall(r'\(([^)]+)\)', name)
    for c in codes:
        if c not in ["1K", "2K", "Interior", "Exterior"]:
            return c
    return name # Fallback to full name if no specific code found

def sync():
    if not os.path.exists(CHATBOT_DATA_PATH): return

    with open(CHATBOT_DATA_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    start_parsing = False
    new_products = []
    seen_codes = set()
    current_id = 101

    for line in lines:
        if "### BẢNG GIÁ NIÊM YẾT MỚI NHẤT" in line:
            start_parsing = True
            continue
        if start_parsing and line.startswith("###") and "BẢNG GIÁ" not in line:
            break

        if start_parsing and "|" in line and "NHÓM SẢN PHẨM" not in line and "---|---" not in line:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 6:
                name = parts[2]
                
                # Extract code and deduplicate
                code = extract_product_code(name)
                if code in seen_codes:
                    continue
                
                p1 = clean_price(parts[3])
                p5 = clean_price(parts[4])
                p20 = clean_price(parts[5])
                
                if p1 or p5 or p20:
                    seen_codes.add(code)
                    if "Chất Đóng Rắn" in name:
                         new_products.append({"id": 148, "name": name, "p_prices": { "1": p1, "0.5": p5, "0.1": p20 }})
                    else:
                        new_products.append({"id": current_id, "name": name, "p_prices": { "1": p1, "5": p5, "20": p20 }})
                        current_id += 1

    if new_products:
        with open(PRODUCTS_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump({"products": new_products}, f, ensure_ascii=False, indent=2)
        print(f"Successfully synced {len(new_products)} unique products.")
    else:
        print("No valid products found.")

if __name__ == "__main__":
    sync()
