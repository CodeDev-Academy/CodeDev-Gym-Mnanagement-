from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    is_owner = serializers.BooleanField(read_only=True)
    is_front_desk = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'is_owner',
            'is_front_desk',
            'is_active',
        ]
        read_only_fields = ['id', 'is_active', 'is_owner', 'is_front_desk']


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError({'detail': 'Invalid username or password.'})

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This user account is inactive.'})

        attrs['user'] = user
        return attrs
