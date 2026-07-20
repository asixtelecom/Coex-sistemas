filepath = "/www/wwwroot/coexsistemas.techvoz.com.br/src/components/settings/template-manager.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ---- Patch 1: emptyForm language and COMMON_LANGUAGE_CODES order ----
old_form_and_codes = """const emptyForm: TemplateFormData = {
  name: '',
  category: 'Marketing',
  language: 'en_US',
  header_format: 'none',
  header_content: '',
  header_media_url: '',
  header_sample: '',
  body_text: '',
  body_samples: [],
  footer_text: '',
  buttons: [],
};

const COMMON_LANGUAGE_CODES = [
  'en_US',
  'en_GB',
  'en',
  'es',
  'es_ES',
  'es_MX',
  'fr',
  'fr_FR',
  'de',
  'it',
  'pt_BR',
  'pt_PT',
  'nl',
  'pl',
  'ru',
  'tr',
  'lt',
];"""

new_form_and_codes = """const emptyForm: TemplateFormData = {
  name: '',
  category: 'Marketing',
  language: 'pt_BR',
  header_format: 'none',
  header_content: '',
  header_media_url: '',
  header_sample: '',
  body_text: '',
  body_samples: [],
  footer_text: '',
  buttons: [],
};

const COMMON_LANGUAGE_CODES = [
  'pt_BR',
  'en_US',
  'en_GB',
  'en',
  'es',
  'es_ES',
  'es_MX',
  'fr',
  'fr_FR',
  'de',
  'it',
  'pt_PT',
  'nl',
  'pl',
  'ru',
  'tr',
  'lt',
];"""

if old_form_and_codes in content:
    content = content.replace(old_form_and_codes, new_form_and_codes)
    print("SUCCESS: Patch 1 applied")
else:
    print("ERROR: Patch 1 target string not found")

# ---- Patch 2: placeholder for language input ----
old_input = """                <Input
                  list="template-language-codes"
                  placeholder="en_US"
                  value={form.language}"""

new_input = """                <Input
                  list="template-language-codes"
                  placeholder="pt_BR"
                  value={form.language}"""

if old_input in content:
    content = content.replace(old_input, new_input)
    print("SUCCESS: Patch 2 applied")
else:
    print("ERROR: Patch 2 target string not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File written.")
