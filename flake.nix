{
  description = "QQcord media gateway";

  inputs = { nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"; };

  outputs = { self, nixpkgs }:
    let
      systems =
        [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f:
        nixpkgs.lib.genAttrs systems
        (system: f nixpkgs.legacyPackages.${system});
    in {
      packages = forAllSystems (pkgs: rec {
        default = qqcord-media-gateway;
        qqcord-media-gateway = pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
          pname = "qqcord-media-gateway-fuck-tencent";
          inherit (builtins.fromJSON (builtins.readFile ./package.json))
            version;
          src = self;

          pnpmDeps = pkgs.fetchPnpmDeps {
            inherit (finalAttrs) pname version src;
            pnpm = pkgs.pnpm_12;
            fetcherVersion = 5;
            hash = "sha256-sm2Mh291cWEkDomNLuNKgoMvlAJ3J/0bNAgqwpHsj70=";
          };

          nativeBuildInputs = with pkgs; [
            nodejs_26
            pnpm_12
            pnpmConfigHook
            makeWrapper
          ];

          buildPhase = ''
            runHook preBuild
            pnpm run build
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall

            rm -rf node_modules
            pnpm install --offline --frozen-lockfile --prod --ignore-scripts

            mkdir -p $out/lib/qqcord-media-gateway $out/bin
            cp -r dist node_modules package.json $out/lib/qqcord-media-gateway/

            makeWrapper ${pkgs.nodejs_26}/bin/node $out/bin/qqcord-media-gateway \
              --add-flags "$out/lib/qqcord-media-gateway/dist/index.js"

            runHook postInstall
          '';

          meta = {
            description = "Media gateway for the QQcord";
            homepage =
              "https://github.com/AkademiyaEdu/qqcord-media-gateway-fuck-tencent";
            mainProgram = "qqcord-media-gateway";
            platforms = pkgs.lib.platforms.unix;
          };
        });
      });

      devShells = forAllSystems (pkgs: {
        default = with pkgs;
          mkShell { packages = [ nodejs_26 pnpm_12 git jq ]; };
      });
    };
}
