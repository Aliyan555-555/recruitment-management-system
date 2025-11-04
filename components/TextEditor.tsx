"use client"

import { useEffect } from "react"
import { RichTextEditor, Link } from "@mantine/tiptap"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import TextAlign from "@tiptap/extension-text-align"
import Superscript from "@tiptap/extension-superscript"
import Subscript from "@tiptap/extension-subscript"
// import Placeholder from "@tiptap/extension-placeholder"

import "@mantine/tiptap/styles.css"
import "@mantine/core/styles.css"

type Props = {
  value?: string
  onChange?: (e: { target: { value: string; name: string } }) => void
  maxlength?: number
  className?: string
  readOnly?: boolean
  placeholder?: string
  minHeight?: string
  name?: string
  isHeadings?: boolean
  isAlignment?: boolean
  isLists?: boolean
  isFormatting?: boolean
  isHighlight?: boolean
  isLinks?: boolean
  isUndoRedo?: boolean
}

export default function TextEditor({
  value = "",
  onChange = () => {},
  maxlength,
  className = "",
  readOnly = false,
  placeholder = "Start typing...",
  minHeight = "300px",
  name = "",
  isHeadings = true,
  isAlignment = true,
  isLists = true,
  isFormatting = true,
  isHighlight = true,
  isLinks = true,
  isUndoRedo = true,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link,
      Superscript,
      Subscript,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      // Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (!maxlength || html.length <= maxlength) {
        onChange({ target: { value: html, name: name || "" } })
      }
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  return (
    <div className={`p-1 bg-white ${className}`}>
      {name && (
        <input type="hidden" name={name} value={editor?.getHTML() || ""} />
      )}
      <RichTextEditor editor={editor}>
        {!readOnly && (
          <RichTextEditor.Toolbar sticky stickyOffset={60}>
            {isFormatting && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Bold />
                <RichTextEditor.Italic />
                <RichTextEditor.Underline />
                <RichTextEditor.Strikethrough />
                <RichTextEditor.ClearFormatting />
                {isHighlight && <RichTextEditor.Highlight />}
                <RichTextEditor.Code />
              </RichTextEditor.ControlsGroup>
            )}

            {isHeadings && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.H1 />
                <RichTextEditor.H2 />
                <RichTextEditor.H3 />
                <RichTextEditor.H4 />
              </RichTextEditor.ControlsGroup>
            )}

            {isLists && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Blockquote />
                <RichTextEditor.Hr />
                <RichTextEditor.BulletList />
                <RichTextEditor.OrderedList />
                <RichTextEditor.Subscript />
                <RichTextEditor.Superscript />
              </RichTextEditor.ControlsGroup>
            )}

            {isLinks && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Link />
                <RichTextEditor.Unlink />
              </RichTextEditor.ControlsGroup>
            )}

            {isAlignment && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.AlignLeft />
                <RichTextEditor.AlignCenter />
                <RichTextEditor.AlignJustify />
                <RichTextEditor.AlignRight />
              </RichTextEditor.ControlsGroup>
            )}

            {isUndoRedo && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Undo />
                <RichTextEditor.Redo />
              </RichTextEditor.ControlsGroup>
            )}
          </RichTextEditor.Toolbar>
        )}

        <RichTextEditor.Content
          className="bg-gray-50 !rounded-lg !p-1 prose prose-sm max-w-none"
          style={{ minHeight }}
        />
      </RichTextEditor>

      {maxlength && (
        <div className="text-sm text-right text-gray-500 mt-1">
          {editor?.getHTML().length ?? 0}/{maxlength}
        </div>
      )}
    </div>
  )
}


