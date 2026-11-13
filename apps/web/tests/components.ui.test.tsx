import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Badge } from "../src/components/ui/Badge";
import { Select } from "../src/components/ui/Select";
import { Textarea } from "../src/components/ui/Textarea";
import { Modal } from "../src/components/ui/Modal";
import { StatusBadge } from "../src/features/tickets/components/StatusBadge";
import { PriorityBadge } from "../src/features/tickets/components/PriorityBadge";
import type { TicketStatus, TicketPriority } from "../src/features/tickets/types";

describe("Reusable UI Components (Stage 3)", () => {
  // 1. Badge variants
  describe("Badge Component", () => {
    it("renders all badge variants with corresponding visual styling", () => {
      const { rerender } = render(<Badge variant="neutral">Neutral</Badge>);
      expect(screen.getByText("Neutral")).toHaveClass("bg-gray-100", "text-gray-700");

      rerender(<Badge variant="success">Success</Badge>);
      expect(screen.getByText("Success")).toHaveClass("bg-emerald-50", "text-emerald-700");

      rerender(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByText("Warning")).toHaveClass("bg-amber-50", "text-amber-800");

      rerender(<Badge variant="danger">Danger</Badge>);
      expect(screen.getByText("Danger")).toHaveClass("bg-red-50", "text-red-700");

      rerender(<Badge variant="brand">Brand</Badge>);
      expect(screen.getByText("Brand")).toHaveClass("bg-brand-50", "text-brand-700");
    });
  });

  // 2. All five ticket statuses
  describe("StatusBadge Component", () => {
    const statuses: { status: TicketStatus; label: string }[] = [
      { status: "OPEN", label: "Open" },
      { status: "IN_PROGRESS", label: "In Progress" },
      { status: "WAITING_ON_CUSTOMER", label: "Waiting on Customer" },
      { status: "RESOLVED", label: "Resolved" },
      { status: "CLOSED", label: "Closed" },
    ];

    statuses.forEach(({ status, label }) => {
      it(`renders correctly for status ${status}`, () => {
        render(<StatusBadge status={status} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(
          screen.getByTestId(`status-badge-${status.toLowerCase()}`)
        ).toBeInTheDocument();
      });
    });
  });

  // 3. All four priority values
  describe("PriorityBadge Component", () => {
    const priorities: { priority: TicketPriority; label: string }[] = [
      { priority: "P1", label: "P1 — Critical" },
      { priority: "P2", label: "P2 — High" },
      { priority: "P3", label: "P3 — Medium" },
      { priority: "P4", label: "P4 — Low" },
    ];

    priorities.forEach(({ priority, label }) => {
      it(`renders correctly for priority ${priority}`, () => {
        render(<PriorityBadge priority={priority} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(
          screen.getByTestId(`priority-badge-${priority.toLowerCase()}`)
        ).toBeInTheDocument();
      });
    });
  });

  // 4. Select label and error rendering
  describe("Select Component", () => {
    it("renders label, options, and error with accessible attributes", () => {
      const options = [
        { value: "opt1", label: "Option 1" },
        { value: "opt2", label: "Option 2" },
      ];

      render(
        <Select
          label="Ticket Priority"
          options={options}
          error="Priority selection is required"
        />
      );

      expect(screen.getByLabelText("Ticket Priority")).toBeInTheDocument();
      expect(screen.getByText("Priority selection is required")).toBeInTheDocument();
      const selectEl = screen.getByRole("combobox");
      expect(selectEl).toHaveAttribute("aria-invalid", "true");
    });

    // 5. Select disabled behavior
    it("respects disabled state properly", () => {
      render(
        <Select
          label="Assignee"
          options={[{ value: "1", label: "Agent 1" }]}
          disabled
        />
      );

      const selectEl = screen.getByRole("combobox");
      expect(selectEl).toBeDisabled();
      expect(selectEl).toHaveClass("disabled:cursor-not-allowed");
    });
  });

  // 6. Textarea label and error rendering
  describe("Textarea Component", () => {
    it("renders label, placeholder, and error message with aria-invalid", () => {
      render(
        <Textarea
          label="Description"
          placeholder="Enter detailed issue..."
          error="Description must be at least 5 characters"
        />
      );

      expect(screen.getByLabelText("Description")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter detailed issue...")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Description must be at least 5 characters")
      ).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    // 7. Character count
    it("updates character counter dynamically when typing with maxLength", () => {
      render(
        <Textarea
          label="Message"
          maxLength={100}
          showCount
          defaultValue="Hello"
        />
      );

      const counter = screen.getByTestId("textarea-char-count");
      expect(counter).toHaveTextContent("5/100");

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Hello World!" } });
      expect(counter).toHaveTextContent("12/100");
    });
  });

  // 8. Modal open/close behavior
  describe("Modal Component", () => {
    it("renders when isOpen is true and unmounts when isOpen is false", () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal isOpen={true} onClose={handleClose} title="Create New Ticket">
          <p>Modal body content</p>
        </Modal>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Create New Ticket")).toBeInTheDocument();
      expect(screen.getByText("Modal body content")).toBeInTheDocument();

      // Click close button
      const closeBtn = screen.getByLabelText("Close dialog");
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Click backdrop
      const backdrop = screen.getByTestId("modal-backdrop");
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(2);

      // Rerender with isOpen=false
      rerender(
        <Modal isOpen={false} onClose={handleClose} title="Create New Ticket">
          <p>Modal body content</p>
        </Modal>
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 9. Escape-key handling
    it("calls onClose when Escape key is pressed", () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Escape Test">
          <div>Content</div>
        </Modal>
      );

      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    // 10. Modal accessibility attributes
    it("implements required dialog accessibility attributes", () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Accessible Dialog"
          description="Description for screen readers"
        >
          <div>Content</div>
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
      expect(dialog).toHaveAttribute("aria-describedby");
    });

    // 11. Initial focus management
    it("moves focus inside the modal on open (prioritizing autofocus or first focusable element)", () => {
      // With autofocus
      const { unmount } = render(
        <Modal isOpen={true} onClose={() => {}} title="Autofocus Test">
          <input data-testid="regular-input" />
          <button data-testid="autofocus-btn" autoFocus>
            Action
          </button>
        </Modal>
      );
      expect(screen.getByTestId("autofocus-btn")).toHaveFocus();
      unmount();

      // Without autofocus element, focuses the first focusable element (close button)
      render(
        <Modal isOpen={true} onClose={() => {}} title="First Element Focus Test">
          <button data-testid="inner-btn">Inner</button>
        </Modal>
      );
      expect(screen.getByLabelText("Close dialog")).toHaveFocus();
    });

    // 12. Focus trap: Tab key cycles forward from last to first element
    it("traps focus inside the modal when Tab is pressed on the last element", () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Tab Trap Forward">
          <input data-testid="input-1" />
          <button data-testid="btn-last">Last Button</button>
        </Modal>
      );

      const closeBtn = screen.getByLabelText("Close dialog");
      const lastBtn = screen.getByTestId("btn-last");

      lastBtn.focus();
      expect(lastBtn).toHaveFocus();

      // Press Tab on the last element -> should wrap back to first element (closeBtn)
      fireEvent.keyDown(document, { key: "Tab" });
      expect(closeBtn).toHaveFocus();
    });

    // 13. Focus trap: Shift+Tab key cycles backward from first to last element
    it("traps focus inside the modal when Shift+Tab is pressed on the first element", () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Tab Trap Backward">
          <input data-testid="input-1" />
          <button data-testid="btn-last">Last Button</button>
        </Modal>
      );

      const closeBtn = screen.getByLabelText("Close dialog");
      const lastBtn = screen.getByTestId("btn-last");

      closeBtn.focus();
      expect(closeBtn).toHaveFocus();

      // Press Shift+Tab on the first element -> should wrap to last element
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(lastBtn).toHaveFocus();
    });

    // 14. Focus restoration to trigger element on close
    it("restores focus to the triggering element when the modal closes", () => {
      const triggerBtn = document.createElement("button");
      triggerBtn.textContent = "Open Modal Trigger";
      document.body.appendChild(triggerBtn);
      triggerBtn.focus();
      expect(triggerBtn).toHaveFocus();

      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}} title="Restoration Test">
          <p>Modal Content</p>
        </Modal>
      );

      // Focus should now be inside modal
      expect(screen.getByLabelText("Close dialog")).toHaveFocus();

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Restoration Test">
          <p>Modal Content</p>
        </Modal>
      );

      // Focus should be restored back to triggerBtn
      expect(triggerBtn).toHaveFocus();
      document.body.removeChild(triggerBtn);
    });

    // 15. Background content isolation (redirects external focus back to modal)
    it("keeps focus contained when focus attempts to leave the modal", () => {
      const backgroundInput = document.createElement("input");
      backgroundInput.setAttribute("data-testid", "background-input");
      document.body.appendChild(backgroundInput);

      render(
        <Modal isOpen={true} onClose={() => {}} title="Background Isolation">
          <button data-testid="inside-btn">Inside</button>
        </Modal>
      );

      // Attempt to focus background element while modal is open
      backgroundInput.focus();

      // Should immediately redirect focus back into the modal
      expect(screen.getByLabelText("Close dialog")).toHaveFocus();
      document.body.removeChild(backgroundInput);
    });

    // 16. Dismissal controls (closeOnEscape & closeOnBackdropClick)
    it("respects closeOnEscape=false and closeOnBackdropClick=false", () => {
      const handleClose = vi.fn();
      render(
        <Modal
          isOpen={true}
          onClose={handleClose}
          title="Dismissal Disabled Test"
          closeOnEscape={false}
          closeOnBackdropClick={false}
        >
          <div>Content</div>
        </Modal>
      );

      // Escape should not trigger onClose
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleClose).not.toHaveBeenCalled();

      // Backdrop click should not trigger onClose
      const backdrop = screen.getByTestId("modal-backdrop");
      fireEvent.click(backdrop);
      expect(handleClose).not.toHaveBeenCalled();
    });

    // 17. Body overflow scroll lock and cleanup
    it("locks body overflow when open and restores it upon closing or unmounting", () => {
      document.body.style.overflow = "visible";

      const { rerender, unmount } = render(
        <Modal isOpen={true} onClose={() => {}} title="Scroll Lock Test">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe("hidden");

      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Scroll Lock Test">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe("visible");

      // Verify unmount cleanup as well
      rerender(
        <Modal isOpen={true} onClose={() => {}} title="Scroll Lock Test 2">
          <div>Content</div>
        </Modal>
      );
      expect(document.body.style.overflow).toBe("hidden");
      unmount();
      expect(document.body.style.overflow).toBe("visible");
    });
  });
});
