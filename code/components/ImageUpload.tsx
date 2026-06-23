"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  onImageSelected: (base64: string) => void;
  currentImage: string | null;
}

export default function ImageUpload({ onImageSelected, currentImage }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFile = useCallback((file: File) => {
    if (file.size > 4 * 1024 * 1024) { alert("Please use an image under 4MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => { onImageSelected(e.target?.result as string); };
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  const openCamera = async () => {
    if (isIOS) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 720, height: 720 } });
      setStream(s); setCameraActive(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 50);
    } catch { setCameraError(true); }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    onImageSelected(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null); setCameraActive(false);
  };

  if (cameraActive) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-square object-cover rounded-sm bg-gray-100" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-56 rounded-full border-2 border-black/30" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={capturePhoto} className="flex-1 bg-black text-white py-3 rounded-sm font-bold text-sm">Capture</button>
          <button onClick={stopCamera} className="px-5 py-3 border border-gray-200 rounded-sm text-sm font-semibold text-gray-500">Cancel</button>
        </div>
      </div>
    );
  }

  if (currentImage) {
    return (
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentImage} alt="Selected" className="w-full aspect-square object-cover rounded-sm border border-gray-200" />
        <button onClick={() => { onImageSelected(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
          className="w-full border border-gray-200 py-3 rounded-sm text-sm font-semibold text-gray-500 hover:text-black hover:border-gray-400 transition-colors">
          Retake / Change Photo
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[288px] space-y-3">

        {/* Top — 3:4 portrait placeholder */}
        <div className="relative bg-gray-50 rounded-sm border border-gray-200 flex items-center justify-center overflow-hidden w-full" style={{ aspectRatio: "3/4" }}>
          <div className="w-14 h-20 rounded-full border border-gray-200 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none" className="opacity-15">
              <circle cx="24" cy="18" r="10" stroke="black" strokeWidth="1.5"/>
              <path d="M6 42c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-gray-300" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-gray-300" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-gray-300" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-gray-300" />
          <p className="absolute bottom-2 left-0 right-0 text-center text-[8px] tracking-[0.2em] uppercase text-gray-300 font-bold">Front facing</p>
        </div>

        {/* Bottom — two buttons side by side */}
        <div className="grid grid-cols-2 gap-1.5">
          {!cameraError ? (
            <button onClick={openCamera}
              className="bg-gray-950 text-white py-3 rounded-sm font-black flex flex-col items-center justify-center gap-1.5 hover:bg-gray-800 transition-colors">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5 4l1-2h4l1 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span className="text-[9px] tracking-wide leading-tight text-center uppercase">Take Photo</span>
            </button>
          ) : (
            <div className="rounded-sm border border-dashed border-gray-200 py-3 flex items-center justify-center">
              <p className="text-[9px] text-gray-400 text-center">Camera<br/>unavailable</p>
            </div>
          )}
          <button onClick={() => fileInputRef.current?.click()}
            className="border border-gray-300 bg-white py-3 rounded-sm font-black flex flex-col items-center justify-center gap-1.5 hover:border-gray-600 hover:text-gray-950 transition-colors text-gray-700">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="1" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M1 10l4-4 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[9px] tracking-wide leading-tight text-center uppercase">Upload Gallery</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

      </div>
    </div>
  );
}
