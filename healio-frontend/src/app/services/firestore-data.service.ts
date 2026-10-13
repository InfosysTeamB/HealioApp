import { Injectable } from '@angular/core';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Patient, AppointmentRecord, Prescription, Consultation } from './clinical.service';

@Injectable({
  providedIn: 'root'
})
export class FirestoreDataService {

  // =========================================================================
  // 1. PATIENT DOCUMENT OPERATIONS (Direct Sandboxed Document Path)
  // =========================================================================

  /**
   * Equivalent to: 
   * INSERT INTO patients (id, full_name, contact_phone, contact_email, date_of_birth, ...) 
   * VALUES (userId, ...) ON CONFLICT (id) DO UPDATE ...
   */
  async setPatientProfile(userId: string, patientData: Patient): Promise<void> {
    const patientDocRef = doc(db, 'users', userId);
    await setDoc(patientDocRef, {
      ...patientData,
      updated_at: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Equivalent to: 
   * SELECT * FROM patients WHERE id = userId LIMIT 1;
   */
  async getPatientProfile(userId: string): Promise<Patient | null> {
    const patientDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(patientDocRef);

    if (docSnap.exists()) {
      return docSnap.data() as Patient;
    }
    return null;
  }

  /**
   * Equivalent to: 
   * UPDATE patients SET blood_group = 'A+', emergency_contact = '...' WHERE id = userId;
   */
  async updatePatientProfile(userId: string, updates: Partial<Patient>): Promise<void> {
    const patientDocRef = doc(db, 'users', userId);
    await updateDoc(patientDocRef, {
      ...updates,
      updated_at: serverTimestamp()
    });
  }

  // =========================================================================
  // 2. APPOINTMENTS COLLECTION OPERATIONS (Filtered Query & Add/Delete)
  // =========================================================================

  /**
   * Equivalent to: 
   * SELECT * FROM appointments 
   * WHERE doctor_id = doctorId AND status = 'Confirmed' 
   * ORDER BY date ASC;
   */
  async getAppointmentsByDoctor(doctorId: string): Promise<AppointmentRecord[]> {
    const appointmentsCollection = collection(db, 'appointments');
    const appointmentsQuery = query(
      appointmentsCollection,
      where('doctor_id', '==', doctorId),
      where('status', '==', 'Confirmed'),
      orderBy('date', 'asc')
    );

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(appointmentsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as AppointmentRecord)
    }));
  }

  /**
   * Equivalent to: 
   * INSERT INTO appointments (consultation_type, patient_name, doctor_name, date, time_slot, status) 
   * VALUES (...);
   */
  async bookAppointment(appointment: Omit<AppointmentRecord, 'id'>): Promise<string> {
    const appointmentsCollection = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsCollection, {
      ...appointment,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Equivalent to: 
   * DELETE FROM appointments WHERE id = appointmentId;
   */
  async cancelAppointment(appointmentId: string): Promise<void> {
    const appointmentDocRef = doc(db, 'appointments', appointmentId);
    await deleteDoc(appointmentDocRef);
  }

  // =========================================================================
  // 3. PRESCRIPTIONS & CLINICAL RECORDS (Sandboxed Subcollections)
  // =========================================================================

  /**
   * Equivalent to: 
   * SELECT * FROM prescriptions WHERE patient_id = userId ORDER BY issued_at DESC;
   */
  async getPatientPrescriptions(userId: string): Promise<Prescription[]> {
    const prescriptionsRef = collection(db, 'users', userId, 'prescriptions');
    const q = query(prescriptionsRef, orderBy('issued_at', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id as any,
      ...(doc.data() as Prescription)
    }));
  }

  /**
   * Equivalent to: 
   * INSERT INTO prescriptions (patient_id, medication_name, dosage, frequency, duration_days) 
   * VALUES (...);
   */
  async issuePrescription(userId: string, prescription: Omit<Prescription, 'id'>): Promise<string> {
    const prescriptionsRef = collection(db, 'users', userId, 'prescriptions');
    const docRef = await addDoc(prescriptionsRef, {
      ...prescription,
      issued_at: serverTimestamp()
    });
    return docRef.id;
  }
}
