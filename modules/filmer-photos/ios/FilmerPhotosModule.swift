import ExpoModulesCore
import Photos
import PhotosUI
import UIKit

private final class ReferencePickerDelegate: NSObject, PHPickerViewControllerDelegate, UIAdaptivePresentationControllerDelegate {
  var finish: (([PHPickerResult]) -> Void)?
  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    finish?(results)
    finish = nil
  }
  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    finish?([])
    finish = nil
  }
}

public class FilmerPhotosModule: Module {
  private var pickerDelegate: ReferencePickerDelegate?

  public func definition() -> ModuleDefinition {
    Name("FilmerPhotos")
    // Keep legacy label/theme arguments for bridge compatibility; the system owns all picker UI.
    AsyncFunction("pick") { (single: Bool, labels: [String: String], dark: Bool, promise: Promise) in
      DispatchQueue.main.async {
        guard self.pickerDelegate == nil else { promise.reject("ERR_PICKER_BUSY", "Photo picker is already open"); return }
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("ERR_NO_PRESENTER", "Photo picker cannot be presented"); return
        }
        var configuration = PHPickerConfiguration(photoLibrary: PHPhotoLibrary.shared())
        configuration.filter = .images
        configuration.selectionLimit = single ? 1 : 0
        // Prefer native range selection. Ordered mode disables swipe-to-select.
        // Frame order follows PHPicker results, not necessarily the order of taps.
        configuration.selection = .default
        let picker = PHPickerViewController(configuration: configuration)
        // Use device language and system appearance, independent of FILMER's app theme.
        picker.overrideUserInterfaceStyle = .unspecified
        let delegate = ReferencePickerDelegate()
        delegate.finish = { [weak module = self] results in
          module?.pickerDelegate = nil
          // Keep nil entries so JS can report rejected selections. Never load item-provider URLs.
          if results.isEmpty { promise.resolve(Self.referenceResult(nil)) }
          else { Self.resolveReferences(results.map { $0.assetIdentifier }, promise) }
        }
        self.pickerDelegate = delegate
        picker.delegate = delegate
        presenter.present(picker, animated: true)
        picker.presentationController?.delegate = delegate
      }
    }
    AsyncFunction("verify") { (identifier: String) -> [String: Any] in
      self.lookup(identifier).result
    }
    // Maps a saved PHCloudIdentifier to this device's localIdentifier. Read-only; never picks among ambiguous matches.
    AsyncFunction("locate") { (cloudIdentifier: String) -> [String: Any] in
      let authorization = PHPhotoLibrary.authorizationStatus(for: .readWrite)
      guard authorization == .authorized || authorization == .limited else { return ["status": "permission-denied"] }
      let cloud = PHCloudIdentifier(stringValue: cloudIdentifier)
      guard let mapping = PHPhotoLibrary.shared().localIdentifierMappings(for: [cloud])[cloud] else {
        return ["status": "temporary-error"]
      }
      switch mapping {
      case .success(let identifier):
        let lookup = self.lookup(identifier)
        guard lookup.asset != nil else { return lookup.result }
        return ["status": "ready", "assetId": identifier]
      case .failure(let error):
        let code = (error as? PHPhotosError)?.code
        if code == .identifierNotFound || code == .multipleIdentifiersFound {
          return ["status": authorization == .limited ? "limited" : "unavailable"]
        }
        return ["status": "temporary-error"]
      }
    }
    AsyncFunction("resolve") { (identifier: String, full: Bool, pixels: Int, promise: Promise) in
      DispatchQueue.main.async {
        let lookup = self.lookup(identifier)
        guard let asset = lookup.asset else { promise.resolve(lookup.result); return }
        let manager = PHImageManager.default()
        let options = PHImageRequestOptions()
        options.isNetworkAccessAllowed = true
        options.deliveryMode = .highQualityFormat
        options.resizeMode = full ? .none : .exact
        options.version = .current
        let side = CGFloat(min(1600, max(64, pixels)))
        let size = full ? PHImageManagerMaximumSize : CGSize(width: side, height: side)
        var finished = false
        var request: PHImageRequestID = PHInvalidImageRequestID
        // Serialize callbacks with the timeout to settle each promise exactly once.
        func finish(_ value: [String: Any]) {
          guard !finished else { return }
          finished = true
          promise.resolve(value)
        }
        request = manager.requestImage(for: asset, targetSize: size, contentMode: .aspectFit, options: options) { image, info in
          DispatchQueue.main.async {
            guard !finished else { return }
            if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
            let fresh = self.lookup(identifier)
            guard fresh.asset != nil else { finish(fresh.result); return }
            guard info?[PHImageErrorKey] == nil, (info?[PHImageCancelledKey] as? Bool) != true,
                  let image = image, let data = image.jpegData(compressionQuality: full ? 0.95 : 0.85) else {
              finish(["status": "temporary-error"]); return
            }
            do {
              let directory = FileManager.default.temporaryDirectory.appendingPathComponent("filmer-photo-renders", isDirectory: true)
              try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
              // Bound disk lifetime without touching originals, Documents or unrelated caches.
              if let files = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey]) {
                let cutoff = Date().addingTimeInterval(-86400)
                for file in files where file.pathExtension == "jpg" {
                  if let values = try? file.resourceValues(forKeys: [.contentModificationDateKey]),
                     let modified = values.contentModificationDate, modified < cutoff {
                    try? FileManager.default.removeItem(at: file)
                  }
                }
              }
              // Only derived, disposable render files. Never write into Documents or Photos.
              let url = directory.appendingPathComponent(UUID().uuidString + ".jpg")
              try data.write(to: url, options: .atomic)
              finish(["status": "ready", "uri": url.absoluteString])
            } catch { finish(["status": "temporary-error"]) }
          }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 45) {
          guard !finished else { return }
          finish(["status": "temporary-error"])
          manager.cancelImageRequest(request)
        }
      }
    }
    AsyncFunction("cacheInfo") { () -> [String: Any] in
      let directory = FileManager.default.temporaryDirectory.appendingPathComponent("filmer-photo-renders", isDirectory: true)
      var bytes: Int64 = 0
      var files = 0
      if FileManager.default.fileExists(atPath: directory.path) {
        for url in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.fileSizeKey, .isRegularFileKey]) {
          let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
          if values.isRegularFile == true && url.pathExtension == "jpg" {
            bytes += Int64(values.fileSize ?? 0)
            files += 1
          }
        }
      }
      return ["bytes": bytes, "files": files, "uri": directory.absoluteString]
    }
    AsyncFunction("clearRenders") { () -> Int in
      let directory = FileManager.default.temporaryDirectory.appendingPathComponent("filmer-photo-renders", isDirectory: true)
      guard FileManager.default.fileExists(atPath: directory.path) else { return 0 }
      var count = 0
      for file in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.isRegularFileKey]) {
        let values = try file.resourceValues(forKeys: [.isRegularFileKey])
        guard values.isRegularFile == true && file.pathExtension == "jpg" else { continue }
        try FileManager.default.removeItem(at: file)
        count += 1
      }
      return count
    }
  }

  // PhotoKit identifier mapping can be slow for large selections; keep it off the main thread.
  private static func resolveReferences(_ identifiers: [String?]?, _ promise: Promise) {
    DispatchQueue.global(qos: .userInitiated).async { promise.resolve(referenceResult(identifiers)) }
  }

  private static func referenceResult(_ identifiers: [String?]?) -> [String: Any] {
    guard let identifiers = identifiers else { return ["canceled": true, "assets": []] }
    let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"
    // Best effort: an asset without a cloud identifier (e.g. iCloud Photos off) still imports by localIdentifier.
    let validIdentifiers = identifiers.compactMap { $0 }
    let cloud = validIdentifiers.isEmpty ? [:] : PHPhotoLibrary.shared().cloudIdentifierMappings(forLocalIdentifiers: validIdentifiers)
    let assets: [[String: Any]] = identifiers.map { identifier in
      guard let identifier = identifier else { return ["assetId": NSNull()] }
      var item: [String: Any] = ["assetId": identifier]
      if case .success(let value)? = cloud[identifier], !value.stringValue.isEmpty { item["cloudId"] = value.stringValue }
      if let asset = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil).firstObject, let date = asset.creationDate {
        item["takenAt"] = formatter.string(from: date)
      }
      return item
    }
    return ["canceled": false, "assets": assets]
  }

  private func lookup(_ identifier: String) -> (asset: PHAsset?, result: [String: Any]) {
    let authorization = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    guard authorization == .authorized || authorization == .limited else {
      return (nil, ["status": "permission-denied"])
    }
    // Fetch from the library, never an album: removing album membership is harmless.
    let asset = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil).firstObject
    guard let asset = asset, asset.mediaType == .image else {
      return (nil, ["status": authorization == .limited ? "limited" : "unavailable"])
    }
    return (asset, ["status": "ready"])
  }
}
