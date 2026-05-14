"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase/config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  basePrice: number;
  outletLocation: string;
  images: string[];
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
  blockedDates?: { start: string; end: string }[]; // Added to read vendor blocks
}

function CarsContent() {
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Catch the data sent from the Homepage search bar
  const searchCity = searchParams.get("city") || "";
  const searchPickup = searchParams.get("pickup") || "";
  const searchDropoff = searchParams.get("dropoff") || "";

  // --- FETCH LIVE CARS FROM FIREBASE ---
  useEffect(() => {
    const fetchLiveCars = async () => {
      setIsLoading(true);
      try {
        // Query: Only get Category "Car" AND Status "Available"
        const q = query(
          collection(db, "vehicles"), 
          where("category", "==", "Car"),
          where("status", "==", "Available")
        );
        
        const querySnapshot = await getDocs(q);
        let liveCars: Vehicle[] = [];
        querySnapshot.forEach((doc) => {
          liveCars.push({ id: doc.id, ...doc.data() } as Vehicle);
        });

        // --- FILTER 1: BY CITY ---
        if (searchCity && searchCity !== "") {
          liveCars = liveCars.filter(car => car.outletLocation === searchCity);
        }

        // --- FILTER 2: PREVENT DOUBLE BOOKING (BLOCKED DATES) ---
        if (searchPickup && searchDropoff) {
          const sStart = new Date(searchPickup).getTime();
          const sEnd = new Date(searchDropoff).getTime();

          liveCars = liveCars.filter(car => {
            // If the car has no blocked dates, it is safe to show!
            if (!car.blockedDates || car.blockedDates.length === 0) return true;

            // Check if the customer's search overlaps with ANY blocked date
            const hasOverlap = car.blockedDates.some(block => {
              const bStart = new Date(block.start).getTime();
              const bEnd = new Date(block.end).getTime();
              // Math formula for time overlap:
              return sStart <= bEnd && sEnd >= bStart;
            });

            // Only keep the car if there is NO overlap
            return !hasOverlap;
          });
        }
        
        setVehicles(liveCars);
      } catch (error) {
        console.error("Error fetching live cars:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveCars();
  }, [searchCity, searchPickup, searchDropoff]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      
      {/* --- HERO SECTION --- */}
      <section className="bg-[#0a0a0a] text-white py-20 px-6 border-b-4 border-green-600">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <span className="text-green-500 font-black text-xs uppercase tracking-[0.3em] mb-4">Premium Fleet</span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">
            Rent the Perfect Car.
          </h1>
          <p className="text-gray-400 font-medium max-w-2xl text-sm md:text-base leading-relaxed mb-6">
            Browse our curated selection of verified, well-maintained cars. Available instantly across Nagaland. No hidden fees.
          </p>
          
          {/* Show the user their active search filters */}
          {(searchCity || searchPickup) && (
            <div className="bg-white/10 border border-white/20 px-6 py-3 rounded-full flex flex-wrap justify-center items-center gap-4 text-xs font-bold uppercase tracking-widest text-green-400">
              {searchCity && <span>📍 {searchCity}</span>}
              {searchPickup && <span>📅 Search Active</span>}
              <a href="/cars" className="text-white hover:text-red-400 ml-2 border-l border-white/20 pl-4 transition">Clear Filters &times;</a>
            </div>
          )}
        </div>
      </section>

      {/* --- LIVE CATALOG SECTION --- */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-16">
        
        <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-10">
          <h2 className="text-2xl font-black text-black">Available Cars ({vehicles.length})</h2>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sort by: Lowest Price</div>
        </div>

        {isLoading ? (
          <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
             <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
             <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading live fleet...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="w-full py-20 bg-white rounded-xl border border-gray-200 text-center flex flex-col items-center shadow-sm">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <h3 className="text-xl font-black text-black">No cars match your exact search</h3>
            <p className="text-sm text-gray-500 mt-2 mb-6">The cars in this city might be booked for your selected dates. Try changing your dates or location!</p>
            <a href="/cars" className="bg-[#0a0a0a] text-white text-xs font-black uppercase tracking-widest px-8 py-4 rounded hover:bg-green-600 transition shadow-md">
              View All Cars
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.map((vehicle) => (
              <CarCard 
                key={vehicle.id} 
                vehicle={vehicle} 
                searchPickup={searchPickup} 
                searchDropoff={searchDropoff} 
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

// -----------------------------------------
// REUSABLE COMPONENT: INDIVIDUAL CAR CARD (WITH IMAGE SLIDER)
// -----------------------------------------
function CarCard({ vehicle, searchPickup, searchDropoff }: { vehicle: Vehicle, searchPickup: string, searchDropoff: string }) {
  // State to track which image is currently showing
  const [imgIndex, setImgIndex] = useState(0);

  // --- DISCOUNT CALCULATOR ---
  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  const finalPrice = calculateDiscountedPrice(vehicle.basePrice, vehicle.discount);

  // --- IMAGE SLIDER CONTROLS ---
  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevents the button from triggering the page scroll
    if (vehicle.images && vehicle.images.length > 0) {
      setImgIndex((prev) => (prev + 1) % vehicle.images.length);
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    if (vehicle.images && vehicle.images.length > 0) {
      setImgIndex((prev) => (prev === 0 ? vehicle.images.length - 1 : prev - 1));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition duration-300 group flex flex-col">
      
      {/* IMAGE CONTAINER WITH CAROUSEL */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {vehicle.images && vehicle.images.length > 0 ? (
          <>
            <img 
              src={vehicle.images[imgIndex]} 
              alt={`${vehicle.model} - Image ${imgIndex + 1}`} 
              className="w-full h-full object-cover transition-all duration-300" 
            />
            
            {/* Show Arrows Only if there is more than 1 image */}
            {vehicle.images.length > 1 && (
              <>
                {/* Left Arrow */}
                <button 
                  onClick={prevImg} 
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                >
                  &#10094;
                </button>
                {/* Right Arrow */}
                <button 
                  onClick={nextImg} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                >
                  &#10095;
                </button>
                {/* Image Counter Badge */}
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                  {imgIndex + 1} / {vehicle.images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">NO IMAGE</div>
        )}
        
        {/* Discount Badge */}
        {vehicle.discount && vehicle.discount.value > 0 && (
          <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-black px-3 py-1.5 uppercase tracking-widest rounded shadow-md z-10">
            {vehicle.discount.type === 'percentage' ? `${vehicle.discount.value}% OFF` : `₹${vehicle.discount.value} OFF`}
          </div>
        )}
      </div>

      {/* CAR DETAILS */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{vehicle.brand}</span>
            <h3 className="text-xl font-black text-black leading-tight mt-1">{vehicle.model}</h3>
          </div>
          <div className="bg-gray-100 px-2.5 py-1 rounded text-[10px] font-black text-gray-600 uppercase tracking-wider">
            {vehicle.outletLocation}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-100 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Starting At</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-green-600">₹{finalPrice}</span>
              <span className="text-xs font-bold text-gray-500 mb-1">/ day</span>
            </div>
            {vehicle.discount && vehicle.discount.value > 0 && (
              <span className="text-xs text-gray-400 line-through font-bold mt-1">₹{vehicle.basePrice}</span>
            )}
          </div>
          
          {/* --- THE UPGRADED BRIDGE TO THE BOOKING PAGE --- */}
          {/* This securely passes the car, price, city, AND the active search dates directly to checkout! */}
          <a 
            href={`/book?car=${encodeURIComponent(vehicle.brand + " " + vehicle.model)}&price=${finalPrice}&city=${encodeURIComponent(vehicle.outletLocation)}&pickup=${searchPickup}&dropoff=${searchDropoff}`}
            className="bg-[#0a0a0a] text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded hover:bg-green-600 transition shadow-md"
          >
            Book Now
          </a>
        </div>
      </div>

    </div>
  );
}

// Wrapping the main component in Suspense handles the useSearchParams hook perfectly for Vercel
export default function CarsCatalog() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-green-600">Loading Fleet...</div>}>
      <CarsContent />
    </Suspense>
  );
}