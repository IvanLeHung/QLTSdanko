const pdfmake = require('pdfmake');
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import path from 'path';
import fs from 'fs';
import prisma from './prisma';

let fonts: any;
try {
  const regularPath = path.join(__dirname, '../../fonts/Roboto-Regular.ttf');
  const mediumPath = path.join(__dirname, '../../fonts/Roboto-Medium.ttf');
  const italicPath = path.join(__dirname, '../../fonts/Roboto-Italic.ttf');
  const boldItalicPath = path.join(__dirname, '../../fonts/Roboto-MediumItalic.ttf');

  const allExist = fs.existsSync(regularPath) && 
                   fs.existsSync(mediumPath) && 
                   fs.existsSync(italicPath) && 
                   fs.existsSync(boldItalicPath);

  if (allExist) {
    fonts = {
      Roboto: {
        normal: regularPath,
        bold: mediumPath,
        italics: italicPath,
        bolditalics: boldItalicPath
      }
    };
  } else {
    throw new Error('Some Roboto TrueType font files are missing.');
  }
} catch (error) {
  console.error('PDF_FONT_LOAD_ERROR: Falling back to standard Helvetica.', error);
  fonts = {
    Roboto: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };
}

pdfmake.setFonts(fonts);

export class PdfUtil {
  static async generateHandoverPdf(document: any, options: { includeCommitment?: boolean } = { includeCommitment: true }): Promise<Buffer> {
    const assetIds = document.items.map((i: any) => i.assetId);
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } }
    });
    const assetMap = new Map(assets.map(a => [a.id, a]));

    const docDate = document.confirmedAt ? new Date(document.confirmedAt) : new Date(document.createdAt);
    const day = docDate.getDate().toString().padStart(2, '0');
    const month = (docDate.getMonth() + 1).toString().padStart(2, '0');
    const year = docDate.getFullYear();
    
    const location = document.newLocation || '................................';
    const city = document.newCity || 'Hà Nội';

    let titleText = 'BIÊN BẢN BÀN GIAO TÀI SẢN';
    let senderRoleLabel = 'Đại diện bên giao';
    let recipientRoleLabel = 'Đại diện bên nhận';

    if (document.type === 'TRANSFER') {
      titleText = 'BIÊN BẢN ĐIỀU CHUYỂN TÀI SẢN';
    } else if (document.type === 'RECALL') {
      titleText = 'BIÊN BẢN THU HỒI TÀI SẢN';
      senderRoleLabel = 'Đại diện bên bàn giao';
      recipientRoleLabel = 'Đại diện đơn vị thu hồi';
    }

    const content: any[] = [
      // DANKO Corporate Header Row with Document QR Code
      {
        columns: [
          {
            stack: [
              { text: 'DANKO GROUP', style: 'companyHeader' },
              { text: 'BỘ PHẬN QLTS', style: 'departmentHeader' }
            ],
            width: '*'
          },
          {
            stack: [
              { qr: document.documentNo, fit: 50, alignment: 'right' },
              { text: 'Mã số biên bản', fontSize: 6.5, color: '#64748b', alignment: 'right', margin: [0, 3, 0, 0] }
            ],
            width: 'auto',
            margin: [0, -10, 0, 0]
          },
          {
            text: 'Mẫu số: BM02/QLTS',
            style: 'templateCodeHeader',
            alignment: 'right',
            width: 100
          }
        ],
        columnGap: 10
      },
      { text: '\n\n' },
      { text: titleText, style: 'documentTitle', alignment: 'center' },
      { text: `Số: ${document.documentNo}`, style: 'documentSubNo', alignment: 'center' },
      { text: '\n\n' },
      { 
        text: [
          { text: 'Hôm nay', font: 'Roboto' },
          `, ngày ${day} tháng ${month} năm ${year}, tại ${location}`
        ],
        style: 'normalText' 
      },
      { text: 'Chúng tôi gồm:', style: 'normalText', margin: [0, 5, 0, 10] },
      { text: `1. ${senderRoleLabel}`, style: 'sectionHeader' },
      {
        columns: [
          { text: `Ông/Bà: ${document.senderName || '................................'}`, style: 'normalText', width: '50%' },
          { text: `Bộ phận: ${document.senderDepartment || '................................'}`, style: 'normalText', width: '50%' }
        ],
        margin: [0, 2, 0, 2]
      },
      { 
        text: `Chức vụ: ${document.senderPosition || '................................'}`, 
        style: 'normalText',
        margin: [0, 2, 0, 10]
      },
      { text: `2. ${recipientRoleLabel}`, style: 'sectionHeader' },
      {
        columns: [
          { 
            text: `Ông/Bà: ${document.type === 'RECALL' ? (document.senderName || '................................') : (document.recipientName || '................................')}`, 
            style: 'normalText', 
            width: '50%' 
          },
          { 
            text: `Bộ phận: ${document.type === 'RECALL' ? 'Bộ phận QLTS / HCNS / Kho' : (document.recipientDepartment || '................................')}`, 
            style: 'normalText', 
            width: '50%' 
          }
        ],
        margin: [0, 2, 0, 2]
      },
      { 
        text: `Chức vụ: ${document.type === 'RECALL' ? 'Cán bộ Bộ phận QLTS' : (document.recipientPosition || '................................')}`, 
        style: 'normalText',
        margin: [0, 2, 0, 15]
      },
      { text: 'Cùng giao/nhận tài sản như sau:', style: 'normalTextBold', margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: [20, 85, '*', 95, 60, 25, 20, 50, 45],
          body: [
            [
              { text: 'STT', style: 'tableHeader', alignment: 'center' },
              { text: 'Mã tài sản / QR', style: 'tableHeader', alignment: 'center' },
              { text: 'Tên tài sản', style: 'tableHeader' },
              { text: 'Mô tả kỹ thuật', style: 'tableHeader' },
              { text: 'Serial', style: 'tableHeader' },
              { text: 'ĐVT', style: 'tableHeader', alignment: 'center' },
              { text: 'SL', style: 'tableHeader', alignment: 'center' },
              { text: 'Tình trạng', style: 'tableHeader' },
              { text: 'Ghi chú', style: 'tableHeader' }
            ],
            ...document.items.map((item: any, index: number) => {
              const asset = assetMap.get(item.assetId);
              const spec = asset?.usagePurpose || asset?.level4Name || '---';
              const serial = asset?.serialNumber || '---';
              const cond = asset?.status === 'IN_STOCK' ? 'Trong kho' : (asset?.status === 'LOST' ? 'Mất' : 'Bình thường');
              
              // Vertically center content text cells to align with the larger 50pt QR stack
              const vMargin = [0, 20, 0, 5];
              
              return [
                { text: (index + 1).toString(), style: 'tableCell', alignment: 'center', margin: vMargin },
                {
                  stack: [
                    { text: item.assetCode, style: 'tableCellCode', alignment: 'center' },
                    { qr: item.assetCode, fit: 50, alignment: 'center', margin: [0, 6, 0, 4] }
                  ]
                },
                { text: item.assetName, style: 'tableCell', margin: vMargin },
                { text: spec, style: 'tableCell', margin: vMargin },
                { text: serial, style: 'tableCell', margin: vMargin },
                { text: item.unit || 'Cái', style: 'tableCell', alignment: 'center', margin: vMargin },
                { text: '1', style: 'tableCell', alignment: 'center', margin: vMargin },
                { text: cond, style: 'tableCell', margin: vMargin },
                { text: asset?.documentNote || '---', style: 'tableCell', margin: vMargin }
              ];
            })
          ]
        },
        layout: {
          hLineWidth: function (i: number, node: any) {
            return (i === 0 || i === node.table.body.length) ? 1.5 : 0.8;
          },
          vLineWidth: function (i: number, node: any) {
            const wLen = node.table.widths ? node.table.widths.length : 9;
            return (i === 0 || i === wLen) ? 1.5 : 0.8;
          },
          hLineColor: function () {
            return '#475569';
          },
          vLineColor: function () {
            return '#475569';
          }
        }
      },
      { text: '\n' }
    ];

    if (options.includeCommitment) {
      content.push({
        stack: [
          { 
            text: 'Bên nhận đã kiểm tra đúng chủng loại, số lượng, tình trạng tài sản nêu trên và có trách nhiệm quản lý, sử dụng tài sản đúng mục đích công việc.', 
            style: 'commitmentText' 
          },
          { 
            text: 'Hệ thống/cá nhân quản lý tài sản cập nhật trạng thái tài sản theo biên bản này sau khi các bên xác nhận.', 
            style: 'commitmentText' 
          }
        ],
        margin: [0, 5, 0, 15]
      });
    }

    content.push(
      {
        text: `${city}, ngày ${day} tháng ${month} năm ${year}`,
        style: 'normalTextItalic',
        alignment: 'right',
        margin: [0, 0, 0, 15]
      },
      {
        columns: [
          {
            stack: [
              { text: 'ĐẠI DIỆN BÊN GIAO', style: 'signatureRole' },
              { text: '(Ký, ghi rõ họ tên)', style: 'signatureSubText' }
            ],
            alignment: 'center',
            width: '33.33%'
          },
          {
            stack: [
              { text: 'ĐẠI DIỆN BÊN NHẬN', style: 'signatureRole' },
              { text: '(Ký, ghi rõ họ tên)', style: 'signatureSubText' }
            ],
            alignment: 'center',
            width: '33.33%'
          },
          {
            stack: [
              { text: 'CVTS / HCNS', style: 'signatureRole' },
              { text: '(Ký, ghi rõ họ tên)', style: 'signatureSubText' }
            ],
            alignment: 'center',
            width: '33.33%'
          }
        ],
        margin: [0, 0, 0, 45]
      }
    );

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [42, 35, 42, 55], // Adjusted bottom margin for the new footer layout
      content: content,
      footer: function (currentPage: number, pageCount: number) {
        return {
          margin: [42, -15, 42, 0],
          stack: [
            { 
              text: 'CBNV có nhu cầu hỗ trợ về CNTT xin liên hệ: Lê Khánh Hùng – Phone/Viber: 0977131579', 
              fontSize: 7.5, 
              color: '#475569', 
              alignment: 'center',
              margin: [0, 0, 0, 8]
            },
            {
              columns: [
                { text: `Trang ${currentPage}/${pageCount}`, fontSize: 8, color: '#64748b' },
                { text: `Mã hồ sơ: ${document.documentNo}`, fontSize: 8, color: '#64748b', alignment: 'right' }
              ]
            }
          ]
        };
      },
      styles: {
        companyHeader: { fontSize: 10, bold: true, color: '#0f172a' },
        departmentHeader: { fontSize: 8, bold: true, color: '#475569' },
        templateCodeHeader: { fontSize: 9, bold: true, italics: true, color: '#334155' },
        documentTitle: { fontSize: 14, bold: true, color: '#0f172a' },
        documentSubNo: { fontSize: 10, bold: true, italics: true, color: '#334155' },
        normalText: { fontSize: 9.5, color: '#0f172a' },
        normalTextBold: { fontSize: 9.5, bold: true, color: '#0f172a' },
        normalTextItalic: { fontSize: 9.5, italics: true, color: '#0f172a' },
        sectionHeader: { fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
        tableHeader: { fontSize: 8.5, bold: true, color: '#0f172a', margin: [0, 4, 0, 4] },
        tableCell: { fontSize: 8.5, color: '#0f172a', margin: [0, 3, 0, 3] },
        tableCellCode: { fontSize: 8, bold: true, color: '#0f172a', margin: [0, 3, 0, 3] },
        commitmentText: { fontSize: 8.5, italics: true, color: '#334155', margin: [0, 2, 0, 2] },
        signatureRole: { fontSize: 9.5, bold: true, color: '#0f172a' },
        signatureSubText: { fontSize: 8, italics: true, color: '#475569', margin: [0, 2, 0, 0] }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }
}
