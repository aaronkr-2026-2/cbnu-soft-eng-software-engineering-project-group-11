import ExpoModulesCore
import StoreKit

/** Optional tips as consumable in-app purchases. Names and prices come from the App Store; nothing is unlocked. */
public class FiLogTipsModule: Module {
  private var updates: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("FiLogTips")
    OnCreate {
      // Finish tips completed outside an active purchase call (interrupted purchases, Ask to Buy).
      self.updates = Task.detached {
        for await result in Transaction.updates {
          if case .verified(let transaction) = result { await transaction.finish() }
        }
      }
    }
    OnDestroy { self.updates?.cancel() }
    AsyncFunction("products") { (ids: [String]) async throws -> [[String: Any]] in
      try await Product.products(for: ids).map { product in
        ["id": product.id, "title": product.displayName, "description": product.description,
         "price": product.displayPrice, "value": NSDecimalNumber(decimal: product.price).doubleValue]
      }
    }
    AsyncFunction("purchase") { (id: String) async throws -> String in
      guard let product = try await Product.products(for: [id]).first else { return "unavailable" }
      switch try await product.purchase() {
      case .success(let verification):
        guard case .verified(let transaction) = verification else { return "unverified" }
        await transaction.finish()
        return "success"
      case .userCancelled: return "cancelled"
      case .pending: return "pending"
      @unknown default: return "unknown"
      }
    }
  }
}
