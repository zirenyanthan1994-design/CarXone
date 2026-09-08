"use client";

import { useState } from "react";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHiddenPage = pathname?.startsWith("/partners") || pathname?.startsWith("/admin");

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-black min-h-screen flex flex-col antialiased selection:bg-green-600 selection:text-white`}>
        
        {/* ========================================= */}
        {/* PREMIUM GLOBAL HEADER (GLASSMORPHISM) */}
        {/* ========================================= */}
        {!isHiddenPage && (
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
              
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Image 
                    src="/logo.png" 
                    alt="CarXone Logo" 
                    width={160} 
                    height={80} 
                    className="h-16 md:h-20 w-auto object-contain cursor-pointer hover:opacity-70 transition duration-300" 
                  />
                </Link>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center justify-center p-2 text-black hover:text-green-600 transition duration-300 cursor-pointer"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* PREMIUM DROPDOWN MENU (TOGGLED BY STATE) */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-full pt-4 w-64 block z-50 transition-opacity duration-300 animate-in fade-in zoom-in-95">
                    <div className="bg-white border border-gray-100 shadow-2xl rounded-xl flex flex-col text-left overflow-hidden">
                      
                      <div className="px-6 py-3 bg-gray-50/50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fleet Categories</span>
                      </div>
                      <Link href="/cars" onClick={() => setIsMenuOpen(false)} className="px-6 py-3 text-sm font-bold text-black hover:bg-green-50 hover:text-green-700 transition border-b border-gray-50">Cars</Link>
                      <Link href="/bikes" onClick={() => setIsMenuOpen(false)} className="px-6 py-3 text-sm font-bold text-black hover:bg-green-50 hover:text-green-700 transition border-b border-gray-50">Two Wheelers</Link>
                      <Link href="/trucks" onClick={() => setIsMenuOpen(false)} className="px-6 py-3 text-sm font-bold text-black hover:bg-green-50 hover:text-green-700 transition border-b border-gray-100">Trucks</Link>

                      <div className="px-6 py-3 bg-gray-50/50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account</span>
                      </div>
                      <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="px-6 py-3 text-sm font-bold text-black hover:bg-green-50 hover:text-green-700 transition">My Profile</Link>
                      
                      <div className="p-4 bg-gray-50 border-t border-gray-100">
                        <button className="w-full text-white bg-[#0a0a0a] px-4 py-2.5 rounded-lg font-bold hover:bg-green-600 transition shadow-md">
                          Log Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </header>
        )}

        {/* MAIN PAGE CONTENT GOES HERE */}
        <div className="grow flex flex-col w-full">
          {children}
        </div>

        {/* ========================================= */}
        {/* PREMIUM GLOBAL FOOTER */}
        {/* ========================================= */}
        {!isHiddenPage && (
          <footer className="bg-[#0a0a0a] text-white pt-20 pb-10 border-t-4 border-green-600 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-16 border-b border-gray-800 pb-16">
              
              <div className="text-left max-w-sm">
                <Link href="/">
                  <span className="text-4xl font-black tracking-widest text-white block mb-6 hover:opacity-80 transition duration-300">CarXone</span>
                </Link>
                <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8">
                  Together with our trusted partners we are here to fulfil your needs. Drive the cars, two wheelers and trucks of your choice.
                </p>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-green-600 hover:border-green-600 cursor-pointer transition duration-300">
                    <span className="text-xs font-bold">IG</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-green-600 hover:border-green-600 cursor-pointer transition duration-300">
                    <span className="text-xs font-bold">FB</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-20">
                <div className="flex flex-col gap-5">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Company</span>
                  <Link href="#" className="text-sm font-semibold text-gray-300 hover:text-green-500 transition">About Us</Link>
                  <Link href="#" className="text-sm font-semibold text-gray-300 hover:text-green-500 transition">Contact Support</Link>
                  <Link href="/partners/signup" className="text-sm font-semibold text-gray-300 hover:text-green-500 transition">Partner Network</Link>
                </div>
                <div className="flex flex-col gap-5">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Legal</span>
                  <Link href="/terms" className="text-sm font-semibold text-gray-300 hover:text-green-500 transition">Terms & Conditions</Link>
                  <Link href="/privacy" className="text-sm font-semibold text-gray-300 hover:text-green-500 transition">Privacy Policy</Link>
                  <Link href="#" className="text-sm font-semibold text-gray-300 hover:text-green-500 transition">Refund Rules</Link>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-10 flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                  &copy; {new Date().getFullYear()} CarXone. All rights reserved.
                </div>
                <div className="text-gray-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                   Made for <span className="text-white">You</span>
                </div>
            </div>
          </footer>
        )}

      </body>
    </html>
  );
}