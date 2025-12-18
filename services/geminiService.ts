
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

// Helper to get today's date in DD/MM/YYYY
const getTodayString = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Khởi tạo AI an toàn
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Hàm ghi âm và chuẩn hóa thông tin hành chính
 */
export const transcribeStandardizedInfo = async (
  audioBase64: string, 
  fieldName: string,
  mimeType: string = "audio/webm"
): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: `Bạn là trợ lý kế toán chuyên nghiệp. Hãy nghe âm thanh và trích xuất thông tin cho trường "${fieldName}".
            
            QUY TẮC ĐỊNH DẠNG:
            1. Nếu là "Kỳ kê khai": 
               - Chuyển thành định dạng: "Tháng MM/YYYY", "Quý Q/YYYY" hoặc "Năm YYYY".
            2. Nếu là "Địa chỉ" hoặc "Địa điểm kinh doanh":
               - Viết hoa các chữ cái đầu, ngăn cách bằng dấu phẩy.
            3. Nếu là "Họ tên": Viết hoa toàn bộ chữ cái đầu.
            4. Nếu là "Mã số thuế": Chỉ trả về dãy số.
            
            Chỉ trả về nội dung đã chuẩn hóa, KHÔNG thêm lời dẫn.`
          }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") throw error;
    console.error("Gemini standardized transcription error:", error);
    return "";
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string = "audio/webm"): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: "Hãy viết lại chính xác những gì người dùng nói bằng tiếng Việt. Chỉ trả về nội dung văn bản."
          }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") throw error;
    console.error("Gemini transcription error:", error);
    return "";
  }
};

export const parseTransactionFromAudio = async (audioBase64: string, mimeType: string = "audio/webm"): Promise<Partial<Transaction>> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: `Bạn là trợ lý kế toán. Trích xuất giao dịch. Ngày hiện tại: ${getTodayString()}. Trả về JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER }
          },
          required: ["description", "amount"]
        }
      }
    });

    const result = response.text;
    if (!result) return {};
    return JSON.parse(result);
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") throw error;
    console.error("Gemini parsing error:", error);
    return { description: "Lỗi xử lý AI", amount: 0, date: getTodayString() };
  }
};
