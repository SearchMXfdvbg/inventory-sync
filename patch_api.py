import re

with open('frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix testConnection
test_conn_pattern = re.compile(r'export const testConnection.*?try \{.*?const response = await fetchApi.*?if \(response\.ok\) return await response\.json\(\);\s*\}\s*catch \(err\) \{\}\s*const channelNames.*?return \{.*?\};', re.DOTALL)

new_test_conn = '''export const testConnection = async (channel: string, payload?: Record<string, any>): Promise<TestConnectionResponse> => {
  const response = await fetchApi(${BASE_URL}/connections/test/, {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : undefined
  });
  
  if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || Error al conectar con );
  }
  
  return await response.json();
'''
# Note: Since I am replacing with python, I will construct a better regex or use a simpler string replace.
