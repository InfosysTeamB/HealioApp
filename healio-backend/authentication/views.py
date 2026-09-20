import random
import os
import resend
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.db.models import Q
from .models import EmailOTP
from clinical.models import DoctorProfile


class SendOTPView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = str(random.randint(1000, 9999))
        EmailOTP.objects.create(email=email, otp_code=otp_code)

        # Dispatch via Resend HTTP API (works over port 443 on Render)
        resend_key = os.environ.get('RESEND_API_KEY')
        if resend_key:
            resend.api_key = resend_key
            try:
                resend.Emails.send({
                    "from": "Healio <onboarding@resend.dev>",
                    "to": email,
                    "subject": "Your Healio Verification Passkey",
                    "html": f"""
                        <h2>Welcome to Healio</h2>
                        <p>Your one-time verification code is: <strong>{otp_code}</strong></p>
                        <p>This code will expire in 5 minutes.</p>
                        <br>
                        <p>Best regards,<br>Healio Healthcare Team</p>
                    """
                })
            except Exception as e:
                print(f"[RESEND ERROR]: {e}")
        else:
            print(f"[FALLBACK LOG] RESEND_API_KEY not found. Code for {email}: {otp_code}")

        return Response({
            'message': 'OTP sent successfully',
            'otp': otp_code  # Keep visible during testing; remove before final launch
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