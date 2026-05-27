const axios = require('axios');
const FormData = require('form-data');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.scanPlate = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    // Extract base64 part
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // PlateRecognizer expects multipart form-data
    const formData = new FormData();
    formData.append('upload', buffer, { filename: 'capture.jpg', contentType: 'image/jpeg' });
    formData.append('regions', 'vn'); // Optimize for Vietnamese plates

    // Ensure token is present
    if (!process.env.PLATE_RECOGNIZER_TOKEN) {
      return res.status(500).json({ success: false, message: 'AI API Token is not configured' });
    }

    const response = await axios.post('https://api.platerecognizer.com/v1/plate-reader/', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Token ${process.env.PLATE_RECOGNIZER_TOKEN}`
      }
    });

    const data = response.data;
    
    if (data.results && data.results.length > 0) {
      const plate = data.results[0].plate.toUpperCase();
      return res.status(200).json({ success: true, plate });
    } else {
      return res.status(400).json({ success: false, message: 'No license plate found in the image' });
    }
  } catch (error) {
    console.error('ALPR Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Error analyzing the image' });
  }
};

/**
 * @desc    Scan vehicle registration card (cà vẹt xe) using Gemini Vision
 *          Extracts: owner name, brand, model code, license plate
 * @route   POST /api/ai/scan-registration-card
 * @access  Private
 */
exports.scanRegistrationCard = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res
        .status(400)
        .json({ success: false, message: 'Image is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API key is not configured',
      });
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Detect mime type
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `You are reading a Vietnamese vehicle registration card (Giấy đăng ký xe / Cà vẹt xe).
Extract ONLY the following fields and return ONLY a valid JSON object with no extra text:
{
  "ownerName": "<Tên chủ xe - Owner's full name>",
  "brand": "<Nhãn hiệu - Brand/Manufacturer, e.g. HONDA, TOYOTA>",
  "model": "<Số loại / Model code, e.g. WINNER X, VIOS>",
  "licensePlate": "<Biển số đăng ký - License plate number, remove spaces and dots, e.g. 43D1-89750>"
}
If a field is not visible or cannot be read, set it to null.
Do NOT include any explanation, markdown, or code blocks. Return raw JSON only.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const text = result.response.text().trim();

    // Parse JSON - strip markdown fences if model adds them
    let extracted;
    try {
      const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      extracted = JSON.parse(clean);
    } catch {
      return res.status(422).json({
        success: false,
        message: 'Could not parse vehicle information from the image',
        raw: text,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        nickname: extracted.ownerName || null,
        brand: extracted.brand || null,
        model: extracted.model || null,
        licensePlate: extracted.licensePlate || null,
      },
    });
  } catch (error) {
    const detail = error?.message || 'Unknown error';
    const geminiErr = error?.response?.data || error?.errorDetails || null;
    console.error('Gemini Vision Error:', detail, geminiErr);
    res.status(500).json({
      success: false,
      message: 'Error analyzing the registration card',
      detail,
    });
  }
};
