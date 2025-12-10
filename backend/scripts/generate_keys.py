from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from pathlib import Path


def generate_keys():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    pem_private = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    public_key = private_key.public_key()

    pem_public = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    keys_dir = Path("keys")
    keys_dir.mkdir(exist_ok=True)

    (keys_dir / "private.pem").write_bytes(pem_private)
    (keys_dir / "public.pem").write_bytes(pem_public)

    print(f"Keys generated in {keys_dir.absolute()}")


if __name__ == "__main__":
    generate_keys()
