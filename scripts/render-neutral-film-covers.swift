// Driven by scripts/generate-neutral-film-covers.mjs; reads [{ brand, name, iso, type, process, target }].
import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Cover: Decodable { let brand: String; let name: String; let iso: Int; let type: String; let process: String?; let target: String }

let width = 492, height = 400, margin: CGFloat = 32
// One flat color per film type: deliberately unrelated to any manufacturer's packaging.
let backgrounds: [String: (CGFloat, CGFloat, CGFloat)] = [
  "color": (0x8A, 0x5A, 0x44), "black-and-white": (0x3A, 0x3A, 0x3C), "slide": (0x3F, 0x5F, 0x7F), "cinema": (0x5B, 0x4A, 0x6B),
]

func draw(_ text: String, size: CGFloat, weight: NSFont.Weight, in rect: CGRect, alignment: NSTextAlignment = .left, alpha: CGFloat = 1) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = alignment
  paragraph.lineBreakMode = .byWordWrapping
  NSAttributedString(string: text, attributes: [
    .font: NSFont.systemFont(ofSize: size, weight: weight),
    .foregroundColor: NSColor(white: 1, alpha: alpha),
    .paragraphStyle: paragraph,
  ]).draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading])
}

/** The largest size at which the film name fits without breaking inside a word. */
func nameSize(_ name: String, in box: CGSize) -> CGFloat {
  var size: CGFloat = 92
  while size > 28 {
    let font = NSFont.systemFont(ofSize: size, weight: .bold)
    let widest = name.split(separator: " ").map { ($0 as NSString).size(withAttributes: [.font: font]).width }.max() ?? 0
    let height = (name as NSString).boundingRect(with: CGSize(width: box.width, height: .greatestFiniteMagnitude),
      options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: [.font: font]).height
    if widest <= box.width && height <= box.height { return size }
    size -= 2
  }
  return size
}

let covers = try JSONDecoder().decode([Cover].self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
for cover in covers {
  guard let background = backgrounds[cover.type] else { fatalError("Unknown film type: \(cover.target)") }
  let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
  context.setFillColor(CGColor(srgbRed: background.0 / 255, green: background.1 / 255, blue: background.2 / 255, alpha: 1))
  context.fill(CGRect(x: 0, y: 0, width: width, height: height))

  let inner = CGFloat(width) - margin * 2
  draw(cover.brand.uppercased(), size: 26, weight: .semibold, in: CGRect(x: margin, y: 334, width: inner, height: 34), alpha: 0.85)
  let box = CGSize(width: inner, height: 232)
  let size = nameSize(cover.name, in: box)
  draw(cover.name, size: size, weight: .bold, in: CGRect(x: margin, y: 88, width: box.width, height: box.height))
  draw("ISO \(cover.iso)", size: 30, weight: .semibold, in: CGRect(x: margin, y: 30, width: inner / 2, height: 40))
  if let process = cover.process {
    draw(process, size: 30, weight: .regular, in: CGRect(x: margin + inner / 2, y: 30, width: inner / 2, height: 40), alignment: .right, alpha: 0.85)
  }

  let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: cover.target) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(destination, context.makeImage()!, nil)
  guard CGImageDestinationFinalize(destination) else { fatalError("Could not write \(cover.target)") }
}
print("Rendered \(covers.count) neutral covers at \(width)x\(height).")
