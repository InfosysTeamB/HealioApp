import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ElementRef, 
  ViewChild, 
  signal, 
  computed,
  inject 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClinicalService, AppointmentRecord } from '../../services/clinical.service';
import { AuthService } from '../../services/auth.service';

export interface ChatMessage {
  id: string;
  sender: 'doctor' | 'patient' | 'system';
  senderName: string;
  text: string;
  time: string;
  badge?: string;
}

export interface PrescribedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

@Component({
  selector: 'app-video-consultation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './video-consultation.html',
  styleUrls: ['./video-consultation.css']
})
export class VideoConsultationComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clinicalService = inject(ClinicalService);
  private authService = inject(AuthService);

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('screenVideo') screenVideoRef!: ElementRef<HTMLVideoElement>;

  // Call Lifecycle & Modes
  callPhase = signal<'in-call' | 'ended'>('in-call');
  isConnecting = signal<boolean>(true);
  roomId = signal<string>('1790943212723');
  appointmentId = signal<string>('');

  // Doctor & Patient Meta
  doctorName = signal<string>('Dr. Ananya Sen');
  doctorSpecialty = signal<string>('General Physician');
  doctorClinic = signal<string>('Healio TeleHealth & Diagnostics');
  doctorAvatar = signal<string>('https://images.unsplash.com/photo-1594824813626-d621f26e257e?w=500&auto=format&fit=crop&q=80');
  doctorRegNo = signal<string>('KMC-849201');

  patientName = signal<string>('Namala Harshitha');
  patientEmail = signal<string>('harshithanamala04@gmail.com');
  patientPhone = signal<string>('9441283233');
  patientId = signal<string>('PT-78439');
  userRole = signal<'patient' | 'doctor'>('patient');

  // Dynamic Patient Medical Profile Signals
  patientDob = signal<string>('1998-05-14');
  patientGender = signal<string>('Female');
  patientBloodGroup = signal<string>('B+');
  patientHeight = signal<string>('165');
  patientWeight = signal<string>('58');
  patientAllergies = signal<string>('Penicillin, Dust');
  patientChronicConditions = signal<string>('None reported');
  patientCurrentMedications = signal<string>('None');
  patientEmergencyContactName = signal<string>('Ravi Namala');
  patientEmergencyContactPhone = signal<string>('+91 98451 22334');
  patientEmergencyContactRelation = signal<string>('Parent');
  patientAddress = signal<string>('Plot 12, Indiranagar');
  patientCity = signal<string>('Bangalore');
  patientPincode = signal<string>('560038');

  // Computed Patient Metrics
  patientAge = computed<number>(() => {
    const dob = this.patientDob();
    if (!dob) return 26;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : 26;
  });

  patientBmi = computed<string>(() => {
    const h = parseFloat(this.patientHeight()) / 100;
    const w = parseFloat(this.patientWeight());
    if (h > 0 && w > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return '21.3';
  });

  patientBmiCategory = computed<{ label: string; color: string }>(() => {
    const bmi = parseFloat(this.patientBmi());
    if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (bmi < 25) return { label: 'Healthy Weight', color: '#10B981' };
    if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
  });

  // Media & Device Streams
  localStream: MediaStream | null = null;
  screenStream: MediaStream | null = null;
  isCameraOn = signal<boolean>(true);
  isMicOn = signal<boolean>(true);
  isScreenSharing = signal<boolean>(false);
  hasCameraError = signal<boolean>(false);
  isLocalPiPMinimized = signal<boolean>(false);

  // Doctor Simulation
  isDoctorSpeaking = signal<boolean>(false);
  connectionStrength = signal<number>(4); // 4 bars = Excellent
  networkLatency = signal<number>(38); // ms

  // Timer & UI State
  callSeconds = signal<number>(0);
  private timerInterval: any = null;
  private doctorSimulationInterval: any = null;

  // Drawers & Modals
  activeDrawer = signal<'none' | 'chat' | 'vitals' | 'prescription'>('none');
  unreadChatCount = signal<number>(0);
  isEndCallModalOpen = signal<boolean>(false);
  isReportSaved = signal<boolean>(false);
  copyLinkSuccess = signal<boolean>(false);

  // Vitals Snapshot
  patientVitals = signal({
    bp: '118/78 mmHg',
    pulse: '74 bpm',
    spo2: '99%',
    temp: '98.6 °F',
    weight: '58 kg',
    bloodGroup: 'B+'
  });

  // In-Call Chat
  chatInput = '';
  chatMessages = signal<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'system',
      senderName: 'Healio TeleHealth',
      text: 'Encrypted peer-to-peer 256-bit HIPAA medical consultation session established.',
      time: this.formatCurrentTime()
    }
  ]);

  // Clinical Summary & Prescription
  diagnosis = signal<string>('Mild Acute Pharyngitis with Low-Grade Viral Syndrome');
  clinicalAdvice = signal<string>(
    'Adequate warm fluid hydration (2.5L daily). Steam inhalation twice daily. Avoid cold food and dusty environments. Rest for 48 hours.'
  );
  prescribedMedicines = signal<PrescribedMedicine[]>([
    {
      name: 'Paracetamol 650mg (Dolo)',
      dosage: '650 mg',
      frequency: '1-0-1 (Thrice daily after food)',
      duration: '3 Days',
      instructions: 'Take SOS if body temperature exceeds 99.5°F'
    },
    {
      name: 'Cetirizine 10mg (Okacet)',
      dosage: '10 mg',
      frequency: '0-0-1 (At bedtime)',
      duration: '5 Days',
      instructions: 'For allergic rhinitis & throat itchiness'
    },
    {
      name: 'Vitamin C + Zinc Chewable (Limcee)',
      dosage: '500 mg',
      frequency: '1-0-0 (Post breakfast)',
      duration: '10 Days',
      instructions: 'Immunity booster, chew thoroughly'
    }
  ]);

  ngOnInit(): void {
    this.extractQueryParams();
    this.initCurrentUser();
    this.startCallTimer();
    this.startDoctorSimulation();

    // Connect user camera & audio
    setTimeout(() => {
      this.initLocalMedia();
      this.isConnecting.set(false);
    }, 900);

    // Initial doctor welcome message
    setTimeout(() => {
      this.addDoctorMessage(
        `Hello ${this.patientName()}! I'm ${this.doctorName()}. I have your health records open. How are you feeling right now? What symptoms can I assist you with today?`
      );
    }, 2400);
  }

  ngOnDestroy(): void {
    this.stopAllMedia();
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.doctorSimulationInterval) clearInterval(this.doctorSimulationInterval);
  }

  // --- Parameter Extraction ---
  private extractQueryParams(): void {
    // Read route param or query params
    const routeId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('roomId');
    const q = this.route.snapshot.queryParams;

    if (routeId) {
      this.roomId.set(routeId);
    } else if (q['room']) {
      this.roomId.set(q['room']);
    }

    if (q['doctor']) this.doctorName.set(q['doctor']);
    if (q['specialty']) this.doctorSpecialty.set(q['specialty']);
    if (q['clinic']) this.doctorClinic.set(q['clinic']);
    if (q['patient']) this.patientName.set(q['patient']);
    if (q['role']) this.userRole.set(q['role']);
    if (q['id']) this.appointmentId.set(q['id']);

    // Lookup matching doctor avatar
    const docLower = this.doctorName().toLowerCase();
    if (docLower.includes('ramesh')) {
      this.doctorAvatar.set('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80');
      this.doctorRegNo.set('KMC-492104');
    } else if (docLower.includes('shalini')) {
      this.doctorAvatar.set('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80');
      this.doctorRegNo.set('KMC-049201');
    } else if (docLower.includes('ananya')) {
      this.doctorAvatar.set('https://images.unsplash.com/photo-1594824813626-d621f26e257e?w=500&auto=format&fit=crop&q=80');
      this.doctorRegNo.set('KMC-849201');
    }
  }

  private initCurrentUser(): void {
    let user: any = this.authService.getUser();
    let savedProfile: any = null;

    if (typeof localStorage !== 'undefined') {
      try {
        const rawProf = localStorage.getItem('healio_patient_profile');
        if (rawProf) savedProfile = JSON.parse(rawProf);
      } catch {}

      if (!user) {
        try {
          const rawUser = localStorage.getItem('healio_user');
          if (rawUser) user = JSON.parse(rawUser);
        } catch {}
      }
    }

    const merged = { ...user, ...savedProfile };

    if (merged.name) this.patientName.set(merged.name);
    if (merged.email) this.patientEmail.set(merged.email);
    if (merged.phone) this.patientPhone.set(merged.phone);
    if (merged.patient_id) this.patientId.set(merged.patient_id);
    if (merged.date_of_birth) this.patientDob.set(merged.date_of_birth);
    if (merged.gender) this.patientGender.set(merged.gender);
    if (merged.blood_group) this.patientBloodGroup.set(merged.blood_group);
    if (merged.height) this.patientHeight.set(merged.height);
    if (merged.weight) this.patientWeight.set(merged.weight);
    if (merged.allergies) this.patientAllergies.set(merged.allergies);
    if (merged.chronic_conditions) this.patientChronicConditions.set(merged.chronic_conditions);
    if (merged.current_medications) this.patientCurrentMedications.set(merged.current_medications);
    if (merged.emergency_contact_name) this.patientEmergencyContactName.set(merged.emergency_contact_name);
    if (merged.emergency_contact_phone) this.patientEmergencyContactPhone.set(merged.emergency_contact_phone);
    if (merged.emergency_contact_relation) this.patientEmergencyContactRelation.set(merged.emergency_contact_relation);
    if (merged.address) this.patientAddress.set(merged.address);
    if (merged.city) this.patientCity.set(merged.city);
    if (merged.pincode) this.patientPincode.set(merged.pincode);

    // Sync patient vitals card
    this.patientVitals.update(v => ({
      ...v,
      bloodGroup: merged.blood_group || v.bloodGroup,
      weight: merged.weight ? `${merged.weight} kg` : v.weight
    }));
  }

  // --- Real Media Stream Access ---
  async initLocalMedia(): Promise<void> {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        });

        this.localStream = stream;
        this.hasCameraError.set(false);

        if (this.localVideoRef?.nativeElement) {
          this.localVideoRef.nativeElement.srcObject = stream;
          this.localVideoRef.nativeElement.play().catch(() => {});
        }
      } else {
        this.hasCameraError.set(true);
      }
    } catch (err) {
      console.warn('Camera/Microphone permission denied or device not found:', err);
      this.hasCameraError.set(true);
    }
  }

  toggleCamera(): void {
    const nextState = !this.isCameraOn();
    this.isCameraOn.set(nextState);

    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
  }

  toggleMic(): void {
    const nextState = !this.isMicOn();
    this.isMicOn.set(nextState);

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
  }

  async toggleScreenShare(): Promise<void> {
    if (this.isScreenSharing()) {
      this.stopScreenShare();
      return;
    }

    try {
      if (navigator?.mediaDevices?.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        this.screenStream = stream;
        this.isScreenSharing.set(true);

        if (this.screenVideoRef?.nativeElement) {
          this.screenVideoRef.nativeElement.srcObject = stream;
          this.screenVideoRef.nativeElement.play().catch(() => {});
        }

        stream.getVideoTracks()[0].onended = () => {
          this.stopScreenShare();
        };
      }
    } catch (err) {
      console.warn('Screen share canceled or denied:', err);
      this.isScreenSharing.set(false);
    }
  }

  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    this.isScreenSharing.set(false);
  }

  private stopAllMedia(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
  }

  // --- Call Timer & Simulated Doctor Behavior ---
  private startCallTimer(): void {
    this.timerInterval = setInterval(() => {
      this.callSeconds.update(s => s + 1);
    }, 1000);
  }

  get formattedDuration(): string {
    const total = this.callSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private startDoctorSimulation(): void {
    // Intermittently toggle doctor speaking wave indicator
    this.doctorSimulationInterval = setInterval(() => {
      const isSpeaking = Math.random() > 0.45;
      this.isDoctorSpeaking.set(isSpeaking);

      // Fluctuate network latency realistically (30ms - 52ms)
      const latency = 32 + Math.floor(Math.random() * 18);
      this.networkLatency.set(latency);
    }, 4500);
  }

  // --- In-Call Chat Operations ---
  toggleDrawer(drawer: 'chat' | 'vitals' | 'prescription'): void {
    if (this.activeDrawer() === drawer) {
      this.activeDrawer.set('none');
    } else {
      this.activeDrawer.set(drawer);
      if (drawer === 'chat') {
        this.unreadChatCount.set(0);
      }
    }
  }

  closeDrawer(): void {
    this.activeDrawer.set('none');
  }

  sendChatMessage(): void {
    const text = this.chatInput.trim();
    if (!text) return;

    this.chatMessages.update(msgs => [
      ...msgs,
      {
        id: `msg-${Date.now()}`,
        sender: 'patient',
        senderName: this.patientName(),
        text: text,
        time: this.formatCurrentTime()
      }
    ]);

    this.chatInput = '';

    // Doctor intelligent contextual response
    setTimeout(() => {
      this.generateDoctorResponse(text);
    }, 1400);
  }

  sendQuickSymptom(symptom: string): void {
    this.chatInput = symptom;
    this.sendChatMessage();
  }

  private generateDoctorResponse(userText: string): void {
    const lower = userText.toLowerCase();
    let reply = '';

    if (lower.includes('fever') || lower.includes('temperature') || lower.includes('101') || lower.includes('chills')) {
      reply = `Thank you for specifying. A low-grade fever around 100°F-101°F is common with seasonal viral pharyngitis. I have noted this in your active prescription. Paracetamol 650mg every 8 hours after food will provide relief. Keep your hydration up!`;
    } else if (lower.includes('throat') || lower.includes('cough') || lower.includes('sore')) {
      reply = `Understood. For the throat irritation, please do warm saline water gargles thrice a day. I have also added Cetirizine 10mg at night which reduces upper airway inflammation.`;
    } else if (lower.includes('headache') || lower.includes('body') || lower.includes('pain') || lower.includes('tired')) {
      reply = `Body ache and mild headache accompany the immune response. Try to get 8 hours of sleep, avoid prolonged screen time today, and the paracetamol will alleviate the discomfort.`;
    } else if (lower.includes('prescription') || lower.includes('medicine') || lower.includes('tablet')) {
      reply = `I have completed signing your official digital prescription sheet! You can review the complete dosage in the Prescription drawer or download the verified PDF as soon as our consultation concludes.`;
    } else if (lower.includes('lab') || lower.includes('report') || lower.includes('blood')) {
      reply = `I have reviewed your uploaded vitals and diagnostic records. Your SpO2 (${this.patientVitals().spo2}) and pulse rate (${this.patientVitals().pulse}) are excellent. No acute clinical concerns!`;
    } else {
      reply = `I have updated your clinical case notes with: "${userText}". Let's proceed with this 3-day recovery protocol. If fever persists past day 3, book an immediate follow-up.`;
    }

    this.addDoctorMessage(reply);
  }

  private addDoctorMessage(text: string): void {
    this.isDoctorSpeaking.set(true);
    setTimeout(() => this.isDoctorSpeaking.set(false), 3000);

    this.chatMessages.update(msgs => [
      ...msgs,
      {
        id: `msg-${Date.now()}`,
        sender: 'doctor',
        senderName: this.doctorName(),
        text: text,
        time: this.formatCurrentTime(),
        badge: 'Verified Specialist'
      }
    ]);

    if (this.activeDrawer() !== 'chat') {
      this.unreadChatCount.update(c => c + 1);
    }
  }

  // --- End Call & Summary ---
  promptEndCall(): void {
    this.isEndCallModalOpen.set(true);
  }

  cancelEndCall(): void {
    this.isEndCallModalOpen.set(false);
  }

  confirmEndCall(): void {
    this.isEndCallModalOpen.set(false);
    this.stopAllMedia();
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.doctorSimulationInterval) clearInterval(this.doctorSimulationInterval);

    // Save prescription into ClinicalService
    this.savePrescriptionToRecords();

    // Mark appointment as Completed in service
    if (this.appointmentId()) {
      this.clinicalService.completeAppointment(this.appointmentId());
    } else {
      // Find latest appointment and complete it
      const appt = this.clinicalService.getLatestUpcoming(this.patientEmail());
      if (appt?.id) {
        this.clinicalService.completeAppointment(appt.id);
      }
    }

    this.callPhase.set('ended');
  }

  savePrescriptionToRecords(): void {
    const rxRecord = {
      id: `RX-${Date.now()}`,
      patientName: this.patientName(),
      patientEmail: this.patientEmail(),
      patientPhone: this.patientPhone(),
      patientId: this.patientId(),
      age: this.patientAge(),
      gender: this.patientGender(),
      bloodGroup: this.patientBloodGroup(),
      height: this.patientHeight(),
      weight: this.patientWeight(),
      bmi: this.patientBmi(),
      allergies: this.patientAllergies(),
      chronicConditions: this.patientChronicConditions(),
      emergencyContact: `${this.patientEmergencyContactName()} (${this.patientEmergencyContactPhone()})`,
      doctorName: this.doctorName(),
      doctorSpecialty: this.doctorSpecialty(),
      clinic: this.doctorClinic(),
      date: 'Today',
      diagnosis: this.diagnosis(),
      advice: this.clinicalAdvice(),
      medicines: this.prescribedMedicines()
    };

    this.clinicalService.addPrescription(rxRecord);

    // Also persist in localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('healio_prescriptions');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(rxRecord);
        localStorage.setItem('healio_prescriptions', JSON.stringify(list));
      } catch {}
    }

    this.isReportSaved.set(true);
  }

  printPrescription(): void {
    window.print();
  }

  orderMedicines(): void {
    this.router.navigate(['/home'], { queryParams: { openService: 'medicine' } });
  }

  returnHome(): void {
    this.router.navigate(['/home']);
  }

  copyRoomLink(): void {
    const url = window.location.href;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.copyLinkSuccess.set(true);
        setTimeout(() => this.copyLinkSuccess.set(false), 2200);
      });
    }
  }

  private formatCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
