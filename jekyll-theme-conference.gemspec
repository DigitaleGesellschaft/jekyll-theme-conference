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
    files = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_data|LICENSE|README)!i) }

    # Include pre-built files (listed in .gitignore)
    #   JavaScript modules and bundles
    Dir.glob("assets/js/*.bundle.js").each do |js_file|
      files << js_file if File.exist?(js_file) && !files.include?(js_file)
    end

    #   CSS bundle
    Dir.glob("assets/css/*.bundle.css").each do |css_file|
      files << css_file if File.exist?(css_file) && !files.include?(css_file)
    end

    # Bootstrap Icons webfonts (built from NPM packages)
    Dir.glob("assets/webfonts/bootstrap-icons.*").each do |font_file|
      files << font_file if File.exist?(font_file) && !files.include?(font_file)
    end

    files
  end

  spec.add_runtime_dependency "jekyll", "~> 4.3"
end
