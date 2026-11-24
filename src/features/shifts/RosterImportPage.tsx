import { CalendarDays, Download, FileCheck2, Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/button-classes';
import { CARD_CLASS, PageContainer, PageHeader } from '../../components/ui/Page';
import {
  TABLE_CLASS,
  TableContainer,
  TBODY_CLASS,
  TD_CLASS,
  TH_CLASS,
  THEAD_CLASS,
  TR_CLASS,
} from '../../components/ui/Table';
import { ApiError } from '../../lib/api-client';
import { addDays, formatDateTime, formatLocalDate, localDateOf } from '../../lib/format';
import { type RosterImport, useConfirmRoster, useValidateRoster } from './shifts-api';

const ROSTER_HEADER = 'setor_codigo;equipe_codigo;data;turno;hora_inicio;hora_fim';

/** Modelo do CSV (Seção 4.3) com duas linhas fictícias de exemplo, inclusive um turno noturno. */
function rosterTemplate(today = localDateOf()): string {
  const date = formatLocalDate(addDays(today, 1));
  return `${ROSTER_HEADER}\nPA;EQUIPE-A;${date};MANHA;07:00;19:00\nPA;EQUIPE-B;${date};NOITE;19:00;07:00\n`;
}

const COLUMN_LABELS: Record<string, string> = {
  cabecalho: 'Cabeçalho',
  setor_codigo: 'Setor',
  equipe_codigo: 'Equipe',
  data: 'Data',
  turno: 'Turno',
  hora_inicio: 'Início',
  hora_fim: 'Fim',
};

function downloadTemplate() {
  const blob = new Blob([rosterTemplate()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo-escala-fhdod.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * TL07 — Importação de escalas (/admin/escalas/importar; RF22, RF23): envio do CSV, modelo para
 * baixar, resumo, erros por linha e confirmação. A pré-validação não grava turnos; a confirmação
 * grava todos em uma única transação, em até 30 minutos (RN19).
 */
export function RosterImportPage() {
  const fileId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RosterImport | null>(null);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const validate = useValidateRoster();
  const confirm = useConfirmRoster();

  const send = async () => {
    if (file === null) {
      setFailure(new ApiError(400, 'VALIDATION_ERROR', 'Escolha o arquivo CSV da escala.'));
      inputRef.current?.focus();
      return;
    }
    setFailure(null);
    setResult(null);
    try {
      setResult(await validate.mutateAsync(file));
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error
          : new ApiError(0, 'UNEXPECTED', 'Não foi possível enviar o arquivo.'),
      );
    }
  };

  const commit = async () => {
    if (result === null) return;
    setFailure(null);
    try {
      setResult(await confirm.mutateAsync(result.id));
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error
          : new ApiError(0, 'UNEXPECTED', 'Não foi possível confirmar.'),
      );
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Importação de escalas"
        description="CSV em UTF-8, separado por ponto e vírgula, com até 2.000 linhas e 1 MB."
        actions={
          <Link to="/admin/turnos" className={buttonClasses('secondary')}>
            <CalendarDays aria-hidden="true" className="size-5" />
            Ver escala
          </Link>
        }
      />

      <section className={`${CARD_CLASS} space-y-5 p-5 sm:p-6`}>
        <div className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm text-slate-800">
          <p>
            Cabeçalho: <code className="break-all">{ROSTER_HEADER}</code>
          </p>
          <p>
            Data DD/MM/AAAA (de 30 dias antes a 180 dias depois de hoje); turno MANHA, TARDE ou
            NOITE; horas HH:MM. Fim menor ou igual ao início termina no dia seguinte.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={fileId} className="text-sm leading-5 font-semibold text-slate-800">
              Arquivo CSV
            </label>
            <input
              ref={inputRef}
              id={fileId}
              type="file"
              accept=".csv,text/csv"
              className="block min-h-11 w-full max-w-full cursor-pointer rounded-lg border border-dashed border-slate-400 bg-white p-1.5 text-sm text-slate-700 file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-md file:border file:border-neutral-border file:bg-slate-50 file:px-4 file:font-semibold file:text-slate-900 hover:border-slate-600 hover:file:bg-slate-100"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setFailure(null);
              }}
            />
          </div>
          <Button onClick={() => void send()} disabled={validate.isPending}>
            <Upload aria-hidden="true" className="size-5" />
            {validate.isPending ? 'Validando…' : 'Validar arquivo'}
          </Button>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download aria-hidden="true" className="size-5" />
            Baixar modelo
          </Button>
        </div>
      </section>

      {failure === null ? null : (
        <Alert tone="error" title="Não foi possível continuar" requestId={failure.requestId}>
          {failure.message}
        </Alert>
      )}

      {result === null ? null : (
        <section aria-labelledby="resultado-importacao" className="space-y-4">
          <h2 id="resultado-importacao" className="text-lg font-semibold text-slate-900">
            Resultado de {result.fileName}
          </h2>
          <dl className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              ['Linhas', result.totalRows],
              ['Aceitas', result.acceptedRows],
              ['Com erro', result.rejectedRows],
            ].map(([label, value]) => (
              <div key={label} className={`${CARD_CLASS} p-4`}>
                <dt className="text-sm font-semibold text-slate-600">{label}</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          {result.status === 'rejected' ? (
            <>
              <Alert tone="error" title="Arquivo recusado">
                Nenhum turno foi gravado. Corrija as linhas abaixo e envie o arquivo de novo.
              </Alert>
              <TableContainer label="Erros por linha">
                <table className={`${TABLE_CLASS} min-w-[560px]`}>
                  <thead className={THEAD_CLASS}>
                    <tr>
                      <th scope="col" className={TH_CLASS}>
                        Linha
                      </th>
                      <th scope="col" className={TH_CLASS}>
                        Coluna
                      </th>
                      <th scope="col" className={TH_CLASS}>
                        Problema
                      </th>
                      <th scope="col" className={TH_CLASS}>
                        Código
                      </th>
                    </tr>
                  </thead>
                  <tbody className={TBODY_CLASS}>
                    {result.errors.map((error) => (
                      <tr
                        key={`${error.line}-${error.column}-${error.code}-${error.message}`}
                        className={TR_CLASS}
                      >
                        <td className={`${TD_CLASS} font-semibold tabular-nums`}>{error.line}</td>
                        <td className={TD_CLASS}>{COLUMN_LABELS[error.column] ?? error.column}</td>
                        <td className={TD_CLASS}>{error.message}</td>
                        <td className={`${TD_CLASS} font-mono text-xs text-slate-600`}>
                          {error.code}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </>
          ) : (
            <>
              {result.status === 'committed' ? (
                <Alert tone="success" title="Escala importada">
                  {result.acceptedRows} turnos gravados.{' '}
                  <Link to="/admin/turnos" className="font-medium underline">
                    Ver a escala
                  </Link>
                </Alert>
              ) : (
                <Alert tone="info" title="Arquivo válido">
                  Nada foi gravado ainda. Confira o resumo e confirme até{' '}
                  {formatDateTime(result.expiresAt)}.
                </Alert>
              )}
              <ul className={`${CARD_CLASS} divide-y divide-slate-200`}>
                {result.summary.map((item) => (
                  <li
                    key={`${item.sectorCode}-${item.teamCode}`}
                    className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-3 sm:px-5"
                  >
                    <span className="font-semibold text-slate-900">{item.sectorName}</span>
                    <span className="text-slate-700">{item.teamName}</span>
                    <span className="ml-auto font-medium tabular-nums">{item.shifts} turnos</span>
                  </li>
                ))}
              </ul>
              {result.status === 'validated' ? (
                <Button onClick={() => void commit()} disabled={confirm.isPending}>
                  <FileCheck2 aria-hidden="true" className="size-5" />
                  {confirm.isPending ? 'Gravando…' : 'Confirmar importação'}
                </Button>
              ) : null}
            </>
          )}
        </section>
      )}
    </PageContainer>
  );
}
