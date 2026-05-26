const axios = require('axios');
const FormData = require('form-data');

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
