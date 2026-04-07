'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Using specific Unsplash IDs to ensure they don't repeat
const featureImages = [
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800", // Plantation
  "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&q=80&w=800", // Forest
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=800", // Valley
];

const steps = [
  { num: '01', title: 'Register', desc: 'Create your account as a farmer, business, or admin.' },
  { num: '02', title: 'Add plantations', desc: 'Farmers submit plantation data with location and tree details.' },
  { num: '03', title: 'Get verified', desc: 'Admin verifies using NDVI satellite analysis.' },
  { num: '04', title: 'Trade credits', desc: 'Businesses purchase verified carbon credits instantly.' },
];

export default function HomePage() {
  const [stats, setStats] = useState({ activePlantations: 1240, totalCreditsTraded: 45200, verifiedFarmers: 890 });

  return (
    <div className="relative min-h-screen bg-[#FDFDFD]">
      {/* ── Background Decorative Elements ── */}
      <div className="absolute top-0 left-0 w-full h-[1000px] bg-gradient-to-b from-emerald-50/50 to-transparent -z-10" />
      <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] bg-emerald-200/20 rounded-full blur-[120px] -z-10" />
      
      <main className="max-w-6xl mx-auto px-6 pb-24 font-sans">
        
        {/* ── Hero Section ── */}
        <section className="pt-20 lg:pt-32 grid lg:grid-cols-2 gap-12 items-center">
          <div className="z-10">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] bg-white border border-emerald-100 text-emerald-700 px-4 py-2 rounded-full mb-8 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Verified by Satellite NDVI
            </div>
            <h1 className="text-6xl lg:text-7xl font-bold leading-[1.1] text-slate-900 tracking-tight mb-6">
              Green Assets, <br />
              <span className="text-emerald-600">Digital Trust.</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-md mb-10">
              The premium marketplace for satellite-verified carbon credits. We connect reforestation with corporate responsibility.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="bg-emerald-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-xl shadow-emerald-900/20 active:scale-95">
                Get Started
              </Link>
              <button className="bg-white border border-slate-200 text-slate-700 px-10 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all">
                View Map
              </button>
            </div>
          </div>
          
          {/* Main Hero Image Fix */}
          <div className="relative w-full h-[450px] lg:h-[550px] z-20">
            <div className="absolute inset-0 bg-emerald-900/10 rounded-[3rem] -rotate-3 translate-x-4 translate-y-4" />
            <img 
              src="https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1200&auto=format&fit=crop" 
              alt="Aerial Forest View"
              className="relative w-full h-full object-cover rounded-[3rem] shadow-2xl border-4 border-white"
            />
          </div>
        </section>

        {/* ── Stats Section ── */}
        <section className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { val: stats.activePlantations, label: 'Verified Hectares', color: 'text-emerald-600' },
            { val: stats.totalCreditsTraded, label: 'Carbon Credits Traded', color: 'text-slate-900' },
            { val: stats.verifiedFarmers, label: 'Partner Farmers', color: 'text-emerald-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <p className={`text-4xl font-bold ${s.color} mb-2 tracking-tight`}>{s.val.toLocaleString()}+</p>
              <p className="text-slate-500 font-medium uppercase text-xs tracking-widest">{s.label}</p>
            </div>
          ))}
        </section>

        {/* ── Features with Unique Images ── */}
        <section className="mt-40">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Transparent by Design</h2>
            <div className="h-1 w-20 bg-emerald-500 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { title: 'Satellite Verification', img: featureImages[0], desc: 'We use multispectral imagery to track biomass growth in real-time.' },
              { title: 'Farmer Empowerment', img: featureImages[1], desc: 'Direct payments to farmers ensuring 90% of credit value hits the ground.' },
              { title: 'Immutable Ledger', img: featureImages[2], desc: 'Every credit is serialized and tracked from creation to retirement.' },
            ].map((item, idx) => (
              <div key={idx} className="group">
                <div className="overflow-hidden rounded-3xl mb-6 shadow-lg">
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="mt-40 bg-slate-900 rounded-[4rem] p-12 lg:p-20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-8 leading-tight">Start your journey <br /> to Net Zero.</h2>
              <p className="text-slate-400 text-lg mb-10">Our streamlined process makes it easy for both landowners and enterprises to participate in the carbon market.</p>
              <Link href="/register" className="inline-block bg-emerald-500 text-emerald-950 px-8 py-4 rounded-xl font-bold hover:bg-emerald-400 transition-all">
                Create Free Account
              </Link>
            </div>
            
            <div className="space-y-8">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-6 items-start group">
                  <span className="text-2xl font-black text-emerald-500/30 group-hover:text-emerald-500 transition-colors">
                    {step.num}
                  </span>
                  <div>
                    <h4 className="text-xl font-bold mb-2">{step.title}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}