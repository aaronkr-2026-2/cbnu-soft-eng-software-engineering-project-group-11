import Photos
import UIKit

private final class ReferenceThumbnailCell: UICollectionViewCell {
  let imageView = UIImageView()
  let badge = UILabel()
  let loading = UIActivityIndicatorView(style: .medium)
  var renderToken = UUID()
  var identifier: String?
  var request: PHImageRequestID = PHInvalidImageRequestID
  weak var imageManager: PHImageManager?
  override init(frame: CGRect) {
    super.init(frame: frame)
    imageView.contentMode = .scaleAspectFill; imageView.clipsToBounds = true
    imageView.backgroundColor = .secondarySystemBackground
    badge.textAlignment = .center; badge.font = .systemFont(ofSize: 13, weight: .semibold)
    badge.layer.cornerRadius = 13; badge.layer.masksToBounds = true
    badge.layer.borderWidth = 1.5; badge.layer.borderColor = UIColor.white.cgColor
    contentView.addSubview(imageView); contentView.addSubview(loading); contentView.addSubview(badge)
    isAccessibilityElement = true
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
  override func layoutSubviews() {
    super.layoutSubviews(); imageView.frame = contentView.bounds
    badge.frame = CGRect(x: bounds.width - 32, y: 6, width: 26, height: 26)
    loading.center = CGPoint(x: bounds.midX, y: bounds.midY)
  }
  override func prepareForReuse() {
    super.prepareForReuse(); renderToken = UUID()
    if request != PHInvalidImageRequestID { imageManager?.cancelImageRequest(request) }
    request = PHInvalidImageRequestID; identifier = nil; imageView.image = nil; loading.stopAnimating()
  }
  func mark(order: Int?) {
    badge.text = order.map { String($0 + 1) } ?? ""
    badge.backgroundColor = order == nil ? UIColor.black.withAlphaComponent(0.2) : .white
    badge.textColor = .black
    imageView.alpha = order == nil ? 1 : 0.7
    accessibilityTraits = order == nil ? [.button] : [.button, .selected]
  }
}

/// Public PhotoKit + UICollectionView only; no original image export and no private picker inspection.
final class ReferenceSelectionViewController: UIViewController, UICollectionViewDataSource, UICollectionViewDelegateFlowLayout, UIGestureRecognizerDelegate, PHPhotoLibraryChangeObserver {
  var finish: (([String]?) -> Void)?
  private let labels: [String: String]
  private let manager = PHCachingImageManager()
  private var assets: PHFetchResult<PHAsset>?
  private var selection = OrderedPhotoSelection()
  private var finished = false
  private var refreshing = false
  private var refreshAgain = false
  private var lastWidth: CGFloat = 0
  private var displayLink: CADisplayLink?
  private var lastTick: CFTimeInterval = 0
  private var finger = CGPoint.zero
  private let countLabel = UILabel()
  private let hintLabel = UILabel()
  private let statusLabel = UILabel()
  private let accessButton = UIButton(type: .system)
  private let retryButton = UIButton(type: .system)
  private let spinner = UIActivityIndicatorView(style: .medium)
  private let addButton = UIButton(type: .system)
  private let clearButton = UIButton(type: .system)
  private let collection: UICollectionView
  private lazy var rangePan = UIPanGestureRecognizer(target: self, action: #selector(drag(_:)))

  init(labels: [String: String], dark: Bool) {
    self.labels = labels
    let layout = UICollectionViewFlowLayout()
    layout.minimumInteritemSpacing = 2; layout.minimumLineSpacing = 2
    collection = UICollectionView(frame: .zero, collectionViewLayout: layout)
    super.init(nibName: nil, bundle: nil)
    overrideUserInterfaceStyle = dark ? .dark : .light
    isModalInPresentation = true
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
  deinit { NotificationCenter.default.removeObserver(self); PHPhotoLibrary.shared().unregisterChangeObserver(self) }
  private func label(_ key: String) -> String { labels[key] ?? key }

  override func viewDidLoad() {
    super.viewDidLoad(); view.backgroundColor = .systemBackground; title = label("title")
    navigationItem.leftBarButtonItem = UIBarButtonItem(title: label("cancel"), style: .plain, target: self, action: #selector(cancel))
    hintLabel.text = label("hint"); hintLabel.font = .preferredFont(forTextStyle: .caption1); hintLabel.numberOfLines = 0
    hintLabel.textColor = .secondaryLabel; countLabel.font = .preferredFont(forTextStyle: .headline)
    statusLabel.font = .preferredFont(forTextStyle: .caption1); statusLabel.textColor = .secondaryLabel; statusLabel.numberOfLines = 0
    accessButton.setTitle(label("access"), for: .normal); accessButton.addTarget(self, action: #selector(manageAccess), for: .touchUpInside)
    retryButton.setTitle(label("retry"), for: .normal); retryButton.addTarget(self, action: #selector(refresh), for: .touchUpInside)
    let statusRow = UIStackView(arrangedSubviews: [statusLabel, spinner, retryButton, accessButton]); statusRow.spacing = 10
    statusRow.axis = .vertical; statusRow.alignment = .leading
    let header = UIStackView(arrangedSubviews: [hintLabel, statusRow]); header.axis = .vertical; header.spacing = 8
    let actions = UIStackView(arrangedSubviews: [clearButton, addButton]); actions.distribution = .equalSpacing
    let footer = UIStackView(arrangedSubviews: [countLabel, actions]); footer.axis = .vertical; footer.spacing = 4
    clearButton.setTitle(label("clear"), for: .normal); clearButton.addTarget(self, action: #selector(clear), for: .touchUpInside)
    addButton.setTitle(label("add"), for: .normal); addButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
    addButton.addTarget(self, action: #selector(confirm), for: .touchUpInside)
    for item in [header, collection, footer] { item.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(item) }
    NSLayoutConstraint.activate([
      addButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44), clearButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
      header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
      header.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16), header.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      collection.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 8), collection.leadingAnchor.constraint(equalTo: view.leadingAnchor), collection.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      footer.topAnchor.constraint(equalTo: collection.bottomAnchor, constant: 8), footer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16), footer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      footer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8), footer.heightAnchor.constraint(greaterThanOrEqualToConstant: 48)
    ])
    collection.backgroundColor = .systemBackground; collection.dataSource = self; collection.delegate = self
    collection.alwaysBounceVertical = true; collection.allowsMultipleSelection = true; collection.register(ReferenceThumbnailCell.self, forCellWithReuseIdentifier: "photo")
    rangePan.delegate = self; rangePan.maximumNumberOfTouches = 1
    collection.addGestureRecognizer(rangePan)
    // A vertical start scrolls normally. A horizontal start selects, then can cross any row.
    collection.panGestureRecognizer.require(toFail: rangePan)
    NotificationCenter.default.addObserver(self, selector: #selector(refresh), name: UIApplication.didBecomeActiveNotification, object: nil)
    PHPhotoLibrary.shared().register(self)
    updateSelection(); refresh()
  }
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    if lastWidth != collection.bounds.width { lastWidth = collection.bounds.width; collection.collectionViewLayout.invalidateLayout() }
  }
  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated); stopScroll(); manager.stopCachingImagesForAllAssets()
    if isBeingDismissed || navigationController?.isBeingDismissed == true { complete(nil) }
  }
  @objc private func refresh() {
    guard !finished else { return }
    if refreshing { refreshAgain = true; return }
    stopScroll(); selection.endRange()
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    guard status == .authorized || status == .limited else {
      assets = nil; collection.reloadData(); statusLabel.text = label("denied"); spinner.stopAnimating()
      accessButton.isHidden = false; retryButton.isHidden = false; updateSelection(); return
    }
    refreshing = true; addButton.isEnabled = false; spinner.startAnimating(); statusLabel.text = label("loading"); retryButton.isHidden = true
    accessButton.isHidden = status != .limited
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      let options = PHFetchOptions(); options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
      let fetched = PHAsset.fetchAssets(with: .image, options: options)
      DispatchQueue.main.async {
        guard let self = self, !self.finished else { return }
        self.assets = fetched; self.refreshing = false; self.spinner.stopAnimating()
        self.statusLabel.text = status == .limited ? self.label("limited") : fetched.count == 0 ? self.label("empty") : nil
        self.collection.reloadData(); self.updateSelection()
        if self.refreshAgain { self.refreshAgain = false; self.refresh() }
      }
    }
  }
  func photoLibraryDidChange(_ changeInstance: PHChange) { DispatchQueue.main.async { [weak self] in self?.refresh() } }
  @objc private func manageAccess() {
    if PHPhotoLibrary.authorizationStatus(for: .readWrite) == .limited {
      PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: self) { [weak self] _ in self?.refresh() }
    } else if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
  }
  @objc private func clear() { selection.clear(); updateSelection() }
  @objc private func cancel() { complete(nil) }
  @objc private func confirm() {
    guard !refreshing, !selection.identifiers.isEmpty else { return }
    complete(selection.identifiers)
  }
  private func complete(_ identifiers: [String]?) {
    guard !finished else { return }; finished = true; stopScroll()
    let callback = finish; finish = nil
    dismiss(animated: true) { callback?(identifiers) }
  }
  private func updateSelection() {
    countLabel.text = label(selection.identifiers.count == 1 ? "countOne" : "countMany").replacingOccurrences(of: "{count}", with: String(selection.identifiers.count))
    clearButton.isEnabled = !selection.identifiers.isEmpty
    let access = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    addButton.isEnabled = !refreshing && !selection.identifiers.isEmpty && (access == .authorized || access == .limited)
    let positions = Dictionary(uniqueKeysWithValues: selection.identifiers.enumerated().map { ($0.element, $0.offset) })
    for case let cell as ReferenceThumbnailCell in collection.visibleCells { cell.mark(order: cell.identifier.flatMap { positions[$0] }) }
  }
  private func asset(at index: Int) -> PHAsset? {
    guard let assets = assets, index >= 0, index < assets.count else { return nil }
    return assets.object(at: index)
  }
  func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int { assets?.count ?? 0 }
  func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
    let columns: CGFloat = collectionView.bounds.width >= 600 ? 6 : 3
    let side = floor((collectionView.bounds.width - (columns - 1) * 2) / columns)
    return CGSize(width: max(1, side), height: max(1, side))
  }
  func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
    let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "photo", for: indexPath) as! ReferenceThumbnailCell
    guard let asset = asset(at: indexPath.item) else { return cell }
    cell.renderToken = UUID(); let token = cell.renderToken
    cell.identifier = asset.localIdentifier; cell.imageManager = manager; cell.imageView.image = nil; cell.imageView.contentMode = .scaleAspectFill
    cell.accessibilityLabel = label("photo") + " " + String(indexPath.item + 1)
    cell.mark(order: selection.identifiers.firstIndex(of: asset.localIdentifier)); cell.loading.startAnimating()
    let side = max(1, cell.bounds.width) * view.traitCollection.displayScale
    let options = PHImageRequestOptions(); options.resizeMode = .fast; options.deliveryMode = .opportunistic; options.isNetworkAccessAllowed = true
    let imageError = label("imageError")
    cell.accessibilityHint = nil
    cell.request = manager.requestImage(for: asset, targetSize: CGSize(width: side, height: side), contentMode: .aspectFill, options: options) { [weak self, weak cell] image, info in
      DispatchQueue.main.async {
        guard let cell = cell, cell.identifier == asset.localIdentifier, cell.renderToken == token else { return }
        if let image = image { cell.imageView.image = image }
        if image != nil || info?[PHImageErrorKey] != nil || (info?[PHImageCancelledKey] as? Bool) == true { cell.loading.stopAnimating() }
        if image == nil && (info?[PHImageResultIsDegradedKey] as? Bool) != true {
          cell.loading.stopAnimating(); cell.imageView.contentMode = .scaleAspectFit
          cell.imageView.image = UIImage(systemName: "exclamationmark.icloud"); cell.accessibilityHint = imageError
          self?.statusLabel.text = imageError; self?.retryButton.isHidden = false
        }
      }
    }
    return cell
  }
  func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
    guard !refreshing, let asset = asset(at: indexPath.item) else { return }
    collectionView.deselectItem(at: indexPath, animated: false)
    selection.toggle(asset.localIdentifier); updateSelection()
  }
  func collectionView(_ collectionView: UICollectionView, didEndDisplaying cell: UICollectionViewCell, forItemAt indexPath: IndexPath) {
    guard let cell = cell as? ReferenceThumbnailCell else { return }
    cell.renderToken = UUID()
    if cell.request != PHInvalidImageRequestID { manager.cancelImageRequest(cell.request) }
  }
  func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    guard gestureRecognizer === rangePan, !refreshing else { return false }
    let velocity = rangePan.velocity(in: collection)
    return abs(velocity.x) > abs(velocity.y) && collection.indexPathForItem(at: rangePan.location(in: collection)) != nil
  }
  @objc private func drag(_ gesture: UIPanGestureRecognizer) {
    finger = gesture.location(in: view)
    switch gesture.state {
    case .began:
      let location = gesture.location(in: collection), translation = gesture.translation(in: collection)
      let origin = CGPoint(x: location.x - translation.x, y: location.y - translation.y)
      guard let index = collection.indexPathForItem(at: origin)?.item, let assets = assets, index < assets.count else { return }
      selection.beginRange(at: index) { assets.object(at: $0).localIdentifier }
      updateSelection(); startScroll()
    case .changed: extendRange()
    case .ended: extendRange(); selection.endRange(); stopScroll()
    case .cancelled, .failed: selection.cancelRange(); updateSelection(); stopScroll()
    default: break
    }
  }
  private func extendRange() {
    guard let assets = assets, assets.count > 0 else { return }
    let point = collection.convert(finger, from: view)
    var index = collection.indexPathForItem(at: point)?.item
    if index == nil {
      // Gaps and footer space resolve to the nearest visible cell; no frame is opened.
      index = collection.indexPathsForVisibleItems.min { a, b in
        let ca = collection.layoutAttributesForItem(at: a)?.center ?? point
        let cb = collection.layoutAttributesForItem(at: b)?.center ?? point
        return hypot(ca.x - point.x, ca.y - point.y) < hypot(cb.x - point.x, cb.y - point.y)
      }?.item
    }
    if let index = index { selection.updateRange(to: min(assets.count - 1, max(0, index))) { assets.object(at: $0).localIdentifier }; updateSelection() }
  }
  private func startScroll() {
    stopScroll(); let link = CADisplayLink(target: self, selector: #selector(tick(_:)))
    displayLink = link; lastTick = 0; link.add(to: .main, forMode: .common)
  }
  private func stopScroll() { displayLink?.invalidate(); displayLink = nil; lastTick = 0 }
  @objc private func tick(_ link: CADisplayLink) {
    let delta = lastTick == 0 ? 1.0 / 60 : min(0.05, link.timestamp - lastTick); lastTick = link.timestamp
    let top = Double(collection.frame.minY), bottom = Double(collection.frame.maxY)
    let velocity = photoSelectionScrollVelocity(y: Double(finger.y), top: top, bottom: bottom)
    let lower = -collection.adjustedContentInset.top
    let upper = max(lower, collection.contentSize.height - collection.bounds.height + collection.adjustedContentInset.bottom)
    let next = min(upper, max(lower, collection.contentOffset.y + CGFloat(velocity * delta)))
    if next != collection.contentOffset.y { collection.setContentOffset(CGPoint(x: 0, y: next), animated: false); extendRange() }
  }
}
