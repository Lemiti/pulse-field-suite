import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useActiveCountry } from '../auth/ActiveCountryContext';
import type { ProjectResponse, ProjectStatsResponse, UpdateBudgetRequest } from '@pulse/shared-types';
import { getApiErrorMessage } from '../../lib/errors';
import { Dialog } from '../../components/ui/Dialog';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const expenseSchema = z.object({
  amount: z
    .number()
    .gt(0, 'Amount must be greater than 0'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, 'Reason cannot be empty'),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface BudgetStatusBarProps {
  allocated?: number;
  spent?: number;
  projectId?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function getUtilizationStatus(utilizationPercent: number) {
  if (utilizationPercent > 100) {
    return {
      barColor: 'bg-red-500',
      statusLabel: 'Over Budget',
      statusBadgeColor: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    };
  }
  if (utilizationPercent >= 90) {
    return {
      barColor: 'bg-amber-500',
      statusLabel: 'Critical',
      statusBadgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    };
  }
  if (utilizationPercent >= 86) {
    return {
      barColor: 'bg-amber-500',
      statusLabel: 'At Threshold',
      statusBadgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    };
  }
  return {
    barColor: 'bg-emerald-500',
    statusLabel: 'Healthy',
    statusBadgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  };
}

function BudgetBar({
  allocated,
  spent,
  showExpenseButton,
  onAddExpense,
  isPending,
}: {
  allocated: number;
  spent: number;
  showExpenseButton?: boolean;
  onAddExpense?: () => void;
  isPending?: boolean;
}) {
  const utilizationPercent = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
  const barWidth = Math.min(utilizationPercent, 100);
  const isCritical = utilizationPercent > 90;
  const { barColor, statusLabel, statusBadgeColor } = getUtilizationStatus(utilizationPercent);

  return (
    <div
      className={`flex flex-col gap-2 w-full rounded-lg p-3 transition-shadow ${
        isCritical
          ? 'ring-2 ring-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.35)] dark:shadow-[0_0_24px_rgba(239,68,68,0.25)]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
          {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
          Budget Utilization
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadgeColor}`}>
            {statusLabel}
          </span>
          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
            {utilizationPercent}%
          </span>
        </div>
      </div>

      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%` }}
          role="progressbar"
          aria-valuenow={utilizationPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <div>
          <span className="text-slate-400 font-semibold uppercase block">Allocated</span>
          <span className="text-slate-800 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(allocated)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold uppercase block">Spent</span>
          <span className="text-slate-800 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(spent)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold uppercase block">Remaining</span>
          <span className="text-slate-800 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(Math.max(0, allocated - spent))}
          </span>
        </div>
      </div>

      {showExpenseButton && onAddExpense && (
        <button
          type="button"
          onClick={onAddExpense}
          disabled={isPending}
          className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
        >
          <DollarSign className="w-3.5 h-3.5" />
          {isPending ? 'Recording…' : 'Record Expense'}
        </button>
      )}
    </div>
  );
}

export default function BudgetStatusBar({ allocated, spent, projectId }: BudgetStatusBarProps) {
  const { activeCountryId } = useActiveCountry();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    mode: 'onChange',
    defaultValues: {
      amount: undefined,
      reason: '',
    },
  });

  const { data: stats } = useQuery<ProjectStatsResponse>({
    queryKey: ['project-stats', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/stats`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const { data: project } = useQuery<ProjectResponse>({
    queryKey: ['project', projectId, activeCountryId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const budgetMutation = useMutation({
    mutationFn: async (payload: UpdateBudgetRequest) => {
      const res = await api.patch(`/projects/${projectId}/budget`, payload);
      return res.data as ProjectResponse;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['project', projectId, activeCountryId], updated);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDialogOpen(false);
      reset();
      setBudgetError(null);
    },
    onError: (err: unknown) => {
      setBudgetError(getApiErrorMessage(err, 'Failed to record expense.'));
    },
  });

  if (projectId) {
    const alloc = Number(project?.budget_allocated) || 0;
    const spnt = Number(project?.budget_spent) || 0;
    const pctFromStats = stats?.budget_spent_percent ?? (alloc > 0 ? (spnt / alloc) * 100 : 0);

    if (!project && !stats) {
      return (
        <div className="h-16 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />
      );
    }

    return (
      <>
        <BudgetBar
          allocated={alloc}
          spent={spnt}
          showExpenseButton
          onAddExpense={() => setDialogOpen(true)}
          isPending={budgetMutation.isPending}
        />
        {pctFromStats > 90 && (
          <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-1">
            Budget alert: over 90% utilized ({Math.round(pctFromStats)}% per server stats).
          </p>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              reset();
              setBudgetError(null);
            }
          }}
          title="Record expense"
        >
          <form
            onSubmit={handleSubmit((values) => {
              budgetMutation.mutate({ amount_spent: values.amount, reason: values.reason });
            })}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Amount (USD)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className={`mt-1 w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 ${
                  errors.amount ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {errors.amount?.message && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Reason</label>
              <input
                type="text"
                {...register('reason')}
                placeholder="e.g. Pump repair, transport costs"
                className={`mt-1 w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 ${
                  errors.reason ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {errors.reason?.message && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{errors.reason.message}</p>
              )}
            </div>
            {budgetError && (
              <p className="text-sm text-red-500 font-medium">{budgetError}</p>
            )}
            <button
              type="submit"
              disabled={!isValid || budgetMutation.isPending}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {budgetMutation.isPending ? 'Saving…' : 'Apply to budget'}
            </button>
          </form>
        </Dialog>
      </>
    );
  }

  const safeAllocated = typeof allocated === 'number' && allocated >= 0 ? allocated : 0;
  const safeSpent = typeof spent === 'number' && spent >= 0 ? spent : 0;

  return <BudgetBar allocated={safeAllocated} spent={safeSpent} />;
}
