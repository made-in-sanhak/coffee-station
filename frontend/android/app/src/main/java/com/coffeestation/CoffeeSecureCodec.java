package com.coffeestation;

import java.security.GeneralSecurityException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class CoffeeSecureCodec {
  private CoffeeSecureCodec() {}
  private static byte[] aad(String namespace, String entry) {
    return (namespace + "\u0000" + entry).getBytes(StandardCharsets.UTF_8);
  }
  static byte[] encrypt(SecretKey key, String namespace, String entry, String value) throws GeneralSecurityException {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    // AndroidKeyStore generates a fresh, non-repeating IV for every encryption.
    cipher.init(Cipher.ENCRYPT_MODE, key);
    cipher.updateAAD(aad(namespace, entry));
    byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
    byte[] iv = cipher.getIV();
    if (iv.length != 12) throw new GeneralSecurityException("Unexpected GCM nonce size");
    byte[] envelope = new byte[1 + iv.length + encrypted.length];
    envelope[0] = 1;
    System.arraycopy(iv, 0, envelope, 1, iv.length);
    System.arraycopy(encrypted, 0, envelope, 13, encrypted.length);
    return envelope;
  }
  static String decrypt(SecretKey key, String namespace, String entry, byte[] envelope) throws GeneralSecurityException {
    if (envelope.length < 29 || envelope[0] != 1) throw new GeneralSecurityException("Invalid secure storage envelope");
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Arrays.copyOfRange(envelope, 1, 13)));
    cipher.updateAAD(aad(namespace, entry));
    return new String(cipher.doFinal(envelope, 13, envelope.length - 13), StandardCharsets.UTF_8);
  }
}
