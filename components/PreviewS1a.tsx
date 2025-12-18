
import React from 'react';
import { S1aFormState } from '../types';

interface PreviewProps {
  data: S1aFormState;
}

const PreviewS1a: React.FC<PreviewProps> = ({ data }) => {
  const totalAmount = data.transactions.reduce((sum, t) => sum + t.amount, 0);
  const today = new Date();

  return (
    <div className="bg-white p-10 md:p-14 max-w-[210mm] mx-auto shadow-lg border border-gray-200 text-black font-serif text-base leading-relaxed" id="s1a-preview">
      <style>{`
        .preview-table th, .preview-table td { border: 1px solid black; padding: 10px; }
        .preview-table thead th { font-weight: bold; font-size: 14px; }
        .preview-table td { font-size: 14px; }
      `}</style>
      
      {/* Header Section */}
      <div className="flex justify-between items-start mb-10">
        <div className="w-[55%]">
          <p className="font-bold mb-1.5 uppercase text-[13px]">HỘ KINH DOANH: <span className="font-normal underline decoration-dotted">{data.info.name || "........................"}</span></p>
          <p className="font-bold mb-1.5 uppercase text-[13px]">Địa chỉ: <span className="font-normal underline decoration-dotted text-[13px]">{data.info.address || "................................................"}</span></p>
          <p className="font-bold mb-1.5 uppercase text-[13px]">Mã số thuế: <span className="font-normal underline decoration-dotted">{data.info.taxId || "........................"}</span></p>
        </div>
        <div className="w-[45%] text-center">
          <p className="font-bold text-lg">Mẫu số S1a-HKD</p>
          <p className="italic text-[12px] leading-tight mt-1.5">
            (Ban hành kèm theo Thông tư số .../2021/TT-BTC<br/>
            ngày ... tháng ... năm 2021 của Bộ trưởng<br/>
            Bộ Tài chính)
          </p>
        </div>
      </div>

      {/* Main Title */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold uppercase mb-3">SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h1>
        <p className="mb-1.5 font-bold">Địa điểm kinh doanh: <span className="underline decoration-dotted font-normal">{data.info.location || "................................"}</span></p>
        <p className="font-bold">Kỳ kê khai: <span className="underline decoration-dotted font-normal">{data.info.period || "................................"}</span></p>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse mb-10 preview-table">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="text-center w-36">Ngày tháng</th>
            <th className="text-center">Giao dịch nghiệp vụ</th>
            <th className="text-center w-44">Số tiền (VNĐ)</th>
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
              <td colSpan={3} className="p-16 text-center text-gray-400 italic font-sans text-sm">Chưa có dữ liệu giao dịch</td>
            </tr>
          ) : (
            data.transactions.map((t, idx) => (
              <tr key={t.id || idx}>
                <td className="text-center align-middle">{t.date}</td>
                <td className="align-middle px-5 font-sans font-medium text-[15px]">{t.description}</td>
                <td className="text-right align-middle font-mono font-bold text-[15px]">{t.amount.toLocaleString('vi-VN')}</td>
              </tr>
            ))
          )}
          
          {/* Total Row */}
          <tr className="font-bold bg-gray-50/50">
            <td className="border-l border-r border-black border-b border-t-0"></td>
            <td className="text-center py-4 uppercase tracking-wider text-[14px]">Tổng cộng doanh thu</td>
            <td className="text-right py-4 font-mono text-lg">{totalAmount.toLocaleString('vi-VN')}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer / Signature Section */}
      <div className="flex justify-end mt-16">
        <div className="text-center w-1/2">
          <p className="italic mb-3 text-[14px]">Ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}</p>
          <p className="font-bold uppercase leading-tight text-[15px]">
            NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/<br/>
            CÁ NHÂN KINH DOANH
          </p>
          <p className="italic text-[12px] mt-2">(Ký, họ tên, đóng dấu)</p>
          <div className="h-32"></div>
          <p className="font-bold text-lg uppercase underline">{data.info.name}</p>
        </div>
      </div>
    </div>
  );
};

export default PreviewS1a;
