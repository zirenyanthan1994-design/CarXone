"use client";

import React from "react";

export default function TermsAndConditions() {
  const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#003366] selection:text-white">
      
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-16 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
        
        {/* HEADER */}
        <div className="border-b border-gray-100 pb-8 mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-[#003366] tracking-tight mb-4">
            Terms & Conditions
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Last Updated: {currentDate}
          </p>
        </div>

        {/* CONTENT */}
        <div className="space-y-8 text-gray-700 text-sm md:text-base leading-relaxed">
          
          <section>
            <p>
              Welcome to <strong>CarXone</strong>. These Terms & Conditions govern your use of our website and the vehicle rental marketplace services we provide. By accessing or using CarXone, whether as a Customer or a Vendor Partner, you agree to be bound by these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">1. Our Role as a Marketplace</h2>
            <p>
              CarXone operates as an online marketplace connecting customers seeking to rent vehicles with independent vendor partners ("Vendors") who list their vehicles for rent. <strong>CarXone does not own, operate, or maintain any of the vehicles listed on the platform.</strong> The actual rental contract is directly between the Customer and the respective Vendor. 
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">2. Customer Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Valid Licensing:</strong> You must possess a valid, unexpired driver’s license appropriate for the vehicle category you are renting.</li>
              <li><strong>Vehicle Care:</strong> You agree to return the vehicle to the Vendor in the same condition it was received. Any damages, traffic violations, or toll fines incurred during the rental period are strictly your financial responsibility.</li>
              <li><strong>Vendor Rules:</strong> You agree to abide by the specific rental conditions set by the Vendor (e.g., fuel policies, KM limits), which are presented to you during the checkout process.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">3. Vendor Partner Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Vehicle Safety & Legality:</strong> Vendors must ensure that all listed vehicles are legally registered, commercially insured, and physically safe for operation.</li>
              <li><strong>Booking Fulfillment:</strong> Vendors are expected to honor all confirmed bookings. Unjustified cancellations may result in account suspension or removal from the platform.</li>
              <li><strong>Direct Payments:</strong> Vendors collect rental payments directly from customers via UPI. Vendors are responsible for paying any agreed-upon commission to the CarXone platform in a timely manner.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">4. Payments, Fees & Cancellations</h2>
            <p className="mb-2">
              <strong>Platform Fees:</strong> CarXone may charge a platform fee during the booking process. This fee covers marketplace maintenance and is non-refundable.
            </p>
            <p className="mb-2">
              <strong>Rental Payments:</strong> Rental payments are processed directly to the Vendor’s UPI ID. Verification of payment is at the sole discretion of the Vendor.
            </p>
            <p>
              <strong>Cancellations:</strong> Customers may request cancellations via their dashboard. Refunds are subject to the specific Vendor's cancellation policy. CarXone does not hold rental funds and cannot independently issue refunds for direct Vendor payments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, CarXone shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from your use of the platform, your rental of a vehicle, any accidents, injuries, or vehicle breakdowns. We simply facilitate the connection; all physical risks are assumed by the renting Customer and the providing Vendor.
            </p>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-8">
            <h2 className="text-lg font-black text-black mb-2">Contact Us</h2>
            <p className="text-sm font-medium text-gray-600">
              If you have any questions regarding these terms, please reach out to our legal team at: <br/><br/>
              <strong>Email:</strong> legal@carxone.com <br/>
              <strong>Address:</strong> Dimapur, Nagaland, India
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}