import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { rupiah, tglPendek, ribuan } from './format';
import { hitungBooking, jumlahUnitHitung, lengkapiDariUnit } from './booking';
import { urlKeDataUrl } from './image';

function statusItem(b) {
  return b.statusBayar === 'Lunas' ? 'LUNAS' : b.statusBayar === 'DP' ? 'DP' : 'BELUM BAYAR';
}

export function namaFileKwitansi(booking) {
  const nama = String(booking.namaTamu || 'tamu').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  return `kwitansi-${nama}-${booking.items?.[0]?.checkIn || ''}.pdf`;
}

/** Versi teks untuk disalin ke WhatsApp. */
export function teksKwitansi(booking, s, units) {
  const h = hitungBooking(lengkapiDariUnit(booking.items, units), booking.dp, booking.pelunasan);
  const baris = [];
  baris.push('*KWITANSI*');
  baris.push(s.namaPerusahaan || 'TRAVELINK MAKASSAR MANAGEMENT');
  if (s.judulKwitansi) baris.push(s.judulKwitansi);
  if (s.instagram) baris.push(`By ${s.instagram}`);
  baris.push('');
  baris.push(`Nama Penyewa : ${booking.namaTamu || '-'}`);
  baris.push(`No WhatsApp  : ${booking.noTelepon || '-'}`);
  if (booking.alamat) baris.push(`Alamat       : ${booking.alamat}`);
  baris.push('');
  h.items.forEach((it, i) => {
    baris.push(`${i + 1}. Unit ${it.unitNomor}${it.unitTipe ? ` (${it.unitTipe})` : ''}`);
    if (it.properti) baris.push(`   ${it.properti}`);
    baris.push(`   ${tglPendek(it.checkIn)} ${it.jamCheckIn || ''} - ${tglPendek(it.checkOut)} ${it.jamCheckOut || ''}`);
    baris.push(`   Periode: ${it.malam > 0 ? it.malam + ' malam' : '1 hari'}`);
    baris.push(`   Harga: ${rupiah(it.harga)}${it.diskon > 0 ? ` - diskon ${rupiah(it.diskon)}` : ''}`);
    baris.push(`   Subtotal: ${rupiah(it.subtotal)}`);
  });
  baris.push('');
  baris.push(`Total Harga  : ${rupiah(h.total)}`);
  baris.push(`Terbayar     : ${rupiah(h.terbayar)}`);
  baris.push(`Sisa         : ${rupiah(Math.max(0, h.sisa))}`);
  baris.push(`Status       : ${statusItem({ statusBayar: h.statusBayar })}`);
  baris.push('');
  baris.push('*REKENING PEMBAYARAN*');
  baris.push(s.bank || 'BANK BRI');
  baris.push(`NAMA   : ${s.namaRekening || '-'}`);
  baris.push(`NO REK : ${s.noRekening || '(belum diisi di Settings)'}`);
  baris.push('');
  baris.push(`Kontak: ${s.whatsapp || '-'}`);
  baris.push(s.ttdJabatan || 'AGEN TRAVELINK MAKASSAR');
  baris.push(s.ttdNama || '');
  return baris.join('\n');
}

/** Buat PDF kwitansi dan langsung unduh. */
export async function unduhPdfKwitansi(booking, s, units) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 18;
  const R = 192;
  let y = 18;

  // Logo (kalau ada)
  if (s.logoUrl) {
    try {
      const dataUrl = await urlKeDataUrl(s.logoUrl);
      doc.addImage(dataUrl, 'PNG', L, y - 4, 22, 22, undefined, 'FAST');
    } catch (e) {
      console.warn('Logo tidak bisa dimuat ke PDF:', e?.message);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('KWITANSI', 105, y + 2, { align: 'center' });

  doc.setFontSize(12);
  doc.text(String(s.namaPerusahaan || 'TRAVELINK MAKASSAR MANAGEMENT'), 105, y + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (s.judulKwitansi) { doc.text(String(s.judulKwitansi), 105, y + 15, { align: 'center' }); y += 5; }
  if (s.instagram) doc.text(`By ${s.instagram}`, 105, y + 15, { align: 'center' });

  y += 24;
  doc.setDrawColor(200);
  doc.line(L, y, R, y);
  y += 8;

  // Data penyewa
  doc.setFontSize(10);
  const dataTamu = [
    ['Nama Penyewa', booking.namaTamu || '-'],
    ['No WhatsApp', booking.noTelepon || '-']
  ];
  if (booking.alamat) dataTamu.push(['Alamat', booking.alamat]);
  dataTamu.push(['Tanggal Kwitansi', tglPendek(booking.tanggalKwitansi || new Date().toISOString().slice(0, 10))]);

  for (const [k, v] of dataTamu) {
    doc.setFont('helvetica', 'normal');
    doc.text(k, L, y);
    doc.text(':', L + 34, y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(v), L + 38, y);
    y += 6;
  }

  const h = hitungBooking(lengkapiDariUnit(booking.items, units), booking.dp, booking.pelunasan);

  autoTable(doc, {
    startY: y + 3,
    margin: { left: L, right: 18 },
    head: [['Unit', 'Check-in', 'Check-out', 'Periode', 'Harga', 'Diskon', 'Jumlah']],
    body: h.items.map((it) => [
      `${it.unitNomor}${it.unitTipe ? ' - ' + it.unitTipe : ''}${it.properti ? '\n' + it.properti : ''}`,
      `${tglPendek(it.checkIn)}\n${it.jamCheckIn || ''}`,
      `${tglPendek(it.checkOut)}\n${it.jamCheckOut || ''}`,
      it.malam > 0 ? `${it.malam} mlm` : '1 hari',
      ribuan(it.harga),
      it.diskon > 0 ? ribuan(it.diskon) : '-',
      ribuan(it.subtotal)
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [220, 220, 220], textColor: [20, 20, 20] },
    headStyles: { fillColor: [77, 166, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' }
    }
  });

  y = doc.lastAutoTable.finalY + 8;

  // Ringkasan
  const ringkas = [['Total Harga', h.total], ['Terbayar', h.terbayar], ['Sisa', Math.max(0, h.sisa)]];
  doc.setFontSize(10);
  for (const [k, v] of ringkas) {
    doc.setFont('helvetica', 'normal');
    doc.text(k, 128, y);
    doc.setFont('helvetica', 'bold');
    doc.text(rupiah(v), R, y, { align: 'right' });
    y += 6;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(statusItem({ statusBayar: h.statusBayar }), R, y + 2, { align: 'right' });

  // Rekening
  let yr = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REKENING PEMBAYARAN', L, yr);
  doc.setFont('helvetica', 'normal');
  yr += 5.5;
  doc.text(String(s.bank || 'BANK BRI'), L, yr); yr += 5;
  doc.text(`NAMA   : ${s.namaRekening || '-'}`, L, yr); yr += 5;
  doc.text(`NO REK : ${s.noRekening || '(belum diisi di Settings)'}`, L, yr); yr += 5;
  doc.text(`Kontak : ${s.whatsapp || '-'}`, L, yr);

  // Tanda tangan
  const yTtd = Math.max(y + 16, yr + 18);
  doc.setFontSize(9.5);
  doc.text(String(s.ttdJabatan || 'AGEN TRAVELINK MAKASSAR'), R, yTtd, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(String(s.ttdNama || ''), R, yTtd + 22, { align: 'right' });
  doc.setDrawColor(160);
  doc.line(R - 52, yTtd + 24.5, R, yTtd + 24.5);

  if (booking.catatan) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(`Catatan: ${booking.catatan}`, 90), L, yTtd + 6);
  }

  doc.save(namaFileKwitansi(booking));
}

export { jumlahUnitHitung };
