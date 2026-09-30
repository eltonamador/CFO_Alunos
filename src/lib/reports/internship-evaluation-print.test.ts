import { describe, expect, it } from "vitest";
import { evaluationPrintHtml } from "./internship-evaluation-print";
import type { EvaluationContext } from "@/modules/internship-management/domain/evaluation";
const context: EvaluationContext = {
  student_number: 1, war_name: '<img src=x onerror=alert(1)>', course_phase: 'CFO I',
  activity_name: 'AR — Salvamento', site_name: '1º GBM',
  starts_at: '2026-09-26T10:45:00Z', ends_at: '2026-09-26T22:45:00Z',
};
describe('Impressão de avaliação', () => {
  it('escapa nomes e observações e apresenta a jornada no horário de Belém', () => {
    const html = evaluationPrintHtml(context, {
      id: 'resposta', evaluator_name: 'Cap. <script>alert(1)</script>', evaluator_unit: '1º GBM',
      ratings: { pontualidade:'esperado', seguranca:'nao_observado', tecnica:'reforco', equipe:'acima', postura:'esperado', aprendizagem:'esperado' },
      guidance:'<img src=x onerror=alert(2)>', incident:true, incident_note:'<script>alert(3)</script>', submitted_at:'2026-09-27T12:00:00Z',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('07:45');
    expect(html).toContain('19:45');
    expect(html.match(/●/g)).toHaveLength(6);
  });
  it('imprime a ficha em branco sem induzir respostas', () => {
    const html=evaluationPrintHtml(context);
    expect(html).not.toContain('●');
    expect(html.match(/○/g)).toHaveLength(32);
    expect(html).toContain('Pontualidade');
    expect(html).toContain('Não observado');
    expect(html).toContain('Reconhecimento e preparo');
  });
  it('mostra atividades e critérios da AR com segurança e sem dados de paciente', () => {
    const html = evaluationPrintHtml(context, {
      id: 'resposta', evaluator_name: 'Cap. Teste', evaluator_unit: '1º GBM',
      ratings: { pontualidade:'esperado', seguranca:'esperado', tecnica:'esperado', equipe:'esperado', postura:'esperado', aprendizagem:'esperado' },
      details: {
        formVersion: 2, evaluatorFunction: 'comandante', evaluatorFunctionOther: '',
        vehiclePrefix: 'AR-01', occurrenceCount: 2, activities: ['materiais','apoio'],
        technicalRatings: { ar_preparo: 'esperado', ar_apoio: 'acima' },
        positiveNote: '<script>alert(2)</script>', feedbackGiven: 'sim', coordinationNotified: false,
      },
      guidance:'', incident:false, incident_note:'', submitted_at:'2026-09-27T12:00:00Z',
    });
    expect(html).toContain('Reconhecimento e preparo');
    expect(html).toContain('Conferência de material');
    expect(html).toContain('AR-01');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html.match(/●/g)).toHaveLength(8);
  });
  it('identifica a avaliação e a conferência do remetente no comprovante', () => {
    const html = evaluationPrintHtml(context, {
      id: '127c3d38-e9c5-46e5-93cb-32de922e25cb',
      evaluator_name: 'Cap. Teste', evaluator_unit: '1º GBM',
      ratings: { pontualidade: 'esperado', seguranca: 'esperado', tecnica: 'esperado', equipe: 'esperado', postura: 'esperado', aprendizagem: 'esperado' },
      guidance: '', incident: false, incident_note: '', submitted_at: '2026-09-27T12:00:00Z',
      whatsapp_targets: ['5596988888888'],
      whatsapp_sender_phone: '5596999999999',
      whatsapp_verified_at: '2026-09-27T13:00:00Z',
    });
    expect(html).toContain('Protocolo AV-127C3D38-E9C5-46E5-93CB-32DE922E25CB');
    expect(html).toContain('remetente +5596999999999 conferido');
  });
});
