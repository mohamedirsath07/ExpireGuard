import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const processImageOCR = async (imageBlob) => {
    const formData = new FormData();
    formData.append('file', imageBlob);

    try {
        const response = await axios.post(`${API_URL}/ocr/extract-date`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000 // 30 second timeout for OCR processing
        });
        // Map response to expected format
        return {
            success: response.data.success,
            expiry_date: response.data.expiry_date,
            confidence: response.data.confidence || 0,
            message: response.data.message || response.data.error
        };
    } catch (error) {
        console.error("OCR Error", error);
        return {
            success: false,
            expiry_date: null,
            confidence: 0,
            message: "Failed to connect to OCR server"
        };
    }
};
