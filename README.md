# ExpireGuard - Full Stack Application

A modern product expiry tracking application with AI-powered OCR date detection.

> Housekeeping: Deployment configs removed for a clean setup.
> The files `vercel.json` and `render.yaml` have been deleted.
> Set up your preferred deployment from scratch.

## 🏗️ Architecture

- **Frontend**: React + Vite + TailwindCSS + GSAP
- **Backend**: FastAPI (Python) for OCR Processing
- **Database**: Firebase Firestore (Cloud Database)

## 📂 Project Structure

```
expire-guard-fullstack/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Scanner.jsx
│   │   │   └── AddItemModal.jsx
│   │   ├── firebase.js     # Database Connection
│   │   ├── api.js          # FastAPI Connection
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
└── server/                 # FastAPI Backend
    ├── main.py             # OCR Logic
    └── requirements.txt
```

## 🔥 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Add a Web App and copy the configuration
4. Enable **Firestore Database** in test mode
5. Update `client/src/firebase.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
```

## 🐍 Backend Setup (FastAPI)

### Prerequisites
- Python 3.8+
- Tesseract OCR installed on your system

#### Install Tesseract:
- **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki
- **macOS**: `brew install tesseract`
- **Linux**: `sudo apt-get install tesseract-ocr`

### Installation

```bash
cd server
pip install -r requirements.txt
```

### Run the Backend

```bash
python main.py
```

Server will run on **http://localhost:8000**

## ⚛️ Frontend Setup (React)

### Installation

```bash
cd client
npm install
```

### Run the Frontend

```bash
npm run dev
```

Client will run on **http://localhost:5173**

## 🚀 How to Use

1. **Start Backend**: Run the FastAPI server first
2. **Start Frontend**: Run the React development server
3. **Access the App**: Open http://localhost:5173 in your browser
4. **Add Products**: 
   - Click the "+" button
   - Enter product details manually OR
   - Click the scan icon to use camera OCR
   - The AI will detect expiry dates from product images
5. **Track Expiry**: Dashboard shows:
   - All products sorted by expiry date
   - Color-coded status (Good, Expiring Soon, Expired)
   - Days remaining for each product

## 🎯 Features

- ✅ Camera-based OCR scanning for expiry dates
- ✅ Real-time Firebase cloud sync
- ✅ Smart expiry status tracking
- ✅ Category-based filtering
- ✅ GSAP animations for smooth UX
- ✅ Mobile-responsive design
- ✅ Dark mode UI

## 📱 Mobile Access

To access from your phone on the same network:

1. Find your computer's local IP address
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` (look for inet)
2. Update `client/src/api.js` to use your IP:
   ```javascript
   const API_URL = 'http://YOUR_IP:8000';
   ```
3. Access `http://YOUR_IP:5173` from your phone

## 🛠️ Technologies Used

### Frontend
- React 18
- Vite
- TailwindCSS
- GSAP (GreenSock Animation Platform)
- Lucide React (Icons)
- Axios
- Firebase SDK

### Backend
- FastAPI
- Pytesseract (OCR)
- Pillow (Image Processing)
- Python Multipart
- Uvicorn (ASGI Server)

## 📝 Notes

- Tesseract OCR accuracy depends on image quality
- The backend includes a fallback date generator for testing
- Firebase requires internet connection for cloud sync
- Camera access is required for scanning features

## 🔒 Security

Remember to:
- Keep your Firebase config secure
- Set proper Firestore security rules in production
- Use environment variables for sensitive data

## 📄 License

MIT License - Feel free to use this project for learning and development.
