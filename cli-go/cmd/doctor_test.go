package cmd

import "testing"

func TestDetectInstallSource(t *testing.T) {
	tests := []struct {
		name string
		path string
		want string
	}{
		{
			name: "brew formula",
			path: "/opt/homebrew/Cellar/envault/1.26.1/bin/envault",
			want: "homebrew-formula",
		},
		{
			name: "brew cask",
			path: "/opt/homebrew/Caskroom/envault/1.25.0/envault",
			want: "homebrew-cask",
		},
		{
			name: "node install",
			path: "/Users/alice/.npm-global/bin/envault",
			want: "node-package-manager",
		},
		{
			name: "go install",
			path: "/Users/alice/go/bin/envault",
			want: "go-install",
		},
		{
			name: "unknown",
			path: "/tmp/envault",
			want: "unknown",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := detectInstallSource(tc.path)
			if got != tc.want {
				t.Fatalf("detectInstallSource(%q) = %q, want %q", tc.path, got, tc.want)
			}
		})
	}
}

func TestNormalizeVersion(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{in: "v1.26.1", want: "1.26.1"},
		{in: "1.26.1", want: "1.26.1"},
		{in: " v2.0.0 ", want: "2.0.0"},
	}

	for _, tc := range tests {
		got := normalizeVersion(tc.in)
		if got != tc.want {
			t.Fatalf("normalizeVersion(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
