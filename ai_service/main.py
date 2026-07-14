from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
from ultralytics import YOLO
import easyocr
import io
import os
import re
from pydantic import BaseModel
import base64

app = FastAPI(title="ValoParking ALPR & Document AI Service")

class ScanRequest(BaseModel):
    image: str # Base64 encoded image

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. Initialize Models (Will load into RAM once on startup)
# ---------------------------------------------------------

# OCR Engine (English is used for license plates and names/brands)
try:
    print("Loading EasyOCR model...")
    reader = easyocr.Reader(['vi', 'en'], gpu=False) # Hỗ trợ tiếng Việt cho cà vẹt
except Exception as e:
    print(f"Warning: EasyOCR failed to load - {e}")
    reader = None

# YOLO Model cho Biển số xe
MODEL_PATH = "best.pt"
yolo_model = None
if os.path.exists(MODEL_PATH):
    try:
        print(f"Loading ALPR YOLO model from {MODEL_PATH}...")
        # Vì Mac không có dGPU, dùng CPU
        yolo_model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"Warning: ALPR YOLO failed to load - {e}")
else:
    print(f"Warning: {MODEL_PATH} not found.")

# YOLO Model cho Cà vẹt xe
REG_MODEL_PATH = "registration.pt"
reg_model = None
if os.path.exists(REG_MODEL_PATH):
    try:
        print(f"Loading Registration YOLO model from {REG_MODEL_PATH}...")
        reg_model = YOLO(REG_MODEL_PATH)
    except Exception as e:
        print(f"Warning: Registration YOLO failed to load - {e}")
else:
    print(f"Warning: {REG_MODEL_PATH} not found. Scan registration will return empty if not present.")


# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------
def clean_plate_text(text: str) -> str:
    """Clean OCR text to match Vietnamese plate formats"""
    cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
    
    # Tầng 1: Trích xuất thông minh bằng Regex (Tìm chuỗi con giống biển số nhất)
    # Bỏ qua các chữ rác ở đầu hoặc cuối (như HONDA, VN, v.v.)
    # Cho phép 2 ký tự đầu bị nhầm thành chữ (O, I, B, Z, S)
    match = re.search(r'([0-9OIBZS]{2}[A-Z]{1,2}[0-9OIBZS]{4,5})', cleaned)
    if match:
        cleaned = match.group(1)
    
    # Tầng 2: Sửa lỗi OCR phổ biến ở các vị trí được mong đợi là số
    # Ví dụ: O -> 0, B -> 8, Z -> 2, S -> 5
    replacements = {'O': '0', 'B': '8', 'Z': '2', 'S': '5', 'I': '1', 'G': '6'}
    
    # Simple heuristic to insert dash
    if len(cleaned) >= 6:
        # Ký tự 1 và 2 luôn là số (Mã tỉnh)
        prefix = cleaned[:2]
        for k, v in replacements.items():
            prefix = prefix.replace(k, v)
            
        # Các ký tự sau
        suffix = cleaned[2:]
        cleaned = prefix + suffix

        match = re.match(r'^([0-9]{2}[A-Z]{1,2})([0-9]{4,5})$', cleaned)
        if match:
            return f"{match.group(1)}-{match.group(2)}"
    return cleaned

def preprocess_image_for_ocr(img_bgr):
    """
    Tiền xử lý ảnh nâng cao để EasyOCR đọc rõ nét hơn.
    """
    # 1. Chuyển sang ảnh xám
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    
    # 2. Phóng to ảnh (giúp OCR đọc các ký tự nhỏ)
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    # Tăng cường độ tương phản cục bộ, rất tốt cho ảnh bị lóa sáng hoặc tối
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    
    # 4. Lọc nhiễu (Bilateral)
    blur = cv2.bilateralFilter(gray, 11, 17, 17)
    
    return blur


# ---------------------------------------------------------
# 2. API Endpoints
# ---------------------------------------------------------
@app.get("/")
def health_check():
    return {
        "status": "online",
        "alpr_loaded": yolo_model is not None,
        "registration_loaded": reg_model is not None,
        "ocr_loaded": reader is not None
    }

@app.post("/scan")
async def scan_license_plate(request: ScanRequest):
    """
    Quét Biển số xe (ALPR)
    """
    if not reader:
        raise HTTPException(status_code=500, detail="OCR engine not initialized.")

    try:
        base64_data = request.image
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
            
        contents = base64.b64decode(base64_data)
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        plate_img = img

        if yolo_model:
            results = yolo_model(img, conf=0.15)
            if len(results) > 0 and len(results[0].boxes) > 0:
                box = results[0].boxes[0].xyxy[0].cpu().numpy().astype(int)
                x1, y1, x2, y2 = box
                
                # Mở rộng bounding box ngang nhiều hơn dọc để tránh dính chữ xung quanh
                h, w = img.shape[:2]
                pad_x = 12
                pad_y = 2
                x1 = max(0, x1 - pad_x)
                y1 = max(0, y1 - pad_y)
                x2 = min(w, x2 + pad_x)
                y2 = min(h, y2 + pad_y)
                
                plate_img = img[y1:y2, x1:x2]
        
        # Bỏ qua tiền xử lý vì màn hình điện thoại hay bị nhiễu vân moire khi dùng CLAHE
        # Run EasyOCR
        allowlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        ocr_results = reader.readtext(plate_img, allowlist=allowlist)
        
        # Lọc nhiễu bằng kích thước Bounding Box (Tier 2)
        valid_texts = []
        if ocr_results:
            # Tìm chiều cao lớn nhất của các text box (đây thường là chiều cao của ký tự biển số thật)
            max_height = max([abs(res[0][2][1] - res[0][0][1]) for res in ocr_results]) if ocr_results else 0
            
            # Chỉ lấy các text có chiều cao >= 40% chiều cao lớn nhất
            for res in ocr_results:
                bbox, text, conf = res
                height = abs(bbox[2][1] - bbox[0][1])
                if height >= max_height * 0.4:
                    valid_texts.append(text)
        
        raw_text = "".join(valid_texts)
        
        if not raw_text:
            return {"success": False, "message": "No text detected."}
            
        final_plate = clean_plate_text(raw_text)

        return {
            "success": True,
            "plate": final_plate,
            "raw_ocr": raw_text
        }

    except Exception as e:
        print(f"Error during scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scan-registration")
async def scan_registration_card(request: ScanRequest):
    """
    Quét Cà vẹt xe (Registration Card)
    Yêu cầu: model registration.pt phải có các classes tương ứng:
    0: plate, 1: name, 2: brand, 3: model, 4: color
    """
    if not reader:
        raise HTTPException(status_code=500, detail="OCR engine not initialized.")

    if not reg_model:
        raise HTTPException(status_code=503, detail="Registration YOLO model (registration.pt) not found. Please train and upload it.")

    try:
        base64_data = request.image
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
            
        contents = base64.b64decode(base64_data)
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        results = reg_model(img, conf=0.3)
        
        extracted_data = {
            "licensePlate": None,
            "ownerName": None,
            "brand": None,
            "model": None,
            "colorText": None
        }

        if len(results) > 0 and len(results[0].boxes) > 0:
            boxes = results[0].boxes
            names = reg_model.names # Dictionary ánh xạ id -> tên class (vd: {0: 'plate', 1: 'name'...})
            
            for box in boxes:
                cls_id = int(box.cls[0].cpu().numpy())
                class_name = names[cls_id].lower()
                
                # Crop area
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                crop_img = img[y1:y2, x1:x2]
                
                processed_crop = preprocess_image_for_ocr(crop_img)
                ocr_results = reader.readtext(processed_crop)
                text = " ".join([res[1] for res in ocr_results]).strip()
                
                # Gán vào field tương ứng
                if "plate" in class_name or "bien_so" in class_name:
                    extracted_data["licensePlate"] = clean_plate_text(text)
                elif "name" in class_name or "ten_chu_xe" in class_name:
                    extracted_data["ownerName"] = text
                elif "brand" in class_name or "nhan_hieu" in class_name:
                    extracted_data["brand"] = text
                elif "model" in class_name or "loai_xe" in class_name or "so_loai" in class_name:
                    extracted_data["model"] = text
                elif "color" in class_name or "mau_son" in class_name:
                    extracted_data["colorText"] = text

        return {
            "success": True,
            "data": extracted_data
        }

    except Exception as e:
        print(f"Error during registration scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    print("Starting ValoParking AI Service on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
