import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecurityPortalComponent } from './security-portal';

describe('SecurityPortalComponent', () => {
  let component: SecurityPortalComponent;
  let fixture: ComponentFixture<SecurityPortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityPortalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityPortalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
