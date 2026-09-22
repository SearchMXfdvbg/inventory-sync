import os
import re

replacements = {
    'á': 'á',
    'é': 'é',
    'í': 'í',
    'ó': 'ó',
    'ú': 'ú',
    'ñ': 'ñ',
    'Á': 'Á',
    'É': 'É',
    'Ã\x8D': 'Í',
    'Ó': 'Ó',
    'Ú': 'Ú',
    'Ñ': 'Ñ',
    '¿': '¿',
    '¡': '¡'
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content
        for bad, good in replacements.items():
            content = content.replace(bad, good)
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Fixed {filepath}')
    except Exception as e:
        pass

for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or 'venv' in root:
        continue
    for file in files:
        if file.endswith('.py') or file.endswith('.ts') or file.endswith('.tsx'):
            fix_file(os.path.join(root, file))
