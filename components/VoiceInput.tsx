import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onAudioCapture: (base64Audio: string, mimeType: string) => void;
  isProcessing?: boolean;
  className?: string;
  compact?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onAudioCapture, isProcessing = false, className = "", compact = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    if (!window.MediaRecorder) return null;
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4', // iOS Safari usually supports this
      'audio/ogg',
      '' // Browser default
    ];
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      
      // If mimeType is empty string, pass undefined to let browser choose default
      const options = mimeType ? { mimeType } : undefined;
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Determine the actual mime type used
        const finalMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
          // Be careful to split only on the first comma
          const base64Data = base64String.split(',')[1];
          onAudioCapture(base64Data, finalMimeType);
        };
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập micro. Vui lòng cấp quyền ghi âm cho trình duyệt.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={isProcessing}
      className={`
        flex items-center justify-center transition-all rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
        ${isRecording 
          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' 
          : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
        }
        ${compact ? 'p-2' : 'p-3'}
        ${className}
      `}
      title={isRecording ? "Đang ghi âm... Nhấn để dừng" : "Nhấn để nói"}
    >
      {isProcessing ? (
        <Loader2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />
      ) : isRecording ? (
        <Square className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} fill-current`} />
      ) : (
        <Mic className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
      )}
    </button>
  );
};

export default VoiceInput;