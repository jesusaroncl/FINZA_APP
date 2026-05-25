import { SupabaseClient } from '@supabase/supabase-js'

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

      while (currentDate <= today) {
        if (expense.last_processed_date && currentDate.getTime() === parseLocalDate(expense.last_processed_date).getTime()) {
           currentDate = getNextDate(currentDate, expense.frequency)
           continue
        }

        generatedDates.push(new Date(currentDate))
        currentDate = getNextDate(currentDate, expense.frequency)
      }

      if (generatedDates.length > 0) {
        const transactionsToInsert = generatedDates.map(date => ({
          user_id: userId,
          amount: expense.amount,
          type: 'expense',
          category_id: expense.category_id,
          description: `${expense.name} [AUTO]`,
          transaction_date: formatDateLocal(date)
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
