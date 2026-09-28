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
            'phone_number',
            'avatar',
            'bio',
            'is_active',
        ]
        read_only_fields = ['id', 'is_active', 'is_owner', 'is_front_desk']


class UserProfileSerializer(serializers.ModelSerializer):
    is_owner = serializers.BooleanField(read_only=True)
    is_front_desk = serializers.BooleanField(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'is_owner',
            'is_front_desk',
            'phone_number',
            'avatar',
            'bio',
            'date_joined',
        ]
        read_only_fields = ['id', 'role', 'is_owner', 'is_front_desk', 'date_joined']

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username

    def validate_username(self, value):
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'New passwords do not match.'})
        from django.contrib.auth.password_validation import validate_password
        user = self.context['request'].user
        validate_password(attrs['new_password'], user=user)
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


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
