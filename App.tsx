
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Trash2, Plus, ArrowLeft, Download, FileText, DollarSign, FileSpreadsheet, RotateCcw, Smartphone, X, Mail, Sparkles, Database, HardDrive, AlertTriangle, ShieldCheck, Key, HelpCircle, ExternalLink, Settings, PlayCircle, RefreshCw, CheckCircle2, WifiOff, Copy, Check, Search, FolderOpen, CloudUpload, Monitor, Rocket, Globe, AlertCircle, ChevronRight, LayoutDashboard, Calendar, Upload, Clock } from 'lucide-react';
import { S1aFormState, Transaction, AppView, TaxPayerInfo } from './types';
import VoiceInput from './components/VoiceInput';
import PreviewS1a from './components/PreviewS1a';
import InstallPWA from './components/InstallPWA';
import { parseTransactionFromAudio, transcribeAudio, transcribeStandardizedInfo } from './services/geminiService';
import { exportToDoc, exportToExcel, generateExcelBlob, exportToJson } from './utils/exportUtils';
import { saveToDB, loadFromDB, clearDB, importDataToDB } from './services/db';

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
  const [showDataSettings, setShowDataSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu hiện tại?")) {
      await clearDB();
      setData(SAMPLE_DATA);
      setShowDataSettings(false);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as S1aFormState;
        
        // Kiểm tra sơ bộ cấu trúc
        if (parsed.info && Array.isArray(parsed.transactions)) {
          await importDataToDB(parsed);
          setData(parsed);
          alert("Khôi phục dữ liệu thành công!");
          setShowDataSettings(false);
        } else {
          alert("File không đúng định dạng sao lưu.");
        }
      } catch (err) {
        alert("Lỗi khi đọc file. Vui lòng thử lại.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const handleInfoChange = (field: keyof TaxPayerInfo, value: string) => {
    setData(prev => ({ ...prev, info: { ...prev.info, [field]: value } }));
  };

  const handleError = (e: any) => {
    setAiFeedback("Đang thử kết nối lại...");
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

  const sortTransactionsByDate = () => {
    const sorted = [...data.transactions].sort((a, b) => {
      const parseDate = (s: string) => {
        const parts = s.split('/');
        if (parts.length < 3) return 0;
        const [d, m, y] = parts.map(Number);
        return new Date(y, m - 1, d).getTime();
      };
      return parseDate(a.date) - parseDate(b.date);
    });
    setData(prev => ({ ...prev, transactions: sorted }));
    setAiFeedback("Đã sắp xếp ngày!");
    setTimeout(() => setAiFeedback(null), 1500);
  };

  const handleSmartVoiceAdd = async (audioBase64: string, mimeType: string) => {
    if (!audioBase64) return;
    setIsProcessingAI(true);
    setAiFeedback("AI đang phân tích...");
    try {
      const result = await parseTransactionFromAudio(audioBase64, mimeType);
      const newTrans: Transaction = {
        id: Date.now().toString(),
        date: result.date || new Date().toLocaleDateString('vi-VN'),
        description: result.description || "Giao dịch ghi bằng AI",
        amount: result.amount || 0
      };
      setData(prev => ({ ...prev, transactions: [...prev.transactions, newTrans] }));
      setAiFeedback("Ghi thành công!");
      setTimeout(() => setAiFeedback(null), 1500);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessingAI(false);
    }
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
    <div className="space-y-4 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Privacy Indicator */}
      <div className="flex items-center justify-between bg-white/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white shadow-sm">
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-4 h-4 text-emerald-500" />
           <p className="text-[10px] font-black text-emerald-950 uppercase tracking-wider">Dữ liệu được bảo mật cục bộ</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
           <span className="text-[9px] font-bold text-gray-500 uppercase">Hoạt động Offline</span>
        </div>
      </div>

      {/* A. Administrative Information */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <header className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
          <BookOpen className="w-5 h-5 text-indigo-950" />
          <h2 className="text-sm font-black text-indigo-950 uppercase tracking-tight">Thông tin định danh</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Chủ hộ kinh doanh", key: "name" as const, placeholder: "Tên chủ hộ..." },
            { label: "Mã số thuế", key: "taxId" as const, placeholder: "Nhập MST..." },
            { label: "Kỳ kê khai", key: "period" as const, placeholder: "Tháng/Năm..." },
            { label: "Địa điểm KD", key: "location" as const, placeholder: "Nơi kinh doanh...", full: false },
            { label: "Địa chỉ cư trú", key: "address" as const, placeholder: "Địa chỉ...", full: true },
          ].map((field) => (
            <div key={field.key} className={`${field.full ? 'md:col-span-2' : ''} space-y-1.5`}>
              <label className="block text-[9px] font-black text-indigo-900/40 uppercase tracking-widest ml-1">{field.label}</label>
              <div className="flex items-center gap-2 relative">
                <input
                  type="text"
                  value={data.info[field.key]}
                  onChange={(e) => handleInfoChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="block w-full rounded-xl border-gray-100 bg-gray-50/50 border px-4 py-3 focus:bg-white focus:border-indigo-400 transition-all outline-none text-sm font-semibold text-indigo-950"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <VoiceInput 
                    onAudioCapture={(audio, mime) => handleVoiceForField(field.key, field.label, audio, mime)} 
                    isProcessing={processingField === field.key} 
                    compact 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* B. Transactions List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <header className="flex items-center justify-between mb-6 border-b border-gray-50 pb-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-black text-indigo-950 uppercase tracking-tight">Chi tiết nghiệp vụ</h2>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={sortTransactionsByDate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-full border border-indigo-100 transition-all group"
                title="Sắp xếp theo thời gian"
             >
                <Clock className="w-3 h-3 text-indigo-600" />
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">Sắp xếp</span>
             </button>
             <div className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <span className="text-[9px] font-black text-emerald-600 uppercase">S1a-HKD</span>
             </div>
          </div>
        </header>

        <div className="space-y-3">
          {data.transactions.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-50 rounded-2xl">
               <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest">Không có dữ liệu</p>
            </div>
          ) : (
            data.transactions.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-indigo-900 bg-indigo-50 w-5 h-5 rounded flex items-center justify-center">{idx + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      <input 
                        type="text" 
                        value={item.date} 
                        onChange={(e) => updateTransaction(item.id, 'date', e.target.value)} 
                        className="bg-transparent text-[10px] font-bold text-indigo-600 outline-none w-20 border-b border-transparent focus:border-indigo-100"
                      />
                    </div>
                  </div>
                  <button onClick={() => removeTransaction(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <textarea 
                      value={item.description} 
                      onChange={(e) => updateTransaction(item.id, 'description', e.target.value)} 
                      rows={2}
                      className="w-full bg-transparent text-sm outline-none font-medium text-indigo-950 placeholder:text-gray-200 resize-none leading-relaxed" 
                      placeholder="Nội dung chi tiết hàng hóa, dịch vụ..." 
                    />
                    <VoiceInput 
                      onAudioCapture={(audio, mime) => handleVoiceForTransactionDesc(item.id, audio, mime)} 
                      isProcessing={processingField === `trans-${item.id}`} 
                      compact 
                    />
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 flex items-center gap-3">
                      <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">VND</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={formatAmountInput(item.amount)} 
                        onChange={(e) => updateTransaction(item.id, 'amount', parseAmountInput(e.target.value))} 
                        className="bg-transparent text-right text-base font-black text-indigo-950 outline-none w-28 md:w-40" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button onClick={addTransaction} className="mt-6 w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/20 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all">
          <Plus className="w-4 h-4" /> Thêm nghiệp vụ mới
        </button>
      </div>

      {/* Simplified Control Dock */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 z-[100] pointer-events-none">
        <div className="max-w-xl mx-auto flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => setShowDataSettings(true)} 
            className="p-4 bg-white shadow-lg rounded-2xl text-gray-300 hover:text-indigo-600 transition-all border border-gray-50"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-3 bg-indigo-950 px-6 py-4 rounded-[28px] shadow-2xl border border-white/10 relative overflow-hidden group">
            <div className="relative flex-1 overflow-hidden">
               <p className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-0.5 leading-none">AI Assistant</p>
               <p className="text-[11px] text-white font-bold truncate">
                 {aiFeedback || (isProcessingAI ? "Processing..." : "Nhấn mic để ghi nhanh")}
               </p>
            </div>
            <VoiceInput onAudioCapture={handleSmartVoiceAdd} isProcessing={isProcessingAI} className="bg-white text-indigo-950 shadow-xl scale-[1.2] transition-all" />
          </div>

          <button onClick={() => setView(AppView.PREVIEW)} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-black transition-all">
            <FileText className="w-6 h-6" />
          </button>
        </div>
      </div>

      <InstallPWA />

      {/* Data Management Modal (Includes Backup/Restore) */}
      {showDataSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-indigo-950/70 p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl overflow-hidden relative">
            <button onClick={() => setShowDataSettings(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-indigo-950 uppercase tracking-tight">Quản lý dữ liệu</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Bảo mật & Sao lưu an toàn</p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => exportToJson(data)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-indigo-50 rounded-2xl transition-all border border-gray-100 group"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-indigo-600" />
                  <div className="text-left">
                    <p className="text-xs font-black text-indigo-950 uppercase">Sao lưu dữ liệu</p>
                    <p className="text-[9px] text-gray-500 uppercase">Xuất file .JSON dự phòng</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-emerald-50 rounded-2xl transition-all border border-gray-100 group"
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <div className="text-left">
                    <p className="text-xs font-black text-indigo-950 uppercase">Khôi phục dữ liệu</p>
                    <p className="text-[9px] text-gray-500 uppercase">Nhập từ file .JSON đã lưu</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-400" />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportJson} 
                accept=".json" 
                className="hidden" 
              />

              <div className="pt-4 mt-4 border-t border-gray-100">
                <button 
                  onClick={handleReset} 
                  className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  <p className="text-xs font-black uppercase">Xóa toàn bộ dữ liệu</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreviewView = () => (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto py-4">
      <div className="sticky top-4 z-50 bg-white/90 backdrop-blur-lg border border-white shadow-xl p-3 rounded-2xl flex items-center justify-between mb-8 mx-4">
        <button onClick={() => setView(AppView.EDIT)} className="flex items-center gap-2 text-indigo-950 font-black uppercase text-[9px] tracking-widest px-4 py-3 hover:bg-indigo-50 rounded-xl transition-all">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="flex gap-2">
          <button onClick={handleSendExcel} className="px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all">
            <Mail className="w-4 h-4" /> Gửi báo cáo
          </button>
        </div>
      </div>
      <div className="overflow-auto pb-48 px-4 flex justify-center">
         <div className="shadow-2xl rounded-xl bg-white p-2 transform origin-top md:scale-100 scale-90">
            <PreviewS1a data={data} />
         </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Refined Small Banner */}
      <header className="bg-indigo-950 px-6 pt-8 pb-10 md:pt-12 md:pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-400 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.05] blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
               <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
               <p className="text-white/80 font-black text-[8px] uppercase tracking-[0.2em] leading-none">Thuế tỉnh Điện Biên</p>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter leading-tight">
                Sổ doanh thu <br className="md:hidden" />
                <span className="text-indigo-400">bán hàng hóa, dịch vụ S1A</span>
              </h1>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-950 px-4 py-2 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider shadow-[0_10px_30px_rgba(251,191,36,0.2)] border border-yellow-300">
                <Sparkles className="w-3.5 h-3.5" />
                Sản phẩm miễn phí hỗ trợ hộ kinh doanh
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 -mt-6 md:-mt-10 relative z-20">
        {view === AppView.EDIT ? renderEditView() : renderPreviewView()}
      </main>

      <footer className="max-w-4xl mx-auto py-10 px-6 text-center">
        <p className="text-gray-400 text-[8px] font-black uppercase tracking-[0.6em] opacity-20">
          Digital Tax Solutions © 2025
        </p>
      </footer>
    </div>
  );
}
