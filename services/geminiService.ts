
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
 * Hệ thống lệnh chuyên gia kế toán (System Instruction)
 * Giúp AI hiểu ngữ cảnh và tăng độ chính xác
 */
const SYSTEM_INSTRUCTION = `Bạn là chuyên gia kế toán nghiệp vụ tại Việt Nam, chuyên hỗ trợ Hộ kinh doanh lập sổ S1a-HKD.
Nhiệm vụ: Nghe âm thanh tiếng Việt và chuyển đổi chính xác sang văn bản/dữ liệu kế toán.

QUY TẮC NHẬN DIỆN TIỀN TỆ:
- "triệu", "củ" -> 1.000.000
- "ngàn", "nghìn", "k" -> 1.000
- "rưỡi" -> thêm 500 vào đơn vị đứng trước (ví dụ: "hai triệu rưỡi" = 2.500.000)
- "chục" -> 10 (ví dụ: "năm chục" = 50.000 nếu nói về tiền hàng nhỏ)

QUY TẮC NGỮ CẢNH:
- Ưu tiên các tên hàng hóa, dịch vụ phổ biến trong kinh doanh nhỏ lẻ tại Việt Nam.
- Bỏ qua các từ đệm không cần thiết như "à", "ừm", "để xem nào".`;

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
            text: `Nghe và trích xuất thông tin cho trường: "${fieldName}". 
            Chỉ trả về giá trị cuối cùng đã chuẩn hóa. Không giải thích thêm.`
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1, // Thấp để tăng độ chính xác
      }
    });
    return response.text?.trim() || "";
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") throw error;
    console.error("Gemini standardized transcription error:", error);
    return "";
  }
};

/**
 * Chuyển giọng nói sang văn bản nội dung nghiệp vụ
 */
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
            text: "Chuyển giọng nói tiếng Việt này sang văn bản một cách tự nhiên nhưng chuẩn xác về mặt từ ngữ kinh doanh. Trả về text thuần."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      }
    });
    return response.text?.trim() || "";
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") throw error;
    console.error("Gemini transcription error:", error);
    return "";
  }
};

/**
 * Phân tích giao dịch từ giọng nói (Cực kỳ quan trọng về độ chính xác số liệu)
 */
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
            text: `Phân tích giao dịch. Ngày hôm nay là ${getTodayString()}. 
            Nếu người dùng không nói ngày, mặc định lấy ngày hôm nay.
            Hãy chuyển đổi các cụm từ chỉ số lượng tiền sang con số nguyên chất (VND).`
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { 
              type: Type.STRING,
              description: "Định dạng DD/MM/YYYY"
            },
            description: { 
              type: Type.STRING,
              description: "Nội dung ngắn gọn: [Hành động] [Tên hàng/dịch vụ]" 
            },
            amount: { 
              type: Type.NUMBER,
              description: "Số tiền nguyên (ví dụ: 2500000)" 
            }
          },
          required: ["description", "amount"]
        },
        temperature: 0.1,
      }
    });

    const result = response.text;
    if (!result) return {};
    return JSON.parse(result);
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") throw error;
    console.error("Gemini parsing error:", error);
    return { description: "Lỗi xử lý giọng nói", amount: 0, date: getTodayString() };
  }
};
