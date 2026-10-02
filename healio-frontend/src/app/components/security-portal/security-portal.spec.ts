import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecurityPortal } from './security-portal';

describe('SecurityPortal', () => {
  let component: SecurityPortal;
  let fixture: ComponentFixture<SecurityPortal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityPortal],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityPortal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
