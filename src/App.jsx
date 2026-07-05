import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database"; 

const firebaseConfig = {
  apiKey: "AIzaSyB5_WiMFhRpVk5OxiZTTruYlDc9dt3AH6Y",
  authDomain: "compound-pro.firebaseapp.com",
  projectId: "compound-pro",
  storageBucket: "compound-pro.firebasestorage.app",
  messagingSenderId: "3452723447",
  appId: "1:3452723447:web:d91b83e92a14d481b6b3f2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app); 

const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 Hours

export default function App() {
  // --- 🪄 INJECT PREMIUM FONTS, TAB NAME & FAVICON ---
  useEffect(() => {
    document.title = "CompoundPro";

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#10B981'; 
      ctx.fill();
    }
    const linkFavicon = document.querySelector("link[rel*='icon']") || document.createElement('link');
    linkFavicon.type = 'image/x-icon';
    linkFavicon.rel = 'shortcut icon';
    linkFavicon.href = canvas.toDataURL("image/x-icon");
    document.head.appendChild(linkFavicon);

    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    document.head.appendChild(link2);

    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href = 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..0,900;1,100..0,900&family=Unbounded:wght@200..900&display=swap';
    document.head.appendChild(link3);
  }, []);

  // --- 🔒 PASSWORDS FOR 5 USERS ---
  const passwordsDatabase = {
    "Chenura$120": { id: "trader1", username: "chenura", name: "Chenura" },
    "Rachiya@345": { id: "trader2", username: "raxir", name: "Rachitha" },
    "Nepu@#5678": { id: "trader3", username: "nepu", name: "Theekshana" },
    "Ayesh*&0008": { id: "trader4", username: "ayesh", name: "Ayesh" },
    "Dassa@@1234": { id: "trader5", username: "dasun", name: "Dasun" }
  };

  // --- SAVE STATES ON PAGE REFRESH ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const savedAuth = localStorage.getItem('cp_isAuthenticated');
    const loginTime = localStorage.getItem('cp_loginTimestamp');
    
    if (savedAuth === 'true' && loginTime) {
      if (Date.now() - parseInt(loginTime, 10) < SESSION_TIMEOUT_MS) {
        return true;
      } else {
        localStorage.clear();
      }
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const user = localStorage.getItem('cp_currentUser');
    return user ? JSON.parse(user) : null;
  });

  const [view, setView] = useState(() => {
    return localStorage.getItem('cp_currentView') || 'dashboard';
  });

  const [allPlans, setAllPlans] = useState(() => {
    const savedPlans = localStorage.getItem('cp_allPlans');
    return savedPlans ? JSON.parse(savedPlans) : { trader1: [], trader2: [], trader3: [], trader4: [], trader5: [] };
  });

  const [activePlan, setActivePlan] = useState(() => {
    const plan = localStorage.getItem('cp_activePlan');
    return plan ? JSON.parse(plan) : null;
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [customAlert, setCustomAlert] = useState({ isOpen: false, type: 'info', title: '', message: '', action: null });
  const [rewardSelectionModal, setRewardSelectionModal] = useState({ isOpen: false, resolve: null });

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

  useEffect(() => {
    localStorage.setItem('cp_isAuthenticated', isAuthenticated ? 'true' : 'false');
    localStorage.setItem('cp_currentView', view);
    localStorage.setItem('cp_currentUser', currentUser ? JSON.stringify(currentUser) : '');
    localStorage.setItem('cp_activePlan', activePlan ? JSON.stringify(activePlan) : '');
    localStorage.setItem('cp_allPlans', JSON.stringify(allPlans));
  }, [isAuthenticated, view, currentUser, activePlan, allPlans]);

  useEffect(() => {
    const fetchStoredDataOnRefresh = async () => {
      if (isAuthenticated && currentUser) {
        try {
          const userRef = ref(db, "compoundpro_vault/" + currentUser.id);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            setAllPlans(data);
            
            if (activePlan) {
              const freshActive = data[currentUser.id]?.find(p => p.id === activePlan.id);
              if (freshActive) setActivePlan(freshActive);
            }
          }
        } catch (e) {
          console.error("Error loading data from database:", e);
        } finally {
          setIsInitialSyncDone(true);
        }
      } else {
        setIsInitialSyncDone(true);
      }
    };
    fetchStoredDataOnRefresh();
  }, [isAuthenticated]);

  useEffect(() => {
    const saveToFirebase = async () => {
      if (currentUser && isAuthenticated && isInitialSyncDone) {
        try {
          const userRef = ref(db, "compoundpro_vault/" + currentUser.id);
          await set(userRef, allPlans);
        } catch (error) {
          console.error("Error saving data to database:", error);
        }
      }
    };
    saveToFirebase();
  }, [allPlans, currentUser, isAuthenticated, isInitialSyncDone]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSessionExpiry = () => {
      const loginTime = localStorage.getItem('cp_loginTimestamp');
      if (loginTime && (Date.now() - parseInt(loginTime, 10) >= SESSION_TIMEOUT_MS)) {
        triggerPopupAlert('Session Expired', 'Your login session has timed out. Please login again.', 'info');
        handleLogoutAction();
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const tradesHistory = activePlan ? activePlan.tradesHistory || [] : [];
  const withdrawals = activePlan ? activePlan.withdrawals || [] : [];

  const [withdrawalInput, setWithdrawalInput] = useState('');
  const [tradeNote, setTradeNote] = useState('');

  const [planName, setPlanName] = useState('');
  const [initialBalance, setInitialBalance] = useState('100');
  const [riskPercent, setRiskPercent] = useState(20); 

  const currentTraderPlans = currentUser ? (allPlans[currentUser.id] || []) : [];

  const triggerPopupAlert = (title, message, type = 'info', action = null) => {
    setCustomAlert({ isOpen: true, type, title, message, action });
  };

  const closePopupAlert = () => {
    setCustomAlert(prev => ({ ...prev, isOpen: false }));
  };

  const handleExportSessionCSV = () => {
    if (!activePlan || tradesHistory.length === 0) {
      triggerPopupAlert('No Data', 'You do not have any trades logged in this plan yet!', 'warning');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Trade Number,Date,Starting Balance,Money At Risk,Risk Reward Ratio,Result,Gain or Loss,Ending Balance,Note\n";

    tradesHistory.forEach(t => {
      const row = `${t.tradeNum},${t.date},${t.startingBalance.toFixed(2)},${t.riskAmount.toFixed(2)},1:${t.rewardRatio},${t.status},${t.payout.toFixed(2)},${t.endingBalance.toFixed(2)},"${t.note.replace(/"/g, '""')}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activePlan.name.replace(/\s+/g, '_')}_Trade_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerPopupAlert('Exported!', 'Your trade history has been downloaded successfully as a CSV file.', 'success');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    const matchedProfile = passwordsDatabase[passwordInput.trim()];
    
    if (matchedProfile) {
      setIsLoadingData(true);
      try {
        const userRef = ref(db, "compoundpro_vault/" + matchedProfile.id);
        const snapshot = await get(userRef);

        let pulledPlans = { trader1: [], trader2: [], trader3: [], trader4: [], trader5: [] };
        if (snapshot.exists()) {
          pulledPlans = snapshot.val();
        } else {
          pulledPlans[matchedProfile.id] = [];
        }

        localStorage.setItem('cp_loginTimestamp', Date.now().toString());
        setAllPlans(pulledPlans);
        setCurrentUser(matchedProfile);
        setIsAuthenticated(true);
        setView('dashboard');
        setInitialBalance('100');
        setPasswordInput('');
        setIsInitialSyncDone(true);
      } catch (error) {
        console.error("Database connection error:", error);
        setLoginError('Could not connect to the database.');
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setLoginError('Wrong password! Please check and try again.');
    }
  };

  const handleLogoutAction = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActivePlan(null);
    setIsMobileMenuOpen(false);
    setView('dashboard');
    setIsInitialSyncDone(false);
    localStorage.clear();
    setAllPlans({ trader1: [], trader2: [], trader3: [], trader4: [], trader5: [] });
  };

  const handleCreatePlan = (e) => {
    e.preventDefault();
    const parsedInitial = parseFloat(initialBalance);
    
    const newPlan = {
      id: Date.now(),
      name: planName || `Trading Plan ${currentTraderPlans.length + 1}`,
      initialBalance: parsedInitial,
      currentBalance: parsedInitial,
      riskPercent: Number(riskPercent),
      status: 'Active',
      tradesHistory: [],
      withdrawals: []
    };
    
    const updatedPlansList = {
      ...allPlans,
      [currentUser.id]: [...(allPlans[currentUser.id] || []), newPlan]
    };

    setAllPlans(updatedPlansList);
    setActivePlan(newPlan);
    setView('active');
    setPlanName('');
    setIsMobileMenuOpen(false);
  };

  const handleLaunchRadar = (plan) => {
    setActivePlan(plan);
    setView('active');
    setIsMobileMenuOpen(false);
  };

  const askRewardMultiple = () => {
    return new Promise((resolve) => {
      setRewardSelectionModal({ isOpen: true, resolve });
    });
  };

  const handleExecuteCurrentTrade = async (status) => {
    if (!activePlan || activePlan.status === 'Ended') return;
    
    let chosenRatio = 2; 
    const currentBalance = activePlan.currentBalance;
    const riskAmount = currentBalance * (activePlan.riskPercent / 100);

    if (status === 'Win') {
      chosenRatio = await askRewardMultiple();
      if (!chosenRatio) return; 
    }

    let payout = 0;
    if (status === 'Win') {
      payout = riskAmount * chosenRatio; 
    } else if (status === 'Loss') {
      payout = -riskAmount;
    }
    
    const newEndingBalance = Math.round((currentBalance + payout) * 100) / 100;
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const formattedDate = `${months[now.getMonth()]} ${day}, ${now.getFullYear()}`;
    
    const loggedTrade = {
      id: Date.now(),
      tradeNum: tradesHistory.length + 1,
      date: formattedDate,
      startingBalance: currentBalance,
      riskAmount: riskAmount,
      rewardRatio: status === 'Win' ? chosenRatio : 1,
      status: status,
      payout: payout,
      endingBalance: newEndingBalance,
      note: tradeNote || (status === 'Win' ? `Won with 1:${chosenRatio} RR` : 'Lost trade')
    };

    const updatedHistory = [...tradesHistory, loggedTrade];
    const updatedPlan = { 
      ...activePlan, 
      currentBalance: newEndingBalance,
      tradesHistory: updatedHistory 
    };
    
    setActivePlan(updatedPlan);
    setAllPlans(prev => ({
      ...prev,
      [currentUser.id]: prev[currentUser.id].map(p => p.id === activePlan.id ? updatedPlan : p)
    }));
    setTradeNote('');
  };

  const handleUndoLastTrade = (tradeId) => {
    if (tradesHistory.length === 0) return;
    
    const lastLoggedTrade = tradesHistory[tradesHistory.length - 1];
    if (lastLoggedTrade.id !== tradeId) return;

    triggerPopupAlert(
      'Undo Last Trade',
      `Are you sure you want to remove Trade #${lastLoggedTrade.tradeNum}? This will revert your balance back to $${lastLoggedTrade.startingBalance.toFixed(2)}.`,
      'warning',
      () => {
        const revisedHistory = tradesHistory.slice(0, -1);
        const revisedPlan = {
          ...activePlan,
          currentBalance: lastLoggedTrade.startingBalance,
          tradesHistory: revisedHistory
        };

        setActivePlan(revisedPlan);
        setAllPlans(prev => ({
          ...prev,
          [currentUser.id]: prev[currentUser.id].map(p => p.id === activePlan.id ? revisedPlan : p)
        }));
      }
    );
  };

  const handleWithdraw = (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawalInput);
    if (!amount || amount <= 0 || amount > activePlan.currentBalance) {
      triggerPopupAlert('Low Balance', "You do not have enough money in your account balance to withdraw this amount!", 'warning');
      return;
    }
    const newBalance = Math.round((activePlan.currentBalance - amount) * 100) / 100;
    const newWithdrawal = {
      id: Date.now(),
      amount: amount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedWithdrawals = [...withdrawals, newWithdrawal];
    const updatedPlan = { 
      ...activePlan, 
      currentBalance: newBalance,
      withdrawals: updatedWithdrawals 
    };
    
    setActivePlan(updatedPlan);
    setAllPlans(prev => ({
      ...prev,
      [currentUser.id]: prev[currentUser.id].map(p => p.id === activePlan.id ? updatedPlan : p)
    }));
    setWithdrawalInput('');
    triggerPopupAlert('Withdrawal Done', `Successfully withdrew $${amount.toLocaleString()} from your plan balance.`, 'success');
  };

  const handleDeleteSession = (id) => {
    triggerPopupAlert(
      'Confirm Delete',
      'Are you sure you want to permanently delete this trading plan? This cannot be undone.',
      'danger',
      () => {
        setAllPlans(prev => ({
          ...prev,
          [currentUser.id]: prev[currentUser.id].filter(p => p.id !== id)
        }));
        if (activePlan?.id === id) {
          setActivePlan(null); setView('dashboard');
        }
      }
    );
  };

  const handleEndCompound = () => {
    const endedPlan = { ...activePlan, status: 'Ended' };
    setActivePlan(endedPlan);
    setAllPlans(prev => ({
      ...prev,
      [currentUser.id]: prev[currentUser.id].map(p => p.id === activePlan.id ? endedPlan : p)
    }));
    triggerPopupAlert('Plan Frozen', 'This trading plan is now locked and frozen.', 'info');
  };

  const nextRiskAmt = (activePlan?.currentBalance || 0) * ((activePlan?.riskPercent || 20) / 100);
  
  // --- CHART LOGIC VARIABLES ---
  const seedBalance = activePlan?.initialBalance || 100;
  const growthHistory = [0, ...tradesHistory.map(t => ((t.endingBalance - seedBalance) / seedBalance) * 100)];
  const dateLabels = ["Start", ...tradesHistory.map(t => t.date || "")];

  const maxGrowth = Math.max(...growthHistory, 50);
  const minGrowth = Math.min(...growthHistory, -20);
  const growthRange = maxGrowth - minGrowth > 0 ? maxGrowth - minGrowth : 1;

  const chartPoints = growthHistory.map((g, i) => {
    const x = (i / Math.max(growthHistory.length - 1, 1)) * 890 + 55; 
    const y = 130 - ((g - minGrowth) / growthRange) * 100; 
    return `${x},${y}`;
  }).join(' ');

  const totalTradesCount = tradesHistory.length;
  const winsCount = tradesHistory.filter(t => t.status === 'Win').length;
  const lossesCount = tradesHistory.filter(t => t.status === 'Loss').length;
  const winRatePercent = totalTradesCount > 0 ? Math.round((winsCount / totalTradesCount) * 100) : 0;
  const lossRatePercent = totalTradesCount > 0 ? Math.round((lossesCount / totalTradesCount) * 100) : 0;

  if (!isAuthenticated) {
    return (
      <div 
        style={{ 
          fontFamily: '"Montserrat", sans-serif',
          backgroundColor: '#ffffff',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M60 0H0v60h60V0zM1 59V1h58v58H1z' fill='%2310b981' fill-opacity='0.04'/%3E%3Cpath d='M60 0H0v60h60V0z' fill='none' stroke='%2310b981' stroke-width='0.5' stroke-opacity='0.08' stroke-dasharray='5,5'/%3E%3C/svg%3E")`
        }} 
        className="min-h-screen text-[#1E293B] flex flex-col items-center justify-center p-4 relative"
      >
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-[#E2E8F0] p-8 rounded-3xl shadow-xl space-y-6 z-10">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center text-white mx-auto mb-4 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            </div>
            <h2 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xl font-bold text-[#0F172A] tracking-tight">CompoundPro</h2>
            <p className="text-sm font-bold text-[#047857] mt-1.5 bg-[#E6F4EA] px-3 py-1 rounded-lg w-fit mx-auto border border-[#A7F3D0]">Welcome to the real trading.</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold text-center">⚠️ {loginError}</div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Password</label>
              <div className="relative flex items-center">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••" 
                  required 
                  disabled={isLoadingData}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-3.5 pr-11 py-3.5 text-base focus:outline-none focus:border-[#10B981] text-[#0F172A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition p-1"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815 3.15 3.15m-3.15-3.15a3.75 3.75 0 1 1-5.304-5.304m5.304 5.304 3.149 3.149" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoadingData} style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-full py-3.5 bg-[#047857] hover:bg-[#065F46] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition mt-2 flex items-center justify-center gap-2 shadow-md">
              {isLoadingData ? "Connecting to Database..." : "Login Now"}
              {!isLoadingData && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>}
            </button>
          </form>
        </div>

        <footer className="mt-8 text-center text-[11px] text-[#94A3B8] font-semibold z-10">
          © 2026 CompoundPro. Designed by <span className="text-slate-600 font-bold">ChenuraDeSilva</span>
        </footer>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: '"Montserrat", sans-serif' }} className="h-screen w-full bg-[#F4F6F5] text-[#1E293B] flex flex-col md:flex-row select-none overflow-hidden relative">
      
      {/* ALERTS MODAL POPUP */}
      {customAlert.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl w-full max-w-sm shadow-xl text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-xs ${
              customAlert.type === 'success' ? 'bg-[#10B981]' : 
              customAlert.type === 'warning' ? 'bg-amber-500' :
              customAlert.type === 'danger' ? 'bg-rose-600' : 'bg-[#047857]'
            }`}>
              {customAlert.type === 'success' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
              {customAlert.type === 'warning' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
              {customAlert.type === 'danger' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>}
              {customAlert.type === 'info' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.852l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>}
            </div>
            <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-base font-bold text-[#0F172A] mb-2 uppercase">{customAlert.title}</h3>
            <p className="text-sm font-semibold text-[#64748B] mb-5">{customAlert.message}</p>
            <div className="flex gap-3 justify-center">
              {customAlert.action ? (
                <>
                  <button onClick={() => { customAlert.action(); closePopupAlert(); }} style={{ fontFamily: '"Unbounded", sans-serif' }} className="px-4 py-2.5 bg-rose-600 text-white font-bold text-[10px] rounded-xl uppercase flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0-.34-9m9.49-5.4-.78 11.44a2.25 2.25 0 0 1-2.243 2.11H8.084a2.25 2.25 0 0 1-2.244-2.11L5.06 4.39M9.25 4.392V3.75M14.25 4.392V3.75M19.5 4.392V3.75M4.75 4.392h14.5M4.75 4.392v16.108A1.25 1.25 0 0 0 6 21.75h12A1.25 1.25 0 0 0 19.25 20.5V4.392" /></svg>
                    Confirm Action
                  </button>
                  <button onClick={closePopupAlert} className="px-4 py-2.5 border border-[#E2E8F0] bg-white text-slate-600 font-bold text-[10px] rounded-xl uppercase">Cancel</button>
                </>
              ) : (
                <button onClick={closePopupAlert} style={{ fontFamily: '"Unbounded", sans-serif' }} className="px-6 py-2.5 bg-[#047857] text-white font-bold text-[10px] rounded-xl uppercase shadow-xs w-full flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Okay
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RISK REWARD POPUP FOR WINNING TRADES */}
      {rewardSelectionModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white border-2 border-[#10B981] p-6 rounded-3xl w-full max-w-sm shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#E6F4EA] text-[#047857] flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 0 5.814-5.518l2.74-8.74m0 0-5.94 1.15m5.94-1.15-1.15 5.94M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-sm font-bold text-[#0F172A] mb-1 uppercase tracking-wide">Choose Risk Reward Ratio</h3>
            <p className="text-xs font-semibold text-[#64748B] mb-5">Select your reward multiple for this winning trade:</p>
            
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3].map((ratio) => {
                const profitProjection = nextRiskAmt * ratio;
                return (
                  <button 
                    key={ratio}
                    onClick={() => {
                      rewardSelectionModal.resolve(ratio);
                      setRewardSelectionModal({ isOpen: false, resolve: null });
                    }}
                    className="group border border-[#E2E8F0] hover:border-[#10B981] bg-[#F8FAFC] hover:bg-[#E6F4EA] p-3.5 rounded-xl transition flex justify-between items-center text-left"
                  >
                    <div>
                      <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-black block text-[#1E293B] group-hover:text-[#065F46]">1:{ratio} Ratio</span>
                      <span className="text-[10px] font-medium text-slate-400 group-hover:text-[#047857]">Target Return</span>
                    </div>
                    <span className="text-sm font-bold text-[#047857] bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-3xs">+${profitProjection.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => {
                rewardSelectionModal.resolve(null);
                setRewardSelectionModal({ isOpen: false, resolve: null });
              }}
              className="mt-4 w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MOBILE RESPONSIVE HEADER */}
      <header className="w-full bg-white border-b border-[#E2E8F0] px-6 py-4 flex md:hidden justify-between items-center z-50 sticky top-0 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-7 h-7 rounded-full bg-[#10B981] flex items-center justify-center text-white font-black text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 9.75h8.25L9.75 21.75 12 14.25H3.75z" /></svg>
          </div>
          <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="font-bold text-sm text-[#0F172A]">CompoundPro</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-xl transition text-slate-700">
          {isMobileMenuOpen ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>}
        </button>
      </header>

      {/* MOBILE MENU NAV */}
      {isMobileMenuOpen && (
        <div className="w-full bg-white border-b border-[#E2E8F0] px-6 py-4 flex flex-col gap-3 md:hidden shadow-lg z-40 fixed top-[65px]">
          <button onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-base text-left ${view === 'dashboard' ? 'bg-[#E6F4EA] text-[#065F46]' : 'text-[#64748B]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>
            Home Dashboard
          </button>
          <button onClick={() => { setView('create'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-base text-left ${view === 'create' ? 'bg-[#E6F4EA] text-[#065F46]' : 'text-[#64748B]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Create New Plan
          </button>
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm font-semibold text-slate-600">
            <span>User: <b>@{currentUser.username}</b></span>
            <button onClick={handleLogoutAction} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold uppercase flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>Log Out</button>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR MENU */}
      <aside className="w-64 bg-white border-r border-[#E2E8F0] p-6 flex-col justify-between hidden md:flex h-full flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-8">
            <div style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white font-black text-sm shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 9.75h8.25L9.75 21.75 12 14.25H3.75z" /></svg>
            </div>
            <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="font-bold text-base text-[#0F172A] tracking-tight">CompoundPro</span>
          </div>

          <div className="bg-[#E6F4EA] p-3.5 rounded-2xl border border-[#A7F3D0] mb-6 flex items-center gap-2">
            <div className="text-[#047857]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21" /></svg></div>
            <div>
              <span className="text-[10px] uppercase font-black text-[#065F46] block tracking-wide">Logged In As</span>
              <p className="text-sm font-black text-[#047857] truncate">@{currentUser.username}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">Menu</p>
            <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-base transition ${view === 'dashboard' ? 'bg-[#E6F4EA] text-[#065F46]' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>
              Home Dashboard
            </button>
            <button onClick={() => setView('create')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-base transition ${view === 'create' ? 'bg-[#E6F4EA] text-[#065F46]' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}>
              <svg xmlns="http://www.w3.org/2000/xl" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Create New Plan
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E6F4EA] text-[#047857] flex items-center justify-center font-black text-sm uppercase">{currentUser.name.slice(0, 2)}</div>
            <div>
              <p className="text-sm font-black text-[#0F172A]">{currentUser.name}</p>
              <p className="text-[10px] text-[#94A3B8] font-semibold">Online Sync Active</p>
            </div>
          </div>
          <button onClick={handleLogoutAction} className="w-full py-2.5 border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-xl uppercase tracking-wider transition flex items-center justify-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>Log Out</button>
          <p className="text-[10px] text-[#94A3B8] text-center pt-2 font-semibold">
            © 2026 Designed by <span className="text-slate-600 font-bold">ChenuraDeSilva</span>
          </p>
        </div>
      </aside>

      {/* CORE HUB PANEL */}
      <main className="flex-1 flex flex-col h-full max-w-7xl w-full mx-auto p-4 md:p-8 overflow-hidden">
        
        <header className="flex justify-between items-center mb-6 flex-shrink-0">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#047857] uppercase tracking-widest bg-[#E6F4EA] px-3 py-1 rounded-md border border-[#A7F3D0] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>Database Connected</span>
            <h1 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight mt-2">Welcome back, <span className="text-[#047857]">{currentUser.name}</span></h1>
          </div>
          {view !== 'dashboard' && (
            <button onClick={() => setView('dashboard')} className="px-4 py-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#64748B] rounded-xl transition shadow-xs flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>Go Back</button>
          )}
        </header>

        {/* --- MAIN SCROLLABLE DASHBOARD VIEW --- */}
        <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar space-y-6 pb-6">
          
          {/* --- DASHBOARD HOME VIEW --- */}
          {view === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                <div className="bg-[#047857] text-white p-6 rounded-2xl shadow-xs flex flex-col justify-between min-h-[120px]">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-[#A7F3D0] block font-bold uppercase tracking-wider">Total Plans</span>
                    <div className="text-[#A7F3D0]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.793 1.993 1.81A48.226 48.226 0 0 1 18 4.084m-5.8 0A48.197 48.197 0 0 0 12 4.084m0 0c-1.135.094-1.976 1.057-1.976 2.192V16.5A2.25 2.25 0 0 0 12 18.75h.375m-9.303-3.376C1.83 14.124 1.5 13.1 1.5 12c0-4.97 4.03-9 9-9a8.96 8.96 0 0 1 5.433 1.83" /></svg></div>
                  </div>
                  <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-3xl font-bold tracking-tight mt-2">{currentTraderPlans.length}</span>
                </div>
                <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs flex flex-col justify-between min-h-[120px]">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-[#64748B] block font-bold uppercase tracking-wider">Active Plans</span>
                    <div className="text-[#10B981]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 9.75h8.25L9.75 21.75 12 14.25H3.75z" /></svg></div>
                  </div>
                  <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-3xl font-bold text-[#0F172A] mt-2">{currentTraderPlans.filter(p => p.status === 'Active').length}</span>
                </div>
                <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs flex flex-col justify-between min-h-[120px]">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-[#64748B] block font-bold uppercase tracking-wider">Total Combined Money</span>
                    <div className="text-[#047857]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.736.156A3.976 3.976 0 0 0 12 15.399c1.917 0 3.5-1.423 3.5-3.17 0-1.747-1.583-3.17-3.5-3.17-1.737 0-3.185-1.173-3.418-2.735L8.5 6m3.5-1.818.675.143A3.976 3.976 0 0 1 15.5 7.159c0 1.748-1.583 3.17-3.5 3.17-1.737 0-3.185 1.172-3.418 2.734L8.5 13" /></svg></div>
                  </div>
                  <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-3xl font-bold text-[#047857] mt-2">${currentTraderPlans.reduce((sum, p) => sum + p.currentBalance, 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#F1F5F9] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                  <div>
                    <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="font-bold text-sm text-[#0F172A] uppercase tracking-wide">Your Trading Plans</h3>
                    <p className="text-xs text-[#64748B] mt-1">Here is the list of all your created trading accounts.</p>
                  </div>
                  <button onClick={() => setView('create')} className="w-full sm:w-auto px-5 py-2.5 bg-[#047857] hover:bg-[#065F46] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Create New Plan</button>
                </div>
                
                {currentTraderPlans.length === 0 ? (
                  <div className="p-16 text-center text-[#94A3B8] text-base font-semibold">No trading plans found. Click 'Create New Plan' to start.</div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[#F1F5F9] text-xs font-bold uppercase tracking-wider text-[#64748B] bg-[#F8FAFC]">
                          <th className="p-4 md:p-5">Plan Name</th>
                          <th className="p-4 md:p-5">Risk Setting</th>
                          <th className="p-4 md:p-5">Target System</th>
                          <th className="p-4 md:p-5">Starting Money</th>
                          <th className="p-4 md:p-5">Current Money</th>
                          <th className="p-4 md:p-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-sm md:text-base text-[#334155] font-semibold">
                        {currentTraderPlans.map((plan) => (
                          <tr key={plan.id} className="hover:bg-[#F8FAFC]/60 transition">
                            <td className="p-4 md:p-5 font-bold text-[#0F172A]">{plan.name}</td>
                            <td className="p-4 md:p-5">
                              <span className="text-xs px-3 py-1 rounded-lg font-bold bg-[#E6F4EA] text-[#065F46]">{plan.riskPercent}% Risk</span>
                            </td>
                            <td className="p-4 md:p-5 text-xs text-[#64748B] font-bold">Choose on Win (1:1 - 1:3)</td>
                            <td className="p-4 md:p-5 text-[#64748B]">${plan.initialBalance.toFixed(2)}</td>
                            <td className="p-4 md:p-5 font-bold text-[#047857]">${plan.currentBalance.toFixed(2)}</td>
                            <td className="p-4 md:p-5 text-right flex justify-end gap-2.5">
                              <button onClick={() => handleLaunchRadar(plan)} style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-[10px] font-black bg-[#E6F4EA] text-[#065F46] px-4 py-2 rounded-xl flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>Open Plan</button>
                              <button onClick={() => handleDeleteSession(plan.id)} className="text-xs font-bold bg-[#FFF5F5] text-[#EF4444] px-3 py-2 rounded-xl flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0-.34-9m9.49-5.4-.78 11.44a2.25 2.25 0 0 1-2.243 2.11H8.084a2.25 2.25 0 0 1-2.244-2.11L5.06 4.39M9.25 4.392V3.75M14.25 4.392V3.75M19.5 4.392V3.75M4.75 4.392h14.5M4.75 4.392v16.108A1.25 1.25 0 0 0 6 21.75h12A1.25 1.25 0 0 0 19.25 20.5V4.392" /></svg>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* --- VIEW: CREATE PLAN --- */}
          {view === 'create' && (
            <div className="max-w-xl mx-auto bg-white border border-[#E2E8F0] p-6 md:p-8 rounded-2xl shadow-xs">
              <h2 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-6 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-[#047857]"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Create A New Trading Plan</h2>
              <form onSubmit={handleCreatePlan} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Plan Name</label>
                  <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g., My $100 Challenge" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-base focus:outline-none focus:border-[#10B981] text-[#0F172A]" required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Starting Money ($)</label>
                  <input type="number" step="any" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-base focus:outline-none focus:border-[#10B981] text-[#0F172A]" min="1" required />
                </div>
                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0] space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" /></svg>Risk Amount per Trade</span>
                    <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-[#047857] font-black text-base">{riskPercent}% Risk</span>
                  </div>
                  <input type="range" min="1" max="100" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} className="w-full accent-[#047857] cursor-pointer h-2.5 bg-gray-200 rounded-lg appearance-none" />
                  <div className="flex justify-between items-center text-xs text-[#94A3B8] font-bold pt-2 border-t border-gray-200/60">
                    <span>Reward Setup:</span>
                    <span className="text-[#047857] font-bold">Choose 1:1, 1:2, or 1:3 on each win</span>
                  </div>
                </div>
                <button type="submit" style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-full py-4 bg-[#047857] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.98 14.98 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.6-2.7h.01M21 3a16.3 16.3 0 0 0-3.47 3.47m0 0A16.3 16.3 0 0 0 14.06 10" /></svg>Start Plan Now</button>
              </form>
            </div>
          )}

          {/* ---------------- 💡 VIEW 3: ACTIVE SYSTEM MONITOR ---------------- */}
          {view === 'active' && activePlan && (
            <div className="flex flex-col gap-6 w-full">
              
              {/* --- TOP ROW CONFIGURATION PANELS --- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start">
                
                {/* LEFT BLOCK INTERFACES */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-base font-bold text-[#0F172A]">{activePlan.name}</h2>
                      <p className="text-xs text-[#64748B] mt-1 font-bold">Trade Risk Setup: <b className="text-slate-700">{activePlan.riskPercent}%</b> | Rewards: <b className="text-slate-700">Dynamic Multiples</b></p>
                    </div>
                    <div className="flex gap-2.5 w-full sm:w-auto">
                      <button 
                        onClick={handleExportSessionCSV}
                        style={{ fontFamily: '"Unbounded", sans-serif' }}
                        className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold border-2 border-[#10B981] bg-[#E6F4EA] text-[#065F46] rounded-xl hover:bg-[#D1FAE5] transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>Export CSV
                      </button>
                      {activePlan.status === 'Active' && <button onClick={handleEndCompound} className="px-4 py-2 text-xs font-bold border border-[#FCA5A5] bg-white text-[#EF4444] rounded-xl hover:bg-rose-50/50 transition flex items-center justify-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>Freeze Plan</button>}
                      <button onClick={() => handleDeleteSession(activePlan.id)} className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl flex items-center justify-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0-.34-9m9.49-5.4-.78 11.44a2.25 2.25 0 0 1-2.243 2.11H8.084a2.25 2.25 0 0 1-2.244-2.11L5.06 4.39M9.25 4.392V3.75M14.25 4.392V3.75M19.5 4.392V3.75M4.75 4.392h14.5M4.75 4.392v16.108A1.25 1.25 0 0 0 6 21.75h12A1.25 1.25 0 0 0 19.25 20.5V4.392" /></svg>Delete</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl text-center shadow-xs">
                      <span className="text-[10px] md:text-xs text-[#64748B] font-bold uppercase block mb-1">Starting Money</span>
                      <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-sm md:text-base font-bold text-[#0F172A]">${activePlan.initialBalance.toFixed(2)}</span>
                    </div>
                    <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl text-center shadow-xs border-b-4 border-b-[#10B981]">
                      <span className="text-[10px] md:text-xs text-[#64748B] font-bold uppercase block mb-1">Current Money</span>
                      <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-sm md:text-base font-black text-[#047857]">${activePlan.currentBalance.toFixed(2)}</span>
                    </div>
                    <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl text-center shadow-xs">
                      <span className="text-[10px] md:text-xs text-[#64748B] font-bold uppercase block mb-1">Total Trades</span>
                      <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-sm md:text-base font-bold text-[#1E293B]">{tradesHistory.length}</span>
                    </div>
                  </div>

                  {/* LOG NEW TRADE ACTION BOX */}
                  <div className="bg-white border-2 border-[#10B981]/40 p-5 md:p-6 rounded-2xl shadow-xs bg-gradient-to-br from-white to-[#F8FAFC]">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                      <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-[10px] font-black uppercase text-[#047857] bg-[#E6F4EA] px-3 py-1.5 rounded-lg w-fit flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 9.75h8.25L9.75 21.75 12 14.25H3.75z" /></svg>Log Next Trade: Trade #{tradesHistory.length + 1}</span>
                      <span className="text-xs text-[#64748B] font-bold">Money At Risk: <b className="text-rose-700">${nextRiskAmt.toFixed(2)}</b></span>
                    </div>

                    {activePlan.status === 'Active' ? (
                      <div className="space-y-5">
                        <div className="relative">
                          <input type="text" value={tradeNote} onChange={(e) => setTradeNote(e.target.value)} placeholder="Type a short note for this trade (optional)..." className="w-full bg-white border border-[#E2E8F0] text-sm rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-[#10B981] text-[#334155] font-semibold" />
                          <div className="absolute left-3.5 top-4 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button onClick={() => handleExecuteCurrentTrade('Win')} style={{ fontFamily: '"Unbounded", sans-serif' }} className="py-4 bg-[#047857] text-white font-bold text-xs uppercase rounded-xl shadow-xs transition flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>I Won This Trade</button>
                          <button onClick={() => handleExecuteCurrentTrade('Loss')} style={{ fontFamily: '"Unbounded", sans-serif' }} className="py-4 bg-[#1E293B] text-white font-bold text-xs uppercase rounded-xl transition flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>I Lost This Trade (-{activePlan.riskPercent}%)</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0] text-center text-sm font-bold text-[#94A3B8] flex items-center justify-center gap-2">This trading plan is frozen and closed.</div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN WIDGETS */}
                <div className="space-y-6">
                  {/* WIN RATE STATS WIDGET */}
                  <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#0F172A] uppercase flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 text-[#047857]"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /></svg>Win Loss Ratio Stats</h3>
                    {totalTradesCount > 0 ? (
                      <div className="space-y-4">
                        <div className="w-full h-6 bg-rose-100 rounded-lg overflow-hidden flex border border-rose-200">
                          <div style={{ width: `${winRatePercent}%` }} className="bg-gradient-to-r from-[#047857] to-[#10B981] h-full flex items-center justify-center text-[10px] text-white font-black">{winRatePercent > 12 && `${winRatePercent}%`}</div>
                          <div className="flex-1 flex items-center justify-center text-[10px] text-rose-800 font-black">{lossRatePercent > 12 && `${lossRatePercent}%`}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center text-xs md:text-sm font-bold pt-1">
                          <div className="bg-[#E6F4EA] p-3 rounded-xl border border-[#A7F3D0]"><span className="block text-[9px] font-black text-[#065F46] uppercase mb-0.5">Wins</span><span className="text-base font-black text-[#047857]">{winsCount} Trades</span></div>
                          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100"><span className="block text-[9px] font-black text-rose-700 uppercase mb-0.5">Losses</span><span className="text-base font-black text-rose-800">{lossesCount} Trades</span></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-[#94A3B8] text-center py-5 border border-dashed border-[#E2E8F0] rounded-xl">No trade data recorded yet to compute stats.</p>
                    )}
                  </div>

                  {/* WITHDRAW CASH INTERFACE */}
                  <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm">
                    <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#0F172A] uppercase mb-3 flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 text-[#047857]"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-5.625 3.512A2.25 2.25 0 0 1 2.25 18V6M21.75 18.25a2.25 2.25 0 0 1-2.25 2.25H4.5M21.75 18V6c0-.98-.79-1.75-1.75-1.75H4.5" /></svg>Withdraw Money</h3>
                    {activePlan.status === 'Active' ? (
                      <form onSubmit={handleWithdraw} className="space-y-3">
                        <input type="number" step="any" value={withdrawalInput} onChange={(e) => setWithdrawalInput(e.target.value)} placeholder="Amount to withdraw ($)" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-sm font-semibold text-[#0F172A]" min="0.01" max={activePlan.currentBalance} />
                        <button type="submit" style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-full py-2.5 bg-[#047857] text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center gap-1">Confirm Withdrawal</button>
                      </form>
                    ) : (
                      <p className="text-xs text-[#94A3B8] text-center py-2.5 border border-dashed border-[#E2E8F0] rounded-xl font-bold">Withdrawals closed for frozen plan.</p>
                    )}
                    <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                      <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2.5">Withdrawal Logs</h4>
                      {withdrawals.length === 0 ? (
                        <p className="text-xs text-[#94A3B8] font-bold">No withdrawals made yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {withdrawals.map((w) => (
                            <div key={w.id} className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-xs font-bold flex justify-between items-center"><span className="text-[#B45309]">-${w.amount.toFixed(2)}</span><span className="text-[10px] text-[#94A3B8] font-mono">{w.timestamp}</span></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* END STATE SUMMARY PANEL */}
                  {activePlan.status === 'Ended' && (
                    <div className="bg-[#E6F4EA] border border-[#A7F3D0] p-5 rounded-2xl space-y-4 shadow-xs">
                      <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#065F46] uppercase flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4.5 h-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.793 1.993 1.81A48.226 48.226 0 0 1 18 4.084m-5.8 0A48.197 48.197 0 0 0 12 4.084m0 0c-1.135.094-1.976 1.057-1.976 2.192V16.5A2.25 2.25 0 0 0 12 18.75h.375m-9.303-3.376C1.83 14.124 1.5 13.1 1.5 12c0-4.97 4.03-9 9-9a8.96 8.96 0 0 1 5.433 1.83" /></svg>Final Plan Results</h3>
                      <div className="space-y-3 text-sm font-bold text-[#065F46]">
                        <div className="flex justify-between border-b border-[#A7F3D0] pb-2"><span>Account Multiplier:</span><span className="font-black">{(activePlan.currentBalance / activePlan.initialBalance).toFixed(2)}x</span></div>
                        <div className="flex justify-between border-b border-[#A7F3D0] pb-2"><span>Total Profit Scale:</span><span className="font-black text-[#047857]">{(((activePlan.currentBalance - activePlan.initialBalance) / activePlan.initialBalance) * 100).toFixed(1)}%</span></div>
                        <div className="flex justify-between"><span>Wins & Losses Map:</span><span className="font-black">{winsCount} Wins - {lossesCount} Losses</span></div>
                      </div>
                      <button onClick={() => setView('dashboard')} style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-full py-2.5 bg-[#047857] text-white font-bold text-[10px] uppercase rounded-xl shadow-xs transition flex items-center justify-center gap-1">Go Back Home</button>
                    </div>
                  )}
                </div>

              </div>

              {/* --- 📈 ACCOUNT GROWTH PROGRESS CHART --- */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#0F172A] uppercase flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 text-[#047857]"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 0 5.814-5.518l2.74-8.74m0 0-5.94 1.15m5.94-1.15-1.15 5.94M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>Account Growth Progress Chart</h3>
                  <span className="text-[10px] text-gray-400 font-mono">Widescreen Render Mode</span>
                </div>
                <div className="w-full bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] overflow-x-auto">
                  <svg viewBox="0 0 1000 160" className="w-full min-w-[800px] overflow-visible">
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity="0.2"/><stop offset="100%" stopColor="#10B981" stopOpacity="0.0"/></linearGradient>
                    </defs>
                    
                    <text x="45" y="34" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{maxGrowth.toFixed(1)}%</text>
                    <text x="45" y="84" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{((maxGrowth + minGrowth)/2).toFixed(1)}%</text>
                    <text x="45" y="134" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{minGrowth.toFixed(1)}%</text>

                    <line x1="52" y1="30" x2="965" y2="30" stroke="#E2E8F0" strokeWidth="0.6" strokeDasharray="3"/>
                    <line x1="52" y1="80" x2="965" y2="80" stroke="#E2E8F0" strokeWidth="0.6" strokeDasharray="3"/>
                    <line x1="52" y1="130" x2="965" y2="130" stroke="#CBD5E1" strokeWidth="1"/>

                    {growthHistory.length > 1 ? (
                      <>
                        <path d={`M 55,130 L ${chartPoints} L ${chartPoints.split(' ').pop().split(',')[0]},130 Z`} fill="url(#curveGrad)"/>
                        <polyline fill="none" stroke="#047857" strokeWidth="3" points={chartPoints} strokeLinecap="round" strokeLinejoin="round"/>
                        
                        {growthHistory.map((g, idx) => {
                          const xCoord = (idx / (growthHistory.length - 1)) * 890 + 55;
                          const yCoord = 130 - ((g - minGrowth) / growthRange) * 100;
                          return (
                            <g key={idx}>
                              <circle cx={xCoord} cy={yCoord} r="4.5" fill="#10B981" stroke="white" strokeWidth="1.5"/>
                              <text x={xCoord} y="148" textAnchor="middle" fill="#64748B" className="text-[9px] font-bold tracking-tight">{dateLabels[idx]}</text>
                            </g>
                          );
                        })}
                      </>
                    ) : (
                      <text x="500" y="80" textAnchor="middle" fill="#94A3B8" className="text-xs font-bold">Log trades to see your progress graph line...</text>
                    )}
                  </svg>
                </div>
              </div>

              {/* --- 📊 ALL TRADE HISTORY LOGS --- */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden w-full">
                <div className="p-4 border-b border-[#F1F5F9] bg-white flex items-center gap-2">
                  <div className="text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z" /></svg></div>
                  <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="font-bold text-xs text-[#64748B] uppercase">All Trade History Logs</h3>
                </div>
                {tradesHistory.length === 0 ? (
                  <div className="p-10 text-center text-[#94A3B8] text-sm font-semibold">No trades saved yet. Click the buttons above to save your wins or losses.</div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[750px] text-sm md:text-base font-semibold">
                      <thead>
                        <tr className="bg-[#F8FAFC] text-[#64748B] border-b border-[#F1F5F9] font-bold uppercase tracking-wider text-xs">
                          <th className="p-4">Trade #</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Starting Balance</th>
                          <th className="p-4">Risk Amount</th>
                          <th className="p-4">Ratio</th>
                          <th className="p-4">Total Profit/Loss</th>
                          <th className="p-4">Ending Balance</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
                        {tradesHistory.map((t, idx) => (
                          <tr key={t.id} className={`transition ${t.status === 'Win' ? 'bg-[#E6F4EA]/15' : 'bg-rose-50/15'}`}>
                            <td className="p-4 text-[#94A3B8] font-bold">#{t.tradeNum}</td>
                            <td className="p-4 text-xs font-mono text-slate-500">{t.date}</td>
                            <td className="p-4 font-medium text-slate-600">${t.startingBalance.toFixed(2)}</td>
                            <td className="p-4 text-rose-700/80">${t.riskAmount.toFixed(2)}</td>
                            <td className="p-4"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${t.status === 'Win' ? 'bg-[#E6F4EA] text-[#065F46]' : 'bg-rose-100 text-rose-700'}`}>{t.status === 'Win' ? `WIN (1:${t.rewardRatio})` : 'LOSS'}</span></td>
                            <td className={`p-4 font-bold ${t.payout > 0 ? 'text-[#047857]' : 'text-rose-700'}`}>
                              {t.payout > 0 ? `+$${t.payout.toFixed(2)}` : `-$${Math.abs(t.payout).toFixed(2)}`}
                            </td>
                            <td className="p-4 font-bold text-[#0F172A]">${t.endingBalance.toFixed(2)}</td>
                            <td className="p-4 text-center">
                              {/* --- INTERACTIVE ACTION COLUMN ADJUSTED FOR CHRONOLOGICAL BASE --- */}
                              {idx === tradesHistory.length - 1 && activePlan.status === 'Active' ? (
                                <button 
                                  onClick={() => handleUndoLastTrade(t.id)} 
                                  title="Undo Last Trade"
                                  className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition transform hover:scale-105 active:scale-95 flex items-center gap-1 mx-auto"
                                >
                                  Undo
                                </button>
                              ) : (
                                <span className="text-xs text-slate-300 select-none italic font-normal">Locked</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}