'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const pendingPlantations = [
  {
    id: 201,
    treeType: 'Acacia Plot',
    farmer: 'Farmer 45',
    area: 4.2,
    latitude: 10.8505,
    longitude: 76.2711,
    ndvi: 0.46,
    credits: 16.2,
    status: 'pending',
  },
  {
    id: 202,
    treeType: 'Pine Section',
    farmer: 'Farmer 22',
    area: 3.1,
    latitude: 26.8467,
    longitude: 80.9462,
    ndvi: 0.39,
    credits: 11.2,
    status: 'pending',
  },
];

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plantations, setPlantations] = useState(pendingPlantations);
  const [statusMessage, setStatusMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userType = window.localStorage.getItem('userType');
    if (userType !== 'admin') {
      router.replace('/');
      return;
    }
    setIsAdmin(true);
    setReady(true);
  }, [router]);

  const updatePlantation = (id, newStatus) => {
    setPlantations((prev) => prev.map((plantation) => (plantation.id === id ? { ...plantation, status: newStatus } : plantation)));
    setStatusMessage({ type: 'success', text: `Plantation ${id} has been ${newStatus}.` });
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
    return <div className="message-box">Loading admin dashboard…</div>;
  }

  return (
    <section className="dashboard-section">
      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <div>
          <h1>⚙️ Admin Dashboard</h1>
          <p className="form-description">Review and verify pending plantations submitted by farmers.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/" className="secondary-button">Home</Link>
          <button type="button" onClick={handleLogout} className="secondary-button">Logout</button>
        </div>
      </div>

      <article className="info-card">
        <h2>Pending Plantations</h2>
        {plantations.length === 0 ? (
          <div className="message-box">No pending plantations at this time.</div>
        ) : (
          <div className="card-grid">
            {plantations.map((plantation) => (
              <article key={plantation.id} className="plantation-card">
                <h3>{plantation.treeType}</h3>
                <div className="plantation-info">
                  <div><strong>Farmer:</strong> {plantation.farmer}</div>
                  <div><strong>Location:</strong> {plantation.latitude.toFixed(4)}, {plantation.longitude.toFixed(4)}</div>
                  <div><strong>NDVI:</strong> {plantation.ndvi.toFixed(3)}</div>
                  <div><strong>Area:</strong> {plantation.area} ha</div>
                  <div><strong>Credits:</strong> {plantation.credits.toFixed(1)}</div>
                  <div><strong>Status:</strong> {plantation.status}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button type="button" className="primary-button" onClick={() => updatePlantation(plantation.id, 'verified')}>Verify</button>
                  <button type="button" className="secondary-button" onClick={() => updatePlantation(plantation.id, 'rejected')}>Reject</button>
                </div>
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
