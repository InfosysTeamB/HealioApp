import { Injectable, signal } from '@angular/core';

export interface PrescribedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface FullPrescription {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  clinicName: string;
  dateIssued: string;
  diagnosis: string;
  clinicalNotes?: string;
  medicines: PrescribedMedicine[];
  advice?: string;
  followUpDate?: string;
}

const STORAGE_KEY = 'healio_prescriptions';

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {
  readonly prescriptions = signal<FullPrescription[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.prescriptions.set(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse stored prescriptions', e);
      }
    }

    // Default initial seed prescription issued by Dr. Ramesh Rao for Alex Johnson
    const initialSeed: FullPrescription[] = [
      {
        id: 'RX-2026-8831',
        patientId: 'PT-88341',
        patientName: 'Alex Johnson',
        doctorId: 'DOC-CARD-001',
        doctorName: 'Dr. Ramesh Rao',
        doctorSpecialty: 'Cardiologist',
        clinicName: 'Apollo Cradle Clinic',
        dateIssued: '18 Sep 2026',
        diagnosis: 'Mild Hypertension & Seasonal Fatigue',
        clinicalNotes: 'Blood pressure 135/88 mmHg. Advised low sodium intake and regular aerobic exercise.',
        medicines: [
          {
            name: 'Telmisartan Tablets IP',
            dosage: '40 mg',
            frequency: '1 - 0 - 0 (Once daily morning)',
            duration: '30 Days',
            instructions: 'Take after breakfast with water'
          },
          {
            name: 'Coenzyme Q10 + Vitamin D3 Capsules',
            dosage: '100 mg',
            frequency: '0 - 1 - 0 (Once daily lunch)',
            duration: '15 Days',
            instructions: 'Post lunch dietary supplement'
          }
        ],
        advice: 'Limit dietary sodium to < 2g/day. Monitor resting heart rate every morning. Walk 30 minutes daily.',
        followUpDate: '02 Oct 2026'
      }
    ];

    this.prescriptions.set(initialSeed);
    this.saveToStorage(initialSeed);
  }

  private saveToStorage(list: FullPrescription[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  addPrescription(prescription: FullPrescription): void {
    this.prescriptions.update((prev) => {
      const updated = [prescription, ...prev];
      this.saveToStorage(updated);
      return updated;
    });
  }

  getPrescriptionsForPatient(patientIdOrEmail: string): FullPrescription[] {
    const all = this.prescriptions();
    if (!patientIdOrEmail) return all;
    const target = patientIdOrEmail.toLowerCase().trim();
    return all.filter(
      (rx) =>
        (rx.patientId && rx.patientId.toLowerCase().trim() === target) ||
        (rx.patientEmail && rx.patientEmail.toLowerCase().trim() === target)
    );
  }

  printPrescriptionSlip(rx: FullPrescription): void {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const medsHtml = rx.medicines
      .map(
        (m, idx) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: bold;">${idx + 1}. ${m.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; color: #0E9F6E; font-weight: bold;">${m.dosage}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${m.frequency}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${m.duration}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B;">${m.instructions}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription ${rx.id} - Healio Health</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; padding: 40px; margin: 0; }
          .header { border-bottom: 2px solid #0E9F6E; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .brand { font-size: 26px; font-weight: 850; color: #0E9F6E; letter-spacing: -0.03em; }
          .clinic { text-align: right; font-size: 13px; color: #64748B; }
          .doctor-row { margin-top: 25px; padding: 15px 20px; background: #ECFDF5; border-radius: 12px; border: 1px solid #A7F3D0; }
          .doctor-name { font-size: 18px; font-weight: 800; color: #065F46; }
          .doctor-sub { font-size: 13px; color: #047857; margin-top: 2px; }
          .patient-box { margin-top: 20px; display: flex; justify-content: space-between; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #E2E8F0; }
          .meds-table { width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 14px; }
          .meds-table th { background: #F8FAFC; text-align: left; padding: 10px; border-bottom: 2px solid #CBD5E1; color: #475569; }
          .advice-box { margin-top: 30px; background: #F8FAFC; border-left: 4px solid #0E9F6E; padding: 15px 20px; border-radius: 0 8px 8px 0; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 20px; }
          .signature { text-align: right; }
          .sig-line { width: 180px; border-top: 1px dashed #64748B; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">healio • clinical rx</div>
            <div style="font-size: 12px; color: #64748B;">Digital Healthcare Network</div>
          </div>
          <div class="clinic">
            <strong>${rx.clinicName}</strong><br/>
            Indiranagar, Bangalore • Ph: +91 80 4567 8900<br/>
            Date: <strong>${rx.dateIssued}</strong> | Rx #: <strong>${rx.id}</strong>
          </div>
        </div>

        <div class="doctor-row">
          <div class="doctor-name">${rx.doctorName}</div>
          <div class="doctor-sub">${rx.doctorSpecialty} • Reg #: ${rx.doctorId}</div>
        </div>

        <div class="patient-box">
          <div>Patient: <strong>${rx.patientName}</strong> (ID: <strong>${rx.patientId}</strong>)</div>
          <div>Diagnosis: <strong style="color: #0E9F6E;">${rx.diagnosis}</strong></div>
        </div>

        <table class="meds-table">
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${medsHtml}
          </tbody>
        </table>

        ${
          rx.advice
            ? `
          <div class="advice-box">
            <strong style="color: #0F172A; font-size: 13px; text-transform: uppercase;">Doctor's Clinical Advice:</strong>
            <p style="margin: 6px 0 0; font-size: 14px; color: #334155; line-height: 1.5;">${rx.advice}</p>
          </div>
        `
            : ''
        }

        ${
          rx.followUpDate
            ? `
          <div style="margin-top: 15px; font-size: 13px; color: #065F46; font-weight: bold;">
            📅 Recommended Follow-up Visit: ${rx.followUpDate}
          </div>
        `
            : ''
        }

        <div class="footer">
          <div>
            Digitally Authorized via Healio Clinical Protocol<br/>
            Verify authenticity at healio.health/verify/${rx.id}
          </div>
          <div class="signature">
            <div class="sig-line"></div>
            <strong>${rx.doctorName}</strong><br/>
            Authorized Medical Signatory
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
