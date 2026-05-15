"use client";

import { useState, useEffect } from "react";
import { db } from "../firebase/config"; 
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  vendorId: string;
  featuredUntil?: string; 
  featureRequest?: {
    status: string;
    days: number;
    amount: number;
    screenshotUrl: string;
    submittedAt: string;
  } | null;
}

interface Booking {
  id: string;
  totalPaid: number;
  vendorName: string;
  customerName: string;
  status: string;
}

export default function AdminDashboard() {
  // ==========================================
  // 1. THE ADMIN GATEKEEPER STATES
  // ==========================================
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [authCheckDone, setAuthCheckDone] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");

  // --- FIREBASE STATES FOR APPROVALS ---
  const [pendingFeatures, setPendingFeatures] = useState<Vehicle[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);

  // --- PLATFORM SETTINGS STATES ---
  const [adminUpiId, setAdminUpiId] = useState("");
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  // --- GLOBAL FEE STATES ---
  const [platformFee, setPlatformFee] = useState<number>(100);
  const [driverFee, setDriverFee] = useState<number>(800);
  const [deliveryFee, setDeliveryFee] = useState<number>(500);
  const [pickupFee, setPickupFee] = useState<number>(500);
  const [isSavingFees, setIsSavingFees] = useState(false);

  // --- NEW: LIVE DATA METRICS STATES ---
  const [realVendors, setRealVendors] = useState<any[]>([]);
  const [realCustomers, setRealCustomers] = useState<any[]>([]);
  
  const [totalGrossValue, setTotalGrossValue] = useState(0);
  const [totalPlatformEarnings, setTotalPlatformEarnings] = useState(0);
  const [featureRevenue, setFeatureRevenue] = useState(0);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);

  // ==========================================
  // 2. CHECK SESSION STORAGE ON LOAD
  // ==========================================
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem("carxone_master_admin");
    if (sessionAuth === "authenticated") {
      setIsAdminLoggedIn(true);
    }
    setAuthCheckDone(true);
  }, []);

  // ==========================================
  // 3. SECURE HARDCODED LOGIN LOGIC
  // ==========================================
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === "carxone01@gmail.com" && loginPassword === "L1p0nsh@n") {
      sessionStorage.setItem("carxone_master_admin", "authenticated");
      setIsAdminLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Access Denied: Invalid Master Credentials.");
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("carxone_master_admin");
    setIsAdminLoggedIn(false);
  };

  // --- 4. THE GRAND LEDGER ENGINE ---
  const fetchAdminData = async () => {
    setIsLoadingApprovals(true);
    try {
      // A. Fetch Pending Approvals
      const q = query(collection(db, "vehicles"), where("featureRequest.status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      const pendingVehicles: Vehicle[] = [];
      querySnapshot.forEach((doc) => {
        pendingVehicles.push({ id: doc.id, ...doc.data() } as Vehicle);
      });
      setPendingFeatures(pendingVehicles);

      // B. Fetch Platform Settings
      const settingsRef = doc(db, "platformSettings", "global");
      const settingsSnap = await getDoc(settingsRef);
      let currentPlatformFee = 100;

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setAdminUpiId(data.adminUpiId || "");
        
        if (data.platformFee !== undefined) {
          setPlatformFee(data.platformFee);
          currentPlatformFee = data.platformFee;
        }
        if (data.driverFee !== undefined) setDriverFee(data.driverFee);
        if (data.deliveryFee !== undefined) setDeliveryFee(data.deliveryFee);
        if (data.pickupFee !== undefined) setPickupFee(data.pickupFee);
        
        if (data.featureRevenue !== undefined) {
          setFeatureRevenue(data.featureRevenue);
        }
      }

      // C. Fetch all Vehicles
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const fleetCounts: Record<string, number> = {};
      vehiclesSnap.forEach(vDoc => {
        const v = vDoc.data();
        const vName = v.vendorId || "Unknown Vendor";
        fleetCounts[vName] = (fleetCounts[vName] || 0) + 1;
      });

      // D. Fetch all Vendor Settings
      const vSettingsSnap = await getDocs(collection(db, "vendorSettings"));
      const vSettings: Record<string, any> = {};
      vSettingsSnap.forEach(doc => {
        vSettings[doc.id] = doc.data(); 
      });

      // E. Fetch all Bookings
      const bookingsSnap = await getDocs(collection(db, "bookings"));
      const vendorMap: Record<string, any> = {};
      const customerMap: Record<string, any> = {};
      let globalPlatformFees = 0;
      let globalCommissions = 0;
      let globalGross = 0;
      let confirmedCount = 0;

      bookingsSnap.forEach((doc) => {
        const bk = doc.data() as Booking;
        
        const cName = bk.customerName || "Guest User";
        if (!customerMap[cName]) customerMap[cName] = { id: cName, name: cName, bookings: 0, totalSpent: 0 };
        
        if (bk.status === "confirmed" || bk.status === "completed") {
          confirmedCount++;
          customerMap[cName].bookings += 1;
          customerMap[cName].totalSpent += bk.totalPaid;
        
          const vName = bk.vendorName || "Unknown Vendor";
          if (!vendorMap[vName]) {
            vendorMap[vName] = {
              id: vName, name: vName, totalBookings: 0, grossRevenue: 0, platformFeeEarned: 0, commissionEarned: 0, fleetSize: fleetCounts[vName] || 0, status: "Active"
            };
          }

          vendorMap[vName].totalBookings += 1;
          vendorMap[vName].grossRevenue += bk.totalPaid;
          vendorMap[vName].platformFeeEarned += currentPlatformFee;
          globalPlatformFees += currentPlatformFee;

          const commRate = vSettings[vName]?.commissionRate || 0;
          const commissionAmount = (bk.totalPaid * commRate) / 100;
          vendorMap[vName].commissionEarned += commissionAmount;
          globalCommissions += commissionAmount;

          globalGross += bk.totalPaid;
        }
      });

      Object.keys(fleetCounts).forEach(vName => {
         if(!vendorMap[vName]) {
           vendorMap[vName] = { id: vName, name: vName, totalBookings: 0, grossRevenue: 0, platformFeeEarned: 0, commissionEarned: 0, fleetSize: fleetCounts[vName], status: "Active" };
         }
      });

      setRealVendors(Object.values(vendorMap));
      setRealCustomers(Object.values(customerMap));
      setTotalPlatformEarnings(globalPlatformFees + globalCommissions);
      setTotalGrossValue(globalGross);
      setTotalBookingsCount(confirmedCount);

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAdminData();
    }
  }, [isAdminLoggedIn]);

  const handleApproveFeature = async (vehicle: Vehicle) => {
    if (!vehicle.featureRequest) return;
    const isConfirmed = window.confirm(`Are you sure you want to approve ${vehicle.brand} ${vehicle.model} for ${vehicle.featureRequest.days} days?`);
    if (!isConfirmed) return;

    try {
      const days = vehicle.featureRequest.days;
      const amountPaid = vehicle.featureRequest.amount || 0;
      const expirationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await updateDoc(doc(db, "vehicles", vehicle.id), {
        featuredUntil: expirationDate,
        featureRequest: null
      });

      const globalRef = doc(db, "platformSettings", "global");
      const globalSnap = await getDoc(globalRef);
      const currentFeatureRevenue = globalSnap.exists() ? (globalSnap.data().featureRevenue || 0) : 0;
      
      const newFeatureRevenue = currentFeatureRevenue + amountPaid;
      await setDoc(globalRef, { featureRevenue: newFeatureRevenue }, { merge: true });
      
      setFeatureRevenue(newFeatureRevenue);
      setPendingFeatures(prev => prev.filter(v => v.id !== vehicle.id));
      alert("Success! Vehicle is now Featured and payment has been logged to your earnings.");
    } catch (error) {
      alert("Failed to approve vehicle.");
    }
  };

  const handleRejectFeature = async (vehicleId: string) => {
    const isConfirmed = window.confirm("Are you sure you want to reject this request? The vendor will have to submit it again.");
    if (!isConfirmed) return;
    try {
      await updateDoc(doc(db, "vehicles", vehicleId), { featureRequest: null });
      setPendingFeatures(prev => prev.filter(v => v.id !== vehicleId));
      alert("Request rejected and deleted.");
    } catch (error) {
      alert("Failed to reject request.");
    }
  };

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUpi(true);
    try {
      await setDoc(doc(db, "platformSettings", "global"), { adminUpiId: adminUpiId, updatedAt: new Date().toISOString() }, { merge: true });
      alert("Success! Your Master UPI ID is saved.");
    } catch (error) {
      alert("Failed to save UPI ID.");
    } finally {
      setIsSavingUpi(false);
    }
  };

  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFees(true);
    try {
      await setDoc(doc(db, "platformSettings", "global"), {
        platformFee: Number(platformFee), driverFee: Number(driverFee), deliveryFee: Number(deliveryFee), pickupFee: Number(pickupFee), updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("Success! Global fee settings have been successfully saved.");
      fetchAdminData();
    } catch (error) {
      alert("Failed to save fee settings.");
    } finally {
      setIsSavingFees(false);
    }
  };

  // Prevent flicker during load
  if (!authCheckDone) return null; 

  // ==========================================
  // THE SECURE LOGIN INTERFACE (GATEKEEPER)
  // ==========================================
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-[#003366] selection:text-white">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md animate-in fade-in zoom-in duration-300">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black tracking-widest text-[#0a1128] uppercase flex items-center justify-center gap-3 mb-2">
              CarXone 
              <span className="text-[10px] font-bold text-amber-600 tracking-widest px-2.5 py-1 bg-amber-100 rounded border border-amber-200">
                MASTER ADMIN
              </span>
            </h1>
            <p className="text-sm font-bold text-slate-500">System Control Panel Authentication</p>
          </div>

          {loginError && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg text-center border border-red-100">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Master Email</label>
              <input 
                type="email" 
                required 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                placeholder="admin@carxone.com"
                className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-800 outline-none focus:border-[#003366] bg-slate-50 transition" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Security Password</label>
              <input 
                type="password" 
                required 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-800 outline-none focus:border-[#003366] bg-slate-50 transition" 
              />
            </div>
            <button type="submit" className="w-full bg-[#0a1128] text-amber-400 font-black tracking-widest uppercase py-4 rounded-lg hover:bg-[#003366] transition shadow-lg mt-2">
              AUTHENTICATE SECURELY
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <a href="/" className="text-xs font-bold text-slate-400 hover:text-[#003366] transition">← Return to Homepage</a>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // THE MOBILE-FRIENDLY ADMIN DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-[#003366] selection:text-white overflow-x-hidden">
      
      {/* MOBILE OPTIMIZED HEADER */}
      <header className="sticky top-0 z-50 bg-[#0a1128] border-b border-slate-800 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-4 max-w-7xl mx-auto gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase flex items-center gap-3">
              CarXone 
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 tracking-widest px-2 py-1 sm:px-2.5 sm:py-1 bg-amber-400/10 rounded border border-amber-400/20">
                MASTER ADMIN
              </span>
            </h1>
          </div>
          
          {/* HORIZONTAL SCROLL NAV FOR MOBILE */}
          <nav className="flex items-center space-x-6 text-sm font-semibold w-full overflow-x-auto pb-2 md:pb-0 snap-x hide-scrollbar">
            <button onClick={() => setActiveTab("overview")} className={`snap-start whitespace-nowrap ${activeTab === "overview" ? "text-amber-400" : "text-slate-300"} hover:text-white transition`}>Overview</button>
            <button onClick={() => setActiveTab("approvals")} className={`snap-start whitespace-nowrap ${activeTab === "approvals" ? "text-amber-400" : "text-slate-300"} hover:text-white transition relative`}>
              Approvals
              {pendingFeatures.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-[#0a1128] text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingFeatures.length}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab("vendors")} className={`snap-start whitespace-nowrap ${activeTab === "vendors" ? "text-amber-400" : "text-slate-300"} hover:text-white transition`}>Vendors</button>
            <button onClick={() => setActiveTab("customers")} className={`snap-start whitespace-nowrap ${activeTab === "customers" ? "text-amber-400" : "text-slate-300"} hover:text-white transition`}>Customers</button>
            <button onClick={() => setActiveTab("settings")} className={`snap-start whitespace-nowrap ${activeTab === "settings" ? "text-amber-400" : "text-slate-300"} hover:text-white transition`}>Settings</button>
            
            <div className="h-6 w-px bg-slate-700 hidden md:block"></div>
            <button onClick={handleAdminLogout} className="snap-start whitespace-nowrap text-white hover:text-amber-400 transition font-bold tracking-wide">Log Out</button>
          </nav>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 flex flex-col gap-6 md:gap-10">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <AdminStatCard title="Total Platform Gross" value={`₹${totalGrossValue.toLocaleString()}`} subtitle="Lifetime Booking Value" />
              <AdminStatCard title="Total Admin Earnings" value={`₹${totalPlatformEarnings.toLocaleString()}`} subtitle="Platform Fees + Commission" highlight={true} />
              <AdminStatCard title="Featured Ads Revenue" value={`₹${featureRevenue.toLocaleString()}`} subtitle="Paid directly by vendors" />
              
              <div onClick={() => setActiveTab("approvals")} className="cursor-pointer">
                <AdminStatCard 
                  title="Pending Approvals" 
                  value={pendingFeatures.length.toString()} 
                  subtitle="Action Required" 
                  highlight={pendingFeatures.length > 0} 
                />
              </div>
            </div>

            <section className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-base md:text-lg font-black text-[#003366]">Platform Metrics</h3>
              </div>
              <div className="p-4 md:p-6 flex flex-col sm:flex-row gap-6 md:gap-12">
                <div>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Confirmed Bookings</p>
                  <p className="text-xl md:text-2xl font-black text-slate-800">{totalBookingsCount}</p>
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Registered Customers</p>
                  <p className="text-xl md:text-2xl font-black text-slate-800">{realCustomers.length}</p>
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Vendors</p>
                  <p className="text-xl md:text-2xl font-black text-slate-800">{realVendors.length}</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: APPROVALS */}
        {activeTab === "approvals" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-4">
              <h2 className="text-xl md:text-2xl font-black text-[#0a1128]">Feature Requests & Payments</h2>
              <button onClick={fetchAdminData} className="w-full sm:w-auto text-xs font-bold text-[#003366] bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition shadow-sm">
                Refresh Queue
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
              {isLoadingApprovals ? (
                <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Scanning database for new requests...</div>
              ) : pendingFeatures.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-bold flex flex-col items-center">
                  <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  You are all caught up! No pending requests.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] md:text-xs uppercase text-slate-500 font-black tracking-widest">
                      <tr>
                        <th className="p-4 md:p-6">Vendor & Vehicle</th>
                        <th className="p-4 md:p-6">Feature Duration</th>
                        <th className="p-4 md:p-6">Amount Claimed</th>
                        <th className="p-4 md:p-6 text-center">Payment Proof</th>
                        <th className="p-4 md:p-6 text-right">Admin Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-semibold text-slate-700">
                      {pendingFeatures.map(vehicle => (
                        <tr key={vehicle.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                          <td className="p-4 md:p-6">
                            <div className="font-black text-[#0a1128]">{vehicle.vendorId || "Unknown Vendor"}</div>
                            <div className="text-[10px] md:text-xs text-slate-500 mt-1">{vehicle.brand} {vehicle.model}</div>
                          </td>
                          <td className="p-4 md:p-6">
                            <span className="bg-amber-100 text-amber-800 font-black px-2 md:px-3 py-1 rounded-md text-[10px] md:text-xs">
                              {vehicle.featureRequest?.days} Days
                            </span>
                          </td>
                          <td className="p-4 md:p-6">
                            <span className="text-base md:text-lg font-black text-green-600">₹{vehicle.featureRequest?.amount}</span>
                          </td>
                          <td className="p-4 md:p-6 text-center">
                            <a 
                              href={vehicle.featureRequest?.screenshotUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] md:text-xs uppercase tracking-widest px-3 md:px-4 py-2 rounded-lg hover:bg-slate-200 transition shadow-sm"
                            >
                              View Receipt
                            </a>
                          </td>
                          <td className="p-4 md:p-6 text-right flex justify-end gap-2">
                            <button onClick={() => handleRejectFeature(vehicle.id)} className="text-[10px] md:text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition">Reject</button>
                            <button onClick={() => handleApproveFeature(vehicle)} className="text-[10px] md:text-xs font-black text-white bg-green-500 px-3 py-2 rounded-lg hover:bg-green-600 transition shadow-sm">VERIFY & APPROVE</button>
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

        {/* TAB 3: VENDORS */}
        {activeTab === "vendors" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-xl md:text-2xl font-black text-[#0a1128]">Vendor Financial Directory</h2>
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase text-slate-500 font-black tracking-widest">
                    <tr>
                      <th className="p-4 md:p-6">Vendor Name</th>
                      <th className="p-4 md:p-6">Total Bookings</th>
                      <th className="p-4 md:p-6 border-l border-slate-100">Vendor Gross Revenue</th>
                      <th className="p-4 md:p-6 bg-blue-50/30 text-[#003366]">Platform Fee (Admin)</th>
                      <th className="p-4 md:p-6 bg-green-50/30 text-green-700">Commission (Admin)</th>
                      <th className="p-4 md:p-6 text-right">Fleet Size</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-semibold text-slate-700">
                    {realVendors.map(vendor => (
                      <tr key={vendor.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="p-4 md:p-6 text-[#0a1128] font-black">{vendor.name}</td>
                        <td className="p-4 md:p-6">{vendor.totalBookings}</td>
                        <td className="p-4 md:p-6 border-l border-slate-100 font-bold text-slate-800">₹{vendor.grossRevenue.toLocaleString()}</td>
                        <td className="p-4 md:p-6 bg-blue-50/30 font-black text-[#003366]">₹{vendor.platformFeeEarned.toLocaleString()}</td>
                        <td className="p-4 md:p-6 bg-green-50/30 font-black text-green-600">₹{vendor.commissionEarned.toLocaleString()}</td>
                        <td className="p-4 md:p-6 text-right">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[10px] md:text-xs">{vendor.fleetSize} Vehicles</span>
                        </td>
                      </tr>
                    ))}
                    {realVendors.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-slate-400 font-bold">No active vendors found in the database.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMERS */}
        {activeTab === "customers" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-xl md:text-2xl font-black text-[#0a1128]">Customer Database</h2>
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] md:text-xs uppercase text-slate-500 font-black tracking-widest">
                    <tr>
                      <th className="p-4 md:p-6">Customer Account</th>
                      <th className="p-4 md:p-6">Total Confirmed Bookings</th>
                      <th className="p-4 md:p-6">Lifetime Value (Spend)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-semibold text-slate-700">
                    {realCustomers.map(customer => (
                      <tr key={customer.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="p-4 md:p-6 font-black text-[#0a1128]">{customer.name}</td>
                        <td className="p-4 md:p-6">{customer.bookings}</td>
                        <td className="p-4 md:p-6 font-bold text-green-600">₹{customer.totalSpent.toLocaleString()}</td>
                      </tr>
                    ))}
                    {realCustomers.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-10 text-slate-400 font-bold">No customer bookings found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PLATFORM SETTINGS */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-xl md:text-2xl font-black text-[#0a1128]">Platform Settings</h2>
            
            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 max-w-2xl mb-2">
              <h3 className="text-base md:text-lg font-black text-[#003366] border-b border-slate-100 pb-3 mb-6">Master Payment Configuration</h3>
              <form onSubmit={handleSaveUpi} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] md:text-sm font-bold text-slate-700 mb-2">Platform Admin UPI ID</label>
                  <input 
                    type="text" 
                    required
                    value={adminUpiId}
                    onChange={(e) => setAdminUpiId(e.target.value)}
                    placeholder="e.g. admin@oksbi" 
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-800 outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366] transition bg-slate-50" 
                  />
                  <p className="text-[10px] md:text-xs text-slate-500 mt-2 leading-relaxed">
                    Vendors will send payments directly to this UPI ID when paying to feature their vehicles.
                  </p>
                </div>
                <button 
                  type="submit" 
                  disabled={isSavingUpi}
                  className="mt-2 w-full sm:w-max bg-[#003366] text-white text-[10px] md:text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-lg hover:bg-[#0a1128] transition shadow-md"
                >
                  {isSavingUpi ? "SAVING..." : "SAVE MASTER UPI ID"}
                </button>
              </form>
            </section>

            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 max-w-2xl">
              <h3 className="text-base md:text-lg font-black text-[#003366] border-b border-slate-100 pb-3 mb-6">Global Fee Controls</h3>
              <form onSubmit={handleSaveFees} className="flex flex-col gap-6">
                
                <AdminFeeInput label="Platform Fee (Customer Markup)" value={platformFee} onChange={setPlatformFee} />
                <AdminFeeInput label="Request a Driver (Per Day)" value={driverFee} onChange={setDriverFee} />
                <AdminFeeInput label="Home Delivery (One-Time)" value={deliveryFee} onChange={setDeliveryFee} />
                <AdminFeeInput label="Home Pickup (After Trip)" value={pickupFee} onChange={setPickupFee} />

                <button 
                  type="submit" 
                  disabled={isSavingFees}
                  className="mt-4 w-full bg-green-500 text-white text-xs md:text-sm font-black uppercase tracking-widest px-6 py-4 rounded-lg hover:bg-green-600 transition shadow-md"
                >
                  {isSavingFees ? "SAVING TO DATABASE..." : "SAVE GLOBAL FEES"}
                </button>
              </form>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}

// --- HELPER COMPONENTS FOR THE UI ---

function AdminFeeInput({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3 border-b border-slate-50 pb-5 last:border-0 last:pb-0">
      <h4 className="font-bold text-xs md:text-sm text-slate-700">{label}</h4>
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-slate-400">₹</span>
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))} 
          className="w-full sm:w-24 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366] transition bg-slate-50" 
        />
      </div>
    </div>
  );
}

function AdminStatCard({ title, value, subtitle, highlight = false }: { title: string, value: string, subtitle: string, highlight?: boolean }) {
  return (
    <div className={`p-4 md:p-6 rounded-2xl border ${highlight ? 'bg-amber-50/50 border-amber-200/50 shadow-[0_4px_20px_-4px_rgba(251,191,36,0.15)]' : 'bg-white border-slate-100 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)]'} flex flex-col hover:-translate-y-1 transition-transform duration-300`}>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">{title}</span>
      <span className={`text-3xl md:text-4xl font-black ${highlight ? 'text-amber-600' : 'text-[#0a1128]'} mb-1 md:mb-2 truncate`}>{value}</span>
      <span className={`text-[10px] md:text-xs font-semibold ${highlight ? 'text-amber-700/70' : 'text-slate-400'}`}>{subtitle}</span>
    </div>
  );
}