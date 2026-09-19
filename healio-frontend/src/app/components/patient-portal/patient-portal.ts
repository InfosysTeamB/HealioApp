import { Component, OnInit, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { 
  ClinicalService, 
  Patient, 
  AppointmentSlot, 
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
    return this.prescriptionService.getPrescriptionsForPatient(this.patientId);
  });

  slots: AppointmentSlot[] = [];
  patientPrescriptions: Prescription[] = [];
  patientConsultations: Consultation[] = [];

  doctorId: string = 'DOC-CARD-001';
  selectedSlotId: number | null = null;
  bookingMessage: string = '';
  bookingSuccess: boolean = false;

  days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  timeSlots: string[] = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM',
    '01:00 PM - 02:00 PM'
  ];

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

    // Immediately trigger fetchSlots() to populate the grid without delay
    this.fetchSlots();
    this.fetchPatientRecord();
  }

  downloadPrescription(rx: FullPrescription): void {
    this.prescriptionService.printPrescriptionSlip(rx);
  }

  fetchSlots(): void {
    this.clinicalService.getSlots().subscribe({
      next: (data: AppointmentSlot[]) => {
        this.slots = [...data];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Failed to load appointment slots', err)
    });
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

  get availableSlots(): AppointmentSlot[] {
    return this.slots.filter((s) => s.status === 'Available');
  }

  get bookedSlotsForPatient(): AppointmentSlot[] {
    if (!this.patientId) return [];
    return this.slots.filter((s) => s.status === 'Booked' && s.patient === this.patientId);
  }

  getSlot(day: string, time: string): AppointmentSlot | undefined {
    return this.slots.find((s) => s.day === day && s.time_slot === time);
  }

  bookSelectedSlot(): void {
    if (!this.patientId) {
      this.bookingMessage = 'Please ensure you are signed in with an active patient ID.';
      this.bookingSuccess = false;
      return;
    }

    if (!this.selectedSlotId) {
      this.bookingMessage = 'Please select an available appointment slot.';
      this.bookingSuccess = false;
      return;
    }

    this.clinicalService.bookSlot(this.selectedSlotId, this.patientId).subscribe({
      next: (updatedSlot: AppointmentSlot) => {
        this.slots = this.slots.map((s) => (s.id === updatedSlot.id ? updatedSlot : s));
        this.bookingSuccess = true;
        this.bookingMessage = `Confirmed: ${updatedSlot.day} (${updatedSlot.time_slot}) reserved for ${this.patientId}`;
        this.selectedSlotId = null;
        this.cdr.detectChanges();
        setTimeout(() => (this.bookingMessage = ''), 4000);
      },
      error: (err: any) => {
        this.bookingSuccess = false;
        this.bookingMessage = err.error?.error || 'Failed to book slot.';
      }
    });
  }

  cancelAppointment(slotId: number): void {
    if (!confirm('Cancel this appointment? The slot will be returned to Available.')) return;

    this.clinicalService.cancelSlot(slotId, this.patientId).subscribe({
      next: (releasedSlot: AppointmentSlot) => {
        this.slots = this.slots.map((s) =>
          s.id === releasedSlot.id ? { ...releasedSlot, patient: null, status: 'Available' } : s
        );
        this.bookingSuccess = true;
        this.bookingMessage = `Appointment cancelled. Slot restored.`;
        this.cdr.detectChanges();
        setTimeout(() => (this.bookingMessage = ''), 4000);
      },
      error: (err: any) => alert('Cancellation failed: ' + JSON.stringify(err.error))
    });
  }

  printPrescriptionSlip(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout(true);
  }
}