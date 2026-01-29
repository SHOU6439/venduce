import pytest
from app.services.product_service import ProductService
from app.schemas.product import ProductCreate
from tests.factories import ProductFactory, AssetFactory


product_service = ProductService()


def test_create_product_success_without_assets(db_session):
    """Create a product without assets."""
    payload = ProductCreate(
        title="Test Product",
        sku="TEST-SKU-001",
        description="Test description",
        price_cents=10000,
        currency="JPY",
        stock_quantity=10,
        asset_ids=[],
    )
    
    product = product_service.create_product(db_session, payload=payload)
    
    assert product.id is not None
    assert product.title == "Test Product"
    assert product.sku == "TEST-SKU-001"
    assert product.description == "Test description"
    assert product.price_cents == 10000
    assert product.currency == "JPY"
    assert product.stock_quantity == 10
    assert len(product.assets) == 0


def test_create_product_success_with_single_asset(db_session):
    """Create a product with a single asset."""
    asset = AssetFactory()
    db_session.add(asset)
    db_session.commit()
    
    payload = ProductCreate(
        title="Test Product",
        sku="TEST-SKU-002",
        description="Test description",
        price_cents=10000,
        currency="JPY",
        stock_quantity=10,
        asset_ids=[asset.id],
    )
    
    product = product_service.create_product(db_session, payload=payload)
    
    assert product.id is not None
    assert product.title == "Test Product"
    assert len(product.assets) == 1
    assert product.assets[0].id == asset.id
    assert product.assets[0].public_url == asset.public_url


def test_create_product_success_with_multiple_assets(db_session):
    """Create a product with multiple assets."""
    asset1 = AssetFactory()
    asset2 = AssetFactory()
    asset3 = AssetFactory()
    db_session.add_all([asset1, asset2, asset3])
    db_session.commit()
    
    payload = ProductCreate(
        title="Test Product",
        sku="TEST-SKU-003",
        description="Test description",
        price_cents=10000,
        currency="JPY",
        stock_quantity=10,
        asset_ids=[asset1.id, asset2.id, asset3.id],
    )
    
    product = product_service.create_product(db_session, payload=payload)
    
    assert product.id is not None
    assert len(product.assets) == 3
    asset_ids = {a.id for a in product.assets}
    assert asset_ids == {asset1.id, asset2.id, asset3.id}
    asset_urls = {a.public_url for a in product.assets}
    assert len(asset_urls) == 3


def test_create_product_with_invalid_asset_id(db_session):
    """Attempt to create a product with an invalid asset ID."""
    payload = ProductCreate(
        title="Test Product",
        sku="TEST-SKU-004",
        description="Test description",
        price_cents=10000,
        currency="JPY",
        stock_quantity=10,
        asset_ids=["invalid-asset-id"],
    )
    
    with pytest.raises(ValueError, match="Some assets not found"):
        product_service.create_product(db_session, payload=payload)


def test_create_product_with_partial_invalid_assets(db_session):
    """Attempt to create a product with some invalid asset IDs."""
    asset = AssetFactory()
    db_session.add(asset)
    db_session.commit()
    
    payload = ProductCreate(
        title="Test Product",
        sku="TEST-SKU-005",
        description="Test description",
        price_cents=10000,
        currency="JPY",
        stock_quantity=10,
        asset_ids=[asset.id, "invalid-asset-id"],
    )
    
    with pytest.raises(ValueError, match="Some assets not found"):
        product_service.create_product(db_session, payload=payload)


def test_create_product_duplicate_sku(db_session):
    """Attempt to create a product with duplicate SKU."""
    payload1 = ProductCreate(
        title="Product 1",
        sku="UNIQUE-SKU",
        price_cents=1000,
        stock_quantity=10,
    )
    product_service.create_product(db_session, payload=payload1)
    
    payload2 = ProductCreate(
        title="Product 2",
        sku="UNIQUE-SKU",
        price_cents=2000,
        stock_quantity=20,
    )
    
    with pytest.raises(ValueError, match="sku already exists"):
        product_service.create_product(db_session, payload=payload2)


def test_create_product_sku_case_insensitive(db_session):
    """Create products with different case SKUs (should be treated as identical)."""
    payload1 = ProductCreate(
        title="Product 1",
        sku="unique-sku",
        price_cents=1000,
        stock_quantity=10,
    )
    product1 = product_service.create_product(db_session, payload=payload1)
    assert product1.sku == "UNIQUE-SKU"
    
    payload2 = ProductCreate(
        title="Product 2",
        sku="UNIQUE-SKU",
        price_cents=2000,
        stock_quantity=20,
    )
    
    with pytest.raises(ValueError, match="sku already exists"):
        product_service.create_product(db_session, payload=payload2)


def test_create_product_with_assets_preserves_order(db_session):
    """Verify that asset order is preserved when creating a product."""
    asset1 = AssetFactory()
    asset2 = AssetFactory()
    asset3 = AssetFactory()
    db_session.add_all([asset1, asset2, asset3])
    db_session.commit()
    
    payload = ProductCreate(
        title="Test Product",
        sku="TEST-SKU-007",
        price_cents=10000,
        stock_quantity=10,
        asset_ids=[asset1.id, asset2.id, asset3.id],
    )
    
    product = product_service.create_product(db_session, payload=payload)
    
    assert len(product.assets) == 3
    asset_ids = [a.id for a in product.assets]
    assert asset1.id in asset_ids
    assert asset2.id in asset_ids
    assert asset3.id in asset_ids
