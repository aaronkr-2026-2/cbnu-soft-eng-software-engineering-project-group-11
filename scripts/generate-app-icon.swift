// Run from the repository root:
// swift -module-cache-path /private/tmp/filmer-icon-swift-cache scripts/generate-app-icon.swift
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let context = CGContext(
  data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4,
  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
)!
context.setFillColor(CGColor(gray: 0, alpha: 1))
context.fill(CGRect(x: 0, y: 0, width: size, height: size))
context.setStrokeColor(CGColor(gray: 1, alpha: 1))
// Match StartupScreen's 66:48 body and 24:24 lens proportions.
let scale = 600.0 / 66.0
context.setLineWidth(2 * scale)
context.addPath(CGPath(
  roundedRect: CGRect(x: 212, y: (1024 - 48 * scale) / 2, width: 600, height: 48 * scale),
  cornerWidth: 10 * scale, cornerHeight: 10 * scale, transform: nil
))
context.strokePath()
context.strokeEllipse(in: CGRect(
  x: (1024 - 24 * scale) / 2, y: (1024 - 24 * scale) / 2,
  width: 24 * scale, height: 24 * scale
))
let image = context.makeImage()!
for path in [
  "assets/icon.png",
  "ios/FILMER/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"
] {
  let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else { fatalError("Could not write \(path)") }
}
