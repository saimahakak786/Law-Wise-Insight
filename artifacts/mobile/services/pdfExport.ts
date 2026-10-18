import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

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

/**
 * Generates and shares a chamber-grade legal PDF document.
 */
export async function exportToChamberPDF(options: PDFExportOptions): Promise<void> {
  try {
    const { title, subtitle, sections, footerNote } = options;

    const sectionsHTML = sections
      .map(
        (sec) => `
        <div class="section">
          <div class="section-heading">${sec.heading}</div>
          <div class="section-content">${sec.content.replace(/\n/g, '<br/>')}</div>
        </div>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1F2937;
              line-height: 1.6;
              padding: 0;
              margin: 0;
            }
            .header {
              border-bottom: 2px solid #C9A84C;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .brand {
              font-size: 10px;
              font-weight: 700;
              color: #C9A84C;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              color: #0F172A;
              margin: 0 0 4px 0;
            }
            .subtitle {
              font-size: 12px;
              color: #6B7280;
              margin: 0;
            }
            .section {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .section-heading {
              font-size: 13px;
              font-weight: 700;
              color: #0F172A;
              border-left: 3px solid #C9A84C;
              padding-left: 8px;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-content {
              font-size: 12px;
              color: #374151;
              white-space: pre-wrap;
              background-color: #F9FAFB;
              padding: 12px;
              border-radius: 6px;
              border: 1px solid #E5E7EB;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #E5E7EB;
              padding-top: 12px;
              font-size: 10px;
              color: #9CA3AF;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">LAWVISE LEGAL CHAMBER RECORD</div>
            <div class="title">${title}</div>
            ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
          </div>

          ${sectionsHTML}

          <div class="footer">
            ${footerNote || 'LawVise Chamber Records • Generated for Official Legal Use'}
          </div>
        </body>
      </html>
    `;

    // Step 1: Generate PDF File via Expo Print
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Step 2: On Web, trigger direct print / download
    if (Platform.OS === 'web') {
      await Print.printAsync({ html: htmlContent });
      return;
    }

    // Step 3: Verify if sharing is available on mobile device
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      Alert.alert('Export Error', 'File sharing is not available on this device.');
      return;
    }

    // Step 4: Ensure file resides in documentDirectory with clean filename
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const targetUri = `${docDir}${sanitizedTitle}_${Date.now()}.pdf`;

    await FileSystem.copyAsync({
      from: uri,
      to: targetUri,
    });

    // Step 5: Trigger native system share dialog (WhatsApp, Mail, Drive, Save to Files)
    await Sharing.shareAsync(targetUri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Export Legal PDF: ${title}`,
    });
  } catch (error: unknown) {
    console.error('PDF Export Error:', error);
    const message = error instanceof Error ? error.message : 'Could not generate chamber PDF.';
    Alert.alert('Export Failed', message);
  }
}
