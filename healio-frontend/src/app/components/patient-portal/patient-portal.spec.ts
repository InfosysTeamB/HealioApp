import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientPortal } from './patient-portal';

describe('PatientPortal', () => {
  let component: PatientPortal;
  let fixture: ComponentFixture<PatientPortal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientPortal],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientPortal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
