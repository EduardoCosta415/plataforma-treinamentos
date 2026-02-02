export interface CertificateModule {
  name: string;
  score: number; // Aproveitamento
  hours: number;
  frequency: number;
  instructor: string;
}

export interface CertificateData {
  studentName: string;
  studentCpf: string; // Adicionado conforme a foto
  courseTitle: string; // Ex: NR 35 - TRABALHO EM ALTURA
  startDate: string; // Adicionado
  endDate: string; // Adicionado
  expirationDate: string; // Validade
  workloadHours: number;
  verificationCode: string;

  // Dados do Verso
  modules: CertificateModule[];
}

export const buildCertificateHtml = (data: CertificateData): string => {
  // Gera as linhas da tabela dinamicamente
  const tableRows = data.modules
    .map(
      (m) => `
    <tr>
      <td style="text-align: left; padding-left: 10px;">${m.name}</td>
      <td>${m.score}%</td>
      <td>${m.hours}</td>
      <td>${m.frequency.toFixed(2)}%</td>
      <td>${m.instructor}</td>
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
        /* ================= RESET & CONFIGURAÇÃO GERAL ================= */
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');
        
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Open Sans', sans-serif; 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
        }

        /* Configuração da Página A4 Paisagem (Puppeteer) */
        .page {
          width: 1123px; /* A4 Paisagem em 96dpi aprox */
          height: 794px;
          position: relative;
          background: white;
          overflow: hidden;
          page-break-after: always; /* Força nova página para o verso */
          display: flex;
          flex-direction: column;
        }

        .page:last-child {
          page-break-after: avoid;
        }

        /* Cores Baseadas nas Fotos */
        :root {
          --gold-light: #F0E68C;
          --gold-main: #D4AF37;
          --gold-dark: #B8860B;
          --brown-text: #5D4037;
        }

        /* ================= ELEMENTOS DECORATIVOS (CURVAS) ================= */
        .curve-top-right {
          position: absolute;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #fff 40%, var(--gold-main) 40%, var(--brown-text) 100%);
          border-radius: 50%;
          z-index: 0;
          opacity: 0.9;
          box-shadow: -5px 5px 15px rgba(0,0,0,0.2);
        }

        .curve-bottom-left {
          position: absolute;
          bottom: -150px;
          left: -100px;
          width: 500px;
          height: 500px;
          background: linear-gradient(45deg, var(--gold-main) 0%, #fff 60%);
          border-radius: 50%;
          z-index: 0;
          border: 20px solid var(--gold-dark);
        }
        
        /* Curva específica do verso (canto inferior direito) */
        .curve-bottom-right {
          position: absolute;
          bottom: -100px;
          right: -100px;
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #fff 30%, var(--gold-light) 100%);
          border-radius: 50%;
          border-left: 15px solid var(--gold-main);
          z-index: 0;
        }

        /* ================= CONTEÚDO DA FRENTE ================= */
        .front-container {
          padding: 60px 80px;
          position: relative;
          z-index: 1; /* Fica acima das curvas */
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Badge NR-35 (Amarelo) */
        .nr-badge {
          position: absolute;
          top: 50px;
          left: 50px;
          width: 100px;
          height: 100px;
          background: yellow;
          transform: rotate(45deg);
          border: 3px solid black;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
        }
        .nr-badge span {
          transform: rotate(-45deg);
          font-weight: 800;
          font-size: 24px;
          text-align: center;
          line-height: 1;
          color: red;
        }

        /* Logo Central */
        .logo-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo-placeholder {
          font-family: serif;
          font-size: 40px;
          color: var(--gold-dark);
          text-transform: uppercase;
          letter-spacing: 5px;
        }

        h1.cert-title {
          font-size: 64px;
          font-weight: 800;
          margin: 10px 0 40px 0;
          color: #000;
        }

        .cert-body {
          font-size: 20px;
          line-height: 1.6;
          text-align: justify;
          color: #333;
          width: 90%;
        }

        .bold {
          font-weight: 700;
          color: #000;
        }

        /* Assinaturas */
        .signatures {
          margin-top: auto; /* Empurra para baixo */
          margin-bottom: 40px;
          width: 100%;
          display: flex;
          justify-content: space-between;
          padding: 0 50px;
        }

        .sig-block {
          text-align: center;
          width: 40%;
        }

        .sig-line {
          border-top: 2px solid #000;
          margin-bottom: 10px;
        }

        .sig-role {
          font-weight: 700;
          font-size: 16px;
          text-transform: uppercase;
        }

        /* ================= CONTEÚDO DO VERSO ================= */
        .back-container {
          padding: 40px 50px;
          position: relative;
          z-index: 1;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 150px;
          opacity: 0.05;
          font-weight: 900;
          color: var(--gold-dark);
          z-index: 0;
          pointer-events: none;
        }

        .back-header {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 20px;
          text-transform: uppercase;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          z-index: 2;
          background: rgba(255,255,255,0.8); /* Leve fundo branco para ler sobre marca d'agua */
        }

        th, td {
          border: 1px solid #ccc;
          padding: 8px 5px;
          text-align: center;
        }

        th {
          background-color: #fff;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
        }

        td {
          font-weight: 600;
          color: #333;
        }

        /* Zebra striping sutil */
        tr:nth-child(even) {
          background-color: #fcfcfc;
        }

      </style>
    </head>
    <body>

      <div class="page">
        <div class="curve-top-right"></div>
        <div class="curve-bottom-left"></div>
        
        <div class="nr-badge">
          <span>NR<br>35</span>
        </div>

        <div class="front-container">
          <div class="logo-header">
            <div style="font-size: 40px; margin-bottom: 5px;">👷</div> 
            <div class="logo-placeholder">LAENA</div>
          </div>

          <h1 class="cert-title">Certificado</h1>

          <div class="cert-body">
            Certificamos que <span class="bold">${data.studentName.toUpperCase()}</span>, 
            CPF nº <span class="bold">${data.studentCpf}</span>, 
            participou do treinamento <span class="bold">${data.courseTitle.toUpperCase()}</span>, 
            realizado de ${data.startDate} a ${
    data.endDate
  }, com validade de 2 anos.
            <br><br>
            Curso realizado pela <span class="bold">LAENA - Centro de Treinamento e Capacitação de Segurança do Trabalho EAD Ltda</span>, 
            inscrito no CNPJ sob nº 59.182.033/0001-42, com sede na Rua Uberlândia, nº 252, Sala 307, Centro, Ipatinga/MG – CEP 35160-024.
          </div>

          <div class="signatures">
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-role">Diretora Geral</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-role">Eng Responsável</div>
            </div>
          </div>
        </div>
      </div>

      <div class="page">
        <div class="curve-bottom-right"></div>
        
        <div class="watermark">LAENA</div>

        <div class="back-container">
          <div class="back-header">CARGA HORÁRIA TOTAL DE ${
            data.workloadHours
          } HORAS</div>

          <table>
            <thead>
              <tr>
                <th style="width: 40%; text-align: left; padding-left: 10px;">DISCIPLINAS (MÓDULOS)</th>
                <th style="width: 15%;">APROVEITAMENTO</th>
                <th style="width: 15%;">CARGA HORÁRIA</th>
                <th style="width: 15%;">FREQUÊNCIA</th>
                <th style="width: 15%;">INSTRUTOR</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; font-size: 10px; color: #666; text-align: center;">
            Certificado ID: ${
              data.verificationCode
            } • Gerado eletronicamente em ${new Date().toLocaleDateString(
    'pt-BR',
  )}
          </div>
        </div>
      </div>

    </body>
    </html>
  `;
};
