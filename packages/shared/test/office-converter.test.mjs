import test from 'node:test';
import assert from 'node:assert/strict';
import { OfficeConverter } from '../dist/index.js';

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (~crc) >>> 0;
}

function createZipBuffer(files) {
  const fileEntries = [];
  let offset = 0;
  const localHeaders = [];

  for (const [name, content] of Object.entries(files)) {
    const rawData = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(rawData);

    const localHeader = Buffer.alloc(30 + nameBuf.length + rawData.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(rawData.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);
    rawData.copy(localHeader, 30 + nameBuf.length);

    fileEntries.push({ nameBuf, crc, size: rawData.length, offset });
    offset += localHeader.length;
    localHeaders.push(localHeader);
  }

  const centralDirHeaders = [];
  let centralDirSize = 0;
  for (const entry of fileEntries) {
    const cd = Buffer.alloc(46 + entry.nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt32LE(entry.crc, 16); // 32-bit CRC!
    cd.writeUInt32LE(entry.size, 20);
    cd.writeUInt32LE(entry.size, 24);
    cd.writeUInt16LE(entry.nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(entry.offset, 42);
    entry.nameBuf.copy(cd, 46);

    centralDirSize += cd.length;
    centralDirHeaders.push(cd);
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(fileEntries.length, 8);
  eocd.writeUInt16LE(fileEntries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralDirHeaders, eocd]);
}

test('OfficeConverter - Rejects non-OpenXML file', async () => {
  const dummy = Buffer.from('This is a plain text file, not an OpenXML container.');
  const res = await OfficeConverter.convertToPdf(dummy);
  assert.equal(res.success, false);
  assert.equal(res.errorCode, 'INVALID_OPENXML');
});

test('OfficeConverter - Rejects macro-enabled office documents (.docm / vbaProject.bin)', async () => {
  const macroZip = createZipBuffer({
    'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Macro Text</w:t></w:r></w:p></w:body></w:document>',
    'word/vbaProject.bin': Buffer.from('VBA bytecode simulation')
  });

  const res = await OfficeConverter.convertToPdf(macroZip);
  assert.equal(res.success, false);
  assert.equal(res.errorCode, 'FORBIDDEN_MACRO');
  assert.match(res.error, /Macro-enabled office documents/);
});

test('OfficeConverter - Disables Excel spreadsheets (.xlsx) pending print calibration', async () => {
  const xlsxZip = createZipBuffer({
    'xl/workbook.xml': '<workbook><sheets><sheet name="Sheet1"/></sheets></workbook>',
    'xl/worksheets/sheet1.xml': '<worksheet></worksheet>'
  });

  const res = await OfficeConverter.convertToPdf(xlsxZip);
  assert.equal(res.success, false);
  assert.equal(res.errorCode, 'XLSX_DISABLED');
  assert.match(res.error, /Direct Excel printing is disabled/);
});

test('OfficeConverter - Successfully converts valid .docx to print-ready PDF', async () => {
  const docxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Shakeel Online Services Printing Agreement</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>This is an authoritative customer document uploaded from Word format.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>SOS Print has converted this file safely into an A4 print-ready PDF artifact.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  const docxZip = createZipBuffer({
    'word/document.xml': docxXml,
    '[Content_Types].xml': '<Types><Default Extension="xml" ContentType="application/xml"/></Types>'
  });

  const res = await OfficeConverter.convertToPdf(docxZip);
  assert.equal(res.success, true);
  assert.equal(res.detectedFormat, 'DOCX');
  assert.ok(res.pdfBytes instanceof Uint8Array);
  assert.ok(res.pdfBytes.length > 500);
  assert.equal(res.pageCount, 1);
  assert.ok(typeof res.sha256 === 'string' && res.sha256.length === 64);
});

test('OfficeConverter - Successfully converts valid .pptx slides to landscape PDF', async () => {
  const slide1Xml = `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
    <p:cSld>
      <p:spTree>
        <p:sp>
          <p:txBody>
            <a:p><a:r><a:t>Slide 1: Welcome to Guntur</a:t></a:r></a:p>
            <a:p><a:r><a:t>First bullet point on slide 1</a:t></a:r></a:p>
          </p:txBody>
        </p:sp>
      </p:spTree>
    </p:cSld>
  </p:sld>`;

  const slide2Xml = `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
    <p:cSld>
      <p:spTree>
        <p:sp>
          <p:txBody>
            <a:p><a:r><a:t>Slide 2: Services Overview</a:t></a:r></a:p>
            <a:p><a:r><a:t>Second bullet point on slide 2</a:t></a:r></a:p>
          </p:txBody>
        </p:sp>
      </p:spTree>
    </p:cSld>
  </p:sld>`;

  const pptxZip = createZipBuffer({
    'ppt/presentation.xml': '<p:presentation></p:presentation>',
    'ppt/slides/slide1.xml': slide1Xml,
    'ppt/slides/slide2.xml': slide2Xml
  });

  const res = await OfficeConverter.convertToPdf(pptxZip);
  assert.equal(res.success, true);
  assert.equal(res.detectedFormat, 'PPTX');
  assert.ok(res.pdfBytes instanceof Uint8Array);
  assert.equal(res.pageCount, 2);
  assert.ok(res.sha256 && res.sha256.length === 64);
});
