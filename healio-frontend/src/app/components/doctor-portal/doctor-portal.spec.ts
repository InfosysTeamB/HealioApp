import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoctorPortal } from './doctor-portal';

describe('DoctorPortal', () => {
  let component: DoctorPortal;
  let fixture: ComponentFixture<DoctorPortal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorPortal],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorPortal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
