import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

@Component({
  selector: 'app-doctor-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './doctor-portal.html',
  styleUrls: ['./doctor-portal.css']
})
export class DoctorPortalComponent implements OnInit {
  doctorId: string = 'DOC-12345';
  doctorData: DoctorDashboardSummary | null = null;
  slots: AppointmentSlot[] = [];
  patients: Patient[] = [];
  selectedPatientId: string = '';
  searchTerm: string = '';
  isLoading: boolean = true;
  loadError: string = '';

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

  newPrescription: Prescription = {
    patient: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration_days: 7
  };

  activeTab: 'consultations' | 'prescriptions' = 'consultations';

  constructor(
    private clinicalService: ClinicalService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getUser();
    if (currentUser?.doctor_id) {
      this.doctorId = currentUser.doctor_id;
    }
    this.newConsultation.doctor_id = this.doctorId;
    this.loadDoctorPortalData();
  }

  loadDoctorPortalData(): void {
    this.isLoading = true;
    this.loadError = '';

    // Frontend Concurrency: Execute dashboard summary, slots, and patients in a single parallel forkJoin
    forkJoin({
      summary: this.clinicalService.getDoctorDashboard(this.doctorId),
      slots: this.clinicalService.getDoctorSlots(this.doctorId),
      patients: this.clinicalService.getPatients()
    }).subscribe({
      next: ({ summary, slots, patients }) => {
        this.doctorData = summary;
        this.slots = [...slots];
        this.patients = patients;

        if (summary.doctor && summary.doctor.doctor_id) {
          this.doctorId = summary.doctor.doctor_id;
          this.newConsultation.doctor_id = this.doctorId;
        }

        // Set initial selected patient: prioritize roster booked patient, else first patient
        if (this.patients.length > 0 && !this.selectedPatientId) {
          const bookedPatientId = summary.roster?.find(r => r.patient)?.patient;
          const matchPatient = bookedPatientId 
            ? this.patients.find(p => p.patient_id === bookedPatientId) 
            : null;

          this.selectedPatientId = matchPatient?.patient_id || this.patients[0].patient_id || '';
          this.onPatientChange();
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Failed to load Doctor Portal data concurrently:', err);
        this.loadError = 'Failed to load Doctor Workspace data. Please check network connectivity.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
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
    this.newPrescription.patient = this.selectedPatientId;
    this.fetchPatientHistory();
  }

  fetchPatientHistory(): void {
    this.clinicalService.getConsultations(this.selectedPatientId).subscribe({
      next: (data: Consultation[]) => {
        this.consultations = data;
        this.cdr.markForCheck();
      },
      error: (err: any) => console.error(err)
    });

    this.clinicalService.getPrescriptions(this.selectedPatientId).subscribe({
      next: (data: Prescription[]) => {
        this.prescriptions = data;
        this.cdr.markForCheck();
      },
      error: (err: any) => console.error(err)
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
        if (this.doctorData?.pending_consultations) {
          this.doctorData.pending_consultations.unshift(created);
        }
        this.newConsultation.chief_complaint = '';
        this.newConsultation.diagnosis = '';
        this.newConsultation.clinical_notes = '';
        if (this.doctorData?.stats) {
          this.doctorData.stats.pending_reviews = Math.max(0, this.doctorData.stats.pending_reviews - 1);
        }
        this.cdr.markForCheck();
        alert('Consultation record saved successfully.');
      },
      error: (err: any) => alert('Error saving consultation: ' + JSON.stringify(err.error))
    });
  }

  savePrescription(): void {
    if (!this.newPrescription.medication_name || !this.newPrescription.dosage) {
      alert('Please fill out Medication and Dosage.');
      return;
    }
    this.newPrescription.patient = this.selectedPatientId;
    this.clinicalService.issuePrescription(this.newPrescription).subscribe({
      next: (created: Prescription) => {
        this.prescriptions.unshift(created);
        this.newPrescription.medication_name = '';
        this.newPrescription.dosage = '';
        this.newPrescription.frequency = '';
        if (this.doctorData?.stats) {
          this.doctorData.stats.prescriptions_issued++;
        }
        this.cdr.markForCheck();
        alert('Prescription dispatched and recorded.');
      },
      error: (err: any) => alert('Error issuing prescription: ' + JSON.stringify(err.error))
    });
  }

  logout(): void {
    this.authService.logout();
  }
}