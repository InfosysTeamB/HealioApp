import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AidocModal } from './aidoc-modal';

describe('AidocModal', () => {
  let component: AidocModal;
  let fixture: ComponentFixture<AidocModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AidocModal],
    }).compileComponents();

    fixture = TestBed.createComponent(AidocModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
