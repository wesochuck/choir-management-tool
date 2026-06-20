#!/bin/bash
# check-form-alignment.sh — flags form controls with one-off height/padding/border overrides
# that may cause visual drift between Input, Select, and Textarea.
#
# Usage: ./bin/check-form-alignment.sh
# Exit code: 0 = clean, 1 = suspects found

SUSPECTS=$(rg -g '*.tsx' -g '*.ts' \
  -g '!node_modules/' \
  -g '!src/components/ui/formControlBase.ts' \
  -g '!src/components/ui/Input/Input.tsx' \
  -g '!src/components/ui/Select/Select.tsx' \
  -g '!src/components/ui/Textarea/Textarea.tsx' \
  '(?:<Input|<Select|<Textarea).*?\b(h-(?:\[44px\]|10|12)|rounded-(?:lg|xl)|px-[0-9]|py-[0-9]|text-(?:sm|base|lg))' \
  src/ 2>/dev/null || true)

if [ -z "$SUSPECTS" ]; then
  echo "No form-alignment drift suspects found."
  exit 0
else
  echo "Potential form-alignment drift suspects:"
  echo "$SUSPECTS"
  echo ""
  echo "Review each one. Flagged results are not necessarily bugs —"
  echo "size variants (small/compact) legitimately use h-10/h-8."
  echo "The scan highlights consumers adding one-off overrides."
  exit 1
fi
