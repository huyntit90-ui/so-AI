
import React from 'react';
import { S1aFormState } from '../types';

interface PreviewProps {
  data: S1aFormState;
}

const PreviewS1a: React.FC<PreviewProps> = ({ data }) => {
  const totalAmount = data.transactions.reduce((sum, t) => sum + t.amount, 0);
  const today = new Date();

  return (
    <div className="bg-white p-8 md:p-12 max-w-[210mm] mx-auto shadow-lg border border-gray-200 text-black font-serif text-sm leading-relaxed" id="s1a-preview">
      <style>{`
        .preview-table th, .preview-table td { border: 1px solid black; padding: 8px; }
        .preview-table thead th { font-weight: bold; }
      `}</style>
      
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div className="w-[55%]">
          <p className="font-bold mb-1">HỘ, CÁ NHÂN KINH DOANH: <span className="font-normal underline decoration-dotted">{data.info.name || "........................"}</span></p>
          <p className="font-bold mb-1">Địa chỉ: <span className="font-normal underline decoration-dotted">{data.info.address || "................................................"}</span></p>
          <p className="font-bold mb-1">Mã số thuế: <span className="font-normal underline decoration-dotted">{data.info.taxId || "........................"}</span></p>
        </div>
        <div className="w-[45%] text-center">
          <p className="font-bold text-base">Mẫu số S1a-HKD</p>
          <p className="italic text-[11px] leading-tight mt-1">
            (Ban hành kèm theo Thông tư số .../2025/TT-BTC<br/>
            ngày ... tháng ... năm 2025 của Bộ trưởng<br/>
            Bộ Tài chính)
          </p>
        </div>
      </div>

      {/* Main Title */}
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold uppercase mb-2">SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h1>
        <p className="mb-1">Địa điểm kinh doanh: <span className="underline decoration-dotted">{data.info.location || "................................"}</span></p>
        <p>Kỳ kê khai: <span className="underline decoration-dotted">{data.info.period || "................................"}</span></p>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse mb-8 preview-table">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-center w-32">Ngày tháng</th>
            <th className="text-center">Giao dịch</th>
            <th className="text-center w-40">Số tiền</th>
          </tr>
          <tr>
            <th className="text-center italic font-normal text-xs">A</th>
            <th className="text-center italic font-normal text-xs">B</th>
            <th className="text-center italic font-normal text-xs">1</th>
          </tr>
        </thead>
        <tbody>
          {data.transactions.length === 0 ? (
            <tr>
              <td colSpan={3} className="p-10 text-center text-gray-400 italic">Chưa có dữ liệu giao dịch</td>
            </tr>
          ) : (
            data.transactions.map((t, idx) => (
              <tr key={t.id || idx}>
                <td className="text-center align-middle">{t.date}</td>
                <td className="align-middle px-4">{t.description}</td>
                <td className="text-right align-middle font-mono">{t.amount.toLocaleString('vi-VN')}</td>
              </tr>
            ))
          )}
          
          {/* Total Row */}
          <tr className="font-bold bg-gray-50">
            <td className="border-l border-r border-black border-b border-t-0"></td>
            <td className="text-center py-3">Tổng cộng</td>
            <td className="text-right py-3 font-mono">{totalAmount.toLocaleString('vi-VN')}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer / Signature Section */}
      <div className="flex justify-end mt-12">
        <div className="text-center w-1/2">
          <p className="italic mb-2 text-[13px]">Ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}</p>
          <p className="font-bold uppercase leading-tight">
            NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/<br/>
            CÁ NHÂN KINH DOANH
          </p>
          <p className="italic text-[11px] mt-1">(Ký, họ tên, đóng dấu)</p>
          <div className="h-28"></div>
          <p className="font-bold text-base">{data.info.name}</p>
        </div>
      </div>
    </div>
  );
};

export default PreviewS1a;
