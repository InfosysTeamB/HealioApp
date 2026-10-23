import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoctorPortalComponent } from './doctor-portal';

describe('DoctorPortalComponent', () => {
  let component: DoctorPortalComponent;
  let fixture: ComponentFixture<DoctorPortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorPortalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorPortalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
