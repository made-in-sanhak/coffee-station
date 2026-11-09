package com.coffeestation

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.speech.RecognizerIntent
import android.util.Base64
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.IOException
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/** Device-only storage, location and image acquisition. No credentials are sent to a server here. */
class CoffeeDeviceModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), LifecycleEventListener {
  private val main = Handler(Looper.getMainLooper())
  private val worker = Executors.newSingleThreadExecutor()
  private val secureStore = CoffeeSecureStore(context)
  private var locationJob: LocationJob? = null
  private var pendingImage: ImageJob? = null
  private var pendingSpeech: Promise? = null
  @Volatile private var closed = false

  private data class ImageJob(val promise: Promise, val cameraFile: File?, val cameraUri: Uri?)

  private val activityListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode == SPEECH_REQUEST) {
        val promise = pendingSpeech ?: return
        pendingSpeech = null
        if (resultCode != Activity.RESULT_OK) {
          promise.reject("E_CANCELLED", "음성 입력을 취소했습니다.")
        } else {
          val result = CoffeeDevicePrimitives.firstSpeechResult(data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS))
          if (result == null) promise.reject("E_SPEECH_EMPTY", "음성을 인식하지 못했습니다. 다시 말씀해 주세요.")
          else promise.resolve(result)
        }
        return
      }
      if (requestCode != IMAGE_REQUEST) return
      val job = pendingImage ?: return
      pendingImage = null
      if (resultCode != Activity.RESULT_OK) {
        cleanupCamera(job)
        job.promise.reject("E_CANCELLED", "사진 선택을 취소했습니다.")
        return
      }
      val uri = job.cameraUri ?: data?.data
      if (uri == null) {
        cleanupCamera(job)
        job.promise.reject("E_IMAGE_READ", "선택한 사진을 읽을 수 없습니다.")
        return
      }
      background(job.promise, "E_IMAGE_READ", "사진을 읽지 못했습니다.") {
        try {
          readImage(uri, job.cameraFile != null)
        } finally {
          cleanupCamera(job)
        }
      }
    }
  }

  init {
    context.addActivityEventListener(activityListener)
    context.addLifecycleEventListener(this)
  }

  override fun getName() = "CoffeeDevice"

  private fun background(promise: Promise, code: String, message: String, action: () -> Any?) {
    if (closed) {
      promise.reject("E_CANCELLED", "앱 작업이 종료되었습니다.")
      return
    }
    try {
      worker.execute {
        try {
          val value = action()
          if (!closed) promise.resolve(value)
        } catch (_: CoffeeDevicePrimitives.ImageTooLargeException) {
          promise.reject("E_FILE_TOO_LARGE", "10MB 이하의 사진을 선택해 주세요.")
        } catch (_: IllegalArgumentException) {
          promise.reject("E_INVALID_ARGUMENT", "입력한 값을 확인해 주세요.")
        } catch (_: SecurityException) {
          promise.reject("E_PERMISSION", "이 작업에 필요한 권한이 없습니다.")
        } catch (_: Exception) {
          promise.reject(code, message)
        }
      }
    } catch (_: RejectedExecutionException) {
      promise.reject("E_CANCELLED", "앱 작업이 종료되었습니다.")
    }
  }

  @ReactMethod fun secureGet(key: String, promise: Promise) =
    background(promise, "E_SECURE_STORAGE", "저장된 정보를 읽지 못했습니다.") { secureStore.get(key) }

  @ReactMethod fun secureSet(key: String, value: String, promise: Promise) =
    background(promise, "E_SECURE_STORAGE", "정보를 저장하지 못했습니다.") {
      secureStore.set(key, value)
      null
    }

  @ReactMethod fun secureRemove(key: String, promise: Promise) =
    background(promise, "E_SECURE_STORAGE", "저장된 정보를 지우지 못했습니다.") {
      secureStore.remove(key)
      null
    }

  @ReactMethod fun randomHex(bytes: Double, promise: Promise) =
    background(promise, "E_RANDOM", "보안 난수를 생성하지 못했습니다.") {
      require(bytes.isFinite() && bytes == bytes.toInt().toDouble() && bytes >= 1 && bytes <= 1024)
      CoffeeDevicePrimitives.randomHex(bytes.toInt())
    }

  private fun granted(permission: String) = context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  @ReactMethod fun getLocation(promise: Promise) {
    main.post {
      if (closed) {
        promise.reject("E_CANCELLED", "앱 작업이 종료되었습니다.")
        return@post
      }
      if (!granted(Manifest.permission.ACCESS_FINE_LOCATION) && !granted(Manifest.permission.ACCESS_COARSE_LOCATION)) {
        promise.reject("E_PERMISSION", "현재 위치를 확인하려면 위치 권한이 필요합니다.")
        return@post
      }
      if (locationJob != null) {
        promise.reject("E_BUSY", "현재 위치를 확인하고 있습니다.")
        return@post
      }
      val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
      if (manager == null) {
        promise.reject("E_LOCATION_UNAVAILABLE", "이 기기에서 위치를 확인할 수 없습니다.")
        return@post
      }
      val providers = listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER).filter {
        try { manager.isProviderEnabled(it) } catch (_: Exception) { false }
      }
      if (providers.isEmpty()) {
        promise.reject("E_LOCATION_DISABLED", "기기의 위치 기능을 켜 주세요.")
        return@post
      }
      val now = SystemClock.elapsedRealtimeNanos()
      val cached = providers.mapNotNull {
        try { manager.getLastKnownLocation(it) } catch (_: SecurityException) { null }
      }.filter {
        CoffeeDevicePrimitives.validCoordinates(it.latitude, it.longitude) &&
          CoffeeDevicePrimitives.isRecent(it.elapsedRealtimeNanos, now, 120_000L)
      }.maxByOrNull { it.elapsedRealtimeNanos }
      if (cached != null) {
        promise.resolve(coordinate(cached))
        return@post
      }
      val job = LocationJob(manager, promise)
      locationJob = job
      var requested = false
      providers.forEach {
        try {
          @Suppress("DEPRECATION")
          manager.requestLocationUpdates(it, 0L, 0f, job, Looper.getMainLooper())
          requested = true
        } catch (_: Exception) {
          // A coarse-only grant can exclude GPS while the network provider remains usable.
        }
      }
      if (!requested) job.fail("E_LOCATION_UNAVAILABLE", "현재 위치를 요청할 수 없습니다.")
      else main.postDelayed(job.timeout, 15_000L)
    }
  }

  private fun coordinate(location: Location) = Arguments.createMap().apply {
    putDouble("latitude", location.latitude)
    putDouble("longitude", location.longitude)
  }

  private inner class LocationJob(val manager: LocationManager, val promise: Promise) : LocationListener {
    private var done = false
    val timeout = Runnable { fail("E_LOCATION_TIMEOUT", "현재 위치를 확인하지 못했습니다. 다시 시도해 주세요.") }
    private fun finish(): Boolean {
      if (done) return false
      done = true
      main.removeCallbacks(timeout)
      try { manager.removeUpdates(this) } catch (_: Exception) { }
      if (locationJob === this) locationJob = null
      return true
    }
    fun fail(code: String, message: String) {
      if (finish()) promise.reject(code, message)
    }
    override fun onLocationChanged(location: Location) {
      if (CoffeeDevicePrimitives.validCoordinates(location.latitude, location.longitude) && finish()) {
        promise.resolve(coordinate(location))
      }
    }
    override fun onProviderDisabled(provider: String) = Unit
    override fun onProviderEnabled(provider: String) = Unit
    @Deprecated("Legacy provider callback")
    override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) = Unit
  }

  @ReactMethod fun pickImage(camera: Boolean, promise: Promise) {
    main.post {
      if (closed) {
        promise.reject("E_CANCELLED", "앱 작업이 종료되었습니다.")
        return@post
      }
      val activity = context.currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "앱 화면에서 다시 시도해 주세요.")
        return@post
      }
      if (pendingImage != null || pendingSpeech != null) {
        promise.reject("E_BUSY", "사진 선택을 먼저 완료해 주세요.")
        return@post
      }
      if (camera && !granted(Manifest.permission.CAMERA)) {
        promise.reject("E_PERMISSION", "사진을 촬영하려면 카메라 권한이 필요합니다.")
        return@post
      }
      var cameraFile: File? = null
      var cameraUri: Uri? = null
      try {
        val intent = if (camera) {
          val directory = File(context.cacheDir, "coffee_camera").apply { mkdirs() }
          cameraFile = File.createTempFile("capture-", ".jpg", directory)
          cameraUri = FileProvider.getUriForFile(context, "${context.packageName}.files", cameraFile!!)
          Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            putExtra(MediaStore.EXTRA_OUTPUT, cameraUri)
            clipData = ClipData.newRawUri("사진 촬영", cameraUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
          }
        } else if (Build.VERSION.SDK_INT >= 33) {
          Intent(MediaStore.ACTION_PICK_IMAGES).apply { type = "image/*" }
        } else {
          Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            type = "image/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
        }
        pendingImage = ImageJob(promise, cameraFile, cameraUri)
        @Suppress("DEPRECATION")
        activity.startActivityForResult(intent, IMAGE_REQUEST)
      } catch (_: ActivityNotFoundException) {
        pendingImage = null
        cameraFile?.delete()
        promise.reject("E_NO_ACTIVITY", if (camera) "사용할 수 있는 카메라 앱이 없습니다." else "사진을 선택할 앱이 없습니다.")
      } catch (_: Exception) {
        pendingImage = null
        cameraFile?.delete()
        promise.reject("E_IMAGE_OPEN", "사진 선택 화면을 열지 못했습니다.")
      }
    }
  }

  private fun cleanupCamera(job: ImageJob) {
    job.cameraUri?.let {
      try { context.revokeUriPermission(it, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION) }
      catch (_: Exception) { }
    }
    job.cameraFile?.delete()
  }

  @ReactMethod fun recognizeSpeech(promise: Promise) {
    main.post {
      if (closed) {
        promise.reject("E_CANCELLED", "앱 작업이 종료되었습니다.")
        return@post
      }
      val activity = context.currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "앱 화면에서 다시 시도해 주세요.")
        return@post
      }
      if (pendingImage != null || pendingSpeech != null) {
        promise.reject("E_BUSY", "현재 입력을 먼저 완료해 주세요.")
        return@post
      }
      try {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ko-KR")
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
          putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
          putExtra(RecognizerIntent.EXTRA_PROMPT, "찾을 카페나 메뉴를 말씀해 주세요.")
        }
        pendingSpeech = promise
        @Suppress("DEPRECATION")
        activity.startActivityForResult(intent, SPEECH_REQUEST)
      } catch (_: ActivityNotFoundException) {
        pendingSpeech = null
        promise.reject("E_UNAVAILABLE", "이 기기에 음성 인식 앱이 없습니다. 검색어를 입력해 주세요.")
      } catch (_: Exception) {
        pendingSpeech = null
        promise.reject("E_UNAVAILABLE", "음성 입력을 시작하지 못했습니다. 검색어를 입력해 주세요.")
      }
    }
  }

  private fun readImage(uri: Uri, camera: Boolean): Any {
    val resolver = context.contentResolver
    val type = if (camera) "image/jpeg" else resolver.getType(uri) ?: "image/jpeg"
    if (!type.startsWith("image/")) throw IOException("Not an image")
    var name = "photo"
    if (!camera) {
      resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst()) {
          val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
          val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
          if (nameIndex >= 0) name = cursor.getString(nameIndex) ?: name
          if (sizeIndex >= 0 && !cursor.isNull(sizeIndex) && cursor.getLong(sizeIndex) > MAX_IMAGE_BYTES) {
            throw CoffeeDevicePrimitives.ImageTooLargeException()
          }
        }
      }
    }
    val directory = File(context.cacheDir, "coffee_images").apply { mkdirs() }
    val extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(type) ?: "jpg"
    val file = File(directory, "${UUID.randomUUID()}.$extension")
    try {
      val input = resolver.openInputStream(uri) ?: throw IOException("Missing image data")
      input.use { source -> file.outputStream().use { target ->
        if (CoffeeDevicePrimitives.copyBounded(source, target, MAX_IMAGE_BYTES) == 0L) throw IOException("Empty image")
      } }
      val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.absolutePath, options)
      if (options.outWidth <= 0 || options.outHeight <= 0) throw IOException("Invalid image")
      return Arguments.createMap().apply {
        putString("uri", Uri.fromFile(file).toString())
        putString("type", type)
        putString("name", if (camera) "photo.jpg" else name.map {
          if (it == '/' || it == '\\' || it.code < 32) '_' else it
        }.joinToString("").take(120))
        putString("base64", Base64.encodeToString(file.readBytes(), Base64.NO_WRAP))
      }
    } catch (error: Exception) {
      file.delete()
      throw error
    }
  }

  override fun onHostResume() = Unit
  override fun onHostPause() {
    main.post { locationJob?.fail("E_CANCELLED", "위치 확인이 중단되었습니다.") }
  }
  override fun onHostDestroy() {
    main.post {
      locationJob?.fail("E_CANCELLED", "위치 확인이 중단되었습니다.")
      pendingSpeech?.reject("E_CANCELLED", "음성 입력이 중단되었습니다.")
      pendingSpeech = null
      pendingImage?.let {
        cleanupCamera(it)
        it.promise.reject("E_CANCELLED", "사진 선택이 중단되었습니다.")
      }
      pendingImage = null
    }
  }

  override fun invalidate() {
    closed = true
    context.removeActivityEventListener(activityListener)
    context.removeLifecycleEventListener(this)
    main.post {
      locationJob?.fail("E_CANCELLED", "앱 작업이 종료되었습니다.")
      pendingImage?.let {
        cleanupCamera(it)
        it.promise.reject("E_CANCELLED", "사진 선택이 중단되었습니다.")
      }
      pendingImage = null
      pendingSpeech?.reject("E_CANCELLED", "음성 입력이 중단되었습니다.")
      pendingSpeech = null
    }
    worker.shutdownNow()
    super.invalidate()
  }

  companion object {
    private const val IMAGE_REQUEST = 5042
    private const val SPEECH_REQUEST = 5043
    private const val MAX_IMAGE_BYTES = 10L * 1024L * 1024L
  }
}
