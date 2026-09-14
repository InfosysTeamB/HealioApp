from django.db import models

class Patient(models.Model):
    patient_id = models.CharField(max_length=20, unique=True, primary_key=True)
    full_name = models.CharField(max_length=150)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField()
    date_of_birth = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient_id} - {self.full_name}"

class AppointmentSlot(models.Model):
    STATUS_CHOICES = (
        ('Available', 'Available'),
        ('Booked', 'Booked'),
    )
    
    DAY_CHOICES = (
        ('Monday', 'Monday'),
        ('Tuesday', 'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'),
        ('Friday', 'Friday'),
    )

    day = models.CharField(max_length=15, choices=DAY_CHOICES)
    time_slot = models.CharField(max_length=40) # e.g. "09:00 AM - 10:00 AM"
    doctor_id = models.CharField(max_length=20, default='12345')
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Available')

    class Meta:
        unique_together = ('day', 'time_slot', 'doctor_id')

    def __str__(self):
        return f"{self.day} {self.time_slot} [{self.status}]"