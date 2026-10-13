import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { Injector, runInInjectionContext, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { PatientPortalComponent } from './patient-portal';
import { ClinicalService, AppointmentRecord } from '../../services/clinical.service';
import { AuthService } from '../../services/auth.service';
import { PrescriptionService } from '../../services/prescription.service';
import { DoctorStreamService } from '../../services/doctor-stream.service';

describe('PatientPortalComponent Cancellation Flow', () => {
  let component: PatientPortalComponent;
  let clinicalService: ClinicalService;
  let doctorStream: DoctorStreamService;

  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };

    const mockHttp: any = {
      get: () => ({ subscribe: () => {} }),
      post: () => ({ subscribe: () => {} })
    };

    clinicalService = new ClinicalService(mockHttp);
    doctorStream = new DoctorStreamService();
    const authService = new AuthService(mockHttp, {} as any);
    const prescriptionService = new PrescriptionService();

    const injector = Injector.create({
      providers: [
        { provide: ClinicalService, useValue: clinicalService },
        { provide: DoctorStreamService, useValue: doctorStream },
        { provide: AuthService, useValue: authService },
        { provide: PrescriptionService, useValue: prescriptionService },
        { provide: ChangeDetectorRef, useValue: { detectChanges: () => {} } },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: { navigate: () => {} } }
      ]
    });

    component = runInInjectionContext(injector, () => new PatientPortalComponent());
  });

  it('displays active appointments by default in upcoming filter', () => {
    const initialUpcoming = component.displayedAppointments();
    expect(initialUpcoming.length).toBeGreaterThan(0);
    expect(initialUpcoming.every(a => a.status !== 'Cancelled')).toBe(true);
  });

  it('opens cancellation modal when openCancelModal is called', () => {
    const appt = component.displayedAppointments()[0];
    component.openCancelModal(appt);
    expect(component.cancellationModalAppt()).toBe(appt);
  });

  it('cancels appointment, updates status, releases slot, and displays toast feedback', () => {
    const appt = component.displayedAppointments()[0];
    const initialActiveCount = component.activeAppointmentsCount();

    component.openCancelModal(appt);
    component.confirmCancellation(false);

    expect(component.cancellationModalAppt()).toBeNull();
    expect(component.activeAppointmentsCount()).toBe(initialActiveCount - 1);
    expect(component.cancelledAppointmentsCount()).toBeGreaterThanOrEqual(1);

    // Toast message is populated
    expect(component.toastMessage()).not.toBeNull();
    expect(component.toastMessage()?.type).toBe('success');

    // In upcoming filter, cancelled appt is no longer shown
    expect(component.displayedAppointments().some(a => a.id === appt.id)).toBe(false);

    // In cancelled filter, cancelled appt is shown
    component.appointmentFilter.set('cancelled');
    expect(component.displayedAppointments().some(a => a.id === appt.id)).toBe(true);
  });

  it('re-books a cancelled appointment back to confirmed', () => {
    const appt = component.displayedAppointments()[0];
    component.openCancelModal(appt);
    component.confirmCancellation(false);

    component.appointmentFilter.set('cancelled');
    const cancelledAppt = component.displayedAppointments().find(a => a.id === appt.id);
    expect(cancelledAppt).toBeDefined();

    component.rebookConsultation(cancelledAppt!);

    component.appointmentFilter.set('upcoming');
    expect(component.displayedAppointments().some(a => a.id === appt.id)).toBe(true);
  });
});
