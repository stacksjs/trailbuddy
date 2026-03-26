package to.holepunch.b4a;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import java.util.HashMap;
import java.util.Map;

public class BufferForArrayPackage extends BaseReactPackage {
  public static String NAME = "BufferForArray";

  @Override
  public NativeModule
  getModule(String name, ReactApplicationContext context) {
    return null;
  }

  @Override
  public ReactModuleInfoProvider
  getReactModuleInfoProvider() {
    return () -> {
      Map<String, ReactModuleInfo> map = new HashMap<>();
      map.put(NAME, new ReactModuleInfo(NAME, NAME, false, false, true, true));
      return map;
    };
  }
}
