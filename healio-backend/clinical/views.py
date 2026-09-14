from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Patient, AppointmentSlot
from .serializers import PatientSerializer, AppointmentSlotSerializer

class PatientListCreateView(APIView):
    def get(self, request):
        patients = Patient.objects.all().order_by('-created_at')
        return Response(PatientSerializer(patients, many=True).data)

    def post(self, request):
        # Auto-generate next Patient ID: P-001, P-002...
        count = Patient.objects.count() + 1
        data = request.data.copy()
        data['patient_id'] = f"P-{str(count).zfill(3)}"

        serializer = PatientSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SlotListView(APIView):
    def get(self, request):
        # Seed default timetable if empty
        if not AppointmentSlot.objects.exists():
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            times = [
                '09:00 AM - 10:00 AM',
                '10:00 AM - 11:00 AM',
                '11:00 AM - 12:00 PM',
                '12:00 PM - 01:00 PM',
                '01:00 PM - 02:00 PM'
            ]
            for day in days:
                for t in times:
                    AppointmentSlot.objects.create(day=day, time_slot=t, doctor_id='12345')

        slots = AppointmentSlot.objects.all()
        return Response(AppointmentSlotSerializer(slots, many=True).data)

class BookSlotView(APIView):
    def post(self, request):
        slot_id = request.data.get('slot_id')
        patient_id = request.data.get('patient_id')

        try:
            slot = AppointmentSlot.objects.get(id=slot_id)
            if slot.status == 'Booked':
                return Response({'error': 'Slot already booked'}, status=status.HTTP_400_BAD_REQUEST)

            patient = Patient.objects.get(patient_id=patient_id)
            slot.patient = patient
            slot.status = 'Booked'
            slot.save()
            return Response(AppointmentSlotSerializer(slot).data, status=status.HTTP_200_OK)
        except (AppointmentSlot.DoesNotExist, Patient.DoesNotExist) as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)