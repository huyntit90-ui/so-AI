
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Trash2, Plus, ArrowLeft, Download, FileText, DollarSign, FileSpreadsheet, RotateCcw, Smartphone, X, Mail, Sparkles, Database, HardDrive, AlertTriangle, ShieldCheck, Key, HelpCircle, ExternalLink, Settings, PlayCircle, RefreshCw, CheckCircle2, WifiOff, Copy, Check, Search, FolderOpen, CloudUpload, Monitor, Rocket, Globe, AlertCircle, ChevronRight } from 'lucide-react';
import { S1aFormState, Transaction, AppView, TaxPayerInfo } from './types';
import VoiceInput from './components/VoiceInput';
import PreviewS1a from './components/PreviewS1a';
import InstallPWA from './components/InstallPWA';
import { parseTransactionFromAudio, transcribeAudio, transcribeStandardizedInfo } from './services/geminiService';
import { exportToDoc, exportToExcel, generateExcelBlob } from './utils/exportUtils';
import { saveToDB, loadFromDB, clearDB } from './services/db';

const SAMPLE_DATA: S1aFormState = {
  info: {
    name: "Nguyễn Văn A",
    address: "123 Đường Láng, Hà Nội",
    taxId: "8000123456",
    location: "Cửa hàng Tạp hóa Số 1",
    period: "Tháng 10/2023"
  },
  transactions: [
    { id: '1', date: "01/10/2023", description: "Bán hàng tạp hóa lẻ", amount: 2500000 },
    { id: '2', date: "02/10/2023", description: "Cung cấp dịch vụ giao hàng", amount: 500000 },
  ]
};

export default function App() {
  const [view, setView] = useState<AppView>(AppView.EDIT);
  const [data, setData] = useState<S1aFormState>(SAMPLE_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingField, setProcessingField] = useState<string | null>(null); 
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const savedData = await loadFromDB();
      if (savedData) setData(savedData);
      setIsLoaded(true);
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    saveToDB(data).catch(err => console.error("Lỗi lưu DB:", err));
  }, [data, isLoaded]);

  const handleReset = async () => {
    await clearDB();
    setData(SAMPLE_DATA);
    setShowResetConfirm(false);
  };

  const handleInfoChange = (field: keyof TaxPayerInfo, value: string) => {
    setData(prev => ({ ...prev, info: { ...prev.info, [field]: value } }));
  };

  const handleError = (e: any) => {
    setAiFeedback("Lỗi kết nối AI. Vui lòng kiểm tra lại đường truyền.");
    setTimeout(() => setAiFeedback(null), 3000);
  };

  const handleVoiceForField = async (field: keyof TaxPayerInfo, label: string, audioBase64: string, mimeType: string) => {
    setProcessingField(field);
    try {
      const text = await transcribeStandardizedInfo(audioBase64, label, mimeType);
      if (text) handleInfoChange(field, text);
    } catch (e) {
      handleError(e);
    } finally {
      setProcessingField(null);
    }
  };

  const addTransaction = () => {
    const newTrans: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('vi-VN'),
      description: "",
      amount: 0
    };
    setData(prev => ({ ...prev, transactions: [...prev.transactions, newTrans] }));
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: string | number) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const handleVoiceForTransactionDesc = async (id: string, audioBase64: string, mimeType: string) => {
    setProcessingField(`trans-${id}`);
    try {
      const text = await transcribeAudio(audioBase64, mimeType);
      if (text) updateTransaction(id, 'description', text);
    } catch (e) {
      handleError(e);
    } finally {
      setProcessingField(null);
    }
  };

  const removeTransaction = (id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  };

  const handleSmartVoiceAdd = async (audioBase64: string, mimeType: string) => {
    if (!audioBase64) return;
    setIsProcessingAI(true);
    setAiFeedback("AI đang xử lý...");
    try {
      const result = await parseTransactionFromAudio(audioBase64, mimeType);
      const newTrans: Transaction = {
        id: Date.now().toString(),
        date: result.date || new Date().toLocaleDateString('vi-VN'),
        description: result.description || "Giao dịch mới",
        amount: result.amount || 0
      };
      setData(prev => ({ ...prev, transactions: [...prev.transactions, newTrans] }));
      setAiFeedback("Đã ghi nhận!");
      setTimeout(() => setAiFeedback(null), 2000);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleSaveToDrive = () => {
    exportToExcel(data);
    alert("File Excel đã được tải xuống. Bạn có thể tải tệp này lên Google Drive để lưu trữ lâu dài.");
  };

  const handleSendExcel = async () => {
    const excelBlob = generateExcelBlob(data);
    const safeName = (data.info.name || 'S1a').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '_');
    const fileName = `${safeName}_S1a.xls`;
    const file = new File([excelBlob], fileName, { type: 'application/vnd.ms-excel' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Sổ doanh thu S1a-HKD',
          text: `Dữ liệu doanh thu của ${data.info.name}`,
        });
      } catch (error) {
        exportToExcel(data);
      }
    } else {
      exportToExcel(data);
    }
  };

  const formatAmountInput = (amount: number): string => {
    if (amount === 0) return "";
    return amount.toLocaleString('vi-VN');
  };

  const parseAmountInput = (value: string): number => {
    const cleanValue = value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const num = parseInt(cleanValue, 10);
    return isNaN(num) ? 0 : num;
  };

  const renderEditView = () => (
    <div className="space-y-6 pb-40">
      {/* Privacy & Security Header */}
      <div className="flex items-center justify-between bg-white/70 backdrop-blur-lg px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-green-50 rounded-xl text-green-600">
             <ShieldCheck className="w-5 h-5" />
           </div>
           <div>
             <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest leading-none">Bảo mật dữ liệu</p>
             <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Dữ liệu lưu trữ nội bộ trên trình duyệt</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Hệ thống sẵn sàng</span>
        </div>
      </div>

      {/* Phần A: Thông tin hành chính */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 md:p-10">
        <h2 className="text-2xl font-black text-indigo-950 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><BookOpen className="w-7 h-7" /></div>
          A. Thông tin Hộ kinh doanh
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { label: "Chủ hộ kinh doanh", key: "name" as const, placeholder: "Họ và tên..." },
            { label: "Mã số thuế", key: "taxId" as const, placeholder: "Nhập dãy số MST..." },
            { label: "Địa chỉ cư trú", key: "address" as const, placeholder: "Số nhà, đường, phường/xã...", full: true },
            { label: "Địa điểm kinh doanh", key: "location" as const, placeholder: "Tên chợ, tên cửa hàng...", full: true },
            { label: "Kỳ kê khai thuế", key: "period" as const, placeholder: "Tháng/Quý năm..." }
          ].map((field) => (
            <div key={field.key} className={`${field.full ? 'md:col-span-2' : ''}`}>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">{field.label}</label>
              <div className="flex items-center gap-4 group">
                <input
                  type="text"
                  value={data.info[field.key]}
                  onChange={(e) => handleInfoChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="block w-full rounded-2xl border-gray-100 bg-gray-50/50 border px-6 py-5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-sm transition-all outline-none font-medium placeholder:text-gray-300"
                />
                <VoiceInput onAudioCapture={(audio, mime) => handleVoiceForField(field.key, field.label, audio, mime)} isProcessing={processingField === field.key} compact className="shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phần B: Doanh thu chi tiết */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 md:p-10">
        <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-sm"><DollarSign className="w-7 h-7" /></div>
          B. Nhật ký doanh thu bán hàng
        </h2>
        
        <div className="space-y-6">
          {data.transactions.length === 0 ? (
            <div className="py-20 text-center border-4 border-dashed border-gray-50 rounded-[40px]">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <FileSpreadsheet className="w-8 h-8 text-gray-200" />
               </div>
               <p className="text-gray-300 text-sm font-black uppercase tracking-widest">Danh sách trống</p>
               <p className="text-gray-200 text-xs mt-2 italic">Dùng micro phía dưới để ghi nhanh bằng giọng nói</p>
            </div>
          ) : (
            data.transactions.map((item) => (
              <div key={item.id} className="relative p-8 rounded-[32px] bg-gray-50/40 border border-gray-100 flex flex-col gap-5 group hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <input type="text" value={item.date} onChange={(e) => updateTransaction(item.id, 'date', e.target.value)} className="bg-white px-5 py-2.5 rounded-xl border border-gray-100 text-xs font-black text-indigo-600 w-36 text-center shadow-sm" />
                  </div>
                  <button onClick={() => removeTransaction(item.id)} className="text-gray-300 hover:text-red-500 p-2 transition-colors active:scale-90"><Trash2 className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-5">
                  <div className="flex-1 flex gap-4 items-center bg-white rounded-2xl border border-gray-100 px-5 py-3 shadow-sm">
                    <textarea value={item.description} onChange={(e) => updateTransaction(item.id, 'description', e.target.value)} rows={1} className="w-full bg-transparent text-sm py-2 resize-none outline-none font-medium leading-relaxed" placeholder="Ghi chú nội dung bán hàng..." />
                    <VoiceInput onAudioCapture={(audio, mime) => handleVoiceForTransactionDesc(item.id, audio, mime)} isProcessing={processingField === `trans-${item.id}`} compact className="shrink-0 scale-95" />
                  </div>
                  <div className="w-full md:w-56 bg-indigo-50/50 rounded-2xl border border-indigo-100 px-6 py-4 flex items-center shadow-sm group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
                     <span className="text-[10px] font-black text-indigo-400 mr-3 uppercase group-hover:text-white/50">VND</span>
                     <input 
                      type="text" 
                      inputMode="numeric"
                      value={formatAmountInput(item.amount)} 
                      onChange={(e) => updateTransaction(item.id, 'amount', parseAmountInput(e.target.value))} 
                      className="w-full text-right bg-transparent text-xl font-black text-indigo-900 outline-none group-hover:text-white transition-colors" 
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button onClick={addTransaction} className="mt-10 w-full py-6 border-2 border-dashed border-gray-200 rounded-[32px] text-gray-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 flex items-center justify-center gap-4 font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98]">
          <Plus className="w-6 h-6" /> Thêm nghiệp vụ mới
        </button>
      </div>

      {/* Thanh điều khiển nổi (Floating Action Bar) */}
      <div className="fixed bottom-0 left-0 right-0 p-8 z-50 pointer-events-none">
        <div className="max-w-2xl mx-auto flex items-center gap-5 pointer-events-auto">
          <button 
            onClick={() => setShowResetConfirm(true)} 
            className="p-6 bg-white hover:bg-red-50 hover:text-red-600 text-gray-300 rounded-[32px] transition-all shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-50 active:scale-90"
            title="Làm mới sổ"
          >
            <RotateCcw className="w-7 h-7" />
          </button>

          <div className="flex-1 flex items-center gap-5 bg-indigo-950 px-8 py-5 rounded-[40px] border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.4)] backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex-1 overflow-hidden">
               <p className="text-xs text-white font-black uppercase tracking-[0.15em] truncate">
                 {isProcessingAI ? "AI đang lắng nghe..." : aiFeedback ? aiFeedback : "Ghi âm nhanh"}
               </p>
               {!isProcessingAI && !aiFeedback && <p className="text-[10px] text-white/30 truncate italic mt-1 font-medium">VD: "Bán hàng sáng nay 15 triệu 500 ngàn"</p>}
            </div>
            <VoiceInput onAudioCapture={handleSmartVoiceAdd} isProcessing={isProcessingAI} className="bg-white text-indigo-950 shadow-2xl scale-[1.4] hover:scale-[1.5] active:scale-125 transition-transform" />
          </div>

          <button onClick={() => setView(AppView.PREVIEW)} className="bg-indigo-600 text-white p-6 rounded-[32px] font-black shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:bg-black transition-all active:scale-95 flex items-center justify-center shrink-0">
            <FileText className="w-8 h-8" />
          </button>
        </div>
      </div>

      <InstallPWA />

      {/* Modal xác nhận xóa */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-8 backdrop-blur-2xl">
          <div className="bg-white rounded-[48px] max-w-sm w-full p-12 shadow-2xl relative border border-gray-100 text-center">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-gray-950 mb-4 uppercase tracking-tight leading-none">Xóa toàn bộ dữ liệu?</h3>
            <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">
              Sổ hiện tại sẽ bị xóa sạch để bắt đầu kỳ mới. Hành động này không thể hoàn tác.
            </p>
            <div className="flex flex-col gap-4">
              <button onClick={handleReset} className="w-full bg-red-600 text-white py-6 rounded-[28px] font-black uppercase tracking-widest shadow-xl shadow-red-200 active:scale-95 transition-all">Tôi xác nhận xóa</button>
              <button onClick={() => setShowResetConfirm(false)} className="w-full bg-gray-100 text-gray-700 py-6 rounded-[28px] font-black uppercase tracking-widest transition-colors hover:bg-gray-200">Giữ lại dữ liệu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreviewView = () => (
    <div className="animate-fade-in max-w-5xl mx-auto py-6">
      <div className="sticky top-8 z-50 bg-white/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-5 rounded-[40px] flex items-center justify-between mb-12 mx-6">
        <button onClick={() => setView(AppView.EDIT)} className="flex items-center gap-3 text-indigo-950 font-black uppercase text-[11px] tracking-widest px-8 py-4 hover:bg-indigo-50 rounded-2xl transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5" /> Quay lại sửa
        </button>
        <div className="flex gap-3">
          <button onClick={handleSendExcel} className="px-8 py-4 bg-green-600 text-white rounded-2xl shadow-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all">
            <Mail className="w-5 h-5" /> Gửi file
          </button>
          <button onClick={handleSaveToDrive} className="p-4 bg-indigo-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all" title="Lưu trữ Excel">
            <HardDrive className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="overflow-auto pb-40 px-6 flex justify-center">
         <div className="shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-sm">
            <PreviewS1a data={data} />
         </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f3f8]">
      <header className="bg-indigo-950 px-8 py-16 md:py-28 relative overflow-hidden">
        {/* Trang trí nền */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500 rounded-full -translate-y-1/2 translate-x-1/2 opacity-10 blur-[140px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full translate-y-1/2 -translate-x-1/2 opacity-10 blur-[120px]"></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-8">
            <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-inner">
               <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)]"></div>
               <p className="text-white/80 font-black text-xs uppercase tracking-[0.4em] leading-none">Cục Thuế Tỉnh Điện Biên</p>
            </div>
            <div className="space-y-4">
              <h1 className="text-6xl md:text-9xl font-black text-white uppercase tracking-tighter leading-[0.85] flex flex-col md:flex-row md:items-center gap-x-6">
                Sổ Doanh Thu 
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 drop-shadow-2xl">
                  Smart AI
                </span>
              </h1>
              <p className="text-indigo-200/50 text-sm md:text-xl font-bold uppercase tracking-[0.3em] max-w-2xl leading-relaxed">
                Hệ thống hỗ trợ lập mẫu S1a-HKD thông minh
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 -mt-16 md:-mt-28 relative z-20">
        {view === AppView.EDIT ? renderEditView() : renderPreviewView()}
      </main>

      <footer className="max-w-5xl mx-auto py-16 px-8 text-center">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.5em] opacity-30">
          Chuyên gia nghiệp vụ Tài chính & AI © 2025
        </p>
      </footer>
    </div>
  );
}
