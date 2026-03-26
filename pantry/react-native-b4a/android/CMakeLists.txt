cmake_minimum_required(VERSION 3.22)

project(react-native-b4a)

add_library(react-native-b4a STATIC)

set_target_properties(
  react-native-b4a
  PROPERTIES
  CXX_STANDARD 20
  CXX_SCAN_FOR_MODULES OFF
)

target_sources(
  react-native-b4a
  PRIVATE
    ../shared/BufferForArrayModule.cc
    ../shared/BufferForArrayModule.h
)

target_include_directories(
  react-native-b4a
  PUBLIC
    ../shared
)

target_link_libraries(
  react-native-b4a
  react_codegen_BufferForArraySpec
)
