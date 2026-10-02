from rest_framework import serializers
from .models import (
    Patient, 
    PatientProfile, 
    DoctorProfile, 
    AppointmentSlot, 
    Consultation, 
    Prescription, 
    AuditLog, 
    NotificationAlert
)

class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = '__all__'

class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ['blood_group', 'gender', 'allergies', 'chronic_conditions', 'emergency_contact_name', 'emergency_contact_phone']

class PatientSerializer(serializers.ModelSerializer):
    profile = PatientProfileSerializer(required=False)

    class Meta:
        model = Patient
        fields = ['patient_id', 'full_name', 'contact_phone', 'contact_email', 'date_of_birth', 'created_at', 'profile']

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        patient = Patient.objects.create(**validated_data)
        PatientProfile.objects.create(patient=patient, **profile_data)
        return patient

class AppointmentSlotSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True, default='')
    patient_email = serializers.CharField(source='patient.contact_email', read_only=True, default='')
    patient_phone = serializers.CharField(source='patient.contact_phone', read_only=True, default='')

    class Meta:
        model = AppointmentSlot
        fields = '__all__'

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = '__all__'

class ConsultationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True, default='')
    prescriptions = PrescriptionSerializer(many=True, read_only=True)

    class Meta:
        model = Consultation
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    formatted_time = serializers.DateTimeField(source='timestamp', format='%Y-%m-%d %H:%M:%S', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'formatted_time', 'user_identifier', 'action']

class NotificationAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationAlert
        fields = '__all__'