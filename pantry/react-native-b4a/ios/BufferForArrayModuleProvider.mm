#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/TurboModule.h>

#import "BufferForArrayModule.h"
#import "BufferForArrayModuleProvider.h"

using namespace facebook::react;

@implementation BufferForArrayModuleProvider

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params {
  return std::make_shared<BufferForArrayModule>(params.jsInvoker);
}

@end
