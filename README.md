
# 🌱 Carbon Credit Marketplace
### A Satellite-Verified Ecosystem for Sustainable Carbon Offsetting

[Click Here](https://carboncredit-frontend.onrender.com/)


The **Carbon Credit Marketplace** is a full-stack platform designed to connect sustainable farmers with eco-conscious businesses. By leveraging **NDVI (Normalized Difference Vegetation Index)** analysis from satellite data, the platform ensures that carbon credits are backed by verifiable vegetation health, preventing greenwashing and promoting transparency.

---

## 🌟 Key Features

* **👨‍🌾 Farmer Empowerment:** Register plantations, upload ground-truth imagery, and track carbon credit earnings.
* **🏢 Corporate Offsetting:** A transparent marketplace for businesses to browse verified projects and purchase credits.
* **🛰️ Satellite Verification:** Integrated NDVI calculation using Sentinel-2 data to quantify biomass health.
* **🛡️ Admin Governance:** A dedicated dashboard for manual review and verification of all plantation claims.
* **🗺️ Geospatial Visualization:** Interactive Leaflet.js maps displaying plantation locations and health overlays.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Flask (Python), SQLAlchemy ORM, Flask-Mail |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| **Database** | PostgreSQL (Production) / SQLite (Development) |
| **Mapping** | Leaflet.js |
| **Cloud Storage** | Cloudinary API (Images) |
| **Analysis** | NumPy & Rasterio (Satellite Data Processing) |

---

## 🛰️ Satellite Logic & NDVI

The core of this project is the scientific verification of carbon sequestration. The system calculates the health of a plantation using the formula:

$$NDVI = \frac{NIR - Red}{NIR + Red}$$

* **NIR (Near-Infrared):** Reflectance from healthy leaf structures.
* **Red:** Absorption by chlorophyll.

**Credit Calculation:**
> $Credits = Area (ha) \times NDVI \times 100$

This ensures that only healthy, active vegetation generates financial value in the marketplace.

---

## 🚀 Installation & Setup

### 1. Clone the Project
```bash
git clone [https://github.com/your-username/carbon-credit-marketplace.git](https://github.com/your-username/carbon-credit-marketplace.git)
cd carbon-credit-marketplace

```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` folder:

```env
DATABASE_URL=your_postgresql_url
CLOUDINARY_URL=your_cloudinary_url
SECRET_KEY=your_random_secret_string

```

### 3. Run the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py

```

### 4. Run the Frontend

```bash
cd ../frontend
python -m http.server 8000

```

Visit `http://localhost:8000` in your browser.

---

## 📂 Project Structure

```text
carbon-credit-marketplace/
├── backend/
│   ├── app.py              # Main API & Logic
│   ├── models.py           # DB Schema (Farmer, Business, Plantation)
│   ├── utils.py            # NDVI Processing & Math
│   └── cloud_storage.py    # Cloudinary Integration
├── frontend/
│   ├── index.html          # Portal Entry
│   ├── farmer.js           # Farmer Workflow
│   ├── business.js         # Marketplace Workflow
│   └── admin.js            # Verification Logic
└── README.md

```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

---


