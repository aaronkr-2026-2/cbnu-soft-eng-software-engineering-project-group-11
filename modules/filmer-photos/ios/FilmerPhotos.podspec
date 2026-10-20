Pod::Spec.new do |s|
  s.name = 'FilmerPhotos'
  s.version = '1.0.0'
  s.summary = 'Read-only PhotoKit resolution for FILMER references'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'FILMER'
  s.homepage = 'https://expo.dev'
  s.source = { :git => 'https://expo.dev' }
  s.platform = :ios, '16.4'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Photos', 'PhotosUI', 'UIKit'
  s.swift_version = '5.9'
  s.source_files = '**/*.swift'
end
