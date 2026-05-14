"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "./firebase/config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

const NAGALAND_CITIES = [
  "Dimapur", "Kohima", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", 
  "Mon", "Phek", "Kiphire", "Longleng", "Peren", "Noklak", "Shamator", 
  "Niuland", "Chumoukedima", "Tseminyu"
];

// The exact blueprint of our live Firebase data
interface Vehicle {
  id: string;
  brand: string;
  model: string;
  basePrice: number;
  outletLocation: string;
  vendorId: string;
  images: string[];
  category: string;
  addedOn: string;
  pricingModel?: string; 
  featuredUntil?: string; 
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
}

function HomeContent() {
  const router = useRouter();

  // 1. STATE VARIABLES: These memorize what the user types in the search bar
  const [pickupCity, setPickupCity] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const [vehicleType, setVehicleType] = useState("All Vehicles");

  // --- FIREBASE DATA STATES ---
  const [isLoading, setIsLoading] = useState(true);
  const [newestVehicles, setNewestVehicles] = useState<Vehicle[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const [popularVehicles, setPopularVehicles] = useState<Vehicle[]>([]);

  // --- FETCH & SORT LIVE VEHICLES ---
  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, "vehicles"), where("status", "==", "Available"));
        const querySnapshot = await getDocs(q);
        
        const allVehicles: Vehicle[] = [];
        querySnapshot.forEach((doc) => {
          allVehicles.push({ id: doc.id, ...doc.data() } as Vehicle);
        });

        const now = new Date();

        // 1. Sort NEWEST (top 9)
        const sortedNewest = [...allVehicles]
          .sort((a, b) => new Date(b.addedOn || 0).getTime() - new Date(a.addedOn || 0).getTime())
          .slice(0, 9); 
        
        // 2. Sort FEATURED (Prioritize Paid Ads, then Discounts, then Premium, top 9)
        let sortedFeatured = allVehicles
          .filter(v => v.featuredUntil && new Date(v.featuredUntil) > now)
          .slice(0, 9);
        
        if (sortedFeatured.length < 9) {
          const discounted = allVehicles
            .filter(v => v.discount && v.discount.value > 0 && !sortedFeatured.includes(v))
            .slice(0, 9 - sortedFeatured.length);
          sortedFeatured = [...sortedFeatured, ...discounted];
        }

        if (sortedFeatured.length < 9) {
          const premium = [...allVehicles]
            .sort((a, b) => b.basePrice - a.basePrice)
            .filter(v => !sortedFeatured.includes(v))
            .slice(0, 9 - sortedFeatured.length);
          sortedFeatured = [...sortedFeatured, ...premium];
        }

        // 3. Sort POPULAR (Lowest price first, top 9)
        const sortedPopular = [...allVehicles]
          .sort((a, b) => a.basePrice - b.basePrice)
          .slice(0, 9);

        setNewestVehicles(sortedNewest);
        setFeaturedVehicles(sortedFeatured);
        setPopularVehicles(sortedPopular);

      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // 2. THE SEARCH FUNCTION
  const handleSearch = () => {
    let targetPage = "/cars";
    if (vehicleType === "Bikes") targetPage = "/bikes";
    if (vehicleType === "Scootys") targetPage = "/scooty";
    if (vehicleType === "Trucks") targetPage = "/trucks";

    router.push(`${targetPage}?city=${pickupCity}&dropoffCity=${dropoffCity}&pickup=${pickupDate}&dropoff=${dropoffDate}`);
  };

  return (
    <main className="flex flex-col items-center w-full">
      
      {/* ----------------------------------------- */}
      {/* 1. MASSIVE HERO SECTION & SEARCH ENGINE (REDUCED HEIGHT BY 20%) */}
      {/* ----------------------------------------- */}
      <section className="relative w-full bg-[#0a0a0a] text-white pt-24 pb-32 px-6 overflow-hidden border-b-4 border-[#003366] flex flex-col items-center justify-center">
        {/* Background Overlay */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center"></div>
        
        <div className="relative max-w-7xl mx-auto flex flex-col items-center text-center z-10 w-full">
          
          {/* REVISED HERO TEXT */}
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-4 text-white drop-shadow-lg">
            CarXone
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-gray-300 mb-8 uppercase tracking-widest max-w-3xl">
            One Stop Solution, For Your Car Rentals.
          </h2>
          
          {/* THE SMART SEARCH BAR (Embedded in Hero) */}
          <div className="bg-white rounded-xl shadow-2xl p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end text-left mt-4">
            
            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Starting Point</label>
              <select 
                value={pickupCity} 
                onChange={(e) => setPickupCity(e.target.value)}
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black bg-transparent cursor-pointer font-bold transition text-sm"
              >
                <option value="" disabled>Pickup City...</option>
                {NAGALAND_CITIES.map(c => <option key={`pickup-${c}`} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Destination</label>
              <select 
                value={dropoffCity} 
                onChange={(e) => setDropoffCity(e.target.value)}
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black bg-transparent cursor-pointer font-bold transition text-sm"
              >
                <option value="" disabled>Drop-off City...</option>
                <option value="Local Only">Local Only</option>
                {NAGALAND_CITIES.map(c => <option key={`dropoff-${c}`} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Pickup Date</label>
              <input 
                type="datetime-local" 
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black cursor-pointer bg-transparent text-[11px] font-bold transition" 
              />
            </div>

            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Return Date</label>
              <input 
                type="datetime-local" 
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black cursor-pointer bg-transparent text-[11px] font-bold transition" 
              />
            </div>

            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Vehicle Type</label>
              <select 
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black bg-transparent cursor-pointer font-bold transition text-sm"
              >
                <option>All Vehicles</option>
                <option>Cars</option>
                <option>Bikes</option>
                <option>Scootys</option>
                <option>Trucks</option>
              </select>
            </div>

            <button 
              onClick={handleSearch}
              className="w-full bg-[#003366] text-white font-black text-sm uppercase tracking-widest px-4 py-3.5 rounded-lg hover:bg-black transition shadow-md"
            >
              Search
            </button>
            
          </div>
        </div>
      </section>

      {/* ----------------------------------------- */}
      {/* 2. LIVE VEHICLE GRIDS */}
      {/* ----------------------------------------- */}
      <div className="w-full max-w-7xl px-4 flex flex-col gap-24 mt-16 mb-32">
        
        {isLoading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
             <div className="w-12 h-12 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
             <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Live Fleet...</p>
          </div>
        ) : (
          <>
            {/* FEATURED VEHICLES */}
            {featuredVehicles.length > 0 && (
              <section>
                <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-2">
                  <h3 className="text-3xl font-black text-black tracking-tight">Featured Vehicles</h3>
                  <a href="/cars" className="text-[#003366] font-bold hover:text-black transition">View Full Collection →</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredVehicles.map(vehicle => <VehicleCard key={`feat-${vehicle.id}`} vehicle={vehicle} isFeatured />)}
                </div>
              </section>
            )}

            {/* NEWLY ADDED */}
            {newestVehicles.length > 0 && (
              <section>
                <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-2">
                  <h3 className="text-3xl font-black text-black tracking-tight">Newly Added</h3>
                  <a href="/cars" className="text-[#003366] font-bold hover:text-black transition">View Full Collection →</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {newestVehicles.map(vehicle => <VehicleCard key={`new-${vehicle.id}`} vehicle={vehicle} />)}
                </div>
              </section>
            )}

            {/* MOST POPULAR */}
            {popularVehicles.length > 0 && (
              <section>
                <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-2">
                  <h3 className="text-3xl font-black text-black tracking-tight">Most Popular</h3>
                  <a href="/cars" className="text-[#003366] font-bold hover:text-black transition">View Full Collection →</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {popularVehicles.map(vehicle => <VehicleCard key={`pop-${vehicle.id}`} vehicle={vehicle} />)}
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </main>
  );
}

// -----------------------------------------
// REUSABLE COMPONENT: UPGRADED VEHICLE CARD
// -----------------------------------------
function VehicleCard({ vehicle, isFeatured = false }: { vehicle: Vehicle, isFeatured?: boolean }) {
  const searchParams = useSearchParams();
  const activePickup = searchParams?.get("pickup") || "";
  const activeDropoff = searchParams?.get("dropoff") || "";

  // Magic Discount Calculator
  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  const finalPrice = calculateDiscountedPrice(vehicle.basePrice, vehicle.discount);

  // DYNAMIC PRICING LABEL LOGIC
  let priceLabel = "Per 24 Hours";
  if (vehicle.pricingModel === "per_day") priceLabel = "Per Day";
  else if (vehicle.pricingModel === "flat_rate_km_limit") priceLabel = "Per 24h (KM Limit)";
  else if (vehicle.pricingModel === "per_hire") priceLabel = "Per Hire (Flat)";

  // Builds the Smart Link that passes data to the checkout page
  const smartBookLink = `/book?car=${encodeURIComponent(vehicle.brand + " " + vehicle.model)}&price=${finalPrice}&pickup=${activePickup}&dropoff=${activeDropoff}&city=${encodeURIComponent(vehicle.outletLocation)}`;

  // Check if it is currently a paid featured ad
  const isPaidFeature = vehicle.featuredUntil && new Date(vehicle.featuredUntil) > new Date();

  return (
    <div className={`group bg-white border rounded overflow-hidden transition-all duration-300 flex flex-col ${isFeatured ? 'border-blue-200 shadow-md hover:shadow-xl' : 'border-gray-200 hover:border-[#003366] hover:shadow-lg'}`}>
      
      {/* IMAGE CONTAINER */}
      <div className="bg-gray-100 h-56 w-full flex items-center justify-center relative overflow-hidden">
        {vehicle.images && vehicle.images[0] ? (
          <img src={vehicle.images[0]} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        ) : (
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Image</span>
        )}

        {/* Paid Featured Badge */}
        {isPaidFeature && (
           <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 uppercase tracking-widest rounded shadow-md z-10 flex items-center gap-1">
             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
             Featured
           </div>
        )}

        {/* Discount Badge */}
        {vehicle.discount && vehicle.discount.value > 0 && (
          <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest rounded shadow-md z-10">
            {vehicle.discount.type === 'percentage' ? `${vehicle.discount.value}% OFF` : `₹${vehicle.discount.value} OFF`}
          </div>
        )}
      </div>
      
      <div className="p-6 flex-grow flex flex-col justify-between">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-[#003366] uppercase tracking-wider">{vehicle.category}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📍 {vehicle.outletLocation}</div>
          </div>
          <h4 className="text-xl font-black text-black tracking-tight">{vehicle.brand} {vehicle.model}</h4>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            {/* DYNAMIC PRICING LABEL */}
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{priceLabel}</p>
            <span className="text-xl font-black text-black">₹{finalPrice}</span>
          </div>
          <a href={smartBookLink} className="bg-[#003366] text-white text-sm font-bold px-6 py-3 rounded hover:bg-black transition shadow-sm">
            Book
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-[#003366]">Loading CarXone...</div>}>
      <HomeContent />
    </Suspense>
  );
}