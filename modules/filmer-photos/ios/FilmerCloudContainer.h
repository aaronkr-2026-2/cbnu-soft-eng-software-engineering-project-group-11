#import <Foundation/Foundation.h>
#import <CloudKit/CloudKit.h>

NS_ASSUME_NONNULL_BEGIN
/** Catch CloudKit's Objective-C entitlement exception before crossing the Swift/JS boundary. */
@interface FilmerCloudContainer : NSObject
+ (nullable CKContainer *)make:(NSString *)identifier;
@end
NS_ASSUME_NONNULL_END
