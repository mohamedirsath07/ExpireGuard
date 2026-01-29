import React, { useState, useEffect, useRef } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { processImageOCR } from '../api';
import gsap from 'gsap';

const Scanner = ({ onClose, onScanComplete }) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const lineRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
      })
      .catch(err => {
        console.error("Camera access denied:", err);
        setError("Camera access is required for scanning");
      });

    if (lineRef.current) {
      gsap.to(lineRef.current, { top: "100%", duration: 2, repeat: -1, yoyo: true, ease: "power1.inOut" });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const captureAndProcess = async () => {
    if (!videoRef.current || !cameraReady) {
      setError("Camera not ready. Please wait and try again.");
      return;
    }

    // Check if video stream is ready
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setError("Video stream not ready. Please wait a moment.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create Canvas to capture video frame
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error("Failed to capture image"));
          }
        }, 'image/jpeg', 0.95);
      });

      console.log("Image captured, sending to OCR...", blob.size, "bytes");

      // Send to FastAPI OCR endpoint
      const result = await processImageOCR(blob);

      console.log("OCR Result:", result);

      if (result.success && result.expiry_date) {
        // Pass date and confidence to parent
        onScanComplete(result.expiry_date, result.confidence || 0);
      } else {
        setError(result.message || "Could not detect expiry date. Try again with better lighting.");
      }
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to process image. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center">
      <div className="relative w-full h-full bg-slate-900">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />

        {/* Camera status indicator */}
        <div className="absolute top-4 left-4 z-30">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium ${
            cameraReady 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              cameraReady ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'
            }`}></div>
            {cameraReady ? 'Camera Ready' : 'Initializing...'}
          </div>
        </div>

        {/* Scan guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[85%] aspect-[3/2] border-2 border-emerald-500/50 rounded-xl relative">
            <div className="absolute -top-8 left-0 w-full text-center text-white/80 text-xs font-bold tracking-widest uppercase">
              Point at expiry date
            </div>
            <div ref={lineRef} className="absolute top-0 w-full h-1 bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.9)]"></div>
          </div>
        </div>

        {/* Processing overlay */}
        {processing && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-emerald-400 mt-4 font-mono animate-pulse">EXTRACTING DATE...</p>
            <p className="text-slate-500 text-sm mt-2">AI analyzing image</p>
          </div>
        )}

        {/* Error message */}
        {error && !processing && (
          <div className="absolute top-16 left-4 right-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 z-20 flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <div>
              <p className="text-red-400 font-bold text-sm">Detection Failed</p>
              <p className="text-red-300/70 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 z-30 flex flex-col items-center">
        <button
          onClick={captureAndProcess}
          disabled={processing || !cameraReady}
          className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center border-4 border-white/20 text-white shadow-lg disabled:opacity-50 disabled:scale-95 transition-all active:scale-95 hover:bg-emerald-500"
        >
          <Camera size={32} />
        </button>
        <p className="text-white/60 text-xs mt-2">Tap to capture & scan</p>
        <button onClick={onClose} className="mt-3 text-white text-sm underline">Cancel</button>
      </div>
    </div>
  );
};

export default Scanner;
