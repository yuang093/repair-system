import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare
} from 'lucide-react';

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

// --- Components ---

const StatusBadge = ({ status, startDate }) => {
  const daysLeft = calculateDaysLeft(startDate);
  let colorClass = "bg-gray-100 text-gray-800";
  
  if (status === "已完成") {
    colorClass = "bg-green-100 text-green-800";
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

const RecordForm = ({ formData, setFormData, handleSaveRecord, setIsFormOpen }) => (
  <form onSubmit={handleSaveRecord} className="flex flex-col gap-3 text-sm">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded border">
      <div>
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
          placeholder="人事時地物..."
          value={formData.reportLog} onChange={e => setFormData({...formData, reportLog: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-blue-800 mb-1">處理過程</label>
        <textarea className="w-full p-2 border rounded text-xs resize-none h-20 focus:border-blue-400 outline-none"
          placeholder="更換/測試..."
          value={formData.processLog} onChange={e => setFormData({...formData, processLog: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-blue-800 mb-1">回報過程</label>
        <textarea className="w-full p-2 border rounded text-xs resize-none h-20 focus:border-blue-400 outline-none"
          placeholder="通知結果..."
          value={formData.feedbackLog} onChange={e => setFormData({...formData, feedbackLog: e.target.value})} />
      </div>
    </div>

    <div className="flex justify-end gap-3 mt-1 pt-3 border-t">
      <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">取消</button>
      <button type="submit" className="px-6 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center gap-2">
        <Save size={16} /> 儲存紀錄
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
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  
  // New State for Sorting Mode: 'default', 'urgent', 'completed'
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
    reportLog: "",
    processLog: "",
    feedbackLog: ""
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
    
    // 1. Text Filter (Search)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.subject?.toLowerCase().includes(lowerTerm) || 
        r.location?.toLowerCase().includes(lowerTerm) ||
        r.contactPerson?.toLowerCase().includes(lowerTerm)
      );
    }
    
    // 2. Equipment Type Filter
    if (filterType !== "All") {
      result = result.filter(r => r.equipmentType === filterType);
    }

    // 3. Sort Mode Logic
    if (sortMode === 'urgent') {
      // 緊急：只顯示「未完成」，依照時間「舊到新」（越舊代表離90天到期越近）
      result = result.filter(r => r.status !== '已完成');
      result.sort((a, b) => {
        const dateA = a.maintenanceDate ? new Date(a.maintenanceDate).getTime() : 0;
        const dateB = b.maintenanceDate ? new Date(b.maintenanceDate).getTime() : 0;
        return dateA - dateB; // Ascending: Oldest first
      });
    } else if (sortMode === 'completed') {
      // 已完成：只顯示「已完成」，依照時間「新到舊」
      result = result.filter(r => r.status === '已完成');
      result.sort((a, b) => {
        const dateA = a.maintenanceDate ? new Date(a.maintenanceDate).getTime() : 0;
        const dateB = b.maintenanceDate ? new Date(b.maintenanceDate).getTime() : 0;
        return dateB - dateA; // Descending: Newest first
      });
    } else {
      // 預設 (Default)：全部顯示
      // 邏輯：未完成在最上面 (依照時間新到舊)，已完成在最下面 (依照時間新到舊)
      result.sort((a, b) => {
        const aIsCompleted = a.status === "已完成";
        const bIsCompleted = b.status === "已完成";
        
        // If one is completed and other is not, put incomplete first
        if (aIsCompleted !== bIsCompleted) {
          return aIsCompleted ? 1 : -1;
        }

        // Same completion status, sort by date descending (Newest first)
        const dateA = a.maintenanceDate ? new Date(a.maintenanceDate).getTime() : 0;
        const dateB = b.maintenanceDate ? new Date(b.maintenanceDate).getTime() : 0;
        return dateB - dateA;
      });
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

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const payload = { ...formData, updatedAt: serverTimestamp() };
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
    } catch (error) {
      console.error("Error saving:", error);
      alert("儲存失敗，請重試");
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
    setFormData({
      subject: record.subject || "",
      equipmentType: record.equipmentType || EQUIPMENT_TYPES[0],
      content: record.content || "",
      location: record.location || "",
      contactPerson: record.contactPerson || "",
      contactPhone: record.contactPhone || "",
      maintenanceDate: record.maintenanceDate || new Date().toISOString().slice(0, 16),
      status: record.status || "未完成",
      reportLog: record.reportLog || "",
      processLog: record.processLog || "",
      feedbackLog: record.feedbackLog || ""
    });
    setIsFormOpen(true);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const exportCSV = () => {
    const headers = ["主題", "狀態", "設備類型", "地點", "聯絡人", "電話", "日期", "維修內容", "報修過程", "處理過程", "回報過程"];
    const csvContent = [
      headers.join(","),
      ...records.map(r => {
        const row = [r.subject, r.status, r.equipmentType, r.location, r.contactPerson, r.contactPhone, r.maintenanceDate, r.content, r.reportLog, r.processLog, r.feedbackLog];
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
        console.log("UTF-8 decoding failed, trying Big5...");
        try {
          text = big5Decoder.decode(buffer);
        } catch (err2) {
          alert("檔案編碼無法識別，請確認檔案格式");
          return;
        }
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
             if (inQuote && line[i+1] === '"') {
               current += '"';
               i++;
             } else {
               inQuote = !inQuote;
             }
          } else if (char === sep && !inQuote) {
             result.push(current.trim());
             current = '';
          } else {
             current += char;
          }
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
               equipmentType: cols[2] || "其他",
               location: cols[3] || "",
               contactPerson: cols[4] || "",
               contactPhone: cols[5] || "",
               maintenanceDate: cols[6] || new Date().toISOString(),
               content: cols[7] || "",
               reportLog: cols[8] || "",
               processLog: cols[9] || "",
               feedbackLog: cols[10] || "",
               createdAt: serverTimestamp(),
               imported: true
             });
             count++;
          } catch(err) {
            console.error("Import row error", err);
          }
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
              onClick={() => { setEditingRecord(null); setFormData(initialFormState); setIsFormOpen(true); }}
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
          {/* Top Row: Sorting Buttons */}
          <div className="flex flex-wrap gap-2">
            
            {/* 1. Default (Time Sort) - Left */}
            <button 
              onClick={() => setSortMode('default')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm
                ${sortMode === 'default' 
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300' 
                  : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'}`}
            >
              <List size={16} className={sortMode === 'default' ? 'text-white' : 'text-blue-500'} />
              時間排序
            </button>

            {/* 2. Urgent - Middle */}
            <button 
              onClick={() => setSortMode('urgent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm
                ${sortMode === 'urgent' 
                  ? 'bg-red-600 text-white ring-2 ring-red-300' 
                  : 'bg-white text-gray-700 hover:bg-red-50 border border-gray-200'}`}
            >
              <AlertTriangle size={16} className={sortMode === 'urgent' ? 'text-white' : 'text-red-500'} />
              緊急
            </button>
            
            {/* 3. Completed - Right */}
            <button 
              onClick={() => setSortMode('completed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm
                ${sortMode === 'completed' 
                  ? 'bg-green-600 text-white ring-2 ring-green-300' 
                  : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-200'}`}
            >
              <CheckSquare size={16} className={sortMode === 'completed' ? 'text-white' : 'text-green-500'} />
              已完成
            </button>
          </div>

          {/* Bottom Row: Search & Type Filter */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Search className="text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="搜尋主題、地點、聯絡人..." 
                className="pl-2 pr-4 py-2 border rounded w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
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
            {/* Admin Toolbar */}
            {view === 'admin' && isAdminLoggedIn && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-800 font-semibold">
                  <Settings size={20} /> 管理員模式
                </div>
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm">
                    <Download size={16} /> 匯出 CSV
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer text-sm">
                    <Upload size={16} /> 匯入 CSV
                    <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
                  </label>
                </div>
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="text-center py-10 text-gray-500">載入中...</div>
            ) : sortedRecords.length === 0 ? (
              <div className="text-center py-10 bg-white rounded shadow-sm border border-dashed border-gray-300">
                <p className="text-gray-500">目前沒有符合條件的維修紀錄</p>
                {sortMode !== 'completed' && (
                  <button onClick={() => setIsFormOpen(true)} className="mt-2 text-blue-600 font-semibold hover:underline">立即新增一筆</button>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {sortedRecords.map((record) => {
                  const isExpanded = expandedId === record.id;
                  return (
                    <div 
                      key={record.id} 
                      onClick={() => toggleExpand(record.id)}
                      className={`bg-white rounded-lg shadow-sm border transition duration-200 overflow-hidden cursor-pointer hover:shadow-md ${isExpanded ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}
                    >
                      {/* Condensed Header Row */}
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-gray-800 truncate">
                              {record.subject}
                            </h3>
                            {record.equipmentType && (
                              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
                                {record.equipmentType}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                            <Calendar size={12} /> {formatDate(record.maintenanceDate)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <StatusBadge status={record.status} startDate={record.maintenanceDate} />
                          {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                        </div>
                      </div>
                      
                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 cursor-default" onClick={e => e.stopPropagation()}>
                          
                          {/* Contact Info Row */}
                          <div className="py-3 flex flex-wrap gap-y-2 gap-x-6 text-sm text-gray-600 border-b border-gray-200">
                             <div className="flex items-center gap-2">
                               <MapPin size={16} className="text-gray-400" /> 
                               <span className="font-medium text-gray-700">地點：</span>{record.location || "未填寫"}
                             </div>
                             <div className="flex items-center gap-2">
                               <Phone size={16} className="text-gray-400" /> 
                               <span className="font-medium text-gray-700">聯絡：</span>{record.contactPerson} {record.contactPhone && `(${record.contactPhone})`}
                             </div>
                             <div className="flex items-center gap-2 sm:hidden">
                               <Settings size={16} className="text-gray-400" /> 
                               <span className="font-medium text-gray-700">類別：</span>{record.equipmentType}
                             </div>
                          </div>

                          {/* Content */}
                          <div className="py-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">維修內容簡述：</p>
                            <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200 whitespace-pre-line">
                              {record.content || "無內容"}
                            </p>
                          </div>
                          
                          {/* Logs */}
                          {(record.reportLog || record.processLog || record.feedbackLog) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-2">
                              <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                <span className="font-bold text-blue-700 block mb-1">報修過程：</span> 
                                <span className="text-gray-700 whitespace-pre-line">{record.reportLog || "-"}</span>
                              </div>
                              <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                <span className="font-bold text-blue-700 block mb-1">處理過程：</span> 
                                <span className="text-gray-700 whitespace-pre-line">{record.processLog || "-"}</span>
                              </div>
                              <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                <span className="font-bold text-blue-700 block mb-1">回報過程：</span> 
                                <span className="text-gray-700 whitespace-pre-line">{record.feedbackLog || "-"}</span>
                              </div>
                            </div>
                          )}

                          {/* Admin Actions */}
                          {view === 'admin' && isAdminLoggedIn && (
                            <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-200">
                              <button onClick={() => handleEdit(record)} className="flex items-center gap-1 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-sm transition font-medium">
                                <Edit size={14} /> 編輯
                              </button>
                              <button onClick={() => setDeleteTargetId(record.id)} className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded text-sm transition font-medium">
                                <Trash2 size={14} /> 刪除
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Progress Bar */}
                      {record.status !== "已完成" && (
                        <div className="h-1 w-full bg-gray-100">
                          <div 
                            className={`h-full ${calculateDaysLeft(record.maintenanceDate) < 30 ? 'bg-red-500' : 'bg-blue-500'}`} 
                            style={{ width: `${Math.max(0, (calculateDaysLeft(record.maintenanceDate) / 90) * 100)}%` }}
                          />
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
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title={editingRecord ? "編輯維修紀錄" : "新增維修紀錄"}
      >
        <RecordForm 
          formData={formData}
          setFormData={setFormData}
          handleSaveRecord={handleSaveRecord}
          setIsFormOpen={setIsFormOpen}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteTargetId} 
        onClose={() => setDeleteTargetId(null)} 
        title="確認刪除"
      >
        <div className="space-y-4">
          <p className="text-gray-700 font-medium">您確定要刪除此筆維修紀錄嗎？</p>
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">此動作無法復原，資料將永久遺失。</p>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setDeleteTargetId(null)} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              取消
            </button>
            <button 
              onClick={executeDelete} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 size={18} /> 確認刪除
            </button>
          </div>
        </div>
      </Modal>

      {/* Floating Action Button (Mobile) */}
      <button 
        onClick={() => {
          setEditingRecord(null);
          setFormData(initialFormState);
          setIsFormOpen(true);
        }}
        className="md:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl z-30 hover:bg-blue-700 transition"
      >
        <Plus size={24} />
      </button>

    </div>
  );
}