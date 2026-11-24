import { Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SelectField } from '../../components/ui/Field';
import { CARD_CLASS, PageContainer, PageHeader } from '../../components/ui/Page';
import { EmptyState, ErrorState, Loading } from '../../components/ui/States';
import {
  STACK_TABLE_CLASS,
  TABLE_CLASS,
  TableContainer,
  TBODY_CLASS,
  TD_ACTIONS_CLASS,
  TD_CLASS,
  TH_CLASS,
  THEAD_CLASS,
  TR_CLASS,
} from '../../components/ui/Table';
import { Tag } from '../../components/ui/Tag';
import { failureOf } from '../../lib/errors';
import { useMe } from '../auth/auth-context';
import { can } from '../auth/auth-types';
import { SectorFormDialog, TeamFormDialog } from './SectorDialogs';
import {
  type AdminSector,
  type Team,
  useCreateSector,
  useCreateTeam,
  useSectors,
  useTeams,
  useUpdateSector,
  useUpdateTeam,
} from './sectors-api';

type Pending =
  | { kind: 'sector'; sector?: AdminSector }
  | { kind: 'toggle-sector'; sector: AdminSector }
  | { kind: 'team'; team?: Team }
  | { kind: 'toggle-team'; team: Team }
  | null;

function StatusBadge({ active }: { active: boolean }) {
  return <Tag tone={active ? 'success' : 'neutral'}>{active ? 'Ativo' : 'Desativado'}</Tag>;
}

/**
 * TL05 — Cadastro de setores e equipes (/admin/setores; RF12–RF18). O SA cadastra e altera
 * setores; SA e AS cadastram e alteram equipes dos setores do próprio escopo. Desativações são
 * lógicas e o histórico permanece (RN11).
 */
export function SectorsPage() {
  const me = useMe();
  const canManageSectors = can(me, 'sectors:create');
  const sectors = useSectors();
  const [selectedId, setSelectedId] = useState<string>('');
  const sectorList = sectors.data ?? [];
  const selected = sectorList.find((sector) => sector.id === selectedId) ?? sectorList[0];
  const teams = useTeams(selected?.id);
  const [pending, setPending] = useState<Pending>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const createSector = useCreateSector();
  const updateSector = useUpdateSector();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const close = () => {
    setPending(null);
    setActionError(null);
  };

  const toggleSector = async (sector: AdminSector) => {
    try {
      await updateSector.mutateAsync({ id: sector.id, input: { isActive: !sector.isActive } });
      setSuccess(`Setor ${sector.name} ${sector.isActive ? 'desativado' : 'reativado'}.`);
      close();
    } catch (error) {
      setActionError(failureOf(error, 'Não foi possível concluir a ação.').text);
    }
  };

  const toggleTeam = async (team: Team) => {
    try {
      await updateTeam.mutateAsync({ id: team.id, input: { isActive: !team.isActive } });
      setSuccess(`Equipe ${team.name} ${team.isActive ? 'desativada' : 'reativada'}.`);
      close();
    } catch (error) {
      setActionError(failureOf(error, 'Não foi possível concluir a ação.').text);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Setores e equipes"
        description="Estrutura usada nas pesquisas, nas escalas e na atribuição das avaliações."
        actions={
          canManageSectors ? (
            <Button
              onClick={() => {
                setSuccess(null);
                setPending({ kind: 'sector' });
              }}
            >
              <Plus aria-hidden="true" className="size-5" />
              Novo setor
            </Button>
          ) : undefined
        }
      />

      {success === null ? null : <Alert tone="success">{success}</Alert>}

      <section aria-labelledby="lista-setores" className="space-y-3">
        <h2 id="lista-setores" className="text-lg font-semibold text-slate-900">
          Setores
        </h2>
        {sectors.isPending ? (
          <Loading label="Carregando setores…" />
        ) : sectors.isError ? (
          <ErrorState error={sectors.error} onRetry={() => void sectors.refetch()} />
        ) : sectorList.length === 0 ? (
          <EmptyState title="Nenhum setor no seu escopo">
            {canManageSectors ? <p>Cadastre o primeiro setor.</p> : null}
          </EmptyState>
        ) : (
          <TableContainer label="Tabela de setores">
            <table className={`${TABLE_CLASS} ${STACK_TABLE_CLASS} min-w-[860px]`}>
              <thead className={THEAD_CLASS}>
                <tr>
                  <th scope="col" className={TH_CLASS}>
                    Código
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Nome
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Equipes ativas
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Pesquisas ativas
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Situação
                  </th>
                  <th scope="col" className={`${TH_CLASS} text-right`}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className={TBODY_CLASS}>
                {sectorList.map((sector) => (
                  <tr
                    key={sector.id}
                    className={`${TR_CLASS} ${sector.id === selected?.id ? 'bg-brand-50 hover:bg-brand-50' : ''}`}
                  >
                    <td className={`${TD_CLASS} font-mono font-semibold`} data-label="Código">
                      {sector.code}
                    </td>
                    <td className={TD_CLASS} data-label="Nome">
                      <span className="block font-semibold text-slate-900">{sector.name}</span>
                      {sector.description === null ? null : (
                        <span className="text-slate-600">{sector.description}</span>
                      )}
                    </td>
                    <td className={`${TD_CLASS} tabular-nums`} data-label="Equipes ativas">
                      {sector.activeTeams}
                    </td>
                    <td className={`${TD_CLASS} tabular-nums`} data-label="Pesquisas ativas">
                      {sector.activeSurveys}
                    </td>
                    <td className={TD_CLASS} data-label="Situação">
                      <StatusBadge active={sector.isActive} />
                    </td>
                    <td className={TD_ACTIONS_CLASS} data-actions="">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        <Button
                          variant={sector.id === selected?.id ? 'secondary' : 'ghost'}
                          className="px-3"
                          aria-pressed={sector.id === selected?.id}
                          onClick={() => {
                            setSelectedId(sector.id);
                          }}
                        >
                          Ver equipes
                        </Button>
                        {canManageSectors ? (
                          <>
                            <Button
                              variant="ghost"
                              className="px-3"
                              aria-label={`Editar ${sector.name}`}
                              onClick={() => {
                                setSuccess(null);
                                setPending({ kind: 'sector', sector });
                              }}
                            >
                              <Pencil aria-hidden="true" className="size-4" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              className={`px-3 ${sector.isActive ? 'text-danger-700 hover:bg-red-50 hover:text-danger-800' : ''}`}
                              aria-label={`${sector.isActive ? 'Desativar' : 'Reativar'} ${sector.name}`}
                              onClick={() => {
                                setSuccess(null);
                                setPending({ kind: 'toggle-sector', sector });
                              }}
                            >
                              {sector.isActive ? (
                                <PowerOff aria-hidden="true" className="size-4" />
                              ) : (
                                <Power aria-hidden="true" className="size-4" />
                              )}
                              {sector.isActive ? 'Desativar' : 'Reativar'}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </section>

      {selected === undefined ? null : (
        <section aria-labelledby="lista-equipes" className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-sm">
              <SelectField
                label="Equipes do setor"
                value={selected.id}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                }}
              >
                {sectorList.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                    {sector.isActive ? '' : ' (desativado)'}
                  </option>
                ))}
              </SelectField>
            </div>
            <h2 id="lista-equipes" className="sr-only">
              Equipes de {selected.name}
            </h2>
            {can(me, 'teams:create') ? (
              <Button
                disabled={!selected.isActive}
                title={selected.isActive ? undefined : 'Reative o setor para cadastrar equipes.'}
                onClick={() => {
                  setSuccess(null);
                  setPending({ kind: 'team' });
                }}
              >
                <Plus aria-hidden="true" className="size-5" />
                Nova equipe
              </Button>
            ) : null}
          </div>
          {teams.isPending ? (
            <Loading label="Carregando equipes…" />
          ) : teams.isError ? (
            <ErrorState error={teams.error} onRetry={() => void teams.refetch()} />
          ) : teams.data.length === 0 ? (
            <EmptyState title="Nenhuma equipe neste setor">
              <p>Cadastre as equipes para montar a escala.</p>
            </EmptyState>
          ) : (
            <ul className={`${CARD_CLASS} divide-y divide-slate-200`}>
              {teams.data.map((team) => (
                <li
                  key={team.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors hover:bg-slate-50 sm:px-5"
                >
                  <span className="font-mono text-sm font-semibold text-slate-600">
                    {team.code}
                  </span>
                  <span className="font-semibold text-slate-900">{team.name}</span>
                  <StatusBadge active={team.isActive} />
                  {can(me, 'teams:update') ? (
                    <div className="ml-auto flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        className="px-3"
                        aria-label={`Editar ${team.name}`}
                        onClick={() => {
                          setSuccess(null);
                          setPending({ kind: 'team', team });
                        }}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        className={`px-3 ${team.isActive ? 'text-danger-700 hover:bg-red-50 hover:text-danger-800' : ''}`}
                        aria-label={`${team.isActive ? 'Desativar' : 'Reativar'} ${team.name}`}
                        onClick={() => {
                          setSuccess(null);
                          setPending({ kind: 'toggle-team', team });
                        }}
                      >
                        {team.isActive ? (
                          <PowerOff aria-hidden="true" className="size-4" />
                        ) : (
                          <Power aria-hidden="true" className="size-4" />
                        )}
                        {team.isActive ? 'Desativar' : 'Reativar'}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {pending?.kind === 'sector' ? (
        <SectorFormDialog
          sector={pending.sector}
          onClose={close}
          onSubmit={async (values) => {
            if (pending.sector === undefined) {
              const created = await createSector.mutateAsync(values);
              setSelectedId(created.id);
              setSuccess(`Setor ${created.name} cadastrado.`);
            } else {
              await updateSector.mutateAsync({
                id: pending.sector.id,
                input: { name: values.name, description: values.description },
              });
              setSuccess(`Setor ${values.name} atualizado.`);
            }
            close();
          }}
        />
      ) : null}

      {pending?.kind === 'team' && selected !== undefined ? (
        <TeamFormDialog
          sectorName={selected.name}
          team={pending.team}
          onClose={close}
          onSubmit={async (values) => {
            if (pending.team === undefined) {
              await createTeam.mutateAsync({ sectorId: selected.id, ...values });
              setSuccess(`Equipe ${values.name} cadastrada.`);
            } else {
              await updateTeam.mutateAsync({ id: pending.team.id, input: { name: values.name } });
              setSuccess(`Equipe ${values.name} atualizada.`);
            }
            close();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={pending?.kind === 'toggle-sector'}
        title={
          pending?.kind === 'toggle-sector' && pending.sector.isActive
            ? 'Desativar setor'
            : 'Reativar setor'
        }
        confirmLabel={
          pending?.kind === 'toggle-sector' && pending.sector.isActive ? 'Desativar' : 'Reativar'
        }
        danger={pending?.kind === 'toggle-sector' && pending.sector.isActive}
        busy={updateSector.isPending}
        error={actionError}
        onClose={close}
        onConfirm={() => {
          if (pending?.kind === 'toggle-sector') void toggleSector(pending.sector);
        }}
      >
        {pending?.kind === 'toggle-sector'
          ? pending.sector.isActive
            ? `As pesquisas de ${pending.sector.name} deixam de receber respostas e não será possível cadastrar turnos ou importar escalas. O histórico é mantido.`
            : `${pending.sector.name} volta a receber respostas, turnos e importações.`
          : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={pending?.kind === 'toggle-team'}
        title={
          pending?.kind === 'toggle-team' && pending.team.isActive
            ? 'Desativar equipe'
            : 'Reativar equipe'
        }
        confirmLabel={
          pending?.kind === 'toggle-team' && pending.team.isActive ? 'Desativar' : 'Reativar'
        }
        danger={pending?.kind === 'toggle-team' && pending.team.isActive}
        busy={updateTeam.isPending}
        error={actionError}
        onClose={close}
        onConfirm={() => {
          if (pending?.kind === 'toggle-team') void toggleTeam(pending.team);
        }}
      >
        {pending?.kind === 'toggle-team'
          ? pending.team.isActive
            ? `${pending.team.name} não receberá novos turnos nem novas atribuições. As atribuições anteriores são mantidas.`
            : `${pending.team.name} volta a receber turnos e atribuições.`
          : null}
      </ConfirmDialog>
    </PageContainer>
  );
}
