import React, { useState, useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import { processImageOCR } from '../api';
import gsap from 'gsap';

const Scanner = ({ onClose, onScanComplete }) => {
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    let stream = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(err => {
        console.error("Camera access denied:", err);
        alert("Camera access is required for scanning");
      });
    
    if (lineRef.current) {
      gsap.to(lineRef.current, { top: "100%", duration: 2, repeat: -1, yoyo: true, ease: "power1.inOut" });
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const capture = async () => {
    if (!videoRef.current) return;
    setProcessing(true);

    // Create Canvas to convert video frame to Blob
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      // Send to FastAPI
      const result = await processImageOCR(blob);
      setProcessing(false);
      if (result.success) {
        onScanComplete(result.date);
      } else {
        alert("Could not detect date");
      }
    }, 'image/jpeg');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center">
      <div className="relative w-full h-full bg-slate-900">
         <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-80"></video>
         <div ref={lineRef} className="absolute top-0 w-full h-1 bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.9)] z-10"></div>
         
         {processing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-emerald-400 mt-4 font-mono animate-pulse">AI PROCESSING...</p>
            </div>
         )}
      </div>
      <div className="absolute bottom-10 z-30 flex flex-col items-center">
         <button onClick={capture} disabled={processing} className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center border-4 border-white/20 text-white shadow-lg">
            <Camera size={32} />
         </button>
         <button onClick={onClose} className="mt-4 text-white text-sm underline">Cancel</button>
      </div>
    </div>
  );
};

export default Scanner;
