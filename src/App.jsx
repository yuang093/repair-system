import React, { useState, useEffect, useMemo } from 'react';
// 1. Firebase 核心功能引入
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Settings, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  MapPin, 
  Phone, 
  Calendar,
  X,
  Save,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  List,
  CheckSquare,
  BarChart3,
  User,
  Wrench,
  Package,
  Timer,
  Siren,
  Camera,
  Image as ImageIcon,
  Loader2,
  FileDown,
  ShieldCheck // New Icon for Warranty
} from 'lucide-react';

// --- [已啟用] Word 下載功能套件 ---
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyD4lGldiZHjV_Pybir3642ua-elHjY7-KA",
  authDomain: "repair-system-effc6.firebaseapp.com",
  projectId: "repair-system-effc6",
  storageBucket: "repair-system-effc6.firebasestorage.app",
  messagingSenderId: "909879213352",
  appId: "1:909879213352:web:edcc536b1ce7699fe5241d"
};

// --- Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 定義 appId 用於資料庫路徑
const appId = 'repair-system-v1';

// --- Constants & Options ---
const ADMIN_PASSWORD = "@113cctv";
const EQUIPMENT_TYPES = [
  "攝影機", "錄影主機", "不斷電系統", 
  "門禁系統", "廣播系統", "調帶系統", "網路設備", 
  "伺服器", "線路耗材", "其他"
];
const STATUS_OPTIONS = ["未完成", "處理中", "待料中", "已完成"];
const WARRANTY_OPTIONS = ["未過保", "已過保"]; // 新增保固選項

// --- Helper Functions ---
const calculateDaysLeft = (startDate) => {
  if (!startDate) return 90;
  const start = startDate.toDate ? startDate.toDate() : new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return 90 - diffDays;
};

const formatDate = (dateObj) => {
  if (!dateObj) return '';
  const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
  return date.toLocaleString('zh-TW', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' });
};

const getQuarter = (dateObj) => {
  if (!dateObj) return 'Unknown';
  const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month <= 3) return `${year} Q1`;
  if (month <= 6) return `${year} Q2`;
  if (month <= 9) return `${year} Q3`;
  return `${year} Q4`;
};

// --- Word Document Generation Helper ---
const generateWordDocument = async (record) => {
  try {
    // 1. 讀取 public 資料夾中的樣板檔
    const response = await fetch('/fix.docx');
    if (!response.ok) {
      throw new Error('找不到樣板檔 (public/fix.docx)，請確認檔案是否存在。');
    }
    const content = await response.arrayBuffer();

    // 2. 解壓縮內容
    const zip = new PizZip(content);

    // 3. 解析樣板
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 4. 準備資料
    const dateStr = record.maintenanceDate 
      ? new Date(record.maintenanceDate).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '';

    // 5. 渲染文件 (將資料填入 {變數} 中)
    doc.render({
      subject: record.subject || '',
      status: record.status || '',
      location: record.location || '',
      contactPerson: record.contactPerson || '',
      date: dateStr,
      content: record.content || '',
      reportLog: record.reportLog || '',
      processLog: record.processLog || '', 
      feedbackLog: record.feedbackLog || '', 
      partsUsed: record.partsUsed || '',
      repairStaff: record.repairStaff || '',
      warrantyStatus: record.warrantyStatus || '', // 傳入保固狀態供 Word 使用
    });

    // 6. 產生 Blob
    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // 7. 下載檔案
    saveAs(out, `${record.subject}_維修報告書.docx`);

  } catch (error) {
    console.error("Generate Word Error:", error);
    alert(`產生 Word 檔失敗: ${error.message}`);
  }
};

// --- Image Compression Helper ---
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // 限制最大寬度
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Components ---

const StatusBadge = ({ status, startDate }) => {
  const daysLeft = calculateDaysLeft(startDate);
  let colorClass = "bg-gray-100 text-gray-800";
  
  if (status === "已完成") {
    colorClass = "bg-green-100 text-green-800";
  } else if (status === "待料中") {
    colorClass = "bg-yellow-100 text-yellow-800";
  } else if (status === "處理中") {
    colorClass = "bg-purple-100 text-purple-800";
  } else {
    if (daysLeft < 0) colorClass = "bg-red-100 text-red-800";
    else if (daysLeft < 30) colorClass = "bg-orange-100 text-orange-800";
    else colorClass = "bg-blue-100 text-blue-800";
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${colorClass}`}>
      {status === "已完成" ? <CheckCircle size={12} /> : <Clock size={12} />}
      {status}
      {status !== "已完成" && (
        <span className="ml-1 text-[10px] opacity-75 hidden sm:inline">
          ({daysLeft < 0 ? `逾期${Math.abs(daysLeft)}天` : `剩${daysLeft}天`})
        </span>
      )}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 overflow-hidden">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50 rounded-t-lg shrink-0">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const AnalysisReport = ({ records }) => {
  const stats = useMemo(() => {
    const grouped = {};
    
    records.forEach(r => {
      const quarter = getQuarter(r.maintenanceDate);
      if (!grouped[quarter]) {
        grouped[quarter] = {
          total: 0,
          completed: 0,
          totalDurationDays: 0, 
          completedWithDuration: 0, 
          equipmentCounts: {}
        };
      }
      
      const g = grouped[quarter];
      g.total += 1;
      
      if (r.status === '已完成') {
        g.completed += 1;
        
        let endDate = null;
        if (r.completedAt) {
          endDate = r.completedAt.toDate ? r.completedAt.toDate() : new Date(r.completedAt);
        } else if (r.updatedAt) {
          endDate = r.updatedAt.toDate ? r.updatedAt.toDate() : new Date(r.updatedAt);
        }

        if (endDate && r.maintenanceDate) {
          const startDate = new Date(r.maintenanceDate);
          const diffTime = endDate - startDate;
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          
          if (diffDays >= 0) { 
            g.totalDurationDays += diffDays;
            g.completedWithDuration += 1;
          }
        }
      }
      
      const type = r.equipmentType || '未分類';
      g.equipmentCounts[type] = (g.equipmentCounts[type] || 0) + 1;
    });

    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  return (
    <div className="space-y-6">
      {stats.map(([quarter, data]) => {
        const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        const mttr = data.completedWithDuration > 0 
          ? (data.totalDurationDays / data.completedWithDuration).toFixed(1) 
          : "N/A";
          
        const topEquipment = Object.entries(data.equipmentCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3); 

        return (
          <div key={quarter} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h4 className="text-lg font-bold text-blue-800">{quarter} 維修季報</h4>
              <span className="text-sm text-gray-500">總案件: {data.total}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded text-center border border-blue-100">
                <p className="text-xs text-blue-600 font-bold uppercase flex justify-center items-center gap-1">
                  <CheckCircle size={12} /> 完修率
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{completionRate}%</p>
                <p className="text-xs text-blue-400 mt-1">{data.completed} / {data.total} 件</p>
              </div>

              <div className="bg-purple-50 p-3 rounded text-center border border-purple-100">
                <p className="text-xs text-purple-600 font-bold uppercase flex justify-center items-center gap-1">
                  <Timer size={12} /> 平均維修天數
                </p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{mttr}</p>
                <p className="text-xs text-purple-400 mt-1">天</p>
              </div>

              <div className="bg-orange-50 p-3 rounded col-span-2 border border-orange-100">
                <p className="text-xs text-orange-600 font-bold uppercase mb-2">報修系統排名 (Top 3)</p>
                <div className="space-y-1.5">
                  {topEquipment.map(([type, count], idx) => (
                    <div key={type} className="flex justify-between text-sm items-center">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                        <span className="text-gray-700">{type}</span>
                      </span>
                      <span className="font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded text-xs">{count} 件</span>
                    </div>
                  ))}
                  {topEquipment.length === 0 && <span className="text-xs text-gray-400">無資料</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {stats.length === 0 && <div className="text-center text-gray-500 py-8">暫無數據可供分析</div>}
    </div>
  );
};

const AdminLogin = ({ passwordInput, setPasswordInput, handleAdminLogin }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <div className="bg-white p-8 rounded-lg shadow-md border max-w-sm w-full">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800">管理員登入</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }}>
        <input
          type="password"
          placeholder="請輸入管理密碼"
          className="w-full p-2 border rounded mb-4"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          autoFocus
        />
        <button 
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          進入管理介面
        </button>
      </form>
    </div>
  </div>
);

const RecordForm = ({ formData, setFormData, handleSaveRecord, setIsFormOpen, selectedFile, setSelectedFile, isUploading }) => (
  <form onSubmit={handleSaveRecord} className="flex flex-col gap-3 text-sm">
    
    <div className="flex justify-between items-center bg-gray-100 p-2 rounded border mb-1">
      <div className="font-bold text-gray-700 text-base">基本資料填寫</div>
      <button
        type="button"
        onClick={() => setFormData({...formData, isUrgent: !formData.isUrgent})}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold transition shadow-sm
          ${formData.isUrgent 
            ? 'bg-red-600 text-white ring-2 ring-red-300 animate-pulse' 
            : 'bg-white text-gray-500 border border-gray-300 hover:bg-gray-50'}`}
      >
        <Siren size={16} />
        {formData.isUrgent ? '🚨 已標示為緊急案件' : '標示為緊急案件'}
      </button>
    </div>

    {/* 改用 5 欄配置，讓保固狀態可以排在第一列 */}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50 p-3 rounded border">
      <div className="md:col-span-1">
        <label className="block text-xs font-bold text-gray-500 mb-1">維修主題</label>
        <input required type="text" className="w-full px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none" 
          value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">設備類別</label>
        <select className="w-full px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white" 
          value={formData.equipmentType} onChange={e => setFormData({...formData, equipmentType: e.target.value})}>
          {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">維修狀態</label>
        <select className="w-full px-2 py-1.5 border rounded font-bold text-blue-700 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
          value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">保固狀態</label>
        <select className="w-full px-2 py-1.5 border rounded text-gray-700 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
          value={formData.warrantyStatus} onChange={e => setFormData({...formData, warrantyStatus: e.target.value})}>
          {WARRANTY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">發生時間</label>
        <input type="datetime-local" className="w-full px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
          value={formData.maintenanceDate} onChange={e => setFormData({...formData, maintenanceDate: e.target.value})} />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="relative">
        <MapPin size={14} className="absolute left-2 top-2.5 text-gray-400" />
        <input placeholder="維修地點" className="w-full pl-7 pr-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
          value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
      </div>
      <div className="relative">
        <Phone size={14} className="absolute left-2 top-2.5 text-gray-400" />
        <input placeholder="聯絡人" className="w-full pl-7 pr-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
          value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
      </div>
      <div className="relative">
        <Phone size={14} className="absolute left-2 top-2.5 text-gray-400" />
        <input placeholder="聯絡電話" className="w-full pl-7 pr-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
          value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="relative">
        <Package size={14} className="absolute left-2 top-2.5 text-purple-500" />
        <input placeholder="使用零件 (如: 硬碟 4TB*1, 變壓器*1)" className="w-full pl-7 pr-2 py-1.5 border rounded focus:ring-1 focus:ring-purple-500 outline-none"
          value={formData.partsUsed} onChange={e => setFormData({...formData, partsUsed: e.target.value})} />
      </div>
      <div className="relative">
        <User size={14} className="absolute left-2 top-2.5 text-purple-500" />
        <input placeholder="維修人員 (如: 張技師, 廠商A)" className="w-full pl-7 pr-2 py-1.5 border rounded focus:ring-1 focus:ring-purple-500 outline-none"
          value={formData.repairStaff} onChange={e => setFormData({...formData, repairStaff: e.target.value})} />
      </div>
    </div>

    <div>
      <textarea 
        placeholder="維修內容簡述..." 
        className="w-full p-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none resize-none"
        rows={2}
        value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} 
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-blue-50 p-3 rounded border border-blue-100">
      <div>
        <label className="block text-xs font-bold text-blue-800 mb-1">報修過程</label>
        <textarea className="w-full p-2 border rounded text-xs resize-none h-20 focus:border-blue-400 outline-none"
          placeholder="誰發現的？什麼時候？..."
          value={formData.reportLog} onChange={e => setFormData({...formData, reportLog: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-red-700 mb-1">故障原因 (原:回報)</label>
        <textarea className="w-full p-2 border rounded text-xs resize-none h-20 focus:border-red-400 outline-none"
          placeholder="判定故障主因..."
          value={formData.feedbackLog} onChange={e => setFormData({...formData, feedbackLog: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-green-700 mb-1">故障排除維修情形 (原:處理)</label>
        <textarea className="w-full p-2 border rounded text-xs resize-none h-20 focus:border-green-400 outline-none"
          placeholder="更換了什麼？測試結果？..."
          value={formData.processLog} onChange={e => setFormData({...formData, processLog: e.target.value})} />
      </div>
    </div>

    <div className="bg-gray-50 p-3 rounded border border-dashed border-gray-400">
      <label className="flex flex-col items-center justify-center cursor-pointer">
        <div className="flex items-center gap-2 text-gray-600 mb-1">
          <Camera size={20} />
          <span className="font-bold text-sm">上傳現場照片 (自動壓縮)</span>
        </div>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setSelectedFile(e.target.files[0]);
            }
          }}
        />
        <div className="text-xs text-gray-400 text-center">
          {selectedFile ? (
            <span className="text-green-600 font-bold">✅ 已選擇: {selectedFile.name}</span>
          ) : formData.imageUrl ? (
            <span className="text-blue-600">ℹ️ 已有照片，上傳新檔將覆蓋</span>
          ) : (
            "點擊選擇圖片 (支援 JPG, PNG)"
          )}
        </div>
      </label>
      
      {(selectedFile || formData.imageUrl) && (
        <div className="mt-2 flex justify-center">
          <img 
            src={selectedFile ? URL.createObjectURL(selectedFile) : formData.imageUrl} 
            alt="Preview" 
            className="h-32 object-contain rounded border bg-white"
          />
        </div>
      )}
    </div>

    <div className="flex justify-end gap-3 mt-1 pt-3 border-t">
      <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button>
      <button 
        type="submit" 
        disabled={isUploading}
        className={`px-6 py-1.5 text-white text-sm font-medium rounded flex items-center gap-2 transition
          ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isUploading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> 處理中...
          </>
        ) : (
          <>
            <Save size={16} /> 儲存紀錄
          </>
        )}
      </button>
    </div>
  </form>
);

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [view, setView] = useState('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false); 
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [sortMode, setSortMode] = useState('default');
  const [expandedId, setExpandedId] = useState(null);

  const initialFormState = {
    subject: "",
    equipmentType: EQUIPMENT_TYPES[0],
    content: "",
    location: "",
    contactPerson: "",
    contactPhone: "",
    maintenanceDate: new Date().toISOString().slice(0, 16),
    status: "未完成",
    warrantyStatus: "未過保", // 預設值
    reportLog: "",   
    processLog: "",  
    feedbackLog: "", 
    partsUsed: "",   
    repairStaff: "", 
    isUrgent: false,
    imageUrl: "" 
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'maintenance_records');
    const unsubscribeSnapshot = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecords(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching records:", error);
        setLoading(false);
      }
    );
    return () => unsubscribeSnapshot();
  }, [user]);

  // --- Logic: Sorting & Filtering ---
  const sortedRecords = useMemo(() => {
    let result = [...records];
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.subject?.toLowerCase().includes(lowerTerm) || 
        r.location?.toLowerCase().includes(lowerTerm) ||
        r.contactPerson?.toLowerCase().includes(lowerTerm)
      );
    }
    
    if (filterType !== "All") {
      result = result.filter(r => r.equipmentType === filterType);
    }

    result.sort((a, b) => {
      const aIsPinned = a.isUrgent && a.status !== '已完成';
      const bIsPinned = b.isUrgent && b.status !== '已完成';

      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;

      if (sortMode === 'urgent') {
        if (a.status === '已完成' && b.status !== '已完成') return 1;
        if (a.status !== '已完成' && b.status === '已完成') return -1;
        const dateA = a.maintenanceDate ? new Date(a.maintenanceDate).getTime() : 0;
        const dateB = b.maintenanceDate ? new Date(b.maintenanceDate).getTime() : 0;
        return dateA - dateB;
      } else if (sortMode === 'completed') {
        if (a.status !== '已完成' && b.status === '已完成') return 1;
        if (a.status === '已完成' && b.status !== '已完成') return -1;
        const dateA = a.maintenanceDate ? new Date(a.maintenanceDate).getTime() : 0;
        const dateB = b.maintenanceDate ? new Date(b.maintenanceDate).getTime() : 0;
        return dateB - dateA;
      } else {
        const aIsCompleted = a.status === "已完成";
        const bIsCompleted = b.status === "已完成";
        if (aIsCompleted !== bIsCompleted) {
          return aIsCompleted ? 1 : -1;
        }
        const dateA = a.maintenanceDate ? new Date(a.maintenanceDate).getTime() : 0;
        const dateB = b.maintenanceDate ? new Date(b.maintenanceDate).getTime() : 0;
        return dateB - dateA; 
      }
    });

    if (sortMode === 'completed') {
      result = result.filter(r => r.status === '已完成');
    }
    if (sortMode === 'urgent') {
      result = result.filter(r => r.status !== '已完成');
    }

    return result;
  }, [records, searchTerm, filterType, sortMode]);

  const handleAdminLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminLoggedIn(true);
      setPasswordInput("");
    } else {
      alert("密碼錯誤");
    }
  };

  // 修改後的儲存邏輯: 處理 Base64 壓縮
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsUploading(true);

    try {
      let url = formData.imageUrl || "";

      // 使用 Base64 壓縮邏輯
      if (selectedFile) {
        url = await compressImage(selectedFile);
      }

      const payload = { 
        ...formData, 
        imageUrl: url,
        updatedAt: serverTimestamp() 
      };
      
      if (formData.status === '已完成') {
        if (!editingRecord || editingRecord.status !== '已完成') {
          payload.completedAt = serverTimestamp();
        }
      }

      if (editingRecord) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'maintenance_records', editingRecord.id);
        await updateDoc(docRef, payload);
      } else {
        payload.createdAt = serverTimestamp();
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'maintenance_records');
        await addDoc(colRef, payload);
      }
      setIsFormOpen(false);
      setEditingRecord(null);
      setFormData(initialFormState);
      setSelectedFile(null);
    } catch (error) {
      console.error("Error saving:", error);
      alert("儲存失敗，請檢查網路連線或圖片大小");
    } finally {
      setIsUploading(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'maintenance_records', deleteTargetId));
      setDeleteTargetId(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setSelectedFile(null); // Reset selected file on edit
    setFormData({
      subject: record.subject || "",
      equipmentType: record.equipmentType || EQUIPMENT_TYPES[0],
      content: record.content || "",
      location: record.location || "",
      contactPerson: record.contactPerson || "",
      contactPhone: record.contactPhone || "",
      maintenanceDate: record.maintenanceDate || new Date().toISOString().slice(0, 16),
      status: record.status || "未完成",
      warrantyStatus: record.warrantyStatus || "未過保", // 編輯時載入
      reportLog: record.reportLog || "",
      processLog: record.processLog || "",
      feedbackLog: record.feedbackLog || "",
      partsUsed: record.partsUsed || "",
      repairStaff: record.repairStaff || "",
      isUrgent: record.isUrgent || false,
      imageUrl: record.imageUrl || ""
    });
    setIsFormOpen(true);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const exportCSV = () => {
    // 增加「保固狀態」欄位到 CSV 匯出
    const headers = ["主題", "狀態", "緊急", "設備類型", "地點", "聯絡人", "電話", "日期", "維修內容", "報修過程", "故障排除維修", "故障原因", "使用零件", "維修人員", "圖片連結", "保固狀態"];
    const csvContent = [
      headers.join(","),
      ...records.map(r => {
        const row = [
          r.subject, r.status, r.isUrgent ? "是" : "否", r.equipmentType, r.location, r.contactPerson, r.contactPhone, 
          r.maintenanceDate, r.content, r.reportLog, r.processLog, r.feedbackLog,
          r.partsUsed, r.repairStaff, "圖片太長略過", r.warrantyStatus
        ];
        return row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",");
      })
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `維修紀錄匯出_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const importCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target.result;
      let text = '';
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      const big5Decoder = new TextDecoder('big5');
      
      try {
        text = utf8Decoder.decode(buffer);
      } catch (err) {
        try { text = big5Decoder.decode(buffer); } catch (err2) { alert("檔案編碼無法識別"); return; }
      }

      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const firstLine = lines[0] || '';
      const delimiter = firstLine.indexOf('\t') !== -1 ? '\t' : ',';
      const rows = lines.slice(1);
      
      let count = 0;
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'maintenance_records');

      const parseLine = (line, sep) => {
        const result = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
             if (inQuote && line[i+1] === '"') { current += '"'; i++; } else { inQuote = !inQuote; }
          } else if (char === sep && !inQuote) {
             result.push(current.trim()); current = '';
          } else { current += char; }
        }
        result.push(current.trim());
        return result;
      };

      for (const row of rows) {
        if (!row.trim()) continue;
        const cols = parseLine(row, delimiter);
        if (cols.length >= 7) {
          try {
             await addDoc(colRef, {
               subject: cols[0] || "匯入資料",
               status: cols[1] || "未完成",
               isUrgent: cols[2] === "是", 
               equipmentType: cols[3] || "其他", 
               location: cols[4] || "",
               contactPerson: cols[5] || "",
               contactPhone: cols[6] || "",
               maintenanceDate: cols[7] || new Date().toISOString(),
               content: cols[8] || "",
               reportLog: cols[9] || "",
               processLog: cols[10] || "",
               feedbackLog: cols[11] || "",
               partsUsed: cols[12] || "",
               repairStaff: cols[13] || "",
               imageUrl: "", 
               warrantyStatus: cols[15] || "未過保", // 匯入保固狀態
               createdAt: serverTimestamp(),
               imported: true
             });
             count++;
          } catch(err) { console.error("Import row error", err); }
        }
      }
      alert(`成功匯入 ${count} 筆資料`);
      event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Settings className="text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">報修系統</h1>
              <p className="text-xs text-blue-200">System Maintenance Log</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            {/* Analysis Button */}
            <button 
              onClick={() => setIsAnalysisOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition shadow-md border border-indigo-500"
            >
              <BarChart3 size={16} /> 分析報告
            </button>

            {view === 'list' ? (
              <button onClick={() => setView('admin')} className="flex items-center gap-2 px-3 py-1.5 bg-blue-800 hover:bg-blue-700 rounded text-sm transition border border-blue-700">
                <Settings size={16} /> 管理介面
              </button>
            ) : (
              <button onClick={() => setView('list')} className="flex items-center gap-2 px-3 py-1.5 bg-blue-800 hover:bg-blue-700 rounded text-sm transition border border-blue-700">
                <FileText size={16} /> 返回清單
              </button>
            )}
            <button 
              onClick={() => { setEditingRecord(null); setFormData(initialFormState); setSelectedFile(null); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded font-medium shadow-md transition"
            >
              <Plus size={18} /> 新增報修
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Filters and Sorting Buttons */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSortMode('default')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm ${sortMode === 'default' ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'}`}>
              <List size={16} className={sortMode === 'default' ? 'text-white' : 'text-blue-500'} /> 時間排序
            </button>
            <button onClick={() => setSortMode('urgent')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm ${sortMode === 'urgent' ? 'bg-red-600 text-white ring-2 ring-red-300' : 'bg-white text-gray-700 hover:bg-red-50 border border-gray-200'}`}>
              <AlertTriangle size={16} className={sortMode === 'urgent' ? 'text-white' : 'text-red-500'} /> 緊急
            </button>
            <button onClick={() => setSortMode('completed')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm ${sortMode === 'completed' ? 'bg-green-600 text-white ring-2 ring-green-300' : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-200'}`}>
              <CheckSquare size={16} className={sortMode === 'completed' ? 'text-white' : 'text-green-500'} /> 已完成
            </button>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Search className="text-gray-400" size={20} />
              <input type="text" placeholder="搜尋主題、地點、聯絡人..." className="pl-2 pr-4 py-2 border rounded w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <Filter size={20} className="text-gray-500" />
              <select className="border p-2 rounded text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="All">所有設備類型</option>
                {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Views */}
        {view === 'admin' && !isAdminLoggedIn ? (
          <AdminLogin passwordInput={passwordInput} setPasswordInput={setPasswordInput} handleAdminLogin={handleAdminLogin} />
        ) : (
          <div className="space-y-3">
            {view === 'admin' && isAdminLoggedIn && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-800 font-semibold">
                  <Settings size={20} /> 管理員模式
                </div>
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm"><Download size={16} /> 匯出 CSV</button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer text-sm"><Upload size={16} /> 匯入 CSV <input type="file" accept=".csv" className="hidden" onChange={importCSV} /></label>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-10 text-gray-500">載入中...</div>
            ) : sortedRecords.length === 0 ? (
              <div className="text-center py-10 bg-white rounded shadow-sm border border-dashed border-gray-300">
                <p className="text-gray-500">目前沒有符合條件的維修紀錄</p>
                {sortMode !== 'completed' && <button onClick={() => setIsFormOpen(true)} className="mt-2 text-blue-600 font-semibold hover:underline">立即新增一筆</button>}
              </div>
            ) : (
              <div className="grid gap-3">
                {sortedRecords.map((record) => {
                  const isExpanded = expandedId === record.id;
                  return (
                    <div 
                      key={record.id} 
                      onClick={() => toggleExpand(record.id)} 
                      className={`bg-white rounded-lg shadow-sm border transition duration-200 overflow-hidden cursor-pointer hover:shadow-md ${isExpanded ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'} ${record.isUrgent && record.status !== '已完成' ? 'border-red-300 ring-1 ring-red-100' : ''}`}
                    >
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-gray-800 truncate">{record.subject}</h3>
                            {record.isUrgent && record.status !== '已完成' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-600 text-white font-bold shadow-sm whitespace-nowrap animate-pulse">
                                <Siren size={10} /> 緊急
                              </span>
                            )}
                            {record.equipmentType && <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">{record.equipmentType}</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-2"><Calendar size={12} /> {formatDate(record.maintenanceDate)}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {/* 下載按鈕 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // 阻止展開
                              generateWordDocument(record);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition flex items-center gap-1"
                            title="下載 Word 維修單"
                          >
                            <FileDown size={18} />
                          </button>
                          
                          <StatusBadge status={record.status} startDate={record.maintenanceDate} />
                          {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 cursor-default" onClick={e => e.stopPropagation()}>
                          {/* 6. 顯示照片區域 */}
                          {record.imageUrl && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <ImageIcon size={16} /> 現場照片：
                              </p>
                              <a href={record.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-full max-w-sm">
                                <img src={record.imageUrl} alt="現場照片" className="rounded-lg border shadow-sm max-h-64 object-contain bg-gray-50 hover:opacity-95 transition" />
                              </a>
                            </div>
                          )}

                          <div className="py-3 flex flex-wrap gap-y-2 gap-x-6 text-sm text-gray-600 border-b border-gray-200">
                             <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-400" /> <span className="font-medium text-gray-700">地點：</span>{record.location || "未填寫"}</div>
                             <div className="flex items-center gap-2"><Phone size={16} className="text-gray-400" /> <span className="font-medium text-gray-700">聯絡：</span>{record.contactPerson} {record.contactPhone && `(${record.contactPhone})`}</div>
                             <div className="flex items-center gap-2 sm:hidden"><Settings size={16} className="text-gray-400" /> <span className="font-medium text-gray-700">類別：</span>{record.equipmentType}</div>
                             
                             <div className="flex items-center gap-2"><User size={16} className="text-purple-400" /> <span className="font-medium text-purple-700">維修：</span>{record.repairStaff || "-"}</div>
                             <div className="flex items-center gap-2"><Package size={16} className="text-purple-400" /> <span className="font-medium text-purple-700">零件：</span>{record.partsUsed || "-"}</div>
                             <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-blue-500" /> <span className="font-medium text-blue-700">保固：</span>{record.warrantyStatus || "未過保"}</div>
                          </div>
                          <div className="py-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">維修內容簡述：</p>
                            <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200 whitespace-pre-line">{record.content || "無內容"}</p>
                          </div>
                          {(record.reportLog || record.processLog || record.feedbackLog) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-2">
                              <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                <span className="font-bold text-blue-700 block mb-1">報修過程：</span> <span className="text-gray-700 whitespace-pre-line">{record.reportLog || "-"}</span>
                              </div>
                              <div className="bg-green-50 p-2 rounded border border-green-100">
                                <span className="font-bold text-green-700 block mb-1">故障排除維修 (原處理)：</span> <span className="text-gray-700 whitespace-pre-line">{record.processLog || "-"}</span>
                              </div>
                              <div className="bg-red-50 p-2 rounded border border-red-100">
                                <span className="font-bold text-red-700 block mb-1">故障原因 (原回報)：</span> <span className="text-gray-700 whitespace-pre-line">{record.feedbackLog || "-"}</span>
                              </div>
                            </div>
                          )}
                          {view === 'admin' && isAdminLoggedIn && (
                            <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-200">
                              <button onClick={() => handleEdit(record)} className="flex items-center gap-1 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-sm transition font-medium"><Edit size={14} /> 編輯</button>
                              <button onClick={() => setDeleteTargetId(record.id)} className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded text-sm transition font-medium"><Trash2 size={14} /> 刪除</button>
                            </div>
                          )}
                        </div>
                      )}
                      {record.status !== "已完成" && (
                        <div className="h-1 w-full bg-gray-100">
                          <div className={`h-full ${calculateDaysLeft(record.maintenanceDate) < 30 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.max(0, (calculateDaysLeft(record.maintenanceDate) / 90) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingRecord ? "編輯維修紀錄" : "新增維修紀錄"}>
        <RecordForm 
          formData={formData} 
          setFormData={setFormData} 
          handleSaveRecord={handleSaveRecord} 
          setIsFormOpen={setIsFormOpen}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          isUploading={isUploading}
        />
      </Modal>

      {/* Analysis Modal */}
      <Modal isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} title="📊 維修分析報告">
        <AnalysisReport records={records} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTargetId} onClose={() => setDeleteTargetId(null)} title="確認刪除">
        <div className="space-y-4">
          <p className="text-gray-700 font-medium">您確定要刪除此筆維修紀錄嗎？</p>
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">此動作無法復原，資料將永久遺失。</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeleteTargetId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
            <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"><Trash2 size={18} /> 確認刪除</button>
          </div>
        </div>
      </Modal>

      {/* Floating Action Button (Mobile) */}
      <button onClick={() => { setEditingRecord(null); setFormData(initialFormState); setSelectedFile(null); setIsFormOpen(true); }} className="md:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl z-30 hover:bg-blue-700 transition"><Plus size={24} /></button>
    </div>
  );
}