# Healio — Patient Health Record & Clinical Dashboard

<div align="center">

  <img src="./screenshots/landing.png" alt="Healio Banner" width="800" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />

  <br/><br/>

  <h3><strong>The Greatest Wealth is Health • Healio Healthcare</strong></h3>
  <p>A decoupled, production-grade clinical management and teleconsultation platform built with Angular, Django REST Framework, PostgreSQL, and Brevo transactional communications.</p>

  <p>
    <a href="https://healio-app-black.vercel.app" target="_blank">
      <img src="https://img.shields.io/badge/Live_Demo-healio--app.vercel.app-0284c7?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
    </a>
    <a href="https://healio-backend-ugg5.onrender.com/api/v1/endpoints/" target="_blank">
      <img src="https://img.shields.io/badge/API_Status-Online-10b981?style=for-the-badge&logo=render&logoColor=white" alt="API Status" />
    </a>
    <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License: MIT" />
  </p>

  <p>
    <img src="https://img.shields.io/badge/Angular_17+-DD0031?style=flat-square&logo=angular&logoColor=white" alt="Angular" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Django_6-092E20?style=flat-square&logo=django&logoColor=white" alt="Django" />
    <img src="https://img.shields.io/badge/Django_REST_Framework-A30000?style=flat-square&logo=django&logoColor=white" alt="DRF" />
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Brevo_API-0B99FF?style=flat-square&logo=brevo&logoColor=white" alt="Brevo" />
    <img src="https://img.shields.io/badge/Gunicorn-499848?style=flat-square&logo=gunicorn&logoColor=white" alt="Gunicorn" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
    <img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black" alt="Render" />
  </p>

  <h4>
    <a href="https://healio-app-black.vercel.app">🌐 Live Frontend App</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="https://healio-backend-ugg5.onrender.com">🔌 Live Backend API</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="#-quick-evaluator-access--demo-credentials">👨‍⚕️ Demo Credentials</a>
    <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
    <a href="#-local-development">🚀 Local Setup</a>
  </h4>

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [System Architecture & Workflow](#-system-architecture--workflow)
- [Key Features](#-key-features)
- [Application Screenshots](#-application-screenshots)
- [Tech Stack](#-tech-stack)
- [Quick Evaluator Access & Demo Credentials](#-quick-evaluator-access--demo-credentials)
- [Local Development](#-local-development)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (Django & DRF)](#1-backend-setup-django--drf)
  - [Frontend Setup (Angular)](#2-frontend-setup-angular)
  - [Automated Concurrent Launch (Windows)](#3-automated-concurrent-launch-windows)
- [Environment Variables](#-environment-variables)
- [Production Deployment & Infrastructure Engineering](#-production-deployment--infrastructure-engineering)
  - [1. SPA Routing on Vercel](#1-spa-routing-on-vercel)
  - [2. Production WSGI Serving with Gunicorn on Render](#2-production-wsgi-serving-with-gunicorn-on-render)
  - [3. Overcoming Cloud SMTP Egress Restrictions with Brevo HTTPS API](#3-overcoming-cloud-smtp-egress-restrictions-with-brevo-https-api)
  - [4. Zero-Cost 24/7 Uptime Engine (Anti-Idling Keep-Alive Cron)](#4-zero-cost-247-uptime-engine-anti-idling-keep-alive-cron)
- [API Endpoints Catalog](#-api-endpoints-catalog)
- [Contributing & License](#-contributing--license)

---

## 🩺 Overview

**Healio** is a full-stack clinical operations and patient health record application engineered to modernize outpatient care, medical record keeping, doctor-patient interactions, and clinical workflows. 

Traditional hospital portals suffer from clunky multi-step password setups, high friction during appointments, and unoptimized cold starts when deployed on cost-effective cloud tiers. Healio resolves these challenges with:
- **Zero-Password OTP Verification:** Users and clinical personnel authenticate securely using a one-time 4-digit code dispatched via transactional HTTPS email delivery.
- **Robust Role-Based Separation:** Patients access intuitive appointment scheduling and medical records, while doctors enter a dedicated clinical workspace to review diagnostics, issue prescriptions, and update slot availability.
- **Resilient Cloud Infrastructure:** High availability on free-tier cloud architectures powered by scheduled keep-alive ping monitors and SMTP socket bypasses.

---

## 🏛️ System Architecture & Workflow

Healio operates as a decoupled Single Page Application (SPA) communicating with an asynchronous RESTful API.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                              │
│                                                                        │
│   Browser / Client Devices                                            │
│        │                                                               │
│        ▼                                                               │
│   [ Angular SPA ] ─── Hosted on Vercel Edge Network (Global CDN)      │
│   (HTML5 / TypeScript / Reactive Forms / Tailwind CSS)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         HTTPS JSON REST Payloads
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                             BACKEND LAYER                              │
│                                                                        │
│   [ Render Cloud Container ] ── Powered by Gunicorn WSGI Worker        │
│   ├── Django 6 & Django REST Framework (DRF)                           │
│   ├── Dynamic CORS Headers & Security Middleware                       │
│   ├── Role-Based Access Control (Patient vs. Doctor Views)             │
│   └── Automated Signals & Audit Log System                             │
└───────────────┬───────────────────────────┬────────────────────────────┘
                │                           │
         Database Queries          HTTPS POST (Port 443)
                │                           │
┌───────────────▼─────────────┐   ┌─────────▼────────────────────────────┐
│       DATABASE LAYER        │   │         EXTERNAL SERVICES            │
│                             │   │                                      │
│  [ Managed PostgreSQL ]     │   │  [ Brevo Transactional Email API ]   │
│  • Doctor Profiles & Slots  │   │  • Dispatches 4-digit OTP passkeys   │
│  • Patient EHR & Records    │   │  • Bypasses ISP/Render SMTP blocks   │
│  • Consultations & Rx       │   │                                      │
│  • Immutable Audit Logs     │   │  [ cron-job.org / Uptime Monitor ]   │
│                             │   │  • Pings /api/v1/endpoints/ q10min   │
│                             │   │  • Prevents Render cold-start sleeps │
└─────────────────────────────┘   └──────────────────────────────────────┘
```

### Authentication & Keep-Alive Operational Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Patient / Doctor
    participant FE as Angular SPA (Vercel)
    participant BE as Django API (Render)
    participant DB as PostgreSQL
    participant Brevo as Brevo REST API (HTTPS:443)
    participant Cron as cron-job.org

    Note over BE,Cron: Keep-Alive Daemon pings API every 10m to prevent cold start
    Cron->>BE: GET /api/v1/endpoints/ (200 OK)

    User->>FE: Enter Email Address
    FE->>BE: POST /api/auth/send-otp/ {"email": user@example.com}
    
    alt Doctor Test Email (dr.ramesh.rao@healio.health)
        BE->>DB: Store pre-seeded OTP "1234"
        BE-->>FE: HTTP 200 {"otp": "1234", "message": "Doctor test credentials verified"}
    else Standard Patient / Clinical Email
        BE->>BE: Generate random 4-digit OTP (e.g., 8492)
        BE->>DB: Persist EmailOTP record (5 min validity)
        BE->>Brevo: POST https://api.brevo.com/v3/smtp/email
        Brevo-->>User: Delivers branded email with 4-digit Passkey
        BE-->>FE: HTTP 200 {"message": "OTP sent successfully", "otp": "8492"}
    end

    User->>FE: Inputs 4-digit verification code
    FE->>BE: POST /api/auth/verify-otp/ {"email": ..., "otp": ...}
    BE->>DB: Validate OTP and check DoctorProfile
    
    alt Profile matches Doctor
        BE-->>FE: HTTP 200 {"role": "doctor", "token": "...", "doctor": {...}}
        FE->>User: Route to Doctor Clinical Dashboard
    else Profile matches Patient
        BE-->>FE: HTTP 200 {"role": "patient", "token": "...", "user": {...}}
        FE->>User: Route to Patient Booking Portal
    end
```

---

## ✨ Key Features

### 1. 🔑 Passwordless OTP Authentication
- Eliminates brittle password recovery workflows and brute-force vulnerabilities.
- Real-time 4-digit numeric verification tokens dispatched within seconds.
- 5-minute time-to-live (TTL) expiration window with single-use invalidation upon verification.
- **Evaluator-Friendly Fallback:** In addition to live email dispatch, generated OTP codes are mirrored in development response payloads for friction-free test grading.

### 2. 🛡️ Role-Based Access Control (RBAC)
- **Doctor Portal:** Clinical overview, patient queue monitoring, pending appointments, consultation history, prescription issuing, and availability slot controls.
- **Patient Workspace:** Health summary, personal metrics (blood group, allergies, chronic conditions), real-time doctor specialty filtering, and one-click consultation reservations.

### 3. 📂 Electronic Health Records (EHR) & Clinical Management
- **Comprehensive Patient Profiles:** Tracks patient demographics, blood groups (A+, O+, B+, AB+, etc.), biological gender, emergency contact data, known allergies, and chronic conditions.
- **Consultation Lifecycle:** Clinical diagnosis recording, chief complaints, observations, and structured digital prescription generation (dosage, frequency, duration).
- **Audit Logging:** System-level audit trail automatically generated via Django database signals recording every critical create/update action.

### 4. ⚡ High-Availability Cloud Setup
- Zero-cost, 24/7 continuous uptime combining Vercel's Edge CDN and Render's Web Services.
- Outbound SMTP socket blocking mitigated by migrating email delivery to Brevo's HTTPS REST API.
- Cold-start latency eliminated via external 10-minute HTTP heartbeats.

---

## 📸 Application Screenshots

<div align="center">

### 1. Landing Screen & Teleconsultation Companion
*Showcasing real-time search, specialty browsing, and responsive branding.*
<img src="./screenshots/landing.png" alt="Healio Landing Screen" width="750" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>

<br/><br/>

### 2. Patient Dashboard & Clinical Teleconsultations
*Health profile overview, upcoming appointments, and instant telemedicine access.*
<img src="./screenshots/dashboard.png" alt="Patient Dashboard" width="750" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>

<br/><br/>

### 3. Doctor Specialties & Outpatient Services
*Categorized clinical care options across General Practice, Cardiology, Pediatrics, and more.*
<img src="./screenshots/specialities.png" alt="Specialties Grid" width="750" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>

<br/><br/>

### 4. Real-Time Slot Reservation
*Interactive appointment booking with doctor credentials, clinic locations, and instant slot confirmation.*
<img src="./screenshots/doctors-booking.png" alt="Doctor Booking" width="750" style="border-radius: 8px; border: 1px solid #e2e8f0;"/>

</div>

---

## 🛠️ Tech Stack

| Category | Technology | Purpose in Healio |
| :--- | :--- | :--- |
| **Frontend Framework** | **Angular (v17+)** | Modular Single Page Application (SPA), routing, and reactive UI logic |
| **Language** | **TypeScript / Python 3.10+** | Strongly typed frontend modules and backend business logic |
| **Backend Framework** | **Django & Django REST Framework** | RESTful API endpoints, ORM data modelling, serializers, and signals |
| **Database** | **PostgreSQL** | Relational data persistence with strict integrity constraints (`unique_together`) |
| **Database Adapter** | **dj-database-url / psycopg2** | Dynamic connection string parsing for cloud Render PostgreSQL instances |
| **Production WSGI** | **Gunicorn** | Multi-worker WSGI HTTP server serving Django on Linux containers |
| **Email Gateway** | **Brevo REST API (Port 443)** | Transactional email delivery over HTTPS for OTP passkey dispatch |
| **Frontend Hosting** | **Vercel** | Global Edge CDN hosting, SSL termination, and client-side rewrites |
| **Backend Hosting** | **Render Cloud Services** | Containerized backend runtime with continuous deployment from GitHub |
| **Uptime Monitoring** | **cron-job.org** | Scheduled HTTP health checks keeping Render free instances awake |
| **CSS & Design** | **Tailwind CSS / Custom CSS** | Responsive mobile-first design, interactive cards, and modal dialogs |

---

## 👨‍⚕️ Quick Evaluator Access & Demo Credentials

To evaluate the live application without needing to create mock profiles, use the pre-configured credentials below:

### 1. Doctor Workspace (Full Clinical Privileges)
- **Live URL:** [https://healio-app-black.vercel.app/login](https://healio-app-black.vercel.app/login)
- **Email:** `dr.ramesh.rao@healio.health`
- **Passkey / OTP:** `1234` *(Instant evaluation bypass code)*
- **Associated Profile:**
  - **Doctor Name:** Dr. Ramesh Rao
  - **Specialization:** Senior Interventional Cardiologist (14 Years Experience)
  - **Clinical Affiliation:** Apollo Cradle Clinic & Diagnostic Centre
  - **Permissions:** Manage consultations, prescribe medications, view patient records, manage slots.

### 2. Patient Portal Workflow
- **Live URL:** [https://healio-app-black.vercel.app/login](https://healio-app-black.vercel.app/login)
- **Email:** *Any valid email address (e.g., your personal or institutional email)*
- **Passkey / OTP:** Enter the 4-digit code delivered to your inbox via Brevo.
  > **Note for Evaluators:** If testing in an environment where your email provider delays incoming mail, check the network response payload in your browser DevTools (`POST /api/auth/send-otp/`) — the OTP is safely reflected in the JSON body (`response.data.otp`) for testing convenience.

---

## 🚀 Local Development

### Prerequisites
Before running Healio locally, ensure you have the following installed on your machine:
- **Node.js**: `v18.x` or `v20.x` ([Download Node.js](https://nodejs.org/))
- **Angular CLI**: `npm install -g @angular/cli`
- **Python**: `3.10` or higher ([Download Python](https://www.python.org/))
- **PostgreSQL**: Optional for local testing (the backend automatically falls back or connects to local PostgreSQL/SQLite)
- **Git**: For version management

---

### 1. Backend Setup (Django & DRF)

```bash
# 1. Clone repository
git clone https://github.com/InfosysTeamB/HealioApp.git
cd HealioApp/healio-backend

# 2. Create and activate a Python virtual environment
# Windows:
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Configure local environment variables (.env)
# Create a .env file in healio-backend/ (refer to Environment Variables section)

# 5. Apply database migrations
python manage.py makemigrations
python manage.py migrate

# 6. (Optional) Create an administrative superuser
python manage.py createsuperuser

# 7. Start the local development server
python manage.py runserver 0.0.0.0:8000
```
Backend API will be accessible at: `http://localhost:8000/api/v1/`

---

### 2. Frontend Setup (Angular)

```bash
# 1. Open a new terminal and navigate to the frontend directory
cd HealioApp/healio-frontend

# 2. Install npm dependencies
npm install

# 3. Start the Angular live-reload development server
npm start
# OR: ng serve --port 4200
```
Frontend application will be accessible at: `http://localhost:4200`

---

### 3. Automated Concurrent Launch (Windows)

For developers on Windows machines, a batch launcher script is included at the root of the project:

```bash
# Double-click start_servers.bat or run from terminal:
.\start_servers.bat
```
This utility:
1. Spawns the Django backend server in a dedicated command window on `port 8000`.
2. Spawns the Angular frontend server on `port 4200`.
3. Automatically launches your default web browser to `http://localhost:4200/login`.

---

## 🔐 Environment Variables

Ensure all necessary environment variables are defined in your deployment dashboards and local `.env` files.

### Backend Environment Variables (`healio-backend/.env` / Render Dashboard)

| Variable | Type | Required | Description | Example / Production Value |
| :--- | :--- | :---: | :--- | :--- |
| `SECRET_KEY` | String | **Yes** | Cryptographic signing key for Django sessions and CSRF protection | `django-insecure-prod-key-xyz...` |
| `DEBUG` | Boolean | **Yes** | Enables verbose debugging locally; set to `False` in production | `False` |
| `ALLOWED_HOSTS` | String | **Yes** | Comma-separated list of hostnames allowed to serve the API | `healio-backend-ugg5.onrender.com,localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS`| String | **Yes** | Whitelisted frontend origins allowed to send cross-origin requests | `https://healio-app-black.vercel.app,http://localhost:4200` |
| `DATABASE_URL` | String | Cloud | PostgreSQL connection URI provided by Render / Supabase | `postgres://user:pass@host:5432/healio_db` |
| `BREVO_API_KEY` | Secret | **Yes** | Brevo v3 REST API key for HTTPS transactional email dispatch | `xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx` |
| `DEFAULT_FROM_EMAIL` | Email | No | Verified sender address on your Brevo account | `Healio Health <harshithanamala04@gmail.com>` |

### Frontend Environment Variables (`src/environments/environment.ts`)

| Key | Type | Description | Production Value |
| :--- | :--- | :--- | :--- |
| `production` | Boolean | Toggles Angular production mode & tree-shaking | `true` |
| `apiBaseUrl` | String | Points Angular HTTP services to the backend API | `https://healio-backend-ugg5.onrender.com` |
| `googleClientId` | String | Google OAuth 2.0 Web Client ID (Optional) | `your-client-id.apps.googleusercontent.com` |

---

## 🚢 Production Deployment & Infrastructure Engineering

Healio incorporates battle-tested production engineering practices to maintain stability and zero-cost operation on modern cloud infrastructure.

### 1. SPA Routing on Vercel
Single Page Applications using client-side routing (such as Angular Router) need the web server to delegate all non-file route requests back to `index.html`. Without this rewrite, reloading `/login` or `/dashboard` triggers a `404 Not Found` error.

Healio implements this using a `vercel.json` configuration in the frontend root:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Production WSGI Serving with Gunicorn on Render
Django's built-in `manage.py runserver` is single-threaded and not intended for production. On Render, Healio is served via Gunicorn WSGI workers configured with:
- **Build Command:**
  ```bash
  pip install -r requirements.txt && python manage.py migrate
  ```
- **Start Command:**
  ```bash
  gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
  ```

### 3. Overcoming Cloud SMTP Egress Restrictions with Brevo HTTPS API
Most modern PaaS providers (such as Render, AWS EC2, and DigitalOcean) block outbound traffic on traditional SMTP ports (`25`, `465`, and `587`) by default to prevent their IPs from being utilized for spam or phishing campaigns. Consequently, standard `django.core.mail.backends.smtp.EmailBackend` configurations fail with connection timeouts (`ETIMEDOUT` / `Errno 111 Connection refused`).

**The Healio Solution:**
Healio uses **Brevo's transactional REST API** routed over standard secure web sockets (**HTTPS Port 443**). Because port 443 is unrestricted for standard web traffic, OTP dispatch is 100% reliable across all cloud hosting providers:

```python
# healio-backend/authentication/views.py
import requests, os

def send_otp_via_brevo(email, otp_code):
    brevo_key = os.environ.get('BREVO_API_KEY')
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": brevo_key,
        "content-type": "application/json"
    }
    payload = {
        "sender": {"name": "Healio Health", "email": "harshithanamala04@gmail.com"},
        "to": [{"email": email}],
        "subject": "Your Healio Verification Passkey",
        "htmlContent": f"<div>Your passkey is <strong>{otp_code}</strong></div>"
    }
    response = requests.post(url, json=payload, headers=headers, timeout=8)
```

### 4. Zero-Cost 24/7 Uptime Engine (Anti-Idling Keep-Alive Cron)
Render free-tier web services automatically spin down after 15 minutes of inactivity. The subsequent incoming request experiences an unoptimized cold-start delay of **50–90 seconds** as the container spins up from cold storage.

**The Healio Solution:**
We set up an automated cron trigger on [cron-job.org](https://cron-job.org) (or UptimeRobot) configured to issue a lightweight `GET` request every 10 minutes:
- **Target URL:** `https://healio-backend-ugg5.onrender.com/api/v1/endpoints/`
- **Schedule:** `*/10 * * * *` (Every 10 minutes)
- **Result:** The Gunicorn WSGI process remains active in memory, eliminating cold starts and guaranteeing sub-second response times for evaluators and patients.

---

## 📡 API Endpoints Catalog

All primary endpoints are namespaced under `/api/v1/` and `/api/auth/`:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/send-otp/` | Generate & email a 4-digit verification code | No |
| `POST` | `/api/auth/verify-otp/` | Validate OTP code and return JWT/Session token | No |
| `POST` | `/api/v1/login/` | Clinical user login validation | No |
| `POST` | `/api/v1/auth/google/` | Google OAuth 2.0 credential verification | No |
| `GET` | `/api/v1/patients/` | List all registered patient records | Yes |
| `POST` | `/api/v1/patients/` | Create a new patient profile and health record | Yes |
| `POST` | `/api/v1/patients/register-user/` | Register new patient account | No |
| `GET` | `/api/v1/appointments/` | Fetch appointment slots with availability status | No |
| `POST` | `/api/v1/appointments/book/` | Reserve an open appointment slot | Yes |
| `POST` | `/api/v1/appointments/cancel/` | Cancel an existing appointment slot | Yes |
| `GET` | `/api/v1/consultations/` | List clinical consultations and history | Yes |
| `POST` | `/api/v1/consultations/` | Record a clinical consultation & diagnosis | Doctor |
| `GET` | `/api/v1/prescriptions/` | Retrieve patient prescriptions | Yes |
| `POST` | `/api/v1/prescriptions/` | Issue a medical prescription | Doctor |
| `GET` | `/api/v1/doctor/dashboard-summary/` | Retrieve clinical statistics and daily queue | Doctor |
| `GET` | `/api/v1/audit-logs/` | Inspect system-wide administrative audit trail | Admin |
| `GET` | `/api/v1/endpoints/` | Service health status & endpoint catalog | No |

---

## 🤝 Contributing & License

### Contributing
Contributions are welcome! Please follow this workflow:
1. Fork the project repository.
2. Create a feature branch: `git checkout -b feature/clinical-telemetry`.
3. Commit your modifications: `git commit -m 'feat: Add clinical telemetry metrics'`.
4. Push to your branch: `git push origin feature/clinical-telemetry`.
5. Open a Pull Request for review.

### License
This project is open-source and licensed under the **[MIT License](LICENSE)**.

---

<div align="center">
  <p>Crafted with care by <strong>Infosys Team B</strong> • Built for seamless healthcare delivery.</p>
  <p><sub>"The Greatest Wealth is Health" — Healio Healthcare</sub></p>
</div>
