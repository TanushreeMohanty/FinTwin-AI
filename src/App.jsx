import Footer from './components/Footer'; // <--- Add this line
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Smartphone,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  LogOut,
  Clipboard,
  Wifi,
  X,
  BellRing,
  Settings // Settings Icon is now imported
} from 'lucide-react';

import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { collection, addDoc, onSnapshot, deleteDoc, doc, setDoc } from 'firebase/firestore';

// Import distributed files
import { auth, db, appId, googleProvider } from './config/firebase';
import { parseSMS } from './utils/helpers';
import AuthScreen from './components/AuthScreen';
import InsightCard from './components/InsightCard';
import SpendingGraph from './components/SpendingGraph';

export default function FinanceApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(30000);
  const [dailyLimit, setDailyLimit] = useState(0); 
  const [smsInput, setSmsInput] = useState('');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [parsedPreview, setParsedPreview] = useState(null);

  // Profile Form State
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newDailyLimit, setNewDailyLimit] = useState('');

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualType, setManualType] = useState('income');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualCat, setManualCat] = useState('Salary');

  // --- Auth & Data Effects ---
  useEffect(() => {
    // Only listen for auth changes. We do NOT auto-login anonymously anymore.
    if(auth) {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setNewName(currentUser.displayName || `User ${currentUser.uid.slice(0, 4)}`);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    } else {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const txQuery = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    
    const unsubTx = onSnapshot(txQuery, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      txData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setTransactions(txData);
    }, (err) => console.error("Tx Error:", err));

    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.budget) {
            setBudget(data.budget);
            setNewBudget(data.budget);
        }
        if (data.dailyLimit) {
            setDailyLimit(data.dailyLimit);
            setNewDailyLimit(data.dailyLimit);
        }
      }
    });

    return () => {
      unsubTx();
      unsubSettings();
    };
  }, [user]);

  // Auto-parse effect
  useEffect(() => {
    if (smsInput) {
        const parsed = parseSMS(smsInput);
        setParsedPreview(parsed);
    } else {
        setParsedPreview(null);
    }
  }, [smsInput]);

  // --- Logic ---
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const insights = useMemo(() => {
    const res = [];
    const expenses = transactions.filter(t => t.type === 'expense');
    const remaining = budget - totalExpense;
    
    if (remaining < 0) {
        const catTotals = {};
        expenses.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);
        const topCat = Object.entries(catTotals).sort(([,a], [,b]) => b - a)[0];
        const topCatName = topCat ? topCat[0] : 'General';
        res.push({ 
            type: 'danger', 
            message: `Over Budget: You've exceeded your limit by ₹${Math.abs(remaining).toLocaleString()}.`,
            suggestion: `Your highest spend is on ${topCatName}. Try to pause all non-essential ${topCatName} purchases.`
        });
    } else if (remaining < budget * 0.15) {
        res.push({ 
            type: 'warning', 
            message: `Tight Budget: Only ₹${remaining.toLocaleString()} left for the month.`,
            suggestion: "Avoid eating out. Cooking at home could save you approx ₹300/day."
        });
    } else {
        const potentialSavings = Math.round(remaining * 0.3);
        res.push({ 
            type: 'success', 
            message: `On Track: You have ₹${remaining.toLocaleString()} remaining.`,
            suggestion: `Consider moving ₹${potentialSavings.toLocaleString()} to savings.`
        });
    }
    
    if (dailyLimit > 0) {
        const todayStr = new Date().toDateString();
        const todaySpent = expenses
            .filter(t => new Date(t.timestamp).toDateString() === todayStr)
            .reduce((acc, t) => acc + t.amount, 0);
            
        if (todaySpent > dailyLimit) {
            res.push({ type: 'danger', message: `Daily Limit Exceeded: ₹${todaySpent.toLocaleString()} spent today.`, suggestion: "Try a 'No Spend Day' tomorrow." });
        } else if (todaySpent > dailyLimit * 0.8) {
            res.push({ type: 'warning', message: `Near Daily Limit: Used ${Math.round((todaySpent/dailyLimit)*100)}% of today's limit.`, suggestion: "Put away the wallet for the evening." });
        }
    }
    return res;
  }, [transactions, budget, dailyLimit, totalExpense]);

  // --- Handlers ---
  const handleGoogleLogin = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error(error);
        showNotification("Google Sign-In failed", "error");
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
        const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
        await setDoc(settingsRef, { 
            budget: Number(newBudget),
            dailyLimit: Number(newDailyLimit),
            displayName: newName
        }, { merge: true });
        
        setBudget(Number(newBudget));
        setDailyLimit(Number(newDailyLimit));
        showNotification("Profile updated successfully!");
        setActiveTab('dashboard');
    } catch (e) {
        showNotification("Failed to update profile", "error");
    }
  };

  const addTransaction = async (data) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), {
        ...data,
        timestamp: new Date().toISOString()
      });
      showNotification('Transaction added!');
      setSmsInput('');
      setParsedPreview(null);
    } catch (e) {
      showNotification('Failed to save.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id));
  };

  const handleParse = () => {
    const result = parseSMS(smsInput);
    if (result) {
      addTransaction(result);
    } else {
      showNotification('Invalid SMS format', 'error');
    }
  };

  const handleClipboard = async () => {
    try {
        const text = await navigator.clipboard.readText();
        setSmsInput(text);
        showNotification("Text pasted from clipboard");
    } catch (err) {
        showNotification("Clipboard access denied", "error");
    }
  };

  const handleAutoReadSMS = async () => {
    setIsListening(true);
    showNotification("Listening for incoming bank SMS...", "info");

    if ('credentials' in navigator) {
      try {
        const content = await navigator.credentials.get({
            otp: { transport: ['sms'] },
            signal: new AbortController().signal
        });
        if (content && content.code) {
           setSmsInput(`Detected OTP Code: ${content.code}`);
           showNotification("OTP Detected");
           setIsListening(false);
           return;
        }
      } catch (e) { /* Ignore */ }
    }

    setTimeout(() => {
        const mockSMS = "Acct XX882 debited for Rs. 1,850.00 at Swiggy Foods on 12-Dec. Avbl Bal Rs 15000.";
        setSmsInput(mockSMS);
        const parsed = parseSMS(mockSMS);
        if (parsed) {
            addTransaction(parsed);
            showNotification(`Auto-detected: ₹${parsed.amount}`, "success");
        }
        setIsListening(false);
    }, 3000);
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>;
  
  // Updated Render: Only show Google Login
  if (!user) return <AuthScreen onGoogleLogin={handleGoogleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 relative pb-24 overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 pb-24 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="text-blue-400" /> SmartSpend
            </h1>
          </div>
          
          {/* UPDATED HEADER: Profile Image Button */}
          <div className="relative group">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-10 h-10 rounded-full relative overflow-hidden border transition-colors ${activeTab === 'profile' ? 'border-blue-400 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : 'border-slate-600'}`}
              >
                 <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-400">
                    <User size={18} />
                 </div>
                 {user.photoURL && (
                     <img 
                       src={user.photoURL} 
                       alt="User" 
                       referrerPolicy="no-referrer" 
                       className="w-full h-full object-cover relative z-10"
                       onError={(e) => e.target.style.display = 'none'} 
                     />
                 )}
              </button>

              {/* THE HOVER TOOLTIP */}
              <div className="absolute right-0 top-12 bg-white text-slate-900 text-xs font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                  {user.displayName || 'User'}
              </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="relative z-10">
           <p className="text-slate-400 text-sm mb-1">Total Balance</p>
           <h2 className="text-4xl font-bold tracking-tight">₹{(totalIncome - totalExpense).toLocaleString()}</h2>
           <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><ArrowDownLeft size={14} /></span>
                <div><p className="text-xs text-slate-400">Income</p><p className="font-semibold text-green-400 text-sm">₹{totalIncome.toLocaleString()}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400"><ArrowUpRight size={14} /></span>
                <div><p className="text-xs text-slate-400">Spent</p><p className="font-semibold text-rose-400 text-sm">₹{totalExpense.toLocaleString()}</p></div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 -mt-16 relative z-20">
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg p-1 flex mb-6">
          {['dashboard', 'sms', 'insights'].map((tab) => (
             <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                activeTab === tab 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
             >
               {tab}
             </button>
          ))}
        </div>

        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => { setManualType('income'); setManualCat('Salary'); setShowAddModal(true); }}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-colors"
                >
                    <Plus size={18} /> Add Income
                </button>
                <button 
                    onClick={() => { setManualType('expense'); setManualCat('Food'); setShowAddModal(true); }}
                    className="flex items-center justify-center gap-2 bg-white text-rose-600 border border-rose-100 p-3 rounded-xl font-bold shadow-sm hover:bg-rose-50 transition-colors"
                >
                    <Plus size={18} /> Add Expense
                </button>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-end mb-2">
                 <h3 className="font-bold text-gray-700">Monthly Budget</h3>
                 <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {budget > 0 ? Math.round((totalExpense / budget) * 100) : 0}% Used
                 </span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${totalExpense > budget ? 'bg-red-500' : 'bg-blue-600'}`} 
                  style={{ width: `${budget > 0 ? Math.min((totalExpense / budget) * 100, 100) : 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Spent: ₹{totalExpense.toLocaleString()}</span>
                <span>Limit: ₹{budget.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3 px-1">Recent Transactions</h3>
              {transactions.length > 0 ? (
                transactions.slice(0, 10).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl mb-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {t.type === 'income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{t.merchant}</h4>
                        <p className="text-xs text-gray-500">{t.category} • {new Date(t.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-rose-600'}`}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                      </p>
                      <button onClick={() => handleDelete(t.id)} className="text-xs text-gray-300 hover:text-red-500 mt-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-10 bg-white rounded-xl border border-dashed">No transactions found.</p>
              )}
            </div>
          </div>
        )}

        {/* --- SMS TAB --- */}
        {activeTab === 'sms' && (
          <div className="space-y-4">
            <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-bold text-lg flex items-center gap-2"><Smartphone size={20}/> Auto-Parser</h3>
                <p className="text-indigo-100 text-xs mt-1">Simulate notification reading or paste SMS to track.</p>
              </div>
            </div>

            <button 
                onClick={handleAutoReadSMS}
                disabled={isListening}
                className={`w-full py-5 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${isListening ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
            >
                {isListening ? (
                    <>
                        <div className="flex gap-2 items-center animate-pulse">
                            <BellRing size={24} />
                            <span className="text-lg font-bold">Listening for SMS...</span>
                        </div>
                        <span className="text-xs bg-white/50 px-2 py-1 rounded">Waiting for notification... (Simulated)</span>
                    </>
                ) : (
                    <>
                        <Wifi size={24} />
                        <div className="text-center">
                            <span className="text-sm font-bold block">Start Auto-Read Listener</span>
                            <span className="text-[10px] opacity-70">Simulates "Reading from Notification" (WebOTP Style)</span>
                        </div>
                    </>
                )}
            </button>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                 <label className="text-sm font-medium text-gray-700">Message Content</label>
                 <button onClick={handleClipboard} className="text-xs flex items-center gap-1 text-blue-600 font-medium hover:underline">
                    <Clipboard size={12} /> Paste Clipboard
                 </button>
              </div>
              <textarea 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[100px]"
                placeholder="Paste transaction SMS here..."
                value={smsInput}
                onChange={(e) => setSmsInput(e.target.value)}
              />

              {parsedPreview && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl flex justify-between items-center animate-slide-up">
                      <div>
                          <p className="text-xs text-green-800 font-bold uppercase tracking-wider mb-0.5">Detected</p>
                          <p className="text-sm font-bold text-gray-800">
                              {parsedPreview.merchant} <span className="font-normal text-gray-500">for</span> ₹{parsedPreview.amount}
                          </p>
                      </div>
                      <button 
                        onClick={handleParse}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-green-200 hover:bg-green-700"
                      >
                          Add Now
                      </button>
                  </div>
              )}
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                 <button 
                  onClick={() => setSmsInput("")}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
                 >
                   Clear Text
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* --- INSIGHTS TAB --- */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">AI Analysis & Graphs</h3>
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-bold">BETA</span>
             </div>
             <SpendingGraph transactions={transactions} />
             <h4 className="font-bold text-gray-700 mt-6 mb-3">AI Suggestions</h4>
             {insights.length > 0 ? insights.map((insight, idx) => <InsightCard key={idx} insight={insight} />) : (
               <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
                  <Check className="text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Spending is within limits. No specific alerts yet.</p>
               </div>
             )}
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
            <div className="space-y-6">
                
                {/* NEW: Profile Card with Image */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center animate-slide-up">
                    <div className="w-24 h-24 rounded-full bg-slate-100 mb-3 overflow-hidden border-4 border-white shadow-lg relative group">
                        {user.photoURL ? (
                            <img 
                                src={user.photoURL} 
                                alt="Profile" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <User size={40} />
                            </div>
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">{user.displayName || 'User'}</h2>
                    <p className="text-sm text-gray-500 font-medium">{user.email}</p>
                    <div className="mt-2 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">
                    User ID: {user.uid}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Settings size={18} className="text-gray-400"/> Preferences
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Display Name</label>
                            <input 
                                type="text" 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Monthly Budget (₹)</label>
                            <input 
                                type="number" 
                                value={newBudget}
                                onChange={(e) => setNewBudget(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Daily Spending Limit (₹)</label>
                            <input 
                                type="number" 
                                value={newDailyLimit}
                                onChange={(e) => setNewDailyLimit(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                                placeholder="Optional"
                            />
                        </div>
                        <button 
                            onClick={handleUpdateProfile}
                            className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-transform active:scale-95"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
                <button 
                    onClick={() => signOut(auth)}
                    className="w-full flex items-center justify-center gap-2 py-4 text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors font-bold text-sm"
                >
                    <LogOut size={18} /> Sign Out
                </button>
            </div>
        )}

      </div>

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-gray-800">
                        {manualType === 'income' ? 'Add Income 💰' : 'Add Expense 💸'}
                    </h3>
                    <button onClick={() => setShowAddModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input 
                                type="number" 
                                autoFocus
                                value={manualAmount}
                                onChange={(e) => setManualAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none font-bold text-lg transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                        <input 
                            type="text" 
                            value={manualDesc}
                            onChange={(e) => setManualDesc(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none font-medium transition-all"
                            placeholder={manualType === 'income' ? "e.g., Salary, Bonus" : "e.g., Dinner, Taxi"}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                        <select 
                            value={manualCat}
                            onChange={(e) => setManualCat(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none font-medium appearance-none transition-all"
                        >
                            {manualType === 'income' ? (
                                <>
                                    <option value="Salary">Salary</option>
                                    <option value="Freelance">Freelance</option>
                                    <option value="Interest">Interest</option>
                                    <option value="Refund">Refund</option>
                                    <option value="Gift">Gift</option>
                                    <option value="Other">Other</option>
                                </>
                            ) : (
                                <>
                                    <option value="Food">Food</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Groceries">Groceries</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Health">Health</option>
                                    <option value="Bills">Bills</option>
                                    <option value="Shopping">Shopping</option>
                                    <option value="Other">Other</option>
                                </>
                            )}
                        </select>
                    </div>

                    <button 
                        onClick={() => {
                            if (!manualAmount || !manualDesc) return showNotification("Please fill all fields", "error");
                            addTransaction({
                                amount: parseFloat(manualAmount),
                                merchant: manualDesc,
                                category: manualCat,
                                type: manualType,
                                originalText: 'Manual Entry',
                                timestamp: new Date().toISOString()
                            });
                            setShowAddModal(false);
                            setManualAmount('');
                            setManualDesc('');
                        }}
                        className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg mt-4 transition-transform active:scale-95 ${
                            manualType === 'income' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                        }`}
                    >
                        Save Transaction
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-4 left-4 right-4 p-4 rounded-xl shadow-2xl text-white flex items-center gap-3 z-50 animate-bounce-in ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{notification.msg}</p>
        </div>
      )}

<div className="px-4 relative z-20">
         <Footer />
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="...">
           {/* ... */}
        </div>
      )}

    </div>  
    );
}