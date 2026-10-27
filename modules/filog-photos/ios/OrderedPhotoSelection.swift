import Foundation

/// Picker-session state only. Never changes persisted Roll/photo records.
struct OrderedPhotoSelection {
  private(set) var identifiers: [String] = []
  private var selected = Set<String>()
  private var anchor: Int?
  private var previousEnd: Int?
  private var snapshot: [String] = []
  private var selecting = true

  func contains(_ id: String) -> Bool { selected.contains(id) }
  mutating func toggle(_ id: String) {
    guard !id.isEmpty else { return }
    if selected.remove(id) != nil { identifiers.removeAll { $0 == id } }
    else { selected.insert(id); identifiers.append(id) }
  }
  mutating func clear() { endRange(); identifiers = []; selected = [] }
  mutating func beginRange(at index: Int, identifier: (Int) -> String) {
    endRange()
    anchor = index; snapshot = identifiers
    selecting = !contains(identifier(index))
    updateRange(to: index, identifier: identifier)
  }
  mutating func updateRange(to index: Int, identifier: (Int) -> String) {
    guard let anchor = anchor, previousEnd != index else { return }
    previousEnd = index
    identifiers = snapshot; selected = Set(snapshot)
    // Restoring the snapshot makes reverse-drag undo this gesture, not earlier selections.
    for position in stride(from: anchor, through: index, by: index >= anchor ? 1 : -1) {
      let id = identifier(position)
      guard !id.isEmpty else { continue }
      if selecting {
        if selected.insert(id).inserted { identifiers.append(id) }
      } else if selected.remove(id) != nil { identifiers.removeAll { $0 == id } }
    }
  }
  mutating func endRange() { anchor = nil; previousEnd = nil; snapshot = [] }
  mutating func cancelRange() { guard anchor != nil else { return }; identifiers = snapshot; selected = Set(snapshot); endRange() }
}

/// Signed points/second, shared by CADisplayLink and deterministic native tests.
func photoSelectionScrollVelocity(y: Double, top: Double, bottom: Double) -> Double {
  guard bottom > top else { return 0 }
  let zone = min(64.0, (bottom - top) / 3)
  if y < top + zone { return -640 * min(1, max(0, (top + zone - y) / zone)) }
  if y > bottom - zone { return 640 * min(1, max(0, (y - bottom + zone) / zone)) }
  return 0
}
