"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { Extension } from "@tiptap/core"
import { generateDefaultOfferTemplate } from "@/lib/offer-template-generator"

// Custom Line Height Extension
const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const lineHeight = element.style.lineHeight || element.getAttribute('data-line-height')
              if (lineHeight && lineHeight !== 'null' && lineHeight !== '') {
                return lineHeight
              }
              return null
            },
            renderHTML: (attributes: any) => {
              if (!attributes.lineHeight || attributes.lineHeight === 'null') {
                return {}
              }
              return {
                style: `line-height: ${attributes.lineHeight} !important`,
                'data-line-height': attributes.lineHeight,
              }
            },
          },
        },
      },
    ]
  },
})

// Custom Font Size Extension
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const fontSize = element.style.fontSize || element.getAttribute('data-font-size')
              if (fontSize && fontSize !== 'null' && fontSize !== '') {
                return fontSize
              }
              return null
            },
            renderHTML: (attributes: any) => {
              if (!attributes.fontSize || attributes.fontSize === 'null') {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize} !important`,
                'data-font-size': attributes.fontSize,
              }
            },
          },
        },
      },
    ]
  },
})

// Custom Font Style (Font Family) Extension
const FontStyle = Extension.create({
  name: 'fontStyle',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const fontFamily = element.style.fontFamily || element.getAttribute('data-font-family')
              if (fontFamily && fontFamily !== 'null' && fontFamily !== '') {
                return fontFamily
              }
              return null
            },
            renderHTML: (attributes: any) => {
              if (!attributes.fontFamily || attributes.fontFamily === 'null') {
                return {}
              }
              return {
                style: `font-family: ${attributes.fontFamily} !important`,
                'data-font-family': attributes.fontFamily,
              }
            },
          },
        },
      },
    ]
  },
})

interface OfferResponse {
  offerLetter: {
    id: string
    status: string
    content: string // HTML content
    generatedAt?: string
    sentAt?: string
    acceptedAt?: string
    rejectedAt?: string
  } | null
  loi: {
    id: string
    status: string
  } | null
  candidate: {
    id: string
    name: string
    email: string
  }
  job: {
    id: string
    title: string
    company: string
  }
}

export default function OfferLetterPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const roundId = params.roundId as string
  const candidateId = params.candidateId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [offerData, setOfferData] = useState<OfferResponse | null>(null)
  const [contentLoaded, setContentLoaded] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      LineHeight,
      FontSize,
      FontStyle,
    ],
    content: '<p>Loading...</p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none',
        style: 'min-height: 600px; padding: 2rem;',
      },
    },
  })

  useEffect(() => {
    fetchOfferData()
  }, [])

  useEffect(() => {
    if (editor && offerData && !contentLoaded) {
      if (offerData.offerLetter?.content) {
        // Load existing content
        editor.commands.setContent(offerData.offerLetter.content)
      } else {
        // Generate default template with job and candidate info
        const defaultContent = generateDefaultOfferTemplate(
          offerData.candidate?.name || "",
          offerData.job?.title || "",
          offerData.job?.company || ""
        )
        editor.commands.setContent(defaultContent)
      }
      setContentLoaded(true)
    }
  }, [editor, offerData, contentLoaded])

  const fetchOfferData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidateId}/offer`)
      if (res.ok) {
        const data = await res.json()
        setOfferData(data)
      } else {
        const error = await res.json()
        if (error.error) {
          alert(error.error)
          router.push(`/admin/jobs/${jobId}/rounds/${roundId}/shortlisted`)
        }
      }
    } catch (error) {
      console.error("Error fetching Offer Letter data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editor) return

    try {
      setSaving(true)
      const content = editor.getHTML()

      const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidateId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      })

      if (res.ok) {
        alert("Offer Letter saved successfully!")
        await fetchOfferData()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving Offer Letter:", error)
      alert("Error saving Offer Letter")
    } finally {
      setSaving(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!editor) return

    try {
      setGenerating(true)
      // First save the content
      await handleSave()

      // Then generate PDF
      const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidateId}/offer/generate-pdf`)

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const candidateName = offerData?.candidate?.name || "Candidate"
        a.download = `OfferLetter_${candidateName.replace(/\s+/g, '_')}_${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        await fetchOfferData()
      } else {
        const error = await res.json()
        alert(`Error generating PDF: ${error.error}`)
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error generating PDF")
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkAsSent = async () => {
    if (!confirm("Mark this Offer Letter as sent?")) return

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidateId}/offer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" })
      })

      if (res.ok) {
        alert("Offer Letter marked as sent!")
        await fetchOfferData()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Error updating status")
    }
  }

  const handleResetToDefault = () => {
    if (!editor || !offerData) return
    if (!confirm("Reset to default template? This will replace your current content.")) return

    const defaultContent = generateDefaultOfferTemplate(
      offerData.candidate?.name || "",
      offerData.job?.title || "",
      offerData.job?.company || ""
    )
    editor.commands.setContent(defaultContent)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Offer Letter editor...</p>
        </div>
      </div>
    )
  }

  if (offerData && (!offerData.loi || offerData.loi.status !== "ACCEPTED")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">LOI Must Be Accepted</h2>
          <p className="text-gray-600 mb-6">
            {!offerData.loi
              ? "Please create and accept a Letter of Intent before generating an Offer Letter."
              : `The Letter of Intent must be accepted before generating an Offer Letter. Current status: ${offerData.loi.status}`
            }
          </p>
          <Link
            href={`/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidateId}/loi`}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Go to LOI
          </Link>
        </div>
      </div>
    )
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFTED: "bg-gray-100 text-gray-800",
      SENT: "bg-blue-100 text-blue-800",
      ACCEPTED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      EXPIRED: "bg-yellow-100 text-yellow-800"
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  if (!editor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href={`/admin/jobs/${jobId}/rounds/${roundId}/shortlisted`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Shortlisted
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Offer Letter</h1>
              <p className="text-muted-foreground">
                {offerData?.candidate?.name || "Loading..."} - {offerData?.job?.title || "Loading..."}
              </p>
            </div>
            {offerData?.offerLetter && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(offerData.offerLetter.status)}`}>
                {offerData.offerLetter.status}
              </span>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-card rounded-lg shadow-sm border border-border mb-4 p-4 text-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${editor.isActive('bold') ? 'bg-primary/20 text-primary' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${editor.isActive('italic') ? 'bg-primary/20 text-primary' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${editor.isActive('underline') ? 'bg-primary/20 text-primary' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              <u>U</u>
            </button>
            <div className="w-px h-6 bg-border mx-1"></div>
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-primary/20 text-primary' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              ⬅
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-primary/20 text-primary' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              ⬌
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-primary/20 text-primary' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              ➡
            </button>
            <div className="w-px h-6 bg-border mx-1"></div>
            <select
              onChange={(e) => {
                const value = e.target.value
                if (value === 'paragraph') {
                  editor.chain().focus().setParagraph().run()
                } else {
                  editor.chain().focus().toggleHeading({ level: parseInt(value) as 1 | 2 | 3 }).run()
                }
              }}
              className="px-3 py-2 rounded text-sm border border-input bg-background/50 text-foreground"
            >
              <option value="paragraph">Paragraph</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
            </select>
            <div className="w-px h-6 bg-border mx-1"></div>
            <select
              onChange={(e) => {
                const value = e.target.value
                const { state } = editor
                const { selection } = state
                const { $from } = selection

                // Get the current node type
                let nodeType = $from.parent.type.name

                // If we're in a heading, get the heading level
                if (nodeType.startsWith('heading')) {
                  // Apply to the current heading
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes(nodeType, { lineHeight: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes(nodeType, { lineHeight: value }).run()
                  }
                } else if (nodeType === 'paragraph') {
                  // Apply to paragraph
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes('paragraph', { lineHeight: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes('paragraph', { lineHeight: value }).run()
                  }
                } else {
                  // Try to apply to paragraph as fallback
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes('paragraph', { lineHeight: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes('paragraph', { lineHeight: value }).run()
                  }
                }
              }}
              className="px-3 py-2 rounded text-sm border border-input bg-background/50 text-foreground"
              title="Line Height"
            >
              <option value="default">Line Height</option>
              <option value="1">1.0</option>
              <option value="1.15">1.15</option>
              <option value="1.25">1.25</option>
              <option value="1.5">1.5</option>
              <option value="1.6">1.6</option>
              <option value="1.75">1.75</option>
              <option value="2">2.0</option>
              <option value="2.5">2.5</option>
              <option value="3">3.0</option>
            </select>
            <div className="w-px h-6 bg-border mx-1"></div>
            <select
              onChange={(e) => {
                const value = e.target.value
                const { state } = editor
                const { selection } = state
                const { $from } = selection

                // Get the current node type
                let nodeType = $from.parent.type.name

                // If we're in a heading, get the heading level
                if (nodeType.startsWith('heading')) {
                  // Apply to the current heading
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes(nodeType, { fontSize: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes(nodeType, { fontSize: value }).run()
                  }
                } else if (nodeType === 'paragraph') {
                  // Apply to paragraph
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes('paragraph', { fontSize: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes('paragraph', { fontSize: value }).run()
                  }
                } else {
                  // Try to apply to paragraph as fallback
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes('paragraph', { fontSize: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes('paragraph', { fontSize: value }).run()
                  }
                }
              }}
              className="px-3 py-2 rounded text-sm border border-input bg-background/50 text-foreground"
              title="Font Size"
            >
              <option value="default">Font Size</option>
              <option value="8pt">8pt</option>
              <option value="9pt">9pt</option>
              <option value="10pt">10pt</option>
              <option value="11pt">11pt</option>
              <option value="12pt">12pt</option>
              <option value="14pt">14pt</option>
              <option value="16pt">16pt</option>
              <option value="18pt">18pt</option>
              <option value="20pt">20pt</option>
              <option value="24pt">24pt</option>
              <option value="28pt">28pt</option>
              <option value="32pt">32pt</option>
              <option value="36pt">36pt</option>
            </select>
            <div className="w-px h-6 bg-border mx-1"></div>
            <select
              onChange={(e) => {
                const value = e.target.value
                const { state } = editor
                const { selection } = state
                const { $from } = selection

                // Get the current node type
                let nodeType = $from.parent.type.name

                // If we're in a heading, get the heading level
                if (nodeType.startsWith('heading')) {
                  // Apply to the current heading
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes(nodeType, { fontFamily: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes(nodeType, { fontFamily: value }).run()
                  }
                } else if (nodeType === 'paragraph') {
                  // Apply to paragraph
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes('paragraph', { fontFamily: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes('paragraph', { fontFamily: value }).run()
                  }
                } else {
                  // Try to apply to paragraph as fallback
                  if (value === 'default') {
                    editor.chain().focus().updateAttributes('paragraph', { fontFamily: null }).run()
                  } else {
                    editor.chain().focus().updateAttributes('paragraph', { fontFamily: value }).run()
                  }
                }
              }}
              className="px-3 py-2 rounded text-sm border border-input bg-background/50 text-foreground"
              title="Font Style"
              style={{ minWidth: '140px' }}
            >
              <option value="default">Font Style</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Calibri', sans-serif">Calibri</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Verdana, sans-serif">Verdana</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="'Lucida Sans Unicode', sans-serif">Lucida Sans Unicode</option>
              <option value="'Palatino Linotype', serif">Palatino Linotype</option>
            </select>
            <div className="w-px h-6 bg-border mx-1"></div>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              •
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              1.
            </button>
            <div className="flex-1"></div>
            <button
              onClick={handleResetToDefault}
              className="px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-input rounded hover:bg-accent hover:text-accent-foreground"
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Editor - Word-like Document Editor */}
        <div className="bg-card rounded-lg shadow-lg border border-border min-h-[800px] overflow-hidden flex flex-col">
          <div className="border-b border-border bg-muted/40 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">📝 Document Editor - Edit your Offer Letter like Microsoft Word</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Word Count: {editor.getText().split(/\s+/).filter(word => word.length > 0).length}</span>
              </div>
            </div>
          </div>
          <div className="editor-wrapper flex-1 bg-muted/20 relative" style={{ minHeight: '750px' }}>
            <div className="absolute inset-0 overflow-auto py-8">
              {/* This wrapper mimics the paper sheet */}
              <div className="mx-auto bg-white text-black max-w-[210mm] min-h-[297mm] shadow-md">
                {editor && <EditorContent editor={editor} />}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4 justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-accent disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate PDF"}
          </button>
          {offerData?.offerLetter && offerData.offerLetter.status !== "SENT" && (
            <button
              onClick={handleMarkAsSent}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              Mark as Sent
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .editor-wrapper {
          position: relative;
          padding: 40px 0;
          overflow: auto;
          display: flex;
          justify-content: center;
        }
        .ProseMirror {
          outline: none !important;
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          font-family: 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #000000 !important; /* Always black text */
          background: #ffffff !important; /* Always white paper */
          box-shadow: none; /* Shadow handled by container */
          border: 1px solid #d1d5db;
        }
        .ProseMirror p[style*="line-height"],
        .ProseMirror h1[style*="line-height"],
        .ProseMirror h2[style*="line-height"],
        .ProseMirror h3[style*="line-height"] {
          line-height: inherit !important;
        }
        .ProseMirror:focus {
          outline: none !important;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
        }
        .ProseMirror p {
          margin-bottom: 1rem;
          text-align: justify;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 {
          font-size: 16pt;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          text-transform: uppercase;
          text-align: center;
        }
        .ProseMirror h2 {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          text-transform: uppercase;
        }
        .ProseMirror h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror ul, .ProseMirror ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          margin-bottom: 0.5rem;
        }
        
        /* Print Styles */
        @media print {
          .no-print {
            display: none !important;
          }
          .editor-wrapper {
            background: white;
            padding: 0;
            display: block;
          }
          .ProseMirror {
            box-shadow: none;
            border: none;
            width: 100%;
            height: auto;
            padding: 0;
            overflow: visible;
          }
        }

        .ProseMirror strong {
          font-weight: bold;
        }
        .ProseMirror em {
          font-style: italic;
        }
        .ProseMirror u {
          text-decoration: underline;
        }
        .ProseMirror[contenteditable="true"] {
          cursor: text;
        }
        .ProseMirror * {
          word-wrap: break-word;
        }
      `}</style>
    </div>
  )
}
