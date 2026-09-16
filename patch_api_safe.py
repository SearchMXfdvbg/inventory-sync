# -*- coding: utf-8 -*-
import re

with open('frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_func_pattern = r'export const importInventoryFile = async \(file: File\): Promise<ImportInventoryResponse> => \{[\s\S]*?catch \(err: any\) \{[\s\S]*?throw new Error.*?;\s*\}\s*\};'

new_func = '''export const importInventoryFile = async (file: File): Promise<ImportInventoryResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchApi(${BASE_URL}/inventory/import-file, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error al subir el archivo al servidor');
    }

    const data = await response.json();

    return {
      success: data.success,
      total_rows: data.total_rows,
      created_count: data.created_count,
      updated_count: data.updated_count,
      message: data.message
    };
  } catch (err: any) {
    throw new Error(err?.message || 'Error critico al procesar el archivo Excel.');
  }
};'''
new_func = new_func.replace('', '${BASE_URL}')

content = re.sub(old_func_pattern, new_func, content)

with open('frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("api.ts patched safely!")
