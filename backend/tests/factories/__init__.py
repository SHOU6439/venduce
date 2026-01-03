"""Factory module for creating test data.

Factories use factory_boy to create model instances for testing.

Usage:
    from tests.factories import UserFactory, RefreshTokenFactory
    
    user = UserFactory(email="test@example.com", is_confirmed=True)
    refresh_token = RefreshTokenFactory(user=user)
"""

from .user import UserFactory
from .refresh_token import RefreshTokenFactory
from .asset_factory import AssetFactory

__all__ = ["UserFactory", "RefreshTokenFactory", "AssetFactory"]
