from django.contrib import admin
from django.urls import path, include
from clinical.views import (
    PatientListCreateView,
    PatientUserRegistrationView,
    SlotListView,
    BookSlotView,
    CancelSlotView,
    ConsultationListCreateView,
    PrescriptionListCreateView,
    LoginView,
    GoogleLoginView,
    AuditLogListView,
    NotificationStatusView,
    ApiEndpointCatalogView,
    DoctorDashboardSummaryView,
    DoctorUserRegistrationView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/login/', LoginView.as_view()),
    path('api/v1/auth/google/', GoogleLoginView.as_view()),
    path('api/v1/patients/', PatientListCreateView.as_view()),
    path('api/v1/patients/register-user/', PatientUserRegistrationView.as_view()),
    path('api/v1/appointments/', SlotListView.as_view()),
    path('api/v1/appointments/book/', BookSlotView.as_view()),
    path('api/v1/appointments/cancel/', CancelSlotView.as_view()),
    path('api/v1/consultations/', ConsultationListCreateView.as_view()),
    path('api/v1/prescriptions/', PrescriptionListCreateView.as_view()),
    path('api/v1/doctor/dashboard-summary/', DoctorDashboardSummaryView.as_view()),
    path('api/v1/doctor/slots/', SlotListView.as_view()),
    path('api/v1/doctors/register-user/', DoctorUserRegistrationView.as_view()),
    path('api/v1/doctor/register/', DoctorUserRegistrationView.as_view()),
    path('api/v1/audit-logs/', AuditLogListView.as_view()),
    path('api/v1/notifications/status/', NotificationStatusView.as_view()),
    path('api/v1/endpoints/', ApiEndpointCatalogView.as_view()),
    path('api/auth/', include('authentication.urls')),
]
