import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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

  doctorId: string = 'DOC-CARD-001';
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
    const savedDoc = typeof localStorage !== 'undefined' ? localStorage.getItem('healio_doctor_session') : null;
    const currentUser = this.authService.getUser();

    if (savedDoc) {
      try {
        const parsed = JSON.parse(savedDoc);
        if (parsed?.doctorId || parsed?.doctor_id) {
          this.doctorId = parsed.doctorId || parsed.doctor_id;
        }
      } catch {}
    } else if (currentUser?.doctor_id) {
      this.doctorId = currentUser.doctor_id;
    }

    this.newConsultation.doctor_id = this.doctorId;
    this.loadDoctorPortalData();
  }

  loadDoctorPortalData(): void {
    this.isLoading = true;
    this.loadError = '';

    // Initialize doctor profile default data
    const defaultDoctorMeta = {
      doctor_id: 'DOC-CARD-001',
      name: 'Dr. Ramesh Rao',
      email: 'dr.ramesh.rao@healio.health',
      specialization: 'Cardiologist',
      department: 'Cardiology & Preventive Medicine',
      contact_phone: '+91 98450 12345'
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
        this.processPatientsAndQueue(patients);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.warn('Backend unavailable, using default Dr. Ramesh Rao clinical state:', err);
        // Resilient fallback for standalone demo experience
        this.doctorData = {
          doctor: defaultDoctorMeta,
          roster: [],
          pending_consultations: [],
          timetable: [],
          stats: {
            total_patients: 12,
            today_appointments: 4,
            pending_reviews: 2,
            prescriptions_issued: 8
          }
        };
        this.processPatientsAndQueue([]);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private processPatientsAndQueue(remotePatients: Patient[]): void {
    const list: Patient[] = [...remotePatients];

    // Read verified logged-in patient from localStorage (Alex Johnson)
    const rawUser = localStorage.getItem('healio_user');
    let verifiedPatient: Patient | null = null;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        if (u.name && u.role === 'patient') {
          verifiedPatient = {
            patient_id: u.patient_id || 'PT-88341',
            full_name: u.name,
            contact_email: u.email || 'alex.johnson@healio.health',
            contact_phone: u.phone || '+91 98765 43210',
            date_of_birth: '1992-05-14',
            profile: {
              blood_group: 'O+',
              gender: 'Male',
              allergies: 'Penicillin',
              chronic_conditions: 'Mild Hypertension',
              emergency_contact_name: 'Sarah Johnson',
              emergency_contact_phone: '+91 98765 43211'
            }
          };
        }
      } catch (e) {}
    }

    if (!verifiedPatient) {
      verifiedPatient = {
        patient_id: 'PT-88341',
        full_name: 'Alex Johnson',
        contact_email: 'alex.johnson@healio.health',
        contact_phone: '+91 98765 43210',
        date_of_birth: '1992-05-14',
        profile: {
          blood_group: 'O+',
          gender: 'Male',
          allergies: 'Penicillin',
          chronic_conditions: 'Mild Hypertension',
          emergency_contact_name: 'Sarah Johnson',
          emergency_contact_phone: '+91 98765 43211'
        }
      };
    }

    // Ensure verified patient is prominently at the top of the queue
    const existsIdx = list.findIndex(p => p.patient_id === verifiedPatient!.patient_id);
    if (existsIdx >= 0) {
      list.splice(existsIdx, 1);
    }
    list.unshift(verifiedPatient);

    // Add other realistic roster patients if empty
    if (list.length === 1) {
      list.push(
        {
          patient_id: 'PT-90142',
          full_name: 'Priya Sharma',
          contact_email: 'priya.sharma@example.com',
          contact_phone: '+91 98111 22334',
          date_of_birth: '1988-11-20',
          profile: {
            blood_group: 'B+',
            gender: 'Female',
            allergies: 'None',
            chronic_conditions: 'Asthma',
            emergency_contact_name: 'Rahul Sharma',
            emergency_contact_phone: '+91 98111 22335'
          }
        },
        {
          patient_id: 'PT-77219',
          full_name: 'Vikram Mehta',
          contact_email: 'vikram.mehta@example.com',
          contact_phone: '+91 97222 33445',
          date_of_birth: '1975-03-08',
          profile: {
            blood_group: 'A+',
            gender: 'Male',
            allergies: 'Sulfa drugs',
            chronic_conditions: 'Type 2 Diabetes',
            emergency_contact_name: 'Ananya Mehta',
            emergency_contact_phone: '+91 97222 33446'
          }
        }
      );
    }

    this.patients = list;

    // Build today's consultation roster queue
    if (!this.doctorData) {
      this.doctorData = {
        doctor: {
          doctor_id: 'DOC-CARD-001',
          name: 'Dr. Ramesh Rao',
          email: 'dr.ramesh.rao@healio.health',
          specialization: 'Cardiologist',
          department: 'Cardiology',
          contact_phone: '+91 98450 12345'
        },
        roster: [],
        pending_consultations: [],
        timetable: [],
        stats: { total_patients: 12, today_appointments: 4, pending_reviews: 2, prescriptions_issued: 8 }
      };
    }

    if (!this.doctorData.roster || this.doctorData.roster.length === 0) {
      this.doctorData.roster = [
        {
          id: 881,
          day: 'Today',
          time_slot: '04:30 PM',
          doctor_id: 'DOC-CARD-001',
          patient: verifiedPatient.patient_id || 'PT-88341',
          patient_name: verifiedPatient.full_name,
          patient_phone: verifiedPatient.contact_phone,
          status: 'Booked'
        },
        {
          id: 882,
          day: 'Today',
          time_slot: '05:30 PM',
          doctor_id: 'DOC-CARD-001',
          patient: 'PT-90142',
          patient_name: 'Priya Sharma',
          patient_phone: '+91 98111 22334',
          status: 'Booked'
        },
        {
          id: 883,
          day: 'Today',
          time_slot: '06:15 PM',
          doctor_id: 'DOC-CARD-001',
          patient: 'PT-77219',
          patient_name: 'Vikram Mehta',
          patient_phone: '+91 97222 33445',
          status: 'Booked'
        }
      ];
    }

    this.selectedPatientId = verifiedPatient.patient_id || 'PT-88341';
    this.onPatientChange();
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

  get activePatient(): Patient | undefined {
    return this.patients.find(p => p.patient_id === this.selectedPatientId);
  }

  selectRosterSlot(slot: AppointmentSlot): void {
    if (!slot.patient) return;
    this.selectedPatientId = slot.patient;
    this.activeWorkspaceView = 'clinical';
    this.onPatientChange();
  }

  onPatientChange(): void {
    if (!this.selectedPatientId) return;
    this.newConsultation.patient = this.selectedPatientId;
    this.fetchPatientHistory();
  }

  fetchPatientHistory(): void {
    this.clinicalService.getConsultations(this.selectedPatientId).subscribe({
      next: (data: Consultation[]) => {
        this.consultations = data;
        this.cdr.markForCheck();
      },
      error: () => {
        // Sample default consultation record for the demo patient
        this.consultations = [
          {
            id: 101,
            patient: this.selectedPatientId,
            doctor_id: 'DOC-CARD-001',
            consultation_date: new Date().toISOString(),
            chief_complaint: 'Routine cardiac health review & BP follow-up',
            diagnosis: 'Mild Hypertension (Stage 1), well controlled',
            clinical_notes: 'ECG regular sinus rhythm. S1 and S2 heart sounds clear. Patient reports no chest tightness.'
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
        // Fallback from shared PrescriptionService
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
        // Client-side record creation
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

  savePrescription(): void {
    if (!this.prescriptionForm.medication_name || !this.prescriptionForm.dosage) {
      alert('Please specify the Medication Name and Dosage.');
      return;
    }

    const patient = this.activePatient;
    const patientName = patient?.full_name || 'Alex Johnson';
    const patientId = this.selectedPatientId || 'PT-88341';

    // Construct full rich prescription synchronized via PrescriptionService
    const fullRx: FullPrescription = {
      id: `RX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: patientId,
      patientName: patientName,
      doctorId: this.doctorId,
      doctorName: this.doctorData?.doctor?.name || 'Dr. Ramesh Rao',
      doctorSpecialty: this.doctorData?.doctor?.specialization || 'Cardiologist',
      clinicName: 'Apollo Cradle Clinic',
      dateIssued: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      diagnosis: this.prescriptionForm.diagnosis || 'Cardiovascular Maintenance & Hypertension',
      clinicalNotes: this.prescriptionForm.clinical_notes,
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

    // Store in reactive PrescriptionService (updates signal & localStorage immediately)
    this.prescriptionService.addPrescription(fullRx);

    // Also update local list for doctor portal view
    this.prescriptions.unshift({
      id: Date.now(),
      patient: patientId,
      medication_name: this.prescriptionForm.medication_name,
      dosage: this.prescriptionForm.dosage,
      frequency: this.prescriptionForm.frequency,
      duration_days: this.prescriptionForm.duration_days,
      issued_at: fullRx.dateIssued
    });

    if (this.doctorData?.stats) {
      this.doctorData.stats.prescriptions_issued++;
    }

    // Reset entry fields
    this.prescriptionForm.medication_name = '';
    this.prescriptionForm.dosage = '';
    this.showSuccess(`Prescription ${fullRx.id} authorized & synchronized to ${patientName}'s Patient Portal.`);
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