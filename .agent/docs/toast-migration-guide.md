# Custom Toast/Alert System Migration Guide

## Overview
We've replaced all default HTML `alert()` and `confirm()` dialogs with a custom toast notification system using **Sonner**. This provides:
- ✅ **Beautiful UI** that matches your theme
- ✅ **Dark mode support**
- ✅ **Non-blocking notifications**
- ✅ **Customizable types** (success, error, warning, info)
- ✅ **Promise-based confirmations**

---

## Installation ✅
Already installed: `sonner` package is integrated in the root layout.

---

## Usage

### 1. Import the Toast Utility
```tsx
import { toast, confirm } from '@/lib/toast'
```

### 2. Success Notifications
**Before:**
```tsx
alert("Profile updated successfully!")
```

**After:**
```tsx
toast.success("Profile updated successfully!")
```

### 3. Error Notifications
**Before:**
```tsx
alert("Failed to upload file")
```

**After:**
```tsx
toast.error("Failed to upload file")
```

### 4. Warning Notifications
```tsx
toast.warning("Please fill in all required fields")
```

### 5. Info Notifications
```tsx
toast.info("Your session will expire in 5 minutes")
```

### 6. Generic Messages
```tsx
toast.message("Operation in progress...")
```

### 7. Confirmation Dialogs (Async)
**Before:**
```tsx
if (!confirm("Are you sure you want to delete this?")) {
  return
}
// Delete logic here
```

**After:**
```tsx
const confirmed = await confirm("Are you sure you want to delete this?")
if (!confirmed) {
  return
}
// Delete logic here
```

Or inline:
```tsx
// Old sync confirm
const handleDelete = () => {
  if (!confirm("Delete this item?")) return
  performDelete()
}

// New async confirm
const handleDelete = async () => {
  const confirmed = await confirm("Delete this item?")
  if (!confirmed) return
  performDelete()
}
```

---

## Examples from Codebase

### Example 1: Image Upload Validation
```tsx
// File: app/candidate/profile/page.tsx

// BEFORE
if (!file.type.startsWith("image/")) {
  alert("Please upload an image file")
  return
}

// AFTER
if (!file.type.startsWith("image/")) {
  toast.error("Please upload an image file")
  return
}
```

### Example 2: Success with Auto-reload
```tsx
// BEFORE
alert("Settings saved successfully!")
window.location.reload()

// AFTER
toast.success("Settings saved successfully!")
setTimeout(() => window.location.reload(), 500) // Give time to see toast
```

### Example 3: Async Confirmation
```tsx
// BEFORE (sync)
const handleDelete = (id: string) => {
  if (!confirm("Are you sure?")) return
  deleteItem(id)
}

// AFTER (async)
const handleDelete = async (id: string) => {
  const confirmed = await confirm("Are you sure?")
  if (!confirmed) return
  deleteItem(id)
}
```

---

## Styling & Customization

The toast system automatically:
- Follows your theme (light/dark)
- Uses semantic colors from your design system
- Shows icons for different types
- Includes close buttons
- Auto-dismisses after appropriate timing

### Custom Duration
```tsx
import { toast as sonnerToast } from 'sonner'

sonnerToast.success("Message", { duration: 10000 }) // 10 seconds
```

---

## Migration Checklist

### Files to Update (from grep search):
- [x] `app/candidate/profile/page.tsx` ✅ **DONE**
- [ ] `app/candidate/profile/edit/page.tsx`
- [ ] `app/applications/[id]/page.tsx`
- [ ] `app/admin/settings/page.tsx`
- [ ] `app/admin/jobs/[id]/shortlist/page.tsx`
- [ ] `components/ProfileForm.tsx`
- [ ] `components/SlotCreator.tsx`
- [ ] And ~40+ more files...

### Quick Find & Replace Pattern:
1. Add import: `import { toast, confirm } from '@/lib/toast'`
2. Replace:
   - `alert("message")` → `toast.error("message")` or `toast.success()` based on context
   - `if (!confirm("..."))` → `if (!(await confirm("...")))` 
   - Make sure the function is `async` if using `confirm()`

---

## Benefits

1. **Better UX**: Non-blocking, positioned in corner
2. **Visual Feedback**: Color-coded by type
3. **Accessibility**: Screen reader friendly
4. **Consistency**: Matches your design system
5. **Mobile Friendly**: Responsive positioning

---

## Testing

To test the new system:
1. Visit `/candidate/profile`
2. Try uploading an invalid file → See error toast
3. Upload a valid image → See success toast
4. Check dark mode toggle → Toasts adapt

---

## Troubleshooting

If toasts don't appear:
1. Check that `<Toaster />` is in `app/layout.tsx`
2. Verify import path: `import { toast } from '@/lib/toast'`
3. Check browser console for errors

---

## Next Steps

1. Gradually migrate all files (prioritize user-facing pages)
2. Test each migration
3. Remove all `alert()` and `confirm()` calls
4. Update this guide as needed

---

**Status:** 🚀 System Ready | 📄 Example Migration Complete | 📋 ~50+ Files to Migrate
