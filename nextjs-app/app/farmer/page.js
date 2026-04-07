'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const initialPlantations = [
  {
    id: 1,
    treeType: 'Mango Grove',
    area: 2.6,
    latitude: 12.9716,
    longitude: 77.5946,
    ndvi: 0.68,
    credits: 18.2,
    verificationStatus: 'verified',
    image: null,
  },
  {
    id: 2,
    treeType: 'Teak Plantation',
    area: 3.3,
    latitude: 13.0827,
    longitude: 80.2707,
    ndvi: 0.57,
    credits: 14.6,
    verificationStatus: 'pending',
    image: null,
  },
];

export default function FarmerPage() {
  const [ready, setReady] = useState(false);
  const [isFarmer, setIsFarmer] = useState(false);
  const [plantations, setPlantations] = useState(initialPlantations);
  const [formData, setFormData] = useState({ latitude: '', longitude: '', treeType: '', area: '', ndvi: '' });
  const [statusMessage, setStatusMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userType = window.localStorage.getItem('user_type');
    if (userType !== 'farmer') {
      router.replace('/');
      return;
    }
    setIsFarmer(true);
    setReady(true);
  }, [router]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPlantation = (event) => {
    event.preventDefault();
    const nextPlantation = {
      id: plantations.length + 1,
      treeType: formData.treeType || 'New Plantation',
      area: Number(formData.area) || 0,
      latitude: Number(formData.latitude) || 0,
      longitude: Number(formData.longitude) || 0,
      ndvi: Number(formData.ndvi) || 0,
      credits: Number(((Number(formData.area) || 1) * (Number(formData.ndvi) || 0.5) * 2).toFixed(1)),
      verificationStatus: 'pending',
      image: null,
    };

    setPlantations((prev) => [nextPlantation, ...prev]);
    setFormData({ latitude: '', longitude: '', treeType: '', area: '', ndvi: '' });
    setStatusMessage({ type: 'success', text: 'Plantation added successfully. It will be reviewed by admin.' });
  };

  const handleLogout = () => {
    window.localStorage.removeItem('user_type');
    window.localStorage.removeItem('user_id');
    router.push('/');
  };

  if (!ready) {
    return <div className="message-box">Loading farmer dashboard…</div>;
  }

  return (
    <section className="dashboard-section">
      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <div>
          <h1>👨‍🌾 Farmer Dashboard</h1>
          <p className="form-description">Add plantation details and track verification status from the admin.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/" className="secondary-button">Home</Link>
          <button type="button" onClick={handleLogout} className="secondary-button">Logout</button>
        </div>
      </div>

      <article className="info-card">
        <h2>Submit a New Plantation</h2>
        <form className="auth-form" onSubmit={handleAddPlantation}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="latitude">Latitude</label>
              <input id="latitude" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="12.9716" />
            </div>
            <div className="form-group">
              <label htmlFor="longitude">Longitude</label>
              <input id="longitude" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="77.5946" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="treeType">Tree Type</label>
              <input id="treeType" name="treeType" value={formData.treeType} onChange={handleChange} placeholder="Tree type" />
            </div>
            <div className="form-group">
              <label htmlFor="area">Area (ha)</label>
              <input id="area" name="area" type="number" step="0.01" value={formData.area} onChange={handleChange} placeholder="0.00" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ndvi">NDVI Value</label>
            <input id="ndvi" name="ndvi" type="number" step="0.001" value={formData.ndvi} onChange={handleChange} placeholder="0.00" />
            <small>Enter the NDVI value or leave blank to estimate automatically.</small>
          </div>

          <button type="submit" className="primary-button">Add Plantation</button>
        </form>
        {statusMessage && (
          <div className={`message-box ${statusMessage.type === 'success' ? 'message-success' : 'message-error'}`}>
            {statusMessage.text}
          </div>
        )}
      </article>

      <section className="card-grid">
        {plantations.map((plantation) => (
          <article key={plantation.id} className="plantation-card">
            <h3>{plantation.treeType}</h3>
            <div className="plantation-info">
              <div><strong>Area:</strong> {plantation.area} ha</div>
              <div><strong>NDVI:</strong> {plantation.ndvi.toFixed(3)}</div>
              <div><strong>Credits:</strong> {plantation.credits.toFixed(1)}</div>
              <div><strong>Location:</strong> {plantation.latitude.toFixed(4)}, {plantation.longitude.toFixed(4)}</div>
            </div>
            <p style={{ marginTop: '1rem' }}><strong>Status:</strong> {plantation.verificationStatus}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
