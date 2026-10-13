import { Component, OnInit, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
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
import { DoctorStreamService } from '../../services/doctor-stream.service';

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
  private doctorStream = inject(DoctorStreamService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserSession | null = null;
  patientId: string = 'PT-88341';
  currentPatient: Patient | null = null;

  activePortalTab = signal<'all' | 'appointments' | 'records' | 'prescriptions'>('all');

  // Filter for consultations tab: 'upcoming' (default active), 'all', or 'cancelled'
  appointmentFilter = signal<'upcoming' | 'all' | 'cancelled'>('upcoming');

  // Cancellation modal state
  cancellationModalAppt = signal<AppointmentRecord | null>(null);

  // Live Toast feedback
  toastMessage = signal<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  private toastTimeout: any = null;

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

  // Active / Upcoming appointments count
  activeAppointmentsCount = computed(() => {
    return this.userAppointments().filter(a => a.status !== 'Cancelled').length;
  });

  // Cancelled appointments count
  cancelledAppointmentsCount = computed(() => {
    return this.userAppointments().filter(a => a.status === 'Cancelled').length;
  });

  // Displayed appointments based on selected filter
  displayedAppointments = computed(() => {
    const list = this.userAppointments();
    const filter = this.appointmentFilter();
    if (filter === 'upcoming') {
      return list.filter(a => a.status !== 'Cancelled');
    }
    if (filter === 'cancelled') {
      return list.filter(a => a.status === 'Cancelled');
    }
    return list;
  });

  selectedAppointmentDetails = signal<AppointmentRecord | null>(null);
  patientPrescriptions: Prescription[] = [];
  patientConsultations: Consultation[] = [];

  readonly realTimeTodayString = new Date().toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });

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

  formatApptDate(date?: string): string {
    if (!date || date.toLowerCase() === 'today') {
      const now = new Date();
      const weekday = now.toLocaleDateString('en-GB', { weekday: 'short' });
      const day = now.toLocaleDateString('en-GB', { day: '2-digit' });
      const month = now.toLocaleDateString('en-GB', { month: 'short' });
      const year = now.getFullYear();
      return `${weekday}, ${day} ${month} ${year} (Today)`;
    }
    return date;
  }

  showToast(type: 'success' | 'info' | 'error', text: string): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage.set({ type, text });
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 5000);
  }

  closeToast(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage.set(null);
  }

  openCancelModal(appt: AppointmentRecord): void {
    this.cancellationModalAppt.set(appt);
  }

  closeCancelModal(): void {
    this.cancellationModalAppt.set(null);
  }

  confirmCancellation(permanentlyRemove: boolean = false): void {
    const appt = this.cancellationModalAppt();
    if (!appt) return;

    if (permanentlyRemove) {
      this.clinicalService.deleteAppointmentRecord(appt);
      this.doctorStream.releaseSlot(appt.doctorName, appt.timeSlot);
      this.showToast('success', `Consultation with ${appt.doctorName} was removed from your records.`);
    } else {
      this.clinicalService.cancelAppointmentRecord(appt);
      this.doctorStream.releaseSlot(appt.doctorName, appt.timeSlot);
      this.showToast('success', `Consultation with ${appt.doctorName} on ${this.formatApptDate(appt.date)} (${appt.timeSlot}) has been cancelled. Slot released.`);
    }

    this.cancellationModalAppt.set(null);
    this.cdr.detectChanges();
  }

  cancelConsultation(appt: AppointmentRecord): void {
    this.openCancelModal(appt);
  }

  deleteAppointment(appt: AppointmentRecord): void {
    const confirmed = confirm(`Are you sure you want to permanently remove this consultation with ${appt.doctorName} from your history?`);
    if (!confirmed) return;

    this.clinicalService.deleteAppointmentRecord(appt);
    this.doctorStream.releaseSlot(appt.doctorName, appt.timeSlot);
    this.showToast('info', `Consultation record removed.`);
    this.cdr.detectChanges();
  }

  rebookConsultation(appt: AppointmentRecord): void {
    this.clinicalService.rebookAppointmentRecord(appt);
    this.showToast('success', `Consultation with ${appt.doctorName} has been re-scheduled.`);
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

  joinVideoCall(appt: AppointmentRecord): void {
    let roomId = `${Date.now()}`;
    if (appt.id) roomId = appt.id.replace('APPT-', '');

    if (appt.meetingLink) {
      if (appt.meetingLink.includes('room=')) {
        const match = appt.meetingLink.match(/room=([^&]+)/);
        if (match) roomId = match[1];
      } else if (appt.meetingLink.includes('/room/')) {
        roomId = appt.meetingLink.split('/room/')[1].split('?')[0];
      }
    }

    this.router.navigate(['/video-call'], {
      queryParams: {
        room: roomId,
        doctor: appt.doctorName,
        specialty: appt.doctorSpecialization,
        clinic: appt.doctorClinic,
        patient: appt.patientName,
        id: appt.id
      }
    });
  }
  logout(): void {
    this.authService.logout(true);
  }
}