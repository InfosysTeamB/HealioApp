
# Healio - Modern Healthcare & Teleconsultation Platform

Healio is a full-stack digital healthcare management and teleconsultation platform built to bridge the gap between patients and medical professionals[cite: 9]. It streamlines appointment scheduling, clinic visits, video consultations, and clinical workflows with real-time OTP authentication[cite: 9, 10, 12].

---

## 🌐 Live Application

- **Frontend App:** [https://healio-app-black.vercel.app](https://healio-app-black.vercel.app)
- **Backend API:** [https://healio-backend-ugg5.onrender.com](https://healio-backend-ugg5.onrender.com)

---

## 📸 Application Preview

<div align="center">
  <h3>Landing & Teleconsultation Companion</h3>
  <img src="./screenshots/landing.png" alt="Healio Landing Screen" width="700"/>
  <br/><br/>
  
  <h3>Patient Dashboard & Consultations</h3>
  <img src="./screenshots/dashboard.png" alt="Healio Patient Dashboard" width="700"/>
  <br/><br/>

  <h3>Doctor Specialities & Services</h3>
  <img src="./screenshots/specialities.png" alt="Specialties Grid" width="700"/>
  <br/><br/>

  <h3>Zero Waiting-Time Clinic Bookings</h3>
  <img src="./screenshots/doctors-booking.png" alt="Doctor Slot Booking" width="700"/>
</div>

---

## 👨‍⚕️ Default Doctor Credentials

For testing and grading the Doctor Clinical Workspace, authenticate using the pre-seeded clinical profile:

| Parameter | Value |
| :--- | :--- |
| **Doctor Name** | Dr. Ramesh Rao[cite: 10, 12] |
| **Email** | `dr.ramesh.rao@healio.health` |
| **Phone** | `+91 98450 12345` |
| **Specialization** | Cardiologist (14 yrs exp)[cite: 10, 12] |
| **Affiliation** | Apollo Cradle[cite: 12] |
| **Role** | Doctor / Workspace Admin |

> **OTP Verification:** Enter the doctor email above during login. Passkeys are routed via the transactional Resend HTTP API. During demo testing, the generated OTP is also returned safely in the response payload.

---

## ✨ Key Features

- **Passwordless OTP Authentication:** Secure 4-digit passkey login flow verified over HTTP to avoid SMTP delivery failures[cite: 7].
- **Speciality Exploration:** Filter care options by General Care (Physician, Gynecologist, Pediatrician, Dentist) or Advanced Care[cite: 11].
- **In-Person & Video Consultations:** Instant dual booking flows supporting both video calls and local physical clinic visits[cite: 9, 10].
- **Dynamic Slot Availability:** Real-time visibility into available doctor consultation slots with one-click reservation[cite: 12].
- **Location-Aware Booking:** Proximity filtering displaying nearby clinics, ratings, and doctor experience[cite: 12].

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework:** Angular 17+ (TypeScript)
- **Styling:** Tailwind CSS & Responsive UI Components
- **Hosting:** Vercel

### Backend
- **Framework:** Django & Django REST Framework (DRF)
- **WSGI Server:** Gunicorn
- **Database:** PostgreSQL
- **Email Infrastructure:** Resend API (HTTPS Port 443 integration)
- **Hosting:** Render Cloud Services

---

## 🚀 Local Setup Instructions

### Prerequisites
- pgAdmin4
- Python (v3.10+)
- Git

### 1. Repository Setup
```bash
git clone [https://github.com/your-username/Patient_Mgmt_System.git](https://github.com/your-username/Patient_Mgmt_System.git)
cd Patient_Mgmt_System

### 2. Backend Setup
```bash
cd healio-backend

# Initialize virtual environment
python -m venv venv
.\venv\Scripts\activate      # Windows
source venv/bin/activate    # macOS/Linux

# Install requirements
pip install -r requirements.txt

# Database migrations
python manage.py migrate

# Run the Django server
python manage.py runserver

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd healio-frontend

# Install dependencies
npm install

# Start local Angular development server
ng serve


## 🔐 Environment Variables

Ensure the following variables are configured across backend and frontend environments:

### Backend Variables (Render / .env)

<table>
  <thead>
    <tr>
      <th align="left">Variable</th>
      <th align="left">Type</th>
      <th align="left">Description</th>
      <th align="left">Example / Production Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>SECRET_KEY</code></td>
      <td>String</td>
      <td>Django secret key for cryptographic signing</td>
      <td><code>django-insecure-prod-key</code></td>
    </tr>
    <tr>
      <td><code>DEBUG</code></td>
      <td>Boolean</td>
      <td>Enables debug mode locally; disable in production</td>
      <td><code>False</code></td>
    </tr>
    <tr>
      <td><code>ALLOWED_HOSTS</code></td>
      <td>List / String</td>
      <td>Allowed domain hosts serving API requests</td>
      <td><code>healio-backend-ugg5.onrender.com,localhost</code></td>
    </tr>
    <tr>
      <td><code>CORS_ALLOWED_ORIGINS</code></td>
      <td>List / String</td>
      <td>Allowed frontend origin domains</td>
      <td><code>https://healio-app-black.vercel.app</code></td>
    </tr>
    <tr>
      <td><code>RESEND_API_KEY</code></td>
      <td>Secret String</td>
      <td>Resend API key for HTTP transactional OTP dispatch</td>
      <td><code>re_xxxxxxxxxxxxxxxxx</code></td>
    </tr>
    <tr>
      <td><code>DEFAULT_FROM_EMAIL</code></td>
      <td>String</td>
      <td>Sender address for transactional emails</td>
      <td><code>Healio &lt;onboarding@resend.dev&gt;</code></td>
    </tr>
  </tbody>
</table>

<br/>

### Frontend Variables (Angular <code>src/environments/</code>)

Configure in <code>src/environments/environment.ts</code> (local) and <code>src/environments/environment.prod.ts</code> (production):

<table>
  <thead>
    <tr>
      <th align="left">Key</th>
      <th align="left">Type</th>
      <th align="left">Description</th>
      <th align="left">Production Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>production</code></td>
      <td>Boolean</td>
      <td>Flag enabling production optimizations</td>
      <td><code>true</code></td>
    </tr>
    <tr>
      <td><code>apiUrl</code></td>
      <td>String</td>
      <td>Base backend API URL</td>
      <td><code>https://healio-backend-ugg5.onrender.com</code></td>
    </tr>
    <tr>
      <td><code>appUrl</code></td>
      <td>String</td>
      <td>Client deployment URL</td>
      <td><code>https://healio-app-black.vercel.app</code></td>
    </tr>
  </tbody>
</table>

<br/>
