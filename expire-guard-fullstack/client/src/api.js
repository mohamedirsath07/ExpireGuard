import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const processImageOCR = async (imageBlob) => {
    const formData = new FormData();
    formData.append('file', imageBlob);

    try {
        const response = await axios.post(`${API_URL}/ocr/extract-date`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("OCR Error", error);
        return { success: false };
    }
};
