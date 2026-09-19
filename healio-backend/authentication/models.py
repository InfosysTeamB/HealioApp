from django.db import models
from django.utils import timezone
import datetime

class EmailOTP(models.Model):
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def is_valid(self):
        # 15 minutes window with safe timezone-aware timestamp comparison
        if not self.created_at:
            return True
        diff = timezone.now() - self.created_at
        return 0 <= diff.total_seconds() < 900  # 15 minutes (900 seconds)

    def __str__(self):
        return f"{self.email} - {self.otp_code}"