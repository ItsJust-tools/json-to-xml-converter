# JSON to XML Converter

Convert JSON data to well-formed XML in your browser. Paste or type JSON and get instant XML output with attribute notation, namespaces, pretty printing and download — all client-side, privacy-first.

**Live:** [json-to-xml-converter.itsjust.tools](https://json-to-xml-converter.itsjust.tools)

## Features

- Paste or upload JSON and get instant XML output with live conversion while typing
- Attribute notation: keys prefixed with `@` become XML attributes of the parent element
- Namespace support: configurable default namespace and prefix mapping
- Pretty printing with configurable indent size, or minified output
- XML declaration toggle with configurable version and encoding
- JSON parse errors reported with a clear message and a line/column hint
- Copy to clipboard and download as an `.xml` file
- Shareable state: the current JSON and options serialize into the URL hash via the share dialog
- 100% client-side — no data ever leaves your browser

## Examples

Input JSON:

```json
{
  "name": "Ada Lovelace",
  "age": 36,
  "languages": ["math", "notes"],
  "@id": "p1"
}
```

Output XML:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <name>Ada Lovelace</name>
  <age>36</age>
  <languages>
    <languages_item>math</languages_item>
    <languages_item>notes</languages_item>
  </languages>
  <root>
    <person id="p1">
      <name>Ada Lovelace</name>
      <age>36</age>
      <languages>
        <languages_item>math</languages_item>
        <languages_item>notes</languages_item>
      </languages>
    </person>
  </root>
</root>
```

## Keyboard shortcuts

| Key            | Action           |
| -------------- | ---------------- |
| `Ctrl+Shift+C` | Copy XML output  |
| `Ctrl+Shift+X` | Clear JSON input |

## Development

```bash
npm install
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-json-to-xml-converter .
docker run -p 3000:3000 itsjust-json-to-xml-converter
```

## CI

Every push to `main` runs lint, typecheck, audit, docs checks, unit tests with coverage and the Playwright smoke test.

## License

MIT
