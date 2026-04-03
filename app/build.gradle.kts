plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.janus.cardmaker"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.janus.cardmaker"
        minSdk = 26
        targetSdk = 34
        versionCode = 6
        versionName = "3.0.0"
    }

    signingConfigs {
        create("release") {
            storeFile = file("janus-release.p12")
            storePassword = "januscardmaker"
            keyAlias = "janus"
            keyPassword = "januscardmaker"
        }
        // CI: 从环境变量读取
        create("ci") {
            storeFile = file("${System.getenv("KEYSTORE_PATH")}")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = "janus"
            keyPassword = System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("ci")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.9.0")
}
