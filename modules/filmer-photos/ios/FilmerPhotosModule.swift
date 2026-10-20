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
  private var selectionController: ReferenceSelectionViewController?

  public func definition() -> ModuleDefinition {
    Name("FilmerPhotos")
    AsyncFunction("pick") { (single: Bool, labels: [String: String], dark: Bool, promise: Promise) in
      DispatchQueue.main.async {
        guard self.pickerDelegate == nil && self.selectionController == nil else { promise.reject("ERR_PICKER_BUSY", "Photo picker is already open"); return }
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("ERR_NO_PRESENTER", "Photo picker cannot be presented"); return
        }
        if !single {
          let controller = ReferenceSelectionViewController(labels: labels, dark: dark)
          controller.finish = { [weak module = self] identifiers in
            module?.selectionController = nil
            promise.resolve(Self.referenceResult(identifiers))
          }
          self.selectionController = controller
          let navigation = UINavigationController(rootViewController: controller)
          navigation.overrideUserInterfaceStyle = controller.overrideUserInterfaceStyle
          navigation.modalPresentationStyle = .fullScreen
          presenter.present(navigation, animated: true)
          return
        }
        var configuration = PHPickerConfiguration(photoLibrary: PHPhotoLibrary.shared())
        configuration.filter = .images
        configuration.selectionLimit = single ? 1 : 0
        configuration.selection = .ordered
        let picker = PHPickerViewController(configuration: configuration)
        let delegate = ReferencePickerDelegate()
        delegate.finish = { [weak module = self] results in
          module?.pickerDelegate = nil
          // Single-photo Relink keeps the supported system picker; no image bytes are loaded.
          let identifiers = results.compactMap { $0.assetIdentifier }
          if results.isEmpty { promise.resolve(Self.referenceResult(nil)) }
          else if identifiers.count != results.count {
            promise.resolve(["canceled": false, "assets": results.map { ["assetId": $0.assetIdentifier as Any? ?? NSNull()] }])
          } else { promise.resolve(Self.referenceResult(identifiers)) }
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
    AsyncFunction("clearRenders") { () -> Int in
      let directory = FileManager.default.temporaryDirectory.appendingPathComponent("filmer-photo-renders", isDirectory: true)
      let count = (try? FileManager.default.contentsOfDirectory(atPath: directory.path).count) ?? 0
      if FileManager.default.fileExists(atPath: directory.path) { try FileManager.default.removeItem(at: directory) }
      return count
    }
  }

  private static func referenceResult(_ identifiers: [String]?) -> [String: Any] {
    guard let identifiers = identifiers else { return ["canceled": true, "assets": []] }
    let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"
    let assets: [[String: Any]] = identifiers.map { identifier in
      var item: [String: Any] = ["assetId": identifier]
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
