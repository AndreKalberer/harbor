plugins {
  id("com.android.application")
}

android {
  namespace = "com.harbor.tv"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.harbor.tv"
    minSdk = 23
    targetSdk = 35
    versionCode = 20000
    versionName = "2.0.0"
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      signingConfig = signingConfigs.getByName("debug")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
}
