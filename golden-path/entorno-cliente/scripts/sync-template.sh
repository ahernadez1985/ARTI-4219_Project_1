#!/usr/bin/env bash
# Copia k8s/entorno.yaml (sin comentarios de cabecera) al paso kube:apply
# de template.yaml, entre los marcadores '# >>> MANIFEST' y '# <<< MANIFEST'.
source "$(dirname "$0")/_lib.sh"

TEMPLATE="$ROOT_DIR/template.yaml"
MANIFEST_FILE="$MANIFEST" perl -0pi -e '
  open(my $fh, "<", $ENV{MANIFEST_FILE}) or die "no puedo leer $ENV{MANIFEST_FILE}";
  my @lines = do { local $/ = "\n"; grep { !/^#/ } <$fh> };
  close $fh;
  s{^([ \t]*)(\# >>> MANIFEST[^\n]*\n).*?^[ \t]*(\# <<< MANIFEST[^\n]*\n)}{
    my $ind = $1;
    my $body = join("", map { $_ eq "\n" ? $_ : $ind . $_ } @lines);
    $ind . $2 . $body . $ind . $3
  }sme or die "marcadores MANIFEST no encontrados en template.yaml\n";
' "$TEMPLATE"
echo ">> template.yaml sincronizado con k8s/entorno.yaml"
