
import React, { useState, useEffect } from 'react';
import { Share, Download, X, Smartphone, PlusSquare, ArrowBigDown, ChevronDown } from 'lucide-react';

export default function InstallPWA() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Kiểm tra xem ứng dụng đã được cài đặt chưa (chạy ở chế độ standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                        || (window.navigator as any).standalone 
                        || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Xác định hệ điều hành
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // Hiển thị sau 1.5 giây
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-x-4 bottom-24 z-[100] animate-in slide-in-from-bottom duration-700">
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-indigo-500 p-6 relative overflow-hidden">
          <button 
            onClick={() => setShow(false)} 
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
               <Smartphone className="w-8 h-8 text-white" />
            </div>
            <div>
              <h4 className="font-black text-indigo-900 text-lg leading-tight">Cài đặt "Sổ doanh thu AI"</h4>
              <p className="text-gray-500 text-sm mt-0.5">Sử dụng như một ứng dụng thật trên màn hình chính của bạn.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            {platform === 'ios' ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4 text-gray-700">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold shrink-0 border border-blue-100">1</div>
                  <p className="text-sm leading-relaxed">
                    Nhấn vào nút <strong>Chia sẻ</strong> (biểu tượng <Share className="w-5 h-5 inline text-blue-600 mx-1 mb-1" /> ô vuông có mũi tên lên) ở thanh công cụ bên dưới trình duyệt.
                  </p>
                </div>
                
                <div className="flex items-start gap-4 text-gray-700">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold shrink-0 border border-blue-100">2</div>
                  <p className="text-sm leading-relaxed">
                    Vuốt lên trong bảng menu hiện ra và chọn dòng <span className="text-indigo-700 font-bold flex items-center gap-1 inline-flex"><PlusSquare className="w-4 h-4" /> "Thêm vào MH chính"</span> (Add to Home Screen).
                  </p>
                </div>

                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3 animate-pulse">
                   <div className="p-2 bg-indigo-600 rounded-lg text-white"><Download className="w-4 h-4" /></div>
                   <p className="text-xs text-indigo-900 font-bold">Lưu ý: Bạn phải kéo danh sách menu lên trên mới thấy được dòng này!</p>
                </div>
              </div>
            ) : platform === 'android' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                  <ArrowBigDown className="w-5 h-5 text-green-500 animate-bounce" />
                  Nhấn vào <strong>Menu trình duyệt (3 chấm)</strong> và chọn <strong>Cài đặt ứng dụng</strong>.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-700">Vui lòng mở menu trình duyệt và chọn "Thêm vào màn hình chính".</p>
            )}
          </div>
        </div>
      </div>

      {/* Mũi tên chỉ dẫn cho iOS Safari */}
      {platform === 'ios' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[101] flex flex-col items-center pointer-events-none animate-bounce">
          <p className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full mb-1 shadow-lg">NHẤN VÀO ĐÂY</p>
          <ChevronDown className="w-10 h-10 text-indigo-600 drop-shadow-lg" />
        </div>
      )}
    </>
  );
}
