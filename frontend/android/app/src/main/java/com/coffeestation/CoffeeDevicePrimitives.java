package com.coffeestation;

import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.security.SecureRandom;

final class CoffeeDevicePrimitives {
  private CoffeeDevicePrimitives() {}
  static class ImageTooLargeException extends IOException {}
  static long copyBounded(InputStream input, OutputStream output, long limit) throws IOException {
    if (limit < 1) throw new IllegalArgumentException("Invalid image size limit");
    byte[] buffer = new byte[16 * 1024];
    long total = 0;
    int count;
    while ((count = input.read(buffer)) != -1) {
      if (count == 0) continue;
      if (total + count > limit) throw new ImageTooLargeException();
      output.write(buffer, 0, count);
      total += count;
    }
    return total;
  }
  static String randomHex(int bytes) {
    if (bytes < 1 || bytes > 1024) throw new IllegalArgumentException("Random byte count must be 1..1024");
    byte[] value = new byte[bytes];
    new SecureRandom().nextBytes(value);
    char[] hex = new char[bytes * 2];
    char[] alphabet = "0123456789abcdef".toCharArray();
    for (int i = 0; i < bytes; i++) {
      hex[i * 2] = alphabet[(value[i] & 0xff) >>> 4];
      hex[i * 2 + 1] = alphabet[value[i] & 0x0f];
    }
    return new String(hex);
  }
  static boolean validCoordinates(double latitude, double longitude) {
    return !Double.isNaN(latitude) && !Double.isInfinite(latitude)
      && !Double.isNaN(longitude) && !Double.isInfinite(longitude)
      && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }
  static boolean isRecent(long time, long now, long maxAge) {
    return time > 0 && now >= time && maxAge >= 0 && (now - time) / 1_000_000L <= maxAge;
  }
  static String firstSpeechResult(java.util.List<String> results) {
    if (results == null) return null;
    for (String result : results) {
      if (result != null && !result.trim().isEmpty()) return result.trim();
    }
    return null;
  }
}
