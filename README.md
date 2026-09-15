# Healio — Real-Time Patient Management System (PMS)

<div align="center">
  <img src="src/assets/healio-logo.png" alt="Healio Logo" width="90" />
  <p><strong>A Modern, HIPAA-Compliant Clinical Management & Telehealth Platform</strong></p>
</div>

---

## 📖 Overview

**Healio** is a full-stack, enterprise-grade healthcare management application designed for outpatient clinics, diagnostic centers, and hospital workflows. It connects clinical staff, physicians, and patients through low-latency telemetry, automated asynchronous background tasks, and strict role-based data partitioning.

---

## 🛠 Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Angular (Latest, Standalone) | Reactive SPA, RxJS WebSocket Streams, Form Control |
| **Backend API** | Django & Django REST Framework (DRF) | Core business logic, RBAC, REST endpoints |
| **Real-Time Engine** | Django Channels + Daphne (ASGI) | Persistent WebSocket connections for live queues & alerts |
| **Primary Database** | PostgreSQL *(SQLite in local dev)* | Relational medical data integrity & ACID compliance |
| **In-Memory Broker** | Redis | Channels Pub/Sub layer & Celery task message broker |
| **Worker Queue** | Celery | Background PDF prescription compiling & automated emails |
| **Push Alerts** | Firebase Cloud Messaging (FCM) | Device/browser push alerts for ready lab results |
| **Auth & Security** | SimpleJWT (JSON Web Tokens) | Stateless, time-limited token authorization |

---

## ⚡ Real-Time Capabilities

Healio eliminates manual page refreshes across all clinical operations through WebSocket channel layers backed by Redis:

* **Live Outpatient (OPD) Queue Management:** Real-time updates push to waiting room displays and doctor dashboards whenever a patient checks in, is called to an exam room, or completes a visit.
* **Instant Slot Locking:** During appointment scheduling, selected calendar slots lock in real time across all active user sessions to prevent double-booking.
* **Nurse Telemetry Broadcast:** Critical updates to patient vital signs (SpO2, Blood Pressure, Heart Rate) immediately trigger alerts on the supervising doctor's terminal.
* **Direct Doctor–Patient Messaging:** Secure, real-time consultation messaging with typing indicators and instant status delivery.

---

## 🔄 Core Clinical Workflows

### 1. Patient Journey
1. **Intake / Registration:** Patient registers via mobile OTP or MRN (Medical Record Number).
2. **Scheduling:** The patient selects an available doctor slot; the slot locks instantly across the network.
3. **Queue Tracking:** Real-time status tracker shows the estimated wait time and live queue position.
4. **Post-Visit:** Download digitally signed PDF prescriptions and lab summaries generated asynchronously.

### 2. Clinical / Doctor Workflow
1. **Station Login:** Secure, role-gated sign-in with optional 2FA verification.
2. **Queue Intake:** The doctor clicks "Call Next Patient," broadcasting an update to the lobby monitor.
3. **EHR Encounter:** The doctor reviews longitudinal patient history, logs active diagnosis notes, and inputs medication orders.
4. **Prescription Offload:** Prescriptions dispatch to Celery background workers to assemble an encrypted PDF without freezing the UI.

---

## 🔒 HIPAA Compliance & Technical Safeguards

Healio incorporates technical safeguards aligned with **45 CFR § 164.312 (HIPAA Security Rule)**:

* **Access Control (§ 164.312(a)):**
  * Strict Role-Based Access Control (RBAC) separating `Doctor`, `Nurse`, `Patient`, and `Billing Admin`.
  * Unique User Identification for every clinical action.
  * Automatic session termination after 15 minutes of inactivity with visual warning modals.
* **Audit Controls (§ 164.312(b)):**
  * Centralized audit logging recording `user_id`, `action`, `resource_id`, `timestamp`, and `client_ip` for all reads, writes, and exports of Protected Health Information (PHI).
* **Data Integrity & Encryption (§ 164.312(c) & (e)):**
  * **In Transit:** All traffic is enforced over HTTPS (TLS 1.3) and secure WebSockets (`wss://`).
  * **At Rest:** Database encryption for sensitive identifiers and credentials.
  * PDF discharge summaries generated in isolated worker environments.

---

## 🚀 Quick Start (Local Setup)

### 1. Clone & Frontend Setup
```bash
git clone [https://github.com/your-username/healio.git](https://github.com/your-username/healio.git)
cd healio/healio-frontend
npm install
ng serve
