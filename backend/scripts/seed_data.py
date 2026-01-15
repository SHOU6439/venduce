"""Seed script to generate realistic product data with categories and brands."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from uuid import uuid4
import random
import csv
import hashlib
from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product
from app.models.product_category import ProductCategory
from app.models.user import User
from app.models.tag import Tag
from app.models.post import Post
from app.models.asset import Asset
from app.models.enums import PostStatus
from app.core.security import hash_password

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://venduce_user:venduce_password@postgres:5432/venduce_db"
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

TAGS = [
    "トレンド", "おしゃれ", "可愛い", "かっこいい", "新商品",
    "セール", "限定", "推し活", "推しの子", "推しを推す",
    "美容", "スキンケア", "コスメ", "メイク", "ヘアケア",
    "ファッション", "コーデ", "着回し", "大人っぽい", "フェミニン",
    "グルメ", "カフェ", "スイーツ", "ランチ", "ディナー",
    "旅行", "国内旅行", "海外旅行", "観光", "温泉",
    "家電", "ガジェット", "テック", "IT", "スマート家電",
    "インテリア", "家具", "植物", "DIY", "模様替え",
    "スポーツ", "フィットネス", "ヨガ", "ジム", "トレーニング",
    "ペット", "犬", "猫", "うさぎ", "ハムスター",
    "子育て", "赤ちゃん", "キッズ", "親子コーデ", "育児用品",
    "ビジネス", "仕事", "キャリア", "スーツ", "デスク周り",
    "環境配慮", "エコ", "サステナブル", "オーガニック", "ナチュラル",
    "推しの推しを推す", "推し活支援", "推しグッズ", "推し活写真", "推し活動",
    "自撮り", "自撮り構図", "盛れるアングル", "映え", "インスタ映え",
]

POST_CAPTIONS = [
    "このアイテム、本当に好きです！✨",
    "今日のおすすめはこれ👍",
    "これ、めっちゃいいですよ！",
    "買ってから毎日使ってます😊",
    "この季節にぴったり🌸",
    "友達にも勧めちゃった💕",
    "コスパ最高です🤑",
    "品質が素晴らしい🎉",
    "リピート確定！",
    "初心者でも使いやすい👌",
]

CATEGORIES_HIERARCHICAL = {
    "ファッション": [
        {"name": "メンズファッション", "slug": "mens-fashion"},
        {"name": "レディースファッション", "slug": "womens-fashion"},
        {"name": "キッズファッション", "slug": "kids-fashion"},
        {"name": "シューズ", "slug": "shoes"},
        {"name": "アクセサリー", "slug": "accessories"},
    ],
    "エレクトロニクス": [
        {"name": "スマートフォン・タブレット", "slug": "smartphones-tablets"},
        {"name": "コンピュータ", "slug": "computers"},
        {"name": "オーディオ", "slug": "audio"},
        {"name": "カメラ・映像", "slug": "cameras-video"},
        {"name": "アクセサリー", "slug": "electronics-accessories"},
    ],
    "ビューティー": [
        {"name": "メイクアップ", "slug": "makeup"},
        {"name": "スキンケア", "slug": "skincare"},
        {"name": "ヘアケア", "slug": "haircare"},
        {"name": "ボディケア", "slug": "bodycare"},
        {"name": "香水・フレグランス", "slug": "fragrances"},
    ],
    "ホームアンドリビング": [
        {"name": "家具", "slug": "furniture"},
        {"name": "寝具", "slug": "bedding"},
        {"name": "キッチン用品", "slug": "kitchen"},
        {"name": "インテリア雑貨", "slug": "home-decor"},
        {"name": "照明", "slug": "lighting"},
    ],
    "スポーツアウトドア": [
        {"name": "スポーツシューズ", "slug": "sports-shoes"},
        {"name": "スポーツウェア", "slug": "sportswear"},
        {"name": "フィットネス機器", "slug": "fitness"},
        {"name": "アウトドア装備", "slug": "outdoor-gear"},
        {"name": "スポーツ用品", "slug": "sports-equipment"},
    ],
}

BRANDS_BY_CATEGORY = {
    "メンズファッション": [
        {"name": "ユニクロ", "slug": "uniqlo"},
        {"name": "GU", "slug": "gu"},
        {"name": "無印良品", "slug": "muji"},
        {"name": "ZARA", "slug": "zara"},
        {"name": "H&M", "slug": "h-m"},
    ],
    "レディースファッション": [
        {"name": "ユニクロ", "slug": "uniqlo"},
        {"name": "GU", "slug": "gu"},
        {"name": "無印良品", "slug": "muji"},
        {"name": "ZARA", "slug": "zara"},
        {"name": "H&M", "slug": "h-m"},
    ],
    "キッズファッション": [
        {"name": "ユニクロ", "slug": "uniqlo"},
        {"name": "GU", "slug": "gu"},
        {"name": "無印良品", "slug": "muji"},
        {"name": "ZARA", "slug": "zara"},
        {"name": "H&M", "slug": "h-m"},
    ],
    "シューズ": [
        {"name": "ナイキ", "slug": "nike"},
        {"name": "アディダス", "slug": "adidas"},
        {"name": "プーマ", "slug": "puma"},
        {"name": "アシックス", "slug": "asics"},
        {"name": "リーボック", "slug": "reebok"},
    ],
    "アクセサリー": [
        {"name": "無印良品", "slug": "muji"},
        {"name": "手作り市場", "slug": "handmade-market"},
        {"name": "セレッソ", "slug": "celesso"},
        {"name": "アニエスベー", "slug": "agnes-b"},
        {"name": "マルティニーク", "slug": "martinique"},
    ],
    "スマートフォン・タブレット": [
        {"name": "Apple", "slug": "apple"},
        {"name": "Samsung", "slug": "samsung"},
        {"name": "Google", "slug": "google"},
        {"name": "Sony", "slug": "sony"},
        {"name": "Lenovo", "slug": "lenovo"},
    ],
    "コンピュータ": [
        {"name": "Apple", "slug": "apple"},
        {"name": "Dell", "slug": "dell"},
        {"name": "HP", "slug": "hp"},
        {"name": "Lenovo", "slug": "lenovo"},
        {"name": "ASUS", "slug": "asus"},
    ],
    "オーディオ": [
        {"name": "Sony", "slug": "sony"},
        {"name": "Bose", "slug": "bose"},
        {"name": "Sennheiser", "slug": "sennheiser"},
        {"name": "JBL", "slug": "jbl"},
        {"name": "Beats", "slug": "beats"},
    ],
    "カメラ・映像": [
        {"name": "Canon", "slug": "canon"},
        {"name": "Nikon", "slug": "nikon"},
        {"name": "Sony", "slug": "sony"},
        {"name": "GoPro", "slug": "gopro"},
        {"name": "DJI", "slug": "dji"},
    ],
    "アクセサリー (電子)": [
        {"name": "Anker", "slug": "anker"},
        {"name": "Belkin", "slug": "belkin"},
        {"name": "Apple", "slug": "apple"},
        {"name": "Samsung", "slug": "samsung"},
        {"name": "Spigen", "slug": "spigen"},
    ],
    "メイクアップ": [
        {"name": "資生堂", "slug": "shiseido"},
        {"name": "COSME DECORTE", "slug": "cosme-decorte"},
        {"name": "Dior", "slug": "dior"},
        {"name": "MAC", "slug": "mac"},
        {"name": "RMK", "slug": "rmk"},
    ],
    "スキンケア": [
        {"name": "資生堂", "slug": "shiseido"},
        {"name": "SK-II", "slug": "sk-ii"},
        {"name": "ポーラ", "slug": "pola"},
        {"name": "DHC", "slug": "dhc"},
        {"name": "アルビオン", "slug": "albion"},
    ],
    "ヘアケア": [
        {"name": "花王", "slug": "kao"},
        {"name": "ライオン", "slug": "lion"},
        {"name": "P&G", "slug": "pg"},
        {"name": "資生堂", "slug": "shiseido"},
        {"name": "アムウェイ", "slug": "amway"},
    ],
    "ボディケア": [
        {"name": "資生堂", "slug": "shiseido"},
        {"name": "LUSH", "slug": "lush"},
        {"name": "ジョンソン", "slug": "johnson"},
        {"name": "ユースキン", "slug": "yuskin"},
        {"name": "ニベア", "slug": "nivea"},
    ],
    "香水・フレグランス": [
        {"name": "Dior", "slug": "dior"},
        {"name": "Chanel", "slug": "chanel"},
        {"name": "CHLOE", "slug": "chloe"},
        {"name": "GUERLAIN", "slug": "guerlain"},
        {"name": "Giorgio Armani", "slug": "giorgio-armani"},
    ],
    "家具": [
        {"name": "ニトリ", "slug": "nitori"},
        {"name": "IKEA", "slug": "ikea"},
        {"name": "ルミナス", "slug": "luminous"},
        {"name": "大塚家具", "slug": "otsuka-kagu"},
        {"name": "高木", "slug": "takagi"},
    ],
    "寝具": [
        {"name": "無印良品", "slug": "muji"},
        {"name": "ニトリ", "slug": "nitori"},
        {"name": "東京西川", "slug": "tokyo-nishikawa"},
        {"name": "イオン", "slug": "aeon"},
        {"name": "フランスベッド", "slug": "france-bed"},
    ],
    "キッチン用品": [
        {"name": "ティファール", "slug": "t-fal"},
        {"name": "シロカ", "slug": "siroca"},
        {"name": "象印", "slug": "zojirushi"},
        {"name": "タイガー", "slug": "tiger"},
        {"name": "貝印", "slug": "kai"},
    ],
    "インテリア雑貨": [
        {"name": "無印良品", "slug": "muji"},
        {"name": "ニトリ", "slug": "nitori"},
        {"name": "IKEA", "slug": "ikea"},
        {"name": "ビーズ", "slug": "beads"},
        {"name": "フライング タイガー", "slug": "flying-tiger"},
    ],
    "照明": [
        {"name": "パナソニック", "slug": "panasonic"},
        {"name": "東芝", "slug": "toshiba"},
        {"name": "Philips", "slug": "philips"},
        {"name": "オーデリック", "slug": "odelic"},
        {"name": "コイズミ", "slug": "koizumi"},
    ],
    "スポーツシューズ": [
        {"name": "ナイキ", "slug": "nike"},
        {"name": "アディダス", "slug": "adidas"},
        {"name": "プーマ", "slug": "puma"},
        {"name": "アシックス", "slug": "asics"},
        {"name": "ニューバランス", "slug": "new-balance"},
    ],
    "スポーツウェア": [
        {"name": "ナイキ", "slug": "nike"},
        {"name": "アディダス", "slug": "adidas"},
        {"name": "プーマ", "slug": "puma"},
        {"name": "ユニクロ", "slug": "uniqlo"},
        {"name": "アンダーアーマー", "slug": "under-armour"},
    ],
    "フィットネス機器": [
        {"name": "Fitbit", "slug": "fitbit"},
        {"name": "Garmin", "slug": "garmin"},
        {"name": "Technogym", "slug": "technogym"},
        {"name": "SOLE Fitness", "slug": "sole-fitness"},
        {"name": "NordicTrack", "slug": "nordictrack"},
    ],
    "アウトドア装備": [
        {"name": "モンベル", "slug": "montbell"},
        {"name": "ノースフェイス", "slug": "north-face"},
        {"name": "Coleman", "slug": "coleman"},
        {"name": "snow peak", "slug": "snow-peak"},
        {"name": "Osprey", "slug": "osprey"},
    ],
    "スポーツ用品": [
        {"name": "Molten", "slug": "molten"},
        {"name": "Spalding", "slug": "spalding"},
        {"name": "Wilson", "slug": "wilson"},
        {"name": "ダンロップ", "slug": "dunlop"},
        {"name": "Yonex", "slug": "yonex"},
    ],
}

PRODUCT_TEMPLATES = {
    "メンズファッション": [
        ("Tシャツ", 1500),
        ("ジーンズ", 5000),
        ("シャツ", 4500),
        ("セーター", 5500),
        ("ジャケット", 15000),
        ("パンツ", 4000),
        ("カーディガン", 5000),
        ("ポロシャツ", 3000),
        ("タンクトップ", 1000),
        ("ロングシャツ", 4500),
    ],
    "レディースファッション": [
        ("Tシャツ", 1500),
        ("ワンピース", 6000),
        ("ブラウス", 4500),
        ("スカート", 5000),
        ("ジーンズ", 5000),
        ("セーター", 5500),
        ("ジャケット", 15000),
        ("レギンス", 2500),
        ("カーディガン", 5000),
        ("シャツ", 4500),
    ],
    "キッズファッション": [
        ("Tシャツ", 1000),
        ("ジーンズ", 3500),
        ("ジャケット", 10000),
        ("セーター", 3500),
        ("シャツ", 2500),
        ("パンツ", 2500),
        ("ワンピース", 3500),
        ("カーディガン", 3000),
        ("ポロシャツ", 2000),
        ("スウェット", 2500),
    ],
    "シューズ": [
        ("ランニングシューズ", 8000),
        ("スニーカー", 7000),
        ("パンプス", 5000),
        ("ブーツ", 9000),
        ("サンダル", 3000),
        ("スリッパ", 2000),
        ("ローファー", 6000),
        ("ヒール", 5500),
        ("フラットシューズ", 4000),
        ("シューズ", 4500),
    ],
    "アクセサリー": [
        ("ベルト", 2000),
        ("スカーフ", 2500),
        ("帽子", 3500),
        ("キャップ", 2000),
        ("ネックレス", 3000),
        ("ブレスレット", 2500),
        ("ピアス", 2000),
        ("リング", 3000),
        ("時計", 10000),
        ("サングラス", 5000),
    ],
    "スマートフォン・タブレット": [
        ("iPhone 15", 120000),
        ("iPhone 15 Pro", 150000),
        ("iPad", 80000),
        ("iPad Pro", 120000),
        ("Galaxy S24", 110000),
        ("Google Pixel", 90000),
        ("Xperia", 100000),
        ("OnePlus", 70000),
        ("Samsung Galaxy Tab", 70000),
        ("Huawei MatePad", 60000),
    ],
    "コンピュータ": [
        ("MacBook Pro 16インチ", 280000),
        ("MacBook Pro 14インチ", 210000),
        ("MacBook Air M3", 170000),
        ("Dell XPS 15", 220000),
        ("HP Pavilion", 120000),
        ("Lenovo ThinkPad", 140000),
        ("ASUS VivoBook", 100000),
        ("MSI GS Stealth", 180000),
        ("Surface Laptop", 160000),
        ("iMac", 250000),
    ],
    "オーディオ": [
        ("AirPods Pro", 37000),
        ("AirPods Max", 60000),
        ("Sony WH-1000XM5", 45000),
        ("Bose QuietComfort", 50000),
        ("Sennheiser Momentum", 55000),
        ("JBL Flip", 15000),
        ("Beats Solo", 35000),
        ("Anker Soundcore", 8000),
        ("Marshall", 25000),
        ("Audio-Technica", 20000),
    ],
    "カメラ・映像": [
        ("Canon EOS R8", 260000),
        ("Nikon Z8", 280000),
        ("Sony A7R V", 300000),
        ("GoPro Hero 12", 60000),
        ("DJI Mavic 3", 300000),
        ("Canon EOS M50", 120000),
        ("Nikon Z50", 130000),
        ("Sony ZV-E1", 150000),
        ("Insta360", 50000),
        ("Fujifilm X-S20", 130000),
    ],
    "アクセサリー (電子)": [
        ("Apple Lightning ケーブル", 2000),
        ("USB-C ケーブル", 1500),
        ("ワイヤレス充電器", 5000),
        ("Power Bank", 8000),
        ("USB-C ハブ", 6000),
        ("MagSafe スタンド", 4000),
        ("スクリーン保護フィルム", 1500),
        ("スマホケース", 2500),
        ("イヤホン変換アダプタ", 1000),
        ("ノートパソコン冷却台", 4000),
    ],
    "メイクアップ": [
        ("ファンデーション", 4000),
        ("口紅", 2500),
        ("アイシャドウ パレット", 3000),
        ("マスカラ", 2000),
        ("BBクリーム", 3500),
        ("チーク", 2500),
        ("ハイライト", 3000),
        ("アイライナー", 2000),
        ("コンシーラー", 2500),
        ("ブロンザー", 3000),
    ],
    "スキンケア": [
        ("化粧水", 3000),
        ("美容液", 5000),
        ("乳液", 3500),
        ("クリーム", 4000),
        ("シートマスク", 500),
        ("パック", 2500),
        ("クレンジング", 2000),
        ("洗顔料", 1500),
        ("美容液オイル", 4000),
        ("アイクリーム", 3000),
    ],
    "ヘアケア": [
        ("シャンプー", 2000),
        ("コンディショナー", 2000),
        ("トリートメント", 2500),
        ("ヘアエッセンス", 2000),
        ("ヘアパック", 2500),
        ("シャンプー &コンディショナーセット", 4000),
        ("スカルプ シャンプー", 2500),
        ("カラートリートメント", 2000),
        ("ヘアマスク", 1500),
        ("プレシャンプー", 1500),
    ],
    "ボディケア": [
        ("ボディソープ", 1500),
        ("ボディローション", 2000),
        ("ボディバター", 2500),
        ("スクラブ", 2000),
        ("バスオイル", 1500),
        ("シャワージェル", 1000),
        ("ハンドクリーム", 1500),
        ("フットクリーム", 2000),
        ("ボディミスト", 2500),
        ("ボディパウダー", 1500),
    ],
    "香水・フレグランス": [
        ("オードトワレ 30ml", 6000),
        ("オードパルファム 50ml", 8000),
        ("香水 100ml", 10000),
        ("ボディスプレー", 3000),
        ("ハンドクリーム香水", 2000),
        ("ルームフレグランス", 4000),
        ("ディフューザー", 5000),
        ("香りキャンドル", 3000),
        ("サシェ", 1500),
        ("タロニック", 2000),
    ],
    "家具": [
        ("ソファ", 80000),
        ("テーブル", 40000),
        ("椅子", 15000),
        ("ベッド", 60000),
        ("デスク", 30000),
        ("本棚", 25000),
        ("キャビネット", 30000),
        ("ラック", 15000),
        ("チェスト", 20000),
        ("コーヒーテーブル", 12000),
    ],
    "寝具": [
        ("マットレス", 50000),
        ("枕", 8000),
        ("掛布団", 12000),
        ("敷布団", 8000),
        ("シーツセット", 5000),
        ("枕カバー", 2000),
        ("毛布", 4000),
        ("ベッドスプレッド", 8000),
        ("ラテックス枕", 10000),
        ("低反発枕", 6000),
    ],
    "キッチン用品": [
        ("鍋セット", 4000),
        ("フライパン", 3000),
        ("調理器具セット", 2000),
        ("包丁", 5000),
        ("まな板", 2000),
        ("食器セット", 8000),
        ("グラスセット", 3000),
        ("マグカップ", 1500),
        ("シリコンスパチュラ", 1000),
        ("計量スプーン", 500),
    ],
    "インテリア雑貨": [
        ("壁掛け時計", 5000),
        ("クッション", 3000),
        ("ラグ", 20000),
        ("壁装飾", 5000),
        ("観葉植物", 3000),
        ("フォトフレーム", 2000),
        ("キャンドル", 2500),
        ("ミラー", 8000),
        ("オットマン", 10000),
        ("テーブルランナー", 2000),
    ],
    "照明": [
        ("LED電球", 1500),
        ("シーリングライト", 12000),
        ("スタンドライト", 8000),
        ("テーブルランプ", 6000),
        ("ペンダントライト", 10000),
        ("ウォールライト", 5000),
        ("デスクライト", 5000),
        ("ストリップライト", 4000),
        ("スマート照明", 8000),
        ("シャンデリア", 20000),
    ],
    "スポーツシューズ": [
        ("ナイキ エア マックス", 12000),
        ("アディダス ウルトラブースト", 15000),
        ("プーマ RS-X", 10000),
        ("アシックス ゲルライト", 9000),
        ("ニューバランス 990v6", 16000),
        ("コンバース オールスター", 6000),
        ("バンズ オールドスクール", 7000),
        ("ティンバーランド ブーツ", 20000),
        ("リーボック クラシック", 8000),
        ("アディダス スタンスミス", 8000),
    ],
    "スポーツウェア": [
        ("ナイキ Tシャツ", 3000),
        ("アディダス スウェット", 5000),
        ("ナイキ レギンス", 4000),
        ("アディダス ショーツ", 3000),
        ("プーマ ジャージ", 4000),
        ("アンダーアーマー コンプレッション", 5000),
        ("ナイキ ランニングシャツ", 2500),
        ("アディダス ジャケット", 8000),
        ("プーマ スポーツウェア", 3500),
        ("ユニクロ スポーツウェア", 2000),
    ],
    "フィットネス機器": [
        ("ダンベル セット", 5000),
        ("ヨガマット", 4000),
        ("トレッドミル", 150000),
        ("エクササイズバイク", 80000),
        ("プッシュアップバー", 2000),
        ("トレーニングロープ", 3000),
        ("バランスボール", 3000),
        ("レジスタンスバンド", 2000),
        ("ケトルベル", 4000),
        ("腹筋ローラー", 2000),
    ],
    "アウトドア装備": [
        ("テント", 25000),
        ("寝袋", 10000),
        ("バックパック", 20000),
        ("登山靴", 12000),
        ("双眼鏡", 15000),
        ("懐中電灯", 3000),
        ("カレーマット", 2000),
        ("ウォーターボトル", 3000),
        ("キャンプストーブ", 8000),
        ("ハイキングポール", 4000),
    ],
    "スポーツ用品": [
        ("バスケットボール", 4000),
        ("サッカーボール", 3500),
        ("テニスラケット", 15000),
        ("バドミントンラケット", 8000),
        ("卓球ラケット", 5000),
        ("ゴルフクラブセット", 80000),
        ("野球グローブ", 10000),
        ("ボーリングボール", 12000),
        ("スケートボード", 8000),
        ("サーフボード", 40000),
    ],
}


def generate_seed_data():
    db = SessionLocal()
    
    try:
        print("👤 テストユーザーを作成中...")
        users_created = 0
        
        existing_users = db.query(User).count()
        if existing_users >= 1000:
            print(f"✅ テストユーザーはすでに{existing_users}名存在しています\n")
        else:
            for i in range(1000 - existing_users):
                email = f"user{existing_users + i + 1:04d}@example.com"
                username = f"user{existing_users + i + 1:04d}"
                first_name = f"テスト{existing_users + i + 1}"
                last_name = "ユーザー"
                password_hash = hash_password("password123")
                
                user = User(
                    email=email,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    password_hash=password_hash,
                    is_active=True,
                    is_confirmed=True,
                    is_admin=False,
                )
                db.add(user)
                users_created += 1
                
                if (i + 1) % 100 == 0:
                    db.flush()
                    print(f"  ✓ {existing_users + i + 1}名のテストユーザーを作成")
            
            if users_created > 0:
                db.commit()
                print(f"✅ {users_created}名のテストユーザーを追加\n")
            else:
                print(f"✅ テストユーザーはすでに1000名存在しています\n")
        
        parent_categories = []
        child_categories = []
        all_brands = {}
        products_created = 0

        existing_categories = db.query(Category).count()
        if existing_categories >= 25:
            print(f"✅ カテゴリはすでに{existing_categories}個存在しています\n")
            parent_categories = db.query(Category).filter(Category.parent_id == None).all()
            child_categories = db.query(Category).filter(Category.parent_id != None).all()
            
            existing_brands = db.query(Brand).count()
            if existing_brands < 85:
                print("📁 親カテゴリを作成中...")
                for parent_name in CATEGORIES_HIERARCHICAL.keys():
                    parent_category = Category(
                        name=parent_name,
                        slug=parent_name.lower().replace(" ", "-"),
                        parent_id=None,
                    )
                    db.add(parent_category)
                    db.flush()
                    parent_categories.append(parent_category)
                    print(f"  ✓ {parent_name}")

                db.commit()
                print(f"✅ {len(parent_categories)}個の親カテゴリを作成\n")

                print("📁 子カテゴリを作成中...")
                for parent_category in parent_categories:
                    parent_name = parent_category.name
                    child_category_list = CATEGORIES_HIERARCHICAL.get(parent_name, [])

                    for child_data in child_category_list:
                        child_category = Category(
                            name=child_data["name"],
                            slug=child_data["slug"],
                            parent_id=parent_category.id,
                        )
                        db.add(child_category)
                        db.flush()
                        child_categories.append(child_category)
                        print(f"  ✓ {child_data['name']} (親: {parent_name})")

                db.commit()
                print(f"✅ {len(child_categories)}個の子カテゴリを作成\n")

                print("🏢 ブランドを作成中...")
                brand_count = 0
                for child_category_name, brand_list in BRANDS_BY_CATEGORY.items():
                    for brand_data in brand_list:
                        brand_key = brand_data["slug"]
                        if brand_key in all_brands:
                            continue
                        
                        brand = Brand(
                            name=brand_data["name"],
                            slug=brand_data["slug"],
                        )
                        db.add(brand)
                        db.flush()
                        all_brands[brand_key] = brand
                        brand_count += 1

                db.commit()
                print(f"✅ {brand_count}個のブランドを作成\n")
            else:
                print(f"✅ ブランドはすでに{existing_brands}個存在しています\n")
        else:
            print("📁 親カテゴリを作成中...")
            for parent_name in CATEGORIES_HIERARCHICAL.keys():
                parent_category = Category(
                    name=parent_name,
                    slug=parent_name.lower().replace(" ", "-"),
                    parent_id=None,
                )
                db.add(parent_category)
                db.flush()
                parent_categories.append(parent_category)
                print(f"  ✓ {parent_name}")

            db.commit()
            print(f"✅ {len(parent_categories)}個の親カテゴリを作成\n")

            print("📁 子カテゴリを作成中...")
            for parent_category in parent_categories:
                parent_name = parent_category.name
                child_category_list = CATEGORIES_HIERARCHICAL.get(parent_name, [])

                for child_data in child_category_list:
                    child_category = Category(
                        name=child_data["name"],
                        slug=child_data["slug"],
                        parent_id=parent_category.id,
                    )
                    db.add(child_category)
                    db.flush()
                    child_categories.append(child_category)
                    print(f"  ✓ {child_data['name']} (親: {parent_name})")

            db.commit()
            print(f"✅ {len(child_categories)}個の子カテゴリを作成\n")

            print("🏢 ブランドを作成中...")
            brand_count = 0
            for child_category_name, brand_list in BRANDS_BY_CATEGORY.items():
                for brand_data in brand_list:
                    brand_key = brand_data["slug"]
                    if brand_key in all_brands:
                        continue
                    
                    brand = Brand(
                        name=brand_data["name"],
                        slug=brand_data["slug"],
                    )
                    db.add(brand)
                    db.flush()
                    all_brands[brand_key] = brand
                    brand_count += 1

            db.commit()
            print(f"✅ {brand_count}個のブランドを作成\n")

        print("📦 商品を作成中...")
        for child_category in child_categories:
            products_for_category = PRODUCT_TEMPLATES.get(child_category.name, [])
            brands_for_category = BRANDS_BY_CATEGORY.get(child_category.name, [])

            if not brands_for_category:
                print(f"  ⚠️  警告: '{child_category.name}' にブランドが定義されていません")
                continue

            category_products = 0
            for idx, (product_name, base_price) in enumerate(products_for_category * 10):
                brand_data = brands_for_category[idx % len(brands_for_category)]
                brand_obj = all_brands.get(brand_data["slug"])
                if not brand_obj:
                    continue

                price_variation = (idx % 5) * 50
                price_cents = (base_price * 100) + price_variation
                
                product = Product(
                    title=f"{product_name} #{category_products + 1}",
                    sku=f"SKU-{uuid4().hex[:8].upper()}",
                    description=f"{product_name}の説明。{brand_obj.name}による厳選商品。",
                    stock_quantity=random.randint(5, 100),
                    price_cents=price_cents,
                    currency="JPY",
                    status="published",
                    brand_id=brand_obj.id,
                )
                db.add(product)
                db.flush()
                products_created += 1
                category_products += 1

                product_category = ProductCategory(
                    product_id=product.id,
                    category_id=child_category.id,
                )
                db.add(product_category)
                db.flush()

                if category_products % 10 == 0:
                    print(f"  ✓ {child_category.name}: {category_products}個の商品を作成")

            db.commit()

        print("\n🏷️  タグを作成中...")
        tags_created = 0
        existing_tags = db.query(Tag).count()
        if existing_tags < len(TAGS):
            for tag_name in TAGS[existing_tags:]:
                tag = Tag(name=tag_name, usage_count=random.randint(5, 50))
                db.add(tag)
                tags_created += 1
            db.commit()
            print(f"✅ {tags_created}個のタグを追加\n")
        else:
            print(f"✅ タグはすでに{existing_tags}個存在しています\n")

        print("📝 投稿を作成中...")
        posts_created = 0
        existing_posts = db.query(Post).count()
        if existing_posts == 0:
            all_users = db.query(User).all()
            all_tags = db.query(Tag).all()
            all_products = db.query(Product).limit(500).all()
            
            posts_per_user = 5
            for user in all_users[:200]:
                for _ in range(random.randint(1, posts_per_user)):
                    caption = random.choice(POST_CAPTIONS)
                    post = Post(
                        user_id=user.id,
                        caption=caption,
                        status=random.choice([PostStatus.PUBLIC, PostStatus.PUBLIC, PostStatus.DRAFT]),
                        purchase_count=random.randint(0, 20),
                        view_count=random.randint(0, 500),
                        like_count=random.randint(0, 100),
                    )
                    db.add(post)
                    db.flush()
                    posts_created += 1
                    
                    if all_products and random.random() > 0.3:
                        selected_products = random.sample(all_products, min(3, len(all_products)))
                        for product in selected_products:
                            post.products.append(product)
                    
                    if all_tags and random.random() > 0.2:
                        selected_tags = random.sample(all_tags, min(3, len(all_tags)))
                        for tag in selected_tags:
                            post.tags.append(tag)
            
            db.commit()
            print(f"✅ {posts_created}個の投稿を作成\n")
        else:
            print(f"✅ 投稿はすでに{existing_posts}個存在しています\n")

        print("🖼️  アセットを作成中...")
        assets_created = 0
        existing_assets = db.query(Asset).count()
        if existing_assets == 0:
            csv_path = os.path.join(os.path.dirname(__file__), "../csv/dummy_asset_images.csv")
            if os.path.exists(csv_path):
                all_users = db.query(User).all()
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        image_url = row.get("image_url", "").strip()
                        product_name = row.get("product_name", "").strip()
                        
                        if not image_url or not all_users:
                            continue
                        
                        checksum = hashlib.sha256(image_url.encode()).hexdigest()
                        storage_key = f"asset_{uuid4().hex[:12]}"
                        owner = random.choice(all_users)
                        
                        asset = Asset(
                            owner_id=owner.id,
                            purpose="post_image",
                            storage_key=storage_key,
                            content_type="image/jpeg",
                            extension="jpg",
                            size_bytes=100000,
                            width=400,
                            height=400,
                            checksum=checksum,
                            status="ready",
                            public_url=image_url,
                        )
                        db.add(asset)
                        db.flush()
                        assets_created += 1
                    
                    db.commit()
                    print(f"✅ {assets_created}個のアセットを作成\n")
                    
                    all_posts = db.query(Post).all()
                    all_assets = db.query(Asset).all()
                    if all_posts and all_assets:
                        print("📎 アセットを投稿に関連付け中...")
                        assets_linked = 0
                        for post in all_posts:
                            if random.random() > 0.3 and all_assets:
                                selected_assets = random.sample(all_assets, min(2, len(all_assets)))
                                for asset in selected_assets:
                                    post.assets.append(asset)
                                    assets_linked += 1
                        db.commit()
                        print(f"✅ {assets_linked}個のアセットを投稿に関連付け\n")
            else:
                print(f"⚠️  CSV ファイルが見つかりません: {csv_path}\n")
        else:
            print(f"✅ アセットはすでに{existing_assets}個存在しています\n")

        print(f"✅ seedデータ生成完了")
        print(f"  📊 統計:")
        print(f"     - ユーザー: {db.query(User).count()}名")
        print(f"     - 親カテゴリ: {len(parent_categories)}個")
        print(f"     - 子カテゴリ: {len(child_categories)}個")
        print(f"     - ブランド: {db.query(Brand).count()}個")
        print(f"     - 商品: {db.query(Product).count()}個")
        print(f"     - タグ: {db.query(Tag).count()}個")
        print(f"     - 投稿: {db.query(Post).count()}個")
        print(f"     - アセット: {db.query(Asset).count()}個")

    except Exception as e:
        db.rollback()
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    generate_seed_data()
