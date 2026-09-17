import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from .models import EmailOTP

class SendOTPView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = str(random.randint(100000, 999999))
        EmailOTP.objects.create(email=email, otp_code=otp_code)

        subject = 'Your Healio Verification Passkey'
        message = (
            f"Welcome to Healio.\n\n"
            f"Your one-time verification code is: {otp_code}\n\n"
            f"This code will expire in 5 minutes."
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=None,
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({'message': 'OTP sent successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"\n--- EMAIL DISPATCH ERROR: {repr(e)} ---\n")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyOTPView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp_code = request.data.get('otp', '').strip()

        if not email or not otp_code:
            return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

        record = EmailOTP.objects.filter(email=email, otp_code=otp_code, is_verified=False).last()

        if record and record.is_valid():
            record.is_verified = True
            record.save()
            return Response({'message': 'Verified successfully', 'token': 'healio-session-active'}, status=status.HTTP_200_OK)

        return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)