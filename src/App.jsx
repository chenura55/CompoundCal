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

export default function App() {
  // --- 🪄 INJECT PREMIUM FONTS ON MOUNT ---
  useEffect(() => {
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

  // --- 🔒 PASSWORDS DATABASE FOR 5 USERS ---
  const passwordsDatabase = {
    "trader123": { id: "trader1", username: "michael_fx", name: "Michael", initial: 100 },
    "chenu456": { id: "trader2", username: "chenu_traders", name: "Chenura", initial: 500 },
    "rachitha789": { id: "trader3", username: "rachitha_pip", name: "Rachitha", initial: 200 },
    "alpha101": { id: "trader4", username: "alpha_scalper", name: "Amila", initial: 300 },
    "kasun2026": { id: "trader5", username: "risk_manager", name: "Kasun", initial: 1000 }
  };

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Navigation & Mobile Menu
  const [view, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Popup Modal Alert State
  const [customAlert, setCustomAlert] = useState({ isOpen: false, type: 'info', title: '', message: '', action: null });

  // 💾 App State Initialize
  const [allPlans, setAllPlans] = useState({
    trader1: [], trader2: [], trader3: [], trader4: [], trader5: []
  });

  const [isLoadingData, setIsLoadingData] = useState(false);

  // 🔁 1. AUTO-SAVE LOOP
  useEffect(() => {
    const saveToFirebase = async () => {
      if (currentUser && isAuthenticated) {
        try {
          const userRef = ref(db, "compoundpro_vault/" + currentUser.id);
          await set(userRef, allPlans);
        } catch (error) {
          console.error("Error auto-saving to Firebase: ", error);
        }
      }
    };
    saveToFirebase();
  }, [allPlans, currentUser, isAuthenticated]);

  // Active Running Engine States
  const [activePlan, setActivePlan] = useState(null);
  const [tradesHistory, setTradesHistory] = useState([]); 
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalInput, setWithdrawalInput] = useState('');
  const [tradeNote, setTradeNote] = useState('');

  // Form Creation Inputs
  const [planName, setPlanName] = useState('');
  // 📝 Decimal values (100.11 වගේ) දාන්න පුළුවන් වෙන්න String එකක් විදිහට මුලින් තියාගන්නවා
  const [initialBalance, setInitialBalance] = useState('100');
  const [riskPercent, setRiskPercent] = useState(20); 
  const rewardRatio = 2; 

  const currentTraderPlans = currentUser ? (allPlans[currentUser.id] || []) : [];

  useEffect(() => {
    if (activePlan) {
      setTradesHistory(activePlan.tradesHistory || []);
      setWithdrawals(activePlan.withdrawals || []);
    }
  }, [activePlan]);

  const triggerPopupAlert = (title, message, type = 'info', action = null) => {
    setCustomAlert({ isOpen: true, type, title, message, action });
  };

  const closePopupAlert = () => {
    setCustomAlert(prev => ({ ...prev, isOpen: false }));
  };

  // --- 📥 DATA EXPORT METHOD ---
  const handleExportSessionCSV = () => {
    if (!activePlan || tradesHistory.length === 0) {
      triggerPopupAlert('No Data', 'There are no closed trade logs inside this active session to export yet!', 'warning');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Trade Number,Starting Balance,Money At Risk,Result State,Payout Gain/Loss,Ending Balance,Setup Note\n";

    tradesHistory.forEach(t => {
      const row = `${t.tradeNum},${t.startingBalance.toFixed(2)},${t.riskAmount.toFixed(2)},${t.status},${t.payout.toFixed(2)},${t.endingBalance.toFixed(2)},"${t.note.replace(/"/g, '""')}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activePlan.name.replace(/\s+/g, '_')}_Trade_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerPopupAlert('Exported!', 'Your session history log file has been downloaded successfully as a spreadsheet CSV file.', 'success');
  };

  // 📥 2. FETCH DATA LOOP ON LOGIN
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    const matchedProfile = passwordsDatabase[passwordInput.trim()];
    
    if (matchedProfile) {
      setIsLoadingData(true);
      try {
        const userRef = ref(db, "compoundpro_vault/" + matchedProfile.id);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          setAllPlans(snapshot.val());
        } else {
          setAllPlans(prev => ({ ...prev, [matchedProfile.id]: [] }));
        }

        setCurrentUser(matchedProfile);
        setIsAuthenticated(true);
        setView('dashboard');
        setInitialBalance(matchedProfile.initial.toString()); // Decimal friendly
        setPasswordInput('');
      } catch (error) {
        console.error("Firebase Realtime DB fetch error: ", error);
        setLoginError('Database එකට සම්බන්ධ වෙන්න බැරි වුණා.');
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
    setTradesHistory([]);
    setWithdrawals([]);
    setIsMobileMenuOpen(false);
  };

  const handleCreatePlan = (e) => {
    e.preventDefault();
    // 📝 Number() වෙනුවට parseFloat() දාලා දශමස්ථාන (Decimal) නිවැරදිව ගණනය කරනවා
    const parsedInitial = parseFloat(initialBalance);
    
    const newPlan = {
      id: Date.now(),
      name: planName || `Trading Plan ${currentTraderPlans.length + 1}`,
      initialBalance: parsedInitial,
      currentBalance: parsedInitial,
      riskPercent: Number(riskPercent),
      rewardRatio: rewardRatio,
      status: 'Active',
      tradesHistory: [],
      withdrawals: []
    };
    
    setAllPlans(prev => ({
      ...prev,
      [currentUser.id]: [...(prev[currentUser.id] || []), newPlan]
    }));
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

  const handleExecuteCurrentTrade = (status) => {
    if (!activePlan || activePlan.status === 'Ended') return;
    const currentBalance = activePlan.currentBalance;
    const riskAmount = currentBalance * (activePlan.riskPercent / 100);
    let payout = 0;

    if (status === 'Win') {
      payout = riskAmount * activePlan.rewardRatio; 
    } else if (status === 'Loss') {
      payout = -riskAmount;
    }
    
    // JS Floating point issue එක මඟහරවා ගන්න දශමස්ථාන 2කට සෙට් කරනවා
    const newEndingBalance = Math.round((currentBalance + payout) * 100) / 100;
    
    const loggedTrade = {
      id: Date.now(),
      tradeNum: tradesHistory.length + 1,
      startingBalance: currentBalance,
      riskAmount: riskAmount,
      status: status,
      payout: payout,
      endingBalance: newEndingBalance,
      note: tradeNote || 'Trade saved'
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

  const handleWithdraw = (e) => {
    e.preventDefault();
    // 📝 Withdrawal වලටත් දශම අගයන් ගන්න පුළුවන් වෙන්න parseFloat දානවා
    const amount = parseFloat(withdrawalInput);
    if (!amount || amount <= 0 || amount > activePlan.currentBalance) {
      triggerPopupAlert('Balance Low', "You do not have enough money in your current account to withdraw this amount!", 'warning');
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
    triggerPopupAlert('Withdraw Done', `Successfully withdrew $${amount.toLocaleString()} from your active plan balance pool.`, 'success');
  };

  const handleDeleteSession = (id) => {
    triggerPopupAlert(
      'Confirm Delete',
      'Are you absolutely sure you want to permanently erase this trading plan framework loop archive?',
      'danger',
      () => {
        setAllPlans(prev => ({
          ...prev,
          [currentUser.id]: prev[currentUser.id].filter(p => p.id !== id)
        }));
        if (activePlan?.id === id) {
          setActivePlan(null); setTradesHistory([]); setWithdrawals([]); setView('dashboard');
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
    triggerPopupAlert('Plan Frozen', 'This compounding tracking sheet balance loop is now locked.', 'info');
  };

  const nextRiskAmt = (activePlan?.currentBalance || 0) * ((activePlan?.riskPercent || 20) / 100);
  const nextProfitPotential = nextRiskAmt * (activePlan?.rewardRatio || 2);
  
  const activeBalances = [activePlan?.initialBalance || 100, ...tradesHistory.map(t => t.endingBalance)];
  const maxVal = Math.max(...activeBalances, 200);
  const minVal = Math.min(...activeBalances, 0);
  const valRange = maxVal - minVal > 0 ? maxVal - minVal : 1;

  const chartPoints = activeBalances.map((b, i) => {
    const x = (i / Math.max(activeBalances.length - 1, 1)) * 500;
    const y = 140 - ((b - minVal) / valRange) * 110;
    return `${x},${y}`;
  }).join(' ');

  const totalTradesCount = tradesHistory.length;
  const winsCount = tradesHistory.filter(t => t.status === 'Win').length;
  const lossesCount = tradesHistory.filter(t => t.status === 'Loss').length;
  const winRatePercent = totalTradesCount > 0 ? Math.round((winsCount / totalTradesCount) * 100) : 0;
  const lossRatePercent = totalTradesCount > 0 ? Math.round((lossesCount / totalTradesCount) * 100) : 0;

  // ---------------- 🔒 VIEW 1: LOGIN PORTAL ----------------
  if (!isAuthenticated) {
    return (
      <div style={{ fontFamily: '"Montserrat", sans-serif' }} className="min-h-screen bg-[#F4F6F5] text-[#1E293B] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] p-8 rounded-3xl shadow-sm space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center text-white mx-auto mb-4 shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            </div>
            <h2 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xl font-bold text-[#0F172A] tracking-tight">CompoundPro</h2>
            {/* 📝 "Welcome to the real trading." ටෙක්ස්ට් එක මෙතනට ඇතුළත් කරා */}
            <p className="text-sm font-bold text-[#047857] mt-1 bg-[#E6F4EA] px-3 py-1 rounded-lg w-fit mx-auto border border-[#A7F3D0]">Welcome to the real trading.</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold text-center">⚠️ {loginError}</div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Password</label>
              <input 
                type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••" required disabled={isLoadingData}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-base focus:outline-none focus:border-[#10B981] text-[#0F172A]"
              />
            </div>
            <button type="submit" disabled={isLoadingData} style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-full py-3.5 bg-[#047857] hover:bg-[#065F46] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition mt-2 flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoadingData ? "Connecting to Realtime DB..." : "Login Now"}
              {!isLoadingData && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>}
            </button>
          </form>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl text-xs text-[#64748B] space-y-1 font-mono">
            <span className="font-bold text-[#334155] block uppercase tracking-tight font-sans mb-1">🔑 Passwords:</span>
            <p>• Michael: <code className="font-bold text-[#047857]">trader123</code></p>
            <p>• Chenura: <code className="font-bold text-[#047857]">chenu456</code></p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- 🎨 VIEW 2: DASHBOARD MAIN SCREEN ----------------
  return (
    <div style={{ fontFamily: '"Montserrat", sans-serif' }} className="min-h-screen w-full bg-[#F4F6F5] text-[#1E293B] flex flex-col md:flex-row select-none relative">
      
      {/* ATTRACIVE MODAL POPUP */}
      {customAlert.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl w-full max-w-sm shadow-xl text-center transform scale-100 animate-fadeIn animate-scaleIn">
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
                    Confirm Delete
                  </button>
                  <button onClick={closePopupAlert} className="px-4 py-2.5 border border-[#E2E8F0] bg-white text-slate-600 font-bold text-[10px] rounded-xl uppercase">Cancel</button>
                </>
              ) : (
                <button onClick={closePopupAlert} style={{ fontFamily: '"Unbounded", sans-serif' }} className="px-6 py-2.5 bg-[#047857] text-white font-bold text-[10px] rounded-xl uppercase shadow-xs w-full flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Okay, Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE RESPONSIVE HEADER */}
      <header className="w-full bg-white border-b border-[#E2E8F0] px-6 py-4 flex md:hidden justify-between items-center shadow-xs z-50 sticky top-0">
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

      {/* MOBILE NAV DROPDOWN MENU */}
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
      <aside className="w-64 bg-white border-r border-[#E2E8F0] p-6 flex-col justify-between hidden md:flex min-h-screen sticky top-0">
        <div>
          <div className="flex items-center gap-2.5 mb-8">
            <div style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white font-black text-sm shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 9.75h8.25L9.75 21.75 12 14.25H3.75z" /></svg>
            </div>
            <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="font-bold text-base text-[#0F172A] tracking-tight">CompoundPro</span>
          </div>

          <div className="bg-[#E6F4EA] p-3.5 rounded-2xl border border-[#A7F3D0] mb-6 flex items-center gap-2">
            <div className="text-[#047857]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /></svg></div>
            <div>
              <span className="text-[10px] uppercase font-black text-[#065F46] block tracking-wide">Active Account</span>
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Create New Plan
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E6F4EA] text-[#047857] flex items-center justify-center font-black text-sm uppercase">{currentUser.name.slice(0, 2)}</div>
            <div>
              <p className="text-sm font-black text-[#0F172A]">{currentUser.name}</p>
              <p className="text-[10px] text-[#94A3B8] font-semibold">Realtime Sync Active</p>
            </div>
          </div>
          <button onClick={handleLogoutAction} className="w-full py-2.5 border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-xl uppercase tracking-wider transition flex items-center justify-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>Log Out</button>
        </div>
      </aside>

      {/* CORE HUB PANEL */}
      <main className="flex-1 p-4 md:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
        
        <header className="flex justify-between items-center mb-6 md:mb-8 mt-2 md:mt-0">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#047857] uppercase tracking-widest bg-[#E6F4EA] px-3 py-1 rounded-md border border-[#A7F3D0] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>Realtime DB Connected</span>
            <h1 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tight mt-3">Welcome back, <span className="text-[#047857]">{currentUser.name}</span></h1>
          </div>
          {view !== 'dashboard' && (
            <button onClick={() => setView('dashboard')} className="px-4 py-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#64748B] rounded-xl transition shadow-xs flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>Go Back</button>
          )}
        </header>

        {/* --- VIEW 1: HOME MAIN DASHBOARD --- */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
              <div className="bg-[#047857] text-white p-6 rounded-2xl shadow-xs flex flex-col justify-between min-h-[120px] relative overflow-hidden">
                <div className="flex justify-between items-start z-10">
                  <span className="text-xs text-[#A7F3D0] block font-bold uppercase tracking-wider">Total Plans</span>
                  <div className="text-[#A7F3D0]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.793 1.993 1.81A48.226 48.226 0 0 1 18 4.084m-5.8 0A48.197 48.197 0 0 0 12 4.084m0 0c-1.135.094-1.976 1.057-1.976 2.192V16.5A2.25 2.25 0 0 0 12 18.75h.375m-9.303-3.376C1.83 14.124 1.5 13.1 1.5 12c0-4.97 4.03-9 9-9a8.96 8.96 0 0 1 5.433 1.83" /></svg></div>
                </div>
                <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-3xl font-bold tracking-tight mt-2 z-10">{currentTraderPlans.length}</span>
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
                  <span className="text-xs text-[#64748B] block font-bold uppercase tracking-wider">Total Money</span>
                  <div className="text-[#047857]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.736.156A3.976 3.976 0 0 0 12 15.399c1.917 0 3.5-1.423 3.5-3.17 0-1.747-1.583-3.17-3.5-3.17-1.737 0-3.185-1.173-3.418-2.735L8.5 6m3.5-1.818.675.143A3.976 3.976 0 0 1 15.5 7.159c0 1.748-1.583 3.17-3.5 3.17-1.737 0-3.185 1.172-3.418 2.734L8.5 13" /></svg></div>
                </div>
                {/* 📝 Total balance එකත් .toFixed(2) මගින් දශම ලස්සනට පෙන්වයි */}
                <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-3xl font-bold text-[#047857] mt-2">${currentTraderPlans.reduce((sum, p) => sum + p.currentBalance, 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[#F1F5F9] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                <div>
                  <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="font-bold text-sm text-[#0F172A] uppercase tracking-wide">All Trading Plans</h3>
                  <p className="text-xs text-[#64748B] mt-1">Here is the list of all your cloud-secured trading plans.</p>
                </div>
                <button onClick={() => setView('create')} className="w-full sm:w-auto px-5 py-2.5 bg-[#047857] hover:bg-[#065F46] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Create New Plan</button>
              </div>
              
              {currentTraderPlans.length === 0 ? (
                <div className="p-16 text-center text-[#94A3B8] text-base font-semibold">No trading plans found on Realtime DB. Click 'Create New Plan' to start.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[#F1F5F9] text-xs font-bold uppercase tracking-wider text-[#64748B] bg-[#F8FAFC]">
                        <th className="p-4 md:p-5">Plan Name</th>
                        <th className="p-4 md:p-5">Risk Setup</th>
                        <th className="p-4 md:p-5">Target settings</th>
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
                          <td className="p-4 md:p-5 text-xs text-[#64748B] font-bold">Stable 1:2 Plan</td>
                          {/* 📝 දශමස්ථාන 2ක් හරියටම පෙන්වයි */}
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
          </div>
        )}

        {/* --- VIEW 2: CREATE PLAN --- */}
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
                {/* 📝 step="any" දාලා තියෙන නිසා 100.11 වගේ ඕනෑම දශම අගයක් Type කරන්න දෙනවා */}
                <input type="number" step="any" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-base focus:outline-none focus:border-[#10B981] text-[#0F172A]" min="1" required />
              </div>
              <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0] space-y-3">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" /></svg>Choose Risk Size</span>
                  <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-[#047857] font-black text-base">{riskPercent}% Risk</span>
                </div>
                <input type="range" min="1" max="100" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} className="w-full accent-[#047857] cursor-pointer h-2.5 bg-gray-200 rounded-lg appearance-none" />
                <div className="flex justify-between items-center text-xs text-[#94A3B8] font-bold pt-2 border-t border-gray-200/60">
                  <span>Target settings:</span>
                  <span className="text-[#047857] font-bold">Stable 1:2 Reward System</span>
                </div>
              </div>
              <button type="submit" style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-full py-4 bg-[#047857] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.6-2.7h.01M21 3a16.3 16.3 0 0 0-3.47 3.47m0 0A16.3 16.3 0 0 0 14.06 10" /></svg>Start Plan Now</button>
            </form>
          </div>
        )}

        {/* ---------------- 💡 VIEW 3: ACTIVE SYSTEM MONITOR ---------------- */}
        {view === 'active' && activePlan && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-base font-bold text-[#0F172A]">{activePlan.name}</h2>
                  <p className="text-xs text-[#64748B] mt-1 font-bold">Risk Level: <b className="text-slate-700">{activePlan.riskPercent}%</b> | Settings: <b className="text-slate-700">Stable 1:2 Rewards</b></p>
                </div>
                <div className="flex gap-2.5 w-full sm:w-auto">
                  <button 
                    onClick={handleExportSessionCSV}
                    style={{ fontFamily: '"Unbounded", sans-serif' }}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold border-2 border-[#10B981] bg-[#E6F4EA] text-[#065F46] rounded-xl hover:bg-[#D1FAE5] transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Export Session
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
                  <span className="text-[10px] md:text-xs text-[#64748B] font-bold uppercase block mb-1">Trades Logged</span>
                  <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-sm md:text-base font-bold text-[#1E293B]">{tradesHistory.length}</span>
                </div>
              </div>

              {/* ACTION TRIGGER BOX */}
              <div className="bg-white border-2 border-[#10B981]/40 p-5 md:p-6 rounded-2xl shadow-xs bg-gradient-to-br from-white to-[#F8FAFC]">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                  <span style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-[10px] font-black uppercase text-[#047857] bg-[#E6F4EA] px-3 py-1.5 rounded-lg w-fit flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 9.75h8.25L9.75 21.75 12 14.25H3.75z" /></svg>Next Action: Trade #{tradesHistory.length + 1}</span>
                  <span className="text-xs text-[#64748B] font-bold">Stable 1:2 Reward System</span>
                </div>

                {activePlan.status === 'Active' ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-2 text-center bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-2xs font-semibold">
                      <div><span className="block text-[9px] md:text-xs text-[#64748B] font-bold uppercase mb-0.5">Money At Risk</span><span className="text-sm md:text-base font-bold text-[#B91C1C]">${nextRiskAmt.toFixed(2)}</span></div>
                      <div><span className="block text-[9px] md:text-xs text-[#64748B] font-bold uppercase mb-0.5">Profit Goal</span><span className="text-sm md:text-base font-bold text-[#047857]">+${nextProfitPotential.toFixed(2)}</span></div>
                      <div><span className="block text-[9px] md:text-xs text-[#64748B] font-bold uppercase mb-0.5">Next Balance</span><span className="text-sm md:text-base font-bold text-[#0F172A]">${(activePlan.currentBalance + nextProfitPotential).toFixed(2)}</span></div>
                    </div>
                    <div className="relative">
                      <input type="text" value={tradeNote} onChange={(e) => setTradeNote(e.target.value)} placeholder="Type a note for this trade (optional)..." className="w-full bg-white border border-[#E2E8F0] text-sm rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-[#10B981] text-[#334155] font-semibold" />
                      <div className="absolute left-3.5 top-4 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => handleExecuteCurrentTrade('Win')} style={{ fontFamily: '"Unbounded", sans-serif' }} className="py-4 bg-[#047857] text-white font-bold text-xs uppercase rounded-xl shadow-xs transition flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Winning Trade (+{activePlan.riskPercent * 2}%)</button>
                      <button onClick={() => handleExecuteCurrentTrade('Loss')} style={{ fontFamily: '"Unbounded", sans-serif' }} className="py-4 bg-[#1E293B] text-white font-bold text-xs uppercase rounded-xl transition flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>Losing Trade (-{activePlan.riskPercent}%)</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0] text-center text-sm font-bold text-[#94A3B8] flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>This trading plan is frozen. No changes can be made.</div>
                )}
              </div>

              {/* LINE GRAPH CHART ELEMENT */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#0F172A] uppercase flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 text-[#047857]"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 0 5.814-5.518l2.74-8.74m0 0-5.94 1.15m5.94-1.15-1.15 5.94M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>Account Balance Chart (Line Curve)</h3>
                  <span className="text-[10px] text-gray-400 font-mono">Real-time Balance History</span>
                </div>
                <div className="w-full bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
                  <svg viewBox="0 0 500 150" className="w-full overflow-visible">
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity="0.18"/><stop offset="100%" stopColor="#10B981" stopOpacity="0.0"/></linearGradient>
                    </defs>
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#E2E8F0" strokeWidth="0.6" strokeDasharray="4"/>
                    <line x1="0" y1="85" x2="500" y2="85" stroke="#E2E8F0" strokeWidth="0.6" strokeDasharray="4"/>
                    <line x1="0" y1="140" x2="500" y2="140" stroke="#CBD5E1" strokeWidth="1"/>
                    {activeBalances.length > 1 ? (
                      <>
                        <path d={`M 0,140 L ${chartPoints} L 500,140 Z`} fill="url(#curveGrad)"/>
                        <polyline fill="none" stroke="#047857" strokeWidth="2.8" points={chartPoints} strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx={chartPoints.split(' ').pop().split(',')[0]} cy={chartPoints.split(' ').pop().split(',')[1]} r="4.5" fill="#10B981" stroke="white" strokeWidth="2"/>
                      </>
                    ) : (
                      <text x="250" y="80" textAnchor="middle" fill="#94A3B8" className="text-xs font-bold">Log some trades to display the line graph chart...</text>
                    )}
                  </svg>
                </div>
              </div>

              {/* HISTORY LOGS TABLE */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-[#F1F5F9] bg-white flex items-center gap-2">
                  <div className="text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z" /></svg></div>
                  <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="font-bold text-xs text-[#64748B] uppercase">All Trade Logs</h3>
                </div>
                {tradesHistory.length === 0 ? (
                  <div className="p-10 text-center text-[#94A3B8] text-sm font-semibold">No trades logged yet. Click 'Winning Trade' or 'Losing Trade' above.</div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[650px] text-sm md:text-base font-semibold">
                      <thead>
                        <tr className="bg-[#F8FAFC] text-[#64748B] border-b border-[#F1F5F9] font-bold uppercase tracking-wider text-xs"><th className="p-4">Trade #</th><th className="p-4">Start Balance</th><th className="p-4">Risk Amount</th><th className="p-4">Result</th><th className="p-4">Gain / Loss</th><th className="p-4">End Balance</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
                        {tradesHistory.slice().reverse().map((t) => (
                          <tr key={t.id} className={`transition ${t.status === 'Win' ? 'bg-[#E6F4EA]/15' : 'bg-rose-50/15'}`}>
                            <td className="p-4 text-[#94A3B8] font-bold">#{t.tradeNum}</td><td className="p-4">${t.startingBalance.toFixed(2)}</td><td className="p-4 text-rose-700">${t.riskAmount.toFixed(2)}</td>
                            <td className="p-4"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${t.status === 'Win' ? 'bg-[#E6F4EA] text-[#065F46]' : 'bg-rose-100 text-rose-700'}`}>{t.status.toUpperCase()}</span></td>
                            <td className={`p-4 font-bold ${t.payout > 0 ? 'text-[#047857]' : 'text-rose-700'}`}>{t.payout > 0 ? `+$${t.payout.toFixed(2)}` : `-$${Math.abs(t.payout).toFixed(2)}`}</td>
                            <td className="p-4 font-bold text-[#0F172A]">${t.endingBalance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT SIDE PANEL CHARTS AND WIDGETS */}
            <div className="space-y-6">
              
              {/* WIN RATE BAR CHART */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-4">
                <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#0F172A] uppercase flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 text-[#047857]"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /></svg>Win Rate Chart</h3>
                {totalTradesCount > 0 ? (
                  <div className="space-y-4">
                    <div className="w-full h-6 bg-rose-100 rounded-lg overflow-hidden flex shadow-inner border border-rose-200">
                      <div style={{ width: `${winRatePercent}%` }} className="bg-gradient-to-r from-[#047857] to-[#10B981] h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-black">{winRatePercent > 12 && `${winRatePercent}%`}</div>
                      <div className="flex-1 flex items-center justify-center text-[10px] text-rose-800 font-black">{lossRatePercent > 12 && `${lossRatePercent}%`}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center text-xs md:text-sm font-bold pt-1">
                      <div className="bg-[#E6F4EA] p-3 rounded-xl border border-[#A7F3D0]"><span className="block text-[9px] font-black text-[#065F46] uppercase mb-0.5">Wins</span><span className="text-base font-black text-[#047857]">{winsCount} Trades</span></div>
                      <div className="bg-rose-50 p-3 rounded-xl border border-rose-100"><span className="block text-[9px] font-black text-rose-700 uppercase mb-0.5">Losses</span><span className="text-base font-black text-rose-800">{lossesCount} Trades</span></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-[#94A3B8] text-center py-5 border border-dashed border-[#E2E8F0] rounded-xl">No stats yet. Log some trades to see the chart.</p>
                )}
              </div>

              {/* WITHDRAW CAPITAL BASE PANEL */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm">
                <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#0F172A] uppercase mb-3 flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 text-[#047857]"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-5.625 3.512A2.25 2.25 0 0 1 2.25 18V6M21.75 18.25a2.25 2.25 0 0 1-2.25 2.25H4.5M21.75 18V6c0-.98-.79-1.75-1.75-1.75H4.5" /></svg>Withdraw Money</h3>
                {activePlan.status === 'Active' ? (
                  <form onSubmit={handleWithdraw} className="space-y-3">
                    {/* 📝 Withdrawal input එකටත් step="any" එකතු කරා දශම withdraw කරන්න */}
                    <input type="number" step="any" value={withdrawalInput} onChange={(e) => setWithdrawalInput(e.target.value)} placeholder="Amount to withdraw ($)" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-sm font-semibold text-[#0F172A]" min="0.01" max={activePlan.currentBalance} />
                    <button type="submit" style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-full py-2.5 bg-[#047857] text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-1"><svg xmlns="http://www.w3.org/2000/xl" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Confirm Withdrawal</button>
                  </form>
                ) : (
                  <p className="text-xs text-[#94A3B8] text-center py-2.5 border border-dashed border-[#E2E8F0] rounded-xl font-bold">Withdrawals closed.</p>
                )}
                <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2.5">Withdrawal History</h4>
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

              {/* SUMMARY VIEW ACCORDIONS */}
              {activePlan.status === 'Ended' && (
                <div className="bg-[#E6F4EA] border border-[#A7F3D0] p-5 rounded-2xl space-y-4 shadow-xs">
                  <h3 style={{ fontFamily: '"Unbounded", sans-serif' }} className="text-xs font-bold text-[#065F46] uppercase flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4.5 h-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.793 1.993 1.81A48.226 48.226 0 0 1 18 4.084m-5.8 0A48.197 48.197 0 0 0 12 4.084m0 0c-1.135.094-1.976 1.057-1.976 2.192V16.5A2.25 2.25 0 0 0 12 18.75h.375m-9.303-3.376C1.83 14.124 1.5 13.1 1.5 12c0-4.97 4.03-9 9-9a8.96 8.96 0 0 1 5.433 1.83" /></svg>Final Summary Details</h3>
                  <div className="space-y-3 text-sm font-bold text-[#065F46]">
                    <div className="flex justify-between border-b border-[#A7F3D0] pb-2"><span>Total Growth:</span><span className="font-black">{(activePlan.currentBalance / activePlan.initialBalance).toFixed(2)}x</span></div>
                    <div className="flex justify-between border-b border-[#A7F3D0] pb-2"><span>Wins:</span><span className="font-black">{winsCount}</span></div>
                    <div className="flex justify-between"><span>Losses:</span><span className="font-black text-rose-800">{lossesCount}</span></div>
                  </div>
                  <button onClick={() => setView('dashboard')} style={{ fontFamily: '"Unbounded", sans-serif' }} className="w-full py-2.5 bg-[#047857] text-white font-bold text-[10px] uppercase rounded-xl shadow-xs transition flex items-center justify-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>Go Back to Main Page</button>
                </div>
              )}

            </div>

          </div>
        )}

      </main>
    </div>
  );
}