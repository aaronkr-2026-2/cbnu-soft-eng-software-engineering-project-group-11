#import <Foundation/Foundation.h>
#import <CloudKit/CloudKit.h>

NS_ASSUME_NONNULL_BEGIN
/** Inspect the app's embedded code signature before invoking CloudKit. No private Security APIs. */
@interface FilmerCloudContainer : NSObject
+ (NSDictionary<NSString *, id> *)availability:(NSString *)identifier environment:(NSString *)environment;
+ (nullable CKContainer *)make:(NSString *)identifier environment:(NSString *)environment;
/** Shared parser/policy entry points also exercised by the native regression tests. */
+ (nullable NSDictionary *)signedEntitlements:(NSData *)executable;
+ (NSDictionary<NSString *, id> *)checkEntitlements:(nullable NSDictionary *)entitlements identifier:(NSString *)identifier environment:(NSString *)environment;
@end
NS_ASSUME_NONNULL_END
