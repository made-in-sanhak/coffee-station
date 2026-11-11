package com.coffeestation

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.io.IOException
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/** Only authenticated ciphertext is persisted; the AES key never leaves AndroidKeyStore. */
internal class CoffeeSecureStore(
  context: Context,
  private val keyProvider: () -> SecretKey = { androidKey(context.packageName) },
) {
  private val namespace = context.packageName
  private val preferences = context.getSharedPreferences("coffee_device_secure_v1", Context.MODE_PRIVATE)

  private fun validateKey(key: String) {
    require(key.isNotBlank() && key.length <= 128) { "Invalid storage key" }
  }

  @Synchronized fun get(key: String): String? {
    validateKey(key)
    val sealed = preferences.getString(key, null) ?: return null
    return CoffeeSecureCodec.decrypt(keyProvider(), namespace, key, Base64.decode(sealed, Base64.NO_WRAP))
  }

  @Synchronized fun set(key: String, value: String) {
    validateKey(key)
    require(value.toByteArray(Charsets.UTF_8).size <= 1024 * 1024) { "Storage value is too large" }
    val sealed = CoffeeSecureCodec.encrypt(keyProvider(), namespace, key, value)
    if (!preferences.edit().putString(key, Base64.encodeToString(sealed, Base64.NO_WRAP)).commit()) {
      throw IOException("Could not persist encrypted storage")
    }
  }

  @Synchronized fun remove(key: String) {
    validateKey(key)
    if (!preferences.edit().remove(key).commit()) throw IOException("Could not remove encrypted storage")
  }

  companion object {
    @Synchronized private fun androidKey(packageName: String): SecretKey {
      val alias = "$packageName.coffee.secure.v1"
      val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      val existing = store.getKey(alias, null)
      if (existing is SecretKey) return existing
      val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
      generator.init(
        KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setKeySize(256)
          .setRandomizedEncryptionRequired(true)
          .build(),
      )
      return generator.generateKey()
    }
  }
}
