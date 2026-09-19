'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import ForestWorld from '@/components/ForestWorld';

export default function HomePage() {
  useEffect(() => {
    const tokens = document.querySelectorAll<HTMLElement>('.forest-token');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('token-found');
        });
      },
      { threshold: 0.55 },
    );

    tokens.forEach((token) => observer.observe(token));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scene = document.querySelector<HTMLElement>('.forest-only-landing');
    if (!scene) return;

    let frame = 0;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let scrollPosition = window.scrollY;
    let targetScroll = scrollPosition;
    let lastTime = performance.now();
    let lastFrameTime = 0;
    let maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);

    const movePointer = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth;
      pointerY = event.clientY / window.innerHeight;
    };

    const updateScroll = () => {
      targetScroll = window.scrollY;
    };

    const updateSceneBounds = () => {
      maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    };

    const animateScene = (time: number) => {
      if (time - lastFrameTime < 33) {
        frame = requestAnimationFrame(animateScene);
        return;
      }

      lastFrameTime = time;
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      scrollPosition += (targetScroll - scrollPosition) * Math.min(delta * 8, 1);
      const drift = time * 0.00022;
      const scrollDepth = scrollPosition / maxScroll;
      const x = Math.sin(drift) * 1.8 + (pointerX - 0.5) * 2.8;
      const y = Math.cos(drift * 0.8) * 1.2 + (pointerY - 0.5) * 1.8 - scrollDepth * 2.8;
      scene.style.setProperty('--forest-x', `${x}%`);
      scene.style.setProperty('--forest-y', `${y}%`);
      scene.style.setProperty('--forest-depth', `${scrollDepth.toFixed(3)}`);
      scene.style.setProperty('--forest-effects-scale', (1 + scrollDepth * 0.025).toFixed(3));
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
    <main className="site-shell forest-only-landing forest-3d-active" aria-label="Carbon Credit forest journey">
      <ForestWorld />
      <div className="forest-effects" aria-hidden="true">
        <span className="light-shaft light-shaft-one" />
        <span className="light-shaft light-shaft-two" />
        <span className="mist mist-one" />
        <span className="mist mist-two" />
        <span className="depth-shadow depth-shadow-left" />
        <span className="depth-shadow depth-shadow-right" />
        <span className="firefly firefly-one" />
        <span className="firefly firefly-two" />
        <span className="firefly firefly-three" />
        <span className="firefly firefly-four" />
      </div>

      <div className="journey-hud">
        <header className="landing-nav">
          <Link href="/" className="landing-brand" aria-label="Carbon Credit home">
            <span className="brand-dot" />
            <span>Carbon Credit</span>
          </Link>

          <nav className="landing-links" aria-label="Main navigation">
            <Link href="/login" className="nav-login">Sign in <ArrowUpRight size={15} /></Link>
          </nav>
        </header>
        <div className="journey-progress"><span /> <b>01</b> / 04</div>
      </div>

      <div className="forest-route" aria-hidden="true" />

      <section className="forest-opening">
        <p className="landing-kicker"><span /> An interactive field guide</p>
        <h1>Enter the<br /><em>living ledger.</em></h1>
        <p>Walk through the forest. Find the signals. Build something that lasts.</p>
        <span className="opening-prompt"><ArrowDown size={16} /> Scroll to begin</span>
      </section>

      <section className="forest-token token-one" aria-label="Land token">
        <span className="token-orbit" />
        <span className="token-number">01</span>
        <div className="token-copy">
          <span className="token-label">Found: the ground layer</span>
          <h2>Your land has a story.</h2>
          <p>Register plots, ownership, and planting history in one trusted trail.</p>
        </div>
      </section>

      <section className="forest-token token-two" aria-label="Verification token">
        <span className="token-orbit" />
        <span className="token-number">02</span>
        <div className="token-copy">
          <span className="token-label">Found: a living signal</span>
          <h2>Growth leaves evidence.</h2>
          <p>Satellite health and field records turn change on the ground into proof you can follow.</p>
        </div>
      </section>

      <section className="forest-token token-three" aria-label="Exchange token">
        <span className="token-orbit" />
        <span className="token-number">03</span>
        <div className="token-copy">
          <span className="token-label">Found: the clear trail</span>
          <h2>Value can move openly.</h2>
          <p>Verified credits connect farmers, owners, and institutions without losing the path behind them.</p>
        </div>
      </section>

      <section className="forest-destination" aria-label="Recommended starting place">
        <span className="destination-mark">04</span>
        <p className="landing-kicker"><span /> Recommended first place</p>
        <h2>The clearing<br /><em>is yours.</em></h2>
        <p>Start by bringing your first plot into the exchange.</p>
        <Link href="/signup" className="lets-go">Let&apos;s go <ArrowRight size={18} /></Link>
      </section>
    </main>
  );
}
