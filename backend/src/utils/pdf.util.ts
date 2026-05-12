const pdfmake = require('pdfmake');
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import path from 'path';

const fonts = {
  Roboto: {
    normal: path.join(__dirname, '../../fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../../fonts/Roboto-Medium.ttf'),
    italics: path.join(__dirname, '../../fonts/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '../../fonts/Roboto-MediumItalic.ttf')
  }
};

pdfmake.setFonts(fonts);

export class PdfUtil {
  static async generateHandoverPdf(document: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', style: 'header', alignment: 'center' },
        { text: 'Độc lập - Tự do - Hạnh phúc', style: 'subheader', alignment: 'center', decoration: 'underline' },
        { text: '\n' },
        { text: 'BIÊN BẢN BÀN GIAO TÀI SẢN', style: 'title', alignment: 'center' },
        { text: `Số: ${document.documentNo}`, alignment: 'center' },
        { text: '\n' },
        { text: `Hôm nay, ngày ${new Date(document.createdAt).toLocaleDateString('vi-VN')}, chúng tôi gồm có:` },
        { text: '\n' },
        { text: 'BÊN GIAO:', style: 'sectionHeader' },
        { text: `Họ và tên: ${document.senderName || '................................'}` },
        { text: `Phòng ban: ${document.senderDepartment || '................................'}` },
        { text: '\n' },
        { text: 'BÊN NHẬN:', style: 'sectionHeader' },
        { text: `Họ và tên: ${document.recipientName}` },
        { text: `Chức vụ: ${document.recipientPosition || 'N/A'}` },
        { text: `Phòng ban: ${document.recipientDepartment || 'N/A'}` },
        { text: '\n' },
        { text: 'Nội dung bàn giao:', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: [20, '*', 100, 40, 60],
            body: [
              [
                { text: 'STT', style: 'tableHeader' },
                { text: 'Tên tài sản', style: 'tableHeader' },
                { text: 'Mã tài sản', style: 'tableHeader' },
                { text: 'ĐVT', style: 'tableHeader' },
                { text: 'Tình trạng', style: 'tableHeader' }
              ],
              ...document.items.map((item: any, index: number) => [
                (index + 1).toString(),
                item.assetName,
                item.assetCode,
                item.unit || 'Cái',
                item.status || 'Bình thường'
              ])
            ]
          }
        },
        { text: '\n' },
        { text: `Ghi chú: ${document.note || 'Không có'}` },
        { text: '\n\n' },
        {
          columns: [
            { text: 'BÊN GIAO\n(Ký và ghi rõ họ tên)', alignment: 'center' },
            { text: 'BÊN NHẬN\n(Ký và ghi rõ họ tên)', alignment: 'center' }
          ]
        }
      ],
      styles: {
        header: { fontSize: 12, bold: true },
        subheader: { fontSize: 11, bold: true },
        title: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
        sectionHeader: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
        tableHeader: { bold: true, fontSize: 11, color: 'black' }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }
}
