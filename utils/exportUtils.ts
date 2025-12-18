
import { S1aFormState } from '../types';

export const generateHTMLContent = (data: S1aFormState) => {
    const total = data.transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('vi-VN');
    const today = new Date();
    
    const rows = data.transactions.map(t => `
        <tr>
            <td style="border:1px solid black; padding: 5px; text-align: center;">${t.date}</td>
            <td style="border:1px solid black; padding: 5px;">${t.description}</td>
            <td style="border:1px solid black; padding: 5px; text-align: right;">${t.amount.toLocaleString('vi-VN')}</td>
        </tr>
    `).join('');

    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.3; }
            table { border-collapse: collapse; width: 100%; }
            .header-table td { border: none; vertical-align: top; padding: 0; }
            .data-table th, .data-table td { border: 1px solid black; padding: 8px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .italic { font-style: italic; }
            .uppercase { text-transform: uppercase; }
        </style>
    </head>
    <body>
        <table class="header-table" style="margin-bottom: 20px;">
            <tr>
                <td style="width: 55%;">
                    <p style="margin: 0;"><strong>HỘ, CÁ NHÂN KINH DOANH:</strong> ${data.info.name || '................................'}</p>
                    <p style="margin: 0;"><strong>Địa chỉ:</strong> ${data.info.address || '................................................'}</p>
                    <p style="margin: 0;"><strong>Mã số thuế:</strong> ${data.info.taxId || '................................'}</p>
                </td>
                <td style="width: 45%; text-align: center;">
                    <p style="margin: 0;" class="bold">Mẫu số S1a-HKD</p>
                    <p style="margin: 0; font-size: 11pt;" class="italic">
                        (Ban hành kèm theo Thông tư số .../2025/TT-BTC<br>
                        ngày ... tháng ... năm 2025 của Bộ trưởng<br>
                        Bộ Tài chính)
                    </p>
                </td>
            </tr>
        </table>

        <div class="center" style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 5px 0; font-size: 14pt;" class="uppercase bold">SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h3>
            <p style="margin: 0;">Địa điểm kinh doanh: ${data.info.location || '................................'}</p>
            <p style="margin: 0;">Kỳ kê khai: ${data.info.period || '................................'}</p>
        </div>

        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 120px;" class="center bold">Ngày tháng</th>
                    <th class="center bold">Giao dịch</th>
                    <th style="width: 150px;" class="center bold">Số tiền</th>
                </tr>
                <tr>
                    <th class="center italic" style="font-weight: normal;">A</th>
                    <th class="center italic" style="font-weight: normal;">B</th>
                    <th class="center italic" style="font-weight: normal;">1</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                <tr>
                    <td style="border: 1px solid black;"></td>
                    <td class="center bold" style="border: 1px solid black;">Tổng cộng</td>
                    <td class="right bold" style="border: 1px solid black;">${total}</td>
                </tr>
            </tbody>
        </table>

        <table class="header-table" style="margin-top: 40px;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    <p class="italic" style="margin: 0;">Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}</p>
                    <p class="bold uppercase" style="margin: 5px 0 0 0;">NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/<br>CÁ NHÂN KINH DOANH</p>
                    <p class="italic" style="margin: 0; font-size: 10pt;">(Ký, họ tên, đóng dấu)</p>
                    <br><br><br><br>
                    <p class="bold">${data.info.name}</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

export const generateExcelBlob = (data: S1aFormState): Blob => {
    const total = data.transactions.reduce((sum, t) => sum + t.amount, 0);
    const today = new Date();
    
    const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
            body { font-family: 'Times New Roman'; }
            .title { font-size: 14pt; font-weight: bold; text-align: center; }
            .header-info { font-weight: bold; }
            .table-header { font-weight: bold; text-align: center; border: .5pt solid windowtext; background-color: #E2E8F0; }
            .table-index { font-style: italic; text-align: center; border: .5pt solid windowtext; }
            .number-cell { border: .5pt solid windowtext; mso-number-format:"\#\,\#\#0"; text-align: right; }
            .text-cell { border: .5pt solid windowtext; mso-number-format:"\@"; }
            .date-cell { border: .5pt solid windowtext; text-align: center; }
            .total-label { border: .5pt solid windowtext; font-weight: bold; text-align: center; }
            .footer-sign { text-align: center; }
        </style>
    </head>
    <body>
        <table>
            <!-- Header Section -->
            <tr>
                <td colspan="2" class="header-info">HỘ, CÁ NHÂN KINH DOANH: ${data.info.name || '.......'}</td>
                <td style="text-align: center; font-weight: bold;">Mẫu số S1a-HKD</td>
            </tr>
            <tr>
                <td colspan="2" class="header-info">Địa chỉ: ${data.info.address || '.......'}</td>
                <td style="text-align: center; font-style: italic; font-size: 10pt;">(Ban hành kèm theo Thông tư số .../2025/TT-BTC)</td>
            </tr>
            <tr>
                <td colspan="2" class="header-info">Mã số thuế: ${data.info.taxId || '.......'}</td>
                <td></td>
            </tr>
            
            <tr><td colspan="3"></td></tr>

            <!-- Title Section -->
            <tr>
                <td colspan="3" class="title">SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</td>
            </tr>
            <tr>
                <td colspan="3" style="text-align: center;">Địa điểm kinh doanh: ${data.info.location || '.......'}</td>
            </tr>
            <tr>
                <td colspan="3" style="text-align: center;">Kỳ kê khai: ${data.info.period || '.......'}</td>
            </tr>

            <tr><td colspan="3"></td></tr>

            <!-- Table Header -->
            <tr>
                <td class="table-header" style="width: 120px;">Ngày tháng</td>
                <td class="table-header" style="width: 350px;">Giao dịch</td>
                <td class="table-header" style="width: 150px;">Số tiền</td>
            </tr>
            <tr>
                <td class="table-index">A</td>
                <td class="table-index">B</td>
                <td class="table-index">1</td>
            </tr>

            <!-- Data Rows -->
            ${data.transactions.map(t => `
            <tr>
                <td class="date-cell">${t.date}</td>
                <td class="text-cell">${t.description}</td>
                <td class="number-cell">${t.amount}</td>
            </tr>
            `).join('')}

            <!-- Total Row -->
            <tr>
                <td style="border-left: .5pt solid windowtext; border-bottom: .5pt solid windowtext;"></td>
                <td class="total-label">Tổng cộng</td>
                <td class="number-cell" style="font-weight: bold;">${total}</td>
            </tr>

            <tr><td colspan="3"></td></tr>
            <tr><td colspan="3"></td></tr>

            <!-- Footer Section -->
            <tr>
                <td></td>
                <td></td>
                <td class="footer-sign" style="font-style: italic;">Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}</td>
            </tr>
            <tr>
                <td></td>
                <td></td>
                <td class="footer-sign" style="font-weight: bold;">NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/</td>
            </tr>
            <tr>
                <td></td>
                <td></td>
                <td class="footer-sign" style="font-weight: bold;">CÁ NHÂN KINH DOANH</td>
            </tr>
            <tr>
                <td></td>
                <td></td>
                <td class="footer-sign" style="font-style: italic; font-size: 9pt;">(Ký, họ tên, đóng dấu)</td>
            </tr>
            <tr><td colspan="3"></td></tr>
            <tr><td colspan="3"></td></tr>
            <tr><td colspan="3"></td></tr>
            <tr>
                <td></td>
                <td></td>
                <td class="footer-sign" style="font-weight: bold;">${data.info.name}</td>
            </tr>
        </table>
    </body>
    </html>
    `;
    return new Blob(['\ufeff', excelContent], { type: 'application/vnd.ms-excel' });
};

export const exportToDoc = (data: S1aFormState) => {
    const html = generateHTMLContent(data);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `S1a-HKD-${data.info.name || 'So-Doanh-Thu'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToExcel = (data: S1aFormState) => {
    const blob = generateExcelBlob(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `S1a-HKD-${data.info.name || 'So-Doanh-Thu'}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToJson = (data: S1aFormState) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `S1a-HKD-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
