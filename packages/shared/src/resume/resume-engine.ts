import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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

export class ResumeEngine {
  public static async generatePdf(data: ResumeData): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Standard A4: 595.28 x 841.89 pt
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = doc.addPage([pageWidth, pageHeight]);

    const margin = data.template === "COMPACT" ? 36 : 45;
    let y = pageHeight - margin;

    // Palette
    const black = rgb(0.08, 0.1, 0.12);
    const darkSlate = rgb(0.2, 0.25, 0.3);
    const emerald = rgb(0.02, 0.58, 0.41);
    const grey = rgb(0.4, 0.45, 0.5);
    const lightRule = rgb(0.85, 0.88, 0.9);

    // 1. Header Section
    if (data.template === "MODERN" || data.template === "PROFESSIONAL") {
      // Top colored bar
      page.drawRectangle({
        x: margin,
        y: y - 50,
        width: pageWidth - margin * 2,
        height: 55,
        color: data.template === "MODERN" ? rgb(0.94, 0.98, 0.96) : rgb(0.96, 0.97, 0.98),
      });

      page.drawText(data.fullName.toUpperCase(), {
        x: margin + 12,
        y: y - 24,
        size: 18,
        font: fontBold,
        color: data.template === "MODERN" ? emerald : black,
      });

      if (data.title) {
        page.drawText(data.title, {
          x: margin + 12,
          y: y - 42,
          size: 11,
          font: fontRegular,
          color: darkSlate,
        });
      }
      y -= 65;
    } else {
      // Classic / Simple / Technical / Compact Header
      page.drawText(data.fullName, {
        x: margin,
        y: y - 10,
        size: data.template === "COMPACT" ? 18 : 22,
        font: fontBold,
        color: black,
      });

      if (data.title) {
        page.drawText(data.title, {
          x: margin,
          y: y - 28,
          size: 11,
          font: fontRegular,
          color: darkSlate,
        });
        y -= 20;
      }
      y -= 25;
    }

    // Contact Line
    const contactParts = [
      data.email,
      data.phone,
      data.location || "",
    ].filter(Boolean);

    const contactStr = contactParts.join("   |   ");
    page.drawText(contactStr, {
      x: margin,
      y: y,
      size: 9,
      font: fontRegular,
      color: grey,
    });
    y -= 12;

    // Divider Line
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: lightRule,
    });
    y -= 18;

    // Helper: draw section header
    const drawSectionHeader = (title: string) => {
      page.drawText(title.toUpperCase(), {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: data.template === "MODERN" ? emerald : black,
      });
      y -= 4;
      page.drawLine({
        start: { x: margin, y },
        end: { x: margin + 140, y },
        thickness: 1.5,
        color: data.template === "MODERN" ? emerald : black,
      });
      y -= 14;
    };

    // 2. Summary
    if (data.summary) {
      drawSectionHeader("Professional Summary");
      const summaryLines = splitTextIntoLines(data.summary, 85);
      for (const line of summaryLines) {
        page.drawText(line, {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: darkSlate,
        });
        y -= 12;
      }
      y -= 8;
    }

    // 3. Experience
    if (data.experience && data.experience.length > 0) {
      drawSectionHeader("Experience");
      for (const exp of data.experience) {
        page.drawText(exp.role, {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: black,
        });
        const periodWidth = fontRegular.widthOfTextAtSize(exp.period, 9);
        page.drawText(exp.period, {
          x: pageWidth - margin - periodWidth,
          y,
          size: 9,
          font: fontRegular,
          color: grey,
        });
        y -= 12;

        page.drawText(exp.company, {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: darkSlate,
        });
        y -= 12;

        if (exp.description) {
          const descLines = splitTextIntoLines(exp.description, 85);
          for (const line of descLines) {
            page.drawText(`•  ${line}`, {
              x: margin + 6,
              y,
              size: 9,
              font: fontRegular,
              color: darkSlate,
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
        page.drawText(`${edu.degree} ${edu.field ? `- ${edu.field}` : ""}`, {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: black,
        });
        const yrWidth = fontRegular.widthOfTextAtSize(edu.year, 9);
        page.drawText(edu.year, {
          x: pageWidth - margin - yrWidth,
          y,
          size: 9,
          font: fontRegular,
          color: grey,
        });
        y -= 12;

        page.drawText(edu.institution, {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: darkSlate,
        });
        if (edu.grade) {
          y -= 11;
          page.drawText(`Grade / Score: ${edu.grade}`, {
            x: margin,
            y,
            size: 8.5,
            font: fontRegular,
            color: grey,
          });
        }
        y -= 14;
      }
    }

    // 5. Skills
    if (data.skills && data.skills.length > 0) {
      drawSectionHeader("Key Skills");
      const skillsStr = data.skills.join("   •   ");
      const skillLines = splitTextIntoLines(skillsStr, 80);
      for (const sLine of skillLines) {
        page.drawText(sLine, {
          x: margin,
          y,
          size: 9.5,
          font: fontRegular,
          color: darkSlate,
        });
        y -= 13;
      }
      y -= 8;
    }

    // 6. Projects
    if (data.projects && data.projects.length > 0) {
      drawSectionHeader("Projects");
      for (const prj of data.projects) {
        page.drawText(prj.title, {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: black,
        });
        y -= 12;

        const prjLines = splitTextIntoLines(prj.description, 85);
        for (const line of prjLines) {
          page.drawText(`•  ${line}`, {
            x: margin + 6,
            y,
            size: 9,
            font: fontRegular,
            color: darkSlate,
          });
          y -= 11;
        }
        if (prj.technologies) {
          page.drawText(`Technologies: ${prj.technologies}`, {
            x: margin + 6,
            y,
            size: 8.5,
            font: fontRegular,
            color: grey,
          });
          y -= 11;
        }
        y -= 5;
      }
    }

    // Footer Watermark / Tagline
    page.drawText("Printed at Shakeel Online Services, Guntur · Powered by SOS Print", {
      x: margin,
      y: 18,
      size: 7.5,
      font: fontRegular,
      color: grey,
    });

    return await doc.save();
  }
}

function splitTextIntoLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
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