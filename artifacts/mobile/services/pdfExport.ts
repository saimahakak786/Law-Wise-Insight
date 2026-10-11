import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  sections: { heading: string; content: string }[];
  footerNote?: string;
}

export async function exportToChamberPDF(options: PDFExportOptions) {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              padding: 40px;
              color: #1F2037;
              background-color: #F4F4F5;
            }
            .header {
              border-bottom: 2px solid #C9A84C;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .firm-name {
              font-size: 12px;
              font-weight: 700;
              color: #C9A84C;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            h1 {
              font-size: 24px;
              color: #1F2037;
              margin: 0 0 5px 0;
            }
            .subtitle {
              font-size: 14px;
              color: #6B7280;
            }
            .section {
              background: #FFFFFF;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
              border: 1px solid #E5E7EB;
            }
            h3 {
              margin-top: 0;
              color: #C9A84C;
              font-size: 16px;
              border-bottom: 1px solid #F3F4F6;
              padding-bottom: 8px;
            }
            p {
              font-size: 14px;
              line-height: 1.6;
              color: #374151;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #9CA3AF;
              border-top: 1px solid #E5E7EB;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="firm-name">LawVise Chamber-Grade Legal Intelligence</div>
            <h1>${options.title}</h1>
            ${options.subtitle ? `<div class="subtitle">${options.subtitle}</div>` : ''}
          </div>

          ${options.sections
            .map(
              (sec) => `
            <div class="section">
              <h3>${sec.heading}</h3>
              <p>${sec.content}</p>
            </div>
          `
            )
            .join('')}

          <div class="footer">
            ${options.footerNote || 'Generated securely via LawVise AI Legal Workspace • Confidential Legal Record'}
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${options.title} - PDF Export` });
    } else {
      Alert.alert('PDF Generated', `File saved successfully at: ${uri}`);
    }
  } catch (error) {
    console.error('PDF export failed:', error);
    Alert.alert('Export Failed', 'Could not generate chamber PDF document.');
  }
}
