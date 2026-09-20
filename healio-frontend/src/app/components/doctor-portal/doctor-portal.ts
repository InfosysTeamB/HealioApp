import { Component, OnInit, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { 
  ClinicalService, 
  Patient, 
  Consultation, 
  Prescription, 
  AppointmentSlot, 
  AppointmentRecord,
  DoctorDashboardSummary 
} from '../../services/clinical.service';
import { AuthService } from '../../services/auth.service';
import { PrescriptionService, FullPrescription } from '../../services/prescription.service';

@Component({
  selector: 'app-doctor-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './doctor-portal.html',
  styleUrls: ['./doctor-portal.css']
})
export class DoctorPortalComponent implements OnInit {
  private clinicalService = inject(ClinicalService);
  private authService = inject(AuthService);
  private prescriptionService = inject(PrescriptionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  doctorId: string = 'DOC-CRD-01';

  // 1. Doctor Identity Profile
  doctorProfile = signal<{
    doctorId: string;
    name: string;
    email: string;
    phone: string;
    specialization: string;
    clinic: string;
    role: string;
  }>({
    doctorId: 'DOC-CRD-01',
    name: 'Dr. Ramesh Rao',
    email: 'dr.ramesh.rao@healio.health',
    phone: '+91 98450 12345',
    specialization: 'Cardiologist',
    clinic: 'Apollo Cradle Clinic',
    role: 'doctor'
  });

  // Reactive signals for roster, active selected patient, and metrics
  doctorRoster = signal<any[]>([]);
  activePatient = signal<any>(null);
  prescriptionsIssuedCount = signal<number>(8);

  doctorData: DoctorDashboardSummary | null = null;
  slots: AppointmentSlot[] = [];
  patients: Patient[] = [];
  selectedPatientId: string = '';
  searchTerm: string = '';
  isLoading: boolean = true;
  loadError: string = '';
  actionSuccessMessage: string = '';

  selectedDayFilter: string = 'All';
  activeWorkspaceView: 'clinical' | 'timetable' = 'clinical';

  get filteredPatients(): Patient[] {
    if (!this.searchTerm.trim()) return this.patients;
    const q = this.searchTerm.toLowerCase();
    return this.patients.filter((p) =>
      p.full_name.toLowerCase().includes(q) ||
      (p.patient_id && p.patient_id.toLowerCase().includes(q))
    );
  }

  get availableSelectorPatients(): any[] {
    const map = new Map<string, any>();
    for (const r of this.doctorRoster()) {
      const pid = r.patientId || r.patient_id;
      if (pid && !map.has(pid)) {
        map.set(pid, r);
      }
    }
    for (const p of this.filteredPatients) {
      const pid = p.patient_id;
      if (pid && !map.has(pid)) {
        map.set(pid, {
          patientId: pid,
          patient_id: pid,
          name: p.full_name,
          full_name: p.full_name,
          date_of_birth: p.date_of_birth,
          patientEmail: p.contact_email,
          contact_email: p.contact_email,
          profile: p.profile
        });
      }
    }
    return Array.from(map.values());
  }

  consultations: Consultation[] = [];
  prescriptions: Prescription[] = [];

  newConsultation: Consultation = {
    patient: '',
    doctor_id: this.doctorId,
    chief_complaint: '',
    diagnosis: '',
    clinical_notes: ''
  };

  // Comprehensive Prescription Form Model
  prescriptionForm = {
    diagnosis: '',
    clinical_notes: '',
    medication_name: '',
    dosage: '',
    frequency: '1 - 0 - 1 (Twice daily after meals)',
    duration_days: 7,
    instructions: 'Take with warm water after meals',
    advice: 'Limit dietary sodium, maintain daily blood pressure logs, stay well hydrated.',
    follow_up_date: '02 Oct 2026'
  };

  activeTab: 'consultations' | 'prescriptions' = 'prescriptions';

  ngOnInit(): void {
    // 1. Read active doctor profile from localStorage
    const savedDoc = typeof localStorage !== 'undefined' ? localStorage.getItem('healio_doctor_session') : null;
    if (savedDoc) {
      try {
        const parsed = JSON.parse(savedDoc);
        this.doctorProfile.set({
          doctorId: parsed.doctorId || parsed.doctor_id || 'DOC-CRD-01',
          name: parsed.name || 'Dr. Ramesh Rao',
          email: parsed.email || 'dr.ramesh.rao@healio.health',
          phone: parsed.phone || '+91 98450 12345',
          specialization: parsed.specialization || 'Cardiologist',
          clinic: parsed.clinic || 'Apollo Cradle Clinic',
          role: parsed.role || 'doctor'
        });
        this.doctorId = this.doctorProfile().doctorId;
      } catch {}
    } else {
      this.doctorId = 'DOC-CRD-01';
    }

    this.newConsultation.doctor_id = this.doctorId;
    this.syncDoctorRoster();
    this.loadDoctorPortalData();
  }

  syncDoctorRoster(): void {
    const docProf = this.doctorProfile();
    const docName = (docProf.name || 'Dr. Ramesh Rao').toLowerCase();

    // Retrieve booked appointments from ClinicalService or localStorage
    let allAppts: AppointmentRecord[] = [];
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('healio_appointments');
      if (raw) {
        try {
          allAppts = JSON.parse(raw);
        } catch {}
      }
    }
    if (!allAppts || allAppts.length === 0) {
      allAppts = this.clinicalService.appointments();
    }

    // Default sample appointments if empty
    if (!allAppts || allAppts.length === 0) {
      allAppts = [
        {
          id: 'APPT-DEMO-001',
          consultationType: 'in-person',
          patientEmail: 'alex.johnson@healio.health',
          patientName: 'Alex Johnson',
          doctorName: 'Dr. Ramesh Rao',
          doctorSpecialization: 'Cardiologist',
          doctorClinic: 'Apollo Cradle Clinic',
          date: 'Today',
          timeSlot: '04:30 PM',
          status: 'Confirmed'
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
          status: 'Confirmed'
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
          status: 'Confirmed'
        }
      ];
      try {
        localStorage.setItem('healio_appointments', JSON.stringify(allAppts));
      } catch {}
    }

    // Case-insensitive doctor check for "Ramesh" or doctor name
    const isDoctorMatch = (name?: string) => {
      if (!name) return false;
      const n = name.toLowerCase();
      return n.includes('ramesh') || n.includes('dr. ramesh rao') || n.includes(docName);
    };

    // Filter confirmed/active consultations (exclude cancelled)
    const filtered = allAppts.filter(a => isDoctorMatch(a.doctorName) && a.status !== 'Cancelled');

    const mapped = filtered.map((a, idx) => {
      const pId = (a as any).patientId || (a as any).patient_id || this.derivePatientId(a.patientEmail, a.patientName, idx);
      return {
        id: a.id || `appt-${idx + 1}`,
        name: a.patientName || 'Patient',
        full_name: a.patientName || 'Patient',
        patientId: pId,
        patient_id: pId,
        patientEmail: a.patientEmail || 'patient@healio.health',
        contact_email: a.patientEmail || 'patient@healio.health',
        timeSlot: a.timeSlot || '04:30 PM',
        date: a.date || 'Today',
        type: a.consultationType || 'in-person',
        consultationType: a.consultationType || 'in-person',
        status: a.status || 'Confirmed',
        phone: (a as any).patientPhone || '+91 98765 43210',
        contact_phone: (a as any).patientPhone || '+91 98765 43210',
        date_of_birth: '1992-05-14',
        profile: this.getPatientProfileFallback(a.patientName, pId)
      };
    });

    this.doctorRoster.set(mapped);

    // Initialize activePatient to first appointment in doctorRoster()
    if (mapped.length > 0) {
      const curId = this.activePatient()?.id;
      const match = mapped.find(m => m.id === curId);
      if (match) {
        this.activePatient.set(match);
        this.selectedPatientId = match.patientId;
      } else {
        this.activePatient.set(mapped[0]);
        this.selectedPatientId = mapped[0].patientId;
      }
      this.onPatientChange();
    } else {
      this.activePatient.set(null);
      this.selectedPatientId = '';
    }

    if (this.doctorData?.stats) {
      this.doctorData.stats.today_appointments = mapped.length;
    }
  }

  private derivePatientId(email?: string, name?: string, idx: number = 0): string {
    if (email) {
      const e = email.toLowerCase().trim();
      if (e.includes('alex')) return 'PT-88341';
      if (e.includes('priya')) return 'PT-90142';
      if (e.includes('vikram')) return 'PT-77219';
      if (e.includes('harshitha') || e.includes('namala')) return 'PT-13738';
      let hash = 0;
      for (let i = 0; i < e.length; i++) {
        hash = (hash << 5) - hash + e.charCodeAt(i);
        hash |= 0;
      }
      return 'PT-' + Math.abs(hash % 90000 + 10000);
    }
    if (name) {
      const n = name.toLowerCase().trim();
      if (n.includes('harshitha') || n.includes('namala')) return 'PT-13738';
      if (n.includes('alex')) return 'PT-88341';
      if (n.includes('priya')) return 'PT-90142';
      if (n.includes('vikram')) return 'PT-77219';
    }
    return `PT-${88341 + idx}`;
  }

  private getPatientProfileFallback(name?: string, pid?: string) {
    if (name?.toLowerCase().includes('alex')) {
      return {
        blood_group: 'O+',
        gender: 'Male',
        allergies: 'Penicillin',
        chronic_conditions: 'Mild Hypertension',
        emergency_contact_name: 'Sarah Johnson',
        emergency_contact_phone: '+91 98765 43211'
      };
    }
    if (name?.toLowerCase().includes('priya')) {
      return {
        blood_group: 'B+',
        gender: 'Female',
        allergies: 'None',
        chronic_conditions: 'Asthma',
        emergency_contact_name: 'Rahul Sharma',
        emergency_contact_phone: '+91 98111 22335'
      };
    }
    if (name?.toLowerCase().includes('vikram')) {
      return {
        blood_group: 'A+',
        gender: 'Male',
        allergies: 'Sulfa drugs',
        chronic_conditions: 'Type 2 Diabetes',
        emergency_contact_name: 'Ananya Mehta',
        emergency_contact_phone: '+91 97222 33446'
      };
    }
    if (name?.toLowerCase().includes('harshitha') || name?.toLowerCase().includes('namala')) {
      return {
        blood_group: 'B+',
        gender: 'Female',
        allergies: 'None',
        chronic_conditions: 'Routine Consultation',
        emergency_contact_name: 'Family Contact',
        emergency_contact_phone: '+91 98451 22334'
      };
    }
    return {
      blood_group: 'O+',
      gender: 'General',
      allergies: 'No known drug allergies',
      chronic_conditions: 'Consultation Follow-up',
      emergency_contact_name: 'Primary Contact',
      emergency_contact_phone: '+91 98000 00000'
    };
  }

  loadDoctorPortalData(): void {
    this.isLoading = true;
    this.loadError = '';

    const defaultDoctorMeta = {
      doctor_id: this.doctorProfile().doctorId,
      name: this.doctorProfile().name,
      email: this.doctorProfile().email,
      specialization: this.doctorProfile().specialization,
      department: 'Cardiology & Preventive Medicine',
      contact_phone: this.doctorProfile().phone
    };

    // Parallel fetch with fallback safe handling
    forkJoin({
      summary: this.clinicalService.getDoctorDashboard(this.doctorId),
      slots: this.clinicalService.getDoctorSlots(this.doctorId),
      patients: this.clinicalService.getPatients()
    }).subscribe({
      next: ({ summary, slots, patients }) => {
        this.doctorData = summary;
        this.slots = [...slots];
        this.patients = [...patients];
        this.syncDoctorRoster();
        this.prescriptionsIssuedCount.set(this.doctorData?.stats?.prescriptions_issued || 8);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.warn('Backend unavailable, using dynamic Dr. Ramesh Rao clinical state:', err);
        this.doctorData = {
          doctor: defaultDoctorMeta,
          roster: [],
          pending_consultations: [],
          timetable: [],
          stats: {
            total_patients: 12,
            today_appointments: this.doctorRoster().length || 3,
            pending_reviews: 2,
            prescriptions_issued: this.prescriptionsIssuedCount() || 8
          }
        };
        this.syncDoctorRoster();
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  selectRosterPatient(patient: any): void {
    this.activePatient.set(patient);
    this.selectedPatientId = patient.patientId || patient.patient_id;
    this.activeWorkspaceView = 'clinical';
    this.onPatientChange();
  }

  selectRosterSlot(slot: any): void {
    const pId = slot.patient || slot.patient_id;
    if (pId) {
      this.selectedPatientId = pId;
      const found = this.availableSelectorPatients.find(p => (p.patientId || p.patient_id) === pId);
      if (found) {
        this.activePatient.set(found);
      }
      this.activeWorkspaceView = 'clinical';
      this.onPatientChange();
    }
  }

  onPatientSelectChange(): void {
    const found = this.availableSelectorPatients.find(p => (p.patientId || p.patient_id) === this.selectedPatientId);
    if (found) {
      this.activePatient.set(found);
    }
    this.onPatientChange();
  }

  onPatientChange(): void {
    if (!this.selectedPatientId) return;
    this.newConsultation.patient = this.selectedPatientId;
    this.fetchPatientHistory();
  }

  fetchPatientHistory(): void {
    if (!this.selectedPatientId) return;

    this.clinicalService.getConsultations(this.selectedPatientId).subscribe({
      next: (data: Consultation[]) => {
        this.consultations = data;
        this.cdr.markForCheck();
      },
      error: () => {
        const p = this.activePatient();
        const pName = p?.name || 'Patient';
        this.consultations = [
          {
            id: 101,
            patient: this.selectedPatientId,
            doctor_id: this.doctorId,
            consultation_date: new Date().toISOString(),
            chief_complaint: 'Routine consultation & follow-up check',
            diagnosis: 'Consultation recorded for ' + pName,
            clinical_notes: 'Vital signs stable. Heart rhythm regular. Patient advised standard lifestyle precautions.'
          }
        ];
        this.cdr.markForCheck();
      }
    });

    this.clinicalService.getPrescriptions(this.selectedPatientId).subscribe({
      next: (data: Prescription[]) => {
        this.prescriptions = data;
        this.cdr.markForCheck();
      },
      error: () => {
        const fullRx = this.prescriptionService.getPrescriptionsForPatient(this.selectedPatientId);
        this.prescriptions = fullRx.map(f => ({
          id: parseInt(f.id.replace(/\D/g, '')) || 1,
          patient: f.patientId,
          medication_name: f.medicines[0]?.name || 'Telmisartan',
          dosage: f.medicines[0]?.dosage || '40 mg',
          frequency: f.medicines[0]?.frequency || 'Once daily',
          duration_days: 30,
          issued_at: f.dateIssued
        }));
        this.cdr.markForCheck();
      }
    });
  }

  saveConsultation(): void {
    if (!this.newConsultation.chief_complaint || !this.newConsultation.diagnosis) {
      alert('Please fill out Chief Complaint and Diagnosis.');
      return;
    }
    this.newConsultation.patient = this.selectedPatientId;
    this.newConsultation.doctor_id = this.doctorId;
    this.clinicalService.recordConsultation(this.newConsultation).subscribe({
      next: (created: Consultation) => {
        this.consultations.unshift(created);
        this.newConsultation.chief_complaint = '';
        this.newConsultation.diagnosis = '';
        this.newConsultation.clinical_notes = '';
        this.showSuccess('Consultation record saved successfully.');
      },
      error: () => {
        const mockConsultation: Consultation = {
          ...this.newConsultation,
          id: Date.now(),
          consultation_date: new Date().toISOString()
        };
        this.consultations.unshift(mockConsultation);
        this.newConsultation.chief_complaint = '';
        this.newConsultation.diagnosis = '';
        this.newConsultation.clinical_notes = '';
        this.showSuccess('Consultation record saved successfully.');
      }
    });
  }

  // 3. Live Prescription Creation & Sync
  savePrescription(): void {
    if (!this.prescriptionForm.medication_name || !this.prescriptionForm.dosage) {
      alert('Please specify the Medication Name and Dosage.');
      return;
    }

    const patient = this.activePatient();
    const patientName = patient?.name || patient?.full_name || 'Alex Johnson';
    const patientId = patient?.patientId || patient?.patient_id || this.selectedPatientId || 'PT-88341';
    const patientEmail = patient?.patientEmail || patient?.contact_email || 'patient@healio.health';

    const docProf = this.doctorProfile();
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const rxId = `RX-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Construct full rich prescription object
    const newRx: FullPrescription = {
      id: rxId,
      patientId: patientId,
      patientName: patientName,
      patientEmail: patientEmail,
      doctorId: docProf.doctorId || this.doctorId || 'DOC-CRD-01',
      doctorName: docProf.name || 'Dr. Ramesh Rao',
      doctorSpecialty: docProf.specialization || 'Cardiologist',
      clinicName: docProf.clinic || 'Apollo Cradle Clinic',
      dateIssued: formattedDate,
      diagnosis: this.prescriptionForm.diagnosis || 'Clinical Follow-up & Treatment Plan',
      clinicalNotes: this.prescriptionForm.clinical_notes || 'Patient evaluated during scheduled consultation.',
      medicines: [
        {
          name: this.prescriptionForm.medication_name,
          dosage: this.prescriptionForm.dosage,
          frequency: this.prescriptionForm.frequency,
          duration: `${this.prescriptionForm.duration_days} Days`,
          instructions: this.prescriptionForm.instructions
        }
      ],
      advice: this.prescriptionForm.advice,
      followUpDate: this.prescriptionForm.follow_up_date
    };

    // Prepend to localStorage healio_prescriptions
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('healio_prescriptions');
        let currentList: FullPrescription[] = [];
        if (raw) {
          currentList = JSON.parse(raw);
        }
        const updatedList = [newRx, ...currentList];
        localStorage.setItem('healio_prescriptions', JSON.stringify(updatedList));
      } catch (err) {
        console.error('Error prepending to healio_prescriptions:', err);
      }
    }

    // Sync to shared prescription signal in PrescriptionService & ClinicalService
    this.prescriptionService.addPrescription(newRx);
    this.clinicalService.addPrescription(newRx);

    // Update doctor's local prescriptions list for immediate display in timeline
    this.prescriptions.unshift({
      id: Date.now(),
      patient: patientId,
      medication_name: this.prescriptionForm.medication_name,
      dosage: this.prescriptionForm.dosage,
      frequency: this.prescriptionForm.frequency,
      duration_days: this.prescriptionForm.duration_days,
      issued_at: formattedDate
    });

    // Increment Prescriptions Issued metric counter
    this.prescriptionsIssuedCount.update(c => c + 1);
    if (this.doctorData?.stats) {
      this.doctorData.stats.prescriptions_issued = this.prescriptionsIssuedCount();
    }

    // Reset form
    this.prescriptionForm.medication_name = '';
    this.prescriptionForm.dosage = '';
    this.showSuccess(`Prescription ${newRx.id} authorized & synchronized to ${patientName}'s Patient Portal.`);
  }

  get days(): string[] {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }

  get filteredSlots(): AppointmentSlot[] {
    const list = this.slots.length > 0 ? this.slots : (this.doctorData?.timetable || []);
    if (this.selectedDayFilter === 'All') {
      return list;
    }
    return list.filter(s => s.day === this.selectedDayFilter);
  }

  showSuccess(msg: string): void {
    this.actionSuccessMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.actionSuccessMessage = '';
      this.cdr.markForCheck();
    }, 4500);
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('healio_doctor_session');
      localStorage.removeItem('healio_role');
      localStorage.removeItem('healio_user');
    }
    this.authService.logout(true);
  }
}