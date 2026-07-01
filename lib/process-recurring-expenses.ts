import { SupabaseClient } from '@supabase/supabase-js'

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLocal(date: Date, includeTime = false): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (!includeTime) return `${y}-${m}-${d}`;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${sec}`;
}

export async function processRecurringExpenses(supabase: SupabaseClient, userId: string) {
  try {
    const { data: expenses, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', userId)

    if (fetchError || !expenses || expenses.length === 0) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let hasNewTransactions = false

    for (const expense of expenses) {
      const baseDateStr = expense.last_processed_date || expense.start_date
      let currentDate = parseLocalDate(baseDateStr)

      const generatedDates: Date[] = []

      if (!expense.last_processed_date && currentDate > today) {
        continue
      }

      // If last_processed_date is set, verify the [AUTO] transaction actually exists.
      // It may have been manually deleted, leaving last_processed_date stale.
      if (expense.last_processed_date) {
        const lastProcessed = parseLocalDate(expense.last_processed_date)
        if (lastProcessed <= today) {
          const dateStr = expense.last_processed_date.split('T')[0]
          const { data: existingTx } = await supabase
            .from('transactions')
            .select('id')
            .eq('user_id', userId)
            .eq('description', `${expense.name} [AUTO]`)
            .gte('transaction_date', dateStr)
            .lte('transaction_date', `${dateStr}T23:59:59`)
            .limit(1)

          if (!existingTx || existingTx.length === 0) {
            generatedDates.push(lastProcessed)
          }
        }
      }

      while (currentDate <= today) {
        if (expense.last_processed_date && currentDate.getTime() === parseLocalDate(expense.last_processed_date).getTime()) {
           currentDate = getNextDate(currentDate, expense.frequency)
           continue
        }

        generatedDates.push(new Date(currentDate))
        currentDate = getNextDate(currentDate, expense.frequency)
      }

      if (generatedDates.length > 0) {
        const todayStr = formatDateLocal(today)
        const transactionsToInsert = generatedDates.map(date => ({
          user_id: userId,
          amount: expense.amount,
          type: 'expense',
          category_id: expense.category_id,
          description: `${expense.name} [AUTO]`,
          transaction_date: formatDateLocal(date) === todayStr
            ? formatDateLocal(date, true)
            : formatDateLocal(date),
          cuotas: 1,
          interes_tipo: 'Sin Intereses',
          interes_tasa: 0,
          monto_por_cuota: null,
        }))

        const { error: insertError } = await supabase
          .from('transactions')
          .insert(transactionsToInsert)

        if (!insertError) {
          const lastDate = generatedDates[generatedDates.length - 1]
          await supabase
            .from('recurring_expenses')
            .update({ last_processed_date: formatDateLocal(lastDate) })
            .eq('id', expense.id)
            
          hasNewTransactions = true
        } else {
          console.error('Error inserting recurring transactions:', insertError)
        }
      }
    }

    return hasNewTransactions

  } catch (error) {
    console.error('Error in processRecurringExpenses:', error)
    return false
  }
}

function getNextDate(date: Date, frequency: string): Date {
  const next = new Date(date)
  if (frequency === 'semanal') {
    next.setDate(next.getDate() + 7)
  } else if (frequency === 'mensual') {
    next.setMonth(next.getMonth() + 1)
  } else if (frequency === 'anual') {
    next.setFullYear(next.getFullYear() + 1)
  }
  return next
}
