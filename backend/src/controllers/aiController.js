const axios = require('axios');
const FormData = require('form-data');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { normalizeLicensePlate } = require('../utils/licensePlateUtils');

const isLikelyVietnamesePlate = (plate = '') => {
  const clean = normalizeLicensePlate(plate);
  return (
    /^\d{2}[A-Z]{1,2}\d{4,5}$/.test(clean) ||
    /^\d{2}[A-Z]\d\d{4,5}$/.test(clean)
  );
};

const extractRetryDelaySeconds = (detail = '') => {
  const match = String(detail).match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (!match) return null;
  return Math.max(1, Math.ceil(Number(match[1])));
};

const isQuotaError = (error) => {
  const status = error?.status || error?.response?.status || error?.cause?.status;
  const detail = error?.message || '';
  return status === 429 || /quota exceeded|too many requests|429/i.test(detail);
};

exports.scanPlate = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API key is not configured',
      });
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = `Analyze this image containing a vehicle and read the Vietnamese license plate (Biển số xe Việt Nam).
The image may be a contact sheet from the same camera frame: a large full-frame view plus zoomed crops along the bottom. Use the clearest view of the physical vehicle license plate.
Focus on the physical vehicle plate only. Ignore text from the UI, dashboard, walls, stickers, signs, browser, or any other non-plate text.
Return ONLY one normalized license plate string with spaces, dots, dashes, and special characters removed.
Valid examples: 43D189750, 29A12345, 29H76919.
If a plate-like sequence is visible, return your best reading. Return exactly NOT_FOUND only when no physical vehicle plate is visible at all.
Do NOT include any explanation, markdown, punctuation, confidence score, or extra text.`;

    const modelCandidates = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    let quotaError = null;
    let bestAttempt = null;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 20,
          },
        });

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ]);

        let text = result.response.text().trim();
        console.info(`[AI Plate Scan] ${modelName} raw output:`, text);
        text = normalizeLicensePlate(text.replace(/`/g, '').trim());
        bestAttempt = { modelName, text };

        if (text !== 'NOTFOUND' && text.length >= 5 && isLikelyVietnamesePlate(text)) {
          return res.status(200).json({ success: true, plate: text, model: modelName });
        }
      } catch (error) {
        if (isQuotaError(error)) {
          quotaError = error;
          console.error(`[AI Plate Scan] ${modelName} quota hit:`, error?.message || error);
          continue;
        }
        throw error;
      }
    }

    if (quotaError) {
      const detail = quotaError?.message || 'AI quota exceeded';
      const retryAfterSeconds = extractRetryDelaySeconds(detail);
      return res.status(429).json({
        success: false,
        message: 'AI plate scanning is temporarily rate-limited. Please retry shortly.',
        retryAfterSeconds,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'No license plate found in the image',
      attemptedPlate: bestAttempt?.text || null,
      model: bestAttempt?.modelName || null,
    });

  } catch (error) {
    const detail = error?.message || 'Unknown error';
    console.error('Gemini ALPR Error:', detail);
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
  "brand": "<Nhãn hiệu - Brand/Manufacturer, e.g. HONDA, TOYOTA, MG>",
  "model": "<Số loại / Model code, e.g. WINNER X, VIOS, ZS>",
  "licensePlate": "<Biển số đăng ký - License plate number, remove all spaces and dots, e.g. 43D1-89750>",
  "colorText": "<Màu sơn / Color of the vehicle EXACTLY as written on the card>",
  "hexColor": "<Convert colorText to the closest CSS hex color using this reference table:
    Trắng / Trắng tinh / Trắng ngà → #f5f5f5
    Đen / Đen bóng / Đen nhám → #1a1a1a
    Bạc / Xám bạc / Bạc ánh kim / Silver → #c0c0c0
    Xám / Xám tro / Ghi → #808080
    Xám đậm → #4a4a4a
    Đỏ / Đỏ tươi → #cc2200
    Đỏ đô / Đỏ mận → #8b1a1a
    Cam → #e65c00
    Vàng → #f5c400
    Vàng cát / Be → #c8a86b
    Xanh dương / Xanh nước biển → #1a4fa0
    Xanh đen / Xanh navy → #0a1a3a
    Xanh lá / Xanh lục → #2d7a2d
    Xanh mint → #5fb8a0
    Nâu / Nâu đồng → #6b3a1f
    Tím → #6a0dad
    Hồng → #e75480
    Vàng đồng / Đồng → #b8860b
    Nâu vàng / Gold → #c8a84a
    Nâu đỏ / Đỏ nâu → #7b2d00
    If colorText does not match any above, pick the nearest color logically.
    Return null ONLY if colorText is also null or completely unreadable.>"
}
If a field is not visible or cannot be read, set it to null.
Do NOT default hexColor to #ffffff — if you cannot determine the color, return null.
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
      console.log('[AI Scan] Raw text from Gemini:', text);
      console.log('[AI Scan] Parsed:', extracted);
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
        colorText: extracted.colorText || null,
        hexColor: extracted.hexColor || null,
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
