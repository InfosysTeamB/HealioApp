import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicDoctor } from '../../services/doctor-stream.service';

export type { ClinicDoctor } from '../../services/doctor-stream.service';

@Component({
  selector: 'app-inperson-consult-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inperson-consult-card.html',
  styleUrl: './inperson-consult-card.css'
})
export class InpersonConsultCardComponent {
  @Input({ required: true }) doctor!: ClinicDoctor;
  @Output() slotSelected = new EventEmitter<{ doctorId: string; slot: string }>();
  @Output() viewProfile = new EventEmitter<string>();

  selectedSlot = signal<string>('');
  bookingStatus = signal<'idle' | 'booked'>('idle');
  bookedSlot = signal<string | null>(null);

  chooseSlot(slot: string) {
    if (this.bookingStatus() === 'booked') return;
    this.selectedSlot.set(slot);
  }

  confirmBooking() {
    if (this.bookingStatus() === 'booked') return;
    const slot = this.selectedSlot() || this.doctor.availableSlots[0];
    if (!slot) return;

    this.selectedSlot.set(slot);
    this.bookingStatus.set('booked');
    this.bookedSlot.set(slot);
    this.slotSelected.emit({ doctorId: this.doctor.id, slot });
  }

  onViewProfile() {
    this.viewProfile.emit(this.doctor.id);
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80';
  }
}