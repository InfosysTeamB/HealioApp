import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicDoctor } from '../../services/doctor-stream.service';

export type { ClinicDoctor } from '../../services/doctor-stream.service';

export interface CardBookingDate {
  isoDate: string;
  dayLabel: string;
  shortDate: string;
  fullDate: string;
  isToday: boolean;
}

@Component({
  selector: 'app-inperson-consult-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inperson-consult-card.html',
  styleUrl: './inperson-consult-card.css'
})
export class InpersonConsultCardComponent {
  @Input({ required: true }) doctor!: ClinicDoctor;
  @Output() slotSelected = new EventEmitter<{ doctorId: string; slot: string; date?: string }>();
  @Output() viewProfile = new EventEmitter<string>();

  realTimeDates: CardBookingDate[] = this.initRealTimeDates();
  selectedDate = signal<CardBookingDate>(this.realTimeDates[0]);
  selectedSlot = signal<string>('');
  bookingStatus = signal<'idle' | 'booked'>('idle');
  bookedSlot = signal<string | null>(null);
  bookedDate = signal<string | null>(null);

  private initRealTimeDates(): CardBookingDate[] {
    const dates: CardBookingDate[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' });
      const shortDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const fullDate = `${weekday}, ${shortDate} ${d.getFullYear()}`;
      const isoDate = d.toISOString().split('T')[0];
      dates.push({ isoDate, dayLabel, shortDate, fullDate, isToday });
    }
    return dates;
  }

  chooseDate(date: CardBookingDate) {
    if (this.bookingStatus() === 'booked') return;
    this.selectedDate.set(date);
  }

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
    this.bookedDate.set(this.selectedDate().fullDate);
    this.slotSelected.emit({ 
      doctorId: this.doctor.id, 
      slot, 
      date: this.selectedDate().fullDate 
    });
  }

  onViewProfile() {
    this.viewProfile.emit(this.doctor.id);
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80';
  }
}