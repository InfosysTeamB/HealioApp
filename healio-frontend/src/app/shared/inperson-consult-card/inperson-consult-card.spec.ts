import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InpersonConsultCardComponent } from './inperson-consult-card';

describe('InpersonConsultCardComponent', () => {
  let component: InpersonConsultCardComponent;
  let fixture: ComponentFixture<InpersonConsultCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InpersonConsultCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InpersonConsultCardComponent);
    component = fixture.componentInstance;
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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
