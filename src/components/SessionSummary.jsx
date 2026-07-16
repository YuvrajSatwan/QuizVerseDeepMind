import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Target } from 'lucide-react'

const SessionSummary = ({ summary, onStartBooster }) => {
  if (!summary) return null

  const masteryEntries = Object.entries(summary.masteryMap || {})
  const maxMastery = masteryEntries.reduce((m, [, v]) => Math.max(m, v || 0), 0) || 1
  const hasScoreStats = [
    summary.totalQuestions,
    summary.correctCount,
    summary.incorrectCount,
    summary.accuracy,
    summary.score
  ].some(value => value !== undefined && value !== null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
            <BarChart3 className="w-3.5 h-3.5" />
            Mastery map
          </p>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Session summary</h2>
        </div>
      </div>

      {hasScoreStats && (
        <div className="grid gap-3 sm:grid-cols-4 mt-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Correct</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary.correctCount ?? 0}</p>
            <p className="text-[11px] text-slate-500">of {summary.totalQuestions ?? '--'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Incorrect</p>
            <p className="mt-2 text-2xl font-semibold text-rose-600">{summary.incorrectCount ?? 0}</p>
            <p className="text-[11px] text-slate-500">of {summary.totalQuestions ?? '--'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Accuracy</p>
            <p className="mt-2 text-2xl font-semibold text-primary-700">{summary.accuracy ?? 0}%</p>
            <p className="text-[11px] text-slate-500">{summary.unanswered ?? 0} unanswered</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Final score</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.score ?? '--'}</p>
            <p className="text-[11px] text-slate-500">Points earned</p>
          </div>
        </div>
      )}

      {/* Mastery bars */}
      {masteryEntries.length > 0 ? (
        <div className="space-y-2">
          {masteryEntries.map(([concept, value]) => {
            const pct = Math.round((value / maxMastery) * 100)
            const color = value >= 0.7 ? 'bg-emerald-500' : value >= 0.4 ? 'bg-amber-400' : 'bg-rose-500'
            return (
              <div key={concept} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{concept}</span>
                  <span className="font-medium">{Math.round((value || 0) * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Not enough data to compute mastery yet.</p>
      )}

      {/* Boosters */}
      {summary.nextBoosters && summary.nextBoosters.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Next boosters</h3>
          <div className="space-y-2">
            {summary.nextBoosters.map((b, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onStartBooster?.(b)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs sm:text-sm hover:border-primary-300 hover:bg-primary-50/70 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-800">{b.topic}</p>
                  <p className="text-[11px] text-gray-500">
                    {b.count || 5} questions • {b.difficulty || 'easy'} • {b.reason}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={() => onStartBooster?.(summary.nextBoosters?.[0])}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 disabled:opacity-60"
      >
        <Target className="w-4 h-4" />
        <span>Start 5-question booster</span>
      </button>
    </motion.div>
  )
}

export default SessionSummary
