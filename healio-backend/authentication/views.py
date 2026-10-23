import random
import os
import time
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import EmailOTP
from clinical.models import DoctorProfile

DEFAULT_DOCTOR_EMAIL = "dr.ramesh.rao@healio.health"

# In-memory OTP cache for seamless verification resilience
_IN_MEMORY_OTP_STORE = {}


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
    sender_email = os.environ.get('DEFAULT_FROM_EMAIL', 'harshithanamala04@gmail.com')
    if '<' in sender_email and '>' in sender_email:
        sender_email = sender_email.split('<')[-1].split('>')[0].strip()

    payload = {
        "sender": {
            "name": "Healio Health",
            "email": sender_email
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
            try:
                EmailOTP.objects.create(email=email, otp_code=otp_code)
            except Exception as exc:
                print(f"[OTP DB NOTICE]: {exc}")

            _IN_MEMORY_OTP_STORE[email] = {
                'otp': otp_code,
                'created_at': time.time()
            }

            return Response({
                'message': 'Doctor test credentials verified. Passkey ready.',
                'otp': otp_code,
                'dev_otp': otp_code
            }, status=status.HTTP_200_OK)

        # 2. Dynamic 4-digit code generation for general users / patients
        otp_code = str(random.randint(1000, 9999))
        try:
            EmailOTP.objects.create(email=email, otp_code=otp_code)
        except Exception as exc:
            print(f"[OTP DB NOTICE]: {exc}")

        # Backup memory store guarantees authentication even if remote DB is unreachable
        _IN_MEMORY_OTP_STORE[email] = {
            'otp': otp_code,
            'created_at': time.time()
        }

        # 3. Deliver verification email directly via Brevo HTTPS API
        send_otp_via_brevo(email, otp_code)

        return Response({
            'message': f'Verification passkey dispatched to {email}',
            'otp': otp_code,
            'dev_otp': otp_code
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp_code = request.data.get('otp', '').strip()

        if not email or not otp_code:
            return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

        is_verified_ok = False
        record_id = None

        # 1. Check in database first
        try:
            record = EmailOTP.objects.filter(
                email=email,
                otp_code=otp_code,
                is_verified=False
            ).order_by('-id').first()

            if record:
                if not record.is_valid():
                    return Response({'error': 'Passkey has expired. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)
                record.is_verified = True
                record.save()
                is_verified_ok = True
                record_id = record.id
        except Exception as db_err:
            print(f"[VERIFY OTP DB NOTICE]: {db_err}")

        # 2. Check in-memory store if DB was unreachable or unverified
        if not is_verified_ok:
            cached = _IN_MEMORY_OTP_STORE.get(email)
            if cached and cached.get('otp') == otp_code:
                # Valid for 5 minutes (300 seconds)
                if (time.time() - cached.get('created_at', 0)) <= 300:
                    is_verified_ok = True
                    record_id = f"session-{int(time.time())}"
                    _IN_MEMORY_OTP_STORE.pop(email, None)

        if not is_verified_ok:
            return Response({'error': 'Invalid verification code. Please check again.'}, status=status.HTTP_400_BAD_REQUEST)

        # Dynamic check in DoctorProfile table by clinical_email or associated user email
        doctor_record = None
        try:
            doctor_record = DoctorProfile.objects.filter(
                Q(clinical_email__iexact=email) | Q(user__email__iexact=email)
            ).first()
        except Exception as exc:
            print(f"[DOCTOR LOOKUP NOTICE]: {exc}")

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
            'token': f'healio-session-{record_id or int(time.time())}',
            'user': {
                'email': email,
                'role': 'patient'
            }
        }, status=status.HTTP_200_OK)