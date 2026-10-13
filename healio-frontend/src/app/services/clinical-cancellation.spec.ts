import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { ClinicalService, AppointmentRecord } from './clinical.service';

describe('ClinicalService Cancellation', () => {
  let service: ClinicalService;

  beforeEach(() => {
    // Mock localStorage
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

    service = new ClinicalService(mockHttp);
  });

  it('initializes with seed appointments', () => {
    const appts = service.appointments();
    expect(appts.length).toBeGreaterThan(0);
    const demo = appts.find(a => a.id === 'APPT-DEMO-001');
    expect(demo).toBeDefined();
    expect(demo?.status).toBe('Confirmed');
  });

  it('cancels an appointment by id', () => {
    const success = service.cancelAppointmentRecord('APPT-DEMO-001');
    expect(success).toBe(true);
    const demo = service.appointments().find(a => a.id === 'APPT-DEMO-001');
    expect(demo?.status).toBe('Cancelled');
  });

  it('cancels an appointment by object matching if id is missing or different', () => {
    const success = service.cancelAppointmentRecord({
      doctorName: 'Dr. Ramesh Rao',
      timeSlot: '04:30 PM',
      consultationType: 'in-person'
    } as any);
    expect(success).toBe(true);
    const demo = service.appointments().find(a => a.doctorName === 'Dr. Ramesh Rao');
    expect(demo?.status).toBe('Cancelled');
  });

  it('rebooks a cancelled appointment', () => {
    service.cancelAppointmentRecord('APPT-DEMO-001');
    expect(service.appointments().find(a => a.id === 'APPT-DEMO-001')?.status).toBe('Cancelled');

    const rebooked = service.rebookAppointmentRecord('APPT-DEMO-001');
    expect(rebooked).toBe(true);
    expect(service.appointments().find(a => a.id === 'APPT-DEMO-001')?.status).toBe('Confirmed');
  });

  it('deletes an appointment permanently', () => {
    const countBefore = service.appointments().length;
    const deleted = service.deleteAppointmentRecord('APPT-DEMO-001');
    expect(deleted).toBe(true);
    expect(service.appointments().length).toBe(countBefore - 1);
    expect(service.appointments().find(a => a.id === 'APPT-DEMO-001')).toBeUndefined();
  });
});
