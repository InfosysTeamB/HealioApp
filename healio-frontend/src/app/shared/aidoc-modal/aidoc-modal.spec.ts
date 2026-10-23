import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AidocModalComponent } from './aidoc-modal';

describe('AidocModalComponent', () => {
  let component: AidocModalComponent;
  let fixture: ComponentFixture<AidocModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AidocModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AidocModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
