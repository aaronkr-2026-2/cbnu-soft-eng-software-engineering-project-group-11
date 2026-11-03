import Foundation
var checks = 0
func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
  checks += 1
  if !condition() { fatalError(message) }
}
let id: (Int) -> String = { "asset-\($0)" }
var selection = OrderedPhotoSelection()
selection.toggle(id(2)); expect(selection.identifiers == [id(2)], "single selection")
selection.toggle(id(2)); expect(selection.identifiers.isEmpty, "tap deselect")
selection.toggle(id(9)); selection.toggle(id(0))
expect(selection.identifiers == [id(9),id(0)], "tap order")
selection.beginRange(at: 1, identifier: id); selection.updateRange(to: 8, identifier: id)
expect(selection.identifiers == [id(9),id(0)] + (1...8).map(id), "continuous range crosses three rows")
selection.updateRange(to: 3, identifier: id)
expect(selection.identifiers == [id(9),id(0)] + (1...3).map(id), "reverse restores original selections")
selection.endRange(); selection.beginRange(at: 3, identifier: id); selection.updateRange(to: 1, identifier: id)
expect(selection.identifiers == [id(9),id(0)], "drag selected range to deselect")
selection.cancelRange(); expect(selection.identifiers == [id(9),id(0)] + (1...3).map(id), "cancel restores snapshot")
selection.cancelRange(); expect(selection.identifiers.count == 5, "cancel without active gesture is harmless")
selection.clear(); selection.beginRange(at: 35, identifier: id); selection.updateRange(to: 0, identifier: id); selection.endRange()
expect(selection.identifiers == (0...35).reversed().map(id), "36 reverse-selected frames retain gesture order")
expect(Set(selection.identifiers).count == 36, "no duplicates")
selection.clear(); selection.beginRange(at: 0, identifier: id)
for index in 1...150 { selection.updateRange(to: index, identifier: id) }
expect(selection.identifiers.count == 151, "edge scrolling extends selection across 100+ frames")
expect(photoSelectionScrollVelocity(y: 20, top: 0, bottom: 600) < 0, "top scroll direction")
expect(photoSelectionScrollVelocity(y: 590, top: 0, bottom: 600) > 0, "bottom scroll direction")
expect(photoSelectionScrollVelocity(y: 300, top: 0, bottom: 600) == 0, "center does not auto scroll")
expect(abs(photoSelectionScrollVelocity(y: -200, top: 0, bottom: 600)) <= 640, "bounded edge speed")
selection.clear(); expect(selection.identifiers.isEmpty, "deselect all")
print("Native selection: \(checks) assertions passed")
