import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private get v1Url(): string {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api/v1`;
  }

  constructor(private http: HttpClient) {}

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