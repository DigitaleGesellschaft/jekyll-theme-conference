# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "jekyll-theme-conference"
  spec.version       = "3.2.0"
  spec.authors       = ["Lorenz Schmid"]
  spec.email         = ["lorenzschmid@users.noreply.github.com"]

  spec.summary       = "Jekyll template for a conference website containing program, speaker, talks and room overview."
  spec.homepage      = "https://github.com/DigitaleGesellschaft/jekyll-theme-conference/"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_sass|LICENSE|README)!i) }

  spec.add_runtime_dependency "jekyll", "~> 4.0"

  spec.add_development_dependency "bundler", "~> 2.1.4"
  spec.add_development_dependency "rake", "~> 12.0"
end
