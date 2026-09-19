import { Injectable, signal, OnDestroy } from '@angular/core';

export interface ClinicDoctor {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  rating: number;
  reviewsCount: number;
  clinicName: string;
  clinicAddress: string;
  distanceKm: number;
  fee: number;
  avatarUrl: string;
  nextAvailableSlot: string;
  availableSlots: string[];
  bookedSlots?: string[];
  lat: number;
  lng: number;
  symptoms: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DoctorStreamService implements OnDestroy {
  private initialDoctors: ClinicDoctor[] = [
    {
      id: 'doc-1',
      name: 'Dr. Ramesh Rao',
      specialty: 'Cardiologist',
      experienceYears: 14,
      rating: 4.9,
      reviewsCount: 128,
      clinicName: 'Apollo Cradle Clinic',
      clinicAddress: 'Indiranagar, Bangalore',
      distanceKm: 1.8,
      fee: 800,
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
      nextAvailableSlot: 'Today at 4:30 PM',
      availableSlots: ['04:30 PM', '05:00 PM', '05:30 PM', '06:15 PM'],
      bookedSlots: [],
      lat: 12.9784,
      lng: 77.6408,
      symptoms: ['chest pain', 'heart', 'palpitations', 'high blood pressure', 'bp', 'breathlessness', 'cardiac']
    },
    {
      id: 'doc-2',
      name: 'Dr. Ananya Sharma',
      specialty: 'General Physician',
      experienceYears: 9,
      rating: 4.8,
      reviewsCount: 94,
      clinicName: 'Manipal Polyclinic',
      clinicAddress: 'Koramangala, Bangalore',
      distanceKm: 2.5,
      fee: 600,
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
      nextAvailableSlot: 'Today at 5:15 PM',
      availableSlots: ['05:15 PM', '06:00 PM', '06:45 PM', '07:30 PM'],
      bookedSlots: [],
      lat: 12.9352,
      lng: 77.6245,
      symptoms: ['fever', 'cough', 'cold', 'flu', 'headache', 'weakness', 'throat pain', 'infection', 'viral']
    },
    {
      id: 'doc-3',
      name: 'Dr. Vikramaditya Sen',
      specialty: 'Orthopedic Surgeon',
      experienceYears: 16,
      rating: 4.9,
      reviewsCount: 210,
      clinicName: 'Fortis Health Point',
      clinicAddress: 'Whitefield, Bangalore',
      distanceKm: 3.2,
      fee: 1000,
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
      nextAvailableSlot: 'Today at 6:00 PM',
      availableSlots: ['06:00 PM', '06:45 PM', '07:30 PM'],
      bookedSlots: [],
      lat: 12.9698,
      lng: 77.7500,
      symptoms: ['back pain', 'joint pain', 'knee pain', 'fracture', 'arthritis', 'bone', 'muscle strain']
    },
    {
      id: 'doc-4',
      name: 'Dr. Priya Nair',
      specialty: 'Dermatologist',
      experienceYears: 11,
      rating: 4.85,
      reviewsCount: 164,
      clinicName: 'DermaCare Wellness',
      clinicAddress: 'Jayanagar, Bangalore',
      distanceKm: 4.1,
      fee: 700,
      avatarUrl: 'https://images.unsplash.com/photo-1594824813603-ee8388c67451?w=300&auto=format&fit=crop&q=80',
      nextAvailableSlot: 'Tomorrow at 10:30 AM',
      availableSlots: ['10:30 AM', '11:15 AM', '04:00 PM', '05:00 PM'],
      bookedSlots: [],
      lat: 12.9299,
      lng: 77.5824,
      symptoms: ['skin rash', 'acne', 'itching', 'eczema', 'allergy', 'hair fall', 'psoriasis']
    },
    {
      id: 'doc-5',
      name: 'Dr. Rohan Kulkarni',
      specialty: 'Pediatrician',
      experienceYears: 12,
      rating: 4.75,
      reviewsCount: 88,
      clinicName: 'Little Stars Clinic',
      clinicAddress: 'Malleshwaram, Bangalore',
      distanceKm: 4.8,
      fee: 650,
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&auto=format&fit=crop&q=80',
      nextAvailableSlot: 'Today at 5:45 PM',
      availableSlots: ['05:45 PM', '06:30 PM', '07:15 PM'],
      bookedSlots: [],
      lat: 13.0031,
      lng: 77.5643,
      symptoms: ['child fever', 'baby', 'pediatric', 'vaccination', 'child cough', 'infant colic', 'growth']
    },
    {
      id: 'doc-6',
      name: 'Dr. Sneha Reddy',
      specialty: 'Gynecologist',
      experienceYears: 15,
      rating: 4.92,
      reviewsCount: 195,
      clinicName: 'Bloom Women Health',
      clinicAddress: 'HSR Layout, Bangalore',
      distanceKm: 2.9,
      fee: 850,
      avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&auto=format&fit=crop&q=80',
      nextAvailableSlot: 'Today at 4:15 PM',
      availableSlots: ['04:15 PM', '05:00 PM', '06:00 PM', '06:45 PM'],
      bookedSlots: [],
      lat: 12.9121,
      lng: 77.6446,
      symptoms: ['pregnancy', 'periods', 'pcos', 'menstrual', 'cramps', 'fertility', 'women health']
    }
  ];

  readonly doctors = signal<ClinicDoctor[]>(this.initialDoctors);
  private simulationInterval: any;

  constructor() {
    this.startLiveSimulation();
  }

  /**
   * Periodically simulates live slot activity from other patients in the background
   */
  private startLiveSimulation() {
    this.simulationInterval = setInterval(() => {
      this.simulateRandomSlotEvent();
    }, 10000);
  }

  private simulateRandomSlotEvent() {
    this.doctors.update(currentList => {
      if (!currentList.length) return currentList;

      // Randomly pick a doctor to update
      const targetIdx = Math.floor(Math.random() * currentList.length);
      const doctor = { ...currentList[targetIdx] };
      const currentSlots = [...doctor.availableSlots];
      const bookedSlots = [...(doctor.bookedSlots || [])];

      if (currentSlots.length > 2) {
        const bookedIdx = Math.floor(Math.random() * currentSlots.length);
        const [taken] = currentSlots.splice(bookedIdx, 1);
        bookedSlots.push(taken);
        doctor.availableSlots = currentSlots;
        doctor.bookedSlots = bookedSlots;
        if (currentSlots.length > 0) {
          doctor.nextAvailableSlot = `Today at ${currentSlots[0]}`;
        }
      } else if (currentSlots.length < 4) {
        const newSlot = '07:45 PM';
        if (!currentSlots.includes(newSlot)) {
          currentSlots.push(newSlot);
          doctor.availableSlots = currentSlots;
        }
      }

      const updated = [...currentList];
      updated[targetIdx] = doctor;
      return updated;
    });
  }

  /**
   * Optimistically books a slot for a patient
   */
  bookSlotOptimistic(doctorId: string, slot: string): { success: boolean; doctor?: ClinicDoctor; message: string } {
    let bookedDoctor: ClinicDoctor | undefined;

    this.doctors.update(currentList => {
      return currentList.map(doc => {
        if (doc.id !== doctorId) return doc;

        const updatedAvailable = doc.availableSlots.filter(s => s !== slot);
        const updatedBooked = [...(doc.bookedSlots || []), slot];
        const nextSlot = updatedAvailable.length > 0 
          ? `Today at ${updatedAvailable[0]}` 
          : 'Next Available: Tomorrow';

        bookedDoctor = {
          ...doc,
          availableSlots: updatedAvailable,
          bookedSlots: updatedBooked,
          nextAvailableSlot: nextSlot
        };
        return bookedDoctor;
      });
    });

    if (bookedDoctor) {
      return {
        success: true,
        doctor: bookedDoctor,
        message: `Appointment confirmed with ${bookedDoctor.name} for ${slot}`
      };
    }
    return { success: false, message: 'Doctor not found' };
  }

  /**
   * Recalculates distance in km for all doctors relative to user coordinates using Haversine formula
   */
  recalculateDistances(userLat: number, userLng: number) {
    this.doctors.update(list => {
      return list.map(doc => {
        const distance = this.haversineKm(userLat, userLng, doc.lat, doc.lng);
        return {
          ...doc,
          distanceKm: distance
        };
      });
    });
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  ngOnDestroy() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
  }
}
