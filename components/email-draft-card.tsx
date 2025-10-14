'use client'

import React, { useState } from 'react'
import { Copy, CopyCheck, Mail } from 'lucide-react'
import { motion } from 'framer-motion'

interface EmailDraft {
  subject: string
  body: string
  toName?: string
  toEmail?: string
  companyName?: string
}

interface EmailDraftCardProps {
  draft: EmailDraft
  index?: number
}

export function EmailDraftCard({ draft, index = 0 }: EmailDraftCardProps) {
  const [copiedSubject, setCopiedSubject] = useState(false)
  const [copiedBody, setCopiedBody] = useState(false)

  const handleCopySubject = () => {
    navigator.clipboard.writeText(draft.subject).then(() => {
      setCopiedSubject(true)
      setTimeout(() => setCopiedSubject(false), 2000)
    })
  }

  const handleCopyBody = () => {
    navigator.clipboard.writeText(draft.body).then(() => {
      setCopiedBody(true)
      setTimeout(() => setCopiedBody(false), 2000)
    })
  }

  const handleCopyAll = () => {
    const fullEmail = `Asunto: ${draft.subject}\n\n${draft.body}`
    navigator.clipboard.writeText(fullEmail).then(() => {
      setCopiedBody(true)
      setTimeout(() => setCopiedBody(false), 2000)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4 md:p-6 max-w-3xl"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900">Borrador de Email</h3>
        {draft.companyName && (
          <span className="text-sm text-gray-600 ml-auto">
            Para: {draft.companyName}
          </span>
        )}
      </div>

      {/* Recipient info if available */}
      {(draft.toName || draft.toEmail) && (
        <div className="mb-4 p-3 bg-white/60 rounded-lg border border-indigo-100">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Destinatario:</span>{' '}
            {draft.toName && <span>{draft.toName}</span>}
            {draft.toEmail && (
              <span className="text-indigo-600 ml-2">{draft.toEmail}</span>
            )}
            {!draft.toEmail && (
              <span className="text-amber-600 ml-2 text-xs">
                (Email no disponible - debes encontrarlo antes de enviar)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Subject */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Asunto</label>
          <button
            onClick={handleCopySubject}
            className="p-1.5 text-gray-500 hover:text-indigo-600 transition-colors rounded hover:bg-white/50"
            title="Copiar asunto"
          >
            {copiedSubject ? (
              <CopyCheck className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="p-3 bg-white rounded-lg border border-indigo-100">
          <p className="text-gray-900 font-medium">{draft.subject}</p>
        </div>
      </div>

      {/* Body */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Cuerpo del Email</label>
          <button
            onClick={handleCopyBody}
            className="p-1.5 text-gray-500 hover:text-indigo-600 transition-colors rounded hover:bg-white/50"
            title="Copiar cuerpo"
          >
            {copiedBody ? (
              <CopyCheck className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="p-4 bg-white rounded-lg border border-indigo-100 max-h-96 overflow-y-auto">
          <pre className="text-gray-900 whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {draft.body}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-indigo-200">
        <button
          onClick={handleCopyAll}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copiar Todo
        </button>
        <div className="text-xs text-gray-500 text-center flex-1">
          ⚠️ Revisa y ajusta el email antes de enviar
        </div>
      </div>

      {/* Warning */}
      {!draft.toEmail && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Importante:</strong> Este es solo un borrador. Debes encontrar el email del
            contacto y revisar el contenido antes de enviar.
          </p>
        </div>
      )}
    </motion.div>
  )
}

