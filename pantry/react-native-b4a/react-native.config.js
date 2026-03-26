module.exports = {
  dependency: {
    platforms: {
      ios: {},
      android: {
        cxxModuleCMakeListsModuleName: 'react-native-b4a',
        cxxModuleCMakeListsPath: 'CMakeLists.txt',
        cxxModuleHeaderName: 'BufferForArrayModule'
      }
    }
  }
}
