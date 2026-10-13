import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { InpersonConsultCardComponent } from './inperson-consult-card';

describe('InpersonConsultCardComponent', () => {
  let component: InpersonConsultCardComponent;
  beforeEach(() => {
    component = new InpersonConsultCardComponent();
    component.doctor = {
      id: 'doc-test',
      name: 'Dr. Test',
      specialty: 'Cardiologist',
      experienceYears: 10,
      rating: 4.8,
      reviewsCount: 50,
      clinicName: 'Test Clinic',
      clinicAddress: 'Bangalore',
      distanceKm: 2.0,
      fee: 500,
      avatarUrl: '',
      nextAvailableSlot: 'Today at 5:00 PM',
      availableSlots: ['05:00 PM'],
      lat: 12.97,
      lng: 77.59,
      symptoms: ['heart']
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize real-time booking dates with Today as the active date', () => {
    expect(component.realTimeDates.length).toBeGreaterThan(0);
    expect(component.realTimeDates[0].isToday).toBe(true);
    expect(component.selectedDate().isToday).toBe(true);
  });

  it('should switch selected date when chooseDate is called', () => {
    const tomorrow = component.realTimeDates[1];
    component.chooseDate(tomorrow);
    expect(component.selectedDate().isoDate).toBe(tomorrow.isoDate);
  });

  it('should emit slotSelected with doctorId, slot, and real-time date', () => {
    let emitted: any;
    component.slotSelected.subscribe((val) => (emitted = val));
    component.confirmBooking();

    expect(emitted).toBeDefined();
    expect(emitted.doctorId).toBe('doc-test');
    expect(emitted.slot).toBe('05:00 PM');
    expect(emitted.date).toBe(component.selectedDate().fullDate);
    expect(component.bookingStatus()).toBe('booked');
  });
});
