"use client";

import React from "react";

export default function PrivacyPolicy() {
  const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#003366] selection:text-white">
      
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-16 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
        
        {/* HEADER */}
        <div className="border-b border-gray-100 pb-8 mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-[#003366] tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Effective Date: {currentDate}
          </p>
        </div>

        {/* CONTENT */}
        <div className="space-y-8 text-gray-700 text-sm md:text-base leading-relaxed">
          
          <section>
            <p>
              Welcome to <strong>CarXone</strong>. We respect your privacy and are committed to protecting your personal data. This Privacy Policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">1. The Data We Collect About You</h2>
            <p className="mb-2">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data:</strong> includes email address and telephone/WhatsApp numbers.</li>
              <li><strong>Financial Data:</strong> includes UPI IDs and payment receipt screenshots required for booking verification.</li>
              <li><strong>Transaction Data:</strong> includes details about payments to and from you and other details of vehicles you have rented from us.</li>
              <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">2. How Is Your Personal Data Collected?</h2>
            <p>We use different methods to collect data from and about you including through:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Direct interactions:</strong> You may give us your Identity, Contact and Financial Data by filling in forms or by corresponding with us by post, phone, email or otherwise. This includes personal data you provide when you create an account, book a vehicle, apply to be a vendor, or give us feedback.</li>
              <li><strong>Automated technologies:</strong> As you interact with our website, we will automatically collect Technical Data about your equipment, browsing actions and patterns. We collect this personal data by using cookies and other similar technologies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">3. How We Use Your Personal Data</h2>
            <p className="mb-2">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To register you as a new customer or vendor.</li>
              <li>To process and deliver your booking, including managing payments, fees, and charges.</li>
              <li>To facilitate communication between Customers and Vendors via automated WhatsApp alerts.</li>
              <li>To manage our relationship with you, including asking you to leave a review or notifying you about changes to our terms or privacy policy.</li>
              <li>To administer and protect our business and this website (including troubleshooting, data analysis, testing, system maintenance, support, reporting and hosting of data).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">4. Disclosures of Your Personal Data</h2>
            <p>
              Because CarXone operates as a marketplace, <strong>we must share certain information with our Vendor Partners</strong> to fulfill your rental request. When you book a vehicle, the respective vendor will receive your Name, Contact Number, Pickup Location, and Payment Screenshot. We require all third parties to respect the security of your personal data and to treat it in accordance with the law. We do not allow our third-party service providers to use your personal data for their own purposes and only permit them to process your personal data for specified purposes and in accordance with our instructions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">5. Data Security</h2>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">6. Data Retention</h2>
            <p>
              We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements. We may retain your personal data for a longer period in the event of a complaint or if we reasonably believe there is a prospect of litigation in respect to our relationship with you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-black mb-3">7. Your Legal Rights</h2>
            <p>
              Under certain circumstances, you have rights under data protection laws in relation to your personal data. You have the right to request access to your personal data, request correction of your personal data, request erasure of your personal data, or object to processing of your personal data. If you wish to exercise any of these rights, please contact us.
            </p>
          </section>

          <section className="bg-blue-50 p-6 rounded-xl border border-blue-100 mt-8">
            <h2 className="text-lg font-black text-[#003366] mb-2">Contact Us</h2>
            <p className="text-sm font-medium text-blue-900">
              If you have any questions about this Privacy Policy or our privacy practices, please contact us at: <br/><br/>
              <strong>Email:</strong> privacy@carxone.com <br/>
              <strong>Address:</strong> Dimapur, Nagaland, India
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}