from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User
from .permissions import IsOwnerUser
from .serializers import (
    ChangePasswordSerializer,
    CreateStaffSerializer,
    LoginSerializer,
    OwnerResetStaffPasswordSerializer,
    StaffListSerializer,
    UserProfileSerializer,
    UserSerializer,
)



class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user).data

        return Response({
            'token': token.key,
            'user': user_data,
        }, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)


class StaffListView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def get(self, request):
        staff = User.objects.filter(role='FRONT_DESK').order_by('-date_joined')
        serializer = StaffListSerializer(staff, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        staff_user = serializer.save()
        return Response(StaffListSerializer(staff_user).data, status=status.HTTP_201_CREATED)


class StaffResetPasswordView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk, role='FRONT_DESK')
        serializer = OwnerResetStaffPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response(
            {'detail': f"Password for staff member '{user.username}' has been reset successfully."},
            status=status.HTTP_200_OK
        )


class StaffToggleStatusView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk, role='FRONT_DESK')
        user.is_active = not user.is_active
        user.save()
        action = 'activated' if user.is_active else 'deactivated'
        return Response(
            {
                'detail': f"Staff member '{user.username}' has been {action}.",
                'staff': StaffListSerializer(user).data
            },
            status=status.HTTP_200_OK
        )

