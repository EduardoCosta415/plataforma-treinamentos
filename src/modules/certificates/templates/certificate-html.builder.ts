export interface CertificateModule {
  name: string;
  score?: number;
  hours?: number;
  frequency?: number;
  instructorName?: string;
  instructorCrea?: string;
}

export interface CertificateData {
  studentName: string;
  studentCpf: string;
  courseTitle: string;
  nrNumber: string;
  startDate: string;
  endDate: string;
  expirationDate: string;
  workloadHours: number;
  verificationCode: string;
  modules: CertificateModule[];
  logoBase64?: string;
  directorName?: string;
  engineerName?: string;
}

export const buildCertificateHtml = (data: CertificateData): string => {
  const DEFAULT_INSTRUCTOR = 'Jorgiano De Assis Lage';
  const DEFAULT_CREA = '385355';

  const tableRows = (data.modules || [])
    .map(
      (m) => `
    <tr>
      <td style="text-align: left; padding-left: 10px;">${m.name || '---'}</td>
      <td>${m.score !== undefined ? `${m.score}%` : '---'}</td>
      <td>${m.hours !== undefined ? `${m.hours}h` : '---'}</td>
      <td>${
        m.frequency !== undefined ? `${m.frequency.toFixed(2)}%` : '---'
      }</td>
      <td>
        ${m.instructorName || DEFAULT_INSTRUCTOR}<br>
        <small>CREA: ${m.instructorCrea || DEFAULT_CREA}</small>
      </td>
    </tr>
  `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        /* Trocado para Alex Brush conforme solicitado */
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&family=Alex+Brush&display=swap');
        
        body { margin: 0; padding: 0; font-family: 'Open Sans', sans-serif; -webkit-print-color-adjust: exact; }
        .page { width: 1123px; height: 794px; position: relative; background: white; overflow: hidden; page-break-after: always; display: flex; flex-direction: column; }
        :root { --gold-main: #D4AF37; --gold-dark: #B8860B; --brown-text: #5D4037; }
        
        .curve-bottom-left { position: absolute; bottom: -120px; left: -80px; width: 400px; height: 400px; background: linear-gradient(45deg, var(--gold-main) 0%, #fff 70%); border-radius: 50%; z-index: 0; border: 15px solid var(--gold-dark); }
        
        .nr-badge { 
          position: absolute; 
          top: 60px; 
          right: 60px; 
          width: 120px; 
          height: 120px; 
          background: #FFD700; 
          transform: rotate(45deg); 
          border: 4px solid #000; 
          border-radius: 8px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 2; 
        }
        .nr-badge-content { transform: rotate(-45deg); font-weight: 900; font-size: 28px; text-align: center; color: #000; line-height: 1; }
        .nr-badge-content small { font-size: 14px; display: block; }
        
        .front-container { padding: 40px 80px; position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; align-items: center; }
        .logo-img { height: 180px; width: auto; margin-bottom: 0px; }
        h1.cert-title { font-size: 72px; font-weight: 800; margin: 0px 0 30px 0; color: #000; text-transform: uppercase; letter-spacing: 2px; }
        .cert-body { font-size: 22px; line-height: 1.6; text-align: center; color: #333; width: 85%; }
        .bold { font-weight: 800; color: #000; }
        
        .signatures { margin-top: auto; margin-bottom: 50px; width: 100%; display: flex; justify-content: space-around; }
        .sig-block { text-align: center; width: 35%; position: relative; }
        
        /* Estilo da Assinatura com Alex Brush e proteção contra quebra de linha */
        .signature-font {
          font-family: 'Alex Brush', cursive;
          font-size: 48px; /* Ajustado para Alex Brush que costuma ser um pouco menor */
          color: #000;
          margin-bottom: -10px;
          display: block;
          line-height: 1;
          white-space: nowrap; /* IMPEDE A QUEBRA DE LINHA */
          overflow: visible; /* Garante que se passar um pouco, não corte */
        }

        .sig-line { border-top: 1.5px solid #000; margin-bottom: 8px; }
        .sig-role { font-weight: 700; font-size: 14px; text-transform: uppercase; color: #444; }
        
        .back-container { padding: 60px 50px; position: relative; z-index: 1; }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 120px; opacity: 0.04; font-weight: 900; color: var(--gold-dark); z-index: 0; pointer-events: none; }
        
        table { width: 100%; border-collapse: collapse; font-size: 13px; background: rgba(255,255,255,0.9); }
        th, td { border: 1px solid #999; padding: 12px 8px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: 800; text-transform: uppercase; }
        .footer-info { margin-top: 40px; font-size: 11px; color: #777; text-align: center; border-top: 1px dashed #ccc; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="curve-bottom-left"></div>
        
        <div class="nr-badge">
          <div class="nr-badge-content"><small>NR</small>${data.nrNumber}</div>
        </div>

        <div class="front-container">
          <img src="${data.logoBase64}" class="logo-img" alt="Logo">
          <h1 class="cert-title">Certificado</h1>
          <div class="cert-body">
            Certificamos que <span class="bold">${data.studentName.toUpperCase()}</span>, 
            portador(a) do CPF nº <span class="bold">${data.studentCpf}</span>, 
            concluiu com êxito o treinamento de <span class="bold">${data.courseTitle.toUpperCase()}</span>, 
            realizado no período de ${data.startDate} a ${data.endDate}, 
            com carga horária total de <span class="bold">${
              data.workloadHours
            } horas</span>.
            <br><br>
            Treinamento realizado pela <span class="bold">LAENA - Centro de Treinamento e Capacitação de Segurança do Trabalho EAD Ltda</span>, 
            CNPJ 59.182.033/0001-42, sediada na Rua Uberlândia, nº 252, Sala 307, Centro, Ipatinga/MG.
          </div>
          
          <div class="signatures">
            <div class="sig-block">
              <span class="signature-font">
                ${data.directorName || 'Assinatura'}
              </span>
              <div class="sig-line"></div>
              <div class="sig-role">Diretora Geral</div>
            </div>

            <div class="sig-block">
              <span class="signature-font">
                ${data.engineerName || 'Assinatura'}
              </span>
              <div class="sig-line"></div>
              <div class="sig-role">Engenheiro(a) Responsável</div>
            </div>
          </div>

        </div>
      </div>
      <div class="page">
        <div class="watermark">LAENA</div>
        <div class="back-container">
          <h2 style="text-align: center; margin-bottom: 30px; color: var(--brown-text);">CONTEÚDO PROGRAMÁTICO</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 45%; text-align: left; padding-left: 15px;">Módulos do Treinamento</th>
                <th style="width: 12%;">Aproveitamento</th>
                <th style="width: 13%;">Carga Horária</th>
                <th style="width: 10%;">Frequência</th>
                <th style="width: 20%;">Instrutor</th>
              </tr>
            </thead>
            <tbody>
              ${
                tableRows ||
                '<tr><td colspan="5">Nenhum módulo registrado.</td></tr>'
              }
            </tbody>
          </table>
          <div class="footer-info">
            Código de Autenticidade: <strong>${
              data.verificationCode
            }</strong> • Documento gerado em ${new Date().toLocaleDateString(
    'pt-BR',
  )}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
