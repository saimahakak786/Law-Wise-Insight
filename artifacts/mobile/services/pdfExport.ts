import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface PDFSection {
  heading: string;
  content: string;
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  sections: PDFSection[];
  footerNote?: string;
}

export async function exportToChamberPDF(options: PDFExportOptions) {
  try {
    const { title, subtitle, sections, footerNote } = options;

    const sectionsHtml = sections.map(sec => `
      <div class="section">
        <h2>${sec.heading}</h2>
        <div class="content">${sec.content.replace(/\n/g, '<br/>')}</div>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #F4F4F5;
              color: #1F2037;
              padding: 40px;
              margin: 0;
              line-height: 1.6;
            }
            .header {
              border-bottom: 3px solid #C9A84C;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .firm-brand {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 2px;
              color: #C9A84C;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            h1 {
              font-size: 24px;
              font-weight: 700;
              color: #1F2037;
              margin: 0 0 8px 0;
            }
            .subtitle {
              font-size: 13px;
              color: #52525B;
              font-weight: 500;
            }
            .section {
              background: #FFFFFF;
              border: 1px solid #E4E4E7;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            h2 {
              font-size: 14px;
              font-weight: 700;
              color: #C9A84C;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin: 0 0 10px 0;
              border-bottom: 1px solid #F4F4F5;
              padding-bottom: 6px;
            }
            .content {
              font-size: 13px;
              color: #27272A;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #E4E4E7;
              padding-top: 15px;
              font-size: 11px;
              color: #71717A;
              text-align: center;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="firm-brand">LawVise Chamber-Grade Legal System</div>
            <h1>${title}</h1>
            ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
          </div>

          ${sectionsHtml}

          <div class="footer">
            ${footerNote || 'LawVise Official Legal Record • Generated Securely'}
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const customFileName = `LawVise_${sanitizedTitle}.pdf`;
    const permanentUri = FileSystem.documentDirectory + customFileName;

    await FileSystem.moveAsync({ from: uri, to: permanentUri });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(permanentUri, { mimeType: 'application/pdf', dialogTitle: 'Export Chamber PDF' });
    } else {
      Alert.alert('PDF Generated', `File saved at: ${permanentUri}`);
    }
  } catch (error: any) {
    console.error('PDF Export Error:', error);
    Alert.alert('Export Failed', error?.message || 'Could not generate chamber PDF document.');
  }
}
