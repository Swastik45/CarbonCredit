'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import ForestWorld from '@/components/ForestWorld';

export default function HomePage() {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const scene = document.querySelector<HTMLElement>('.forest-only-landing');
    if (!scene) return;

    let frame = 0;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let currentX = 0;
    let currentY = 0;
    let scrollPosition = window.scrollY;
    let targetScroll = scrollPosition;
    let maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);

    const movePointer = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth;
      pointerY = event.clientY / window.innerHeight;
    };

    const updateScroll = () => {
      targetScroll = window.scrollY;
      const progress = targetScroll / maxScroll;
      if (progress < 0.25) setActiveStep(1);
      else if (progress < 0.5) setActiveStep(2);
      else if (progress < 0.75) setActiveStep(3);
      else setActiveStep(4);
    };

    const updateSceneBounds = () => {
      maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    };

    let lastFrameTime = 0;
    const animateScene = (time: number) => {
      if (time - lastFrameTime < 35) {
        frame = requestAnimationFrame(animateScene);
        return;
      }
      lastFrameTime = time;

      scrollPosition += (targetScroll - scrollPosition) * 0.1;
      const scrollDepth = scrollPosition / maxScroll;

      const targetX = (pointerX - 0.5) * 12;
      const targetY = (pointerY - 0.5) * 8 - scrollDepth * 10;

      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      scene.style.setProperty('--forest-x', `${currentX.toFixed(2)}px`);
      scene.style.setProperty('--forest-y', `${currentY.toFixed(2)}px`);
      scene.style.setProperty('--forest-depth', `${scrollDepth.toFixed(3)}`);

      frame = requestAnimationFrame(animateScene);
    };

    window.addEventListener('pointermove', movePointer, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateSceneBounds, { passive: true });
    frame = requestAnimationFrame(animateScene);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', movePointer);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateSceneBounds);
    };
  }, []);

  return (
    <main 
      className="site-shell forest-only-landing relative overflow-x-hidden text-white font-sans selection:bg-neutral-800 selection:text-white" 
      aria-label="Carbon Ledger Field Guide"
    >
      {/* Background 3D World fully un-muted */}
      <ForestWorld />

      {/* Header with completely transparent navbar background */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-16 py-8 border-b border-white/10 bg-transparent">
        <Link href="/" className="flex items-center gap-3 text-white group" aria-label="Carbon Ledger home">
          <span className="w-2 h-2 bg-white rounded-full" />
          <span className="text-sm font-semibold tracking-wider uppercase">
            Carbon Ledger
          </span>
        </Link>

        <div className="flex items-center gap-8">
          <span className="hidden md:inline-block font-mono text-xs text-neutral-300 uppercase tracking-widest">
            [ 0{activeStep} / 04 ]
          </span>
          <Link 
            href="/login" 
            className="font-mono text-xs tracking-wider text-neutral-200 hover:text-white transition-colors flex items-center gap-1 py-1.5 px-3 border border-white/30 hover:border-white bg-transparent"
          >
            <span>Sign In</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>

      {/* Left progress indicator */}
      <div className="fixed left-8 md:left-16 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-4 pointer-events-none" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center gap-3">
            <span className={`font-mono text-xs transition-colors duration-300 ${activeStep === step ? 'text-white font-bold' : 'text-neutral-400'}`}>
              0{step}
            </span>
            <div className={`h-[1px] transition-all duration-300 ${activeStep === step ? 'w-6 bg-white' : 'w-2 bg-neutral-500'}`} />
          </div>
        ))}
      </div>

      {/* Hero */}
      <section className="relative z-20 min-h-screen flex flex-col justify-center items-start px-8 md:px-24 lg:px-36 max-w-5xl">
        <p className="font-mono text-xs text-neutral-300 uppercase tracking-widest mb-6 drop-shadow-md">
          // Interactive Field Guide
        </p>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-none mb-6 drop-shadow-lg">
          Enter the <br />
          <span className="text-neutral-300">living ledger.</span>
        </h1>

        <p className="text-base md:text-lg text-neutral-200 max-w-md font-normal leading-relaxed mb-12 drop-shadow">
          Walk through the forest. Read the signals. Build a verifiable climate record.
        </p>

        <div className="flex items-center gap-3 font-mono text-xs text-neutral-300 uppercase tracking-widest drop-shadow">
          <ArrowDown size={14} className="animate-bounce text-white" />
          <span>Scroll to begin</span>
        </div>
      </section>

      {/* Chapter 01 */}
      <section className="relative z-20 min-h-screen flex items-center px-8 md:px-24 lg:px-36 max-w-6xl mx-auto py-32">
        <div className="max-w-xl border-l border-white/30 pl-8 bg-transparent p-6">
          <span className="font-mono text-xs text-neutral-300 uppercase tracking-widest block mb-3">
            01 / Ground Layer
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow">
            Your land holds an immutable story.
          </h2>
          <p className="text-neutral-200 text-sm md:text-base leading-relaxed font-normal drop-shadow">
            Register plots, boundaries, and historical records into a transparent trail designed for audits and permanence.
          </p>
        </div>
      </section>

      {/* Chapter 02 */}
      <section className="relative z-20 min-h-screen flex items-center justify-end px-8 md:px-24 lg:px-36 max-w-6xl mx-auto py-32 text-right">
        <div className="max-w-xl border-r border-white/30 pr-8 bg-transparent p-6">
          <span className="font-mono text-xs text-neutral-300 uppercase tracking-widest block mb-3">
            02 / Living Signals
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow">
            Growth leaves concrete proof.
          </h2>
          <p className="text-neutral-200 text-sm md:text-base leading-relaxed font-normal drop-shadow">
            Satellite health metrics sync with ground records to turn ecological change into clear verification data.
          </p>
        </div>
      </section>

      {/* Chapter 03 */}
      <section className="relative z-20 min-h-screen flex items-center px-8 md:px-24 lg:px-36 max-w-6xl mx-auto py-32">
        <div className="max-w-xl border-l border-white/30 pl-8 bg-transparent p-6">
          <span className="font-mono text-xs text-neutral-300 uppercase tracking-widest block mb-3">
            03 / Clear Trail
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow">
            Value moves openly.
          </h2>
          <p className="text-neutral-200 text-sm md:text-base leading-relaxed font-normal drop-shadow">
            Verified credits connect local stewards with institutional buyers without losing the trail behind them.
          </p>
        </div>
      </section>

      {/* Chapter 04 / Destination */}
      <section className="relative z-20 min-h-screen flex flex-col justify-center items-center text-center px-8 py-32 max-w-2xl mx-auto">
        <span className="font-mono text-xs text-neutral-300 uppercase tracking-widest mb-4 drop-shadow">
          04 / Destination
        </span>
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight drop-shadow-lg">
          The clearing <br />
          <span className="text-neutral-300">is yours.</span>
        </h2>
        <p className="text-neutral-200 text-sm md:text-base max-w-sm mb-10 leading-relaxed font-normal drop-shadow">
          Start by onboarding your first parcel into the open exchange.
        </p>
        <Link 
          href="/signup" 
          className="group inline-flex items-center gap-3 px-6 py-3.5 bg-white hover:bg-neutral-200 text-black font-mono text-xs uppercase tracking-wider transition-colors shadow-lg"
        >
          <span>Claim your plot</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </section>
    </main>
  );
}