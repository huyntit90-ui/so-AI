
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
  const [data, setData] = useState<S1aFormState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingField, setProcessingField] = useState<string | null>(null); 
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [showDataSettings, setShowDataSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const savedData = await loadFromDB();
        if (savedData && savedData.transactions) {
          setData(savedData);
        } else {
          setData(SAMPLE_DATA);
        }
      } catch (err) {
        console.error("Lỗi khởi tạo dữ liệu:", err);
        setData(SAMPLE_DATA);
      } finally {
        setIsLoaded(true);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isLoaded || !data) return;
    
    const timeoutId = setTimeout(() => {
      saveToDB(data).catch(err => console.error("Lỗi lưu DB:", err));
    }, 500);

    return () => clearTimeout(timeoutId);
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
    e.target.value = ""; 
  };

  const handleInfoChange = (field: keyof TaxPayerInfo, value: string) => {
    if (!data) return;
    setData(prev => prev ? ({ ...prev, info: { ...prev.info, [field]: value } }) : null);
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
    if (!data) return;
    const newTrans: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('vi-VN'),
      description: "",
      amount: 0
    };
    setData(prev => prev ? ({ ...prev, transactions: [...prev.transactions, newTrans] }) : null);
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: string | number) => {
    if (!data) return;
    setData(prev => prev ? ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, [field]: value } : t)
    }) : null);
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
    if (!data) return;
    setData(prev => prev ? ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }) : null);
  };

  const sortTransactionsByDate = () => {
    if (!data) return;
    const sorted = [...data.transactions].sort((a, b) => {
      const parseDate = (s: string) => {
        const parts = s.split('/');
        if (parts.length < 3) return 0;
        const [d, m, y] = parts.map(Number);
        return new Date(y, m - 1, d).getTime();
      };
      return parseDate(a.date) - parseDate(b.date);
    });
    setData(prev => prev ? ({ ...prev, transactions: sorted }) : null);
    setAiFeedback("Đã sắp xếp!");
    setTimeout(() => setAiFeedback(null), 1500);
  };

  const handleSmartVoiceAdd = async (audioBase64: string, mimeType: string) => {
    if (!audioBase64 || !data) return;
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
      setData(prev => prev ? ({ ...prev, transactions: [...prev.transactions, newTrans] }) : null);
      setAiFeedback("Ghi thành công!");
      setTimeout(() => setAiFeedback(null), 1500);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleSendExcel = async () => {
    if (!data) return;
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

  if (!isLoaded || !data) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center animate-bounce shadow-xl mb-4">
          <Database className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tight">Đang tải dữ liệu...</h2>
        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-2">Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  const renderEditView = () => (
    <div className="space-y-4 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between bg-white/60 backdrop-blur-md px-5 py-4 rounded-2xl border border-white shadow-sm">
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-5 h-5 text-emerald-500" />
           <p className="text-[11px] font-black text-emerald-950 uppercase tracking-wider">Bảo mật cục bộ</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-gray-500 uppercase">Sẵn sàng Offline</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <header className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-5">
          <BookOpen className="w-6 h-6 text-indigo-950" />
          <h2 className="text-base font-black text-indigo-950 uppercase tracking-tight">Thông tin định danh</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Chủ hộ kinh doanh", key: "name" as const, placeholder: "Tên chủ hộ..." },
            { label: "Mã số thuế", key: "taxId" as const, placeholder: "Nhập MST..." },
            { label: "Kỳ kê khai", key: "period" as const, placeholder: "Tháng/Năm..." },
            { label: "Địa điểm KD", key: "location" as const, placeholder: "Nơi kinh doanh...", full: false },
            { label: "Địa chỉ cư trú", key: "address" as const, placeholder: "Địa chỉ...", full: true },
          ].map((field) => (
            <div key={field.key} className={`${field.full ? 'md:col-span-2' : ''} space-y-2`}>
              <label className="block text-[11px] font-black text-indigo-900/50 uppercase tracking-widest ml-1">{field.label}</label>
              <div className="flex items-center gap-3 relative">
                <input
                  type="text"
                  value={data.info[field.key]}
                  onChange={(e) => handleInfoChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="block w-full rounded-xl border-gray-100 bg-gray-50/50 border px-5 py-4 focus:bg-white focus:border-indigo-400 transition-all outline-none text-base font-semibold text-indigo-950 shadow-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
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

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <header className="flex items-center justify-between mb-8 border-b border-gray-50 pb-5">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-emerald-500" />
            <h2 className="text-base font-black text-indigo-950 uppercase tracking-tight">Chi tiết nghiệp vụ</h2>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={sortTransactionsByDate}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-full border border-indigo-100 transition-all group"
             >
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Sắp xếp</span>
             </button>
             <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                <span className="text-[10px] font-black text-emerald-600 uppercase">S1a-HKD</span>
             </div>
          </div>
        </header>

        <div className="space-y-4">
          {data.transactions.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30">
               <p className="text-gray-300 text-[12px] font-black uppercase tracking-widest">Chưa có bản ghi nào</p>
            </div>
          ) : (
            data.transactions.map((item, idx) => (
              <div key={item.id} className="p-5 rounded-3xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-indigo-900 bg-indigo-50 w-6 h-6 rounded-lg flex items-center justify-center">{idx + 1}</span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <input 
                        type="text" 
                        value={item.date} 
                        onChange={(e) => updateTransaction(item.id, 'date', e.target.value)} 
                        className="bg-transparent text-[11px] font-black text-indigo-600 outline-none w-24"
                      />
                    </div>
                  </div>
                  <button onClick={() => removeTransaction(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 bg-white rounded-xl border border-gray-50 hover:border-red-100 shadow-sm"><Trash2 className="w-5 h-5" /></button>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-start gap-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <textarea 
                      value={item.description} 
                      onChange={(e) => updateTransaction(item.id, 'description', e.target.value)} 
                      rows={2}
                      className="w-full bg-transparent text-base outline-none font-semibold text-indigo-950 placeholder:text-gray-200 resize-none leading-relaxed" 
                      placeholder="Ghi nội dung hàng hóa, dịch vụ..." 
                    />
                    <VoiceInput 
                      onAudioCapture={(audio, mime) => handleVoiceForTransactionDesc(item.id, audio, mime)} 
                      isProcessing={processingField === `trans-${item.id}`} 
                      compact 
                    />
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-sm">
                      <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">VNĐ</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={formatAmountInput(item.amount)} 
                        onChange={(e) => updateTransaction(item.id, 'amount', parseAmountInput(e.target.value))} 
                        className="bg-transparent text-right text-lg font-black text-indigo-950 outline-none w-32 md:w-48" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button onClick={addTransaction} className="mt-8 w-full py-5 border-2 border-dashed border-gray-100 rounded-3xl text-gray-400 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/20 flex items-center justify-center gap-3 font-black text-[12px] uppercase tracking-widest transition-all">
          <Plus className="w-5 h-5" /> Thêm giao dịch mới
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 z-[100] pointer-events-none">
        <div className="max-w-xl mx-auto flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={() => setShowDataSettings(true)} 
            className="p-5 bg-white shadow-2xl rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-gray-100"
          >
            <Settings className="w-6 h-6" />
          </button>

          <div className="flex-1 flex items-center gap-4 bg-indigo-950 px-7 py-5 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden group">
            <div className="relative flex-1 overflow-hidden">
               <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 leading-none">Trợ lý AI Điện Biên</p>
               <p className="text-[13px] text-white font-bold truncate">
                 {aiFeedback || (isProcessingAI ? "Đang lắng nghe..." : "Nhấn Micro để ghi âm")}
               </p>
            </div>
            <VoiceInput onAudioCapture={handleSmartVoiceAdd} isProcessing={isProcessingAI} className="bg-white text-indigo-950 shadow-2xl scale-[1.3] transition-all hover:scale-[1.4]" />
          </div>

          <button onClick={() => setView(AppView.PREVIEW)} className="bg-indigo-600 text-white p-5 rounded-2xl shadow-2xl hover:bg-black transition-all border border-indigo-400/20">
            <FileText className="w-7 h-7" />
          </button>
        </div>
      </div>

      <InstallPWA />

      {showDataSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-indigo-950/80 p-6 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] max-w-sm w-full p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden relative border border-gray-100">
            <button onClick={() => setShowDataSettings(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-10">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Database className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tight leading-none">Cài đặt dữ liệu</h3>
              <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-3">An toàn • Riêng tư • Vĩnh viễn</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => data && exportToJson(data)}
                className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-indigo-50 rounded-3xl transition-all border border-gray-100 group"
              >
                <div className="flex items-center gap-4">
                  <Download className="w-6 h-6 text-indigo-600" />
                  <div className="text-left">
                    <p className="text-sm font-black text-indigo-950 uppercase">Sao lưu JSON</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Lưu ra file dự phòng</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400" />
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-emerald-50 rounded-3xl transition-all border border-gray-100 group"
              >
                <div className="flex items-center gap-4">
                  <Upload className="w-6 h-6 text-emerald-600" />
                  <div className="text-left">
                    <p className="text-sm font-black text-indigo-950 uppercase">Khôi phục</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Tải lên file backup</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-400" />
              </button>
              
              <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" className="hidden" />

              <div className="pt-6 mt-6 border-t border-gray-100">
                <button onClick={handleReset} className="w-full flex items-center gap-4 p-5 text-red-500 hover:bg-red-50 rounded-3xl transition-all border border-transparent hover:border-red-100">
                  <Trash2 className="w-6 h-6" />
                  <p className="text-sm font-black uppercase">Làm mới dữ liệu</p>
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
      <div className="sticky top-4 z-50 bg-white/95 backdrop-blur-xl border border-white shadow-2xl p-4 rounded-3xl flex items-center justify-between mb-10 mx-4">
        <button onClick={() => setView(AppView.EDIT)} className="flex items-center gap-2 text-indigo-950 font-black uppercase text-[11px] tracking-widest px-5 py-3 hover:bg-indigo-50 rounded-2xl transition-all">
          <ArrowLeft className="w-5 h-5" /> Trở lại
        </button>
        <div className="flex gap-3">
          <button onClick={handleSendExcel} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-emerald-700">
            <Mail className="w-5 h-5" /> Gửi báo cáo
          </button>
        </div>
      </div>
      <div className="overflow-auto pb-48 px-4 flex justify-center">
         <div className="shadow-2xl rounded-2xl bg-white p-2 transform origin-top md:scale-100 scale-95 border border-gray-100">
            <PreviewS1a data={data} />
         </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <header className="bg-indigo-950 px-6 pt-10 pb-12 md:pt-16 md:pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.08] blur-[100px]"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6">
            <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-2xl">
               <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]"></div>
               <p className="text-white/90 font-black text-[10px] uppercase tracking-[0.2em] leading-none">Cục Thuế tỉnh Điện Biên</p>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-sm">
                Sổ chi tiết doanh thu <br className="md:hidden" />
                <span className="text-indigo-400">Hộ kinh doanh S1A</span>
              </h1>
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-950 px-5 py-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider shadow-2xl border border-yellow-300 hover:scale-105 transition-transform cursor-default">
                <Sparkles className="w-4 h-4" />
                Ứng dụng AI thông minh cho HKD
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 -mt-10 md:-mt-16 relative z-20">
        {view === AppView.EDIT ? renderEditView() : renderPreviewView()}
      </main>

      <footer className="max-w-4xl mx-auto py-12 px-6 text-center">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.6em] opacity-30">
          Digital Tax Solutions © 2025 • Bảo mật & Tin cậy
        </p>
      </footer>
    </div>
  );
}
