Pod::Spec.new do |s|
  s.name = 'FiLogPhotos'
  s.version = '1.0.0'
  s.summary = 'Read-only PhotoKit resolution for FiLog references'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'FiLog'
  s.homepage = 'https://expo.dev'
  s.source = { :git => 'https://expo.dev' }
  s.platform = :ios, '16.4'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Photos', 'PhotosUI', 'UIKit', 'CloudKit', 'CryptoKit', 'StoreKit'
  s.swift_version = '5.9'
  s.source_files = '**/*.{swift,h,m}'
  s.public_header_files = 'FiLogCloudContainer.h'
end
