# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "jekyll-theme-conference"
  spec.version       = "3.7.2"
  spec.authors       = ["Lorenz Schmid"]
  spec.email         = ["lorenzschmid@users.noreply.github.com"]

  spec.summary       = "Jekyll template for a conference website containing program, speaker, talks and room overview."
  spec.homepage      = "https://github.com/DigitaleGesellschaft/jekyll-theme-conference/"
  spec.license       = "MIT"

  spec.files         = begin
    files = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|LICENSE|README|REDISTRIBUTED)!i) }

    # Include pre-built files (listed in .gitignore)
    #   JavaScript bundle
    js_bundle = "assets/js/conference.bundle.js"
    files << js_bundle if File.exist?(js_bundle)

    #   CSS bundle
    css_bundle = "assets/css/conference.bundle.css"
    files << css_bundle if File.exist?(css_bundle)

    #   FontAwesome webfonts
    Dir.glob("assets/webfonts/fa-*").each do |font_file|
      files << font_file if File.exist?(font_file)
    end

    files
  end

  spec.add_runtime_dependency "jekyll", "~> 4.0"

  spec.add_development_dependency "bundler", "~> 2.1"
  spec.add_development_dependency "rake", "~> 12.0"
end
