import random
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
from .models import EmailOTP
from clinical.models import DoctorProfile

DEFAULT_DOCTOR_EMAIL = "dr.ramesh.rao@healio.health"


class SendOTPView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Default Doctor Bypass (Provides immediate reliable demo key)
        if email == DEFAULT_DOCTOR_EMAIL:
            otp_code = "1234"
            EmailOTP.objects.create(email=email, otp_code=otp_code)
            return Response({
                'message': 'Doctor test credentials verified. Passkey ready.',
                'otp': otp_code
            }, status=status.HTTP_200_OK)

        # 2. Dynamic 4-digit code generation for general users / patients
        otp_code = str(random.randint(1000, 9999))
        EmailOTP.objects.create(email=email, otp_code=otp_code)

        # 3. Deliver verification email to ANY address via Gmail SMTP
        subject = "Your Healio Verification Passkey"
        message = f"Welcome to Healio.\n\nYour one-time verification code is: {otp_code}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nHealio Healthcare Team"
        html_message = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #0284c7;">Welcome to Healio</h2>
                <p>Use the verification passkey below to complete your login:</p>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px 0; color: #0f172a;">
                    {otp_code}
                </div>
                <p style="color: #64748b; font-size: 13px;">This code will expire in 5 minutes.</p>
                <br>
                <p style="color: #334155; font-size: 14px;">Best regards,<br><strong>Healio Healthcare Team</strong></p>
            </div>
        """

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
            print(f"[SUCCESS]: Email sent successfully to {email}")
        except Exception as e:
            print(f"[GMAIL SMTP ERROR]: {e}")

        return Response({
            'message': 'OTP sent successfully',
            'otp': otp_code  # Retained in payload for instant test visibility
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp_code = request.data.get('otp', '').strip()

        if not email or not otp_code:
            return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve the latest unverified OTP
        record = EmailOTP.objects.filter(
            email=email,
            otp_code=otp_code,
            is_verified=False
        ).order_by('-id').first()

        if not record:
            return Response({'error': 'Invalid verification code. Please check again.'}, status=status.HTTP_400_BAD_REQUEST)

        if not record.is_valid():
            return Response({'error': 'Passkey has expired. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        record.is_verified = True
        record.save()

        # Dynamic check in DoctorProfile table by clinical_email or associated user email
        doctor_record = DoctorProfile.objects.filter(
            Q(clinical_email__iexact=email) | Q(user__email__iexact=email)
        ).first()

        if doctor_record:
            doc_email = doctor_record.clinical_email or (doctor_record.user.email if doctor_record.user else email)
            return Response({
                'message': 'Verified successfully',
                'role': 'doctor',
                'token': f'healio-doctor-token-{doctor_record.id}',
                'doctor': {
                    'doctorId': getattr(doctor_record, 'doctor_id', f'DOC-{doctor_record.id}'),
                    'name': doctor_record.full_name,
                    'email': doc_email,
                    'phone': getattr(doctor_record, 'contact_phone', ''),
                    'specialization': getattr(doctor_record, 'specialization', 'Cardiologist'),
                    'clinic': getattr(doctor_record, 'department', 'Apollo Cradle Clinic'),
                    'role': 'doctor'
                }
            }, status=status.HTTP_200_OK)

        # Default Patient Response
        return Response({
            'message': 'Verified successfully',
            'role': 'patient',
            'token': f'healio-session-{record.id}',
            'user': {
                'email': email,
                'role': 'patient'
            }
        }, status=status.HTTP_200_OK)