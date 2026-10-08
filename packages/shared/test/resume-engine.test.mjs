import test from 'node:test';
import assert from 'node:assert/strict';
import { ResumeEngine } from '../dist/index.js';
import { PDFDocument } from 'pdf-lib';

test('ResumeEngine - Generates valid PDF for all 6 template styles', async () => {
  const templates = [
    'SIMPLE',
    'PROFESSIONAL',
    'MODERN',
    'FRESHER',
    'TECHNICAL',
    'COMPACT'
  ];

  const baseData = {
    fullName: 'Shaik Shadaab',
    title: 'Lead Systems Developer',
    email: 'shaikshadaab16@gmail.com',
    phone: '9581529381',
    location: 'Guntur, Andhra Pradesh',
    summary: 'Experienced full stack software engineer specializing in scalable systems, Next.js, and TypeScript.',
    skills: ['TypeScript', 'Next.js', 'Node.js', 'Firebase', 'C# .NET', 'System Architecture'],
    education: [
      {
        institution: 'Acharya Nagarjuna University, Guntur',
        degree: 'Bachelor of Technology',
        field: 'Computer Science',
        year: '2023',
        grade: 'First Class with Distinction'
      }
    ],
    experience: [
      {
        company: 'Shakeel Online Services',
        role: 'Founder & Technical Lead',
        period: '2023 - Present',
        description: 'Architected and implemented SOS Print OS with fail-closed RBAC, integer-paise pricing, and Windows Spooler integration.'
      }
    ],
    projects: [
      {
        title: 'SOS Print OS',
        description: 'Real-time print shop operations platform with QR kiosk, PhonePe integration, and desktop spooling.',
        technologies: 'Next.js, Firebase Admin, .NET 8 Worker'
      }
    ],
    certifications: ['Google Cloud Certified Associate', 'Microsoft Certified Professional']
  };

  for (const t of templates) {
    const pdfBytes = await ResumeEngine.generatePdf({ ...baseData, template: t });
    assert.ok(pdfBytes instanceof Uint8Array, `Template ${t} should produce Uint8Array`);
    assert.ok(pdfBytes.length > 1000, `Template ${t} should produce non-empty PDF bytes`);

    // Verify it can be loaded as valid PDFDocument
    const pdfDoc = await PDFDocument.load(pdfBytes);
    assert.equal(pdfDoc.getPageCount(), 1, `Base data should fit on 1 page for template ${t}`);
  }
});

test('ResumeEngine - Multi-page pagination when content exceeds 1 page', async () => {
  // Long resume with many experience entries and project descriptions
  const longData = {
    template: 'MODERN',
    fullName: 'Shaik Shadaab',
    title: 'Principal Software Architect',
    email: 'shaikshadaab16@gmail.com',
    phone: '9581529381',
    location: 'Guntur, Andhra Pradesh',
    summary: 'Seasoned architect with a decade of expertise delivering enterprise cloud applications, distributed print architectures, and secure payment processing pipelines across multi-tenant environments.',
    skills: [
      'TypeScript', 'Next.js', 'Node.js', 'Firebase', 'Google Cloud Platform',
      'C# .NET 8', 'Windows API', 'System Architecture', 'CI/CD Pipelines',
      'Distributed Systems', 'PostgreSQL', 'SQLite', 'Docker', 'Kubernetes'
    ],
    education: [
      {
        institution: 'Acharya Nagarjuna University, Guntur',
        degree: 'Master of Technology',
        field: 'Software Engineering',
        year: '2024',
        grade: 'Distinction'
      },
      {
        institution: 'JNTUK, Kakinada',
        degree: 'Bachelor of Technology',
        field: 'Computer Science',
        year: '2022',
        grade: 'First Class'
      }
    ],
    experience: [
      {
        company: 'Shakeel Online Services',
        role: 'Chief Technology Architect',
        period: '2024 - Present',
        description: 'Engineered zero-trace customer document kiosk, private storage streaming gates, and DPAPI-encrypted Windows spooler driver communication for commercial print shops.'
      },
      {
        company: 'Enterprise Print Solutions Ltd',
        role: 'Senior Backend Engineer',
        period: '2022 - 2024',
        description: 'Designed high-throughput payment reconciliation microservices processing 50,000+ daily UPI transactions with idempotency guarantees.'
      },
      {
        company: 'Cloud Innovations AP',
        role: 'Systems Engineer',
        period: '2020 - 2022',
        description: 'Led migration from legacy on-premise print servers to serverless cloud document conversion architectures.'
      },
      {
        company: 'Digital Andhra Tech',
        role: 'Software Intern',
        period: '2019 - 2020',
        description: 'Developed mobile-first document scanner and CR80 ID card layout tools using HTML5 canvas and WebGL.'
      }
    ],
    projects: [
      {
        title: 'SOS Print OS - Commercial Kiosk & Spooler',
        description: 'Self-service physical print orchestration engine supporting USB and Network Windows Spoolers.',
        technologies: 'Next.js 14, .NET 8, SQLite, Firestore'
      },
      {
        title: 'High-Fidelity PDF Imposition Engine',
        description: 'Automated CR80 ID card duplication and passport photo repeat generator with millimetre-precise cut guides.',
        technologies: 'pdf-lib, Canvas, TypeScript'
      },
      {
        title: 'Multi-Tenant Scope Resolver & RBAC Module',
        description: 'Strict fail-closed tenant isolation middleware ensuring non-authorized access cannot leak private document metadata.',
        technologies: 'Node.js, Firebase Auth, Cryptography'
      }
    ],
    certifications: [
      'AWS Certified Solutions Architect - Professional',
      'Google Cloud Certified Professional Cloud Architect',
      'Razorpay Verified Technical Integration Specialist',
      'Microsoft Certified: DevOps Engineer Expert'
    ]
  };

  const pdfBytes = await ResumeEngine.generatePdf(longData);
  assert.ok(pdfBytes instanceof Uint8Array);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Must automatically paginate to 2 pages without overflowing or clipping
  assert.ok(pdfDoc.getPageCount() >= 2, `Long resume should have at least 2 pages. Got: ${pdfDoc.getPageCount()}`);
});

test('ResumeEngine - Resilient to non-ASCII Unicode and special characters', async () => {
  const unicodeData = {
    template: 'SIMPLE',
    fullName: 'Shaik Shadaab (షేక్ షాదాబ్)',
    title: 'सॉफ्टवेयर इंजीनियर',
    email: 'shaikshadaab16@gmail.com',
    phone: '9581529381',
    summary: 'Working with smart quotes “double” & ‘single’, em-dash — and bullet • characters.',
    skills: ['JavaScript', 'TypeScript'],
    education: [],
    experience: [],
    projects: []
  };

  // Must generate cleanly without WinAnsi encoding crash
  const pdfBytes = await ResumeEngine.generatePdf(unicodeData);
  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 500);
});
