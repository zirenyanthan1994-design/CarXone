"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "../firebase/config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

// The exact blueprint of our live Firebase Truck data
interface Truck {
  id: string;
  brand: string;
  model: string;
  basePrice: number;
  outletLocation: string;
  vendorId: string;
  images: string[];
  type?: string; 
  category?: string; // Defined to prevent TypeScript errors
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
}

// 1. THE MAIN CATALOG COMPONENT
function TrucksCatalog() {
  // --- READ THE URL MEMORY ---
  const searchParams = useSearchParams();
  const searchedCity = searchParams?.get("city");
  const pickupDate = searchParams?.get("pickup");
  const returnDate = searchParams?.get("return");

  // --- FIREBASE STATES ---
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH LIVE TRUCKS FROM DATABASE ---
  useEffect(() => {
    const fetchLiveTrucks = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "vehicles"),
          where("category", "==", "Truck"),
          where("status", "==", "Available")
        );
        
        const querySnapshot = await getDocs(q);
        const liveTrucks: Truck[] = [];
        querySnapshot.forEach((doc) => {
          liveTrucks.push({ id: doc.id, ...doc.data() } as Truck);
        });
        
        setTrucks(liveTrucks);
      } catch (error) {
        console.error("Error fetching live trucks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveTrucks();
  }, []);

  // --- DISCOUNT CALCULATOR ---
  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  // --- THE SMART FILTER ---
  const filteredTrucks = searchedCity 
    ? trucks.filter(truck => truck.outletLocation.toLowerCase() === searchedCity.toLowerCase())
    : trucks;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col min-h-[60vh]">
      
      {/* Dynamic Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-[#003366] uppercase mb-2">
          {searchedCity ? `Available Trucks in ${searchedCity}` : "All Commercial Trucks"}
        </h1>
        {pickupDate && returnDate && (
          <p className="text-gray-500 font-medium">
            Showing results for your trip from {pickupDate} to {returnDate}.
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
           <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
           <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading live fleet...</p>
        </div>
      ) : filteredTrucks.length === 0 ? (
        <div className="bg-gray-100 p-8 text-center rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-xl font-bold text-gray-800 mb-2">No trucks found!</h3>
          <p className="text-gray-500">Sorry, we currently do not have any vendors stationed in {searchedCity || "this area"}.</p>
          <a href="/" className="mt-4 inline-block text-[#003366] font-bold hover:underline">Change Search Location</a>
        </div>
      ) : (
        /* Grid of Filtered Trucks */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTrucks.map((truck) => {
            const finalPrice = calculateDiscountedPrice(truck.basePrice, truck.discount);

            return (
              <div key={truck.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition flex flex-col">
                
                {/* IMAGE CONTAINER WITH DISCOUNT BADGE */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  {truck.images && truck.images[0] ? (
                    <img src={truck.images[0]} alt={truck.model} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">NO IMAGE</div>
                  )}
                  
                  {truck.discount && truck.discount.value > 0 && (
                    <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-black px-3 py-1.5 uppercase tracking-widest rounded shadow-md">
                      {truck.discount.type === 'percentage' ? `${truck.discount.value}% OFF` : `₹${truck.discount.value} OFF`}
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-black">{truck.brand} {truck.model}</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase">By {truck.vendorId || "Verified Vendor"}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-xl font-black text-[#003366]">₹{finalPrice}</span>
                      {truck.discount && truck.discount.value > 0 && (
                        <span className="text-[10px] text-gray-400 line-through font-bold">₹{truck.basePrice}</span>
                      )}
                      <span className="text-xs text-gray-500 block">/ day</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 font-medium my-4">
                    <span className="flex items-center gap-1">📍 {truck.outletLocation}</span>
                    <span className="flex items-center gap-1">📦 {truck.category}</span>
                  </div>

                  {/* The Magic Booking Link -> Points safely to your /book page! */}
                  <Link 
                    href={`/book?car=${truck.brand} ${truck.model}&price=${finalPrice}&city=${truck.outletLocation}&pickup=${pickupDate || ""}&dropoff=${returnDate || ""}`}
                    className="mt-auto block w-full text-center bg-[#003366] text-white py-3 rounded font-bold hover:bg-black transition shadow-sm"
                  >
                    Book This Truck
                  </Link>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 2. NEXT.JS REQUIREMENT: Wrap the URL reader in a Suspense boundary
export default function TrucksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
      </div>
    }>
      <TrucksCatalog />
    </Suspense>
  );
}