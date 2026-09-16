from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
import jwt

from .models import (
    Patient, 
    PatientProfile, 
    AppointmentSlot, 
    Consultation, 
    Prescription, 
    AuditLog, 
    NotificationAlert
)

class ClinicalBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.doctor_user = User.objects.create_user(
            username='DOC-12345',
            email='doctor@healio.med',
            password='Password123!',
            first_name='Dr. Gregory'
        )

    def test_patient_creation_and_signal_audit(self):
        """Test patient onboarding and automated post_save signal audit logging."""
        payload = {
            'full_name': 'Sarah Connor',
            'contact_phone': '555-0199',
            'contact_email': 'sarah@skynet.test',
            'date_of_birth': '1985-05-12',
            'profile': {
                'blood_group': 'A+',
                'gender': 'Female',
                'allergies': 'Penicillin',
                'chronic_conditions': 'None',
                'emergency_contact_name': 'John Connor',
                'emergency_contact_phone': '555-0200'
            }
        }
        res = self.client.post('/api/v1/patients/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['patient_id'].startswith('P-'))
        pid = res.data['patient_id']

        # Verify audit log was created by post_save signal
        audit = AuditLog.objects.filter(user_identifier=pid).first()
        self.assertIsNotNone(audit)
        self.assertIn("New patient onboarded", audit.action)

    def test_appointment_booking_and_cancellation_signals(self):
        """Test appointment booking and single-click cancellation triggers real-time signal audit logs."""
        patient = Patient.objects.create(
            patient_id='P-999',
            full_name='Bruce Wayne',
            contact_phone='555-0100',
            contact_email='bruce@wayne.test',
            date_of_birth='1980-02-19'
        )
        slot = AppointmentSlot.objects.create(
            day='Tuesday',
            time_slot='10:00 AM - 11:00 AM',
            doctor_id='DOC-12345',
            status='Available'
        )

        # 1. Book Slot
        book_res = self.client.post('/api/v1/appointments/book/', {
            'slot_id': slot.id,
            'patient_id': patient.patient_id
        }, format='json')
        self.assertEqual(book_res.status_code, status.HTTP_200_OK)
        slot.refresh_from_db()
        self.assertEqual(slot.status, 'Booked')
        self.assertEqual(slot.patient, patient)

        # Verify booking signal audit log
        booking_audit = AuditLog.objects.filter(
            user_identifier=patient.patient_id, 
            action__contains='Appointment booked'
        ).first()
        self.assertIsNotNone(booking_audit)

        # Verify reminder alert was created
        alert = NotificationAlert.objects.filter(patient=patient).first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.alert_type, 'Reminder')

        # 2. Cancel Slot
        cancel_res = self.client.post('/api/v1/appointments/cancel/', {
            'slot_id': slot.id,
            'patient_id': patient.patient_id
        }, format='json')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        slot.refresh_from_db()
        self.assertEqual(slot.status, 'Available')
        self.assertIsNone(slot.patient)

        # Verify cancellation signal audit log
        cancel_audit = AuditLog.objects.filter(
            user_identifier=patient.patient_id,
            action__contains='Appointment cancelled'
        ).first()
        self.assertIsNotNone(cancel_audit)

    def test_consultation_and_prescription_signals(self):
        """Test consultation logging and digital prescription issuing with signals."""
        patient = Patient.objects.create(
            patient_id='P-888',
            full_name='Clark Kent',
            contact_phone='555-0300',
            contact_email='clark@dailyplanet.test',
            date_of_birth='1982-04-18'
        )

        # 1. Consultation
        c_res = self.client.post('/api/v1/consultations/', {
            'patient': patient.patient_id,
            'doctor_id': 'DOC-12345',
            'chief_complaint': 'Mild headache',
            'diagnosis': 'Eye strain',
            'clinical_notes': 'Prescribed rest and screen break'
        }, format='json')
        self.assertEqual(c_res.status_code, status.HTTP_201_CREATED)
        c_id = c_res.data['id']

        # Check consultation audit log
        c_audit = AuditLog.objects.filter(user_identifier='DOC-12345').first()
        self.assertIsNotNone(c_audit)
        self.assertIn('Clinical consultation recorded', c_audit.action)

        # 2. Prescription
        rx_res = self.client.post('/api/v1/prescriptions/', {
            'patient': patient.patient_id,
            'consultation': c_id,
            'medication_name': 'Paracetamol',
            'dosage': '500mg',
            'frequency': '1 tablet twice daily after meals',
            'duration_days': 3
        }, format='json')
        self.assertEqual(rx_res.status_code, status.HTTP_201_CREATED)

        # Check prescription audit log
        rx_audit = AuditLog.objects.filter(
            user_identifier=patient.patient_id,
            action__contains='Prescription issued'
        ).first()
        self.assertIsNotNone(rx_audit)

    def test_google_auth_endpoint(self):
        """Test Google authentication endpoint /api/v1/auth/google/ with provisioning."""
        # Encode a valid test JWT token payload
        payload = {
            'email': 'alex.morgan@gmail.com',
            'name': 'Alex Morgan',
            'sub': 'google-uid-998877'
        }
        test_token = jwt.encode(payload, 'test-secret-key-healio-32bytes-long!', algorithm='HS256')

        res = self.client.post('/api/v1/auth/google/', {
            'id_token': test_token,
            'role': 'patient'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'alex.morgan@gmail.com')
        self.assertEqual(res.data['role'], 'patient')
        self.assertTrue(res.data['patient_id'].startswith('P-'))
        self.assertTrue(res.data['token'].startswith('jwt-session-'))

        # Verify User was provisioned in PostgreSQL
        user = User.objects.filter(email='alex.morgan@gmail.com').first()
        self.assertIsNotNone(user)

        # Verify Patient record was provisioned
        patient = Patient.objects.filter(contact_email='alex.morgan@gmail.com').first()
        self.assertIsNotNone(patient)
        self.assertEqual(patient.patient_id, res.data['patient_id'])

        # Verify audit log recorded Google OAuth2
        google_audit = AuditLog.objects.filter(
            user_identifier='alex.morgan@gmail.com',
            action__contains='Google OAuth2 login successful'
        ).first()
        self.assertIsNotNone(google_audit)

    def test_security_endpoints(self):
        """Test API explorer catalog and notification status."""
        cat_res = self.client.get('/api/v1/endpoints/')
        self.assertEqual(cat_res.status_code, status.HTTP_200_OK)
        paths = [ep['path'] for ep in cat_res.data]
        self.assertIn('/api/v1/auth/google/', paths)
        self.assertIn('/api/v1/appointments/book/', paths)
        self.assertIn('/api/v1/audit-logs/', paths)

        status_res = self.client.get('/api/v1/notifications/status/')
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data['status'], 'active')

    def test_patient_user_registration(self):
        """Test POST /api/v1/patients/register-user/ creates User, Patient, and PatientProfile."""
        payload = {
            'full_name': 'Diana Prince',
            'contact_phone': '555-0144',
            'contact_email': 'diana@themyscira.test',
            'date_of_birth': '1992-03-22',
            'password': 'HeroPassword123!',
            'blood_group': 'O-',
            'gender': 'Female',
            'allergies': 'None',
            'chronic_conditions': 'None',
            'emergency_contact_name': 'Hippolyta',
            'emergency_contact_phone': '555-0999'
        }
        res = self.client.post('/api/v1/patients/register-user/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['patient_id'].startswith('P-'))
        self.assertEqual(res.data['email'], 'diana@themyscira.test')
        self.assertTrue(res.data['token'].startswith('bearer-token-'))

        # Check PostgreSQL records
        self.assertTrue(User.objects.filter(email='diana@themyscira.test').exists())
        patient = Patient.objects.filter(patient_id=res.data['patient_id']).first()
        self.assertIsNotNone(patient)
        self.assertEqual(patient.profile.blood_group, 'O-')
        self.assertEqual(patient.profile.emergency_contact_name, 'Hippolyta')

    def test_google_auth_profile_payload(self):
        """Test Google authentication using direct userinfo profile payload from authentic GIS popup."""
        payload = {
            'email': 'direct.google@example.com',
            'name': 'Google Direct User',
            'sub': 'sub-google-112233',
            'role': 'patient'
        }
        res = self.client.post('/api/v1/auth/google/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'direct.google@example.com')
        self.assertTrue(res.data['patient_id'].startswith('P-'))
        self.assertTrue(res.data['token'].startswith('jwt-session-'))

    def test_doctor_dashboard_summary_endpoint(self):
        """Test GET /api/v1/doctor/dashboard-summary/?doctor_id=... returns unified doctor payload."""
        res = self.client.get('/api/v1/doctor/dashboard-summary/?doctor_id=DOC-12345')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('doctor', res.data)
        self.assertIn('roster', res.data)
        self.assertIn('pending_consultations', res.data)
        self.assertIn('timetable', res.data)
        self.assertIn('stats', res.data)
        self.assertEqual(res.data['doctor']['doctor_id'], 'DOC-12345')
        self.assertGreaterEqual(len(res.data['timetable']), 25)
        self.assertIn('total_patients', res.data['stats'])
        self.assertIn('today_appointments', res.data['stats'])

    def test_doctor_self_serve_registration(self):
        """Test POST /api/v1/doctors/register-user/ creates User, DoctorProfile, and seeds 25 5-day slots."""
        payload = {
            'full_name': 'Dr. Sarah Connor',
            'email': 'sarah.connor@healio.health',
            'password': 'StrongDoctorPass123!',
            'specialization': 'Emergency Medicine',
            'department': 'Trauma Center',
            'doctor_id': 'DOC-99001',
            'contact_phone': '555-0199'
        }
        res = self.client.post('/api/v1/doctors/register-user/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['role'], 'doctor')
        self.assertEqual(res.data['doctor_id'], 'DOC-99001')
        self.assertEqual(res.data['name'], 'Dr. Sarah Connor')
        self.assertEqual(res.data['email'], 'sarah.connor@healio.health')
        self.assertTrue(res.data['token'].startswith('bearer-token-'))

        # Verify PostgreSQL database state
        self.assertTrue(User.objects.filter(email='sarah.connor@healio.health').exists())
        from clinical.models import DoctorProfile
        profile = DoctorProfile.objects.filter(doctor_id='DOC-99001').first()
        self.assertIsNotNone(profile)
        self.assertEqual(profile.specialization, 'Emergency Medicine')
        self.assertEqual(profile.department, 'Trauma Center')

        # Verify 5-day timetable auto-provisioning
        slots = AppointmentSlot.objects.filter(doctor_id='DOC-99001')
        self.assertEqual(slots.count(), 25)
        days = set(slots.values_list('day', flat=True))
        self.assertEqual(days, {'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'})

    def test_doctor_id_database_indexing(self):
        """Verify db_index=True is active on doctor_id across AppointmentSlot, Consultation, Prescription."""
        slot_field = AppointmentSlot._meta.get_field('doctor_id')
        self.assertTrue(slot_field.db_index)

        consultation_field = Consultation._meta.get_field('doctor_id')
        self.assertTrue(consultation_field.db_index)

        prescription_field = Prescription._meta.get_field('doctor_id')
        self.assertTrue(prescription_field.db_index)
