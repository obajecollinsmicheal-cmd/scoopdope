import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from '@/components/ui/FormField';
import { FormTextarea } from '@/components/ui/FormTextarea';

describe('Form Validation Accessibility - aria-describedby', () => {
  describe('FormField Component', () => {
    it('should render without errors', () => {
      const { container } = render(
        <FormField label="Email" name="email" type="email" />
      );
      expect(container).toBeInTheDocument();
    });

    it('should have aria-invalid when error is present', () => {
      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          error="Invalid email"
        />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not have aria-invalid when no error', () => {
      render(
        <FormField label="Email" name="email" type="email" />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have aria-describedby pointing to error message when error present', () => {
      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          error="Invalid email"
        />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      const errorId = input.getAttribute('aria-describedby');
      expect(errorId).toBe('email-error');
      expect(screen.getByText('Invalid email')).toHaveAttribute('id', errorId);
    });

    it('should have error message with role="alert"', () => {
      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          error="Invalid email"
        />
      );
      const errorMessage = screen.getByText('Invalid email');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should have aria-describedby pointing to helper text when no error', () => {
      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          helperText="Your email address"
        />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      const helperId = input.getAttribute('aria-describedby');
      expect(helperId).toBe('email-helper');
      expect(screen.getByText('Your email address')).toHaveAttribute('id', helperId);
    });

    it('should not have aria-describedby when no error and no helper text', () => {
      render(
        <FormField label="Email" name="email" type="email" />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      expect(input).not.toHaveAttribute('aria-describedby');
    });

    it('should prioritize error over helper text', () => {
      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          error="Invalid email"
          helperText="Your email address"
        />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      // Helper text should not be visible when error is present
      expect(screen.queryByText('Your email address')).not.toBeInTheDocument();
    });

    it('should show required indicator with aria-label', () => {
      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          required
        />
      );
      const requiredIndicator = screen.getByLabelText('required');
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator.textContent).toBe('*');
    });

    it('should have accessible label', () => {
      render(
        <FormField label="Email" name="email" type="email" />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      expect(input).toBeInTheDocument();
    });

    it('should generate ID from name if not provided', () => {
      render(
        <FormField label="Email" name="email" type="email" />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      expect(input).toHaveAttribute('id', 'email');
    });

    it('should use provided ID over generated one', () => {
      render(
        <FormField
          label="Email"
          name="email"
          id="custom-id"
          type="email"
        />
      );
      const input = screen.getByRole('textbox', { name: /email/i });
      expect(input).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('FormTextarea Component', () => {
    it('should render without errors', () => {
      const { container } = render(
        <FormTextarea label="Message" name="message" />
      );
      expect(container).toBeInTheDocument();
    });

    it('should have aria-invalid when error is present', () => {
      render(
        <FormTextarea
          label="Message"
          name="message"
          error="Message is required"
        />
      );
      const textarea = screen.getByRole('textbox', { name: /message/i });
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not have aria-invalid when no error', () => {
      render(
        <FormTextarea label="Message" name="message" />
      );
      const textarea = screen.getByRole('textbox', { name: /message/i });
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have aria-describedby pointing to error message when error present', () => {
      render(
        <FormTextarea
          label="Message"
          name="message"
          error="Message is required"
        />
      );
      const textarea = screen.getByRole('textbox', { name: /message/i });
      const errorId = textarea.getAttribute('aria-describedby');
      expect(errorId).toBe('message-error');
      expect(screen.getByText('Message is required')).toHaveAttribute('id', errorId);
    });

    it('should have error message with role="alert"', () => {
      render(
        <FormTextarea
          label="Message"
          name="message"
          error="Message is required"
        />
      );
      const errorMessage = screen.getByText('Message is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should display character counter with aria-live', () => {
      const { rerender } = render(
        <FormTextarea
          label="Message"
          name="message"
          characterCount={5}
          characterLimit={100}
        />
      );
      const counter = screen.getByText('5/100');
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });

    it('should include counter in aria-describedby', () => {
      render(
        <FormTextarea
          label="Message"
          name="message"
          helperText="Your message"
          characterCount={5}
          characterLimit={100}
        />
      );
      const textarea = screen.getByRole('textbox', { name: /message/i });
      const describedBy = textarea.getAttribute('aria-describedby');
      expect(describedBy).toContain('message-helper');
      expect(describedBy).toContain('message-counter');
    });

    it('should show warning color when near limit', () => {
      render(
        <FormTextarea
          label="Message"
          name="message"
          characterCount={95}
          characterLimit={100}
        />
      );
      const counter = screen.getByText('95/100');
      expect(counter).toHaveClass('text-yellow-600');
    });

    it('should show error color when at limit', () => {
      render(
        <FormTextarea
          label="Message"
          name="message"
          characterCount={100}
          characterLimit={100}
        />
      );
      const counter = screen.getByText('100/100');
      expect(counter).toHaveClass('text-red-600');
    });

    it('should show required indicator', () => {
      render(
        <FormTextarea
          label="Message"
          name="message"
          required
        />
      );
      const requiredIndicator = screen.getByLabelText('required');
      expect(requiredIndicator).toBeInTheDocument();
    });
  });

  describe('Form Accessibility Integration', () => {
    it('should allow users to understand validation errors via screen reader', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <FormField
          label="Email"
          name="email"
          type="email"
        />
      );

      const input = screen.getByRole('textbox', { name: /email/i });
      
      // Initially no error
      expect(input).not.toHaveAttribute('aria-describedby');

      // Rerender with error
      rerender(
        <FormField
          label="Email"
          name="email"
          type="email"
          error="Invalid email format"
        />
      );

      // Now has error describedby
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      const errorMessage = screen.getByText('Invalid email format');
      expect(errorMessage).toHaveAttribute('id', 'email-error');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should provide context for multiple validation fields', () => {
      render(
        <>
          <FormField
            label="Username"
            name="username"
            error="Username must be at least 3 characters"
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            error="Invalid email format"
          />
        </>
      );

      const usernameInput = screen.getByRole('textbox', { name: /username/i });
      const emailInput = screen.getByRole('textbox', { name: /email/i });

      expect(usernameInput).toHaveAttribute('aria-describedby', 'username-error');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

      expect(screen.getByText('Username must be at least 3 characters')).toHaveAttribute('role', 'alert');
      expect(screen.getByText('Invalid email format')).toHaveAttribute('role', 'alert');
    });

    it('should maintain proper semantic structure with labels', () => {
      render(
        <FormField
          label="Password"
          name="password"
          type="password"
          error="Password is required"
        />
      );

      const input = screen.getByRole('textbox', { name: /password/i });
      const label = screen.getByText('Password');

      expect(label).toBeInTheDocument();
      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.id);
    });
  });

  describe('WCAG Compliance', () => {
    it('should meet WCAG 3.3.1 Error Identification - error associated with input', () => {
      render(
        <FormField
          label="Username"
          name="username"
          error="Username cannot contain special characters"
        />
      );

      const input = screen.getByRole('textbox', { name: /username/i });
      const errorId = input.getAttribute('aria-describedby');
      const errorElement = screen.getByText('Username cannot contain special characters');

      // Error is programmatically associated with input
      expect(input).toHaveAttribute('aria-describedby', errorId);
      expect(errorElement).toHaveAttribute('id', errorId);
    });

    it('should meet WCAG 4.1.2 Name, Role, Value - inputs have accessible names', () => {
      render(
        <FormField
          label="Email Address"
          name="email"
          type="email"
        />
      );

      const input = screen.getByRole('textbox', { name: /email address/i });
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should meet WCAG 4.1.3 Status Messages - error messages are announcements', () => {
      render(
        <FormField
          label="Password"
          name="password"
          type="password"
          error="Password must contain at least one uppercase letter"
        />
      );

      const errorMessage = screen.getByText('Password must contain at least one uppercase letter');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });
});
