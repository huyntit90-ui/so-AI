
import { S1aFormState } from "../types";

const DB_NAME = 'S1a_HKD_Database_V3'; // Tăng version để reset các lỗi cache cũ
const DB_VERSION = 1;
const STORE_NAME = 'form_data';
const KEY = 'current_s1a_state';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log("DB: Created object store");
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error("DB: Open Error", request.error);
      reject(new Error("Cơ sở dữ liệu bị lỗi kết nối."));
    };
    
    request.onblocked = () => {
      console.warn("DB: Blocked by another tab");
      alert("Ứng dụng đang mở ở một tab khác. Vui lòng đóng tab cũ để tránh mất dữ liệu.");
      reject(new Error("Database blocked"));
    };
  });
};

export const saveToDB = async (data: S1aFormState): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Đảm bảo không lưu dữ liệu null hoặc không hợp lệ
    if (!data || !data.info) {
      console.error("DB: Attempted to save invalid data", data);
      return;
    }

    const request = store.put(data, KEY);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          db.close();
          console.log("DB: Data saved successfully");
          resolve();
        };
        transaction.onerror = () => {
          console.error("DB: Transaction error", transaction.error);
          reject(transaction.error);
        };
    });
  } catch (error) {
    console.error("DB: Critical Save Error", error);
    throw error;
  }
};

export const loadFromDB = async (): Promise<S1aFormState | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        const result = request.result;
        console.log("DB: Load result", result ? "Data found" : "Empty");
        resolve(result as S1aFormState || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("DB: Load Error", error);
    throw error; 
  }
};

export const clearDB = async (): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(KEY);
  return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
  });
};

export const importDataToDB = async (data: S1aFormState): Promise<void> => {
  await saveToDB(data);
};
