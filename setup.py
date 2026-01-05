#!/usr/bin/env python3
"""
Cross-platform setup script for Venduce project.
Handles environment file setup and JWT key generation.

Usage:
    python setup.py env    # Setup environment files
    python setup.py keys   # Generate JWT keys
"""

import os
import sys
import shutil
import subprocess
import re
from pathlib import Path


def setup_env_files():
    """Setup .env and frontend/.env.local files from examples."""
    print("環境ファイルをセットアップ中...")

    env_file = Path(".env")
    env_example = Path(".env.example")

    if not env_file.exists():
        if env_example.exists():
            print(f"'.env' が見つかりません。'.env.example' をコピーして作成します...")
            shutil.copy(env_example, env_file)
            print(f"✓ {env_file} を作成しました")
        else:
            print(f"警告: {env_example} が見つかりません")
    else:
        print(f"✓ {env_file} は既に存在します")

    frontend_dir = Path("frontend")
    if frontend_dir.exists() and frontend_dir.is_dir():
        frontend_env = frontend_dir / ".env.local"
        frontend_example = frontend_dir / ".env.local.example"

        if not frontend_env.exists():
            if frontend_example.exists():
                print(f"'frontend/.env.local' が見つかりません。'frontend/.env.local.example' をコピーして作成します...")
                shutil.copy(frontend_example, frontend_env)
                print(f"✓ {frontend_env} を作成しました")
            else:
                print(f"警告: {frontend_example} が見つかりません")
        else:
            print(f"✓ {frontend_env} は既に存在します")

    print("環境ファイルのセットアップが完了しました！")


def read_env_value(key, env_file=".env"):
    """Read a value from .env file."""
    env_path = Path(env_file)
    if not env_path.exists():
        return None

    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith(f"{key}="):
                value = line.split('=', 1)[1]
                value = value.strip('"').strip("'")
                return value
    return None


def update_env_value(key, value, env_file=".env"):
    """Update or add a key-value pair in .env file."""
    env_path = Path(env_file)
    if not env_path.exists():
        print(f"エラー: {env_file} が見つかりません")
        return False

    with open(env_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    key_found = False
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            key_found = True
            break

    if not key_found:
        lines.append(f"{key}={value}\n")

    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    return True


def generate_jwt_keys():
    """Generate JWT RSA keys if needed."""
    print("JWT鍵の設定を確認中...")

    jwt_alg = read_env_value("JWT_ALGORITHM") or "RS256"

    if jwt_alg != "RS256":
        print(f"JWT_ALGORITHM は {jwt_alg} です。RS256 でない場合は .env の設定を確認してください。")
        return

    has_private_path = read_env_value("JWT_PRIVATE_KEY_PATH")
    has_private_inline = read_env_value("JWT_PRIVATE_KEY")
    if has_private_path and has_private_path not in ['', '""']:
        host_key_path = Path("backend") / has_private_path
        if host_key_path.exists():
            print(f".env に JWT_PRIVATE_KEY_PATH が設定されており、鍵ファイルも存在します ({host_key_path})。")
            return
        else:
            print(f"警告: .env に JWT_PRIVATE_KEY_PATH ({has_private_path}) が設定されていますが、")
            print(f"      ホスト上にファイルが見つかりません ({host_key_path})。再生成を試みます...")

    if has_private_inline and has_private_inline not in ['', '""']:
        print(".env に既に JWT_PRIVATE_KEY が設定されています。鍵の生成はスキップします。")
        return

    print("RS256 鍵が .env に設定されていないため、RSA 鍵を生成して backend/keys に保存します...")

    keys_dir = Path("backend/keys")
    keys_dir.mkdir(parents=True, exist_ok=True)

    private_key_path = keys_dir / "private.pem"
    public_key_path = keys_dir / "public.pem"

    try:
        print("秘密鍵を生成中...")
        subprocess.run([
            "docker", "compose", "run", "--rm", "--no-deps", "backend",
            "openssl", "genpkey",
            "-algorithm", "RSA",
            "-out", "keys/private.pem",
            "-pkeyopt", "rsa_keygen_bits:2048"
        ], check=True, capture_output=True)

        print("公開鍵を生成中...")
        subprocess.run([
            "docker", "compose", "run", "--rm", "--no-deps", "backend",
            "openssl", "rsa",
            "-in", "keys/private.pem",
            "-pubout",
            "-out", "keys/public.pem"
        ], check=True, capture_output=True)

        print(f"✓ RSA鍵ペアを生成しました:")
        print(f"  - {private_key_path}")
        print(f"  - {public_key_path}")

        update_env_value("JWT_PRIVATE_KEY_PATH", "keys/private.pem")
        update_env_value("JWT_PUBLIC_KEY_PATH", "keys/public.pem")

        print("✓ .env に鍵パスを設定しました")

    except subprocess.CalledProcessError as e:
        print(f"エラー: コマンドの実行に失敗しました")
        print(f"stderr: {e.stderr.decode() if e.stderr else 'N/A'}")
        print("\nDockerが起動しているか確認してください。")
        sys.exit(1)
    except FileNotFoundError:
        print("エラー: docker コマンドが見つかりません")
        print("\nDockerをインストールしてください。")
        sys.exit(1)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("使い方: python setup.py [env|keys]")
        print("  env  - 環境ファイルをセットアップ")
        print("  keys - JWT鍵を生成")
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "env":
        setup_env_files()
    elif command == "keys":
        generate_jwt_keys()
    else:
        print(f"エラー: 不明なコマンド '{command}'")
        print("使い方: python setup.py [env|keys]")
        sys.exit(1)


if __name__ == "__main__":
    main()
