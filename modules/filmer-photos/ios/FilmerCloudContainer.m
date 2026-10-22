#import "FilmerCloudContainer.h"

@implementation FilmerCloudContainer
+ (nullable CKContainer *)make:(NSString *)identifier {
  @try {
    return [CKContainer containerWithIdentifier:identifier];
  } @catch (NSException *exception) {
    // Missing CloudKit entitlements can raise CKException instead of an NSError.
    // Local-only/unsigned builds remain usable; never fabricate a configured container.
    if ([exception.name isEqualToString:@"CKException"]) return nil;
    @throw;
  }
}
@end
