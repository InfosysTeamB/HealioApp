import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Slot {
  id: string;
  day: string;
  time: string;
  status: 'Available' | 'Booked';
  patientId?: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
}

@Component({
  selector: 'app-patient-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patient-portal.html',
  styleUrls: ['./patient-portal.css']
})
export class PatientPortalComponent {
  // Registration form model
  newPatient: Patient = {
    id: 'P-001',
    name: '',
    phone: '',
    email: '',
    dob: ''
  };

  registeredPatients: Patient[] = [
    { id: 'P-001', name: 'John Doe', phone: '123-456-7230', email: 'johndoe@gmail.com', dob: '1998-07-05' }
  ];

  // Booking controls
  selectedPatientId: string = 'P-001';
  doctorId: string = '12345';
  selectedSlotId: string = '';
  bookingMessage: string = '';
  bookingSuccess: boolean = false;

  // Days and timetable matrix
  days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  timeSlots: string[] = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM',
    '01:00 PM - 02:00 PM'
  ];

  // Slot states matching Milestone 1 wireframe
  slots: Slot[] = [
    { id: 'm1', day: 'Monday', time: '09:00 AM - 10:00 AM', status: 'Available' },
    { id: 'm2', day: 'Monday', time: '10:00 AM - 11:00 AM', status: 'Available' },
    { id: 'm3', day: 'Monday', time: '11:00 AM - 12:00 PM', status: 'Available' },
    { id: 'm4', day: 'Monday', time: '12:00 PM - 01:00 PM', status: 'Available' },
    { id: 'm5', day: 'Monday', time: '01:00 PM - 02:00 PM', status: 'Booked', patientId: 'P-001' },

    { id: 't1', day: 'Tuesday', time: '09:00 AM - 10:00 AM', status: 'Available' },
    { id: 't2', day: 'Tuesday', time: '10:00 AM - 11:00 AM', status: 'Booked', patientId: 'P-001' },
    { id: 't3', day: 'Tuesday', time: '11:00 AM - 12:00 PM', status: 'Available' },
    { id: 't4', day: 'Tuesday', time: '12:00 PM - 01:00 PM', status: 'Available' },
    { id: 't5', day: 'Tuesday', time: '01:00 PM - 02:00 PM', status: 'Available' },

    { id: 'w1', day: 'Wednesday', time: '09:00 AM - 10:00 AM', status: 'Available' },
    { id: 'w2', day: 'Wednesday', time: '10:00 AM - 11:00 AM', status: 'Available' },
    { id: 'w3', day: 'Wednesday', time: '11:00 AM - 12:00 PM', status: 'Booked', patientId: 'P-001' },
    { id: 'w4', day: 'Wednesday', time: '12:00 PM - 01:00 PM', status: 'Available' },
    { id: 'w5', day: 'Wednesday', time: '01:00 PM - 02:00 PM', status: 'Available' },

    { id: 'th1', day: 'Thursday', time: '09:00 AM - 10:00 AM', status: 'Available' },
    { id: 'th2', day: 'Thursday', time: '10:00 AM - 11:00 AM', status: 'Booked', patientId: 'P-001' },
    { id: 'th3', day: 'Thursday', time: '11:00 AM - 12:00 PM', status: 'Booked', patientId: 'P-001' },
    { id: 'th4', day: 'Thursday', time: '12:00 PM - 01:00 PM', status: 'Booked', patientId: 'P-001' },
    { id: 'th5', day: 'Thursday', time: '01:00 PM - 02:00 PM', status: 'Booked', patientId: 'P-001' },

    { id: 'f1', day: 'Friday', time: '09:00 AM - 10:00 AM', status: 'Available' },
    { id: 'f2', day: 'Friday', time: '10:00 AM - 11:00 AM', status: 'Booked', patientId: 'P-001' },
    { id: 'f3', day: 'Friday', time: '11:00 AM - 12:00 PM', status: 'Booked', patientId: 'P-001' },
    { id: 'f4', day: 'Friday', time: '12:00 PM - 01:00 PM', status: 'Booked', patientId: 'P-001' },
    { id: 'f5', day: 'Friday', time: '01:00 PM - 02:00 PM', status: 'Booked', patientId: 'P-001' },
  ];

  get availableSlots(): Slot[] {
    return this.slots.filter(s => s.status === 'Available');
  }

  getSlot(day: string, time: string): Slot | undefined {
    return this.slots.find(s => s.day === day && s.time === time);
  }

  registerPatient(): void {
    if (!this.newPatient.name || !this.newPatient.phone || !this.newPatient.email) {
      alert('Please complete all patient registration fields.');
      return;
    }

    const nextId = `P-00${this.registeredPatients.length + 1}`;
    const patientToAdd: Patient = { ...this.newPatient, id: nextId };
    this.registeredPatients.push(patientToAdd);
    this.selectedPatientId = patientToAdd.id;

    this.newPatient = {
      id: `P-00${this.registeredPatients.length + 1}`,
      name: '',
      phone: '',
      email: '',
      dob: ''
    };
    alert(`Patient ${patientToAdd.name} registered with ID: ${patientToAdd.id}`);
  }

  bookSelectedSlot(): void {
    if (!this.selectedSlotId) {
      this.bookingMessage = 'Please choose an available slot.';
      this.bookingSuccess = false;
      return;
    }

    const slot = this.slots.find(s => s.id === this.selectedSlotId);
    if (slot && slot.status === 'Available') {
      slot.status = 'Booked';
      slot.patientId = this.selectedPatientId;
      this.bookingSuccess = true;
      this.bookingMessage = `Slot confirmed: ${slot.day} at ${slot.time} for Patient ${this.selectedPatientId}!`;
      this.selectedSlotId = '';
    }
  }
}