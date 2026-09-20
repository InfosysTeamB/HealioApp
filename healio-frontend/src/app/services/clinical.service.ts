import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppointmentRecord {
  id?: string;
  consultationType: 'in-person' | 'video';
  patientEmail: string;
  patientName: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorClinic?: string;
  date: string;
  timeSlot: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  meetingLink?: string;
  doctorAvatar?: string;
  fee?: number;
}

export interface PatientProfile {
  blood_group: string;
  gender: string;
  allergies: string;
  chronic_conditions: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface Patient {
  patient_id?: string;
  full_name: string;
  contact_phone: string;
  contact_email: string;
  date_of_birth: string;
  profile?: PatientProfile;
}

export interface AppointmentSlot {
  id: number;
  day: string;
  time_slot: string;
  doctor_id: string;
  patient: string | null;
  status: 'Available' | 'Booked';
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
}

export interface DoctorProfileMetadata {
  doctor_id: string;
  name: string;
  email: string;
  specialization: string;
  department: string;
  contact_phone?: string;
}

export interface DoctorDashboardSummary {
  doctor: DoctorProfileMetadata;
  roster: AppointmentSlot[];
  pending_consultations: Consultation[];
  timetable: AppointmentSlot[];
  stats: {
    total_patients: number;
    today_appointments: number;
    pending_reviews: number;
    prescriptions_issued: number;
  };
}

export interface Consultation {
  id?: number;
  patient: string;
  doctor_id: string;
  consultation_date?: string;
  chief_complaint: string;
  diagnosis: string;
  clinical_notes?: string;
}

export interface Prescription {
  id?: number;
  patient: string;
  consultation?: number | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  issued_at?: string;
}

export interface AuditLog {
  id: number;
  formatted_time: string;
  user_identifier: string;
  action: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
}

export interface NotificationStatus {
  status: string;
  last_run: string;
  total_alerts_dispatched: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClinicalService {
  readonly appointments = signal<AppointmentRecord[]>([]);
  readonly prescriptions = signal<any[]>([]);

  private get v1Url(): string {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api/v1`;
  }

  constructor(private http: HttpClient) {
    this.loadAppointmentsFromStorage();
    this.loadPrescriptionsFromStorage();
  }

  private loadPrescriptionsFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('healio_prescriptions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.prescriptions.set(parsed);
        }
      }
    } catch {}
  }

  addPrescription(rx: any): void {
    this.prescriptions.update(prev => [rx, ...prev]);
  }

  private loadAppointmentsFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('healio_appointments');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.appointments.set(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading healio_appointments from storage:', e);
    }

    // Default initial seed if completely empty
    let userEmail = 'alex.johnson@healio.health';
    let userName = 'Alex Johnson';
    try {
      const savedUser = localStorage.getItem('healio_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.email) userEmail = parsedUser.email;
        if (parsedUser.name) userName = parsedUser.name;
      }
    } catch {}

    const defaultSeed: AppointmentRecord[] = [
      {
        id: 'APPT-DEMO-001',
        consultationType: 'in-person',
        patientEmail: userEmail,
        patientName: userName,
        doctorName: 'Dr. Ramesh Rao',
        doctorSpecialization: 'Cardiologist',
        doctorClinic: 'Apollo Cradle Clinic',
        date: 'Today',
        timeSlot: '04:30 PM',
        status: 'Confirmed',
        doctorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'APPT-DEMO-002',
        consultationType: 'video',
        patientEmail: 'priya.sharma@example.com',
        patientName: 'Priya Sharma',
        doctorName: 'Dr. Ramesh Rao',
        doctorSpecialization: 'Cardiologist',
        doctorClinic: 'Apollo Cradle Clinic',
        date: 'Today',
        timeSlot: '05:30 PM',
        status: 'Confirmed',
        doctorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80'
      },
      {
        id: 'APPT-DEMO-003',
        consultationType: 'in-person',
        patientEmail: 'vikram.mehta@example.com',
        patientName: 'Vikram Mehta',
        doctorName: 'Dr. Ramesh Rao',
        doctorSpecialization: 'Cardiologist',
        doctorClinic: 'Apollo Cradle Clinic',
        date: 'Today',
        timeSlot: '06:15 PM',
        status: 'Confirmed',
        doctorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80'
      }
    ];
    this.appointments.set(defaultSeed);
    try {
      localStorage.setItem('healio_appointments', JSON.stringify(defaultSeed));
    } catch {}
  }

  private saveAppointmentsToStorage(appts: AppointmentRecord[]): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('healio_appointments', JSON.stringify(appts));
      } catch (e) {
        console.error('Error saving healio_appointments to storage:', e);
      }
    }
  }

  bookAppointment(record: {
    consultationType: 'in-person' | 'video';
    patientEmail: string;
    patientName: string;
    doctorName: string;
    doctorSpecialization: string;
    doctorClinic?: string;
    date?: string;
    timeSlot: string;
    status?: 'Confirmed' | 'Completed' | 'Cancelled';
    meetingLink?: string;
    doctorAvatar?: string;
    fee?: number;
    id?: string;
  }): AppointmentRecord {
    const timestamp = Date.now();
    const meetingLink = record.consultationType === 'video'
      ? (record.meetingLink || `https://meet.healio.health/room/${timestamp}`)
      : undefined;

    const newRecord: AppointmentRecord = {
      id: record.id || `APPT-${timestamp}`,
      consultationType: record.consultationType,
      patientEmail: record.patientEmail,
      patientName: record.patientName,
      doctorName: record.doctorName,
      doctorSpecialization: record.doctorSpecialization,
      doctorClinic: record.doctorClinic || (record.consultationType === 'video' ? 'Healio TeleHealth' : 'Apollo Cradle Clinic'),
      date: record.date || 'Today',
      timeSlot: record.timeSlot,
      status: record.status || 'Confirmed',
      meetingLink,
      doctorAvatar: record.doctorAvatar,
      fee: record.fee
    };

    const updated = [newRecord, ...this.appointments()];
    this.appointments.set(updated);
    this.saveAppointmentsToStorage(updated);
    return newRecord;
  }

  getLatestUpcoming(patientEmail?: string | null): AppointmentRecord | null {
    const list = this.appointments();
    if (!list || list.length === 0) return null;

    if (!patientEmail) {
      return list.find(a => a.status === 'Confirmed') || null;
    }

    const emailLower = patientEmail.toLowerCase().trim();
    // Prioritize match for this specific patient email
    const match = list.find(a => a.status === 'Confirmed' && a.patientEmail.toLowerCase().trim() === emailLower);
    if (match) return match;

    // Fallback if demo default patient appointment exists
    const demoFallback = list.find(a => a.status === 'Confirmed' && a.patientEmail === 'patient@healio.health');
    return demoFallback || null;
  }

  cancelAppointmentRecord(id: string): void {
    const updated = this.appointments().map(a => 
      a.id === id ? { ...a, status: 'Cancelled' as const } : a
    );
    this.appointments.set(updated);
    this.saveAppointmentsToStorage(updated);
  }

  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.v1Url}/patients/`);
  }

  registerPatient(patient: Patient): Observable<Patient> {
    return this.http.post<Patient>(`${this.v1Url}/patients/`, patient);
  }

  getSlots(): Observable<AppointmentSlot[]> {
    return this.http.get<AppointmentSlot[]>(`${this.v1Url}/appointments/`);
  }

  bookSlot(slotId: number, patientId: string): Observable<AppointmentSlot> {
    return this.http.post<AppointmentSlot>(`${this.v1Url}/appointments/book/`, {
      slot_id: slotId,
      patient_id: patientId
    });
  }

  cancelSlot(slotId: number, patientId: string): Observable<AppointmentSlot> {
    return this.http.post<AppointmentSlot>(`${this.v1Url}/appointments/cancel/`, {
      slot_id: slotId,
      patient_id: patientId
    });
  }

  getConsultations(patientId?: string): Observable<Consultation[]> {
    const url = patientId 
      ? `${this.v1Url}/consultations/?patient_id=${patientId}` 
      : `${this.v1Url}/consultations/`;
    return this.http.get<Consultation[]>(url);
  }

  recordConsultation(data: Consultation): Observable<Consultation> {
    return this.http.post<Consultation>(`${this.v1Url}/consultations/`, data);
  }

  getPrescriptions(patientId?: string): Observable<Prescription[]> {
    const url = patientId 
      ? `${this.v1Url}/prescriptions/?patient_id=${patientId}` 
      : `${this.v1Url}/prescriptions/`;
    return this.http.get<Prescription[]>(url);
  }

  issuePrescription(data: Prescription): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.v1Url}/prescriptions/`, data);
  }

  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.v1Url}/audit-logs/`);
  }

  getNotificationStatus(): Observable<NotificationStatus> {
    return this.http.get<NotificationStatus>(`${this.v1Url}/notifications/status/`);
  }

  getApiEndpoints(): Observable<ApiEndpoint[]> {
    return this.http.get<ApiEndpoint[]>(`${this.v1Url}/endpoints/`);
  }

  getDoctorDashboard(doctorId: string): Observable<DoctorDashboardSummary> {
    return this.http.get<DoctorDashboardSummary>(`${this.v1Url}/doctor/dashboard-summary/?doctor_id=${encodeURIComponent(doctorId)}`);
  }

  getDoctorSlots(doctorId: string): Observable<AppointmentSlot[]> {
    return this.http.get<AppointmentSlot[]>(`${this.v1Url}/doctor/slots/?doctor_id=${encodeURIComponent(doctorId)}`);
  }
}