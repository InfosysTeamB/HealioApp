import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationModalComponent } from './location-modal';

describe('LocationModalComponent', () => {
  let component: LocationModalComponent;
  let fixture: ComponentFixture<LocationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format granular location properly', () => {
    const res = (component as any).formatGranularAddress({
      address: {
        suburb: 'Indiranagar',
        city: 'Bangalore'
      }
    });
    expect(res.label).toBe('Indiranagar, Bangalore');
  });

  it('should emit location on confirm', () => {
    let emitted: any = null;
    component.locationSelected.subscribe(val => emitted = val);
    component.confirm();
    expect(emitted).toBeTruthy();
    expect(emitted.city).toBe('Bangalore');
  });
});
