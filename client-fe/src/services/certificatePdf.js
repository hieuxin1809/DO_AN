/**
 * Sinh PDF Giấy xác nhận tiêm chủng — dùng html2canvas snapshot HTML
 * để hỗ trợ tiếng Việt đầy đủ (jsPDF built-in font không support Unicode).
 *
 * cert shape: {
 *   serialNo, fullNameSnapshot, birthdateSnapshot, phoneSnapshot, emailSnapshot,
 *   addressSnapshot, vaccineName, vaccineManufacturer, vaccineType,
 *   doseNumber, totalDoses, centerName, centerAddress,
 *   doctorName, nurseName, injectionDate, issuedDate, hash
 * }
 */
import jsPDF from 'jspdf';
// html2canvas-pro: fork hỗ trợ oklch(), lab(), lch(), color() — fix bug
// "Attempting to parse an unsupported color function 'oklch'" khi Chrome 111+
// trả về oklch từ getComputedStyle cho các CSS không set tường minh.
import html2canvas from 'html2canvas-pro';
import QRCode from 'qrcode';

/* ─── Lấy base URL cho QR — ưu tiên localStorage override ─── */
export function getVerifyBaseUrl() {
  try {
    const override = localStorage.getItem('certVerifyBaseUrl');
    if (override && override.trim()) return override.trim().replace(/\/$/, '') + '/verify';
  } catch {}
  return `${window.location.origin}/verify`;
}

/* ─── Helpers format ─── */
function fmtDate(input) {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function fmtDateTime(input) {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(d)} ${hh}:${min}`;
}
function esc(s) {
  if (s == null) return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function safe(v, fallback = '—') {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s ? esc(s) : fallback;
}

/* ─── Build HTML template cho certificate ─── */
function buildCertificateHtml(cert, qrDataUrl, verifyUrl) {
  const dose = cert.doseNumber
    ? (cert.totalDoses ? `${cert.doseNumber}/${cert.totalDoses}` : `${cert.doseNumber}`)
    : '—';

  return `
    <div style="
      width: 794px;
      padding: 0;
      background: #fff;
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      box-sizing: border-box;
    ">
      <!-- HEADER -->
      <div style="
        background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
        padding: 32px 48px;
        color: #fff;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">💉 iVaccine</div>
          <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Hệ thống quản lý tiêm chủng</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">GIẤY XÁC NHẬN TIÊM CHỦNG</div>
          <div style="font-size: 11px; opacity: 0.85; margin: 4px 0;">VACCINE CERTIFICATE</div>
          <div style="font-size: 13px; margin-top: 8px; background: rgba(255,255,255,0.18);
                       border-radius: 6px; padding: 4px 12px; display: inline-block;
                       font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 1px;">
            ${safe(cert.serialNo)}
          </div>
        </div>
      </div>
      <div style="height: 4px; background: linear-gradient(90deg, #10b981, #0ea5e9, #7c3aed);"></div>

      <!-- BODY -->
      <div style="padding: 28px 48px;">

        ${sectionTitle('I. THÔNG TIN NGƯỜI TIÊM CHỦNG')}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px 32px; margin-bottom: 4px;">
          ${field('Họ và tên',     cert.fullNameSnapshot)}
          ${field('Số CMND/CCCD',  cert.idCardSnapshot)}
          ${field('Ngày sinh',     fmtDate(cert.birthdateSnapshot))}
          ${field('Số điện thoại', cert.phoneSnapshot)}
          ${field('Email',         cert.emailSnapshot)}
        </div>
        <div style="margin-top: 6px;">
          ${field('Địa chỉ', cert.addressSnapshot)}
        </div>

        ${sectionTitle('II. THÔNG TIN MŨI TIÊM')}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px 32px;">
          ${field('Tên vaccine',   cert.vaccineName)}
          ${field('Loại vaccine',  cert.vaccineType)}
          ${field('Nhà sản xuất',  cert.vaccineManufacturer)}
          ${field('Mũi số',        dose)}
          ${field('Ngày tiêm',     fmtDateTime(cert.injectionDate))}
        </div>

        ${sectionTitle('III. NƠI TIÊM CHỦNG')}
        ${field('Trung tâm', cert.centerName)}
        <div style="margin-top: 12px;">
          ${field('Địa chỉ', cert.centerAddress)}
        </div>

        <!-- XÁC THỰC / QR -->
        <div style="
          margin-top: 28px;
          background: #f0f9ff;
          border: 1.5px dashed #0ea5e9;
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          gap: 24px;
          align-items: center;
        ">
          <img src="${qrDataUrl}" alt="QR" style="width: 160px; height: 160px; flex-shrink: 0; background: #fff; padding: 6px; border-radius: 8px;" />
          <div style="flex: 1; font-size: 13px; color: #334155; line-height: 1.6;">
            <div style="font-size: 15px; font-weight: 800; color: #0284c7; margin-bottom: 8px;">
              🔒 XÁC THỰC TÍNH HỢP LỆ
            </div>
            <div style="margin-bottom: 6px;">
              Quét mã QR bên cạnh hoặc truy cập URL bên dưới để xác thực:
            </div>
            <div style="
              background: #fff;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 6px 10px;
              font-family: 'Courier New', monospace;
              font-size: 11.5px;
              color: #0284c7;
              word-break: break-all;
              margin-bottom: 8px;
            ">${verifyUrl}</div>
            <div style="font-size: 11.5px; color: #64748b;">
              📅 Ngày cấp: <strong>${fmtDateTime(cert.issuedDate)}</strong>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="
          margin-top: 28px;
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        ">
          <div>iVaccine — Hệ thống quản lý tiêm chủng trực tuyến</div>
        </div>
      </div>
    </div>
  `;
}

function sectionTitle(title) {
  return `
    <div style="
      color: #0284c7;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 18px 0 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #0ea5e9;
    ">${esc(title)}</div>
  `;
}
function field(label, value) {
  return `
    <div>
      <div style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px;">${esc(label)}</div>
      <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; line-height: 1.4;">${safe(value)}</div>
    </div>
  `;
}

/* ─── Main: render + download ─── */
export async function downloadCertificatePdf(cert, verifyBaseUrl = getVerifyBaseUrl()) {
  if (!cert || !cert.serialNo) throw new Error('Dữ liệu giấy xác nhận không hợp lệ (thiếu serialNo)');

  const verifyUrl = `${verifyBaseUrl}/${cert.serialNo}`;

  // 1. Sinh QR code
  let qrDataUrl;
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch (e) {
    console.error('[cert] QR generation failed:', e);
    throw new Error('Không tạo được mã QR: ' + (e?.message || e));
  }

  // 2. Tạo IFRAME cô lập để render — tránh kế thừa CSS toàn page
  //    (Tailwind v3.4+ dùng oklch() mà html2canvas v1 không parse được)
  const iframe = document.createElement('iframe');
  iframe.style.cssText = [
    'position: absolute',
    'left: 0',
    'top: 0',
    'opacity: 0',
    'pointer-events: none',
    'z-index: -1',
    'width: 820px',
    'height: 1200px',
    'border: 0',
  ].join(';');
  document.body.appendChild(iframe);

  // Chờ iframe sẵn sàng và ghi content vào
  await new Promise(resolve => {
    iframe.onload = resolve;
    // CSS reset cực mạnh — ép color hex để tránh oklch() từ UA stylesheet
    // (Chrome 111+ trả về oklch khi getComputedStyle nếu color không được set tường minh)
    iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *, *::before, *::after {
        color: #0f172a;
        background-color: transparent;
        border-color: #e2e8f0;
        text-decoration-color: #0f172a;
        column-rule-color: #e2e8f0;
        outline-color: #0f172a;
        -webkit-text-fill-color: #0f172a;
        -webkit-text-stroke-color: #0f172a;
        caret-color: #0f172a;
        accent-color: #0f172a;
        color-scheme: light only;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        color-scheme: light only;
      }
      body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    </style></head><body>${buildCertificateHtml(cert, qrDataUrl, verifyUrl)}</body></html>`;
  });

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const target = iframeDoc.body.firstElementChild;
    if (!target) throw new Error('Không tạo được DOM cho giấy xác nhận');

    // Chờ thêm 1 frame để layout/font ổn định
    await new Promise(r => setTimeout(r, 100));

    // 3. html2canvas snapshot — chụp body của iframe (CSS hoàn toàn cô lập)
    let canvas;
    try {
      canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width:  target.offsetWidth  || 794,
        height: target.offsetHeight || undefined,
        windowWidth:  target.offsetWidth  || 794,
        windowHeight: target.offsetHeight || undefined,
      });
    } catch (e) {
      console.error('[cert] html2canvas failed:', e);
      throw new Error('Không chụp được nội dung giấy xác nhận: ' + (e?.message || e));
    }

    // 4. Đưa vào PDF A4
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth   = pageWidth;
    const imgHeight  = (canvas.height * imgWidth) / canvas.width;

    let imgData;
    try {
      imgData = canvas.toDataURL('image/png');
    } catch (e) {
      console.error('[cert] canvas.toDataURL failed (có thể do tainted canvas):', e);
      throw new Error('Không xuất được ảnh canvas: ' + (e?.message || e));
    }

    if (imgHeight > pageHeight) {
      const scaledWidth = (canvas.width * pageHeight) / canvas.height;
      const offsetX = (pageWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', offsetX, 0, scaledWidth, pageHeight);
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    }

    pdf.save(`GiayXacNhan_${cert.serialNo}.pdf`);
  } finally {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }
}
