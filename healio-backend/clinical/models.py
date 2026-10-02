from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile', null=True, blank=True)
    doctor_id = models.CharField(max_length=20, unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    clinical_email = models.EmailField()
    specialization = models.CharField(max_length=100, default='General Practice')
    department = models.CharField(max_length=100, default='Clinical Outpatient')
    contact_phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.doctor_id} - {self.full_name} ({self.specialization})"

class Patient(models.Model):
    patient_id = models.CharField(max_length=20, unique=True, primary_key=True)
    full_name = models.CharField(max_length=150)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField()
    date_of_birth = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient_id} - {self.full_name}"

class PatientProfile(models.Model):
    BLOOD_GROUPS = (
        ('A+', 'A+'), ('O+', 'O+'), ('B+', 'B+'), ('AB+', 'AB+'),
        ('A-', 'A-'), ('O-', 'O-'), ('B-', 'B-'), ('AB-', 'AB-')
    )
    GENDER_CHOICES = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other')
    )
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='profile')
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUPS, default='O+')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='Male')
    allergies = models.TextField(blank=True, default='None reported')
    chronic_conditions = models.TextField(blank=True, default='None')
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"Profile of {self.patient.patient_id}"

class AppointmentSlot(models.Model):
    STATUS_CHOICES = (
        ('Available', 'Available'),
        ('Booked', 'Booked'),
    )
    day = models.CharField(max_length=15)
    time_slot = models.CharField(max_length=40)
    doctor_id = models.CharField(max_length=20, default='12345', db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Available')

    class Meta:
        unique_together = ('day', 'time_slot', 'doctor_id')

    def __str__(self):
        return f"{self.day} {self.time_slot} [{self.status}]"

class Consultation(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consultations')
    doctor_id = models.CharField(max_length=20, default='12345', db_index=True)
    consultation_date = models.DateTimeField(auto_now_add=True)
    chief_complaint = models.TextField()
    diagnosis = models.TextField()
    clinical_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Consultation {self.id} - {self.patient.patient_id}"

class Prescription(models.Model):
    consultation = models.ForeignKey(Consultation, on_delete=models.SET_NULL, null=True, blank=True, related_name='prescriptions')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='prescriptions')
    doctor_id = models.CharField(max_length=20, default='12345', db_index=True)
    medication_name = models.CharField(max_length=150)
    dosage = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50)
    duration_days = models.IntegerField(default=7)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medication_name} ({self.dosage}) for {self.patient.patient_id}"

class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    user_identifier = models.CharField(max_length=50)
    action = models.CharField(max_length=255)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.timestamp} - {self.user_identifier}: {self.action}"

class NotificationAlert(models.Model):
    ALERT_TYPES = (
        ('Reminder', 'Appointment Reminder'),
        ('Prescription', 'Prescription Renewal'),
        ('FollowUp', 'Follow-up Alert'),
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='notifications')
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    message = models.TextField()
    is_sent = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

from django.db.models.signals import post_save, pre_save

# Automated Audit Logging Signals
@receiver(post_save, sender=Patient)
def log_patient_creation(sender, instance, created, **kwargs):
    if created:
        AuditLog.objects.create(
            user_identifier=instance.patient_id,
            action=f"New patient onboarded: {instance.full_name} ({instance.patient_id})"
        )

@receiver(pre_save, sender=AppointmentSlot)
def track_slot_previous_state(sender, instance, **kwargs):
    if instance.pk:
        prev = AppointmentSlot.objects.filter(pk=instance.pk).first()
        if prev:
            instance._prev_status = prev.status
            instance._prev_patient_id = prev.patient.patient_id if prev.patient else None
        else:
            instance._prev_status = None
            instance._prev_patient_id = None
    else:
        instance._prev_status = None
        instance._prev_patient_id = None

@receiver(post_save, sender=AppointmentSlot)
def log_appointment_slot_changes(sender, instance, created, **kwargs):
    prev_status = getattr(instance, '_prev_status', None)
    prev_patient_id = getattr(instance, '_prev_patient_id', None)

    # Booking event: status changed to 'Booked'
    if instance.status == 'Booked' and (created or prev_status != 'Booked'):
        patient_id = instance.patient.patient_id if instance.patient else 'PATIENT'
        AuditLog.objects.create(
            user_identifier=patient_id,
            action=f"Appointment booked for {instance.day} at {instance.time_slot} (Doctor: {instance.doctor_id})"
        )
    # Cancellation event: status changed from 'Booked' to 'Available'
    elif prev_status == 'Booked' and instance.status == 'Available':
        patient_id = prev_patient_id or (instance.patient.patient_id if instance.patient else 'PATIENT')
        AuditLog.objects.create(
            user_identifier=patient_id,
            action=f"Appointment cancelled for slot #{instance.id} ({instance.day}, {instance.time_slot}) by patient {patient_id}"
        )

@receiver(post_save, sender=Consultation)
def log_consultation_creation(sender, instance, created, **kwargs):
    if created:
        AuditLog.objects.create(
            user_identifier=instance.doctor_id,
            action=f"Clinical consultation recorded for patient {instance.patient.patient_id}: {instance.diagnosis}"
        )

@receiver(post_save, sender=Prescription)
def log_prescription_creation(sender, instance, created, **kwargs):
    if created:
        AuditLog.objects.create(
            user_identifier=instance.patient.patient_id,
            action=f"Prescription issued: {instance.medication_name} ({instance.dosage}) for {instance.duration_days} days"
        )