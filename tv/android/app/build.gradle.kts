import groovy.json.JsonSlurper

plugins {
  id("com.android.application")
}

val harborPackage = JsonSlurper().parse(file("../../../package.json")) as Map<*, *>
val harborVersion = harborPackage["version"].toString()
val versionParts = harborVersion.split(".").map { it.toInt() }
val releaseKeystore = providers.environmentVariable("HARBOR_ANDROID_KEYSTORE").orNull
val releaseStorePassword = providers.environmentVariable("HARBOR_ANDROID_STORE_PASSWORD").orNull
val releaseKeyAlias = providers.environmentVariable("HARBOR_ANDROID_KEY_ALIAS").orNull
val releaseKeyPassword = providers.environmentVariable("HARBOR_ANDROID_KEY_PASSWORD").orNull

android {
  namespace = "com.harbor.tv"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.harbor.tv"
    minSdk = 23
    targetSdk = 35
    versionCode = versionParts[0] * 10000 + versionParts[1] * 100 + versionParts[2]
    versionName = harborVersion
  }

  sourceSets.getByName("main").assets.srcDir(file("../../build/android-assets"))

  buildFeatures {
    buildConfig = true
  }

  signingConfigs {
    if (releaseKeystore != null && releaseStorePassword != null && releaseKeyAlias != null && releaseKeyPassword != null) {
      create("release") {
        storeFile = file(releaseKeystore)
        storePassword = releaseStorePassword
        keyAlias = releaseKeyAlias
        keyPassword = releaseKeyPassword
      }
    }
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      signingConfigs.findByName("release")?.let { signingConfig = it }
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
}
