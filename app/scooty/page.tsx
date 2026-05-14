"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "../firebase/config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

// The exact blueprint of our live Firebase Scooty data (Now with blockedDates!)
interface Scooty {
  id: string;
  brand: string;
  model: string;
  basePrice: number;
  outletLocation: string;
  vendorId: string;
  images: string[];
  type?: string; 
  category?: string; 
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
  blockedDates?: { start: string; end: string }[]; // NEW: Added to prevent double bookings
}

// 1. THE MAIN CATALOG COMPONENT
function ScootyContent() {
  // --- READ THE URL MEMORY ---
  const searchParams = useSearchParams();
  const searchCity = searchParams?.get("city") || "";
  const searchPickup = searchParams?.get("pickup") || "";
  const searchDropoff = searchParams?.get("dropoff") || searchParams?.get("return") || "";

  // --- FIREBASE STATES ---
  const [scootys, setScootys] = useState<Scooty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH LIVE SCOOTYS FROM DATABASE ---
  useEffect(() => {
    const fetchLiveScootys = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "vehicles"),
          where("category", "==", "Scooty"),
          where("status", "==", "Available")
        );
        
        const querySnapshot = await getDocs(q);
        let liveScootys: Scooty[] = [];
        querySnapshot.forEach((doc) => {
          liveScootys.push({ id: doc.id, ...doc.data() } as Scooty);
        });

        // --- FILTER 1: BY CITY ---
        if (searchCity && searchCity !== "") {
          liveScootys = liveScootys.filter(scooty => scooty.outletLocation.toLowerCase() === searchCity.toLowerCase());
        }

        // --- FILTER 2: PREVENT DOUBLE BOOKING (BLOCKED DATES) ---
        if (searchPickup && searchDropoff) {
          const sStart = new Date(searchPickup).getTime();
          const sEnd = new Date(searchDropoff).getTime();

          liveScootys = liveScootys.filter(scooty => {
            // Safe to show if there are no blocked dates
            if (!scooty.blockedDates || scooty.blockedDates.length === 0) return true;

            // Check if customer dates overlap with vendor blocked dates
            const hasOverlap = scooty.blockedDates.some(block => {
              const bStart = new Date(block.start).getTime();
              const bEnd = new Date(block.end).getTime();
              return sStart <= bEnd && sEnd >= bStart;
            });

            // Keep only if NO overlap
            return !hasOverlap;
          });
        }
        
        setScootys(liveScootys);
      } catch (error) {
        console.error("Error fetching live scootys:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveScootys();
  }, [searchCity, searchPickup, searchDropoff]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col min-h-[60vh]">
      
      {/* Dynamic Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-[#003366] uppercase mb-2">
          {searchCity ? `Available Scootys in ${searchCity}` : "All Premium Scootys"}
        </h1>
        {searchPickup && searchDropoff && (
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg inline-flex items-center gap-4 text-xs font-bold text-[#003366] mt-2">
            <span>📅 Search Active</span>
            <a href="/scooty" className="text-red-500 hover:text-red-700 border-l border-blue-200 pl-4 transition">Clear Filters &times;</a>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
           <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
           <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading live fleet...</p>
        </div>
      ) : scootys.length === 0 ? (
        <div className="bg-gray-100 p-8 text-center rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-xl font-bold text-gray-800 mb-2">No scootys found!</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Sorry, we currently do not have any scootys available for those dates in {searchCity || "this area"}. Try changing your dates or location!
          </p>
          <a href="/scooty" className="mt-4 inline-block text-white bg-[#003366] px-6 py-3 rounded font-bold hover:bg-black transition shadow-sm">
            View All Scootys
          </a>
        </div>
      ) : (
        /* Grid of Filtered Scootys */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {scootys.map((scooty) => (
            <ScootyCard 
              key={scooty.id} 
              scooty={scooty} 
              searchPickup={searchPickup} 
              searchDropoff={searchDropoff} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------
// REUSABLE COMPONENT: INDIVIDUAL SCOOTY CARD (WITH IMAGE SLIDER)
// -----------------------------------------
function ScootyCard({ scooty, searchPickup, searchDropoff }: { scooty: Scooty, searchPickup: string, searchDropoff: string }) {
  // State for the Image Slider
  const [imgIndex, setImgIndex] = useState(0);

  // --- DISCOUNT CALCULATOR ---
  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  const finalPrice = calculateDiscountedPrice(scooty.basePrice, scooty.discount);

  // --- IMAGE SLIDER CONTROLS ---
  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (scooty.images && scooty.images.length > 0) {
      setImgIndex((prev) => (prev + 1) % scooty.images.length);
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    if (scooty.images && scooty.images.length > 0) {
      setImgIndex((prev) => (prev === 0 ? scooty.images.length - 1 : prev - 1));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition flex flex-col group">
      
      {/* IMAGE CONTAINER WITH SLIDER & DISCOUNT BADGE */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {scooty.images && scooty.images.length > 0 ? (
          <>
            <img 
              src={scooty.images[imgIndex]} 
              alt={`${scooty.model} - Image ${imgIndex + 1}`} 
              className="w-full h-full object-cover transition-all duration-300" 
            />
            
            {/* Show Arrows Only if there is more than 1 image */}
            {scooty.images.length > 1 && (
              <>
                <button 
                  onClick={prevImg} 
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                >
                  &#10094;
                </button>
                <button 
                  onClick={nextImg} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                >
                  &#10095;
                </button>
                {/* Image Counter Badge */}
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                  {imgIndex + 1} / {scooty.images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">NO IMAGE</div>
        )}
        
        {scooty.discount && scooty.discount.value > 0 && (
          <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-black px-3 py-1.5 uppercase tracking-widest rounded shadow-md z-10">
            {scooty.discount.type === 'percentage' ? `${scooty.discount.value}% OFF` : `₹${scooty.discount.value} OFF`}
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-black">{scooty.brand} {scooty.model}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase">By {scooty.vendorId || "Verified Vendor"}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-xl font-black text-[#003366]">₹{finalPrice}</span>
            {scooty.discount && scooty.discount.value > 0 && (
              <span className="text-[10px] text-gray-400 line-through font-bold">₹{scooty.basePrice}</span>
            )}
            <span className="text-xs text-gray-500 block">/ day</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium my-4">
          <span className="flex items-center gap-1">📍 {scooty.outletLocation}</span>
          <span className="flex items-center gap-1">🛵 {scooty.category}</span>
        </div>

        {/* The Magic Booking Link -> Passes exact search parameters straight to the checkout! */}
        <Link 
          href={`/book?car=${encodeURIComponent(scooty.brand + " " + scooty.model)}&price=${finalPrice}&city=${encodeURIComponent(scooty.outletLocation)}&pickup=${searchPickup}&dropoff=${searchDropoff}`}
          className="mt-auto block w-full text-center bg-[#003366] text-white py-3 rounded font-bold hover:bg-black transition shadow-sm"
        >
          Book This Scooty
        </Link>

      </div>
    </div>
  );
}

// 2. NEXT.JS REQUIREMENT: Wrap the URL reader in a Suspense boundary
export default function ScootyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
      </div>
    }>
      <ScootyContent />
    </Suspense>
  );
}