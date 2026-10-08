import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";

export type ResumeTemplateId =
  | "SIMPLE"
  | "PROFESSIONAL"
  | "MODERN"
  | "FRESHER"
  | "TECHNICAL"
  | "COMPACT";

export interface ResumeEducation {
  institution: string;
  degree: string;
  field?: string;
  year: string;
  grade?: string;
}

export interface ResumeExperience {
  company: string;
  role: string;
  period: string;
  description: string;
}

export interface ResumeProject {
  title: string;
  description: string;
  technologies?: string;
}

export interface ResumeData {
  template: ResumeTemplateId;
  fullName: string;
  title?: string;
  email: string;
  phone: string;
  location?: string;
  summary?: string;
  skills: string[];
  education: ResumeEducation[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  certifications?: string[];
}

function sanitizeWinAnsi(text: string): string {
  if (!text) return "";
  // Map common Unicode characters to ASCII
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u2023\u25E6]/g, "*")
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x00-\xFF]/g, "?");
}

function splitTextIntoLines(text: string, maxCharsPerLine: number): string[] {
  const safeText = sanitizeWinAnsi(text);
  const words = safeText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export class ResumeEngine {
  public static async generatePdf(data: ResumeData): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Standard A4: 595.28 x 841.89 pt
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = data.template === "COMPACT" ? 36 : 45;
    const bottomMargin = 40;

    let currentPage = doc.addPage([pageWidth, pageHeight]);
    let pageNumber = 1;
    let y = pageHeight - margin;

    // Palette
    const black = rgb(0.08, 0.1, 0.12);
    const darkSlate = rgb(0.2, 0.25, 0.3);
    const emerald = rgb(0.02, 0.58, 0.41);
    const grey = rgb(0.4, 0.45, 0.5);
    const lightRule = rgb(0.85, 0.88, 0.9);

    const checkPageBreak = (neededHeight: number) => {
      if (y - neededHeight < bottomMargin) {
        // Draw footer on current page before starting next
        drawPageFooter(currentPage, pageNumber);
        currentPage = doc.addPage([pageWidth, pageHeight]);
        pageNumber++;
        y = pageHeight - margin;

        // Draw small continuation header on subsequent pages
        currentPage.drawText(
          `${sanitizeWinAnsi(data.fullName)} - Resume (Page ${pageNumber})`,
          {
            x: margin,
            y: y,
            size: 8,
            font: fontRegular,
            color: grey
          }
        );
        y -= 18;
      }
    };

    const drawPageFooter = (p: PDFPage, pNum: number) => {
      p.drawText("Printed at Shakeel Online Services, Guntur · Powered by SOS Print", {
        x: margin,
        y: 18,
        size: 7.5,
        font: fontRegular,
        color: grey
      });
      const pageStr = `Page ${pNum}`;
      const pWidth = fontRegular.widthOfTextAtSize(pageStr, 7.5);
      p.drawText(pageStr, {
        x: pageWidth - margin - pWidth,
        y: 18,
        size: 7.5,
        font: fontRegular,
        color: grey
      });
    };

    const drawSectionHeader = (title: string) => {
      checkPageBreak(35);
      y -= 8;
      currentPage.drawText(title.toUpperCase(), {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: data.template === "MODERN" || data.template === "FRESHER" ? emerald : black
      });
      y -= 4;
      currentPage.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.75,
        color: data.template === "MODERN" ? emerald : lightRule
      });
      y -= 14;
    };

    // 1. Header Section
    const safeFullName = sanitizeWinAnsi(data.fullName);
    const safeTitle = sanitizeWinAnsi(data.title || "");

    if (data.template === "MODERN" || data.template === "PROFESSIONAL") {
      currentPage.drawRectangle({
        x: margin,
        y: y - 50,
        width: pageWidth - margin * 2,
        height: 55,
        color: data.template === "MODERN" ? rgb(0.94, 0.98, 0.96) : rgb(0.96, 0.97, 0.98)
      });

      currentPage.drawText(safeFullName.toUpperCase(), {
        x: margin + 12,
        y: y - 24,
        size: 18,
        font: fontBold,
        color: data.template === "MODERN" ? emerald : black
      });

      if (safeTitle) {
        currentPage.drawText(safeTitle, {
          x: margin + 12,
          y: y - 42,
          size: 11,
          font: fontRegular,
          color: darkSlate
        });
      }
      y -= 65;
    } else {
      currentPage.drawText(safeFullName, {
        x: margin,
        y,
        size: data.template === "COMPACT" ? 16 : 20,
        font: fontBold,
        color: black
      });
      y -= data.template === "COMPACT" ? 16 : 20;

      if (safeTitle) {
        currentPage.drawText(safeTitle, {
          x: margin,
          y,
          size: 11,
          font: fontRegular,
          color: darkSlate
        });
        y -= 16;
      }
    }

    // Contact line
    const contactParts = [
      sanitizeWinAnsi(data.email),
      sanitizeWinAnsi(data.phone),
      sanitizeWinAnsi(data.location || "")
    ].filter(Boolean);
    const contactStr = contactParts.join("   |   ");
    currentPage.drawText(contactStr, {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: grey
    });
    y -= 14;

    // 2. Summary
    if (data.summary) {
      drawSectionHeader("Professional Summary");
      const summaryLines = splitTextIntoLines(data.summary, 90);
      for (const line of summaryLines) {
        checkPageBreak(14);
        currentPage.drawText(line, {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: darkSlate
        });
        y -= 13;
      }
      y -= 6;
    }

    // 3. Experience
    if (data.experience && data.experience.length > 0) {
      drawSectionHeader("Work Experience");
      for (const exp of data.experience) {
        checkPageBreak(40);
        currentPage.drawText(sanitizeWinAnsi(exp.role), {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: black
        });
        const periodStr = sanitizeWinAnsi(exp.period);
        const periodWidth = fontRegular.widthOfTextAtSize(periodStr, 9);
        currentPage.drawText(periodStr, {
          x: pageWidth - margin - periodWidth,
          y,
          size: 9,
          font: fontRegular,
          color: grey
        });
        y -= 12;

        currentPage.drawText(sanitizeWinAnsi(exp.company), {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: darkSlate
        });
        y -= 12;

        if (exp.description) {
          const descLines = splitTextIntoLines(exp.description, 85);
          for (const line of descLines) {
            checkPageBreak(12);
            currentPage.drawText(`•  ${line}`, {
              x: margin + 6,
              y,
              size: 9,
              font: fontRegular,
              color: darkSlate
            });
            y -= 11;
          }
        }
        y -= 6;
      }
    }

    // 4. Education
    if (data.education && data.education.length > 0) {
      drawSectionHeader("Education");
      for (const edu of data.education) {
        checkPageBreak(35);
        currentPage.drawText(
          `${sanitizeWinAnsi(edu.degree)} ${edu.field ? `- ${sanitizeWinAnsi(edu.field)}` : ""}`,
          {
            x: margin,
            y,
            size: 10,
            font: fontBold,
            color: black
          }
        );
        const yrStr = sanitizeWinAnsi(edu.year);
        const yrWidth = fontRegular.widthOfTextAtSize(yrStr, 9);
        currentPage.drawText(yrStr, {
          x: pageWidth - margin - yrWidth,
          y,
          size: 9,
          font: fontRegular,
          color: grey
        });
        y -= 12;

        currentPage.drawText(sanitizeWinAnsi(edu.institution), {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: darkSlate
        });
        if (edu.grade) {
          y -= 11;
          currentPage.drawText(`Grade / Score: ${sanitizeWinAnsi(edu.grade)}`, {
            x: margin,
            y,
            size: 8.5,
            font: fontRegular,
            color: grey
          });
        }
        y -= 14;
      }
    }

    // 5. Skills
    if (data.skills && data.skills.length > 0) {
      drawSectionHeader("Key Skills");
      const safeSkills = data.skills.map(sanitizeWinAnsi);
      const skillsStr = safeSkills.join("   •   ");
      const skillLines = splitTextIntoLines(skillsStr, 80);
      for (const sLine of skillLines) {
        checkPageBreak(14);
        currentPage.drawText(sLine, {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: darkSlate
        });
        y -= 13;
      }
      y -= 8;
    }

    // 6. Projects
    if (data.projects && data.projects.length > 0) {
      drawSectionHeader("Projects");
      for (const prj of data.projects) {
        checkPageBreak(35);
        currentPage.drawText(sanitizeWinAnsi(prj.title), {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: black
        });
        y -= 12;

        const prjLines = splitTextIntoLines(prj.description, 85);
        for (const line of prjLines) {
          checkPageBreak(12);
          currentPage.drawText(`•  ${line}`, {
            x: margin + 6,
            y,
            size: 9,
            font: fontRegular,
            color: darkSlate
          });
          y -= 11;
        }
        if (prj.technologies) {
          checkPageBreak(12);
          currentPage.drawText(`Technologies: ${sanitizeWinAnsi(prj.technologies)}`, {
            x: margin + 6,
            y,
            size: 8.5,
            font: fontRegular,
            color: grey
          });
          y -= 11;
        }
        y -= 5;
      }
    }

    // 7. Certifications
    if (data.certifications && data.certifications.length > 0) {
      drawSectionHeader("Certifications");
      for (const cert of data.certifications) {
        checkPageBreak(13);
        currentPage.drawText(`•  ${sanitizeWinAnsi(cert)}`, {
          x: margin + 6,
          y,
          size: 9,
          font: fontRegular,
          color: darkSlate
        });
        y -= 12;
      }
    }

    // Draw footer on final page
    drawPageFooter(currentPage, pageNumber);

    return await doc.save();
  }
}
