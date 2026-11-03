#import "FiLogCloudContainer.h"
#import <mach-o/loader.h>
#import <mach-o/fat.h>
#import <mach-o/dyld.h>
#import <mach-o/getsect.h>

// Read only this process's executable. The OS validates its signature when launching a device app.
// Unreadable/unsupported signatures fail closed; a provisioning profile alone is not proof of
// the entitlements actually embedded in the application. No dlsym/private entitlement APIs.
static BOOL Range(NSData *data, uint64_t offset, uint64_t length) {
  return offset <= data.length && length <= data.length - offset;
}
static uint32_t Word(NSData *data, uint64_t offset) {
  uint32_t value = 0;
  if (Range(data, offset, sizeof(value))) memcpy(&value, (const uint8_t *)data.bytes + offset, sizeof(value));
  return value;
}
static uint32_t BigWord(NSData *data, uint64_t offset) {
  return CFSwapInt32BigToHost(Word(data, offset));
}
static uint64_t BigLong(NSData *data, uint64_t offset) {
  uint64_t value = 0;
  if (Range(data, offset, sizeof(value))) memcpy(&value, (const uint8_t *)data.bytes + offset, sizeof(value));
  return CFSwapInt64BigToHost(value);
}

@implementation FiLogCloudContainer
+ (nullable NSDictionary *)signedEntitlements:(NSData *)data {
  uint64_t base = 0, sliceLength = data.length;
  const struct mach_header *running = _dyld_get_image_header(0);
  uint32_t fatMagic = BigWord(data, 0);
  if (fatMagic == FAT_MAGIC || fatMagic == FAT_MAGIC_64) {
    uint32_t count = BigWord(data, 4);
    uint32_t entrySize = fatMagic == FAT_MAGIC_64 ? 32 : 20;
    if (!count || count > 64 || !Range(data, 8, (uint64_t)count * entrySize)) return nil;
    BOOL found = NO;
    for (uint32_t i = 0; i < count; i++) {
      uint64_t entry = 8 + (uint64_t)i * entrySize;
      if (BigWord(data, entry) != (uint32_t)running->cputype ||
          (BigWord(data, entry + 4) & ~CPU_SUBTYPE_MASK) != ((uint32_t)running->cpusubtype & ~CPU_SUBTYPE_MASK)) continue;
      base = entrySize == 32 ? BigLong(data, entry + 8) : BigWord(data, entry + 8);
      sliceLength = entrySize == 32 ? BigLong(data, entry + 16) : BigWord(data, entry + 12);
      found = YES; break;
    }
    if (!found || !Range(data, base, sliceLength)) return nil;
  }
  uint32_t magic = Word(data, base);
  uint64_t headerSize = magic == MH_MAGIC_64 ? 32 : magic == MH_MAGIC ? 28 : 0;
  if (!headerSize || sliceLength < headerSize || !Range(data, base, headerSize) || Word(data, base + 4) != (uint32_t)running->cputype) return nil;
  uint32_t commands = Word(data, base + 16), commandBytes = Word(data, base + 20);
  if (commands > 4096 || commandBytes > sliceLength - headerSize) return nil;
  uint64_t position = base + headerSize, commandEnd = position + commandBytes;
  for (uint32_t i = 0; i < commands; i++) {
    if (position > commandEnd || commandEnd - position < 8) return nil;
    uint32_t command = Word(data, position), size = Word(data, position + 4);
    if (size < 8 || size > commandEnd - position) return nil;
    if (command == LC_CODE_SIGNATURE) {
      if (size < 16) return nil;
      uint32_t offset = Word(data, position + 8), length = Word(data, position + 12);
      if (offset > sliceLength || length > sliceLength - offset || length < 12) return nil;
      uint64_t signature = base + offset;
      if (BigWord(data, signature) != 0xfade0cc0) return nil; // EmbeddedSignature SuperBlob.
      uint32_t total = BigWord(data, signature + 4), count = BigWord(data, signature + 8);
      if (total < 12 || total > length || count > (total - 12) / 8) return nil;
      for (uint32_t j = 0; j < count; j++) {
        uint64_t index = signature + 12 + (uint64_t)j * 8;
        if (BigWord(data, index) != 5) continue; // CSSLOT_ENTITLEMENTS (XML plist).
        uint32_t relative = BigWord(data, index + 4);
        if (relative < 12 + (uint64_t)count * 8 || relative > total || total - relative < 8) return nil;
        uint64_t blob = signature + relative;
        uint32_t blobLength = BigWord(data, blob + 4);
        if (BigWord(data, blob) != 0xfade7171 || blobLength < 8 || blobLength > total - relative) return nil;
        NSData *xml = [data subdataWithRange:NSMakeRange((NSUInteger)blob + 8, blobLength - 8)];
        id plist = [NSPropertyListSerialization propertyListWithData:xml options:NSPropertyListImmutable format:nil error:nil];
        return [plist isKindOfClass:[NSDictionary class]] ? plist : nil;
      }
      return nil; // Do not guess if no readable signed XML entitlement slot exists.
    }
    position += size;
  }
  return nil;
}
+ (NSDictionary<NSString *, id> *)checkEntitlements:(nullable NSDictionary *)entitlements identifier:(NSString *)identifier {
  NSString *reason = nil, *environment = nil;
  if (![identifier hasPrefix:@"iCloud."]) reason = @"configuration";
  else if (!entitlements) reason = @"signing-unavailable";
  else {
    id services = entitlements[@"com.apple.developer.icloud-services"];
    id containers = entitlements[@"com.apple.developer.icloud-container-identifiers"];
    // FiLog requires authenticated private CloudKit; CloudKit-Anonymous cannot provide it.
    if (![services isKindOfClass:[NSArray class]] || ![services containsObject:@"CloudKit"]) reason = @"missing-entitlement";
    else if (![containers isKindOfClass:[NSArray class]] || ![containers containsObject:identifier]) reason = @"container-mismatch";
    else {
      // Xcode omits this key for development signing, where CloudKit uses Development; distribution
      // exports add it. The signature, not the Info.plist build setting, decides the live environment.
      id signedEnvironment = entitlements[@"com.apple.developer.icloud-container-environment"] ?: @"Development";
      if ([@[@"Development", @"Production"] containsObject:signedEnvironment]) environment = signedEnvironment;
      else reason = @"environment-mismatch";
    }
  }
  return reason ? @{ @"configured": @NO, @"reason": reason } : @{ @"configured": @YES, @"environment": environment };
}
+ (NSDictionary<NSString *, id> *)availability:(NSString *)identifier {
#if TARGET_OS_SIMULATOR
  // Simulator builds are ad-hoc signed; Xcode embeds their entitlements in __TEXT,__entitlements instead.
  unsigned long size = 0;
  uint8_t *section = getsectiondata((const struct mach_header_64 *)_dyld_get_image_header(0), "__TEXT", "__entitlements", &size);
  id plist = section && size ? [NSPropertyListSerialization propertyListWithData:[NSData dataWithBytes:section length:size] options:NSPropertyListImmutable format:nil error:nil] : nil;
  NSDictionary *entitlements = [plist isKindOfClass:[NSDictionary class]] ? plist : nil;
#else
  NSURL *url = NSBundle.mainBundle.executableURL;
  NSData *data = url ? [NSData dataWithContentsOfURL:url options:NSDataReadingMappedIfSafe error:nil] : nil;
  NSDictionary *entitlements = data ? [self signedEntitlements:data] : nil;
#endif
  return [self checkEntitlements:entitlements identifier:identifier];
}
+ (nullable CKContainer *)make:(NSString *)identifier {
  if (![[self availability:identifier][@"configured"] boolValue]) return nil;
  // Preflight passed. Do not hide unrelated CKExceptions or programming errors with @catch.
  return [CKContainer containerWithIdentifier:identifier];
}
@end
