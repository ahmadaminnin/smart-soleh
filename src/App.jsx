import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import {
  BookOpen,
  Users,
  Settings,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  Circle,
  Eye,
  LogOut,
  Save,
  Clock,
  Book,
  ShieldAlert,
  ArrowLeft,
  Edit,
  X
} from 'lucide-react';

// Firebase Configuration & Initialization
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
let app;
let auth;
let db;
let storage;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e) {
  // If Firebase fails to initialize (e.g., missing config), surface but allow app to mount
  console.error('Firebase initialization failed:', e);
  app = null;
  auth = null;
  db = null;
  storage = null;
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'smart-soleh-app';

const DEFAULT_CATEGORIES = [
  'Tentatif',
  'Feqah',
  'Hadith',
  'Kreatif Ummah',
  'Sirah',
  'Nasyid',
  'Hafazan',
  'Magic box'
];

// Reusable Watermark Component
const Watermark = () => (
  <div className="fixed bottom-0 left-0 w-full p-2 bg-red-600/90 text-white text-center text-xs md:text-sm font-bold tracking-wider z-50 pointer-events-none shadow-lg">
    SMART SOLEH © EDUCATIONAL USE ONLY • NOT FOR COMMERCIAL USE • MUST BE FREE
  </div>
);

// Reusable Button Component
const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false, type = "button" }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
    outline: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50",
    ghost: "text-gray-600 hover:bg-gray-100"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const ImageLightbox = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out animate-fade-in"
      onClick={onClose}
    >
      <button 
        className="absolute top-6 right-6 text-white hover:text-emerald-400 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
        onClick={onClose}
      >
         <X className="w-8 h-8" />
      </button>
      <img 
        src={src} 
        alt="Enlarged view" 
        className="max-w-full max-h-[95vh] object-contain rounded shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()} 
      />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'student' | 'facilitator' | null
  const [loading, setLoading] = useState(true);

  // Data States
  const [modules, setModules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth) {
          console.warn('Skipping auth setup because Firebase auth is not available');
          return;
        }

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      }
    };
    initAuth();

    if (!auth) {
      // No auth: continue without Firebase and show the UI
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser && !currentUser.isAnonymous) {
        setRole('facilitator');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (!db) {
      console.warn('Firestore not available; skipping data listeners');
      return;
    }

    const publicRef = (collectionName) => collection(db, 'artifacts', appId, 'public', 'data', collectionName);

    // Listen to Modules
    const unsubModules = onSnapshot(publicRef('modules'), (snapshot) => {
      const mods = [];
      snapshot.forEach(doc => mods.push({ id: doc.id, ...doc.data() }));
      setModules(mods.sort((a, b) => b.createdAt - a.createdAt)); // Sort in JS
    }, console.error);

    // Listen to Topics Database
    const unsubTopics = onSnapshot(publicRef('topics'), (snapshot) => {
      const tops = [];
      snapshot.forEach(doc => tops.push({ id: doc.id, ...doc.data() }));
      setTopics(tops);
    }, console.error);

    // Listen to Custom Settings (Categories)
    const unsubSettings = onSnapshot(publicRef('settings'), (snapshot) => {
      let customCats = [];
      snapshot.forEach(doc => {
        if (doc.id === 'categories') customCats = doc.data().list || [];
      });
      if (customCats.length > 0) {
        setCategories(customCats);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    }, console.error);

    return () => {
      unsubModules();
      unsubTopics();
      unsubSettings();
    };
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setRole('facilitator');
    } catch (error) {
      console.error("Google sign in failed:", error);
      // Graceful fallback for preview/sandbox environment where OAuth domains aren't configured.
      // Enter a demo facilitator mode without blocking alerts and create a lightweight demo user.
      console.warn('Falling back to demo facilitator mode (non-Firebase).');
      setUser({ uid: 'demo-facilitator', displayName: 'Demo Facilitator', isAnonymous: false });
      setRole('facilitator');
    }
  };

  const handleLogout = async () => {
    try {
      // If using a demo facilitator (no Firebase auth), just clear local state.
      if (!auth || (user && String(user.uid).startsWith('demo-'))) {
        setRole(null);
        setUser(null);
        if (auth) {
          try { await signInAnonymously(auth); } catch (e) { console.warn('Anonymous re-auth failed:', e); }
        }
        return;
      }

      await signOut(auth);
      setRole(null);
      // Re-auth anonymously to continue as student
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => setRole(role || null)}>
              <BookOpen className="h-8 w-8 text-emerald-600 mr-2" />
              <span className="font-bold text-xl text-gray-900 tracking-tight">Smart Soleh</span>
            </div>
            <div className="flex items-center space-x-4">
              {role === 'facilitator' ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 hidden md:block">Facilitator Mode</span>
                  <Button variant="ghost" onClick={handleLogout}><LogOut className="w-4 h-4" /> Exit</Button>
                </div>
              ) : (
                role === 'student' && (
                  <Button variant="ghost" onClick={() => setRole(null)}>Change Role</Button>
                )
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Routing */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!role && (
          <RoleSelection 
            onSelectStudent={() => setRole('student')} 
            onSelectFacilitator={handleGoogleLogin} 
          />
        )}
        {role === 'student' && <StudentDashboard modules={modules} topics={topics} />}
        {role === 'facilitator' && (
          <FacilitatorDashboard 
            modules={modules} 
            topics={topics} 
            categories={categories} 
          />
        )}
      </main>

      <Watermark />
    </div>
  );
}

const RoleSelection = ({ onSelectStudent, onSelectFacilitator }) => {
  return (
    <div className="flex flex-col items-center justify-center mt-20 space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Welcome to <span className="text-emerald-600">Smart Soleh</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Interactive Islamic educational modules. Choose your portal to begin.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mt-12">
        {/* Student Card */}
        <div 
          onClick={onSelectStudent}
          className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 cursor-pointer border border-gray-100 hover:border-emerald-200 group flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Portal</h2>
          <p className="text-gray-500">Access published lesson modules and activities.</p>
        </div>

        {/* Facilitator Card */}
        <div 
          onClick={onSelectFacilitator}
          className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 cursor-pointer border border-gray-100 hover:border-emerald-200 group flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Settings className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Facilitator Login</h2>
          <p className="text-gray-500">Create modules, manage database, and view answer schemes.</p>
          <div className="mt-4 inline-flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            <ShieldAlert className="w-4 h-4 mr-1" /> Requires Google Sign-in
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = ({ modules, topics }) => {
  const [selectedModule, setSelectedModule] = useState(null);
  const publishedModules = modules.filter(m => m.isPublished);

  if (selectedModule) {
    return (
      <ModuleViewer 
        module={selectedModule} 
        topics={topics} 
        onBack={() => setSelectedModule(null)} 
        isStudent={true} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Available Modules</h2>
        <p className="text-gray-600">Select a lesson module to start learning.</p>
      </div>

      {publishedModules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Book className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No modules have been published yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publishedModules.map(mod => (
            <div 
              key={mod.id} 
              onClick={() => setSelectedModule(mod)}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border-l-4 cursor-pointer"
              style={{ borderLeftColor: mod.themeColor || '#10b981' }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{mod.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{new Date(mod.createdAt).toLocaleDateString()}</p>
              <div className="flex items-center text-emerald-600 font-medium text-sm">
                <Eye className="w-4 h-4 mr-1" /> View Module
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FacilitatorDashboard = ({ modules, topics, categories }) => {
  const [view, setView] = useState('modules'); // 'modules', 'database', 'builder'
  const [editingModule, setEditingModule] = useState(null);

  const handleCreateNew = () => {
    setEditingModule(null);
    setView('builder');
  };

  const handleEdit = (mod) => {
    setEditingModule(mod);
    setView('builder');
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this module?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'modules', id));
    }
  };

  if (view === 'builder') {
    return (
      <ModuleBuilder 
        initialData={editingModule} 
        categories={categories} 
        topics={topics} 
        onClose={() => setView('modules')} 
      />
    );
  }

  if (view === 'database') {
    return (
      <DatabaseManager 
        categories={categories} 
        topics={topics} 
        onBack={() => setView('modules')} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Facilitator Dashboard</h2>
          <p className="text-gray-600">Manage your lesson modules and content database.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setView('database')}>
            <Settings className="w-4 h-4" /> Manage Database
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4" /> New Module
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modules.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No modules created yet. Click "New Module" to start.
                  </td>
                </tr>
              ) : (
                modules.map(mod => (
                  <tr key={mod.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: mod.themeColor || '#10b981' }}></div>
                        <div className="text-sm font-medium text-gray-900">{mod.title}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mod.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {mod.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(mod.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(mod)} className="text-emerald-600 hover:text-emerald-900 mr-4">Edit</button>
                      <button onClick={() => handleDelete(mod.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ModuleBuilder = ({ initialData, categories, topics, onClose }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [themeColor, setThemeColor] = useState(initialData?.themeColor || '#10b981');
  const [tentative, setTentative] = useState(initialData?.tentative || [{ id: Date.now().toString(), time: '08:00', activity: 'Registration' }]);
  
  // Format: { categoryName: [topicId1, topicId2] }
  const [selectedTopics, setSelectedTopics] = useState(initialData?.selectedTopics || {});
  
  // State for drag and drop
  const dragItem = useRef();
  const dragOverItem = useRef();

  const handleDragStart = (e, position) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e, position) => {
    dragOverItem.current = position;
  };

  const drop = () => {
    const copyListItems = [...tentative];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setTentative(copyListItems);
  };

  const addTentativeRow = () => {
    setTentative([...tentative, { id: Date.now().toString(), time: '', activity: '' }]);
  };

  const updateTentativeRow = (id, field, value) => {
    setTentative(tentative.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeTentativeRow = (id) => {
    setTentative(tentative.filter(item => item.id !== id));
  };

  const toggleTopicSelection = (category, topicId) => {
    setSelectedTopics(prev => {
      const catTopics = prev[category] || [];
      if (catTopics.includes(topicId)) {
        return { ...prev, [category]: catTopics.filter(id => id !== topicId) };
      } else {
        return { ...prev, [category]: [...catTopics, topicId] };
      }
    });
  };

  // Check if all non-tentative categories have at least one topic selected
  const nonTentativeCategories = categories.filter(c => c.toLowerCase() !== 'tentatif');
  const isComplete = title.trim() !== '' && nonTentativeCategories.every(cat => selectedTopics[cat] && selectedTopics[cat].length > 0);

  const handleSave = async (publish) => {
    if (publish && !isComplete) {
      alert("Please fill in the title and select at least one topic for every category before publishing.");
      return;
    }

    const moduleData = {
      title,
      themeColor,
      tentative,
      selectedTopics,
      isPublished: publish,
      updatedAt: Date.now()
    };

    try {
      if (initialData?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'modules', initialData.id), moduleData);
      } else {
        moduleData.createdAt = Date.now();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'modules'), moduleData);
      }
      onClose();
    } catch (error) {
      console.error("Error saving module:", error);
      alert("Failed to save module.");
    }
  };

  const themeColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={onClose} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{initialData ? 'Edit Module' : 'Build New Module'}</h2>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave(false)}>Save Draft</Button>
          <Button onClick={() => handleSave(true)} disabled={!isComplete}>Publish</Button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-12">
        {/* Basic Info Section */}
        <section className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Module Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g., Summer Camp 2026 - Day 1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color</label>
            <div className="flex flex-wrap gap-3">
              {themeColors.map(color => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${themeColor === color ? 'scale-110 ring-4 ring-offset-2 ring-gray-300' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                >
                  {themeColor === color && <CheckCircle className="w-5 h-5 text-white/90" />}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tentative Section (Drag & Drop) */}
        <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center"><Clock className="w-5 h-5 mr-2 text-emerald-600" /> Tentative Schedule</h3>
            <Button variant="secondary" onClick={addTentativeRow} className="text-sm py-1"><Plus className="w-4 h-4" /> Add Item</Button>
          </div>
          
          <div className="space-y-2">
            {tentative.map((item, index) => (
              <div 
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={drop}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-move hover:border-emerald-300 transition-colors"
              >
                <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input 
                  type="time" 
                  value={item.time} 
                  onChange={(e) => updateTentativeRow(item.id, 'time', e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:ring-emerald-500 focus:border-emerald-500"
                />
                <input 
                  type="text" 
                  value={item.activity} 
                  placeholder="Activity Description"
                  onChange={(e) => updateTentativeRow(item.id, 'activity', e.target.value)}
                  className="flex-grow p-2 border border-gray-300 rounded focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button onClick={() => removeTentativeRow(item.id)} className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Categories Section */}
        <section>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center"><BookOpen className="w-5 h-5 mr-2 text-emerald-600" /> Subject Categories</h3>
            <p className="text-gray-500 text-sm mt-1">Select at least one topic for each category to complete the module.</p>
          </div>

          <div className="space-y-6">
            {nonTentativeCategories.map(category => {
              const categoryTopics = topics.filter(t => t.category === category);
              const hasSelection = selectedTopics[category] && selectedTopics[category].length > 0;
              
              return (
                <div key={category} className={`border rounded-xl p-5 transition-colors ${hasSelection ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      {hasSelection ? <CheckCircle className="w-5 h-5 text-emerald-500 mr-2" /> : <Circle className="w-5 h-5 text-gray-300 mr-2" />}
                      {category}
                    </h4>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {categoryTopics.length} available
                    </span>
                  </div>
                  
                  {categoryTopics.length === 0 ? (
                    <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">No topics found in database for this category. Please add some in the Database Manager.</p>
                  ) : (
                    <div className="grid gap-3 max-h-60 overflow-y-auto pr-2">
                      {categoryTopics.map(topic => (
                        <label key={topic.id} className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${selectedTopics[category]?.includes(topic.id) ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300' : 'hover:bg-gray-50 border-gray-200'}`}>
                          <input 
                            type="checkbox" 
                            className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                            checked={selectedTopics[category]?.includes(topic.id) || false}
                            onChange={() => toggleTopicSelection(category, topic.id)}
                          />
                          <div className="ml-3 flex items-center gap-3">
                            {topic.questionType === 'image' && (
                               <img src={Array.isArray(topic.question) ? topic.question[0] : topic.question} alt="thumb" className="w-10 h-10 object-cover rounded border border-gray-200 bg-white" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                   {topic.title || (topic.questionType === 'image' ? 'Image Question' : 'Unknown Format')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                   Answer: {topic.answerType === 'image' ? 'Image File' : 'Unknown Format'}
                                </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

const DatabaseManager = ({ categories, topics, onBack }) => {
  const [activeCategory, setActiveCategory] = useState(categories[1] || categories[0]); // Default to first non-tentative
  const [isAdding, setIsAdding] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [newTopic, setNewTopic] = useState({ 
    title: '',
    questionFiles: [],
    answerFile: null,
    questionType: 'unknown',
    answerType: 'unknown',
    answerPreview: null
  });
  const [uploading, setUploading] = useState(false);

  const dragQItem = useRef();
  const dragQOverItem = useRef();

  const handleQDragStart = (e, position) => {
    dragQItem.current = position;
  };

  const handleQDragEnter = (e, position) => {
    dragQOverItem.current = position;
  };

  const dropQ = () => {
    const copyListItems = [...newTopic.questionFiles];
    const dragItemContent = copyListItems[dragQItem.current];
    copyListItems.splice(dragQItem.current, 1);
    copyListItems.splice(dragQOverItem.current, 0, dragItemContent);
    dragQItem.current = null;
    dragQOverItem.current = null;
    setNewTopic(prev => ({ ...prev, questionFiles: copyListItems }));
  };

  const loadLocalTopics = () => {
    try {
      const localKey = 'smart_soleh_demo_topics';
      const raw = localStorage.getItem(localKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.warn('Failed to load local demo topics', e);
      return [];
    }
  };

  // Merge remote `topics` with local demo topics (avoid duplicates by id)
  const mergedTopics = (() => {
    const local = loadLocalTopics();
    const map = new Map();
    topics.forEach(t => { if (t && t.id) map.set(t.id, t); });
    local.forEach(t => { if (t && t.id && !map.has(t.id)) map.set(t.id, t); });
    return Array.from(map.values());
  })();

  const categoryTopics = mergedTopics.filter(t => t.category === activeCategory);

  const determineFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    return 'unknown';
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = determineFileType(file);
    if (fileType === 'unknown') {
      alert("Please upload only Image files.");
      e.target.value = ''; // Reset input
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setNewTopic(prev => {
      // Clean up old preview to avoid memory leaks
      if (prev[`${field}Preview`]) {
        URL.revokeObjectURL(prev[`${field}Preview`]);
      }
      return {
        ...prev,
        [`${field}File`]: file,
        [`${field}Type`]: fileType,
        [`${field}Preview`]: previewUrl
      };
    });
  };

  const handleMultipleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const validFiles = files.filter(f => determineFileType(f) === 'image');
    if (validFiles.length !== files.length) {
      alert("Some files were not images and were skipped.");
    }

    const newFileObjects = validFiles.map(file => ({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        file: file,
        preview: URL.createObjectURL(file)
    }));

    setNewTopic(prev => ({
        ...prev,
        questionFiles: [...prev.questionFiles, ...newFileObjects],
        questionType: 'image'
    }));
    e.target.value = ''; // Reset input so same file can be selected again if needed
  };

  const removeQuestionFile = (id) => {
    setNewTopic(prev => {
      const updatedFiles = prev.questionFiles.filter(q => q.id !== id);
      const removedFile = prev.questionFiles.find(q => q.id === id);
      if (removedFile) URL.revokeObjectURL(removedFile.preview);
      return { ...prev, questionFiles: updatedFiles };
    });
  };

  // Helper function to resize and convert image to Base64 to bypass Firebase Storage setup issues
  const processImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Resize to max 800px width/height to save space
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
          
          // Compress to JPEG format with 0.7 quality to fit well within Firestore limits
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    
    // Validation: Ensure file is provided for both Q & A
    if (!newTopic.title.trim()) {
        alert("Please provide a title for the topic.");
        return;
    }
    if (newTopic.questionFiles.length === 0) {
        alert("Please provide at least one question file (Image).");
        return;
    }
    if (!newTopic.answerFile) {
        alert("Please provide an answer file (Image).");
        return;
    }

    setUploading(true);

    try {
      // Process and compress images to Base64 to save directly to Firestore
      const questionContentUrls = await Promise.all(
          newTopic.questionFiles.map(q => processImageToBase64(q.file))
      );
      
      const answerContent = await processImageToBase64(newTopic.answerFile);

      if (!db) {
        // Firestore not available: save topic to localStorage for demo mode
        const localKey = 'smart_soleh_demo_topics';
        const id = Date.now().toString() + '_' + Math.random().toString(36).substring(2,9);
        const demoTopic = {
          id,
          title: newTopic.title,
          category: activeCategory,
          question: questionContentUrls,
          questionType: newTopic.questionType,
          answerScheme: answerContent,
          answerType: newTopic.answerType,
          createdAt: Date.now()
        };
        try {
          const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
          existing.push(demoTopic);
          localStorage.setItem(localKey, JSON.stringify(existing));
        } catch (err) {
          console.error('Failed to save demo topic to localStorage', err);
          throw err;
        }
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'topics'), {
          title: newTopic.title,
          category: activeCategory,
          question: questionContentUrls, // Now an array of Base64 strings
          questionType: newTopic.questionType,
          answerScheme: answerContent, // Base64 string
          answerType: newTopic.answerType,
          createdAt: Date.now()
        });
      }
      
      // Clean up object URLs
      newTopic.questionFiles.forEach(q => URL.revokeObjectURL(q.preview));
      if (newTopic.answerPreview) URL.revokeObjectURL(newTopic.answerPreview);

      setNewTopic({ 
        title: '',
        questionFiles: [], answerFile: null,
        questionType: 'unknown', answerType: 'unknown',
        answerPreview: null
      });
      // Reset file inputs manually
      const qInput = document.getElementById('questionFileInput');
      if (qInput) qInput.value = '';
      const aInput = document.getElementById('answerFileInput');
      if (aInput) aInput.value = '';
      
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding topic:", error);
      alert(`Failed to save topic: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTopic = async (id) => {
    if(confirm("Delete this topic?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'topics', id));
    }
  };

  const renderContentPreview = (content, type) => {
      if (type === 'image') {
          if (Array.isArray(content)) {
              return (
                  <div className="flex flex-wrap gap-2 mt-2">
                     {content.map((imgUrl, i) => (
                         <img key={i} src={imgUrl} alt={`Preview ${i}`} className="h-24 w-auto object-contain rounded border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity" onClick={() => setEnlargedImage(imgUrl)} />
                     ))}
                  </div>
              );
          }
          return <img src={content} alt="Preview" className="max-h-32 object-contain mt-2 rounded cursor-zoom-in hover:opacity-80 transition-opacity" onClick={() => setEnlargedImage(content)} />;
      }
      return <div className="mt-1 text-red-500">Unsupported format.</div>;
  };

  const handleCancelAdding = () => {
    newTopic.questionFiles.forEach(q => URL.revokeObjectURL(q.preview));
    if (newTopic.answerPreview) URL.revokeObjectURL(newTopic.answerPreview);
    setNewTopic({ title: '', questionFiles: [], answerFile: null, questionType: 'unknown', answerType: 'unknown', answerPreview: null });
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">
      {/* Sidebar Categories */}
      <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
        <ul className="space-y-1">
          {categories.filter(c => c.toLowerCase() !== 'tentatif').map(cat => (
            <li key={cat}>
              <button 
                onClick={() => { 
                  if (isAdding) handleCancelAdding(); 
                  setActiveCategory(cat); 
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {cat}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-8 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{activeCategory} Database</h2>
          <Button onClick={() => isAdding ? handleCancelAdding() : setIsAdding(true)}>
            {isAdding ? 'Cancel' : <><Plus className="w-4 h-4 mr-1" /> Add Topic</>}
          </Button>
        </div>

        {isAdding && (
          <form onSubmit={handleAddTopic} className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mb-6 animate-fade-in">
            <h4 className="font-medium text-emerald-900 mb-4">Add New Topic to {activeCategory}</h4>
            <div className="space-y-6">
              {/* Title Input Area */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Topic Title</label>
                <input 
                  type="text" 
                  value={newTopic.title}
                  onChange={(e) => setNewTopic(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Rukun Wudhu"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Question Input Area */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Question / Activity Prompt (Multiple Images Supported)</label>
                <div>
                    <input 
                        id="questionFileInput"
                        type="file" 
                        multiple
                        accept="image/*"
                        onChange={handleMultipleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 mb-4"
                    />
                    
                    {newTopic.questionFiles.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Previews (Drag to reorder):</p>
                        <div className="space-y-2">
                          {newTopic.questionFiles.map((qFile, index) => (
                            <div 
                              key={qFile.id}
                              draggable
                              onDragStart={(e) => handleQDragStart(e, index)}
                              onDragEnter={(e) => handleQDragEnter(e, index)}
                              onDragEnd={dropQ}
                              onDragOver={(e) => e.preventDefault()}
                              className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 cursor-move hover:border-emerald-300 transition-colors"
                            >
                              <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <img 
                                src={qFile.preview} 
                                alt={`Preview ${index}`} 
                                className="h-16 w-16 object-cover rounded border border-gray-300 cursor-zoom-in hover:opacity-80 transition-opacity" 
                                onClick={() => setEnlargedImage(qFile.preview)}
                              />
                              <div className="flex-grow text-sm text-gray-600 truncate">{qFile.file.name}</div>
                              <button type="button" onClick={() => removeQuestionFile(qFile.id)} className="text-red-400 hover:text-red-600 p-2">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Answer Input Area */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Answer Scheme / Guidance (Image Only)</label>
                <div>
                    <input 
                        id="answerFileInput"
                        type="file" 
                        accept="image/*"
                        required
                        onChange={(e) => handleFileChange(e, 'answer')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                     {newTopic.answerPreview && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Preview:</p>
                        <img 
                          src={newTopic.answerPreview} 
                          alt="Answer Preview" 
                          className="max-h-48 rounded-lg border border-gray-200 shadow-sm object-contain cursor-zoom-in hover:opacity-80 transition-opacity" 
                          onClick={() => setEnlargedImage(newTopic.answerPreview)}
                        />
                      </div>
                     )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={uploading}>
                    {uploading ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Uploading...</>
                    ) : 'Save Topic'}
                </Button>
              </div>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {categoryTopics.length === 0 && !isAdding ? (
            <div className="text-center py-12 text-gray-500">
              No topics in this category yet.
            </div>
          ) : (
            categoryTopics.map(topic => (
              <div key={topic.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold text-lg text-emerald-800 mb-2">{topic.title || 'Untitled Topic'}</div>
                    <div className="font-bold text-gray-900 mb-2 flex items-start">
                        <span className="text-gray-400 mr-2">Q:</span> 
                        <div>
                             {topic.questionType === 'text' ? topic.question : renderContentPreview(topic.question, topic.questionType)}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 border-l-4 border-emerald-500">
                      <strong>Answer Scheme:</strong> 
                      <div className="mt-1">
                          {topic.answerType === 'text' ? topic.answerScheme : renderContentPreview(topic.answerScheme, topic.answerType)}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteTopic(topic.id)} className="text-gray-400 hover:text-red-600 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Lightbox for Database Manager */}
        <ImageLightbox src={enlargedImage} onClose={() => setEnlargedImage(null)} />
      </div>
    </div>
  );
};

const ModuleViewer = ({ module, topics, onBack, isStudent }) => {
  const { title, themeColor, tentative, selectedTopics } = module;
  const color = themeColor || '#10b981';
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Organize selected topics data for rendering
  const renderedCategories = Object.keys(selectedTopics).map(category => {
    const catTopicIds = selectedTopics[category] || [];
    const catTopicsData = catTopicIds.map(id => topics.find(t => t.id === id)).filter(Boolean);
    return { name: category, topics: catTopicsData };
  }).filter(c => c.topics.length > 0);

  const renderContent = (content, type) => {
      if (type === 'image') {
          if (Array.isArray(content)) {
             return (
                 <div className="mt-4 space-y-4">
                     {content.map((imgUrl, i) => (
                         <div key={i} className="border rounded-lg overflow-hidden bg-gray-50 flex justify-center p-2 shadow-sm cursor-zoom-in hover:bg-gray-200 transition-colors" onClick={() => setEnlargedImage(imgUrl)}>
                             <img src={imgUrl} alt={`Content ${i}`} className="max-w-full h-auto max-h-[60vh] object-contain" />
                         </div>
                     ))}
                 </div>
             );
          }
          return (
              <div className="mt-4 border rounded-lg overflow-hidden bg-gray-50 flex justify-center p-2 shadow-sm cursor-zoom-in hover:bg-gray-200 transition-colors" onClick={() => setEnlargedImage(content)}>
                  <img src={content} alt="Content" className="max-w-full h-auto max-h-[60vh] object-contain" />
              </div>
          );
      }
      return null;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-t-3xl shadow-2xl overflow-hidden mb-16 animate-fade-in pb-12">
      {/* Dynamic Header */}
      <div 
        className="pt-12 pb-16 px-8 text-center text-white relative"
        style={{ backgroundColor: color }}
      >
        <button onClick={onBack} className="absolute top-6 left-6 text-white/80 hover:text-white transition-colors flex items-center bg-black/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">{title}</h1>
        <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full font-medium tracking-wide">
          SMART SOLEH PROGRAM
        </div>
        
        {/* Decorative Wave/Shape at bottom of header could go here, simplified to a rounded border below */}
      </div>

      <div className="px-6 md:px-12 py-8 -mt-8 relative z-10 space-y-12 bg-white rounded-t-3xl">
        
        {/* Tentative Section */}
        {tentative && tentative.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold border-b-2 pb-2 mb-6 flex items-center" style={{ borderColor: color, color: color }}>
              <Clock className="w-6 h-6 mr-2" />
              Tentatif Program
            </h2>
            <div className="space-y-4">
              {tentative.map((item, i) => (
                <div key={item.id} className="flex items-start">
                  <div className="w-24 flex-shrink-0 font-bold text-gray-600 pt-1">{item.time}</div>
                  <div className="flex-1 relative pb-6 border-l-2 pl-6" style={{ borderColor: `${color}40` }}>
                    <div className="absolute w-4 h-4 rounded-full -left-[9px] top-1.5 border-4 border-white shadow-sm" style={{ backgroundColor: color }}></div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 shadow-sm text-gray-800 font-medium">
                      {item.activity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categories / Modules Section */}
        {renderedCategories.map((categoryData, idx) => (
          <section key={idx} className="pt-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md rotate-3" style={{ backgroundColor: color }}>
                {idx + 1}
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{categoryData.name}</h2>
            </div>
            
            <div className="grid gap-6 pl-4 md:pl-16">
              {categoryData.topics.map((topic, tIdx) => (
                <div key={tIdx} className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    {topic.title && <h3 className="text-xl font-bold text-emerald-700 mb-4">{topic.title}</h3>}
                    <div className="text-lg font-bold text-gray-900 mb-2 flex items-start">
                      <span className="text-gray-400 font-normal mr-2">Q:</span>
                      <div className="flex-1 w-full">
                         {renderContent(topic.question, topic.questionType)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Facilitator Answer View */}
                  {!isStudent && (
                    <div className="bg-amber-50 border-t border-amber-100 p-6">
                      <div className="flex items-center text-amber-800 font-bold mb-3">
                        <Settings className="w-4 h-4 mr-2" /> Answer Scheme (Facilitator Only)
                      </div>
                      <div className="text-amber-900 w-full">
                          {renderContent(topic.answerScheme, topic.answerType)}
                      </div>
                    </div>
                  )}
                  
                  {/* Student Answer Space (Blank) */}
                  {isStudent && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50/50 min-h-[150px] flex flex-col items-center justify-center text-gray-400 border-dashed border-2 m-4 rounded-xl">
                       <span>[ Ruangan Jawapan / Aktiviti ]</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      
      {/* Lightbox for Module Viewer */}
      <ImageLightbox src={enlargedImage} onClose={() => setEnlargedImage(null)} />
    </div>
  );
};