'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const samplePlantations = [
  {
    id: 101,
    treeType: 'Eucalyptus Plot',
    location: '11.0168, 76.9558',
    ndvi: 0.61,
    credits: 12.8,
    pricePerCredit: 6.5,
    status: 'verified',
  },
  {
    id: 102,
    treeType: 'Rubber Plantation',
    location: '9.9312, 76.2673',
    ndvi: 0.54,
    credits: 9.4,
    pricePerCredit: 6.9,
    status: 'verified',
  },
];

const purchaseHistory = [
  { id: 1, plantation: 'Mango Grove', credits: 14.2, date: '2026-03-21' },
  { id: 2, plantation: 'Teak Plantation', credits: 8.0, date: '2026-02-09' },
];

export default function BusinessPage() {
  const [ready, setReady] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [available, setAvailable] = useState(samplePlantations);
  const [history, setHistory] = useState(purchaseHistory);
  const [statusMessage, setStatusMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userType = window.localStorage.getItem('userType');
    if (userType !== 'business') {
      router.replace('/');
      return;
    }
    setIsBusiness(true);
    setReady(true);
  }, [router]);

  const handlePurchase = (plantation) => {
    const entry = {
      id: history.length + 1,
      plantation: plantation.treeType,
      credits: plantation.credits,
      date: new Date().toISOString().slice(0, 10),
    };
    setHistory((prev) => [entry, ...prev]);
    setStatusMessage({ type: 'success', text: `Purchased ${plantation.credits.toFixed(1)} credits from ${plantation.treeType}.` });
  };

  const handleLogout = () => {
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('userType');
    window.localStorage.removeItem('userId');
    window.localStorage.removeItem('user_type');
    window.localStorage.removeItem('user_id');
    window.localStorage.removeItem('username');
    router.push('/');
  };

  if (!ready) {
    return <div className="message-box">Loading business dashboard…</div>;
  }

  return (
    <section className="dashboard-section">
      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <div>
          <h1>🏢 Business Dashboard</h1>
          <p className="form-description">Purchase carbon credits from verified plantations and track your offsets.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/" className="secondary-button">Home</Link>
          <button type="button" onClick={handleLogout} className="secondary-button">Logout</button>
        </div>
      </div>

      <article className="info-card">
        <h2>Available Plantations</h2>
        <div className="card-grid">
          {available.map((item) => (
            <article key={item.id} className="plantation-card">
              <h3>{item.treeType}</h3>
              <div className="plantation-info">
                <div><strong>Location:</strong> {item.location}</div>
                <div><strong>NDVI:</strong> {item.ndvi.toFixed(3)}</div>
                <div><strong>Credits:</strong> {item.credits.toFixed(1)}</div>
                <div><strong>Price:</strong> ${item.pricePerCredit.toFixed(2)} / credit</div>
              </div>
              <button type="button" className="primary-button" onClick={() => handlePurchase(item)}>
                Buy Credits
              </button>
            </article>
          ))}
        </div>
      </article>

      <article className="info-card">
        <h2>Purchase History</h2>
        {history.length === 0 ? (
          <div className="message-box">No purchases yet. Start offsetting your carbon footprint today.</div>
        ) : (
          <div className="card-grid">
            {history.map((item) => (
              <article key={item.id} className="feature-card">
                <h3>{item.plantation}</h3>
                <p><strong>Credits:</strong> {item.credits.toFixed(1)}</p>
                <p><strong>Date:</strong> {item.date}</p>
              </article>
            ))}
          </div>
        )}
      </article>

      {statusMessage && (
        <div className={`message-box ${statusMessage.type === 'success' ? 'message-success' : 'message-error'}`}>
          {statusMessage.text}
        </div>
      )}
    </section>
  );
}
