import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientPortalComponent } from './patient-portal';

describe('PatientPortalComponent', () => {
  let component: PatientPortalComponent;
  let fixture: ComponentFixture<PatientPortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientPortalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientPortalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
