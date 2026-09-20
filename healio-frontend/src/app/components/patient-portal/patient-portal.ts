import { Component, OnInit, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { 
  ClinicalService, 
  Patient, 
  AppointmentSlot, 
  AppointmentRecord,
  Consultation, 
  Prescription 
} from '../../services/clinical.service';
import { AuthService, UserSession } from '../../services/auth.service';
import { PrescriptionService, FullPrescription } from '../../services/prescription.service';

@Component({
  selector: 'app-patient-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patient-portal.html',
  styleUrls: ['./patient-portal.css']
})
export class PatientPortalComponent implements OnInit {
  private clinicalService = inject(ClinicalService);
  private authService = inject(AuthService);
  private prescriptionService = inject(PrescriptionService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserSession | null = null;
  patientId: string = 'PT-88341';
  currentPatient: Patient | null = null;

  activePortalTab = signal<'all' | 'appointments' | 'records' | 'prescriptions'>('all');

  // Reactive signal of rich prescriptions synchronized across doctor & patient
  fullPrescriptions = computed(() => {
    const userEmail = (this.authService.currentUser()?.email || this.currentUser?.email || '').toLowerCase().trim();
    const byPid = this.prescriptionService.getPrescriptionsForPatient(this.patientId);
    if (userEmail && userEmail !== this.patientId.toLowerCase().trim()) {
      const byEmail = this.prescriptionService.getPrescriptionsForPatient(userEmail);
      const combined = [...byPid];
      for (const rx of byEmail) {
        if (!combined.some(c => c.id === rx.id)) {
          combined.push(rx);
        }
      }
      return combined;
    }
    return byPid;
  });

  // Practo-Style Reactive Consultations State
  userAppointments = computed(() => {
    const userEmail = (this.authService.currentUser()?.email || this.currentUser?.email || '').toLowerCase().trim();
    const all = this.clinicalService.appointments();
    if (!userEmail) return all;
    const filtered = all.filter(a => a.patientEmail.toLowerCase().trim() === userEmail);
    if (filtered.length > 0) return filtered;
    return all.filter(a => a.patientEmail === 'patient@healio.health');
  });

  selectedAppointmentDetails = signal<AppointmentRecord | null>(null);
  patientPrescriptions: Prescription[] = [];
  patientConsultations: Consultation[] = [];

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    
    if (this.currentUser?.patient_id) {
      this.patientId = this.currentUser.patient_id;
    }

    // React to query parameter tabs (e.g. /patient?tab=prescriptions)
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const t = params['tab'].toLowerCase();
        if (t === 'appointments' || t === 'records' || t === 'prescriptions') {
          this.activePortalTab.set(t as any);
        }
      }
    });

    this.fetchPatientRecord();
  }

  downloadPrescription(rx: FullPrescription): void {
    this.prescriptionService.printPrescriptionSlip(rx);
  }

  openClinicDetails(appt: AppointmentRecord): void {
    this.selectedAppointmentDetails.set(appt);
  }

  closeClinicDetails(): void {
    this.selectedAppointmentDetails.set(null);
  }

  cancelConsultation(appt: AppointmentRecord): void {
    if (!appt.id) return;
    const confirmCancel = confirm(`Are you sure you want to cancel your consultation with ${appt.doctorName} on ${appt.date} at ${appt.timeSlot}?`);
    if (!confirmCancel) return;

    this.clinicalService.cancelAppointmentRecord(appt.id);
    this.cdr.detectChanges();
  }

  onDocImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80';
  }

  fetchPatientRecord(): void {
    this.clinicalService.getPatients().subscribe({
      next: (patients: Patient[]) => {
        if (this.patientId) {
          const match = patients.find((p) => p.patient_id === this.patientId);
          if (match) {
            this.currentPatient = match;
            this.loadClinicalHistory();
            this.cdr.detectChanges();
            return;
          }
        }
        
        if (this.currentUser?.email) {
          const matchByEmail = patients.find(
            (p) => p.contact_email.toLowerCase() === this.currentUser?.email?.toLowerCase()
          );
          if (matchByEmail && matchByEmail.patient_id) {
            this.patientId = matchByEmail.patient_id;
            this.currentPatient = matchByEmail;
            this.authService.updatePatientId(this.patientId);
            this.loadClinicalHistory();
            this.cdr.detectChanges();
            return;
          }
        }
      },
      error: (err: any) => console.error('Failed to load patient records', err)
    });
  }

  loadClinicalHistory(): void {
    if (!this.patientId) return;

    this.clinicalService.getPrescriptions(this.patientId).subscribe({
      next: (data: Prescription[]) => {
        this.patientPrescriptions = [...data];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error(err)
    });

    this.clinicalService.getConsultations(this.patientId).subscribe({
      next: (data: Consultation[]) => {
        this.patientConsultations = [...data];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error(err)
    });
  }



  printPrescriptionSlip(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout(true);
  }
}