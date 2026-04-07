'use client';

export default function NDVIGuidePage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-24">
      {/* ── Hero Header ── */}
      <header className="bg-emerald-900 pt-24 pb-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1600" 
            className="w-full h-full object-cover" 
            alt="Satellite Forest View"
          />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400 mb-6 border border-emerald-500/30 px-4 py-1.5 rounded-full bg-emerald-950/50">
            Scientific Documentation
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Understanding <span className="text-emerald-400 italic font-serif">NDVI</span>
          </h1>
          <p className="text-emerald-100/70 text-lg max-w-2xl mx-auto leading-relaxed">
            Discover how we leverage multispectral satellite imagery to provide 
            unmatched transparency in carbon sequestration monitoring.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-16 relative z-20">
        
        {/* ── Definition Section with Tailwind-Native Formula ── */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">01</span>
            What is NDVI?
          </h2>
          <p className="text-slate-600 leading-relaxed mb-10">
            The **Normalized Difference Vegetation Index (NDVI)** is a standardized measurement used to quantify 
            vegetation health. By measuring the difference between near-infrared (which vegetation strongly reflects) 
            and red light (which vegetation absorbs), we can calculate the exact density of green leaves on a patch of land.
          </p>
          
          {/* Scientific Formula Box (Native HTML/CSS) */}
          <div className="bg-slate-900 rounded-3xl p-10 text-center border-b-8 border-emerald-500 shadow-2xl">
            <p className="text-emerald-400 font-mono text-xs mb-8 uppercase tracking-[0.2em] font-bold">Mathematical Definition</p>
            <div className="flex items-center justify-center text-white font-serif italic text-3xl md:text-4xl gap-6">
              <span className="font-sans font-normal not-italic tracking-tighter">NDVI =</span>
              <div className="flex flex-col items-center">
                <span className="px-6 border-b border-white/30 pb-2">NIR — RED</span>
                <span className="px-6 pt-2">NIR + RED</span>
              </div>
            </div>
            <p className="mt-8 text-slate-500 text-xs font-sans not-italic">Where NIR = Near-Infrared and RED = Visible Red light</p>
          </div>
        </div>

        {/* ── Scale Section ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 px-4">Vegetation Intensity Scale</h2>
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-slate-500">NDVI Range</th>
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-slate-500">Surface Type</th>
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-slate-500">Health Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {[
                  { range: '-0.1 to 0.0', type: 'Water / Bare Soil', color: 'bg-slate-200' },
                  { range: '0.0 to 0.2', type: 'Sparse / Stressed Vegetation', color: 'bg-emerald-100' },
                  { range: '0.2 to 0.4', type: 'Moderate Vegetation', color: 'bg-emerald-300' },
                  { range: '0.4 to 0.6', type: 'Healthy Vegetation', color: 'bg-emerald-500' },
                  { range: '0.6 to 0.8', type: 'Dense Forest / High Biomass', color: 'bg-emerald-700' },
                  { range: '0.8 to 1.0', type: 'Exceptional Vigor', color: 'bg-emerald-900' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 font-mono text-slate-500">{row.range}</td>
                    <td className="p-5 font-bold text-slate-800">{row.type}</td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-16 rounded-full ${row.color}`} />
                        <span className="text-[10px] font-bold text-slate-400">INDEX</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Credits Calculation ── */}
        <div className="bg-emerald-900 rounded-[2.5rem] p-10 md:p-12 mb-12 relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          <h3 className="text-2xl font-bold mb-6">Carbon Credit Calculation</h3>
          <p className="text-emerald-100/70 mb-8 leading-relaxed">
            Transparency is our core value. We calculate credits using a combination of area density and the mean NDVI value recorded over a 14-day cycle.
          </p>
          <div className="bg-emerald-950/50 rounded-2xl p-6 border border-emerald-500/30">
            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-2">Final Output Equation</p>
            <div className="text-lg md:text-xl font-mono text-emerald-50">
              Credits = Area(ha) × $\mu$NDVI × Sequestration_Rate
            </div>
          </div>
        </div>

        {/* ── Data Sources Grid ── */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Primary Satellites
            </h4>
            <div className="space-y-4">
              {[
                { name: 'Sentinel-2 (ESA)', res: '10m - 20m Resolution', icon: '🛰️' },
                { name: 'Landsat 8/9 (USGS)', res: '30m Multi-spectral', icon: '🌍' },
              ].map((sat, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div className="text-2xl">{sat.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{sat.name}</p>
                    <p className="text-xs text-slate-500">{sat.res}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Global Standards
            </h4>
            <div className="space-y-3">
              {['IPCC 2006 Guidelines', 'VCS Methodology', 'NASA MODIS Framework', 'Gold Standard Verified'].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-200" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}