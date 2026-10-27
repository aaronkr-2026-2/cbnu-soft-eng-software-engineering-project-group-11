#import <Foundation/Foundation.h>
#import <CloudKit/CloudKit.h>
#import <mach-o/loader.h>
#import <mach-o/fat.h>
#import <mach-o/dyld.h>
#import <objc/runtime.h>
#import "FiLogCloudContainer.h"

static NSUInteger checks = 0, initializations = 0;
static void Check(BOOL condition, NSString *message) {
  checks++;
  if (!condition) { NSLog(@"FAIL: %@", message); exit(1); }
}
static void SetBig(NSMutableData *data, NSUInteger offset, uint32_t value) {
  uint32_t big = CFSwapInt32HostToBig(value);
  [data replaceBytesInRange:NSMakeRange(offset, 4) withBytes:&big];
}
static NSMutableData *Signed(NSDictionary *entitlements) {
  NSData *xml = [NSPropertyListSerialization dataWithPropertyList:entitlements format:NSPropertyListXMLFormat_v1_0 options:0 error:nil];
  NSMutableData *data = [NSMutableData dataWithLength:76 + xml.length];
  const struct mach_header *running = _dyld_get_image_header(0);
  struct mach_header_64 header = { .magic = MH_MAGIC_64, .cputype = running->cputype, .cpusubtype = running->cpusubtype, .filetype = MH_EXECUTE, .ncmds = 1, .sizeofcmds = 16 };
  [data replaceBytesInRange:NSMakeRange(0, sizeof(header)) withBytes:&header];
  struct linkedit_data_command command = { .cmd = LC_CODE_SIGNATURE, .cmdsize = 16, .dataoff = 48, .datasize = (uint32_t)(28 + xml.length) };
  [data replaceBytesInRange:NSMakeRange(32, sizeof(command)) withBytes:&command];
  SetBig(data, 48, 0xfade0cc0); SetBig(data, 52, command.datasize); SetBig(data, 56, 1);
  SetBig(data, 60, 5); SetBig(data, 64, 20); SetBig(data, 68, 0xfade7171); SetBig(data, 72, (uint32_t)xml.length + 8);
  [data replaceBytesInRange:NSMakeRange(76, xml.length) withBytes:xml.bytes];
  return data;
}
@interface CloudTestDouble : NSObject
+ (CKContainer *)containerWithIdentifier:(NSString *)identifier;
+ (NSDictionary *)availability:(NSString *)identifier environment:(NSString *)environment;
@end
@implementation CloudTestDouble
+ (CKContainer *)containerWithIdentifier:(NSString *)identifier {
  initializations++;
  @throw [NSException exceptionWithName:@"CKException" reason:@"unrelated test exception" userInfo:nil];
}
+ (NSDictionary *)availability:(NSString *)identifier environment:(NSString *)environment { return @{ @"configured": @YES }; }
@end
int main(void) { @autoreleasepool {
  NSString *identifier = @"iCloud.com.manhduong2003.filog";
  NSDictionary *valid = @{ @"com.apple.developer.icloud-services": @[@"CloudKit"], @"com.apple.developer.icloud-container-identifiers": @[identifier], @"com.apple.developer.icloud-container-environment": @"Development" };
  NSDictionary *(^check)(NSDictionary *) = ^(NSDictionary *input) { return [FilmerCloudContainer checkEntitlements:input identifier:identifier environment:@"Development"]; };
  Check([check(valid)[@"configured"] boolValue], @"Valid signed CloudKit entitlement policy");
  Check([check(nil)[@"reason"] isEqual:@"signing-unavailable"], @"Unreadable signing fails closed");
  Check([check(@{})[@"reason"] isEqual:@"missing-entitlement"], @"Local signed app is not CloudKit enabled");
  NSMutableDictionary *changed = valid.mutableCopy; changed[@"com.apple.developer.icloud-services"] = @[@"CloudKit-Anonymous"];
  Check([check(changed)[@"reason"] isEqual:@"missing-entitlement"], @"Anonymous service cannot access FiLog private database");
  changed[@"com.apple.developer.icloud-services"] = @"CloudKit";
  Check([check(changed)[@"reason"] isEqual:@"missing-entitlement"], @"Malformed entitlement rejected");
  changed = valid.mutableCopy; changed[@"com.apple.developer.icloud-container-identifiers"] = @[@"iCloud.other"];
  Check([check(changed)[@"reason"] isEqual:@"container-mismatch"], @"Wrong container rejected");
  changed = valid.mutableCopy; changed[@"com.apple.developer.icloud-container-environment"] = @"Production";
  Check([check(changed)[@"reason"] isEqual:@"environment-mismatch"], @"Wrong environment rejected");
  Check([[FilmerCloudContainer checkEntitlements:valid identifier:@"invalid" environment:@"Development"][@"reason"] isEqual:@"configuration"], @"Invalid identifier rejected");
  NSMutableData *signedData = Signed(valid);
  Check([[FiLogCloudContainer signedEntitlements:signedData] isEqual:valid], @"Read actual Mach-O XML signature slot");
  Check([[FiLogCloudContainer signedEntitlements:Signed(@{})] isEqual:@{}], @"Empty signed entitlements stay empty");
  Check([FiLogCloudContainer signedEntitlements:[NSData data]] == nil, @"Unsigned input rejected");
  Check([FiLogCloudContainer signedEntitlements:[signedData subdataWithRange:NSMakeRange(0, 60)]] == nil, @"Truncated signature rejected");
  NSMutableData *corrupt = signedData.mutableCopy; SetBig(corrupt, 52, UINT32_MAX);
  Check([FiLogCloudContainer signedEntitlements:corrupt] == nil, @"Out-of-range superblob rejected");
  corrupt = signedData.mutableCopy; SetBig(corrupt, 64, UINT32_MAX);
  Check([FiLogCloudContainer signedEntitlements:corrupt] == nil, @"Out-of-range slot rejected");
  corrupt = signedData.mutableCopy; SetBig(corrupt, 60, 7);
  Check([FiLogCloudContainer signedEntitlements:corrupt] == nil, @"No XML slot fails closed");
  NSMutableData *fat = [NSMutableData dataWithLength:4096 + signedData.length];
  SetBig(fat, 0, FAT_MAGIC); SetBig(fat, 4, 1); SetBig(fat, 8, (uint32_t)_dyld_get_image_header(0)->cputype); SetBig(fat, 12, (uint32_t)_dyld_get_image_header(0)->cpusubtype); SetBig(fat, 16, 4096); SetBig(fat, 20, (uint32_t)signedData.length);
  [fat replaceBytesInRange:NSMakeRange(4096, signedData.length) withBytes:signedData.bytes];
  Check([[FiLogCloudContainer signedEntitlements:fat] isEqual:valid], @"Universal executable uses matching CPU slice");
  Method initializer = class_getClassMethod(CKContainer.class, @selector(containerWithIdentifier:));
  Method stub = class_getClassMethod(CloudTestDouble.class, @selector(containerWithIdentifier:));
  method_exchangeImplementations(initializer, stub);
  Check([FilmerCloudContainer make:identifier environment:@"Development"] == nil, @"Unsigned test process does not initialize CloudKit");
  Check(initializations == 0, @"No initializer call before entitlement preflight");
  Method availability = class_getClassMethod(FilmerCloudContainer.class, @selector(availability:environment:));
  Method allowed = class_getClassMethod(CloudTestDouble.class, @selector(availability:environment:));
  method_exchangeImplementations(availability, allowed);
  BOOL propagated = NO;
  @try { [FilmerCloudContainer make:identifier environment:@"Development"]; }
  @catch (NSException *exception) { propagated = [exception.reason isEqual:@"unrelated test exception"]; }
  Check(propagated && initializations == 1, @"Unrelated CKExceptions are not hidden after preflight");
  method_exchangeImplementations(availability, allowed); method_exchangeImplementations(initializer, stub);
  printf("Native CloudKit preflight: %lu checks passed; no real CloudKit container initialized.\n", (unsigned long)checks);
} return 0; }
