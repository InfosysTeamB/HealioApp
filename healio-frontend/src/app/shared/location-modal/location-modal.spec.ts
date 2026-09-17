import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationModal } from './location-modal';

describe('LocationModal', () => {
  let component: LocationModal;
  let fixture: ComponentFixture<LocationModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationModal],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
