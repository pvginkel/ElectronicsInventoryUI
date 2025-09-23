import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormLabel } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFormState } from '@/hooks/use-form-state'
import { useEffect } from 'react'
import { trackFormOpen, trackFormSubmit, trackFormSuccess, trackFormError, trackFormValidationError, generateFormId } from '@/lib/test/form-instrumentation'

interface TypeFormData extends Record<string, string> {
  name: string
}

interface TypeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string }) => Promise<void>
  initialValues?: {
    name: string
  }
  title: string
  submitText: string
}

export function TypeForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  title,
  submitText
}: TypeFormProps) {
  const formId = generateFormId('TypeForm', initialValues?.name ? 'edit' : 'create');

  const form = useFormState<TypeFormData>({
    initialValues: {
      name: initialValues?.name || ''
    },
    validationRules: {
      name: (value: string) => {
        let error: string | undefined;
        if (!value.trim()) error = 'Name is required'
        else if (value.length > 255) error = 'Name must be 255 characters or less'

        // Emit validation error event if there's an error
        if (error) {
          trackFormValidationError(formId, 'name', error);
        }

        return error;
      }
    },
    onSubmit: async (values) => {
      trackFormSubmit(formId, { name: values.name });

      try {
        await onSubmit({
          name: values.name.trim()
        })

        trackFormSuccess(formId, { name: values.name });

        onOpenChange(false)
        form.reset()
      } catch (error) {
        trackFormError(formId, { name: values.name });
        throw error; // Re-throw to let normal error handling work
      }
    }
  })

  // Track form open when dialog opens
  useEffect(() => {
    if (open) {
      trackFormOpen(formId, { name: form.values.name });
    }
  }, [open, formId, form.values.name]);

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
  }

  const isEditMode = !!initialValues?.name;
  const modalTestId = isEditMode ? "types.edit.modal" : "types.create.modal";
  const ariaLabel = isEditMode ? "Edit Type" : "Create Type";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid={modalTestId} aria-label={ariaLabel}>
        <Form onSubmit={form.handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <FormField>
              <FormLabel htmlFor="name" required>
                Name
              </FormLabel>
              <Input
                id="name"
                data-testid="types.form.name"
                maxLength={255}
                placeholder="Enter type name (e.g., Resistor, Capacitor, IC)"
                {...form.getFieldProps('name')}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              preventValidation
              onClick={handleClose}
              data-testid="types.form.cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.isValid || form.isSubmitting}
              loading={form.isSubmitting}
              data-testid="types.form.submit"
            >
              {submitText}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}