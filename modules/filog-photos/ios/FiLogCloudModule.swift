import ExpoModulesCore
import CloudKit
import CryptoKit
import Foundation

/** Metadata-only transport. Availability follows the signed container entitlements, never a UI flag. */
public class FiLogCloudModule: Module {
  private let zoneID = CKRecordZone.ID(zoneName: "FiLog-v1", ownerName: CKCurrentUserDefaultName)
  private let sessionID = UUID().uuidString
  private var accountObserver: NSObjectProtocol?
  private let containerLock = NSLock()
  private var triedContainer = false
  private var cachedContainer: CKContainer?
  private var cachedAvailability: [String: Any] = ["configured": false, "reason": "configuration"]
  private var identifier: String? {
    return Bundle.main.object(forInfoDictionaryKey: "FiLogCloudContainer") as? String
  }
  private func container() -> CKContainer? {
    containerLock.lock(); defer { containerLock.unlock() }
    if !triedContainer {
      triedContainer = true
      if let identifier = identifier, identifier.hasPrefix("iCloud.") {
        cachedAvailability = FiLogCloudContainer.availability(identifier)
        if cachedAvailability["configured"] as? Bool == true {
          cachedContainer = FiLogCloudContainer.make(identifier)
        }
      }
    }
    return cachedContainer
  }
  private func requireContainer() throws -> CKContainer {
    guard let container = container() else { throw CKError(.missingEntitlement) }
    return container
  }
  private func database() throws -> CKDatabase {
    return try requireContainer().privateCloudDatabase
  }
  private func failure(_ error: Error) -> [String: Any] {
    let ck = error as? CKError
    let kind: String
    switch ck?.code {
    case .networkUnavailable, .networkFailure, .serviceUnavailable, .requestRateLimited, .zoneBusy: kind = "network"
    case .quotaExceeded: kind = "quota"
    case .notAuthenticated, .accountTemporarilyUnavailable: kind = "account"
    case .badContainer, .missingEntitlement, .badDatabase: kind = "configuration"
    default: kind = "unknown"
    }
    return ["error": ["kind": kind, "code": ck.map { String($0.code.rawValue) } ?? "configuration", "message": error.localizedDescription,
                       "retryAfter": (error as NSError).userInfo[CKErrorRetryAfterKey] as? Double ?? 30]]
  }
  private func item(_ record: CKRecord) throws -> [String: Any] {
    guard record.recordType == "FiLogEntity", let document = record["document"] as? String else {
      throw NSError(domain: "FiLogCloud", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unsupported cloud record; sync paused"])
    }
    return ["document": document, "tag": record.recordChangeTag ?? ""]
  }
  public func definition() -> ModuleDefinition {
    Name("FiLogCloud")
    Events("onAccountChanged")
    OnStartObserving {
      self.accountObserver = NotificationCenter.default.addObserver(forName: .CKAccountChanged, object: nil, queue: .main) { [weak self] _ in
        self?.sendEvent("onAccountChanged", [:])
      }
    }
    OnStopObserving {
      if let observer = self.accountObserver { NotificationCenter.default.removeObserver(observer) }
      self.accountObserver = nil
    }
    OnDestroy {
      if let observer = self.accountObserver { NotificationCenter.default.removeObserver(observer) }
      self.accountObserver = nil
    }
    Constant("deviceID") { self.sessionID }
    Constant("namespace") {
      // Journals follow the environment CloudKit actually uses, which a development-signed Release run makes Development.
      _ = self.container()
      return (self.identifier ?? "unconfigured") + "." + (self.cachedAvailability["environment"] as? String ??
        Bundle.main.object(forInfoDictionaryKey: "FiLogCloudEnvironment") as? String ?? "unknown")
    }
    AsyncFunction("account") { () async -> [String: Any] in
      guard let container = self.container() else { return self.cachedAvailability }
      do {
        let status = try await container.accountStatus()
        guard status == .available else { return ["configured": true, "available": false, "status": status.rawValue] }
        let user = try await container.userRecordID()
        return ["configured": true, "available": true, "account": user.recordName]
      } catch { return self.failure(error) }
    }
    AsyncFunction("fetch") { (token: String?, account: String) async -> [String: Any] in
      do {
        guard try await self.requireContainer().userRecordID().recordName == account else {
          throw CKError(.notAuthenticated)
        }
        let db = try self.database()
        do { _ = try await db.recordZone(for: self.zoneID) }
        catch let error as CKError where error.code == .zoneNotFound {
          // Never silently recreate a lost zone after a previously successful session.
          guard token == nil else { throw error }
          _ = try await db.save(CKRecordZone(zoneID: self.zoneID))
        }
        let config = CKFetchRecordZoneChangesOperation.ZoneConfiguration()
        if let token = token {
          guard let bytes = Data(base64Encoded: token),
                let decoded = try NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: bytes) else {
            throw NSError(domain: "FiLogCloud", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid saved cloud checkpoint"])
          }
          config.previousServerChangeToken = decoded
        }
        config.resultsLimit = 100
        let result: [String: Any] = try await withCheckedThrowingContinuation { continuation in
          let operation = CKFetchRecordZoneChangesOperation(recordZoneIDs: [self.zoneID], configurationsByRecordZoneID: [self.zoneID: config])
          operation.fetchAllChanges = false
          let lock = NSLock()
          var records: [[String: Any]] = []
          var failure: Error?
          var checkpoint: CKServerChangeToken?
          var more = false
          operation.recordWasChangedBlock = { _, result in
            lock.lock(); defer { lock.unlock() }
            do { records.append(try self.item(result.get())) } catch { failure = error }
          }
          // Physical cloud deletion has no field/tombstone history: pause instead of guessing a merge.
          operation.recordWithIDWasDeletedBlock = { _, _ in
            lock.lock(); defer { lock.unlock() }
            failure = NSError(domain: "FiLogCloud", code: 4, userInfo: [NSLocalizedDescriptionKey: "Cloud records were removed outside FiLog; sync paused"])
          }
          operation.recordZoneFetchResultBlock = { _, result in
            lock.lock(); defer { lock.unlock() }
            switch result {
            case .success(let value): checkpoint = value.serverChangeToken; more = value.moreComing
            case .failure(let error): failure = error
            }
          }
          operation.fetchRecordZoneChangesResultBlock = { result in
            lock.lock(); defer { lock.unlock() }
            do {
              try result.get()
              if let failure = failure { throw failure }
              guard let checkpoint = checkpoint else { throw CKError(.internalError) }
              let bytes = try NSKeyedArchiver.archivedData(withRootObject: checkpoint, requiringSecureCoding: true)
              continuation.resume(returning: ["records": records, "token": bytes.base64EncodedString(), "more": more])
            } catch { continuation.resume(throwing: error) }
          }
          db.add(operation)
        }
        guard try await self.requireContainer().userRecordID().recordName == account else { throw CKError(.notAuthenticated) }
        return result
      } catch { return self.failure(error) }
    }
    AsyncFunction("save") { (key: String, document: String, expectedTag: String?, account: String) async -> [String: Any] in
      do {
        guard document.utf8.count < 800_000 else { throw CKError(.limitExceeded) }
        guard try await self.requireContainer().userRecordID().recordName == account else {
          throw CKError(.notAuthenticated)
        }
        let db = try self.database()
        let hash = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
        let recordID = CKRecord.ID(recordName: hash, zoneID: self.zoneID)
        var record: CKRecord
        do {
          record = try await db.record(for: recordID)
          if record.recordChangeTag != expectedTag { return ["conflict": try self.item(record)] }
        } catch let error as CKError where error.code == .unknownItem {
          // A known record disappearing must not resurrect it as a new record.
          guard expectedTag == nil else { throw error }
          record = CKRecord(recordType: "FiLogEntity", recordID: recordID)
        }
        record["document"] = document as CKRecordValue
        do {
          let result = try await db.modifyRecords(saving: [record], deleting: [], savePolicy: .ifServerRecordUnchanged, atomically: true)
          guard let savedResult = result.saveResults[recordID] else { throw CKError(.internalError) }
          let saved = try savedResult.get()
          guard try await self.requireContainer().userRecordID().recordName == account else { throw CKError(.notAuthenticated) }
          return try self.item(saved)
        } catch let error as CKError where error.code == .serverRecordChanged {
          if let server = error.serverRecord { return ["conflict": try self.item(server)] }
          throw error
        }
      } catch { return self.failure(error) }
    }
  }
}
