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

// --- COMPREHENSIVE BRAND DICTIONARY ---
const VEHICLE_BRANDS = {
  "Cars": ["Ford", "Honda", "Hyundai", "Kia", "Mahindra", "Maruti Suzuki", "MG", "Nissan", "Renault", "Skoda", "Tata", "Toyota", "Volkswagen"],
  "Two Wheelers": ["Aprilia", "Ather", "Bajaj", "Hero", "Honda", "Jawa", "KTM", "Ola", "Royal Enfield", "Suzuki", "TVS", "Vespa", "Yamaha"],
  "Trucks": ["Ashok Leyland", "BharatBenz", "Eicher", "Force", "Isuzu", "Mahindra", "Swaraj Mazda", "Tata"]
};

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
  driverProvision?: string; // Added for the modal
  featuredUntil?: string; 
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract any search params if the user navigated back
  const activePickup = searchParams?.get("pickup") || "";
  const activeDropoff = searchParams?.get("dropoff") || "";

  // 1. STATE VARIABLES
  const [pickupCity, setPickupCity] = useState("");
  const [category, setCategory] = useState("All Vehicles");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");

  // --- FIREBASE DATA STATES ---
  const [isLoading, setIsLoading] = useState(true);
  const [newestVehicles, setNewestVehicles] = useState<Vehicle[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const [popularVehicles, setPopularVehicles] = useState<Vehicle[]>([]);

  // --- NEW: QUICK VIEW MODAL STATE ---
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // --- SMART FILTER LOGIC ---
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setBrand(""); 
    setModel(""); 
  };

  const getAvailableBrands = () => {
    if (category === "Cars") return VEHICLE_BRANDS["Cars"];
    if (category === "Two Wheelers") return VEHICLE_BRANDS["Two Wheelers"];
    if (category === "Trucks") return VEHICLE_BRANDS["Trucks"];
    
    const all = [...VEHICLE_BRANDS["Cars"], ...VEHICLE_BRANDS["Two Wheelers"], ...VEHICLE_BRANDS["Trucks"]];
    return Array.from(new Set(all)).sort();
  };

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

        // 1. Sort NEWEST
        const sortedNewest = [...allVehicles]
          .sort((a, b) => new Date(b.addedOn || 0).getTime() - new Date(a.addedOn || 0).getTime())
          .slice(0, 12); 
        
        // 2. Sort FEATURED
        let sortedFeatured = allVehicles
          .filter(v => v.featuredUntil && new Date(v.featuredUntil) > now)
          .slice(0, 12);
        
        if (sortedFeatured.length < 12) {
          const discounted = allVehicles
            .filter(v => v.discount && v.discount.value > 0 && !sortedFeatured.includes(v))
            .slice(0, 12 - sortedFeatured.length);
          sortedFeatured = [...sortedFeatured, ...discounted];
        }

        if (sortedFeatured.length < 12) {
          const premium = [...allVehicles]
            .sort((a, b) => b.basePrice - a.basePrice)
            .filter(v => !sortedFeatured.includes(v))
            .slice(0, 12 - sortedFeatured.length);
          sortedFeatured = [...sortedFeatured, ...premium];
        }

        // 3. Sort POPULAR
        const sortedPopular = [...allVehicles]
          .sort((a, b) => a.basePrice - b.basePrice)
          .slice(0, 12);

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
    if (category === "Two Wheelers") targetPage = "/bikes"; 
    if (category === "Trucks") targetPage = "/trucks";

    router.push(`${targetPage}?city=${pickupCity}&brand=${brand}&model=${model}`);
  };

  return (
    <main className="flex flex-col items-center w-full relative">
      
      {/* ----------------------------------------- */}
      {/* 1. MASSIVE HERO SECTION & SEARCH ENGINE */}
      {/* ----------------------------------------- */}
      <section className="relative w-full bg-[#0a0a0a] text-white pt-24 pb-32 px-6 overflow-hidden border-b-4 border-[#003366] flex flex-col items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center"></div>
        
        <div className="relative max-w-7xl mx-auto flex flex-col items-center text-center z-10 w-full">
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-4 text-white drop-shadow-lg">
            CarXone
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-gray-300 mb-8 uppercase tracking-widest max-w-3xl">
            One Stop Solution, For Your Car Rentals.
          </h2>
          
          {/* THE SMART SEARCH BAR */}
          <div className="bg-white rounded-xl shadow-2xl p-4 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end text-left mt-4">
            
            {/* 1. Outlet / Starting Point */}
            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Outlet / Starting Point</label>
              <select 
                value={pickupCity} 
                onChange={(e) => setPickupCity(e.target.value)}
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black bg-transparent cursor-pointer font-bold transition text-sm"
              >
                <option value="" disabled>Select City...</option>
                {NAGALAND_CITIES.map(c => <option key={`pickup-${c}`} value={c}>{c}</option>)}
              </select>
            </div>

            {/* 2. Category */}
            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Category</label>
              <select 
                value={category}
                onChange={handleCategoryChange}
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black bg-transparent cursor-pointer font-bold transition text-sm"
              >
                <option>All Vehicles</option>
                <option>Cars</option>
                <option>Two Wheelers</option>
                <option>Trucks</option>
              </select>
            </div>

            {/* 3. Brand - DYNAMIC DROPDOWN */}
            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Brand</label>
              <select 
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black bg-transparent cursor-pointer font-bold transition text-sm"
              >
                <option value="">All Brands</option>
                {getAvailableBrands().map(b => (
                  <option key={`brand-${b}`} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* 4. Model */}
            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Model</label>
              <input 
                type="text" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Innova"
                className="w-full border-b-2 border-gray-100 focus:border-[#003366] outline-none py-2 text-black bg-transparent font-bold transition text-sm"
              />
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
      <div className="w-full max-w-7xl px-2 md:px-6 flex flex-col gap-16 md:gap-24 mt-12 md:mt-16 mb-24 md:mb-32">
        
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
                <div className="flex justify-between items-end mb-4 md:mb-8 border-b border-gray-200 pb-2 px-2 md:px-0">
                  <h3 className="text-xl md:text-3xl font-black text-black tracking-tight">Featured Vehicles</h3>
                  <a href="/cars" className="text-[10px] md:text-base text-[#003366] font-bold hover:text-black transition">View Full Collection →</a>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-8">
                  {featuredVehicles.map(vehicle => (
                    <VehicleCard 
                      key={`feat-${vehicle.id}`} 
                      vehicle={vehicle} 
                      isFeatured 
                      onOpenDetails={() => setSelectedVehicle(vehicle)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* NEWLY ADDED */}
            {newestVehicles.length > 0 && (
              <section>
                <div className="flex justify-between items-end mb-4 md:mb-8 border-b border-gray-200 pb-2 px-2 md:px-0">
                  <h3 className="text-xl md:text-3xl font-black text-black tracking-tight">Newly Added</h3>
                  <a href="/cars" className="text-[10px] md:text-base text-[#003366] font-bold hover:text-black transition">View Full Collection →</a>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-8">
                  {newestVehicles.map(vehicle => (
                    <VehicleCard 
                      key={`new-${vehicle.id}`} 
                      vehicle={vehicle} 
                      onOpenDetails={() => setSelectedVehicle(vehicle)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* MOST POPULAR */}
            {popularVehicles.length > 0 && (
              <section>
                <div className="flex justify-between items-end mb-4 md:mb-8 border-b border-gray-200 pb-2 px-2 md:px-0">
                  <h3 className="text-xl md:text-3xl font-black text-black tracking-tight">Most Popular</h3>
                  <a href="/cars" className="text-[10px] md:text-base text-[#003366] font-bold hover:text-black transition">View Full Collection →</a>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-8">
                  {popularVehicles.map(vehicle => (
                    <VehicleCard 
                      key={`pop-${vehicle.id}`} 
                      vehicle={vehicle} 
                      onOpenDetails={() => setSelectedVehicle(vehicle)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

      </div>

      {/* --- THE GRAND QUICK VIEW MODAL --- */}
      {selectedVehicle && (
        <VehicleDetailsModal 
          vehicle={selectedVehicle} 
          searchPickup={activePickup} 
          searchDropoff={activeDropoff} 
          onClose={() => setSelectedVehicle(null)} 
        />
      )}

    </main>
  );
}

// -----------------------------------------
// REUSABLE COMPONENT: MOBILE MICRO-CARD
// -----------------------------------------
function VehicleCard({ vehicle, isFeatured = false, onOpenDetails }: { vehicle: Vehicle, isFeatured?: boolean, onOpenDetails: () => void }) {
  const searchParams = useSearchParams();
  const activePickup = searchParams?.get("pickup") || "";
  const activeDropoff = searchParams?.get("dropoff") || "";
  const [imgIndex, setImgIndex] = useState(0);

  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  const finalPrice = calculateDiscountedPrice(vehicle.basePrice, vehicle.discount);

  let priceLabel = "Per 24 Hours";
  if (vehicle.pricingModel === "per_day") priceLabel = "Per Day";
  else if (vehicle.pricingModel === "flat_rate_km_limit") priceLabel = "Per 24h (KM Limit)";
  else if (vehicle.pricingModel === "per_hire") priceLabel = "Per Hire (Flat)";
  else if (vehicle.pricingModel === "per_hour") priceLabel = "Per Hour";

  const smartBookLink = `/book?car=${encodeURIComponent(vehicle.brand + " " + vehicle.model)}&price=${finalPrice}&pickup=${activePickup}&dropoff=${activeDropoff}&city=${encodeURIComponent(vehicle.outletLocation)}`;
  const isPaidFeature = vehicle.featuredUntil && new Date(vehicle.featuredUntil) > new Date();

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();
    if (vehicle.images && vehicle.images.length > 0) {
      setImgIndex((prev) => (prev + 1) % vehicle.images.length);
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (vehicle.images && vehicle.images.length > 0) {
      setImgIndex((prev) => (prev === 0 ? vehicle.images.length - 1 : prev - 1));
    }
  };

  return (
    <div className={`group bg-white rounded-lg md:rounded-xl border overflow-hidden transition-all duration-300 flex flex-col cursor-pointer ${isFeatured ? 'border-blue-200 shadow-md hover:shadow-xl' : 'border-gray-200 hover:border-[#003366] hover:shadow-lg'}`} onClick={onOpenDetails}>
      
      <div className="bg-gray-100 aspect-[4/3] w-full flex items-center justify-center relative overflow-hidden">
        {vehicle.images && vehicle.images.length > 0 ? (
          <>
            <img src={vehicle.images[imgIndex]} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-10">
               <span className="bg-black/70 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm tracking-widest uppercase">Click to view</span>
            </div>

            {vehicle.images.length > 1 && (
              <>
                <button onClick={prevImg} className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 w-5 h-5 md:w-8 md:h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm text-[10px] md:text-sm z-20">
                  &#10094;
                </button>
                <button onClick={nextImg} className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 w-5 h-5 md:w-8 md:h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm text-[10px] md:text-sm z-20">
                  &#10095;
                </button>
                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-black/60 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm z-20">
                  {imgIndex + 1} / {vehicle.images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <span className="text-[8px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">No Image</span>
        )}

        {isPaidFeature && (
           <div className="absolute top-1 right-1 md:top-3 md:right-3 bg-yellow-400 text-yellow-900 text-[8px] md:text-[10px] font-black px-1.5 py-0.5 md:px-2 md:py-1 uppercase tracking-widest rounded shadow-md z-30 flex items-center gap-1">
             <svg className="w-2 h-2 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
             <span className="hidden md:inline">Featured</span>
           </div>
        )}

        {vehicle.discount && vehicle.discount.value > 0 && (
          <div className="absolute top-1 left-1 md:top-3 md:left-3 bg-red-600 text-white text-[8px] md:text-[10px] font-black px-1.5 py-0.5 md:px-2 md:py-1 uppercase tracking-widest rounded shadow-md z-30">
            {vehicle.discount.type === 'percentage' ? `${vehicle.discount.value}% OFF` : `₹${vehicle.discount.value} OFF`}
          </div>
        )}
      </div>
      
      <div className="p-2 md:p-6 flex-grow flex flex-col justify-between">
        <div className="mb-2 md:mb-6">
          <div className="hidden md:flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-[#003366] uppercase tracking-wider">{vehicle.category}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📍 {vehicle.outletLocation}</div>
          </div>
          <h4 className="text-[10px] md:text-xl font-black text-black tracking-tight truncate">{vehicle.brand} {vehicle.model}</h4>
          
          <div className="md:hidden text-[8px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">
            📍 {vehicle.outletLocation}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-2 md:pt-4 border-t border-gray-100 gap-1 md:gap-0">
          <div className="flex flex-col w-full md:w-auto">
            <p className="text-[7px] leading-tight md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{priceLabel}</p>
            <div className="flex items-end gap-1">
               <span className="text-xs sm:text-sm md:text-xl font-black text-black leading-none">₹{finalPrice}</span>
            </div>
          </div>
          <a 
            href={smartBookLink} 
            onClick={(e) => e.stopPropagation()} 
            className="w-full md:w-auto text-center bg-[#003366] text-white text-[8px] md:text-sm font-bold px-2 py-1.5 md:px-6 md:py-3 rounded hover:bg-black transition shadow-sm mt-1 md:mt-0"
          >
            Book
          </a>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------
// REUSABLE COMPONENT: QUICK VIEW MODAL
// -----------------------------------------
function VehicleDetailsModal({ vehicle, searchPickup, searchDropoff, onClose }: { vehicle: Vehicle, searchPickup: string, searchDropoff: string, onClose: () => void }) {
  const [imgIndex, setImgIndex] = useState(0);

  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  const finalPrice = calculateDiscountedPrice(vehicle.basePrice, vehicle.discount);

  let priceLabel = "Per 24 Hours";
  if (vehicle.pricingModel === "per_day") priceLabel = "Per Day";
  else if (vehicle.pricingModel === "flat_rate_km_limit") priceLabel = "Per 24h (KM Limit)";
  else if (vehicle.pricingModel === "per_hire") priceLabel = "Per Hire (Flat)";
  else if (vehicle.pricingModel === "per_hour") priceLabel = "Per Hour";

  const smartBookLink = `/book?car=${encodeURIComponent(vehicle.brand + " " + vehicle.model)}&price=${finalPrice}&pickup=${searchPickup}&dropoff=${searchDropoff}&city=${encodeURIComponent(vehicle.outletLocation)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-2xl overflow-hidden flex flex-col md:flex-row relative shadow-2xl">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black text-white w-10 h-10 rounded-full flex items-center justify-center transition backdrop-blur-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="w-full md:w-3/5 bg-gray-100 relative h-[40vh] md:h-auto flex-shrink-0">
          {vehicle.images && vehicle.images.length > 0 ? (
            <>
              <img src={vehicle.images[imgIndex]} alt={vehicle.model} className="w-full h-full object-contain md:object-cover bg-black" />
              {vehicle.images.length > 1 && (
                <>
                  <button onClick={() => setImgIndex(prev => prev === 0 ? vehicle.images.length - 1 : prev - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white text-black rounded-full flex items-center justify-center transition backdrop-blur-md shadow-lg">
                    &#10094;
                  </button>
                  <button onClick={() => setImgIndex(prev => (prev + 1) % vehicle.images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white text-black rounded-full flex items-center justify-center transition backdrop-blur-md shadow-lg">
                    &#10095;
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm tracking-widest">
                    {imgIndex + 1} / {vehicle.images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold tracking-widest">NO IMAGE AVAILABLE</div>
          )}
        </div>

        <div className="w-full md:w-2/5 p-6 md:p-10 flex flex-col overflow-y-auto">
          
          <div className="mb-6 border-b border-gray-100 pb-6 mt-4 md:mt-0">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-black text-[#003366] uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded">{vehicle.category || "Vehicle"}</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">📍 {vehicle.outletLocation}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-black leading-tight mt-3">{vehicle.brand} {vehicle.model}</h2>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pricing Rule</span>
              <span className="font-bold text-black text-sm">{priceLabel}</span>
            </div>
            {vehicle.driverProvision && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Service Provision</span>
                <span className="font-bold text-black text-sm">{vehicle.driverProvision}</span>
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-gray-200 pt-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Rental Price</span>
                {vehicle.discount && vehicle.discount.value > 0 && (
                  <span className="text-sm text-gray-400 line-through font-bold block mb-1">₹{vehicle.basePrice}</span>
                )}
                <span className="text-4xl font-black text-green-600 leading-none">₹{finalPrice}</span>
              </div>
            </div>

            <a 
              href={smartBookLink}
              className="w-full block text-center bg-[#0a0a0a] text-white font-black text-lg uppercase tracking-widest py-4 rounded-xl hover:bg-green-600 transition shadow-xl"
            >
              PROCEED TO BOOK
            </a>
          </div>

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