import random
import os
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import EmailOTP
from clinical.models import DoctorProfile

DEFAULT_DOCTOR_EMAIL = "dr.ramesh.rao@healio.health"


def send_otp_via_brevo(email, otp_code):
    brevo_key = os.environ.get('BREVO_API_KEY')
    if not brevo_key:
        print("[BREVO WARNING]: BREVO_API_KEY environment variable not set.")
        return

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": brevo_key,
        "content-type": "application/json"
    }
    payload = {
        "sender": {
            "name": "Healio Health",
            "email": "harshithanamala04@gmail.com"
        },
        "to": [
            {"email": email}
        ],
        "subject": "Your Healio Verification Passkey",
        "htmlContent": f"""
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 480px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0284c7; margin-top: 0;">Welcome to Healio</h2>
                <p style="font-size: 15px;">Use the verification passkey below to complete your login:</p>
                <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 16px 0; color: #0f172a; text-align: center;">
                    {otp_code}
                </div>
                <p style="color: #64748b; font-size: 13px;">This code will expire in 5 minutes.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #334155; font-size: 13px; margin-bottom: 0;">Best regards,<br><strong>Healio Healthcare Team</strong></p>
            </div>
        """
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=8)
        print(f"[BREVO RESPONSE {response.status_code}]: {response.text}")
    except Exception as exc:
        print(f"[BREVO DISPATCH ERROR]: {exc}")


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

        # 3. Deliver verification email directly via Brevo HTTPS API
        send_otp_via_brevo(email, otp_code)

        return Response({
            'message': 'OTP sent successfully',
            'otp': otp_code  # Retained in payload for testing/evaluation backup
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