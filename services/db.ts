
import { S1aFormState } from "../types";

const DB_NAME = 'S1a_HKD_Database_V2'; // Nâng cấp version để đảm bảo sạch sẽ
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
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB Open Error:", request.error);
      reject(new Error("Không thể mở cơ sở dữ liệu. Vui lòng làm mới trang."));
    };
    
    request.onblocked = () => {
      reject(new Error("Cơ sở dữ liệu đang bị khóa bởi tab khác. Vui lòng đóng các tab cũ."));
    };
  });
};

export const saveToDB = async (data: S1aFormState): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(data, KEY);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Critical Save Error:", error);
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
        resolve(request.result as S1aFormState || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    // Quan trọng: ném lỗi ra ngoài để App xử lý thay vì trả về null
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
